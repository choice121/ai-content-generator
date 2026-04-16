const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const brand = require('../brand.config');

const execFileAsync = promisify(execFile);

async function callAI(system, user) {
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasGroq       = !!process.env.GROQ_API_KEY;

  async function tryOpenRouter() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), brand.AI_TIMEOUT_MS);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': `https://${brand.WEBSITE}`,
          'X-Title': brand.BRAND_NAME
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3-8b-instruct:free',
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          max_tokens: 250, temperature: 0.6
        }),
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
      const data = await res.json();
      return data.choices[0].message.content.trim();
    } finally { clearTimeout(timer); }
  }

  async function tryGroq() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), brand.AI_TIMEOUT_MS);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          max_tokens: 250, temperature: 0.6
        }),
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`Groq ${res.status}`);
      const data = await res.json();
      return data.choices[0].message.content.trim();
    } finally { clearTimeout(timer); }
  }

  if (hasOpenRouter) {
    try { return await tryOpenRouter(); } catch (err) {
      console.error(`[VoiceoverService] OpenRouter failed: ${err.message}`);
      if (hasGroq) return tryGroq();
    }
  }
  if (hasGroq) return tryGroq();
  throw new Error('No AI API key configured (OPENROUTER_API_KEY or GROQ_API_KEY)');
}

async function generateScript(property, tone) {
  const activeTone = tone || brand.DEFAULT_TONE;
  const loc      = [property.location?.city, property.location?.state].filter(Boolean).join(', ');
  const features = (property.features || []).slice(0, 3).join(', ');

  const system = `You are a professional real estate narrator for ${brand.BRAND_NAME}. 
Write short, spoken voiceover scripts for property listing videos. 
The script must be exactly 50-70 words. Natural spoken language only — no bullet points, no headers, no hashtags.
Tone: ${activeTone}.`;

  const user = `Write a spoken voiceover script for this property:
Title: ${property.title || 'Rental Property'}
${loc ? `Location: ${loc}` : ''}
${property.price ? `Price: $${Number(property.price).toLocaleString()}/month` : ''}
${property.beds ? `Bedrooms: ${property.beds}` : ''}
${property.baths ? `Bathrooms: ${property.baths}` : ''}
${features ? `Features: ${features}` : ''}
${property.description ? `Description: ${property.description}` : ''}

Brand: ${brand.BRAND_NAME} — "${brand.TAGLINE}"
End with a clear call to action mentioning ${brand.WEBSITE}.
Write ONLY the spoken script text. No stage directions. No quotation marks.`;

  return callAI(system, user);
}

async function synthesizeSpeech(text, outputPath) {
  const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
  const tts = new MsEdgeTTS();
  await tts.setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  return new Promise((resolve, reject) => {
    const readable    = tts.toStream(text);
    const writeStream = fs.createWriteStream(outputPath);
    readable.pipe(writeStream);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    readable.on('error', reject);
  });
}

async function mergeAudioWithVideo(videoPath, audioPath, outputPath) {
  const args = [
    '-i', videoPath,
    '-i', audioPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    '-y',
    outputPath
  ];
  await execFileAsync('ffmpeg', args, { timeout: 120000 });
}

async function generateVideoWithVoiceover(property, format, tone) {
  const { generateSlideshow } = require('./VideoService');

  const tmpDir  = path.join(os.tmpdir(), `ai-vo-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const videoBuffer = await generateSlideshow(property, format);
    const videoPath   = path.join(tmpDir, 'video.mp4');
    fs.writeFileSync(videoPath, videoBuffer);

    let script;
    try {
      script = await generateScript(property, tone);
      console.log(`[VoiceoverService] Script: ${script.slice(0, 80)}...`);
    } catch (err) {
      console.error(`[VoiceoverService] Script generation failed: ${err.message}`);
      return videoBuffer;
    }

    const audioPath  = path.join(tmpDir, 'voice.mp3');
    try {
      await synthesizeSpeech(script, audioPath);
    } catch (err) {
      console.error(`[VoiceoverService] TTS failed: ${err.message}`);
      return videoBuffer;
    }

    const outputPath = path.join(tmpDir, 'final.mp4');
    await mergeAudioWithVideo(videoPath, audioPath, outputPath);

    return { video: fs.readFileSync(outputPath), script };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  }
}

module.exports = { generateVideoWithVoiceover, generateScript };
