let lastInput = null;
let lastTone = null;
let lastCaptions = null;
let lastPropertyTitle = null;

function showSection(id) {
  document.getElementById(id).classList.remove('hidden');
}

function hideSection(id) {
  document.getElementById(id).classList.add('hidden');
}

function setLoading(loading) {
  const btn = document.getElementById('generateBtn');
  if (loading) {
    btn.disabled = true;
    hideSection('errorSection');
    hideSection('resultsSection');
    showSection('loadingSection');
  } else {
    btn.disabled = false;
    hideSection('loadingSection');
  }
}

function showError(message) {
  document.getElementById('errorMessage').textContent = message;
  showSection('errorSection');
}

function toggleCard(platform) {
  const body = document.getElementById(platform + 'Body');
  const icon = document.getElementById(platform + 'Toggle');
  body.classList.toggle('collapsed');
  icon.classList.toggle('open');
}

function copyCaption(platform) {
  const textarea = document.getElementById(platform + 'Caption');
  const btn = textarea.closest('.platform-body').querySelector('.copy-btn');

  navigator.clipboard.writeText(textarea.value).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy Caption';
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    textarea.select();
    document.execCommand('copy');
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy Caption';
      btn.classList.remove('copied');
    }, 2000);
  });
}

function downloadCaptions() {
  if (!lastCaptions) return;

  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  let txt = `Choice Properties — Content Package\n`;
  txt += `Property: ${lastPropertyTitle || 'Unknown'}\n`;
  txt += `Generated: ${date}\n`;
  txt += `========================================\n\n`;

  if (lastCaptions.tiktok) txt += `=== TIKTOK ===\n${lastCaptions.tiktok}\n\n`;
  if (lastCaptions.instagram) txt += `=== INSTAGRAM ===\n${lastCaptions.instagram}\n\n`;
  if (lastCaptions.facebook) txt += `=== FACEBOOK ===\n${lastCaptions.facebook}\n\n`;

  const blob = new Blob([txt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'captions.txt';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadImages() {
  if (!lastInput) return;

  const body = { input: lastInput, tone: lastTone };

  fetch('/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
    .then(res => {
      if (!res.ok) return res.json().then(d => { throw new Error(d.error || 'Download failed.'); });
      return res.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `content-${lastInput.trim().split('/').pop() || 'images'}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(err => alert(err.message));
}

async function handleGenerate() {
  const input = document.getElementById('propertyInput').value.trim();
  const tone = document.getElementById('toneSelect').value;

  if (!input) {
    showError('Please enter a valid property URL or listing ID.');
    return;
  }

  lastInput = input;
  lastTone = tone;

  setLoading(true);

  try {
    const response = await fetch('/generate-captions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, tone })
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || 'An unexpected error occurred. Please try again.');
      return;
    }

    const { captions, property } = data;
    lastCaptions = captions;
    lastPropertyTitle = property.title;

    document.getElementById('propertyTitle').textContent = property.title;

    document.getElementById('tiktokCaption').value = captions.tiktok || 'Caption generation was temporarily unavailable.';
    document.getElementById('instagramCaption').value = captions.instagram || 'Caption generation was temporarily unavailable.';
    document.getElementById('facebookCaption').value = captions.facebook || 'Caption generation was temporarily unavailable.';

    ['tiktok', 'instagram', 'facebook'].forEach(platform => {
      const body = document.getElementById(platform + 'Body');
      const icon = document.getElementById(platform + 'Toggle');
      body.classList.remove('collapsed');
      icon.classList.remove('open');
    });

    showSection('resultsSection');
  } catch (err) {
    showError('Network error. Please check your connection and try again.');
    console.error(err);
  } finally {
    setLoading(false);
  }
}

document.getElementById('propertyInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleGenerate();
});
