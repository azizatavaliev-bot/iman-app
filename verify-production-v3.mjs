import { chromium } from 'playwright';

const BASE_URL = 'https://iman-app-production.up.railway.app';
const SCREENSHOT_DIR = '/Users/mac/Documents/TestApp /ImanApp/agent-os/specs/iman-app-verification/verification/screenshots';

async function main() {
  console.log('Starting ImanApp production verification (v3 - navigate all pages)...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
  });

  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  // Step 1: Load and complete onboarding
  console.log('Loading main page and completing onboarding...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Click through all onboarding steps
  for (let i = 0; i < 4; i++) {
    const daleeBtn = page.locator('button:has-text("Далее")');
    if (await daleeBtn.count() > 0) {
      await daleeBtn.first().click();
      await page.waitForTimeout(800);
    }
  }
  // Click "Начать"
  const startBtn = page.locator('button:has-text("Начать")');
  if (await startBtn.count() > 0) {
    await startBtn.first().click();
    await page.waitForTimeout(1500);
  }

  // Now dismiss the welcome modal - click "Начать" again if present
  const startBtn2 = page.locator('button:has-text("Начать")');
  if (await startBtn2.count() > 0) {
    await startBtn2.first().click();
    await page.waitForTimeout(1500);
  }

  // ===== PAGE 1: MAIN DASHBOARD =====
  console.log('\n=== 1. MAIN DASHBOARD (/) ===');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/page-01-main-dashboard.png` });

  const mainPageChecks = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasPrayerTimes: text.includes('Фаджр') || text.includes('Зухр') || text.includes('Магриб'),
      hasFavorites: text.includes('Избранное'),
      hasNavbar: text.includes('Главная') && text.includes('Намазы') && text.includes('Коран'),
      hasRamadan: text.includes('Рамадан'),
      hasHadith: text.includes('ХАДИС'),
      hasQuiz: text.includes('Викторина'),
      hasLeaders: text.includes('Лидеры'),
    };
  });
  console.log('Main page checks:', JSON.stringify(mainPageChecks));

  // ===== PAGE 2: LEADERBOARD =====
  console.log('\n=== 2. LEADERBOARD (/leaderboard) ===');
  // Try clicking "Лидеры" on the main page
  const leadersBtn = page.locator('text=Лидеры').first();
  if (await leadersBtn.count() > 0) {
    await leadersBtn.click();
    await page.waitForTimeout(2000);
  } else {
    await page.goto(`${BASE_URL}/leaderboard`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/page-02-leaderboard.png`, fullPage: true });

  const leaderboardChecks = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      url: window.location.pathname,
      hasLeaderboard: text.includes('Лидер') || text.includes('лидер') || text.includes('Рейтинг') || text.includes('рейтинг'),
      hasUsers: text.includes('Husein') || text.includes('баллов') || text.includes('очков') || text.includes('Points'),
      hasHardcoded44: /\b44\b/.test(text),
      textPreview: text.substring(0, 300),
    };
  });
  console.log('Leaderboard checks:', JSON.stringify(leaderboardChecks, null, 2));

  // ===== PAGE 3: QUIZ =====
  console.log('\n=== 3. QUIZ (/quiz) ===');
  // Navigate back and find quiz
  await page.goBack();
  await page.waitForTimeout(1000);
  const quizBtn = page.locator('text=Викторина').first();
  if (await quizBtn.count() > 0) {
    await quizBtn.click();
    await page.waitForTimeout(2000);
  } else {
    await page.goto(`${BASE_URL}/quiz`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/page-03-quiz.png`, fullPage: true });

  const quizChecks = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      url: window.location.pathname,
      hasQuiz: text.includes('Виктор') || text.includes('Quiz') || text.includes('категори') || text.includes('Категори'),
      hasCategories: text.includes('Коран') || text.includes('Намаз') || text.includes('Хадис'),
      textPreview: text.substring(0, 400),
    };
  });
  console.log('Quiz checks:', JSON.stringify(quizChecks, null, 2));

  // ===== PAGE 4: FAVORITES =====
  console.log('\n=== 4. FAVORITES (/favorites) ===');
  await page.goto(`${BASE_URL}/favorites`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/page-04-favorites.png`, fullPage: true });

  const favChecks = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      url: window.location.pathname,
      hasFavorites: text.includes('Избранное') || text.includes('Favorites'),
      hasCoranTab: text.includes('Коран'),
      hasHadithTab: text.includes('Хадис'),
      hasDuaTab: text.includes('Дуа'),
      textPreview: text.substring(0, 400),
    };
  });
  console.log('Favorites checks:', JSON.stringify(favChecks, null, 2));

  // ===== PAGE 5: ADMIN =====
  console.log('\n=== 5. ADMIN (/admin) ===');
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/page-05-admin.png`, fullPage: true });

  const adminChecks = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      url: window.location.pathname,
      hasAdmin: text.includes('Админ') || text.includes('Admin') || text.includes('Панель'),
      hasAccessDenied: text.includes('доступ') || text.includes('Access') || text.includes('denied'),
      textPreview: text.substring(0, 400),
    };
  });
  console.log('Admin checks:', JSON.stringify(adminChecks, null, 2));

  // ===== PAGE 6: PROFILE =====
  console.log('\n=== 6. PROFILE (/profile) ===');
  // Use navbar
  const profileNavBtn = page.locator('text=Профиль').first();
  if (await profileNavBtn.count() > 0) {
    await profileNavBtn.click();
    await page.waitForTimeout(2000);
  } else {
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/page-06-profile.png`, fullPage: true });

  const profileChecks = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      url: window.location.pathname,
      hasProfile: text.includes('Профиль') || text.includes('Profile') || text.includes('Настройки'),
      hasLevel: text.includes('уровень') || text.includes('Уровень') || text.includes('Level'),
      textPreview: text.substring(0, 400),
    };
  });
  console.log('Profile checks:', JSON.stringify(profileChecks, null, 2));

  // ===== PAGE 7: QURAN =====
  console.log('\n=== 7. QURAN (/quran) ===');
  const quranNavBtn = page.locator('text=Коран').first();
  if (await quranNavBtn.count() > 0) {
    await quranNavBtn.click();
    await page.waitForTimeout(2000);
  } else {
    await page.goto(`${BASE_URL}/quran`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/page-07-quran.png`, fullPage: true });

  const quranChecks = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      url: window.location.pathname,
      hasQuran: text.includes('Коран') || text.includes('Quran'),
      hasSurah: text.includes('Фатиха') || text.includes('Бакара') || text.includes('сура') || text.includes('Сура'),
      surahCount: document.querySelectorAll('[class*=surah], [class*=Surah]').length,
      textPreview: text.substring(0, 400),
    };
  });
  console.log('Quran checks:', JSON.stringify(quranChecks, null, 2));

  // ===== BONUS: Check Namaz page =====
  console.log('\n=== BONUS: NAMAZ (/namaz) ===');
  const namazNavBtn = page.locator('a:has-text("Намазы"), button:has-text("Намазы")').first();
  if (await namazNavBtn.count() > 0) {
    await namazNavBtn.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/page-08-namaz.png`, fullPage: true });

  const namazChecks = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      url: window.location.pathname,
      hasPrayers: text.includes('Фаджр') || text.includes('Зухр') || text.includes('Аср') || text.includes('Магриб') || text.includes('Иша'),
      textPreview: text.substring(0, 400),
    };
  });
  console.log('Namaz checks:', JSON.stringify(namazChecks, null, 2));

  // Summary
  console.log('\n\n========== CONSOLE ERRORS ==========');
  if (errors.length === 0) {
    console.log('  No console errors detected!');
  } else {
    for (const e of errors) {
      console.log(`  ERROR: ${e.substring(0, 150)}`);
    }
  }

  await browser.close();
  console.log('\nVerification complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
