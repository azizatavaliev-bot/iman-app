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
  const results = [];

  try {
    // =========================================
    // STEP 1: Navigate to the app
    // =========================================
    console.log('=== STEP 1: Navigate to the app ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-initial-load.png'), fullPage: true });

    const title = await page.title();
    console.log('Page title:', title);
    results.push({ step: '1. Initial Load', status: 'OK', detail: `Title: ${title}` });

    // =========================================
    // STEP 2: Bypass onboarding
    // =========================================
    console.log('\n=== STEP 2: Bypass onboarding ===');
    await page.evaluate(() => {
      localStorage.setItem('iman_onboarded', 'true');
      localStorage.setItem('iman_profile', JSON.stringify({ name: 'Test' }));
    });
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-dashboard-after-onboarding.png'), fullPage: true });

    // Check if dashboard loaded
    const dashboardContent = await page.content();
    const hasDashboard = dashboardContent.includes('Test') || dashboardContent.includes('dashboard') || dashboardContent.includes('Закят');
    console.log('Dashboard loaded:', hasDashboard);
    results.push({ step: '2. Onboarding Bypass', status: hasDashboard ? 'OK' : 'ISSUE', detail: `Dashboard content present: ${hasDashboard}` });

    // =========================================
    // STEP 3: Check Dashboard - Zakat card
    // =========================================
    console.log('\n=== STEP 3: Check Dashboard for Закят card ===');
    const zakatCardExists = await page.evaluate(() => {
      const allText = document.body.innerText;
      return allText.includes('Закят');
    });
    console.log('Закят card found:', zakatCardExists);

    // Also find the feature grid
    const featureGridInfo = await page.evaluate(() => {
      const allText = document.body.innerText;
      return {
        hasZakat: allText.includes('Закят'),
        hasQuran: allText.includes('Коран') || allText.includes('Куран'),
        hasPrayer: allText.includes('Намаз') || allText.includes('молитв'),
        textSnippet: allText.substring(0, 2000)
      };
    });
    console.log('Feature grid info:', JSON.stringify(featureGridInfo, null, 2));
    results.push({ step: '3. Dashboard Закят Card', status: zakatCardExists ? 'OK' : 'MISSING', detail: `Закят card: ${zakatCardExists}` });

    // =========================================
    // STEP 4: Navigate to /zakat
    // =========================================
    console.log('\n=== STEP 4: Navigate to /zakat ===');
    await page.goto(`${BASE_URL}/zakat`, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-zakat-page.png'), fullPage: true });

    // Check tabs
    const zakatTabs = await page.evaluate(() => {
      const allText = document.body.innerText;
      return {
        hasCalculator: allText.includes('Калькулятор'),
        hasHistory: allText.includes('История'),
        hasAbout: allText.includes('О закяте'),
        fullText: allText.substring(0, 3000)
      };
    });
    console.log('Zakat tabs:', JSON.stringify(zakatTabs, null, 2));
    results.push({
      step: '4a. Zakat Tabs',
      status: (zakatTabs.hasCalculator && zakatTabs.hasHistory && zakatTabs.hasAbout) ? 'OK' : 'PARTIAL',
      detail: `Калькулятор: ${zakatTabs.hasCalculator}, История: ${zakatTabs.hasHistory}, О закяте: ${zakatTabs.hasAbout}`
    });

    // Try entering values in calculator fields
    console.log('Trying to enter values in calculator fields...');
    const inputFields = await page.$$('input[type="number"], input[type="text"], input');
    console.log(`Found ${inputFields.length} input fields`);

    if (inputFields.length > 0) {
      for (let i = 0; i < Math.min(inputFields.length, 3); i++) {
        try {
          await inputFields[i].click();
          await inputFields[i].type('1000');
          await delay(500);
        } catch (e) {
          console.log(`Could not type in input ${i}:`, e.message);
        }
      }
      await delay(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-zakat-with-values.png'), fullPage: true });
    }

    // Check nisab calculation
    const nisabInfo = await page.evaluate(() => {
      const allText = document.body.innerText;
      return {
        hasNisab: allText.includes('нисаб') || allText.includes('Нисаб') || allText.includes('Nisab'),
        hasResult: allText.includes('закят') || allText.includes('Закят'),
        textSnippet: allText.substring(0, 3000)
      };
    });
    console.log('Nisab info:', JSON.stringify(nisabInfo, null, 2));
    results.push({ step: '4b. Nisab Calculation', status: nisabInfo.hasNisab ? 'OK' : 'CHECK', detail: `Nisab visible: ${nisabInfo.hasNisab}` });

    // Click on История tab
    console.log('Clicking on История tab...');
    const historyTab = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="tab"], a'));
      const histBtn = buttons.find(b => b.textContent.includes('История'));
      if (histBtn) {
        histBtn.click();
        return true;
      }
      return false;
    });
    await delay(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-zakat-history-tab.png'), fullPage: true });
    results.push({ step: '4c. History Tab Click', status: historyTab ? 'OK' : 'ISSUE', detail: `Tab clicked: ${historyTab}` });

    // Click on О закяте tab
    console.log('Clicking on О закяте tab...');
    const aboutTab = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="tab"], a'));
      const aboutBtn = buttons.find(b => b.textContent.includes('О закяте'));
      if (aboutBtn) {
        aboutBtn.click();
        return true;
      }
      return false;
    });
    await delay(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-zakat-about-tab.png'), fullPage: true });
    results.push({ step: '4d. About Tab Click', status: aboutTab ? 'OK' : 'ISSUE', detail: `Tab clicked: ${aboutTab}` });

    // =========================================
    // STEP 5: Check prayer status bar on main page
    // =========================================
    console.log('\n=== STEP 5: Check prayer status bar ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-dashboard-prayer-bar.png'), fullPage: true });

    const prayerBarInfo = await page.evaluate(() => {
      const allText = document.body.innerText;
      const prayers = ['Фаджр', 'Зухр', 'Аср', 'Магриб', 'Иша'];
      const foundPrayers = prayers.filter(p => allText.includes(p));

      // Look for lock icons via SVG path data common for lock icons
      const allSvgs = document.querySelectorAll('svg');
      let lockSvgCount = 0;
      allSvgs.forEach(svg => {
        const html = svg.outerHTML;
        if (html.includes('lock') || html.includes('Lock') || html.includes('M16.5 10.5') || html.includes('M12 17')) {
          lockSvgCount++;
        }
      });

      // Check for dimmed/opacity elements containing prayer names
      const dimmedPrayers = [];
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const computed = window.getComputedStyle(el);
        const text = el.textContent || '';
        if (parseFloat(computed.opacity) < 0.9 && parseFloat(computed.opacity) > 0) {
          for (const prayer of prayers) {
            if (text.includes(prayer) && !dimmedPrayers.includes(prayer)) {
              dimmedPrayers.push(prayer);
            }
          }
        }
      }

      return {
        foundPrayers,
        lockSvgCount,
        dimmedPrayers,
        textSnippet: allText.substring(0, 2000)
      };
    });
    console.log('Prayer bar info:', JSON.stringify(prayerBarInfo, null, 2));
    results.push({
      step: '5. Prayer Status Bar',
      status: prayerBarInfo.foundPrayers.length > 0 ? 'OK' : 'CHECK',
      detail: `Prayers found: ${prayerBarInfo.foundPrayers.join(', ')}, Lock SVGs: ${prayerBarInfo.lockSvgCount}, Dimmed prayers: ${prayerBarInfo.dimmedPrayers.join(', ')}`
    });

    // =========================================
    // STEP 6: Navigate to /prayers
    // =========================================
    console.log('\n=== STEP 6: Navigate to /prayers ===');
    await page.goto(`${BASE_URL}/prayers`, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-prayers-page.png'), fullPage: true });

    // Check date navigation arrows
    const prayersPageInfo = await page.evaluate(() => {
      const allText = document.body.innerText;
      const buttons = Array.from(document.querySelectorAll('button'));

      let leftArrow = null;
      let rightArrow = null;
      let rightArrowDisabled = false;

      buttons.forEach(btn => {
        const html = btn.innerHTML;
        const text = btn.textContent.trim();
        // Check for left arrow (various representations)
        if (html.includes('M15') || html.includes('chevronLeft') || html.includes('ChevronLeft') ||
            html.includes('arrow-left') || html.includes('ArrowLeft') || text === '<' || text.includes('‹') ||
            html.includes('left') || html.includes('prev')) {
          leftArrow = { text: text.substring(0, 30), disabled: btn.disabled };
        }
        // Check for right arrow
        if (html.includes('M9 5') || html.includes('M9') || html.includes('chevronRight') || html.includes('ChevronRight') ||
            html.includes('arrow-right') || html.includes('ArrowRight') || text === '>' || text.includes('›') ||
            html.includes('right') || html.includes('next')) {
          rightArrow = { text: text.substring(0, 30), disabled: btn.disabled };
          const style = window.getComputedStyle(btn);
          rightArrowDisabled = btn.disabled ||
            btn.getAttribute('aria-disabled') === 'true' ||
            btn.classList.contains('disabled') ||
            parseFloat(style.opacity) < 0.6 ||
            style.pointerEvents === 'none';
        }
      });

      const hasRetrospective = allText.includes('Ретроспективная отметка') || allText.includes('ретроспективн');
      const hasFutureText = allText.includes('Время ещё не наступило') || allText.includes('не наступило');

      return {
        leftArrow,
        rightArrow,
        rightArrowDisabled,
        hasRetrospective,
        hasFutureText,
        buttonsCount: buttons.length,
        allButtonTexts: buttons.map(b => b.textContent.trim().substring(0, 50)),
        textSnippet: allText.substring(0, 3000)
      };
    });
    console.log('Prayers page info:', JSON.stringify(prayersPageInfo, null, 2));
    results.push({
      step: '6a. Date Navigation Arrows',
      status: (prayersPageInfo.leftArrow && prayersPageInfo.rightArrow) ? 'OK' : 'CHECK',
      detail: `Left arrow: ${JSON.stringify(prayersPageInfo.leftArrow)}, Right arrow: ${JSON.stringify(prayersPageInfo.rightArrow)}`
    });
    results.push({
      step: '6b. Right Arrow Disabled (today)',
      status: prayersPageInfo.rightArrowDisabled ? 'OK' : 'CHECK',
      detail: `Right arrow disabled: ${prayersPageInfo.rightArrowDisabled}, details: ${JSON.stringify(prayersPageInfo.rightArrow)}`
    });
    results.push({
      step: '6c. Future Prayers Text (today)',
      status: prayersPageInfo.hasFutureText ? 'OK' : 'CHECK',
      detail: `"Время ещё не наступило" visible: ${prayersPageInfo.hasFutureText}`
    });

    // Click left arrow to go to yesterday
    console.log('Clicking left arrow to go to yesterday...');
    const clickedLeft = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      // Try each button, looking for arrow-like ones
      for (const btn of buttons) {
        const html = btn.innerHTML;
        if (html.includes('M15') || html.includes('chevronLeft') || html.includes('ChevronLeft') ||
            html.includes('left') || html.includes('prev') || btn.textContent.trim() === '<') {
          btn.click();
          return { clicked: true, text: btn.textContent.trim().substring(0, 30) };
        }
      }
      // Fallback: look for SVGs with left-pointing paths
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        const paths = svg.querySelectorAll('path');
        for (const p of paths) {
          const d = p.getAttribute('d') || '';
          if (d.includes('M15') || d.includes('l-7-7') || d.includes('left')) {
            const parent = svg.closest('button');
            if (parent) {
              parent.click();
              return { clicked: true, text: 'SVG arrow button' };
            }
          }
        }
      }
      return { clicked: false };
    });
    console.log('Click result:', JSON.stringify(clickedLeft));
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-prayers-yesterday.png'), fullPage: true });

    const yesterdayInfo = await page.evaluate(() => {
      const allText = document.body.innerText;
      return {
        hasRetrospective: allText.includes('Ретроспективная отметка') || allText.includes('ретроспективн'),
        hasFutureText: allText.includes('Время ещё не наступило') || allText.includes('не наступило'),
        textSnippet: allText.substring(0, 3000)
      };
    });
    console.log('Yesterday info:', JSON.stringify(yesterdayInfo, null, 2));
    results.push({
      step: '6d. Left Arrow Click (Yesterday)',
      status: clickedLeft.clicked ? 'OK' : 'ISSUE',
      detail: `Clicked: ${clickedLeft.clicked}`
    });
    results.push({
      step: '6e. Retrospective Text (Yesterday)',
      status: yesterdayInfo.hasRetrospective ? 'OK' : 'CHECK',
      detail: `"Ретроспективная отметка" visible: ${yesterdayInfo.hasRetrospective}`
    });

    // =========================================
    // SUMMARY
    // =========================================
    console.log('\n\n========================================');
    console.log('VERIFICATION SUMMARY');
    console.log('========================================');
    for (const r of results) {
      const icon = r.status === 'OK' ? 'PASS' : r.status === 'ISSUE' ? 'FAIL' : 'WARN';
      console.log(`[${icon}] ${r.step}: ${r.status} -- ${r.detail}`);
    }
    console.log('========================================');

  } catch (err) {
    console.error('Error during verification:', err.message);
    console.error(err.stack);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error-state.png'), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
