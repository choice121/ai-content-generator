# Prompt Template System

## Design Philosophy

Prompts are the most critical component of this system. Poor prompts produce generic, off-brand content. This system uses a structured template approach where brand identity, platform rules, and property data are assembled dynamically at runtime — never hardcoded as static strings.

---

## Template System Structure

Each platform has its own template file under `/prompts/`. Each file exports a plain JavaScript object describing the generation parameters for that platform.

### Template Object Shape

```js
module.exports = {
  platform: "instagram",          // Platform identifier
  captionLength: "medium",        // "short" | "medium" | "long"
  maxChars: 220,                  // Hard character limit for caption
  hashtagCount: 12,               // Number of hashtags to append
  ctaStyle: "question",           // "question" | "urgency" | "inquiry" | "none"
  emojiUsage: "moderate",         // "none" | "light" | "moderate" | "heavy"
  lineBreaks: true,               // Whether to include paragraph breaks
  formatNotes: "..."              // Human-readable instruction for the AI
};
```

---

## Platform Templates

### TikTok (`/prompts/tiktok.js`)

```js
{
  platform: "tiktok",
  captionLength: "short",
  maxChars: 150,
  hashtagCount: 8,
  ctaStyle: "urgency",
  emojiUsage: "heavy",
  lineBreaks: false,
  formatNotes: "Write like a TikTok creator — punchy, energetic, and direct. Hook the viewer in the first 5 words. End with a strong call to action."
}
```

### Instagram (`/prompts/instagram.js`)

```js
{
  platform: "instagram",
  captionLength: "medium",
  maxChars: 220,
  hashtagCount: 12,
  ctaStyle: "question",
  emojiUsage: "moderate",
  lineBreaks: true,
  formatNotes: "Write in a warm, aspirational tone. Lead with the lifestyle, not the specs. Use line breaks between ideas. End with a question that invites engagement."
}
```

### Facebook (`/prompts/facebook.js`)

```js
{
  platform: "facebook",
  captionLength: "long",
  maxChars: 400,
  hashtagCount: 5,
  ctaStyle: "inquiry",
  emojiUsage: "light",
  lineBreaks: true,
  formatNotes: "Write for a detail-oriented audience. Include key property facts. Professional but approachable tone. End with a clear call to action to inquire."
}
```

---

## Dynamic Prompt Assembly

At runtime, CaptionService builds the final prompt by combining four layers:

### Layer 1 — System Role
```
You are a professional real estate social media copywriter for {BRAND_NAME}.
Your writing is {tone} in tone. You always represent the brand authentically.
Never fabricate property details. Only use the information provided.
```

### Layer 2 — Brand Context
Pulled from `brand.config.js`:
```
Brand: {BRAND_NAME}
Tagline: {TAGLINE}
Tone: {DEFAULT_TONE}
Default CTA: {CTA_PHRASES[ctaStyle]}
```

### Layer 3 — Property Data
Only non-null fields are included. Example:
```
Property title: {title}
Price: {price}/month        <- omitted if null
Bedrooms: {beds}            <- omitted if null
Bathrooms: {baths}          <- omitted if null
Location: {city}, {state}
Description: {description}  <- AI generates from other fields if null
Key features: {features}
```

### Layer 4 — Platform Instructions
From the template object:
```
Platform: {platform}
Max caption length: {maxChars} characters
Include {hashtagCount} relevant hashtags at the end.
Emoji usage: {emojiUsage}
Use line breaks: {lineBreaks}
Format guidance: {formatNotes}
CTA style: {ctaStyle}
```

---

## Tone Options

| Tone | Description |
|------|-------------|
| `professional` | Polished, formal, trustworthy |
| `luxury` | Aspirational, premium, elevated language |
| `casual` | Friendly, approachable, everyday language |
| `urgent` | Scarcity-focused, action-oriented |
| `friendly` | Warm, welcoming, community-feel |

---

## Extending the System

To add a new platform:
1. Create `/prompts/{platform}.js` following the template shape above
2. Add the platform's hashtag set to `brand.config.js`
3. Add a CTA phrase for the platform if needed
4. Import and call the template in `CaptionService.js`

No other files need to change.