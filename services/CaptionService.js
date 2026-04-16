const fetch = require('node-fetch');
const brand = require('../brand.config');
const feedback = require('./FeedbackService');

const tiktokTemplate    = require('../prompts/tiktok');
const instagramTemplate = require('../prompts/instagram');
const facebookTemplate  = require('../prompts/facebook');

function buildPropertyText(property) {
  const lines = [];
  lines.push(`Property title: ${property.title}`);
  if (property.price) lines.push(`Price: $${Number(property.price).toLocaleString()}/month`);
  if (property.beds)  lines.push(`Bedrooms: ${property.beds}`);
  if (property.baths) lines.push(`Bathrooms: ${property.baths}`);
  const loc = [property.location?.address, property.location?.city, property.location?.state].filter(Boolean);
  if (loc.length) lines.push(`Location: ${loc.join(', ')}`);
  if (property.description) lines.push(`Description: ${property.description}`);
  if (property.features?.length) lines.push(`Key features: ${property.features.join(', ')}`);
  return lines.join('\n');
}

function buildPrompt(template, property, tone) {
  const activeTone     = tone || brand.DEFAULT_TONE;
  const cta            = brand.CTA_PHRASES[template.ctaStyle] || '';
  const propertyText   = buildPropertyText(property);
  const bannedPhrases  = feedback.getBannedPhrases();
  const approvedExamples = feedback.getApprovedExamples(template.platform, 3);

  const system = [
    `You are a professional real estate social media copywriter for ${brand.BRAND_NAME}.`,
    `Your writing is ${activeTone} in tone. You always represent the brand authentically.`,
    `Never fabricate property details. Only use the information provided.`,
    bannedPhrases.length ? `\nNever use these phrases: ${bannedPhrases.join(', ')}.` : ''
  ].filter(Boolean).join('\n');

  let approvedBlock = '';
  if (approvedExamples.length > 0) {
    approvedBlock = `\nHere are examples of approved high-performing ${template.platform} captions. Match this style:\n` +
      approvedExamples.map((e, i) => `${i + 1}. "${e}"`).join('\n') + '\n';
  }

  const brandContext = `Brand: ${brand.BRAND_NAME}\nTagline: ${brand.TAGLINE}\nTone: ${activeTone}\nDefault CTA: ${cta}`;
  const platformInstructions = [
    `Platform: ${template.platform}`,
    `Max caption length: ${template.maxChars} characters`,
    `Include ${template.hashtagCount} relevant hashtags at the end.`,
    `Emoji usage: ${template.emojiUsage}`,
    `Use line breaks: ${template.lineBreaks}`,
    `Format guidance: ${template.formatNotes}`,
    `CTA style: ${template.ctaStyle}`
  ].join('\n');

  const user = `${brandContext}\n${approvedBlock}\n${propertyText}\n\n${platformInstructions}\n\nWrite one caption only. No preamble, no explanation.`;

  return { system, user };
}

async function callGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), brand.AI_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
        max_tokens: 500,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    if (!res.ok) { const t = await res.text(); throw new Error(`Groq ${res.status}: ${t}`); }
    const data = await res.json();
    return data.choices[0].message.content.trim();
  } finally { clearTimeout(timer); }
}

async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), brand.AI_TIMEOUT_MS);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': `https://${brand.WEBSITE}`,
        'X-Title': brand.BRAND_NAME
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3-8b-instruct:free',
        messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
        max_tokens: 500,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    if (!res.ok) { const t = await res.text(); throw new Error(`OpenRouter ${res.status}: ${t}`); }
    const data = await res.json();
    return data.choices[0].message.content.trim();
  } finally { clearTimeout(timer); }
}

async function generateCaptionForPlatform(template, property, tone) {
  const prompt = buildPrompt(template, property, tone);

  // OpenRouter is primary (works in more regions). Groq is fallback if available.
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasGroq       = !!process.env.GROQ_API_KEY;

  if (hasOpenRouter) {
    try {
      return await callOpenRouter(prompt);
    } catch (orErr) {
      console.error(`[CaptionService] OpenRouter failed (${template.platform}): ${orErr.message}.${hasGroq ? ' Trying Groq...' : ''}`);
      if (hasGroq) {
        try { return await callGroq(prompt); }
        catch (groqErr) {
          console.error(`[CaptionService] Groq also failed (${template.platform}): ${groqErr.message}`);
          return null;
        }
      }
      return null;
    }
  }

  if (hasGroq) {
    try {
      return await callGroq(prompt);
    } catch (groqErr) {
      console.error(`[CaptionService] Groq failed (${template.platform}): ${groqErr.message}`);
      return null;
    }
  }

  console.error('[CaptionService] No AI API key configured (OPENROUTER_API_KEY or GROQ_API_KEY).');
  return null;
}

async function generateCaptions(property, tone) {
  const [tiktok, instagram, facebook] = await Promise.all([
    generateCaptionForPlatform(tiktokTemplate, property, tone),
    generateCaptionForPlatform(instagramTemplate, property, tone),
    generateCaptionForPlatform(facebookTemplate, property, tone)
  ]);
  return { tiktok, instagram, facebook };
}

module.exports = { generateCaptions };
