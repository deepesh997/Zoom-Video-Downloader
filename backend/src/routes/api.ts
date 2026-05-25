import { Router } from 'express';
import { extractMetadata } from '../services/extractor.service';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { maxRetriesPerRequest: null });
const downloadQueue = new Queue('downloadQueue', { connection: redisConnection });

// Extract metadata or check if passcode is needed
router.post('/extract', async (req, res) => {
  try {
    const { url, passcode } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    
    // Attempt extraction
    const metadata = await extractMetadata(url, passcode);
    res.json(metadata);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Extraction failed' });
  }
});

// Enqueue download and conversion job
router.post('/convert', async (req, res) => {
  try {
    const { videoUrl, format, title, cookies } = req.body;
    if (!videoUrl || !format) return res.status(400).json({ error: 'Missing required parameters' });
    
    const jobId = uuidv4();
    const job = await downloadQueue.add('downloadAndConvert', {
      videoUrl,
      format,
      title: title || 'Zoom_Recording',
      cookies
    }, { jobId });
    
    res.json({ jobId, status: 'queued' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to queue conversion' });
  }
});

// Check job status
router.get('/status/:jobId', async (req, res) => {
  try {
    const job = await downloadQueue.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    const state = await job.getState();
    const progress = job.progress;
    
    res.json({
      jobId: job.id,
      state,
      progress,
      failedReason: job.failedReason,
      result: job.returnvalue,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve job status' });
  }
});

// Download the final file
router.get('/download/:jobId', async (req, res) => {
  try {
    const job = await downloadQueue.getJob(req.params.jobId);
    if (!job || !job.returnvalue || !job.returnvalue.filePath) {
      return res.status(404).json({ error: 'File not ready or job not found' });
    }
    
    const filePath = job.returnvalue.filePath;
    if (fs.existsSync(filePath)) {
      res.download(filePath, path.basename(filePath));
    } else {
      res.status(404).json({ error: 'File not found on disk' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Download failed' });
  }
});

// Manual cleanup
router.delete('/cleanup/:jobId', async (req, res) => {
  try {
    const job = await downloadQueue.getJob(req.params.jobId);
    if (job && job.returnvalue && job.returnvalue.filePath) {
      const filePath = job.returnvalue.filePath;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.json({ status: 'cleaned' });
  } catch (error: any) {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

export default router;
