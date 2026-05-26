import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'agent-os/specs/iman-app-verification/verification/screenshots');
const BASE_URL = 'https://iman-app-production.up.railway.app';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2 }
  });

  const page = await browser.newPage();
  
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    consoleMessages.push(`[PAGE_ERROR] ${err.message}`);
  });

  try {
    // Setup
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(1000);
    await page.evaluate(() => {
      localStorage.setItem('iman_onboarded', 'true');
      localStorage.setItem('iman_profile', JSON.stringify({ name: 'Test' }));
    });
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Navigate to Zakat via click
    console.log('=== Navigating to Zakat via feature card click ===');
    consoleMessages.length = 0; // clear
    
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      for (const el of elements) {
        if (el.textContent.trim() === 'Закят' && el.children.length === 0) {
          const clickable = el.closest('a') || el.closest('button') || el;
          clickable.click();
          break;
        }
      }
    });
    
    // Wait for navigation and rendering
    await delay(5000);
    
    console.log('URL:', page.url());
    
    // Check what's in the DOM
    const zakatDom = await page.evaluate(() => {
      const root = document.getElementById('root') || document.getElementById('app') || document.body;
      return {
        rootChildCount: root.children.length,
        rootHTML: root.innerHTML.substring(0, 3000),
        bodyText: document.body.innerText.substring(0, 2000),
        allClasses: Array.from(document.querySelectorAll('[class]')).slice(0, 20).map(el => ({
          tag: el.tagName,
          class: el.className.substring(0, 100),
          text: el.textContent.substring(0, 50)
        }))
      };
    });
    
    console.log('Zakat DOM rootChildCount:', zakatDom.rootChildCount);
    console.log('Zakat body text:', zakatDom.bodyText.substring(0, 500));
    console.log('Zakat root HTML (first 1000):', zakatDom.rootHTML.substring(0, 1000));
    console.log('Console messages:', consoleMessages.join('\n'));

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14-zakat-deep-check.png'), fullPage: true });
    
    // Try scrolling down in case content is below fold
    await page.evaluate(() => window.scrollTo(0, 500));
    await delay(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15-zakat-scrolled.png'), fullPage: true });

    // Check viewport height vs content
    const dimensions = await page.evaluate(() => ({
      bodyHeight: document.body.scrollHeight,
      viewportHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight
    }));
    console.log('Page dimensions:', JSON.stringify(dimensions));

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
