import { Router } from 'express';
import { extractMetadata } from '../services/extractor.service';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';

const router = Router();

// Extract metadata or check if passcode is needed
router.post('/extract', async (req, res) => {
  try {
    const { url, passcode } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    
    // Attempt extraction
    const metadata = await extractMetadata(url, passcode);
    res.json(metadata);
  } catch (error: any) {
    console.error('Extraction Error:', error);
    res.status(500).json({ error: error.message || 'Extraction failed' });
  }
});

// Stream video or audio directly to client
router.get('/download', async (req, res) => {
  const { url, format, cookies, title } = req.query;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing video URL' });
  }
  
  const ext = format === 'mp4' ? 'mp4' : (typeof format === 'string' ? format : 'mp4');
  const safeTitle = (typeof title === 'string' && title.trim()) ? title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'zoom_recording';
  const filename = `${safeTitle}.${ext}`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      headers: {
        'Cookie': (typeof cookies === 'string' ? cookies : ''),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://zoom.us/'
      }
    });

    if (ext === 'mp4') {
      res.setHeader('Content-Type', 'video/mp4');
      response.data.pipe(res);
    } else {
      res.setHeader('Content-Type', `audio/${ext}`);
      ffmpeg(response.data)
        .format(ext)
        .on('error', (err) => {
           console.error('FFmpeg streaming error:', err);
           if (!res.headersSent) res.status(500).end();
        })
        .pipe(res, { end: true });
    }
  } catch (error: any) {
    console.error('Download stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream video' });
    } else {
      res.end();
    }
  }
});

export default router;
