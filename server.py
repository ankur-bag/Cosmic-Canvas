from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import requests
import json
import os
import io
from PIL import Image
import base64
import time
import random

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
HF_API_TOKEN = os.getenv("HUGGING_FACE_API_KEY")
HF_IMAGE_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
print("OpenRouter API Key:", OPENROUTER_API_KEY)
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def call_openrouter_gemini(prompt, max_retries=3):
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "google/gemini-2.0-flash-exp:free",
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }
    
    for attempt in range(max_retries):
        try:
            response = requests.post(OPENROUTER_URL, headers=headers, json=data)
            result = response.json()
            
            if response.status_code == 429 or ('error' in result and 'rate-limited' in str(result['error'])):
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    time.sleep(wait_time)
                    continue
                else:
                    raise Exception("The AI model is temporarily busy or rate-limited. Please try again in a few minutes.")
            
            return result
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            wait_time = (2 ** attempt) + random.uniform(0, 1)
            time.sleep(wait_time)
    
    return response.json()

# Cache for generated images
IMAGE_CACHE = {}
CACHE_EXPIRY = 3600  # 1 hour in seconds

@app.route('/')
def index():
    return "Cosmic Canvas Backend Server"

@app.route('/enhance-prompt', methods=['POST'])
def enhance_prompt():
    try:
        data = request.json
        prompt = data.get('prompt', '')
        purpose = data.get('purpose', 'social')
        width = data.get('width', 1080)
        height = data.get('height', 1080)

        if not prompt:
            return jsonify({"error": "Prompt cannot be empty"}), 400

        enhanced_prompt = enhance_prompt_with_gemini(prompt, purpose, width, height)
        return jsonify({"result": enhanced_prompt})

    except Exception as e:
        print(f"Error in enhance_prompt route: {e}")
        error_message = str(e)
        if 'rate-limited' in error_message or '429' in error_message:
            return jsonify({"error": "The AI model is temporarily busy or rate-limited. Please try again in a few minutes."}), 429
        return jsonify({"error": error_message}), 500

@app.route('/generate', methods=['POST'])
def generate_image():
    try:
        data = request.json
        prompt = data.get('prompt', '')
        original_width = data.get('width', 512)
        original_height = data.get('height', 512)
        purpose = data.get('purpose', 'social')

        if not prompt:
            return jsonify({"error": "Prompt cannot be empty"}), 400

        # Round dimensions to nearest multiple of 8
        hf_width = (round(original_width / 8) * 8)
        hf_height = (round(original_height / 8) * 8)

        # Clamp dimensions
        min_dim = 512
        max_dim = 1536
        hf_width = max(min_dim, min(hf_width, max_dim))
        hf_height = max(min_dim, min(hf_height, max_dim))

        print(f"Generating image for prompt: '{prompt}'")
        print(f"Original dimensions: {original_width}x{original_height}")
        print(f"HF dimensions: {hf_width}x{hf_height}")

        # Generate image
        image_url = generate_image_with_hf(prompt, hf_width, hf_height)

        # Process image
        if not image_url.startswith('data:image/png;base64,'):
            response = requests.get(image_url)
            if response.status_code != 200:
                print(f"Failed to fetch image: {response.status_code} - {response.text}")
                return jsonify({"error": "Failed to retrieve generated image"}), 500
            img_bytes = response.content
        else:
            img_bytes = base64.b64decode(image_url.split(',')[1])

        # Convert to PIL Image
        img = Image.open(io.BytesIO(img_bytes))

        # Resize if needed
        if img.width != original_width or img.height != original_height:
            print(f"Resizing from {img.width}x{img.height} to {original_width}x{original_height}")
            img = img.resize((original_width, original_height), Image.Resampling.LANCZOS)

        # Save and send
        img_io = io.BytesIO()
        img.save(img_io, 'PNG')
        img_io.seek(0)
        return send_file(img_io, mimetype='image/png')

    except Exception as e:
        print(f"Error in generate_image route: {e}")
        import traceback
        traceback.print_exc()
        error_message = str(e)
        if 'rate-limited' in error_message or '429' in error_message:
            return jsonify({"error": "The AI model is temporarily busy or rate-limited. Please try again in a few minutes."}), 429
        return jsonify({"error": error_message}), 500

@app.route('/generate-layout', methods=['POST'])
def generate_layout():
    try:
        data = request.json
        prompt = data.get('prompt', '')
        purpose = data.get('purpose', 'social')
        width = data.get('width', 1080)
        height = data.get('height', 1080)

        if not prompt:
            return jsonify({"error": "Prompt cannot be empty"}), 400

        layout_json = generate_layout_with_gemini(prompt, purpose, width, height)
        return jsonify({"result": layout_json})

    except Exception as e:
        print(f"Error in generate_layout route: {e}")
        error_message = str(e)
        if 'rate-limited' in error_message or '429' in error_message:
            return jsonify({"error": "The AI model is temporarily busy or rate-limited. Please try again in a few minutes."}), 429
        return jsonify({"error": error_message}), 500

@app.route('/suggest-captions', methods=['POST'])
def suggest_captions():
    try:
        data = request.json
        prompt = data.get('prompt', '')
        purpose = data.get('purpose', 'social')

        if not prompt:
            return jsonify({"error": "Prompt cannot be empty"}), 400

        captions = generate_captions_with_gemini(prompt, purpose)
        return jsonify({"result": captions})

    except Exception as e:
        print(f"Error in suggest_captions route: {e}")
        error_message = str(e)
        if 'rate-limited' in error_message or '429' in error_message:
            return jsonify({"error": "The AI model is temporarily busy or rate-limited. Please try again in a few minutes."}), 429
        return jsonify({"error": error_message}), 500

def enhance_prompt_with_gemini(prompt, purpose, width, height):
    # System prompt for enhancement
    system_prompt = f"""
    You are an expert prompt engineer for image generation.
    TTransform this prompt into a detailed, photorealistic image description for a {width}x{height}px {purpose} image:

    REQUIREMENTS:
    1. Ultra-photorealistic, 8k professional photo quality
    2. *CRITICAL: The generated prompt MUST keep the main subject of the original prompt central and prominently featured within the scene.*
    3. The scene should primarily focus on the background or conceptual context surrounding the main subject, NOT a direct, isolated product shot.
    4. NO text, logos, signatures, watermarks, or borders.
    5. 100-200 words with rich visual descriptors.
    6. Use specific, vivid language to describe:
    7. Include:
        - Style: photorealistic, realistic photography, fine detail
        - Camera: sharp focus, shallow depth of field, cinematic lighting
        - Colors: specific palette and mood
        - Composition: framing, angle, perspective
        - Lighting: type, direction, quality
        - Key elements: main subject context and surrounding environment.

    Original prompt: {prompt}

    Return only the enhanced prompt, no explanations or additional text. Make sure your response sticks to the user's prompt and all requirements above.
    """

    response = call_openrouter_gemini(system_prompt)
    if isinstance(response, dict) and response.get('error'):
        raise Exception(f"Gemini API error: {response['error']}")

    try:
        # OpenRouter returns a dict, parse accordingly
        result = response
        # Find the content in OpenRouter's response format
        content = result['choices'][0]['message']['content']
        return content
    except (KeyError, IndexError) as e:
        raise Exception("Failed to parse Gemini response")

def generate_layout_with_gemini(prompt, purpose, width, height):
    # System prompt for layout generation
    system_prompt = f"""
    You are a professional social media layout designer. Based on the user's prompt: '{prompt}' and purpose: '{purpose}', generate a JSON layout for a {width}x{height}px canvas using the Fabric.js structure. The layout should:
    - Include 5-7 creative, visually distinct textboxes (title, subtitle, hashtags, etc.), each as a separate object, matching the user's prompt and theme.
    - Each object must have: type (always "textbox"), text, left, top, fontSize, fontFamily, fill, textAlign, width.
    - Use 70% of the canvas space (width and height), center the group, and vary font size, color, and style for creativity.
    - Font sizes should be proportional to canvas size (e.g., title: 5-8% of canvas height, subtitle: 3-5%, body: 2-4%).
    - Return ONLY valid JSON, no markdown, no explanation, no extra text.

    Example format:
    {{
      "objects": [
        {{"type": "textbox", "text": "Title", "left": 100, "top": 80, "fontSize": 64, "fontFamily": "Impact", "fill": "#ff5a36", "textAlign": "center", "width": 880}},
        {{"type": "textbox", "text": "Subtitle", "left": 100, "top": 160, "fontSize": 48, "fontFamily": "Georgia", "fill": "#3A5BFF", "textAlign": "center", "width": 880}},
        {{"type": "textbox", "text": "Body text", "left": 100, "top": 240, "fontSize": 32, "fontFamily": "Arial", "fill": "#000000", "textAlign": "center", "width": 880}},
        {{"type": "textbox", "text": "Additional info", "left": 100, "top": 320, "fontSize": 28, "fontFamily": "Verdana", "fill": "#666666", "textAlign": "center", "width": 880}},
        {{"type": "textbox", "text": "#hashtags", "left": 100, "top": 400, "fontSize": 24, "fontFamily": "Comic Sans MS", "fill": "#27AE60", "textAlign": "center", "width": 880}}
      ],
      "background": "#ffffff"
    }}
    """

    response = call_openrouter_gemini(system_prompt)
    if isinstance(response, dict) and response.get('error'):
        raise Exception(f"Gemini API error: {response['error']}")

    try:
        result = response
        content = result['choices'][0]['message']['content']
        # Clean the response to extract just the JSON
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0]
        elif '```' in content:
            content = content.split('```')[1].split('```')[0]
        layout_json = json.loads(content)
        return layout_json
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        raise Exception("Failed to parse layout from Gemini response")

def generate_captions_with_gemini(prompt, purpose):
    # System prompt for caption generation
    system_prompt = f"""
    You are a social media copywriter. Generate 5 creative captions for a {purpose} post
    based on this content: {prompt}. The captions should be:
    - 1-2 sentences each
    - Engaging and on-brand
    - Include relevant hashtags
    - Varied in tone and style
    
    Return the captions as a JSON array of strings.
    """

    response = call_openrouter_gemini(system_prompt)
    if isinstance(response, dict) and response.get('error'):
        raise Exception(f"Gemini API error: {response['error']}")

    try:
        result = response
        content = result['choices'][0]['message']['content']
        # Clean the response to extract just the JSON array
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0]
        elif '```' in content:
            content = content.split('```')[1].split('```')[0]
        captions = json.loads(content)
        if not isinstance(captions, list):
            captions = [line.strip() for line in content.split('\n') if line.strip()]
        return captions[:5]  # Return max 5 captions
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        # Fallback to simple line splitting if JSON parsing fails
        return [line.strip() for line in content.split('\n') if line.strip()][:5]

def generate_image_with_hf(prompt, width, height):
    # Check cache first
    cache_key = f"{prompt}_{width}_{height}"
    if cache_key in IMAGE_CACHE and time.time() - IMAGE_CACHE[cache_key]['timestamp'] < CACHE_EXPIRY:
        print(f"Serving image from cache for {width}x{height}")
        return IMAGE_CACHE[cache_key]['url']

    # Prepare the payload for HF API
    payload = {
        "inputs": prompt,
        "parameters": {
            "width": width,
            "height": height,
            "num_inference_steps": 50,
            "guidance_scale": 10
        }
    }

    headers = {
        "Authorization": f"Bearer {HF_API_TOKEN}",
        "Content-Type": "application/json"
    }

    response = requests.post(HF_IMAGE_URL, json=payload, headers=headers)
    
    if response.status_code != 200:
        # Log the full response text from HF for debugging
        print(f"Hugging Face API request failed with status {response.status_code}: {response.text}")
        raise Exception(f"Hugging Face API error: {response.text}")

    # Save to cache as base64 data URL
    image_url = f"data:image/png;base64,{base64.b64encode(response.content).decode('utf-8')}"
    IMAGE_CACHE[cache_key] = {
        "url": image_url,
        "timestamp": time.time()
    }

    return image_url

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)