# Architecture

  ## Language & Runtime Decision

  **Node.js** is the chosen language for this project.

  Rationale:
  - The main Choice Properties site already runs on Node.js; no additional runtime is required
  - A single language across both projects reduces cognitive overhead and tooling complexity
  - All required capabilities (HTTP server, image processing, AI API calls, ZIP packaging) are well-served by the Node.js ecosystem
  - No performance or capability gap vs Python for this specific workload

  ---

  ## Top-Level Structure

  ```
  /ai-content/
    server.js              ← Express HTTP server and route definitions
    brand.config.js        ← All brand settings (single source of truth)
    package.json           ← Dependencies for this module only

    /services/
      PropertyService.js   ← Supabase data fetching and normalisation
      CaptionService.js    ← AI caption generation with Groq/OpenRouter fallback
      ImageService.js      ← Image download, watermarking, and resizing via Sharp
      ZipService.js        ← Packages captions and images into a downloadable ZIP

    /prompts/
      tiktok.js            ← TikTok-specific prompt template
      instagram.js         ← Instagram-specific prompt template
      facebook.js          ← Facebook-specific prompt template

    /public/
      index.html           ← Mobile-first single-page UI
      app.js               ← Frontend JavaScript (fetch, UI state, download handling)
      style.css            ← Mobile-optimised stylesheet
  ```

  ---

  ## Service Responsibilities

  ### server.js
  - Initialises the Express application on a dedicated port (separate from main site)
  - Defines the single primary route: `POST /generate`
  - Orchestrates the service pipeline in sequence:
    1. Call PropertyService
    2. Call CaptionService (with brand config and prompt templates)
    3. Call ImageService
    4. Call ZipService
    5. Return response to client

  ### PropertyService.js
  - Accepts a property URL or listing ID
  - If URL: extracts the listing ID from the URL path
  - Queries Supabase REST API: `properties` table joined with `landlords`
  - Normalises the raw response into a consistent internal data object
  - Applies graceful fallbacks for missing fields
  - Throws a structured error if the listing cannot be found or data is insufficient

  ### CaptionService.js
  - Receives the normalised property object and brand configuration
  - Loads the appropriate prompt template for each platform (TikTok, Instagram, Facebook)
  - Assembles the full prompt: system role + brand context + property data + platform template
  - Calls Groq API (primary)
  - On failure or timeout: automatically retries once using OpenRouter (fallback)
  - Returns three captions as a structured object keyed by platform

  ### ImageService.js
  - Accepts the list of image URLs from the normalised property object (max 6)
  - Downloads each image as a buffer via HTTP
  - Uses Sharp to:
    - Resize to platform-specific dimensions
    - Apply watermark text (from brand config) at defined position
    - Optimise quality and format (JPEG, 85% quality)
  - Returns an array of named image buffers ready for packaging

  ### ZipService.js
  - Accepts captions object and image buffers
  - Writes captions.txt with clearly labelled sections per platform
  - Adds all images with platform-prefixed filenames (e.g., tiktok-1.jpg)
  - Streams the ZIP archive back to the client as a file download

  ---

  ## Communication Between Services

  All services are plain Node.js modules (CommonJS). They export a single async function. The server imports and calls them in sequence. No message queues, no event buses, no inter-process communication — the pipeline is linear and synchronous within a single request.

  ---

  ## Expandability

  The `PropertyService` is intentionally decoupled from the content generation logic. Future features (chat assistant, property recommendations, automated descriptions) will import and reuse `PropertyService` directly without modification. New capabilities are added as new services alongside the existing ones, not woven into existing services.
  