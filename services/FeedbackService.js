const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'feedback.json');

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (_) {}
  return { approved: [], banned_phrases: [], total_approved: 0 };
}

function save(data) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function approveCaption(platform, caption, propertyTitle, tone) {
  const data = load();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    platform,
    caption,
    propertyTitle: propertyTitle || 'Unknown',
    tone: tone || 'professional',
    timestamp: new Date().toISOString()
  };
  data.approved.push(entry);
  data.total_approved = (data.total_approved || 0) + 1;
  data.approved = data.approved.slice(-50);
  save(data);
  return entry;
}

function removeCaption(id) {
  const data = load();
  const before = data.approved.length;
  data.approved = data.approved.filter(e => e.id !== id);
  if (data.approved.length < before) save(data);
  return data.approved.length < before;
}

function addBannedPhrase(phrase) {
  const data = load();
  const clean = phrase.trim().toLowerCase();
  if (clean && !data.banned_phrases.includes(clean)) {
    data.banned_phrases.push(clean);
    save(data);
    return true;
  }
  return false;
}

function removeBannedPhrase(phrase) {
  const data = load();
  const clean = phrase.trim().toLowerCase();
  const before = data.banned_phrases.length;
  data.banned_phrases = data.banned_phrases.filter(p => p !== clean);
  if (data.banned_phrases.length < before) save(data);
  return data.banned_phrases.length < before;
}

function getApprovedExamples(platform, limit = 3) {
  const data = load();
  return data.approved
    .filter(e => e.platform === platform)
    .slice(-limit)
    .map(e => e.caption);
}

function getBannedPhrases() {
  return load().banned_phrases;
}

function getStats() {
  const data = load();
  const byPlatform = { tiktok: 0, instagram: 0, facebook: 0 };
  for (const e of data.approved) {
    if (byPlatform[e.platform] !== undefined) byPlatform[e.platform]++;
  }
  return {
    total_approved: data.total_approved || 0,
    current_approved: data.approved.length,
    banned_count: data.banned_phrases.length,
    by_platform: byPlatform,
    recent: data.approved.slice(-5).reverse(),
    banned_phrases: data.banned_phrases
  };
}

module.exports = {
  approveCaption,
  removeCaption,
  addBannedPhrase,
  removeBannedPhrase,
  getApprovedExamples,
  getBannedPhrases,
  getStats,
  load
};
