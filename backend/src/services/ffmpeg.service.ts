import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export function convertMedia(inputPath: string, outputPath: string, format: string, onProgress: (progress: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    // Apply format-specific settings
    switch (format.toLowerCase()) {
      case 'mp3':
        command = command.noVideo().audioCodec('libmp3lame').format('mp3');
        break;
      case 'wav':
        command = command.noVideo().audioCodec('pcm_s16le').format('wav');
        break;
      case 'm4a':
        command = command.noVideo().audioCodec('aac').format('adts'); // AAC inside ADTS or just m4a
        break;
      case 'mp4':
      default:
        // usually it's already mp4, but we can copy or re-encode
        command = command.videoCodec('copy').audioCodec('copy');
        break;
    }

    command
      .on('progress', (progress) => {
        if (progress.percent) {
          onProgress(Math.min(99, Math.round(progress.percent)));
        }
      })
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}
