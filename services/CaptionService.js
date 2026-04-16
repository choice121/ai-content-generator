const fetch = require('node-fetch');
const brand = require('../brand.config');

const tiktokTemplate = require('../prompts/tiktok');
const instagramTemplate = require('../prompts/instagram');
const facebookTemplate = require('../prompts/facebook');

function buildPropertyText(property) {
  const lines = [];
  lines.push(`Property title: ${property.title}`);
  if (property.price) lines.push(`Price: ${property.price}/month`);
  if (property.beds) lines.push(`Bedrooms: ${property.beds}`);
  if (property.baths) lines.push(`Bathrooms: ${property.baths}`);

  const loc = property.location;
  const locationParts = [loc.address, loc.city, loc.state].filter(Boolean);
  if (locationParts.length > 0) lines.push(`Location: ${locationParts.join(', ')}`);

  if (property.description) lines.push(`Description: ${property.description}`);
  if (property.features && property.features.length > 0) {
    lines.push(`Key features: ${property.features.join(', ')}`);
  }

  return lines.join('\n');
}

function buildPrompt(template, property, tone) {
  const activeTone = tone || brand.DEFAULT_TONE;
  const cta = brand.CTA_PHRASES[template.ctaStyle] || '';
  const propertyText = buildPropertyText(property);

  const system = `You are a professional real estate social media copywriter for ${brand.BRAND_NAME}.\nYour writing is ${activeTone} in tone. You always represent the brand authentically.\nNever fabricate property details. Only use the information provided.`;

  const brandContext = `Brand: ${brand.BRAND_NAME}\nTagline: ${brand.TAGLINE}\nTone: ${activeTone}\nDefault CTA: ${cta}`;

  const platformInstructions = `Platform: ${template.platform}\nMax caption length: ${template.maxChars} characters\nInclude ${template.hashtagCount} relevant hashtags at the end.\nEmoji usage: ${template.emojiUsage}\nUse line breaks: ${template.lineBreaks}\nFormat guidance: ${template.formatNotes}\nCTA style: ${template.ctaStyle}`;

  const userPrompt = `${brandContext}\n\n${propertyText}\n\n${platformInstructions}\n\nWrite one caption only. No preamble, no explanation.`;

  return { system, user: userPrompt };
}

async function callGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), brand.AI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), brand.AI_TIMEOUT_MS);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': `https://${brand.WEBSITE}`,
        'X-Title': brand.BRAND_NAME
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3-8b-instruct:free',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function generateCaptionForPlatform(template, property, tone) {
  const prompt = buildPrompt(template, property, tone);

  try {
    return await callGroq(prompt);
  } catch (groqErr) {
    console.error(`[CaptionService] Groq failed for ${template.platform}: ${groqErr.message}. Trying OpenRouter...`);
    try {
      return await callOpenRouter(prompt);
    } catch (orErr) {
      console.error(`[CaptionService] OpenRouter also failed for ${template.platform}: ${orErr.message}`);
      return null;
    }
  }
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
