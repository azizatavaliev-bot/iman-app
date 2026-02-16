import { createServer } from "http";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, extname, normalize } from "path";
import { fileURLToPath } from "url";
import { randomBytes, createHmac } from "crypto";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "dist");
const PORT = parseInt(process.env.PORT || "3000", 10);
const BOT_TOKEN =
  process.env.BOT_TOKEN || "8598576939:AAHSAtSNp0a8zULTBUJuFamzp4CbvXG9cqM";
const APP_URL =
  process.env.APP_URL || "https://iman-app-production.up.railway.app";
const WEBHOOK_PATH = `/webhook-${BOT_TOKEN.split(":")[0]}`;

// =========================================================================
// SECURITY — Webhook secret token for Telegram verification
// =========================================================================
const WEBHOOK_SECRET =
  process.env.WEBHOOK_SECRET ||
  createHmac("sha256", BOT_TOKEN)
    .update("iman-webhook")
    .digest("hex")
    .slice(0, 64);

// =========================================================================
// SECURITY — Rate limiting
// =========================================================================
const rateLimitMap = new Map(); // IP -> { count, resetTime }
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // max requests per window per IP

function isRateLimited(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Clean up rate limit map every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now > entry.resetTime) rateLimitMap.delete(ip);
    }
  },
  5 * 60 * 1000,
);

// =========================================================================
// SECURITY — Input sanitization
// =========================================================================
function sanitizeName(name) {
  if (!name || typeof name !== "string") return "друг";
  // Remove markdown special chars and limit length
  return name.replace(/[_*`\[\]()~>#+=|{}.!\\-]/g, "").slice(0, 64) || "друг";
}

function sanitizeText(text) {
  if (!text || typeof text !== "string") return "";
  return text.slice(0, 256).trim();
}

// =========================================================================
// SECURITY — Security headers (OWASP best practices)
// =========================================================================
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://telegram.org",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.aladhan.com https://api.alquran.cloud https://cdn.jsdelivr.net https://api.quran.com https://cdn.islamic.network",
    "frame-ancestors 'none'",
  ].join("; "),
};

// =========================================================================
// MIME types
// =========================================================================
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".mp3": "audio/mpeg",
};

// =========================================================================
// SUBSCRIBERS — in-memory + persist to subscribers.json
// =========================================================================

const SUBSCRIBERS_FILE = join(__dirname, "subscribers.json");
const subscribers = new Set();

function loadSubscribers() {
  try {
    if (existsSync(SUBSCRIBERS_FILE)) {
      const data = JSON.parse(readFileSync(SUBSCRIBERS_FILE, "utf-8"));
      if (Array.isArray(data)) data.forEach((id) => subscribers.add(id));
      console.log(`Loaded ${subscribers.size} subscribers`);
    }
  } catch (e) {
    console.error("Failed to load subscribers:", e);
  }
}

function saveSubscribers() {
  try {
    writeFileSync(SUBSCRIBERS_FILE, JSON.stringify([...subscribers]));
  } catch (e) {
    console.error("Failed to save subscribers:", e);
  }
}

loadSubscribers();

// =========================================================================
// PRAYER TIMES — Fetch from Aladhan API (method 3 = MWL for Central Asia)
// =========================================================================

// Default: Bishkek
const BISHKEK_LAT = 42.8746;
const BISHKEK_LNG = 74.5698;

async function fetchPrayerTimes(lat = BISHKEK_LAT, lng = BISHKEK_LNG) {
  const now = new Date();
  const bishkek = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const dd = String(bishkek.getUTCDate()).padStart(2, "0");
  const mm = String(bishkek.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = bishkek.getUTCFullYear();
  const dateStr = `${dd}-${mm}-${yyyy}`;

  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=3`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const t = data?.data?.timings;
    if (!t) return null;

    // Compute Doha = Sunrise + 20 min
    let doha = "";
    if (t.Sunrise) {
      const m = t.Sunrise.match(/^(\d{1,2}):(\d{2})/);
      if (m) {
        const totalMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + 20;
        doha = `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
      }
    }

    return {
      Fajr: t.Fajr?.replace(/ \(.*\)/, "") || "",
      Sunrise: t.Sunrise?.replace(/ \(.*\)/, "") || "",
      Doha: doha,
      Dhuhr: t.Dhuhr?.replace(/ \(.*\)/, "") || "",
      Asr: t.Asr?.replace(/ \(.*\)/, "") || "",
      Maghrib: t.Maghrib?.replace(/ \(.*\)/, "") || "",
      Isha: t.Isha?.replace(/ \(.*\)/, "") || "",
    };
  } catch (e) {
    console.error("Failed to fetch prayer times:", e);
    return null;
  }
}

function formatPrayerTimesMessage(times) {
  if (!times) return "Не удалось загрузить время намаза. Попробуйте позже.";
  return (
    `\u{1F54C} *Время намаза (Бишкек)*\n\n` +
    `\u{1F305} Фаджр: *${times.Fajr}*\n` +
    `\u2600\uFE0F Восход: *${times.Sunrise}*\n` +
    `\u{1F324}\uFE0F Духа: *${times.Doha}*\n` +
    `\u{1F550} Зухр: *${times.Dhuhr}*\n` +
    `\u{1F324}\uFE0F Аср: *${times.Asr}*\n` +
    `\u{1F307} Магриб: *${times.Maghrib}*\n` +
    `\u{1F319} Иша: *${times.Isha}*\n\n` +
    `_Метод: Muslim World League_`
  );
}

// =========================================================================
// CONTENT DATA — Hadiths, Ayats, Duas for bot commands
// =========================================================================

const HADITHS = [
  {
    text: "Поистине, дела оцениваются по намерениям, и каждому человеку достанется лишь то, что он намеревался обрести.",
    source: "Аль-Бухари, Муслим",
  },
  {
    text: "Ни один из вас не уверует до тех пор, пока не станет желать своему брату того же, чего желает самому себе.",
    source: "Аль-Бухари, Муслим",
  },
  {
    text: "Ислам основывается на пяти столпах: свидетельство, молитва, закят, пост и хадж.",
    source: "Аль-Бухари, Муслим",
  },
  {
    text: "Тот, кто верует в Аллаха и в Последний день, пусть говорит благое или молчит.",
    source: "Аль-Бухари, Муслим",
  },
  { text: "Не гневайся! — повторил это несколько раз.", source: "Аль-Бухари" },
  {
    text: "Оставь то, что вызывает у тебя сомнения, и обратись к тому, что сомнений не вызывает.",
    source: "Ат-Тирмизи, Ан-Насаи",
  },
  {
    text: "Из хорошего исповедания ислама человеком — оставление им того, что его не касается.",
    source: "Ат-Тирмизи",
  },
  {
    text: "Не причиняй вреда и не отвечай вредом на вред.",
    source: "Ибн Маджа, Ад-Даракутни",
  },
  {
    text: "Удивительно положение верующего! Всё, что происходит с ним — благо для него.",
    source: "Муслим",
  },
  {
    text: "Пусть тот из вас, кто увидит порицаемое, изменит это своей рукой. Если не может — языком. Если не может — сердцем, и это самая слабая степень веры.",
    source: "Муслим",
  },
  {
    text: "Будь в этом мире так, словно ты чужестранец или путник.",
    source: "Аль-Бухари",
  },
  {
    text: "Не уверует никто из вас, пока я не стану для него любимее его отца, его сына и всех людей.",
    source: "Аль-Бухари, Муслим",
  },
  {
    text: "Аллах не смотрит на ваш внешний вид и ваше имущество, а смотрит на ваши сердца и ваши дела.",
    source: "Муслим",
  },
  {
    text: "Сильный — не тот, кто побеждает в борьбе, а тот, кто владеет собой в гневе.",
    source: "Аль-Бухари, Муслим",
  },
  { text: "Улыбка в лицо брату твоему — это садака.", source: "Ат-Тирмизи" },
  {
    text: "Кто указал на добро, тому полагается такая же награда, как и совершившему его.",
    source: "Муслим",
  },
  {
    text: "Берегитесь зависти, ибо зависть пожирает добрые дела подобно тому, как огонь пожирает дрова.",
    source: "Абу Дауд",
  },
  {
    text: "Лучший из вас тот, кто изучает Коран и обучает ему других.",
    source: "Аль-Бухари",
  },
  {
    text: "Кто встал на путь поиска знаний, тому Аллах облегчит путь в Рай.",
    source: "Муслим",
  },
  { text: "Рай находится под ногами матерей.", source: "Ан-Насаи" },
  {
    text: "Лучший из людей тот, кто приносит больше пользы другим людям.",
    source: "Ат-Табарани",
  },
  {
    text: "Поистине, Аллах мягок и любит мягкость во всех делах.",
    source: "Аль-Бухари, Муслим",
  },
  {
    text: "Самое любимое дело для Аллаха — то, которое совершается постоянно, даже если оно малое.",
    source: "Аль-Бухари, Муслим",
  },
  {
    text: "Тот, кто не благодарит людей, не благодарит Аллаха.",
    source: "Ат-Тирмизи",
  },
  {
    text: "Остерегайтесь подозрительности, ибо подозрительность — самая лживая речь.",
    source: "Аль-Бухари, Муслим",
  },
  {
    text: "Мусульманин — это тот, от языка и руки которого в безопасности другие мусульмане.",
    source: "Аль-Бухари, Муслим",
  },
  {
    text: "Тому, кто скроет недостаток мусульманина, Аллах скроет его недостатки в Судный день.",
    source: "Муслим",
  },
  {
    text: "Ищите благо на протяжении всей вашей жизни и подставляйте себя под дуновения милости Аллаха.",
    source: "Ат-Табарани",
  },
  {
    text: "Верующий для верующего подобен строению, части которого укрепляют друг друга.",
    source: "Аль-Бухари, Муслим",
  },
  {
    text: "Все мои последователи войдут в Рай, кроме тех, кто откажется. Кто повинуется мне — войдёт, а кто ослушается — тот отказался.",
    source: "Аль-Бухари",
  },
];

const AYATS = [
  {
    text: "Поистине, с трудностью приходит облегчение.",
    surah: "Аш-Шарх, 94:6",
  },
  {
    text: "И поминайте Меня, и Я буду помнить о вас.",
    surah: "Аль-Бакара, 2:152",
  },
  {
    text: "Аллах не возлагает на душу больше, чем она может вынести.",
    surah: "Аль-Бакара, 2:286",
  },
  { text: "И взывайте ко Мне, Я отвечу вам.", surah: "Гафир, 40:60" },
  { text: "Воистину, Аллах с терпеливыми.", surah: "Аль-Бакара, 2:153" },
  {
    text: "Он — Тот, Кто ниспосылает спокойствие в сердца верующих.",
    surah: "Аль-Фатх, 48:4",
  },
  {
    text: "Кто уповает на Аллаха, тому Его достаточно.",
    surah: "Ат-Талак, 65:3",
  },
  {
    text: "И благодеяние для самих себя, которое вы предварите, вы найдёте его у Аллаха лучшим и большим по награде.",
    surah: "Аль-Муззаммиль, 73:20",
  },
  {
    text: "Скажи: «Он — Аллах Единый, Аллах Самодостаточный.»",
    surah: "Аль-Ихлас, 112:1-2",
  },
  { text: "И на Аллаха пусть уповают верующие.", surah: "Ибрахим, 14:11" },
  {
    text: "Воистину, молитва удерживает от мерзости и предосудительного.",
    surah: "Аль-Анкабут, 29:45",
  },
  {
    text: "Разве сердца не успокаиваются поминанием Аллаха?",
    surah: "Ар-Раад, 13:28",
  },
  { text: "Он — Прощающий, Любящий.", surah: "Аль-Бурудж, 85:14" },
  {
    text: "Скажи: «О рабы Мои, которые излишествовали во вред самим себе, не теряйте надежды на милость Аллаха.»",
    surah: "Аз-Зумар, 39:53",
  },
  { text: "И сотворили Мы вас парами.", surah: "Ан-Наба, 78:8" },
  {
    text: "Поистине, Мы сотворили человека в наилучшем облике.",
    surah: "Ат-Тин, 95:4",
  },
  {
    text: "Аллах желает вам облегчения и не желает вам затруднения.",
    surah: "Аль-Бакара, 2:185",
  },
  {
    text: "И прощают людей. Аллах любит тех, кто вершит добро.",
    surah: "Аль Имран, 3:134",
  },
  {
    text: "Быть может, вам неприятно то, что является благом для вас.",
    surah: "Аль-Бакара, 2:216",
  },
  { text: "Аллах — Свет небес и земли.", surah: "Ан-Нур, 24:35" },
  {
    text: "Читай! Во имя Господа твоего, Который сотворил.",
    surah: "Аль-Алак, 96:1",
  },
  {
    text: "Мы отправили тебя только как милость для миров.",
    surah: "Аль-Анбия, 21:107",
  },
  {
    text: "Воистину, Аллах и Его ангелы благословляют Пророка.",
    surah: "Аль-Ахзаб, 33:56",
  },
  { text: "Поистине, обещание Аллаха — истина.", surah: "Юнус, 10:55" },
  {
    text: "И будьте терпеливы, ибо Аллах с терпеливыми.",
    surah: "Аль-Анфаль, 8:46",
  },
];

const DUAS = [
  {
    text: "Господь наш, даруй нам в этом мире добро и в Последней жизни добро, и защити нас от мучений Огня.",
    source: "Аль-Бакара, 2:201",
  },
  {
    text: "О Аллах, я прибегаю к Тебе от беспокойства и печали, от слабости и лени, от скупости и трусости, от бремени долга и притеснения людей.",
    source: "Аль-Бухари",
  },
  {
    text: "Господь мой, раскрой для меня мою грудь и облегчи мне моё дело.",
    source: "Коран, 20:25-26",
  },
  {
    text: "О Аллах, помоги мне поминать Тебя, благодарить Тебя и наилучшим образом поклоняться Тебе.",
    source: "Абу Дауд, Ан-Насаи",
  },
  {
    text: "О Аллах, я прошу Тебя о полезном знании, благом уделе и принятых деяниях.",
    source: "Ибн Маджа",
  },
  {
    text: "О Аллах, поистине, я прошу Тебя о руководстве, богобоязненности, целомудрии и достатке.",
    source: "Муслим",
  },
  {
    text: "О Аллах, прости мне мои грехи, расширь мне мой удел и благослови мне то, чем Ты меня наделил.",
    source: "Ат-Тирмизи",
  },
  {
    text: "Нет силы и мощи ни у кого, кроме Аллаха.",
    source: "Аль-Бухари, Муслим",
  },
  {
    text: "О Аллах, я прибегаю к Тебе от знания, которое не приносит пользы, от сердца, которое не смиряется, от души, которая не насыщается, и от мольбы, которая не принимается.",
    source: "Муслим",
  },
  {
    text: "О Аллах, благослови Мухаммада и семью Мухаммада, как Ты благословил Ибрахима и семью Ибрахима.",
    source: "Аль-Бухари, Муслим",
  },
  {
    text: "Достаточен для нас Аллах, и Он — прекрасный Покровитель.",
    source: "Аль Имран, 3:173",
  },
  {
    text: "Господь мой, помилуй их обоих (родителей), как они воспитывали меня маленьким.",
    source: "Коран, 17:24",
  },
  {
    text: "О Живой, о Вседержитель! Твоей милостью я взываю о помощи.",
    source: "Ат-Тирмизи",
  },
  {
    text: "О Аллах, сделай мне мой путь лёгким и приблизь мне далёкое расстояние.",
    source: "Муслим",
  },
  {
    text: "Хвала Аллаху, по милости Которого совершаются благие дела.",
    source: "Ибн Маджа",
  },
];

// =========================================================================
// DAILY BROADCAST — 7:00 AM Bishkek time (UTC+6)
// =========================================================================

let lastBroadcastDate = "";

function getBishkekHour() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  return (utcHour + 6) % 24;
}

function getBishkekDateStr() {
  const now = new Date();
  const bishkek = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  return bishkek.toISOString().slice(0, 10);
}

async function sendDailyBroadcast() {
  const today = getBishkekDateStr();
  if (lastBroadcastDate === today) return;

  const hour = getBishkekHour();
  const minutes = new Date().getUTCMinutes();
  if (hour !== 7 || minutes > 1) return;

  lastBroadcastDate = today;
  console.log(`Starting daily broadcast to ${subscribers.size} subscribers`);

  const dayIndex = Math.floor(
    (Date.now() - new Date("2026-01-01").getTime()) / 86400000,
  );
  const hadith = HADITHS[dayIndex % HADITHS.length];
  const ayat = AYATS[dayIndex % AYATS.length];
  const dua = DUAS[dayIndex % DUAS.length];

  // Fetch today's prayer times for broadcast
  const prayerTimes = await fetchPrayerTimes();
  const prayerSection = prayerTimes
    ? `\n\u{1F54C} *Время намаза:*\n` +
      `  Фаджр: ${prayerTimes.Fajr} | Восход: ${prayerTimes.Sunrise}\n` +
      `  Зухр: ${prayerTimes.Dhuhr} | Аср: ${prayerTimes.Asr}\n` +
      `  Магриб: ${prayerTimes.Maghrib} | Иша: ${prayerTimes.Isha}\n`
    : "";

  const message =
    `\u2728 *Доброе утро!*\n` +
    prayerSection +
    `\n\u{1F4D6} *Хадис дня:*\n${hadith.text}\n_${hadith.source}_\n\n` +
    `\u{1F4D6} *Аят дня:*\n${ayat.text}\n_${ayat.surah}_\n\n` +
    `\u{1F64F} *Дуа дня:*\n${dua.text}\n_${dua.source}_\n\n` +
    `Да благословит вас Аллах! \u{1F54C}`;

  const ids = [...subscribers];
  for (let i = 0; i < ids.length; i++) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: ids[i],
            text: message,
            parse_mode: "Markdown",
          }),
        },
      );
      const data = await res.json();
      if (!data.ok && (data.error_code === 403 || data.error_code === 400)) {
        subscribers.delete(ids[i]);
      }
    } catch (e) {
      console.error(`Failed to send to ${ids[i]}:`, e);
    }
    if (i < ids.length - 1) {
      await new Promise((r) => setTimeout(r, 40));
    }
  }

  saveSubscribers();
  console.log(
    `Daily broadcast complete, ${subscribers.size} active subscribers`,
  );
}

setInterval(sendDailyBroadcast, 60 * 1000);

// =========================================================================
// TELEGRAM BOT HANDLER
// =========================================================================

async function sendMessage(chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("sendMessage error:", e);
  }
}

async function handleWebhook(body) {
  const msg = body.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = sanitizeText(msg.text);
  const name = sanitizeName(msg.from?.first_name);

  const appButton = {
    inline_keyboard: [
      [{ text: "\u{1F55C} Открыть IMAN", web_app: { url: APP_URL } }],
    ],
  };

  if (text === "/start") {
    subscribers.add(chatId);
    saveSubscribers();

    await sendMessage(
      chatId,
      `Ас-саляму алейкум, ${name}! \u2728\n\n` +
        `Добро пожаловать в *IMAN* — ваш помощник в духовном развитии.\n\n` +
        `\u{1F54C} Намазы с точным временем\n` +
        `\u{1F4D6} Коран с тафсиром и переводом\n` +
        `\u{1F64F} Дуа и зикр на каждый день\n` +
        `\u{1F9E0} Квиз для проверки знаний\n` +
        `\u{1F4DC} Сира — жизнеописание Пророка \u{FE0E}\n` +
        `\u{1F4CA} Статистика вашего прогресса\n\n` +
        `\u{1F514} Вы подписаны на ежедневные напоминания (7:00 Бишкек)\n\n` +
        `Команды:\n` +
        `/namaz — Время намаза на сегодня\n` +
        `/hadith — Случайный хадис\n` +
        `/ayat — Случайный аят Корана\n` +
        `/dua — Случайное дуа\n` +
        `/remind — Подписка на напоминания\n` +
        `/stop — Отписка\n` +
        `/help — Помощь\n\n` +
        `Нажмите кнопку ниже, чтобы открыть приложение:`,
      appButton,
    );
  } else if (text === "/namaz" || text === "/prayer" || text === "/times") {
    const times = await fetchPrayerTimes();
    await sendMessage(chatId, formatPrayerTimesMessage(times));
  } else if (text === "/hadith") {
    const h = HADITHS[Math.floor(Math.random() * HADITHS.length)];
    await sendMessage(
      chatId,
      `\u{1F4D6} *Хадис:*\n\n${h.text}\n\n_Источник: ${h.source}_`,
    );
  } else if (text === "/ayat") {
    const a = AYATS[Math.floor(Math.random() * AYATS.length)];
    await sendMessage(
      chatId,
      `\u{1F4D6} *Аят Корана:*\n\n${a.text}\n\n_${a.surah}_`,
    );
  } else if (text === "/dua") {
    const d = DUAS[Math.floor(Math.random() * DUAS.length)];
    await sendMessage(
      chatId,
      `\u{1F64F} *Дуа:*\n\n${d.text}\n\n_Источник: ${d.source}_`,
    );
  } else if (text === "/remind") {
    subscribers.add(chatId);
    saveSubscribers();
    await sendMessage(
      chatId,
      `\u{1F514} Вы подписаны на ежедневные напоминания!\n\nКаждый день в 7:00 (Бишкек) вы будете получать хадис, аят, дуа и время намаза.\n\nДля отписки: /stop`,
    );
  } else if (text === "/stop") {
    subscribers.delete(chatId);
    saveSubscribers();
    await sendMessage(
      chatId,
      `\u{1F515} Вы отписались от ежедневных напоминаний.\n\nЧтобы подписаться снова: /remind`,
    );
  } else if (text === "/app") {
    await sendMessage(
      chatId,
      "Нажмите кнопку, чтобы открыть приложение:",
      appButton,
    );
  } else if (text === "/help") {
    await sendMessage(
      chatId,
      `*IMAN — Помощь*\n\n` +
        `Команды:\n` +
        `/start — Приветствие\n` +
        `/namaz — Время намаза на сегодня\n` +
        `/hadith — Случайный хадис\n` +
        `/ayat — Случайный аят Корана\n` +
        `/dua — Случайное дуа\n` +
        `/remind — Подписка на напоминания\n` +
        `/stop — Отписка от напоминаний\n` +
        `/app — Открыть приложение\n` +
        `/help — Эта справка\n\n` +
        `Или нажмите кнопку *«Открыть IMAN»* внизу чата.`,
    );
  } else {
    await sendMessage(
      chatId,
      `Ас-саляму алейкум! \u2728\n\nОткройте приложение IMAN кнопкой ниже:`,
      appButton,
    );
  }
}

// =========================================================================
// HTTP SERVER — Static files + Webhook (with security)
// =========================================================================

const server = createServer(async (req, res) => {
  const clientIP =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  // ── Rate limiting ─────────────────────────────────────────────────────
  if (isRateLimited(clientIP)) {
    res.writeHead(429, {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "Retry-After": "60",
    });
    res.end('{"error":"Too many requests"}');
    return;
  }

  // ── Webhook endpoint ──────────────────────────────────────────────────
  if (req.method === "POST" && req.url === WEBHOOK_PATH) {
    // Verify Telegram secret token
    const secretHeader = req.headers["x-telegram-bot-api-secret-token"];
    if (secretHeader !== WEBHOOK_SECRET) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end('{"error":"Forbidden"}');
      return;
    }

    // Limit body size (1MB max)
    let body = "";
    let bodySize = 0;
    const MAX_BODY = 1024 * 1024;

    req.on("data", (chunk) => {
      bodySize += chunk.length;
      if (bodySize > MAX_BODY) {
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on("end", async () => {
      if (bodySize > MAX_BODY) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end('{"error":"Payload too large"}');
        return;
      }
      try {
        await handleWebhook(JSON.parse(body));
      } catch (e) {
        console.error("Webhook error:", e);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"ok":true}');
    });
    return;
  }

  // ── Health check ──────────────────────────────────────────────────────
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
    });
    res.end(
      JSON.stringify({
        status: "ok",
        subscribers: subscribers.size,
        uptime: Math.floor(process.uptime()),
      }),
    );
    return;
  }

  // ── Block non-GET methods for static files ────────────────────────────
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { ...SECURITY_HEADERS, "Content-Type": "text/plain" });
    res.end("Method not allowed");
    return;
  }

  // ── Static files with path traversal protection ───────────────────────
  const urlPath = (req.url || "/").split("?")[0];
  const safePath = normalize(urlPath).replace(/^(\.\.[\/\\])+/, "");
  let filePath = join(DIST, safePath === "/" ? "index.html" : safePath);

  // Ensure resolved path is within DIST
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403, { ...SECURITY_HEADERS, "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  if (!existsSync(filePath)) {
    filePath = join(DIST, "index.html");
  }

  const ext = extname(filePath);
  const contentType = MIME[ext] || "application/octet-stream";

  try {
    const data = readFileSync(filePath);
    const headers = {
      ...SECURITY_HEADERS,
      "Content-Type": contentType,
    };

    // Cache static assets aggressively (hashed filenames)
    if (filePath.includes("/assets/")) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    } else if (ext === ".html") {
      headers["Cache-Control"] = "no-cache";
    }

    // HSTS — only via HTTPS (Railway handles TLS)
    headers["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains";

    res.writeHead(200, headers);
    res.end(data);
  } catch {
    res.writeHead(404, { ...SECURITY_HEADERS, "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`IMAN server running on port ${PORT}`);
  console.log(`Security: webhook secret, rate limiting, CSP, HSTS enabled`);

  if (BOT_TOKEN && APP_URL) {
    const webhookUrl = `${APP_URL}${WEBHOOK_PATH}`;
    try {
      const r = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: webhookUrl,
            secret_token: WEBHOOK_SECRET,
            max_connections: 40,
            allowed_updates: ["message"],
          }),
        },
      );
      const data = await r.json();
      console.log("Webhook set:", data.ok ? webhookUrl : data.description);

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commands: [
            { command: "start", description: "Начать / Приветствие" },
            { command: "namaz", description: "Время намаза на сегодня" },
            { command: "hadith", description: "Случайный хадис" },
            { command: "ayat", description: "Случайный аят Корана" },
            { command: "dua", description: "Случайное дуа" },
            { command: "remind", description: "Подписка на напоминания" },
            { command: "stop", description: "Отписка от напоминаний" },
            { command: "app", description: "Открыть приложение" },
            { command: "help", description: "Помощь" },
          ],
        }),
      });
    } catch (e) {
      console.error("Failed to set webhook:", e);
    }
  }
});
