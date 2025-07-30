from dotenv import load_dotenv
load_dotenv() # Load environment variables from .env file
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
import logging

app = Flask(__name__)

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
app.logger.setLevel(logging.INFO) # Ensure Flask's logger also respects this level

CORS(app, resources={r"/*": {
    "origins": ["https://cosmic-canvas-delta.vercel.app", "http://127.0.0.1:5501", "null"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
    "supports_credentials": True
}})

# Configuration
HF_API_TOKEN = os.getenv("HUGGING_FACE_API_KEY")
HF_IMAGE_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if OPENROUTER_API_KEY:
    OPENROUTER_API_KEY = OPENROUTER_API_KEY.strip()
# print(f"OpenRouter API Key (after strip): '{OPENROUTER_API_KEY}' (Length: {len(OPENROUTER_API_KEY) if OPENROUTER_API_KEY else 0}, Type: {type(OPENROUTER_API_KEY)})") # Debug line removed
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def call_openrouter_gemini(prompt, max_retries=3, initial_wait_time=1.5, request_timeout=30):
    if not OPENROUTER_API_KEY:
        app.logger.error("OpenRouter API Key is not configured. Cannot call API.")
        raise Exception("Server configuration error: AI service API key missing.")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "google/gemini-2.0-flash-exp:free",
        "messages": [{"role": "user", "content": prompt}]
    }
    
    for attempt in range(max_retries):
        try:
            app.logger.info(f"Attempt {attempt + 1}/{max_retries} to call OpenRouter model {data['model']}.")
            response = requests.post(OPENROUTER_URL, headers=headers, json=data, timeout=request_timeout)
            
            app.logger.info(f"OpenRouter response status: {response.status_code} on attempt {attempt + 1}.")
            
            if response.status_code == 429 or ('error' in response.text and 'rate-limited' in response.text.lower()):
                app.logger.warning(f"Rate limited by OpenRouter on attempt {attempt + 1}. Response: {response.text[:200]}")
                if attempt < max_retries - 1:
                    wait_time = (initial_wait_time ** attempt) * 2 + random.uniform(0, 0.5)
                    app.logger.info(f"Waiting {wait_time:.2f}s before retry due to rate limit.")
                    time.sleep(wait_time)
                    continue
                else:
                    app.logger.error("OpenRouter rate limit exceeded after max retries.")
                    raise Exception("The AI model is temporarily busy due to rate limits. Please try again in a few minutes.")
            
            response.raise_for_status() # Raises HTTPError for bad responses (4xx or 5xx)
            
            result = response.json()
            app.logger.info("Successfully received and parsed JSON response from OpenRouter.")
            return result
            
        except requests.exceptions.HTTPError as http_err:
            app.logger.error(f"HTTP error occurred with OpenRouter on attempt {attempt + 1}: {http_err} - Response: {response.text[:500]}", exc_info=True)
            if response.status_code == 502 and attempt < max_retries -1: # Retry on 502 from OpenRouter
                 app.logger.warning(f"Retrying on 502 from OpenRouter.")
            elif attempt == max_retries - 1:
                raise Exception(f"Failed to communicate with AI model after multiple retries: Status {response.status_code} - {response.text[:200]}")
        except requests.exceptions.Timeout:
            app.logger.error(f"Request to OpenRouter timed out after {request_timeout}s on attempt {attempt + 1}.", exc_info=True)
            if attempt == max_retries - 1:
                raise Exception(f"AI model service timed out after multiple retries.")
        except requests.exceptions.RequestException as req_err:
            app.logger.error(f"Request exception occurred with OpenRouter on attempt {attempt + 1}: {req_err}", exc_info=True)
            if attempt == max_retries - 1:
                raise Exception(f"Failed to connect to AI model after multiple retries: {req_err}")
        except json.JSONDecodeError as json_err:
            app.logger.error(f"Failed to decode JSON response from OpenRouter on attempt {attempt + 1}: {json_err} - Response text: {response.text[:500]}", exc_info=True)
            if attempt == max_retries - 1:
                raise Exception(f"Received invalid non-JSON response from AI model: {response.text[:200]}")
        
        if attempt < max_retries - 1: # General retry for caught, non-fatal errors
            wait_time = (initial_wait_time ** attempt) * 2 + random.uniform(0, 0.5) # Use same backoff
            app.logger.info(f"Waiting {wait_time:.2f}s before general retry for OpenRouter call.")
            time.sleep(wait_time)

    app.logger.error("Exhausted all retries for OpenRouter call.")
    raise Exception("Failed to get a valid response from the AI model after multiple attempts.")

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
        if not data or not data.get('prompt'):
            app.logger.warning("Enhance prompt: Missing data or prompt.")
            return jsonify({"error": "Prompt cannot be empty and data must be provided"}), 400
        
        prompt = data.get('prompt', '')
        purpose = data.get('purpose', 'social')
        width = data.get('width', 1080)
        height = data.get('height', 1080)
        app.logger.info(f"Enhancing prompt: '{prompt[:50]}...' for {purpose} {width}x{height}")

        # Call the actual AI enhancement function
        enhanced_prompt = enhance_prompt_with_gemini(prompt, purpose, width, height)
        
        app.logger.info("Prompt enhancement successful.")
        return jsonify({"result": enhanced_prompt})

    except Exception as e:
        app.logger.error(f"Error in /enhance-prompt route: {e}", exc_info=True)
        # Return fallback enhancement on error
        prompt = data.get('prompt', '') if data else ''
        enhanced_prompt = f"A stunning, ultra-photorealistic 8k professional photograph of {prompt}. Shot with cinematic lighting, sharp focus, and shallow depth of field. Rich colors, fine detail, and professional composition."
        return jsonify({"result": enhanced_prompt})

@app.route('/generate', methods=['POST'])
def generate_image():
    try:
        data = request.json
        if not data or not data.get('prompt'):
            app.logger.warning("Generate image: Missing data or prompt.")
            return jsonify({"error": "Prompt cannot be empty and data must be provided"}), 400

        prompt = data.get('prompt', '')
        original_width = data.get('width', 512)
        original_height = data.get('height', 512)
        # purpose = data.get('purpose', 'social') # Purpose not directly used in HF call here

        app.logger.info(f"Generating image for prompt: '{prompt[:50]}...' (Original: {original_width}x{original_height})")

        # Round dimensions to nearest multiple of 8
        hf_width = (round(original_width / 8) * 8)
        hf_height = (round(original_height / 8) * 8)

        # Clamp dimensions
        min_dim = 512
        max_dim = 1536
        hf_width = max(min_dim, min(hf_width, max_dim))
        hf_height = max(min_dim, min(hf_height, max_dim))

        app.logger.info(f"Original dimensions: {original_width}x{original_height}, HF dimensions: {hf_width}x{hf_height}")

        # Generate image
        image_url = generate_image_with_hf(prompt, hf_width, hf_height) # This function has its own logging

        # Process image
        if not image_url.startswith('data:image/png;base64,'):
            app.logger.info(f"Fetching image from URL: {image_url[:100]}")
            response = requests.get(image_url, timeout=30) # Added timeout
            if response.status_code != 200:
                app.logger.error(f"Failed to fetch image from URL: {response.status_code} - {response.text}")
                return jsonify({"error": "Failed to retrieve generated image from external source"}), 500
            img_bytes = response.content
        else:
            app.logger.info("Decoding base64 image data.")
            img_bytes = base64.b64decode(image_url.split(',')[1])

        # Convert to PIL Image
        img = Image.open(io.BytesIO(img_bytes))

        # Resize if needed
        if img.width != original_width or img.height != original_height:
            app.logger.info(f"Resizing image from {img.width}x{img.height} to {original_width}x{original_height}")
            img = img.resize((original_width, original_height), Image.Resampling.LANCZOS)

        # Save and send
        img_io = io.BytesIO()
        img.save(img_io, 'PNG')
        img_io.seek(0)
        app.logger.info("Image generation and processing successful. Sending image.")
        return send_file(img_io, mimetype='image/png')

    except Exception as e:
        app.logger.error(f"Error in /generate route: {e}", exc_info=True)
        error_message = str(e)
        status_code = 500
        if "Hugging Face API error" in error_message: # More specific check
             error_message = f"Image generation service (Hugging Face) error: {error_message.split('Hugging Face API error: ')[-1]}"
        elif 'rate-limited' in error_message or '429' in error_message: # General AI rate limit
            status_code = 429
            error_message = "The image generation model is temporarily busy or rate-limited. Please try again."
        elif "Failed to retrieve generated image" in error_message:
             status_code = 502 # Bad Gateway if external fetch failed
        else:
            error_message = f"An unexpected error occurred during image generation: {error_message}"
        return jsonify({"error": error_message}), status_code

@app.route('/generate-layout', methods=['POST'])
def generate_layout():
    try:
        data = request.json
        if not data or not data.get('prompt'):
            app.logger.warning("Generate layout: Missing data or prompt.")
            return jsonify({"error": "Prompt cannot be empty and data must be provided"}), 400
        
        prompt = data.get('prompt', '')
        purpose = data.get('purpose', 'social')
        width = data.get('width', 1080)
        height = data.get('height', 1080)

        app.logger.info(f"Generating layout for prompt: '{prompt[:50]}...' for {purpose} {width}x{height}")
        
        # Call the actual AI layout generation function
        layout_json = generate_layout_with_gemini(prompt, purpose, width, height)
        
        app.logger.info("Layout generation successful.")
        return jsonify({"result": layout_json})

    except Exception as e:
        app.logger.error(f"Error in /generate-layout route: {e}", exc_info=True)
        # Return fallback layout on error
        prompt = data.get('prompt', '') if data else ''
        width = data.get('width', 1080) if data else 1080
        height = data.get('height', 1080) if data else 1080
        
        title_size = max(32, int(height * 0.06))
        subtitle_size = max(24, int(height * 0.04))
        body_size = max(18, int(height * 0.03))
        
        fallback_layout = {
            "objects": [
                {
                    "type": "textbox",
                    "text": f"Amazing {data.get('purpose', 'social').title()} Content!",
                    "left": int(width * 0.1),
                    "top": int(height * 0.15),
                    "fontSize": title_size,
                    "fontFamily": "Impact",
                    "fill": "#2c3e50",
                    "textAlign": "center",
                    "width": int(width * 0.8)
                },
                {
                    "type": "textbox",
                    "text": prompt[:100] + "..." if len(prompt) > 100 else prompt,
                    "left": int(width * 0.1),
                    "top": int(height * 0.35),
                    "fontSize": subtitle_size,
                    "fontFamily": "Arial",
                    "fill": "#34495e",
                    "textAlign": "center",
                    "width": int(width * 0.8)
                }
            ],
            "background": "#ffffff"
        }
        return jsonify({"result": fallback_layout})

@app.route('/suggest-captions', methods=['POST'])
def suggest_captions():
    try:
        data = request.json
        if not data or not data.get('prompt'):
            app.logger.warning("Suggest captions: Missing data or prompt.")
            return jsonify({"error": "Prompt cannot be empty and data must be provided"}), 400

        prompt = data.get('prompt', '')
        purpose = data.get('purpose', 'social')
        app.logger.info(f"Suggesting captions for prompt: '{prompt[:50]}...' for {purpose}")

        # Call the actual AI caption generation function
        captions = generate_captions_with_gemini(prompt, purpose)
        
        app.logger.info(f"Caption suggestion successful, found {len(captions)} captions.")
        return jsonify({"result": captions})

    except Exception as e:
        app.logger.error(f"Error in /suggest-captions route: {e}", exc_info=True)
        # Return fallback captions on error
        purpose = data.get('purpose', 'social') if data else 'social'
        fallback_captions = [
            f"✨ Amazing {purpose} content! Check out this incredible design! #creative #design #awesome",
            f"🎨 Love this beautiful work! Perfect for {purpose} use. #art #inspiration #quality",
            f"🔥 This design is absolutely stunning! Great for {purpose} projects. #professional #beautiful #cool"
        ]
        return jsonify({"result": fallback_captions})

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

    app.logger.info(f"Calling OpenRouter for prompt enhancement. Prompt: {prompt[:50]}...")
    response = call_openrouter_gemini(system_prompt) # This will raise an exception on failure

    try:
        content = response['choices'][0]['message']['content']
        app.logger.info(f"Successfully enhanced prompt. Result snippet: {content[:100]}...")
        return content
    except (KeyError, IndexError) as e:
        app.logger.error(f"Failed to parse enhanced prompt from Gemini response structure: {e}. Response: {response}", exc_info=True)
        raise Exception("AI model returned an unexpected response format for prompt enhancement.")

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

    app.logger.info(f"Calling OpenRouter for layout generation. Prompt: {prompt[:50]}...")
    response = call_openrouter_gemini(system_prompt) # This will raise an exception on failure

    try:
        content = response['choices'][0]['message']['content']
        app.logger.info(f"Raw content from OpenRouter for layout: {content[:200]}...")
        
        content_cleaned = content.strip()
        if content_cleaned.startswith('```json'):
            content_cleaned = content_cleaned[len('```json'):].strip()
        if content_cleaned.endswith('```'):
            content_cleaned = content_cleaned[:-len('```')].strip()
        
        app.logger.info(f"Cleaned content for layout JSON parsing: {content_cleaned[:200]}...")
        layout_json = json.loads(content_cleaned)
        app.logger.info("Successfully parsed layout JSON from Gemini response.")
        return layout_json
    except (KeyError, IndexError) as e:
        app.logger.error(f"Failed to parse layout from Gemini response structure: {e}. Response: {response}", exc_info=True)
        raise Exception("AI model returned an unexpected response format for layout.")
    except json.JSONDecodeError as e:
        app.logger.error(f"Failed to decode JSON for layout: {e}. Cleaned content was: {content_cleaned[:500]}", exc_info=True)
        raise Exception(f"AI model returned invalid JSON for layout. Content: {content_cleaned[:200]}")

def generate_captions_with_gemini(prompt, purpose):
    # System prompt for caption generation
    system_prompt = f"""
    You are an expert social media copywriter. Your task is to generate 5 distinct and creative captions for a "{purpose}" post based *strictly* on the following user prompt: "{prompt}".

    **CRITICAL REQUIREMENTS:**
    1.  **Direct Relevance:** Each caption *must* be directly and clearly related to the user's prompt: "{prompt}". Do NOT generate generic or unrelated captions.
    2.  **Variety:** Provide a diverse range of tones (e.g., witty, professional, excited, intriguing).
    3.  **Content:** Each caption should be 1-2 sentences long and include relevant, popular hashtags.
    4.  **No Generic Phrases:** Avoid phrases like "awesome post," "check this out," or "amazing content." Focus on the specifics of the user's prompt.

    **Output Format:**
    You MUST return ONLY a valid JSON array of 5 strings, with no additional text, explanations, or markdown.

    **Example Output:**
    ["Caption 1 based on the prompt with #hashtags", "Caption 2 based on the prompt with #hashtags", "Caption 3 based on the prompt with #hashtags", "Caption 4 based on the prompt with #hashtags", "Caption 5 based on the prompt with #hashtags"]
    """

    app.logger.info(f"Calling OpenRouter for caption generation. Prompt: {prompt[:50]}...")
    response = call_openrouter_gemini(system_prompt) # This will raise an exception on failure

    try:
        content = response['choices'][0]['message']['content']
        app.logger.info(f"Raw content from OpenRouter for captions: {content[:200]}...")
        
        content_cleaned = content.strip()
        if content_cleaned.startswith('```json'):
            content_cleaned = content_cleaned[len('```json'):].strip()
        if content_cleaned.endswith('```'):
            content_cleaned = content_cleaned[:-len('```')].strip()
        if content_cleaned.startswith('```'):
            content_cleaned = content_cleaned[3:].strip()

        app.logger.info(f"Cleaned content for captions JSON parsing: {content_cleaned[:200]}...")
        
        try:
            captions = json.loads(content_cleaned)
        except json.JSONDecodeError:
            # Try to extract JSON array from the content
            import re
            json_match = re.search(r'\[.*?\]', content_cleaned, re.DOTALL)
            if json_match:
                captions = json.loads(json_match.group())
            else:
                # Fallback: split by lines and clean up
                lines = content_cleaned.split('\n')
                captions = []
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith('[') and not line.startswith(']'):
                        # Remove quotes and numbering
                        line = re.sub(r'^[\d\.\-\*\s]*["\']?', '', line)
                        line = re.sub(r'["\']?\s*,?\s*$', '', line)
                        if line:
                            captions.append(line)
                captions = captions[:5]
        
        if not isinstance(captions, list):
            app.logger.warning(f"Parsed captions content is not a list, but type {type(captions)}. Content: {content_cleaned[:200]}. Creating fallback captions.")
            captions = [f"Great {purpose} content! #awesome #creative", f"Love this design! #beautiful #inspiration", f"Amazing work! #design #art"]
        
        # Ensure we have at least some captions
        if not captions:
            captions = [f"Check out this amazing {purpose} content! #creative #design", f"Beautiful work! #inspiration #art", f"Love this! #awesome #cool"]
        
        app.logger.info(f"Successfully generated {len(captions)} captions.")
        return captions[:5]
    except (KeyError, IndexError) as e:
        app.logger.error(f"Failed to parse captions from Gemini response structure: {e}. Response: {response}", exc_info=True)
        # Return fallback captions
        return [f"Amazing {purpose} content! #creative #design", f"Beautiful work! #inspiration #art", f"Love this design! #awesome #cool"]

def generate_image_with_hf(prompt, width, height):
    # Check cache first
    cache_key = f"{prompt}_{width}_{height}"
    if cache_key in IMAGE_CACHE and time.time() - IMAGE_CACHE[cache_key]['timestamp'] < CACHE_EXPIRY:
        app.logger.info(f"Serving image from cache for {width}x{height}. Prompt: {prompt[:50]}...")
        return IMAGE_CACHE[cache_key]['url']
    
    app.logger.info(f"Generating image with HF. Prompt: {prompt[:50]}..., Size: {width}x{height}")
    if not HF_API_TOKEN:
        app.logger.error("Hugging Face API Key is not configured. Cannot generate image.")
        raise Exception("Server configuration error: Image generation service API key missing.")

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

    response = requests.post(HF_IMAGE_URL, json=payload, headers=headers, timeout=45) # Added timeout
    
    if response.status_code != 200:
        app.logger.error(f"Hugging Face API request failed with status {response.status_code}: {response.text[:500]}", exc_info=True)
        raise Exception(f"Hugging Face API error: {response.status_code} - {response.text[:200]}") # Return shorter error to client

    app.logger.info(f"Successfully generated image from Hugging Face. Status: {response.status_code}")
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