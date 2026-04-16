const express = require('express');
const path = require('path');
const { fetchProperty } = require('./services/PropertyService');
const { generateCaptions } = require('./services/CaptionService');
const { processImages } = require('./services/ImageService');
const { streamZip } = require('./services/ZipService');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/generate', async (req, res) => {
  const { input, tone } = req.body;
  const timestamp = new Date().toISOString();

  if (!input || !input.trim()) {
    return res.status(400).json({ error: 'Please enter a valid property URL or listing ID.' });
  }

  console.log(`[${timestamp}] Generate request — input: ${input}, tone: ${tone || 'default'}`);

  let property;
  try {
    property = await fetchProperty(input);
  } catch (err) {
    console.error(`[${timestamp}] PropertyService error: ${err.type} — ${err.userMessage}`);
    return res.status(400).json({ error: err.userMessage || 'An unexpected error occurred.' });
  }

  const [captions, imageBuffers] = await Promise.all([
    generateCaptions(property, tone).catch(err => {
      console.error(`[${timestamp}] CaptionService error: ${err.message}`);
      return { tiktok: null, instagram: null, facebook: null };
    }),
    processImages(property.images).catch(err => {
      console.error(`[${timestamp}] ImageService error: ${err.message}`);
      return [];
    })
  ]);

  const allCaptionsFailed = !captions.tiktok && !captions.instagram && !captions.facebook;
  if (allCaptionsFailed) {
    console.warn(`[${timestamp}] All captions failed — returning images only`);
  }

  try {
    await streamZip(res, captions, imageBuffers, property);
    console.log(`[${timestamp}] ZIP streamed successfully for listing: ${property.id}`);
  } catch (err) {
    console.error(`[${timestamp}] ZipService error: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to package output. Please try again.' });
    }
  }
});

app.post('/generate-captions', async (req, res) => {
  const { input, tone } = req.body;
  const timestamp = new Date().toISOString();

  if (!input || !input.trim()) {
    return res.status(400).json({ error: 'Please enter a valid property URL or listing ID.' });
  }

  let property;
  try {
    property = await fetchProperty(input);
  } catch (err) {
    return res.status(400).json({ error: err.userMessage || 'An unexpected error occurred.' });
  }

  const captions = await generateCaptions(property, tone).catch(() => ({
    tiktok: null, instagram: null, facebook: null
  }));

  res.json({ captions, property: { id: property.id, title: property.title } });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] AI Content Generator running on port ${PORT}`);
});
