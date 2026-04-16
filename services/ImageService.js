const fetch = require('node-fetch');
const sharp = require('sharp');
const brand = require('../brand.config');

const PLATFORM_DIMENSIONS = {
  tiktok:    { width: 1080, height: 1920 },
  instagram: { width: 1080, height: 1080 },
  facebook:  { width: 1200, height: 630 }
};

async function downloadImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), brand.IMAGE_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.buffer();
  } finally {
    clearTimeout(timeout);
  }
}

function buildWatermarkSvg(text, width, height, fontSize) {
  const padding = 20;
  const approxTextWidth = text.length * (fontSize * 0.6);
  const x = width - approxTextWidth - padding;
  const y = height - padding;

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .wm { font-family: sans-serif; font-size: ${fontSize}px; fill: white; fill-opacity: ${brand.WATERMARK_OPACITY}; }
        .shadow { font-family: sans-serif; font-size: ${fontSize}px; fill: black; fill-opacity: 0.5; }
      </style>
      <text class="shadow" x="${x + 2}" y="${y + 2}">${text}</text>
      <text class="wm" x="${x}" y="${y}">${text}</text>
    </svg>
  `);
}

async function processImage(buffer, platform) {
  const dims = PLATFORM_DIMENSIONS[platform];
  const watermarkSvg = buildWatermarkSvg(brand.WATERMARK_TEXT, dims.width, dims.height, brand.WATERMARK_FONT_SIZE);

  return sharp(buffer)
    .resize(dims.width, dims.height, { fit: 'cover', position: 'centre' })
    .composite([{ input: watermarkSvg, gravity: 'southeast', blend: 'over' }])
    .jpeg({ quality: brand.IMAGE_QUALITY })
    .toBuffer();
}

async function processImages(imageUrls) {
  const urls = (imageUrls || []).slice(0, brand.MAX_IMAGES_PER_REQUEST);
  const platforms = ['tiktok', 'instagram', 'facebook'];

  const buffers = [];

  for (const url of urls) {
    let rawBuffer;
    try {
      rawBuffer = await downloadImage(url);
    } catch (err) {
      console.error(`[ImageService] Failed to download image ${url}: ${err.message}`);
      continue;
    }

    for (const platform of platforms) {
      try {
        const processed = await processImage(rawBuffer, platform);
        buffers.push({ platform, buffer: processed });
      } catch (err) {
        console.error(`[ImageService] Failed to process image for ${platform}: ${err.message}`);
      }
    }
  }

  return buffers;
}

module.exports = { processImages };
