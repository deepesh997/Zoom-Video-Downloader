import { chromium, Browser } from 'playwright';

export interface ExtractionMetadata {
  requiresPasscode: boolean;
  videoUrl?: string;
  title?: string;
  duration?: string;
  error?: string;
  cookies?: string;
}

let browserInstance: Browser | null = null;
let launchPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance) return browserInstance;
  
  if (!launchPromise) {
    console.log('Launching Playwright Chromium singleton instance...');
    launchPromise = chromium.launch({ 
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage', 
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
        '--disable-features=site-per-process',
        '--js-flags="--max-old-space-size=128"'
      ],
      headless: true 
    }).then(browser => {
      browserInstance = browser;
      launchPromise = null;
      
      browser.on('disconnected', () => {
        console.log('Playwright Chromium browser disconnected.');
        browserInstance = null;
      });
      
      return browser;
    }).catch(err => {
      console.error('Failed to launch Playwright browser:', err);
      launchPromise = null;
      throw err;
    });
  }
  
  return launchPromise;
}

export async function extractMetadata(url: string, passcode?: string): Promise<ExtractionMetadata> {
  let browser: Browser;
  try {
    browser = await getBrowser();
  } catch (launchError: any) {
    console.error('Browser launch error details:', launchError);
    throw new Error('Browser initialization failed. This can happen on Render free tier due to missing system dependencies. Please ensure Docker is used or chromium dependencies are installed. Detail: ' + launchError.message);
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Aggressively block heavy resources (images, css, fonts) to save RAM and prevent OOM crashes on Render
    await page.route('**/*', route => {
      const type = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'other'].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Intercept media requests to grab the raw MP4 URL in case page element inspection fails
    let interceptedVideoUrl = '';
    page.on('request', request => {
      const reqUrl = request.url();
      if (reqUrl.includes('.mp4') || reqUrl.includes('play')) {
         interceptedVideoUrl = reqUrl;
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Check if passcode is required
    const passcodeField = page.locator('input[type="password"]');
    if (await passcodeField.count() > 0) {
      if (!passcode) {
        return { requiresPasscode: true };
      } else {
        await passcodeField.fill(passcode);
        await page.locator('button[type="submit"], button:has-text("Watch")').click();
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      }
    }
    
    // Try to find the video element in the DOM to get the source
    await page.waitForSelector('video', { timeout: 10000 }).catch(() => {});
    
    const videoSrc = await page.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.src : null;
    }) || interceptedVideoUrl;

    const title = await page.title();

    const cookiesArray = await context.cookies();
    const cookies = cookiesArray.map(c => `${c.name}=${c.value}`).join('; ');

    if (!videoSrc) {
      return { requiresPasscode: false, error: 'Could not extract video source URL' };
    }

    return {
      requiresPasscode: false,
      videoUrl: videoSrc,
      title: title.replace(' - Zoom', '').trim(),
      cookies
    };
  } catch (error: any) {
    throw new Error('Extraction failed: ' + error.message);
  } finally {
    // CRITICAL: Always close the context to free memory!
    await context.close().catch(err => console.error('Failed to close context:', err));
  }
}
