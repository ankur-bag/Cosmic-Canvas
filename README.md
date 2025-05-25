# 🪐 Cosmic Canvas – AI-generated designs. Human-level control.

## 💡 Problem Solved

*Creating professional-looking banners, social media posts, and advertisements can be a significant hurdle for many:*

  * **Startups** often lack the budget for dedicated graphic designers.
  * **Beginners and creators** struggle with complex design software like Photoshop or lack the creativity to fully utilize template-based tools like Canva.
  * **AI image generators** (e.g., Midjourney, DALL·E) produce incredible visuals, but their outputs are **flattened and uneditable**. If you need to tweak a single element – like a line of text, a background color, or a layout component – you're forced to regenerate the entire image, leading to inconsistencies and a loss of control.

**Cosmic Canvas** *bridges this critical gap*.

-----

## 🚀 The Solution: Cosmic Canvas

*Cosmic Canvas is an innovative, AI-powered design tool that combines the raw creativity of AI generation with precise, layer-based human control. It empowers anyone to:*

  * **Generate stunning visuals with AI prompts.**
  * **Receive intelligent layout and caption suggestions.**
  * **Edit every design layer independently** – just like in professional design software (text, images, shapes, etc.).
  * **Export ready-made designs** for social media, marketing campaigns, business needs, and personal use.

We're democratizing design by making it accessible, editable, and intuitive for everyone, regardless of their experience level.

-----

## ✨ Features

  * **AI Image Generation:** Generate unique, editable visual elements (backgrounds, objects, textures) directly from text descriptions using advanced AI models.
  * **Smart Layout Generator:** Get instant, intelligently structured layout suggestions that adapt to your content and design purpose, helping you create cohesive visuals effortlessly.
  * **AI Caption Assistant:** Generate engaging and contextually relevant captions that perfectly complement your design and message, enhancing your communication.
  * **Professional Design Toolkit:** Enjoy a robust set of editing capabilities, including the ability to move, resize, delete, rotate, and restyle any individual element on the canvas.
  * **Flexible Canvas Editor:** Our canvas supports smooth pan/zoom, precise unit conversion (pixels, centimeters, inches), and resizable dimensions with interactive rulers, giving you pixel-perfect control.
  * **Export & Share:** Easily export your finished designs in various formats, optimized for platforms like Instagram, LinkedIn, Facebook, and more.

-----

## ⚙️ How It Works

*Users start by selecting a canvas size for their desired post or banner. The creative process then unfolds:*

1.  **Prompt for Design:** Users describe the desired background image or visual elements using a natural language prompt.
2.  **AI Generation:** Our integrated AI models (Hugging Face / OpenRouter API) generate the image, providing an initial visual foundation.
3.  **Smart Suggestions:** The AI assistant offers intelligent layout arrangements and compelling caption suggestions tailored to the generated image and user's intent.
4.  **Layered Editing:** The AI-generated output appears on an interactive canvas powered by Fabric.js, allowing users to select and **edit each element individually**. Want to change the text, move an object, or tweak a color? You can do it directly, without regenerating the whole image.
5.  **Refine & Export:** Users can further customize the design to perfection before exporting it for their intended platform.

-----

## 🧩 Challenges We Faced

*Building Cosmic Canvas involved overcoming several exciting technical and UX hurdles, particularly in seamlessly integrating AI generation with a highly editable design environment:*

1.  **Making Fabric.js Feel Like Photoshop:** Achieving a fluid, independent canvas with robust pan/zoom, precise object manipulation, and seamless layering was a significant challenge. We customized Fabric.js logic to isolate canvas zoom from UI panels and manually recalibrated ruler alignment and unit handling (pixels, cm, inches) for a professional feel.
2.  **Eraser and Shape Tools Malfunctioning:** Initially, the eraser tool interfered with brush behavior, and newly added shapes couldn't be moved or resized. We restructured the tool selection logic and ensured every canvas element was interactive and correctly bound to its behavior, allowing for intuitive manipulation.
3.  **Cropped Logo Stretching Issues:** Our `cropped_logo.png` appeared stretched on various pages due to aspect ratio mismatches. We implemented consistent CSS styling (`object-fit: contain`) and custom height/width rules to ensure correct visual representation across all landing, login, and signup pages.
4.  **Loader Display Logic:** The animated logo loader was appearing during in-page scrolls (e.g., in the Features or About sections), which disrupted the user experience. We refined the logic to display the loader only during full-page navigations (e.g., Login to Canvas), significantly improving perceived performance and user flow.
5.  **Performance vs. Aesthetics:** Balancing visually rich live effects (glowing particles, gradient animations) with fast load times was a delicate act. We optimized CSS animations and incorporated lightweight particle systems with conditional loading on mobile devices, ensuring a delightful yet performant experience.
6.  **API Rate-Limiting and Free Tier Constraints**:
During the development of Cosmic Canvas, one of the significant challenges we encountered was the reliance on free-tier API keys for AI model integration. While these free APIs allowed us to test and iterate on our features without incurring costs, they came with limitations that impacted user experience and scalability:

**Rate-Limiting**: The APIs we used were subject to strict rate-limiting, meaning only a limited number of requests could be processed within a given time frame. This caused delays or temporary unavailability of features, especially during peak usage or stress testing.

**Response Times**: Due to the shared nature of free-tier APIs, the response times were inconsistent. At times, generating high-quality AI outputs took longer than expected, causing frustration for both developers and users.

**Resource Constraints**: Free-tier APIs often had reduced computational resources, leading to a compromise in the quality or resolution of generated outputs, particularly for resource-intensive tasks like image generation or dynamic element processing.

**Debugging Complexity**: Differentiating between API-level issues (e.g., rate limits, downtime) and local application bugs was challenging, leading to extended debugging cycles.

Each of these challenges pushed our understanding of UI/UX engineering and led to a more refined, scalable, and user-friendly product.

-----

## 🌐 Tech Stack

  * **Frontend:** HTML, CSS, JavaScript,Tailwind CSS
  * **Canvas Engine:** Fabric.js
  * **Backend:** Python Flask
  * **AI Integration:** Hugging Face API, OpenRouter API

-----

## 🤝 Team

This project was a collaborative effort.

  * **Co-creators:** *Samrit Mukherjee, Ankur Bag*
  * **Contributors:** *Dhritiman Siva, Monalisa Roy*

-----

 ***📜 License*** 

*This project is licensed under the MIT License – see the LICENSE file for details.*
// MIT License
// Copyright (c) 2025 Samrit Mukherjee, Ankur Bag
// See LICENSE file for full license information.
