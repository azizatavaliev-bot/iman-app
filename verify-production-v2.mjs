import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE_URL = 'https://iman-app-production.up.railway.app';
const SCREENSHOT_DIR = '/Users/mac/Documents/TestApp /ImanApp/agent-os/specs/iman-app-verification/verification/screenshots';

async function main() {
  console.log('Starting ImanApp production verification (v2 - with navigation)...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  });

  const page = await context.newPage();

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    consoleMessages.push(`[PAGE_ERROR] ${err.message}`);
  });

  // 1. Load the main page
  console.log('\n--- Step 1: Load main page ---');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Check what's in the DOM -- look for React root, router elements
  const appStructure = await page.evaluate(() => {
    const root = document.getElementById('root');
    if (!root) return { hasRoot: false };

    // Get all route-like elements and navigation
    const allText = root.innerText;
    const allLinks = Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText }));
    const allButtons = Array.from(document.querySelectorAll('button')).map(b => ({ text: b.innerText, class: b.className }));

    // Check localStorage/sessionStorage for onboarding state
    const localStorageKeys = Object.keys(localStorage);
    const sessionStorageKeys = Object.keys(sessionStorage);

    return {
      hasRoot: true,
      rootChildCount: root.children.length,
      textLength: allText.length,
      allLinks,
      allButtons,
      localStorageKeys,
      sessionStorageKeys,
      firstChildTag: root.children[0]?.tagName,
      firstChildClass: root.children[0]?.className,
    };
  });
  console.log('App structure:', JSON.stringify(appStructure, null, 2));

  // 2. Try to complete onboarding by clicking "Далее"
  console.log('\n--- Step 2: Try to navigate through onboarding ---');

  const daleeButton = page.locator('text=Далее');
  if (await daleeButton.count() > 0) {
    console.log('Found "Далее" button, clicking it...');

    // Click through onboarding slides
    for (let i = 0; i < 5; i++) {
      const btn = page.locator('text=Далее');
      if (await btn.count() > 0) {
        await btn.first().click();
        await page.waitForTimeout(1000);
        console.log(`  Click ${i + 1}: clicked Далее`);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/onboarding-step-${i + 1}.png` });
      } else {
        // Try "Начать" (Start) button
        const startBtn = page.locator('text=Начать');
        if (await startBtn.count() > 0) {
          await startBtn.first().click();
          await page.waitForTimeout(1000);
          console.log(`  Click ${i + 1}: clicked Начать`);
          await page.screenshot({ path: `${SCREENSHOT_DIR}/onboarding-start.png` });
        } else {
          console.log(`  Click ${i + 1}: No more buttons found`);
          break;
        }
      }
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/after-onboarding.png`, fullPage: true });

    // Check current URL and state
    const afterUrl = page.url();
    console.log(`  After onboarding URL: ${afterUrl}`);

    const afterText = await page.evaluate(() => document.body?.innerText?.substring(0, 500));
    console.log(`  After onboarding text: ${afterText?.substring(0, 200)}`);
  }

  // 3. Check if we can set localStorage to bypass onboarding
  console.log('\n--- Step 3: Bypass onboarding via localStorage ---');
  await page.evaluate(() => {
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('iman_onboarding_done', 'true');
    localStorage.setItem('hasSeenOnboarding', 'true');
    localStorage.setItem('onboardingComplete', 'true');
  });

  // Reload and check
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/after-localstorage-bypass.png`, fullPage: true });

  const afterBypassText = await page.evaluate(() => document.body?.innerText?.substring(0, 500));
  console.log(`  After localStorage bypass text: ${afterBypassText?.substring(0, 200)}`);

  // 4. Try direct hash navigation (common in React SPA)
  console.log('\n--- Step 4: Try hash-based routes ---');

  const hashRoutes = ['#/leaderboard', '#/quiz', '#/favorites', '#/quran', '#/profile'];
  for (const hash of hashRoutes) {
    await page.goto(`${BASE_URL}/${hash}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    const text = await page.evaluate(() => document.body?.innerText?.substring(0, 200));
    console.log(`  ${hash}: ${text?.substring(0, 100)}`);
  }

  // 5. Check the API endpoints
  console.log('\n--- Step 5: Check API endpoints ---');
  const apiPaths = ['/api/health', '/api/quran', '/api/leaderboard', '/health'];
  for (const apiPath of apiPaths) {
    try {
      const resp = await page.goto(`${BASE_URL}${apiPath}`, { waitUntil: 'networkidle', timeout: 10000 });
      const status = resp?.status();
      const body = await page.evaluate(() => document.body?.innerText?.substring(0, 300));
      console.log(`  ${apiPath}: HTTP ${status} - ${body?.substring(0, 100)}`);
    } catch (e) {
      console.log(`  ${apiPath}: ERROR - ${e.message}`);
    }
  }

  // 6. Check what JS framework/bundle is used
  console.log('\n--- Step 6: Check the HTML source and JS bundles ---');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

  const htmlInfo = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src || s.textContent.substring(0, 100));
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);
    const meta = Array.from(document.querySelectorAll('meta')).map(m => ({ name: m.name, content: m.content }));
    return { scripts, styles, meta };
  });
  console.log('Scripts:', JSON.stringify(htmlInfo.scripts, null, 2));
  console.log('Styles:', JSON.stringify(htmlInfo.styles, null, 2));

  // Print all console messages
  console.log('\n--- Console Messages ---');
  for (const msg of consoleMessages) {
    console.log(`  ${msg}`);
  }

  await browser.close();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
