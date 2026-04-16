# AI Content Generator — Choice Properties

## Overview

An AI-powered social media content generator for Choice Properties real estate listings. Given a property URL or listing ID, it generates platform-optimised captions for TikTok, Instagram, and Facebook, and produces watermarked property images for each platform. Output is packaged as a downloadable ZIP.

## Architecture

- **Runtime:** Node.js 20 with Express.js
- **Port:** 5000 (0.0.0.0)
- **Frontend:** Vanilla HTML/CSS/JS (mobile-first SPA) served from `/public/`
- **Backend:** Express.js with four services in `/services/`

## Project Structure

```
server.js              — Express HTTP server and route definitions
brand.config.js        — Brand settings (single source of truth)
package.json           — Dependencies

/services/
  PropertyService.js   — Supabase data fetching and normalisation
  CaptionService.js    — AI caption generation (Groq + OpenRouter fallback)
  ImageService.js      — Image watermarking and resizing via Sharp
  ZipService.js        — ZIP packaging of captions and images

/prompts/
  tiktok.js            — TikTok prompt template
  instagram.js         — Instagram prompt template
  facebook.js          — Facebook prompt template

/public/
  index.html           — Mobile-first SPA UI
  app.js               — Frontend JS
  style.css            — Mobile-optimised styles
```

## API Routes

- `POST /generate-captions` — Returns JSON captions for all three platforms
- `POST /generate` — Returns a ZIP with captions.txt and watermarked images

## Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase REST API base URL |
| `SUPABASE_ANON_KEY` | Supabase authentication key |
| `GROQ_API_KEY` | Primary AI model (Groq Llama 3) |
| `OPENROUTER_API_KEY` | AI fallback (OpenRouter free models) |

## Key Design Decisions

- All image processing is in-memory (no disk writes)
- Captions are generated via the `/generate-captions` endpoint for faster UX; images are downloaded separately on-demand
- Groq is the primary AI; OpenRouter is the automatic fallback if Groq fails
- Max 6 images per request; each resized for TikTok (1080x1920), Instagram (1080x1080), and Facebook (1200x630)
- Watermark applied bottom-right with white text and drop shadow

## Workflow

- **Start application:** `node server.js` on port 5000
