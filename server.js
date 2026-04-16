const express = require('express');
const path    = require('path');

const { fetchProperty }            = require('./services/PropertyService');
const { generateCaptions }         = require('./services/CaptionService');
const { processImages }            = require('./services/ImageService');
const { streamZip }                = require('./services/ZipService');
const { generateSlideshow, FORMATS } = require('./services/VideoService');
const { generateVideoWithVoiceover } = require('./services/VoiceoverService');
const feedback                     = require('./services/FeedbackService');

const app  = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const videoJobs = new Map();

function timestamp() { return new Date().toISOString(); }

app.post('/generate-captions', async (req, res) => {
  const { input, tone } = req.body;
  if (!input?.trim()) return res.status(400).json({ error: 'Please enter a valid property URL or listing ID.' });

  let property;
  try { property = await fetchProperty(input); }
  catch (err) { return res.status(400).json({ error: err.userMessage || 'An unexpected error occurred.' }); }

  const captions = await generateCaptions(property, tone).catch(err => {
    console.error(`[${timestamp()}] CaptionService error: ${err.message}`);
    return { tiktok: null, instagram: null, facebook: null };
  });

  res.json({ captions, property: { id: property.id, title: property.title } });
});

app.post('/generate-images', async (req, res) => {
  const { input, tone } = req.body;
  if (!input?.trim()) return res.status(400).json({ error: 'Please enter a valid property URL or listing ID.' });

  let property;
  try { property = await fetchProperty(input); }
  catch (err) { return res.status(400).json({ error: err.userMessage || 'An unexpected error occurred.' }); }

  const [captions, imageBuffers] = await Promise.all([
    generateCaptions(property, tone).catch(() => ({ tiktok: null, instagram: null, facebook: null })),
    processImages(property.images).catch(() => [])
  ]);

  try {
    await streamZip(res, captions, imageBuffers, property);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to package output. Please try again.' });
  }
});

app.post('/generate', async (req, res) => {
  const { input, tone } = req.body;
  if (!input?.trim()) return res.status(400).json({ error: 'Please enter a valid property URL or listing ID.' });

  let property;
  try { property = await fetchProperty(input); }
  catch (err) { return res.status(400).json({ error: err.userMessage || 'An unexpected error occurred.' }); }

  const [captions, imageBuffers] = await Promise.all([
    generateCaptions(property, tone).catch(() => ({ tiktok: null, instagram: null, facebook: null })),
    processImages(property.images).catch(() => [])
  ]);

  try {
    await streamZip(res, captions, imageBuffers, property);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to package output. Please try again.' });
  }
});

app.post('/generate-video', async (req, res) => {
  const { input, tone, format = 'tiktok', voiceover = false } = req.body;
  if (!input?.trim()) return res.status(400).json({ error: 'Please enter a valid property URL or listing ID.' });

  let property;
  try { property = await fetchProperty(input); }
  catch (err) { return res.status(400).json({ error: err.userMessage || 'An unexpected error occurred.' }); }

  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  videoJobs.set(jobId, { status: 'processing', progress: 'Starting video generation...', property: property.title });

  res.json({ jobId, message: 'Video generation started.' });

  setImmediate(async () => {
    try {
      videoJobs.set(jobId, { ...videoJobs.get(jobId), progress: voiceover ? 'Generating slideshow and voiceover...' : 'Generating slideshow...' });

      let videoBuffer, script;

      if (voiceover) {
        const result = await generateVideoWithVoiceover(property, format, tone);
        if (Buffer.isBuffer(result)) {
          videoBuffer = result;
        } else {
          videoBuffer = result.video;
          script      = result.script;
        }
      } else {
        videoBuffer = await generateSlideshow(property, format);
      }

      videoJobs.set(jobId, { status: 'done', progress: 'Complete', videoBuffer, script, format, propertyTitle: property.title });
      console.log(`[${timestamp()}] Video ready: ${jobId} (${Math.round(videoBuffer.length / 1024)}KB)`);
    } catch (err) {
      console.error(`[${timestamp()}] Video job ${jobId} failed: ${err.message}`);
      videoJobs.set(jobId, { status: 'failed', progress: 'Generation failed.', error: err.message });
    }
  });
});

app.get('/video-status/:jobId', (req, res) => {
  const job = videoJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  const { status, progress, script, format, propertyTitle, error } = job;
  res.json({ status, progress, script, format, propertyTitle, error });
});

app.get('/video-download/:jobId', (req, res) => {
  const job = videoJobs.get(req.params.jobId);
  if (!job || job.status !== 'done') return res.status(404).json({ error: 'Video not ready.' });
  const formatLabel = job.format || 'video';
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="content-${formatLabel}-${req.params.jobId}.mp4"`);
  res.send(job.videoBuffer);
  videoJobs.delete(req.params.jobId);
});

app.post('/feedback/approve', (req, res) => {
  const { platform, caption, propertyTitle, tone } = req.body;
  if (!platform || !caption) return res.status(400).json({ error: 'platform and caption are required.' });
  const entry = feedback.approveCaption(platform, caption, propertyTitle, tone);
  res.json({ success: true, entry });
});

app.delete('/feedback/approved/:id', (req, res) => {
  const removed = feedback.removeCaption(req.params.id);
  res.json({ success: removed });
});

app.get('/feedback/stats', (req, res) => {
  res.json(feedback.getStats());
});

app.post('/feedback/banned', (req, res) => {
  const { phrase } = req.body;
  if (!phrase?.trim()) return res.status(400).json({ error: 'phrase is required.' });
  const added = feedback.addBannedPhrase(phrase);
  res.json({ success: added, phrases: feedback.getBannedPhrases() });
});

app.delete('/feedback/banned', (req, res) => {
  const { phrase } = req.body;
  if (!phrase?.trim()) return res.status(400).json({ error: 'phrase is required.' });
  const removed = feedback.removeBannedPhrase(phrase);
  res.json({ success: removed, phrases: feedback.getBannedPhrases() });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] AI Content Generator running on port ${PORT}`);
  console.log(`[server] Phases: 1 (Captions+Images) | 2 (Video) | 3 (Voiceover) | 4 (Brand Learning)`);
});
