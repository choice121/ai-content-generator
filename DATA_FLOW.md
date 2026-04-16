# Data Flow

  ## Overview

  The system follows a linear, single-request pipeline. Every generation request travels through five stages before the output is returned to the user.

  ```
  User Input
      ↓
  [1] Input Parsing
      ↓
  [2] Supabase Data Fetch (PropertyService)
      ↓
  [3] Data Normalisation
      ↓
  [4] AI Caption Generation (CaptionService)
      [4a] Image Processing in parallel (ImageService)
      ↓
  [5] Output Packaging (ZipService)
      ↓
  Download Response → User
  ```

  ---

  ## Stage 1 — Input Parsing

  The user provides one of:
  - A full property URL (e.g., `https://choiceproperties.com/property/abc-123`)
  - A raw listing ID (UUID or slug)

  The server extracts the listing ID from either format and passes it to PropertyService.

  ---

  ## Stage 2 — Supabase Data Fetch

  PropertyService calls the Supabase REST API:

  ```
  GET /rest/v1/properties
    ?select=*,landlords(contact_name,business_name,avatar_url,verified)
    &id=eq.{listing_id}
    &status=eq.active
    &limit=1
  ```

  Headers sent:
  - `apikey`: SUPABASE_ANON_KEY
  - `Authorization`: Bearer SUPABASE_ANON_KEY

  If the response is empty or status is not 200/206, a structured error is thrown and returned to the user immediately.

  ---

  ## Stage 3 — Data Normalisation

  The raw Supabase response is normalised into a consistent internal object. This object is the single data shape used by all downstream services.

  ```json
  {
    "title": "string | 'Rental Property'",
    "price": "number | null",
    "beds": "number | null",
    "baths": "number | null",
    "location": {
      "address": "string | null",
      "city": "string | null",
      "state": "string | null"
    },
    "description": "string | null",
    "images": ["url1", "url2"],
    "features": ["feature1", "feature2"],
    "landlord": {
      "name": "string | null",
      "verified": "boolean"
    }
  }
  ```

  **Normalisation rules:**
  - `title`: Uses property title if available; defaults to `"Rental Property"`
  - `price`: Extracted as a number; omitted from prompts if null
  - `beds` / `baths`: Numeric; omitted from prompts if null
  - `location`: Address broken into parts; system uses whatever is available
  - `description`: Used as-is if present; AI generates one from other fields if absent
  - `images`: First 6 valid URLs only; uses placeholder if none exist
  - `features`: Array of amenity strings; empty array if none

  ---

  ## Stage 4 — AI Caption Generation

  CaptionService receives the normalised property object and the brand configuration. It generates three captions in parallel (one per platform) by:

  1. Loading the platform-specific prompt template
  2. Assembling the full prompt string:
     - System role instruction
     - Brand tone and style from brand.config.js
     - Normalised property data (only non-null fields)
     - Platform-specific formatting rules from the template
  3. Calling the Groq API
  4. On failure: retrying once with OpenRouter
  5. Returning captions as:

  ```json
  {
    "tiktok": "caption text...",
    "instagram": "caption text...",
    "facebook": "caption text..."
  }
  ```

  **Image processing runs in parallel with caption generation** — there is no dependency between them, so they are started simultaneously to reduce total response time.

  ---

  ## Stage 4a — Image Processing

  ImageService receives the image URL array from the normalised property object.

  For each image (max 6):
  1. Downloads the image as a buffer via HTTPS
  2. Applies watermark text using Sharp (brand name, positioned bottom-right)
  3. Resizes to each platform's required dimensions:
     - TikTok: 1080×1920 (9:16)
     - Instagram: 1080×1080 (1:1)
     - Facebook: 1200×630 (landscape)
  4. Returns named buffers

  If an image URL fails to download, it is skipped silently. If all images fail, the placeholder image from the main site is used.

  ---

  ## Stage 5 — Output Packaging

  ZipService assembles the final output:

  **captions.txt contents:**
  ```
  === TIKTOK ===
  {tiktok caption}

  === INSTAGRAM ===
  {instagram caption}

  === FACEBOOK ===
  {facebook caption}
  ```

  **images/ folder in ZIP:**
  ```
  tiktok-1.jpg
  tiktok-2.jpg
  instagram-1.jpg
  instagram-2.jpg
  facebook-1.jpg
  facebook-2.jpg
  ```

  The ZIP is streamed directly to the browser as `content-{listing-id}.zip`. Nothing is written to disk on the server.
  