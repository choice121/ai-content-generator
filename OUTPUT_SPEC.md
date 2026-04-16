# Output Specification

## UI Behaviour (Mobile-First)

The interface is a single-page web application designed primarily for mobile use. It requires no account, no login, and no app installation. It is accessed via the browser at the AI content service URL.

---

## User Flow

### Step 1 — Input
The page presents a single input field and a Generate button.

The user provides one of:
- A full property URL from the Choice Properties website
  - Example: `https://choiceproperties.com/property/3-bed-apartment-lagos`
- A raw listing ID (UUID or slug) copied from the Supabase dashboard or admin panel

An optional tone selector allows overriding the default brand tone for this specific generation:
- Professional (default)
- Luxury
- Casual
- Urgent
- Friendly

### Step 2 — Loading State
A clear loading indicator appears: `"Generating your content — this takes about 10 seconds..."`

The button is disabled during generation to prevent duplicate submissions.

### Step 3 — Results
Results appear on the same page below the input without a page reload.

Results are organised into three collapsible sections, one per platform:

**Each platform section contains:**
- Platform name and icon (TikTok / Instagram / Facebook)
- Generated caption displayed in a readable text box
- One-tap copy button (copies caption to clipboard)
- Thumbnail previews of processed images for that platform

### Step 4 — Download
Two download buttons appear at the bottom of the results:

| Button | Output |
|--------|--------|
| Download Captions | `captions.txt` — plain text, all three platforms clearly labelled |
| Download Images | `content-{listing-id}.zip` — all processed images named by platform |

---

## captions.txt Format

```
Choice Properties — Content Package
Property: {title}
Generated: {date}
========================================

=== TIKTOK ===
{tiktok caption text}

=== INSTAGRAM ===
{instagram caption text}

=== FACEBOOK ===
{facebook caption text}
```

---

## images.zip Contents and Naming

All images inside the ZIP follow a consistent naming convention:

```
content-{listing-id}.zip
  tiktok-1.jpg     (9:16 — 1080x1920px)
  tiktok-2.jpg
  tiktok-3.jpg
  instagram-1.jpg  (1:1 — 1080x1080px)
  instagram-2.jpg
  instagram-3.jpg
  facebook-1.jpg   (landscape — 1200x630px)
  facebook-2.jpg
  facebook-3.jpg
```

Each platform receives up to 3 images (from the first 6 source images, distributed 3 per platform grouping).
All images are JPEG at 85% quality with the brand watermark applied.

---

## Platform Image Dimensions

| Platform | Ratio | Dimensions | Use Case |
|----------|-------|------------|---------|
| TikTok | 9:16 | 1080 x 1920px | TikTok video thumbnail / story post |
| Instagram | 1:1 | 1080 x 1080px | Feed post |
| Facebook | 16:9 | 1200 x 630px | Link preview / timeline post |

---

## Watermark Placement

Watermark text (e.g., `ChoiceProperties.com`) is rendered:
- Position: bottom-right corner (configurable in brand.config.js)
- With padding from edges: 20px
- Font: Sans-serif, white with dark shadow for contrast on any background
- Opacity: 0.85 (configurable)

---

## Caption Variations (Future)

Phase 1 generates one caption per platform per request.

A future update (Phase 1 enhancement) will add a `Regenerate` button per platform, allowing the user to request an alternative caption without re-processing images.
This is not in Phase 1 scope but the UI layout should leave space for it.