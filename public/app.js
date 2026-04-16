'use strict';

let currentInput       = null;
let currentTone        = null;
let currentCaptions    = null;
let currentPropertyTitle = null;
let currentVideoJobId  = null;
let currentVideoUrl    = null;
let pollInterval       = null;

// ── TAB NAVIGATION ────────────────────────────────
function showTab(tab) {
  const isGenerate = tab === 'generate';
  document.getElementById('inputCard').classList.toggle('hidden', !isGenerate);
  document.getElementById('resultsSection').classList.toggle('hidden', !isGenerate || !currentCaptions);
  document.getElementById('feedbackTab').classList.toggle('hidden', isGenerate);
  document.getElementById('errorBox').classList.add('hidden');
  document.getElementById('loadingCard').classList.add('hidden');
  if (!isGenerate) loadFeedbackStats();
}

// ── UTILITY ──────────────────────────────────────
function $(id) { return document.getElementById(id); }

function showError(msg) {
  const el = $('errorBox');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearError() { $('errorBox').classList.add('hidden'); }

function setLoading(on, msg) {
  $('loadingCard').classList.toggle('hidden', !on);
  $('loadingMsg').textContent = msg || 'Generating your content — this takes about 10 seconds...';
  $('genCaptionsBtn').disabled  = on;
  $('genImagesBtn').disabled    = on;
  if (on) {
    clearError();
    $('resultsSection').classList.add('hidden');
  }
}

function toast(msg, duration = 2500) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

// ── COLLAPSIBLE PLATFORM CARDS ────────────────────
function togglePlatform(platform) {
  const body  = $(`body-${platform}`);
  const arrow = $(`arrow-${platform}`);
  body.classList.toggle('collapsed');
  arrow.classList.toggle('open');
}

function expandAll() {
  ['tiktok', 'instagram', 'facebook'].forEach(p => {
    $(`body-${p}`).classList.remove('collapsed');
    $(`arrow-${p}`).classList.remove('open');
  });
}

// ── GENERATE CAPTIONS ────────────────────────────
async function handleGenerateCaptions() {
  const input = $('propertyInput').value.trim();
  const tone  = $('toneSelect').value;
  if (!input) { showError('Please enter a valid property URL or listing ID.'); return; }

  currentInput = input;
  currentTone  = tone;
  setLoading(true);

  try {
    const res  = await fetch('/generate-captions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, tone })
    });
    const data = await res.json();
    if (!res.ok) { showError(data.error || 'An error occurred. Please try again.'); return; }

    currentCaptions      = data.captions;
    currentPropertyTitle = data.property?.title || 'Property';

    $('resultPropertyTitle').textContent = currentPropertyTitle;
    $('caption-tiktok').value    = data.captions.tiktok    || 'Caption generation temporarily unavailable.';
    $('caption-instagram').value = data.captions.instagram || 'Caption generation temporarily unavailable.';
    $('caption-facebook').value  = data.captions.facebook  || 'Caption generation temporarily unavailable.';

    expandAll();
    $('resultsSection').classList.remove('hidden');
    resetVideoSection();
  } catch (err) {
    showError('Network error. Check your connection and try again.');
  } finally {
    setLoading(false);
  }
}

// ── DOWNLOAD IMAGES ZIP ──────────────────────────
async function handleDownloadImages() {
  const input = currentInput || $('propertyInput').value.trim();
  const tone  = currentTone  || $('toneSelect').value;
  if (!input) { showError('Please generate captions first, or enter a property URL.'); return; }

  setLoading(true, 'Processing and watermarking images — this takes 10–20 seconds...');
  try {
    const res = await fetch('/generate-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, tone })
    });
    if (!res.ok) {
      const data = await res.json();
      showError(data.error || 'Image packaging failed. Please try again.');
      return;
    }
    const blob = await res.blob();
    triggerDownload(blob, `content-images.zip`);
    toast('Images downloaded!');
  } catch (err) {
    showError('Network error downloading images.');
  } finally {
    setLoading(false);
  }
}

// ── COPY CAPTION ─────────────────────────────────
function copyCaption(platform) {
  const ta  = $(`caption-${platform}`);
  const btn = ta.closest('.platform-body').querySelector('.btn-sm:not(.approve)');
  navigator.clipboard.writeText(ta.value).then(() => {
    btn.textContent = '✓ Copied';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  }).catch(() => {
    ta.select();
    document.execCommand('copy');
    btn.textContent = '✓ Copied';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });
}

// ── DOWNLOAD CAPTIONS TXT ────────────────────────
function downloadCaptionsTxt() {
  if (!currentCaptions) return;
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  let txt = `Choice Properties — Content Package\nProperty: ${currentPropertyTitle || 'Unknown'}\nGenerated: ${date}\n${'='.repeat(42)}\n\n`;
  if (currentCaptions.tiktok)    txt += `=== TIKTOK ===\n${currentCaptions.tiktok}\n\n`;
  if (currentCaptions.instagram) txt += `=== INSTAGRAM ===\n${currentCaptions.instagram}\n\n`;
  if (currentCaptions.facebook)  txt += `=== FACEBOOK ===\n${currentCaptions.facebook}\n\n`;
  triggerDownload(new Blob([txt], { type: 'text/plain' }), 'captions.txt');
}

// ── VIDEO GENERATION ─────────────────────────────
function resetVideoSection() {
  $('videoProgress').classList.add('hidden');
  $('videoResult').classList.add('hidden');
  $('genVideoBtn').disabled = false;
  $('genVideoBtn').textContent = '🎬 Generate Video';
  currentVideoJobId = null;
  currentVideoUrl   = null;
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

async function handleGenerateVideo() {
  const input     = currentInput || $('propertyInput').value.trim();
  const tone      = currentTone  || $('toneSelect').value;
  const format    = $('videoFormatSelect').value;
  const voiceover = $('voiceoverToggle').checked;

  if (!input) { showError('Please generate captions first, or enter a property URL.'); return; }

  $('genVideoBtn').disabled    = true;
  $('genVideoBtn').textContent = 'Generating...';
  $('videoProgress').classList.remove('hidden');
  $('videoProgressMsg').textContent = 'Starting video generation...';
  $('videoResult').classList.add('hidden');

  try {
    const res  = await fetch('/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, tone, format, voiceover })
    });
    const data = await res.json();
    if (!res.ok) { showVideoError(data.error || 'Video generation failed.'); return; }

    currentVideoJobId = data.jobId;
    startPolling(data.jobId);
  } catch (err) {
    showVideoError('Network error starting video generation.');
  }
}

function startPolling(jobId) {
  pollInterval = setInterval(async () => {
    try {
      const res  = await fetch(`/video-status/${jobId}`);
      const data = await res.json();

      $('videoProgressMsg').textContent = data.progress || 'Processing...';

      if (data.status === 'done') {
        clearInterval(pollInterval);
        pollInterval = null;
        showVideoResult(jobId, data);
      } else if (data.status === 'failed') {
        clearInterval(pollInterval);
        pollInterval = null;
        showVideoError(data.error || 'Video generation failed. Please try again.');
      }
    } catch (_) {}
  }, 3000);
}

function showVideoResult(jobId, data) {
  $('videoProgress').classList.add('hidden');
  $('genVideoBtn').disabled    = false;
  $('genVideoBtn').textContent = '🎬 Generate Video';

  const videoUrl   = `/video-download/${jobId}`;
  currentVideoUrl  = videoUrl;
  const preview    = $('videoPreview');
  preview.src      = videoUrl;
  preview.load();

  if (data.script) {
    $('videoScriptText').textContent = data.script;
    $('videoScriptBlock').classList.remove('hidden');
  } else {
    $('videoScriptBlock').classList.add('hidden');
  }

  $('videoResult').classList.remove('hidden');
  toast('Video ready! 🎬');
}

function showVideoError(msg) {
  $('videoProgress').classList.add('hidden');
  $('genVideoBtn').disabled    = false;
  $('genVideoBtn').textContent = '🎬 Generate Video';
  showError(msg);
}

function downloadVideo() {
  if (!currentVideoJobId && !currentVideoUrl) return;
  const link = document.createElement('a');
  link.href  = currentVideoUrl;
  link.download = `choice-properties-video.mp4`;
  link.click();
}

// ── APPROVE CAPTION (Phase 4) ─────────────────────
async function approveCaption(platform) {
  const caption = $(`caption-${platform}`).value;
  if (!caption || caption.includes('unavailable')) { toast('No caption to approve.'); return; }

  try {
    const res = await fetch('/feedback/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, caption, propertyTitle: currentPropertyTitle, tone: currentTone })
    });
    const data = await res.json();
    if (data.success) { toast(`✓ ${platform} caption approved — AI will learn from it`); }
  } catch (_) { toast('Failed to save approval.'); }
}

// ── FEEDBACK STATS (Phase 4) ──────────────────────
async function loadFeedbackStats() {
  try {
    const res  = await fetch('/feedback/stats');
    const data = await res.json();

    $('statTotal').textContent  = data.total_approved ?? 0;
    $('statTiktok').textContent = data.by_platform?.tiktok    ?? 0;
    $('statInsta').textContent  = data.by_platform?.instagram  ?? 0;
    $('statFb').textContent     = data.by_platform?.facebook   ?? 0;

    renderBannedList(data.banned_phrases || []);
    renderApprovedList(data.recent || []);
  } catch (_) {}
}

function renderBannedList(phrases) {
  const el = $('bannedList');
  if (!phrases.length) { el.innerHTML = '<span style="font-size:13px;color:#9ca3af">No banned phrases yet.</span>'; return; }
  el.innerHTML = phrases.map(p =>
    `<span class="banned-tag">${p} <button onclick="removeBannedPhrase('${p.replace(/'/g, "\\'")}')">×</button></span>`
  ).join('');
}

function renderApprovedList(items) {
  const el = $('approvedList');
  if (!items.length) { el.innerHTML = '<p style="font-size:13px;color:#9ca3af">No approved captions yet. Approve captions after generating them.</p>'; return; }
  el.innerHTML = items.map(item => `
    <div class="approved-item">
      <div class="approved-item-header">
        <span class="approved-platform">${item.platform}</span>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="approved-meta">${new Date(item.timestamp).toLocaleDateString()}</span>
          <button class="btn-sm danger" onclick="removeApproved('${item.id}')">Remove</button>
        </div>
      </div>
      <p class="approved-caption">${item.caption.slice(0, 180)}${item.caption.length > 180 ? '…' : ''}</p>
    </div>
  `).join('');
}

async function addBannedPhrase() {
  const input  = $('bannedPhraseInput');
  const phrase = input.value.trim();
  if (!phrase) return;
  try {
    const res  = await fetch('/feedback/banned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrase })
    });
    const data = await res.json();
    if (data.success) { input.value = ''; renderBannedList(data.phrases); toast(`"${phrase}" banned`); }
    else { toast('Phrase already exists.'); }
  } catch (_) { toast('Failed to add phrase.'); }
}

async function removeBannedPhrase(phrase) {
  try {
    const res  = await fetch('/feedback/banned', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrase })
    });
    const data = await res.json();
    if (data.success) { renderBannedList(data.phrases); toast(`"${phrase}" removed`); }
  } catch (_) {}
}

async function removeApproved(id) {
  try {
    await fetch(`/feedback/approved/${id}`, { method: 'DELETE' });
    loadFeedbackStats();
    toast('Removed');
  } catch (_) {}
}

// ── UTILITIES ─────────────────────────────────────
function triggerDownload(blob, filename) {
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href  = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ── KEYBOARD SHORTCUT ─────────────────────────────
$('propertyInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleGenerateCaptions();
});

$('bannedPhraseInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addBannedPhrase();
});
