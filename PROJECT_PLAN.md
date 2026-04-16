# Project Plan

  ## System Goal

  Build an AI-powered content creation tool that reads property listings from the Choice Properties database and produces ready-to-post social media content — captions and branded images — for TikTok, Instagram, and Facebook.

  The system is designed to save time, maintain brand consistency, and scale across all active property listings without requiring manual content creation.

  ---

  ## Core Requirements

  - Accept a property URL or listing ID as input
  - Fetch and normalise property data from Supabase
  - Generate platform-specific captions using a free AI model
  - Watermark and resize property photos per platform specification
  - Output a downloadable package (captions + images)
  - Run entirely on free infrastructure
  - Be accessible and operable from a mobile browser

  ---

  ## Constraints (Non-Negotiable)

  - No paid APIs, tools, subscriptions, or services
  - No credit card requirements
  - Mobile-friendly interface required
  - Must remain simple and maintainable
  - Must be expandable for future features (chat, recommendations, automation)

  ---

  ## Phased Development Overview

  ### Phase 1 — Captions + Watermarked Images *(current scope)*
  The foundation. Takes a property listing and produces AI-generated captions and branded images for all three platforms. Output is downloadable. See [PHASES.md](./PHASES.md) for strict scope definition.

  ### Phase 2 — Slideshow Video Generation
  Adds video output using FFmpeg. Produces MP4 slideshows with transitions, text overlays, and background music in 9:16 (TikTok/Reels) and 1:1 (Instagram feed) formats.

  ### Phase 3 — Voiceover + Enhanced Video
  Adds spoken narration using Edge TTS (free, no API key needed). Voiceover synced to property slides. Intro and outro branding cards added.

  ### Phase 4 — Brand Learning and Memory
  System tracks approved content and learns which tones, formats, and styles perform well. AI prompts are refined over time. Hashtag performance tracking added.

  ---

  ## Phase 1 — Detailed Scope

  ### Included in Phase 1

  - Property input: URL or listing ID
  - Supabase data fetch and normalisation
  - Graceful handling of missing or incomplete fields
  - AI caption generation (Groq API, OpenRouter fallback)
  - Platform-specific captions for TikTok, Instagram, and Facebook
  - Image download from ImageKit CDN
  - Watermarking with brand identity using Sharp
  - Image resizing per platform specifications
  - Mobile-friendly UI: input, generate, preview, download
  - Downloadable output: captions.txt and images.zip

  ### Excluded from Phase 1

  - Video generation of any kind
  - Voiceover
  - Brand learning or analytics
  - Posting or scheduling to social platforms
  - User accounts or authentication

  ---

  ## Technology Decisions

  | Component | Choice | Reason |
  |-----------|--------|--------|
  | Language | Node.js | Already used in main project; no new runtime |
  | Server | Express.js | Minimal, well-understood, zero bloat |
  | AI/LLM | Groq (free tier) | No credit card, fast, Llama 3 quality |
  | AI fallback | OpenRouter (free models) | Same API format as Groq; one-line swap |
  | Image processing | Sharp | Fastest Node.js image library; no native deps issues |
  | Output packaging | archiver (ZIP) | Lightweight, well-supported |
  | UI | Vanilla HTML/CSS/JS | Mobile-first, no framework overhead |
  | Hosting | Replit (second workflow) | Already available; no extra cost |
  