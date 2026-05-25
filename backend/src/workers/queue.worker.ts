import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { convertMedia } from '../services/ffmpeg.service';

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { maxRetriesPerRequest: null });
const tempDir = path.join(__dirname, '..', 'temp');

// Background worker
const worker = new Worker('downloadQueue', async (job) => {
  const { videoUrl, format, title, cookies } = job.data;
  const rawFilePath = path.join(tempDir, `${job.id}_raw.mp4`);
  const finalExt = format.toLowerCase() === 'mp4' ? 'mp4' : format.toLowerCase();
  const finalFilePath = path.join(tempDir, `${job.id}_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${finalExt}`);

  await job.updateProgress(5); // Started

  // 1. Download the raw video
  try {
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream',
      headers: {
        'Cookie': cookies || '',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://zoom.us/'
      }
    });

    const totalLength = parseInt((response.headers['content-length'] as string) || '0', 10);
    let downloadedLength = 0;

    const writer = fs.createWriteStream(rawFilePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        downloadedLength += chunk.length;
        if (totalLength > 0) {
          // Download progress from 5 to 50%
          const progress = 5 + Math.round((downloadedLength / totalLength) * 45);
          job.updateProgress(progress).catch(() => {});
        }
      });
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    await job.updateProgress(50); // Download complete

    // 2. Convert using FFmpeg
    // Conversion progress from 50 to 99%
    await convertMedia(rawFilePath, finalFilePath, format, (progress) => {
      job.updateProgress(50 + Math.floor(progress * 0.49)).catch(() => {});
    });

    await job.updateProgress(100);

    // Clean up raw file
    if (fs.existsSync(rawFilePath)) {
      fs.unlinkSync(rawFilePath);
    }

    return { filePath: finalFilePath };

  } catch (error: any) {
    if (fs.existsSync(rawFilePath)) fs.unlinkSync(rawFilePath);
    throw new Error('Processing failed: ' + error.message);
  }
}, { connection: redisConnection });

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});

console.log('Queue worker initialized.');
