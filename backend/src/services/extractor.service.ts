import { chromium } from 'playwright';

export interface ExtractionMetadata {
  requiresPasscode: boolean;
  videoUrl?: string;
  title?: string;
  duration?: string;
  error?: string;
  cookies?: string;
}

export async function extractMetadata(url: string, passcode?: string): Promise<ExtractionMetadata> {
  const browser = await chromium.launch({ 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true 
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    let videoUrl = '';
    
    // Aggressively block heavy resources (images, css, fonts) to save RAM and prevent OOM crashes on Render
    await page.route('**/*', route => {
      const type = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'other'].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Intercept media requests to grab the raw MP4 URL
    page.on('request', request => {
      const reqUrl = request.url();
      if (reqUrl.includes('.mp4') || reqUrl.includes('play')) {
         // Simple heuristic for media requests
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // Check if passcode is required
    const passcodeField = page.locator('input[type="password"]');
    if (await passcodeField.count() > 0) {
      if (!passcode) {
        await browser.close();
        return { requiresPasscode: true };
      } else {
        await passcodeField.fill(passcode);
        await page.locator('button[type="submit"], button:has-text("Watch")').click();
        await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
      }
    }
    
    // Try to find the video element in the DOM to get the source
    await page.waitForSelector('video', { timeout: 10000 }).catch(() => {});
    
    const videoSrc = await page.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.src : null;
    });

    const title = await page.title();

    const cookiesArray = await context.cookies();
    const cookies = cookiesArray.map(c => `${c.name}=${c.value}`).join('; ');

    await browser.close();

    if (!videoSrc) {
      // Fallback: Check if we captured a media request, or if there's a download button.
      return { requiresPasscode: false, error: 'Could not extract video source URL' };
    }

    return {
      requiresPasscode: false,
      videoUrl: videoSrc,
      title: title.replace(' - Zoom', '').trim(),
      cookies
    };
  } catch (error: any) {
    await browser.close();
    throw new Error('Extraction failed: ' + error.message);
  }
}
