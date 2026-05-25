import fs from 'fs';
import path from 'path';

const tempDir = path.join(__dirname, '..', 'temp');

// Run every 1 hour
setInterval(() => {
  console.log('Running cleanup job...');
  if (!fs.existsSync(tempDir)) return;

  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  fs.readdir(tempDir, (err, files) => {
    if (err) return console.error('Cleanup error:', err);
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        if (now - stats.mtimeMs > maxAge) {
          fs.unlink(filePath, err => {
            if (!err) console.log(`Cleaned up old file: ${file}`);
          });
        }
      });
    });
  });
}, 60 * 60 * 1000);

console.log('Cleanup cron job initialized.');
