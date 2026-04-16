const fetch = require('node-fetch');
const sharp = require('sharp');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');
const brand = require('../brand.config');

const execFileAsync = promisify(execFile);

const FORMATS = {
  tiktok:   { width: 1080, height: 1920, label: 'TikTok / Reels (9:16)' },
  square:   { width: 1080, height: 1080, label: 'Instagram Feed (1:1)' },
  landscape:{ width: 1200, height: 630,  label: 'Facebook (16:9)' }
};

const SLIDE_DURATION  = 4;
const TRANSITION_DUR  = 0.5;
const FONT_FAMILY     = 'DejaVu Sans,Liberation Sans,Arial,sans-serif';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .slice(0, 80);
}

async function downloadImage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), brand.IMAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.buffer();
  } finally {
    clearTimeout(timer);
  }
}

async function buildBrandCard(width, height, title, subtitle, accent = false) {
  const bg = accent ? '#1a1a2e' : '#111122';
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${bg}"/>
      <line x1="${width * 0.1}" y1="${height / 2 - 60}" x2="${width * 0.9}" y2="${height / 2 - 60}"
            stroke="#ffffff" stroke-width="2" opacity="0.3"/>
      <text x="${width / 2}" y="${height / 2 - 10}"
            font-family="${FONT_FAMILY}" font-size="${Math.round(width * 0.055)}" font-weight="bold"
            fill="white" text-anchor="middle">${escapeHtml(title)}</text>
      <text x="${width / 2}" y="${height / 2 + Math.round(width * 0.06)}"
            font-family="${FONT_FAMILY}" font-size="${Math.round(width * 0.03)}"
            fill="#aaaacc" text-anchor="middle">${escapeHtml(subtitle)}</text>
      <line x1="${width * 0.1}" y1="${height / 2 + Math.round(width * 0.1)}" x2="${width * 0.9}" y2="${height / 2 + Math.round(width * 0.1)}"
            stroke="#ffffff" stroke-width="2" opacity="0.3"/>
    </svg>`;
  return sharp({ create: { width, height, channels: 3, background: { r: 26, g: 26, b: 46 } } })
    .composite([{ input: Buffer.from(svg), blend: 'over' }])
    .jpeg({ quality: 92 })
    .toBuffer();
}

async function buildSlideFrame(rawBuffer, width, height, lines) {
  const validLines = lines.filter(Boolean).map(l => String(l).slice(0, 70));
  const fontSize   = Math.round(width * 0.038);
  const lineH      = Math.round(fontSize * 1.5);
  const padV       = 18;
  const boxH       = validLines.length * lineH + padV * 2;
  const boxY       = height - boxH - 36;

  const textEls = validLines.map((l, i) =>
    `<text x="${width / 2}" y="${boxY + padV + (i + 1) * lineH - Math.round(fontSize * 0.25)}"
      font-family="${FONT_FAMILY}" font-size="${fontSize}" fill="white" text-anchor="middle"
      filter="url(#shadow)">${escapeHtml(l)}</text>`
  ).join('\n');

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="1" dy="1" stdDeviation="3" flood-color="black" flood-opacity="0.9"/>
        </filter>
      </defs>
      <rect x="0" y="${boxY}" width="${width}" height="${boxH}" fill="rgba(0,0,0,0.55)"/>
      ${textEls}
    </svg>`;

  return sharp(rawBuffer)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .composite([{ input: Buffer.from(svg), blend: 'over' }])
    .jpeg({ quality: 90 })
    .toBuffer();
}

async function runFFmpegSlideshow(framePaths, outputPath) {
  const n = framePaths.length;
  if (n === 0) throw new Error('No frames provided to ffmpeg');

  const args = [];
  for (const f of framePaths) {
    args.push('-loop', '1', '-t', String(SLIDE_DURATION), '-i', f);
  }

  if (n === 1) {
    args.push('-map', '0:v', '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-y', outputPath);
  } else {
    const scaleFilters  = framePaths.map((_, i) => `[${i}:v]setsar=1[v${i}]`);
    const xfadeFilters  = [];
    let current         = '[v0]';
    for (let i = 1; i < n; i++) {
      const offset   = i * (SLIDE_DURATION - TRANSITION_DUR);
      const outLabel = i === n - 1 ? '[vout]' : `[xf${i}]`;
      xfadeFilters.push(`${current}[v${i}]xfade=transition=fade:duration=${TRANSITION_DUR}:offset=${offset}${outLabel}`);
      current = outLabel;
    }
    const fg = [...scaleFilters, ...xfadeFilters].join(';');
    args.push('-filter_complex', fg, '-map', '[vout]',
              '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-y', outputPath);
  }

  await execFileAsync('ffmpeg', args, { timeout: 120000 });
}

async function generateSlideshow(property, format = 'tiktok') {
  const { width, height } = FORMATS[format] || FORMATS.tiktok;
  const jobId  = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tmpDir = path.join(os.tmpdir(), `ai-video-${jobId}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const frames = [];

    const introBuffer = await buildBrandCard(width, height, brand.BRAND_NAME, brand.TAGLINE, true);
    const introPath   = path.join(tmpDir, '00-intro.jpg');
    fs.writeFileSync(introPath, introBuffer);
    frames.push(introPath);

    const slideTexts = [
      [property.title, property.location?.city ? `📍 ${property.location.city}` : null],
      [
        property.price   ? `$${Number(property.price).toLocaleString()}/month` : null,
        [property.beds && `${property.beds} bed`, property.baths && `${property.baths} bath`].filter(Boolean).join('  ·  ') || null
      ],
      property.features?.slice(0, 1).map(f => `✨ ${f}`)  || [],
      property.features?.slice(1, 2).map(f => `✨ ${f}`)  || [],
      [`${brand.WEBSITE}`, brand.CTA_PHRASES?.inquiry || 'Contact us today']
    ];

    const imageUrls = (property.images || []).slice(0, 5);
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const raw    = await downloadImage(imageUrls[i]);
        const text   = slideTexts[i] || [];
        const buf    = await buildSlideFrame(raw, width, height, text);
        const fPath  = path.join(tmpDir, `${String(i + 1).padStart(2, '0')}-slide.jpg`);
        fs.writeFileSync(fPath, buf);
        frames.push(fPath);
      } catch (err) {
        console.error(`[VideoService] Skipping image ${i}: ${err.message}`);
      }
    }

    if (frames.length < 2) {
      const fallback = await buildBrandCard(width, height, property.title || 'Property', property.location?.city || 'Premium Listing');
      const fPath    = path.join(tmpDir, '01-fallback.jpg');
      fs.writeFileSync(fPath, fallback);
      frames.push(fPath);
    }

    const outroBuffer = await buildBrandCard(width, height, brand.WEBSITE, brand.CTA_PHRASES?.inquiry || 'Contact us today');
    const outroPath   = path.join(tmpDir, '99-outro.jpg');
    fs.writeFileSync(outroPath, outroBuffer);
    frames.push(outroPath);

    const outputPath = path.join(tmpDir, 'slideshow.mp4');
    await runFFmpegSlideshow(frames, outputPath);

    return fs.readFileSync(outputPath);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  }
}

module.exports = { generateSlideshow, FORMATS };
