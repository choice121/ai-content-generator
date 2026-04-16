# Brand Configuration System

## Overview

All brand identity settings are stored in a single file: `/ai-content/brand.config.js`.

This file is the single source of truth for how the system represents the brand across all generated content. Changing a value here automatically affects all caption generation, image watermarking, and output formatting — no code changes required.

---

## Full Configuration Reference

```js
module.exports = {

  // Identity
  BRAND_NAME: "Choice Properties",
  TAGLINE: "Your trust is our standard.",
  WEBSITE: "choiceproperties.com",
  EMAIL: "hello@choiceproperties.com",

  // AI Tone
  // Options: professional | luxury | casual | urgent | friendly
  DEFAULT_TONE: "professional",

  // Watermark Settings
  WATERMARK_TEXT: "ChoiceProperties.com",
  WATERMARK_POSITION: "bottom-right",  // bottom-right | bottom-left | bottom-center
  WATERMARK_OPACITY: 0.85,
  WATERMARK_FONT_SIZE: 28,

  // Brand Colors
  PRIMARY_COLOR: "#FFFFFF",
  ACCENT_COLOR: "#000000",

  // Hashtags per platform
  DEFAULT_HASHTAGS: {
    general:   ["#rental", "#realestate", "#property", "#forsale", "#housing", "#homegoals"],
    tiktok:    ["#fyp", "#housecheck", "#rentaltok", "#realestatetok", "#apartmenttour"],
    instagram: ["#apartmentliving", "#luxuryliving", "#rentallife", "#househunting", "#dreamhome"],
    facebook:  ["#rentallistings", "#propertyforsale", "#realestateinvesting", "#homebuying"]
  },

  // Call-to-Action Phrases
  CTA_PHRASES: {
    inquiry:  "Contact us today to schedule a viewing.",
    urgency:  "Limited availability — inquire now before it's gone.",
    question: "Could this be your next home?",
    none:     ""
  },

  // Performance Limits
  MAX_IMAGES_PER_REQUEST: 6,
  AI_TIMEOUT_MS: 10000,
  IMAGE_TIMEOUT_MS: 15000,
  IMAGE_QUALITY: 85,

};
```

---

## How This File Affects the System

| Setting | Where It Is Used |
|---------|-----------------|
| `BRAND_NAME` | Injected into every AI system prompt |
| `TAGLINE` | Injected into AI brand context layer |
| `DEFAULT_TONE` | Sets the default writing style; overridable per request |
| `WATERMARK_TEXT` | Rendered onto every processed image |
| `WATERMARK_POSITION` | Controls where the watermark appears on each image |
| `WATERMARK_OPACITY` | Controls watermark visibility |
| `PRIMARY_COLOR` | Watermark text colour |
| `DEFAULT_HASHTAGS` | Merged with prompt output in every caption |
| `CTA_PHRASES` | Matched to each platform template's ctaStyle value |
| `MAX_IMAGES_PER_REQUEST` | Hard cap enforced in ImageService |
| `AI_TIMEOUT_MS` | Groq API call timeout; triggers OpenRouter fallback on expiry |
| `IMAGE_TIMEOUT_MS` | Total image processing timeout per request |

---

## How to Update Brand Settings

1. Open `/ai-content/brand.config.js`
2. Edit the relevant value
3. Save the file
4. Restart the AI content service workflow

No database changes. No redeployment of the main site. Changes take effect immediately after restart.

---

## Future Additions (Phase 4)

Phase 4 will add the following optional fields:
- `APPROVED_STYLES`: Array of rated caption styles that performed well
- `BANNED_PHRASES`: Words or phrases to always exclude from output
- `PREFERRED_HASHTAGS`: Promoted hashtags based on performance tracking

These are additive — existing config structure remains unchanged.