const archiver = require('archiver');

function buildCaptionsTxt(captions, property) {
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  let txt = `Choice Properties — Content Package\n`;
  txt += `Property: ${property.title}\n`;
  txt += `Generated: ${date}\n`;
  txt += `========================================\n\n`;

  if (captions.tiktok) {
    txt += `=== TIKTOK ===\n${captions.tiktok}\n\n`;
  } else {
    txt += `=== TIKTOK ===\nCaption generation was temporarily unavailable.\n\n`;
  }

  if (captions.instagram) {
    txt += `=== INSTAGRAM ===\n${captions.instagram}\n\n`;
  } else {
    txt += `=== INSTAGRAM ===\nCaption generation was temporarily unavailable.\n\n`;
  }

  if (captions.facebook) {
    txt += `=== FACEBOOK ===\n${captions.facebook}\n\n`;
  } else {
    txt += `=== FACEBOOK ===\nCaption generation was temporarily unavailable.\n\n`;
  }

  return txt;
}

function streamZip(res, captions, imageBuffers, property) {
  return new Promise((resolve, reject) => {
    const listingId = property.id || 'listing';
    const archive = archiver('zip', { zlib: { level: 6 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="content-${listingId}.zip"`);

    archive.on('error', (err) => {
      console.error('[ZipService] Archive error:', err.message);
      reject(err);
    });

    archive.pipe(res);

    const captionsTxt = buildCaptionsTxt(captions, property);
    archive.append(Buffer.from(captionsTxt, 'utf8'), { name: 'captions.txt' });

    const platformCounters = { tiktok: 0, instagram: 0, facebook: 0 };

    for (const { platform, buffer } of imageBuffers) {
      platformCounters[platform] = (platformCounters[platform] || 0) + 1;
      const filename = `${platform}-${platformCounters[platform]}.jpg`;
      archive.append(buffer, { name: filename });
    }

    archive.finalize();

    res.on('finish', resolve);
    res.on('error', reject);
  });
}

module.exports = { streamZip };
