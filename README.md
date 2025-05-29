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
Building Cosmic Canvas was a rewarding journey, but it came with its fair share of technical and creative hurdles—especially in merging AI-powered generation with an interactive design experience.

🛠️ Maintaining Tool-Wide Functionality
Combining features like canvas editing, AI generation, custom sizing, and dynamic downloads into one cohesive tool was complex. Ensuring that these modules worked seamlessly together without breaking other parts of the interface required rigorous integration testing and a modular approach.

📏 Dynamic Canvas Resizing
Supporting various canvas sizes—like Instagram posts, posters, and banners—meant implementing a flexible resizing system. We had to ensure accurate unit handling (px, cm, in) while maintaining visual consistency and responsiveness across devices.

🧾 Making Text Feel Like a Layout
A major challenge was positioning AI-generated text so it looked like a polished layout, not just random text boxes on a canvas. We developed logic to structure headings, subheadings, and captions in a visually balanced and readable format.

🖼️ Generating Canvas-Fitting Images
Our AI image outputs initially didn’t match the canvas dimensions, leading to poor fit or pixelation. We resolved this by feeding the exact canvas size into the prompt and applying proper scaling techniques, ensuring visuals aligned perfectly with user-defined dimensions.

🎯 Crafting Prompts for Contextual Backgrounds
Instead of full-subject images, we needed backgrounds that complemented the content without overwhelming it. This required careful prompt engineering to guide AI toward generating ambient, design-friendly visuals.

🧪 API Rate Limits & Free Tier Limitations
Using free-tier APIs (like Hugging Face and OpenRouter) helped us prototype quickly, but came with downsides—strict rate limits, slower responses, and reduced quality under heavy load. Differentiating API issues from app bugs also made debugging harder. We addressed this with retry logic, loading indicators, and user alerts to manage expectations during peak use.

-----

## 🌐 Tech Stack

  * **Frontend:** HTML, CSS, JavaScript,Tailwind CSS
  * **Canvas Engine:** Fabric.js
  * **Backend:** Python Flask
  * **AI Integration:** Hugging Face API, OpenRouter API

-----

## 🤝 Team

This project was a collaborative effort.

  * **Co-creators:** *Ankur Bag , Samrit Mukherjee*
  * **Contributors:** *Dhritiman Siva, Monalisa Roy*

-----

 ***📜 License*** 

*This project is licensed under the MIT License – see the LICENSE file for details.*
// MIT License
// Copyright (c) 2025 Ankur Bag , Samrit Mukherjee
// See LICENSE file for full license information.
