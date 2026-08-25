// IMAN App Server — all data persisted in PostgreSQL
import { createServer } from "http";
import https from "https";
import { readFileSync, readFile, writeFileSync as fsWriteFileSync, existsSync, mkdirSync } from "fs";
import { join, extname, normalize } from "path";
import { fileURLToPath } from "url";
import { randomBytes, createHmac, scryptSync, timingSafeEqual } from "crypto";
import pkg from "pg";
const { Pool } = pkg;

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "dist");
const PORT = parseInt(process.env.PORT || "3000", 10);
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) { console.error('[FATAL] BOT_TOKEN environment variable is required'); process.exit(1); }
const APP_URL =
  process.env.APP_URL || "https://iman-app-production.up.railway.app";
const WEBHOOK_PATH = `/webhook-${BOT_TOKEN.split(":")[0]}`;

// =========================================================================
// PostgreSQL DATABASE — User data persistence
// =========================================================================
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL environment variable is not set!");
  console.error("Please add DATABASE_URL in Railway Variables.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Test connection and init DB
(async () => {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT NOW()");
    console.log("✅ Database connected:", res.rows[0].now);

    // Локальные пулы контента для бота (не зависят от БД — грузим сразу)
    loadHadithIndexes();
    loadAudioCatalog();
    loadDuaPool();
    loadSurahNamesRu();

    // Create users table (renamed to iman_users to avoid conflict with Unity)
    await client.query(`
      CREATE TABLE IF NOT EXISTS iman_users (
        telegram_id BIGINT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `);

    // Add created_at (real registration date) — needed for honest "new users" stats
    await client.query(
      `ALTER TABLE iman_users ADD COLUMN IF NOT EXISTS created_at BIGINT`,
    );
    // Backfill created_at from earliest analytics event per user (best estimate of join time)
    await client.query(`
      UPDATE iman_users u
      SET created_at = sub.min_ts
      FROM (
        SELECT telegram_id, MIN(timestamp) AS min_ts
        FROM iman_analytics GROUP BY telegram_id
      ) sub
      WHERE u.telegram_id = sub.telegram_id AND u.created_at IS NULL
    `);
    // Remaining users without any analytics: fall back to updated_at
    await client.query(
      `UPDATE iman_users SET created_at = updated_at WHERE created_at IS NULL`,
    );

    // Create analytics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS iman_analytics (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL REFERENCES iman_users(telegram_id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        page TEXT,
        action TEXT,
        metadata JSONB,
        timestamp BIGINT NOT NULL
      )
    `);

    // Create subscribers table (persistent across deploys!)
    await client.query(`
      CREATE TABLE IF NOT EXISTS iman_subscribers (
        telegram_id BIGINT PRIMARY KEY,
        subscribed_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
      )
    `);

    // Create dua_wall table (anonymous prayer requests)
    await client.query(`
      CREATE TABLE IF NOT EXISTS dua_wall (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        pray_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        telegram_id BIGINT
      )
    `);


    // Учётные данные для входа вне Telegram (браузер, другое устройство).
    // Пользователь сам придумывает логин+пароль внутри Mini App — регистрация
    // подтверждается подлинными данными Telegram (initData с HMAC-подписью),
    // так что чужой telegram_id занять нельзя.
    await client.query(`
      CREATE TABLE IF NOT EXISTS iman_credentials (
        telegram_id BIGINT PRIMARY KEY REFERENCES iman_users(telegram_id) ON DELETE CASCADE,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_iman_credentials_username ON iman_credentials(LOWER(username))`,
    );

    // Create audit log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS iman_audit_log (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_iman_audit_log_telegram_id ON iman_audit_log(telegram_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_iman_audit_log_action ON iman_audit_log(action)`,
    );

    // Create indexes
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_iman_analytics_telegram_id ON iman_analytics(telegram_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_iman_analytics_type ON iman_analytics(type)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_iman_analytics_timestamp ON iman_analytics(timestamp)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_iman_users_updated_at ON iman_users(updated_at)`,
    );

    console.log("✅ Database schema initialized");
  } catch (err) {
    console.error("❌ Database error:", err.message);
    process.exit(1);
  } finally {
    client.release();
  }

  // Load subscribers AFTER table is created and client is released
  await loadSubscribers();

  // Auto-restore: add all existing users + known admins as subscribers
  try {
    // All app users came via bot /start, so they are subscribers
    await pool.query(
      `INSERT INTO iman_subscribers (telegram_id)
       SELECT telegram_id FROM iman_users
       ON CONFLICT (telegram_id) DO NOTHING`,
    );
    // Admin Telegram IDs (definitely used /start)
    for (const adminId of [508698471, 542914483, 526330944]) {
      await pool.query(
        `INSERT INTO iman_subscribers (telegram_id) VALUES ($1) ON CONFLICT (telegram_id) DO NOTHING`,
        [adminId],
      );
    }
    // Reload into memory with all restored subscribers
    await loadSubscribers();
    console.log(`✅ Subscribers restored/synced: ${subscribers.size} total`);
  } catch (e) {
    console.error("Failed to restore subscribers:", e);
  }
})();

// Database helper functions (replacing prepared statements)
const stmtGetUser = {
  get: async (telegramId) => {
    const result = await pool.query(
      "SELECT data, updated_at FROM iman_users WHERE telegram_id = $1",
      [telegramId],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      data: typeof row.data === "string" ? row.data : JSON.stringify(row.data),
      updated_at: row.updated_at,
    };
  },
};

const stmtUpsertUser = {
  run: async (telegramId, dataStr, updatedAt) => {
    await pool.query(
      `INSERT INTO iman_users (telegram_id, data, updated_at, created_at)
       VALUES ($1, $2, $3, $3)
       ON CONFLICT (telegram_id)
       DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
      [telegramId, dataStr, updatedAt],
    );
  },
};

const stmtInsertAnalytics = {
  run: async (telegramId, type, page, action, metadata, timestamp) => {
    await pool.query(
      `INSERT INTO iman_analytics (telegram_id, type, page, action, metadata, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        telegramId,
        type,
        page || null,
        action || null,
        metadata || null,
        timestamp,
      ],
    );
  },
};


// =========================================================================
// AUDIT LOG — Track important actions
// =========================================================================
// Supabase audit pool (for unified UnityMonitor audit log)
let _auditPool = null;
function getAuditPool() {
  if (!_auditPool && process.env.BACKUP_DATABASE_URL) {
    _auditPool = new Pool({
      connectionString: process.env.BACKUP_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 2, idleTimeoutMillis: 60000,
    });
    _auditPool.on("error", () => {});
  }
  return _auditPool;
}

async function auditLog(telegramId, action, entityType, entityId, details) {
  try {
    await pool.query(
      `INSERT INTO iman_audit_log (telegram_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [telegramId || null, action, entityType || null, entityId || null, details ? JSON.stringify(details) : null]
    );
    // Duplicate to unified audit log for UnityMonitor (Supabase)
    const ap = getAuditPool();
    if (ap) {
      ap.query(
        `INSERT INTO unity_audit_log (app, user_id, username, action, entity, entity_id, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ["iman_app", null, telegramId ? String(telegramId) : null, action, entityType || null, entityId ? parseInt(entityId) || null : null, details ? JSON.stringify(details) : '{}']
      ).catch(() => {});
    }
  } catch (e) {
    console.error("Audit log error:", e.message);
  }
}

// DATA_DIR kept for any local file needs
const DATA_DIR = process.env.RAILWAY_ENVIRONMENT
  ? "/data"
  : join(__dirname, "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// =========================================================================
// ADMIN AUTHORIZATION
// =========================================================================
const ADMIN_TELEGRAM_IDS = [
  508698471, // Aziz Atavaliev (основной admin)
  542914483, // Akylai (второй admin)
  526330944, // Aziz (второй TG аккаунт)
];

const ADMIN_USERNAMES = [
  "atavaliev", // @atavaliev - fallback (less secure than ID)
  "atavaliev", // альтернативное написание
];

function isAdmin(telegramId, username) {
  // Primary: check by Telegram ID (immutable, secure)
  if (telegramId && ADMIN_TELEGRAM_IDS.includes(telegramId)) {
    return true;
  }
  // Fallback: check by username (can be changed, less secure)
  if (username && ADMIN_USERNAMES.includes(username.toLowerCase())) {
    return true;
  }
  return false;
}

// Секретный токен для отдельного дашборда статистики (доступ по ссылке,
// без Telegram-логина). Задаётся через env DASHBOARD_TOKEN.
const DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN || "";
function dashboardTokenOk(req) {
  return Boolean(DASHBOARD_TOKEN) && req.headers["x-dashboard-token"] === DASHBOARD_TOKEN;
}

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
// BROWSER LOGIN — свой логин+пароль для входа вне Telegram, с любого устройства
// =========================================================================
// Каждый пользователь сам придумывает логин+пароль ВНУТРИ Telegram Mini App
// (там его личность уже подтверждена самим Telegram). Дальше этим
// логином+паролем можно войти в обычном браузере на любом устройстве —
// сессия ведёт к тому же профилю (namaz/саваб/уровень), что и в Telegram.
//
// Регистрация обязана проверять ПОДЛИННОСТЬ Telegram-данных (initData
// с HMAC-подписью бота) — иначе кто угодно мог бы прислать чужой telegram_id
// и присвоить себе чужой прогресс.
const SESSION_SECRET = process.env.IMAN_SESSION_SECRET || WEBHOOK_SECRET;

function signBrowserSession(telegramId, expiresAt) {
  const payload = `${telegramId}.${expiresAt}`;
  const sig = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

/**
 * Проверка подлинности Telegram.WebApp.initData по алгоритму из документации
 * Telegram: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Возвращает { id, first_name, ... } реального пользователя или null.
 */
function validateTelegramInitData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");

    const authDate = parseInt(params.get("auth_date") || "0", 10);
    // initData старше 24 часов — не принимаем (защита от replay сохранённой строки)
    if (!authDate || Date.now() / 1000 - authDate > 24 * 60 * 60) return null;

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    const computedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const a = Buffer.from(computedHash, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const userJson = params.get("user");
    if (!userJson) return null;
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

// Пароли хранятся как scrypt-хеш + случайная соль (встроено в Node, без зависимостей)
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Отдельный, более строгий лимитер — против перебора пароля
const loginAttempts = new Map(); // IP -> { count, resetTime }
const LOGIN_WINDOW = 15 * 60 * 1000; // 15 минут
const LOGIN_MAX = 5; // 5 попыток за окно

function isLoginRateLimited(ip) {
  const now = Date.now();
  let entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + LOGIN_WINDOW };
    loginAttempts.set(ip, entry);
  }
  entry.count++;
  return entry.count > LOGIN_MAX;
}

// =========================================================================
// SECURITY — Rate limiting
// =========================================================================
const rateLimitMap = new Map(); // IP -> { count, resetTime }
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 200; // max requests per window per IP (mini app needs many calls on load)

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
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://telegram.org",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.aladhan.com https://api.alquran.cloud https://cdn.jsdelivr.net https://api.quran.com https://cdn.islamic.network https://server8.mp3quran.net",
    "media-src 'self' https://cdn.islamic.network https://server8.mp3quran.net blob: data:",
    "frame-ancestors 'self' https://web.telegram.org https://telegram.org https://*.telegram.org https://webk.telegram.org https://webz.telegram.org https://weba.telegram.org",
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
// SUBSCRIBERS — in-memory Set + PostgreSQL persistence (survives deploys)
// =========================================================================

const subscribers = new Set();

async function loadSubscribers() {
  try {
    const result = await pool.query("SELECT telegram_id FROM iman_subscribers");
    result.rows.forEach((row) => subscribers.add(Number(row.telegram_id)));
    console.log(`✅ Loaded ${subscribers.size} subscribers from PostgreSQL`);
  } catch (e) {
    console.error("Failed to load subscribers from DB:", e);
  }
}

async function addSubscriber(chatId) {
  subscribers.add(chatId);
  try {
    await pool.query(
      `INSERT INTO iman_subscribers (telegram_id) VALUES ($1) ON CONFLICT (telegram_id) DO NOTHING`,
      [chatId],
    );
  } catch (e) {
    console.error("Failed to save subscriber:", e);
  }
}

async function removeSubscriber(chatId) {
  subscribers.delete(chatId);
  try {
    await pool.query("DELETE FROM iman_subscribers WHERE telegram_id = $1", [
      chatId,
    ]);
  } catch (e) {
    console.error("Failed to remove subscriber:", e);
  }
}

// Subscribers loaded after DB schema init (see below in IIFE)

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
      `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=3&school=1`,
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
    `_Метод: MWL, ханафитский масхаб_`
  );
}

// =========================================================================
// БОЛЬШОЙ ЛОКАЛЬНЫЙ ПУЛ ХАДИСОВ (те же данные, что в Mini App: ~16 300 хадисов)
// Бухари, Муслим, Абу Дауд, Сады праведных — читаем index.json один раз при
// старте, тексты книг подгружаем по требованию (не держим всё в памяти).
// =========================================================================

const HADITH_DATA_DIR = join(__dirname, "public", "data", "hadiths");
const HADITH_COLLECTIONS = ["bukhari", "muslim", "abudawud", "riyad"];
const HADITH_COLLECTION_LABEL = {
  bukhari: "Сахих аль-Бухари",
  muslim: "Сахих Муслим",
  abudawud: "Сунан Абу Дауда",
  riyad: "Сады праведных",
};
const HADITH_GRADE_LABEL = {
  sahih: "Достоверный (сахих)",
  hasan: "Хороший (хасан)",
  daif: "Слабый (даиф)",
};

// Плоский диапазон: [{ collection, book, name, start, count }, ...] —
// позволяет по одному глобальному индексу найти нужную книгу и офсет внутри неё.
let hadithFlatRanges = [];
let hadithTotalCount = 0;

function loadHadithIndexes() {
  let cursor = 0;
  const ranges = [];
  for (const collection of HADITH_COLLECTIONS) {
    try {
      const idxPath = join(HADITH_DATA_DIR, collection, "index.json");
      const idx = JSON.parse(readFileSync(idxPath, "utf-8"));
      for (const b of idx) {
        ranges.push({ collection, book: b.book, name: b.name, start: cursor, count: b.count });
        cursor += b.count;
      }
    } catch (e) {
      console.error(`Failed to load hadith index for ${collection}:`, e.message);
    }
  }
  hadithFlatRanges = ranges;
  hadithTotalCount = cursor;
  console.log(`✅ Hadith pool: ${hadithTotalCount} hadiths across ${HADITH_COLLECTIONS.length} collections`);
}

function hadithAtGlobalIndex(globalIdx) {
  const range = hadithFlatRanges.find(
    (r) => globalIdx >= r.start && globalIdx < r.start + r.count,
  );
  if (!range) return null;
  const localIdx = globalIdx - range.start;
  try {
    const bookPath = join(HADITH_DATA_DIR, range.collection, `${range.book}.json`);
    const arr = JSON.parse(readFileSync(bookPath, "utf-8"));
    const h = arr[localIdx];
    if (!h) return null;
    return {
      text: h.ru,
      arabic: h.ar || "",
      source: `${HADITH_COLLECTION_LABEL[range.collection]}, ${range.name}, №${h.n}`,
      grade: h.g || (range.collection === "riyad" ? undefined : "sahih"),
    };
  } catch (e) {
    console.error("Failed to read hadith book file:", e.message);
    return null;
  }
}

function getRandomHadithFromPool() {
  if (hadithTotalCount === 0) return null;
  return hadithAtGlobalIndex(Math.floor(Math.random() * hadithTotalCount));
}

function getDailyHadithFromPool(seed) {
  if (hadithTotalCount === 0) return null;
  return hadithAtGlobalIndex(((seed % hadithTotalCount) + hadithTotalCount) % hadithTotalCount);
}

function formatHadithMessage(h, title = "Хадис") {
  if (!h) return "Не удалось загрузить хадис.";
  const grade = h.grade ? ` · _${HADITH_GRADE_LABEL[h.grade]}_` : "";
  return `\u{1F4D6} *${title}:*\n\n${h.text}\n\n_${h.source}_${grade}`;
}

// =========================================================================
// АУДИО-БИБЛИОТЕКА — реальные голоса (islamhouse.com), та же база, что в
// разделе /audio Mini App. 109 серий, 384 дорожки: Коран, тафсир, лекции...
// =========================================================================

let audioCatalog = [];
function loadAudioCatalog() {
  try {
    const p = join(__dirname, "public", "data", "audio", "catalog.json");
    audioCatalog = JSON.parse(readFileSync(p, "utf-8"));
    console.log(`✅ Audio catalog: ${audioCatalog.length} series loaded`);
  } catch (e) {
    console.error("Failed to load audio catalog:", e.message);
  }
}

function getRandomAudioTrack() {
  if (audioCatalog.length === 0) return null;
  const series = audioCatalog[Math.floor(Math.random() * audioCatalog.length)];
  const url = series.tracks[Math.floor(Math.random() * series.tracks.length)];
  return { title: series.title, url };
}

// =========================================================================
// РАСШИРЕННЫЙ ПУЛ ДУА (93 дуа из Mini App, вместо 15 захардкоженных)
// =========================================================================

let duaPool = [];
function loadDuaPool() {
  try {
    const p = join(__dirname, "public", "data", "dua-pool.json");
    duaPool = JSON.parse(readFileSync(p, "utf-8"));
    console.log(`✅ Dua pool: ${duaPool.length} duas loaded`);
  } catch (e) {
    console.error("Failed to load dua pool:", e.message);
  }
}

function getRandomDuaFromPool() {
  if (duaPool.length === 0) return null;
  const d = duaPool[Math.floor(Math.random() * duaPool.length)];
  return { text: d.ru, arabic: d.ar, source: d.src };
}

function getDailyDuaFromPool(seed) {
  if (duaPool.length === 0) return null;
  const d = duaPool[((seed % duaPool.length) + duaPool.length) % duaPool.length];
  return { text: d.ru, arabic: d.ar, source: d.src };
}

// =========================================================================
// ЖИВОЙ СЛУЧАЙНЫЙ АЯТ — весь Коран (6236 аятов) через alquran.cloud,
// вместо 25 захардкоженных цитат.
// =========================================================================

const QURAN_TOTAL_AYAHS = 6236;

let surahNamesRu = {};
function loadSurahNamesRu() {
  try {
    const p = join(__dirname, "public", "data", "surah-names-ru.json");
    surahNamesRu = JSON.parse(readFileSync(p, "utf-8"));
    console.log(`✅ Surah names (RU): ${Object.keys(surahNamesRu).length} loaded`);
  } catch (e) {
    console.error("Failed to load Russian surah names:", e.message);
  }
}

async function getRandomAyahLive() {
  const n = Math.floor(Math.random() * QURAN_TOTAL_AYAHS) + 1;
  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/ayah/${n}/editions/quran-uthmani,ru.kuliev`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const [arabicEd, ruEd] = data?.data || [];
    if (!ruEd) return null;
    const surahName =
      surahNamesRu[ruEd.surah.number] || ruEd.surah.englishNameTranslation;
    return {
      text: ruEd.text,
      arabic: arabicEd?.text || "",
      surah: `Сура «${surahName}» (${ruEd.surah.number}:${ruEd.numberInSurah})`,
    };
  } catch (e) {
    console.error("Failed to fetch live ayah:", e.message);
    return null;
  }
}

// =========================================================================
// CONTENT DATA — Hadiths, Ayats, Duas for bot commands
// (старые короткие массивы — оставлены как офлайн-fallback, если новый
// локальный пул/сеть недоступны)
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

const CHANNEL_LINK = "https://t.me/+UcggjLlqNuAyN2Qy";

// Track which broadcasts were sent today (morning, afternoon, evening)
let sentBroadcasts = {
  morning: "",
  afternoon: "",
  evening: "",
  jumua: "",
  night: "",
  motivation: "",
};

// ── Реальные адхан-уведомления — точно ко времени намаза (не по фикс. часам) ──
const PRAYER_RU_NAME = {
  Fajr: "Фаджр",
  Dhuhr: "Зухр",
  Asr: "Аср",
  Maghrib: "Магриб",
  Isha: "Иша",
};
const sentAdhan = {}; // `${prayer}_${dateStr}` -> true
let cachedPrayerTimes = null;
let cachedPrayerTimesDate = "";

async function getCachedTodayPrayerTimes(today) {
  if (cachedPrayerTimesDate === today && cachedPrayerTimes) return cachedPrayerTimes;
  const times = await fetchPrayerTimes();
  if (times) {
    cachedPrayerTimes = times;
    cachedPrayerTimesDate = today;
  }
  return cachedPrayerTimes;
}

async function broadcastToAll(message, replyMarkup = null) {
  const ids = [...subscribers];
  let sent = 0;
  for (let i = 0; i < ids.length; i++) {
    try {
      const payload = {
        chat_id: ids[i],
        text: message,
        parse_mode: "Markdown",
      };
      if (replyMarkup) payload.reply_markup = replyMarkup;
      const res = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!data.ok && (data.error_code === 403 || data.error_code === 400)) {
        await removeSubscriber(ids[i]);
      } else {
        sent++;
      }
    } catch (e) {
      console.error(`Failed to send to ${ids[i]}:`, e);
    }
    if (i < ids.length - 1) {
      await new Promise((r) => setTimeout(r, 40));
    }
  }
  return sent;
}

async function sendScheduledBroadcasts() {
  const today = getBishkekDateStr();
  const hour = getBishkekHour();
  const minutes = new Date().getUTCMinutes();

  const dayIndex = Math.floor(
    (Date.now() - new Date("2026-01-01").getTime()) / 86400000,
  );

  // ── Адхан: пуш точно к наступлению времени намаза (Fajr/Dhuhr/Asr/Maghrib/Isha) ──
  // В отличие от фикс. рассылок ниже (7:00/13:00/20:00...), эти уведомления
  // привязаны к реальному расчёту времени намаза на сегодня (Бишкек).
  try {
    const times = await getCachedTodayPrayerTimes(today);
    if (times) {
      const nowTotalMin = hour * 60 + minutes;
      for (const prayer of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]) {
        const raw = times[prayer];
        const m = raw && raw.match(/^(\d{1,2}):(\d{2})/);
        if (!m) continue;
        const prayerTotalMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        const diff = nowTotalMin - prayerTotalMin;
        const key = `${prayer}_${today}`;
        if (diff >= 0 && diff <= 1 && sentAdhan[key] !== true) {
          sentAdhan[key] = true;
          const adhanMsg =
            `\u{1F54C} *Наступило время намаза: ${PRAYER_RU_NAME[prayer]}*\n\n` +
            `⏰ ${raw} (Бишкек)\n\n` +
            `_«Поистине, намаз предписан верующим в определённое время» (Коран, 4:103)_`;
          const adhanButtons = {
            inline_keyboard: [
              [{ text: "\u{1F54C} Я прочитал намаз", web_app: { url: APP_URL + "/prayers" } }],
            ],
          };
          const sent = await broadcastToAll(adhanMsg, adhanButtons);
          console.log(`Adhan (${prayer}) broadcast sent to ${sent} subscribers`);
        }
      }
    }
  } catch (e) {
    console.error("Adhan broadcast error:", e);
  }

  // ── Хелпер: кнопка для открытия конкретного экрана Mini App ─────────
  const wa = (text, route = "") => ({
    text,
    web_app: { url: APP_URL + route },
  });
  const channelButton = {
    inline_keyboard: [
      [{ text: "\u{1F4E2} Наш канал", url: CHANNEL_LINK }],
      [{ text: "\u{1F55C} Открыть IMAN", web_app: { url: APP_URL } }],
    ],
  };

  // Morning broadcast — 7:00 Bishkek
  if (hour === 7 && minutes <= 1 && sentBroadcasts.morning !== today) {
    sentBroadcasts.morning = today;
    const hadith = HADITHS[dayIndex % HADITHS.length];
    const ayat = AYATS[dayIndex % AYATS.length];
    const dua = DUAS[dayIndex % DUAS.length];

    const message =
      `\u2728 *Доброе утро!*\n` +
      `\u{1F4A1} _Удели 5-10 минут дину сегодня — это лучшая инвестиция в Ахират_\n` +
      `\n\u{1F4D6} *Хадис дня:*\n${hadith.text}\n_${hadith.source}_\n\n` +
      `\u{1F4D6} *Аят дня:*\n${ayat.text}\n_${ayat.surah}_\n\n` +
      `\u{1F64F} *Дуа дня:*\n${dua.text}\n_${dua.source}_\n\n` +
      `Да благословит вас Аллах! \u{1F54C}`;

    const morningButtons = {
      inline_keyboard: [
        [wa("\u{1F4D6} Читать Коран", "/quran"), wa("\u{1F4FF} Зикры", "/dhikr")],
        [wa("\u{1F64F} Дуа на день", "/dua"), wa("\u{1F4DC} Хадис", "/hadiths")],
        [wa("\u{1F54C} Открыть IMAN", "")],
      ],
    };
    const sent = await broadcastToAll(message, morningButtons);
    console.log(`Morning broadcast sent to ${sent} subscribers`);
  }

  // Afternoon broadcast — 13:00 Bishkek (random hadith/dua)
  if (hour === 13 && minutes <= 1 && sentBroadcasts.afternoon !== today) {
    sentBroadcasts.afternoon = today;
    const r = (dayIndex * 7 + 3) % HADITHS.length;
    const hadith = HADITHS[r];

    const message =
      `\u{1F54C} *Напоминание*\n\n` +
      `\u{1F4D6} ${hadith.text}\n\n_${hadith.source}_\n\n` +
      `_Не забудь прочитать послеобеденные азкары!_`;

    const afternoonButtons = {
      inline_keyboard: [
        [wa("\u{1F4FF} Тасбих 33×3", "/zikr"), wa("\u{1F54C} Время намаза", "/prayers")],
        [wa("\u{2753} Q&A по исламу", "/qa")],
        [wa("\u{1F54C} Открыть IMAN", "")],
      ],
    };
    const sent = await broadcastToAll(message, afternoonButtons);
    console.log(`Afternoon broadcast sent to ${sent} subscribers`);
  }

  // Evening broadcast — 20:00 Bishkek (evening dua/azkar reminder)
  if (hour === 20 && minutes <= 1 && sentBroadcasts.evening !== today) {
    sentBroadcasts.evening = today;
    const r = (dayIndex * 11 + 5) % DUAS.length;
    const dua = DUAS[r];
    const azkarReminders = [
      "Не забудь вечерние азкары перед сном!",
      "Прочитай аят аль-Курси перед сном — ангел будет охранять тебя до утра",
      "Скажи 33 раза СубханАллах, 33 раза Альхамдулиллях, 34 раза Аллаху Акбар",
      "Прочитай последние 3 суры Корана и подуй на ладони",
      "Сделай истигфар перед сном — попроси прощения у Аллаха за этот день",
    ];
    const azkar = azkarReminders[dayIndex % azkarReminders.length];

    const message =
      `\u{1F319} *Вечернее напоминание*\n\n` +
      `\u{1F64F} *Дуа:*\n${dua.text}\n_${dua.source}_\n\n` +
      `\u{1F4A1} _${azkar}_\n\n` +
      `_Спокойной ночи! Да простит Аллах наши грехи_ \u{1F54C}`;

    const eveningButtons = {
      inline_keyboard: [
        [wa("\u{1F4FF} Вечерние азкары", "/dhikr"), wa("\u{1F64F} Дуа перед сном", "/dua")],
        [wa("\u{1F4D6} Аят аль-Курси (2:255)", "/quran"), wa("\u{1F54C} IMAN", "")],
      ],
    };
    const sent = await broadcastToAll(message, eveningButtons);
    console.log(`Evening broadcast sent to ${sent} subscribers`);
  }

  // День недели по Бишкеку (0=вс, 5=пт, 6=сб)
  const bishkekDate = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const weekday = bishkekDate.getUTCDay();

  // ── Пятничный пинг — 9:00 (про Аль-Кахф и джуму) ──────────────────────
  if (
    weekday === 5 &&
    hour === 9 &&
    minutes <= 1 &&
    sentBroadcasts.jumua !== today
  ) {
    sentBroadcasts.jumua = today;
    const jumuaMessages = [
      `\u{1F54C} *Пятница муборак!*\n\n` +
        `Сегодня — лучший день недели. День, в который был сотворён Адам ✌, день, когда настанет Час.\n\n` +
        `\u{1F4D6} *Сунна пятницы:*\n` +
        `\u{1F539} Прочитай суру *Аль-Кахф* (18) — она будет светом между двумя пятницами (Бухари, Муслим)\n` +
        `\u{1F539} Сделай как можно больше салаватов на Пророка ﷺ\n` +
        `\u{1F539} Не пропусти джума-намаз — это обязанность мужчин\n` +
        `\u{1F539} Есть час, когда дуа точно принимается — ищи между сидением имама и саляма\n\n` +
        `_«Лучший день, в который восходит солнце — пятница» (Муслим 854)_`,
      `\u{1F54C} *Джума муборак!*\n\n` +
        `Сегодня Аллах слушает дуа Своих рабов особо. Не упусти этот день.\n\n` +
        `\u{1F4D6} *Прочитай:*\n` +
        `\u{1F539} Сура Аль-Кахф (18) — защита от смут\n` +
        `\u{1F539} Аят аль-Курси после фарда\n` +
        `\u{1F539} Салават на Пророка ﷺ — 100 раз\n` +
        `\u{1F539} Истигфар — 100 раз\n\n` +
        `_«О те, которые уверовали! Когда призывают на джума-намаз — спешите к поминанию Аллаха» (Коран 62:9)_`,
    ];
    const msg = jumuaMessages[dayIndex % jumuaMessages.length];
    const jumuaButtons = {
      inline_keyboard: [
        [wa("\u{1F4D6} Сура Аль-Кахф (18)", "/memorize?surah=18")],
        [wa("\u{1F3AC} Структура намаза", "/prayer-flow"), wa("\u{1F54C} Гид по намазу", "/namaz-guide")],
        [wa("\u{1F4C5} Праздники ислама", "/holidays")],
        [wa("\u{1F54C} Открыть IMAN", "")],
      ],
    };
    const sent = await broadcastToAll(msg, jumuaButtons);
    console.log(`Jumua broadcast sent to ${sent} subscribers`);
  }

  // ── Перед сном — 22:30 (защитные суры) ────────────────────────────────
  if (hour === 22 && minutes >= 28 && minutes <= 31 && sentBroadcasts.night !== today) {
    sentBroadcasts.night = today;
    const nightTips = [
      `\u{1F319} *Перед сном*\n\n` +
        `Прочитай 3 защитные суры и подуй на ладони, потом проведи ими по телу:\n\n` +
        `\u{1F539} *Аль-Ихлас* (112) — равна 1/3 Корана\n` +
        `\u{1F539} *Аль-Фалак* (113) — защита от зла творений\n` +
        `\u{1F539} *Ан-Нас* (114) — защита от наущений шайтана\n\n` +
        `Пророк ﷺ делал это каждую ночь (Бухари 5017).\n\n` +
        `_«Если человек ложится спать в чистоте и поминает Аллаха — ангел проводит с ним ночь, и каждый раз когда он переворачивается, тот говорит: О Аллах, прости его»_ (Ибн Хиббан)`,
      `\u{1F319} *Время сна*\n\n` +
        `\u{1F4D6} Прочитай *Аят аль-Курси* (Аль-Бакара 255) перед сном — Аллах назначит к тебе охранника, и шайтан не приблизится до утра (Бухари 2311).\n\n` +
        `\u{1F64F} Дуа перед сном:\n` +
        `_«Бисмика-Ллахумма амуту ва ахья»_\n` +
        `(С именем Твоим, о Аллах, я умираю и оживаю)`,
      `\u{1F319} *Не забудь перед сном*\n\n` +
        `\u{1F539} Истигфар — попроси прощения за этот день\n` +
        `\u{1F539} Простить всех, кто обидел\n` +
        `\u{1F539} 33 раза Альхамдулиллях, 33 раза СубханАллах, 34 раза Аллаху Акбар\n` +
        `\u{1F539} Возьми вуду — даже если уснёшь, ангел будет молиться о тебе\n\n` +
        `_«О Аллах, я предал душу мою Тебе...» (полная дуа в приложении)_`,
    ];
    const msg = nightTips[dayIndex % nightTips.length];
    const nightButtons = {
      inline_keyboard: [
        [
          wa("\u{1F6E1} Ихлас", "/memorize?surah=112"),
          wa("\u{1F6E1} Фалак", "/memorize?surah=113"),
          wa("\u{1F6E1} Нас", "/memorize?surah=114"),
        ],
        [wa("\u{1F4FF} Истигфар ×100", "/zikr"), wa("\u{1F319} Дуа сна", "/dua")],
      ],
    };
    const sent = await broadcastToAll(msg, nightButtons);
    console.log(`Night broadcast sent to ${sent} subscribers`);
  }

  // ── Воскресенье 19:00 — мотивация на новую неделю ─────────────────────
  if (
    weekday === 0 &&
    hour === 19 &&
    minutes <= 1 &&
    sentBroadcasts.motivation !== today
  ) {
    sentBroadcasts.motivation = today;
    const motivations = [
      `\u{1F4AA} *Новая неделя — новая возможность*\n\n` +
        `Брат/сестра, представь: ещё одна неделя жизни прошла. Что осталось от неё в твоём свитке деяний?\n\n` +
        `Эту неделю давай попробуем:\n` +
        `\u{1F539} Не пропустить ни одного намаза\n` +
        `\u{1F539} Читать минимум *1 страницу Корана* каждый день\n` +
        `\u{1F539} Запомнить *1 новый аят*\n` +
        `\u{1F539} Сделать *1 садака* — даже улыбка считается\n\n` +
        `_«Самое любимое дело для Аллаха — то, которое совершается постоянно, даже если оно малое»_ (Бухари 6464)`,
      `\u{1F31F} *Начни эту неделю с Аллахом*\n\n` +
        `\u{1F4D6} *Цель на неделю:*\n` +
        `\u{1F539} 5 намазов вовремя × 7 дней = *35 побед*\n` +
        `\u{1F539} 7 страниц Корана = *1 джуз*\n` +
        `\u{1F539} 100 истигфаров каждый день = *700 прощений*\n` +
        `\u{1F539} 1 хадис в день = *7 новых знаний*\n\n` +
        `_«И Я создал джиннов и людей лишь для того, чтобы они поклонялись Мне»_ (Коран 51:56)`,
      `\u{1F680} *Воскресенье — пора подумать о неделе*\n\n` +
        `За эту неделю Аллах подарил тебе 168 часов. Сколько из них ты отдал Ему?\n\n` +
        `Если меньше часа — это меньше 1%. Давай попробуем 5% — это всего 8 часов в неделю на:\n` +
        `\u{1F539} Намазы\n` +
        `\u{1F539} Чтение Корана\n` +
        `\u{1F539} Зикры\n` +
        `\u{1F539} Изучение религии\n\n` +
        `Открой IMAN — там всё есть для этих 8 часов \u{1F54C}`,
    ];
    const msg = motivations[dayIndex % motivations.length];
    const motivationButtons = {
      inline_keyboard: [
        [wa("\u{1F4CA} Моя статистика", "/stats"), wa("\u{1F3C6} Топ", "/leaderboard")],
        [wa("\u{1F4D6} Читать Коран", "/quran"), wa("\u{1F3AF} Цели/привычки", "/habits")],
        [wa("\u{1F4DA} Заучивание", "/memorize"), wa("\u{1F54C} IMAN", "")],
      ],
    };
    const sent = await broadcastToAll(msg, motivationButtons);
    console.log(`Motivation broadcast sent to ${sent} subscribers`);
  }
}

setInterval(sendScheduledBroadcasts, 60 * 1000);

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

// Отправка аудио по прямой ссылке (Telegram сам скачивает файл по URL —
// нам не нужно проксировать/хранить его самим).
async function sendAudio(chatId, audioUrl, title, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    audio: audioUrl,
    title: title?.slice(0, 64) || "Аудио",
    performer: "IMAN — islamhouse.com",
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendAudio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) console.error("sendAudio failed:", data.description);
    return data.ok;
  } catch (e) {
    console.error("sendAudio error:", e);
    return false;
  }
}

async function handleWebhook(body) {
  const msg = body.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = sanitizeText(msg.text);
  const name = sanitizeName(msg.from?.first_name);

  // Auto-subscribe: any message from user = they are a subscriber
  if (!subscribers.has(chatId)) {
    await addSubscriber(chatId);
  }

  const appButton = {
    inline_keyboard: [
      [{ text: "\u{1F55C} Открыть IMAN", web_app: { url: APP_URL } }],
      [{ text: "\u{1F4E2} Наш канал", url: CHANNEL_LINK }],
    ],
  };

  if (text === "/start") {
    await sendMessage(
      chatId,
      `Ас-саляму алейкум, ${name}! \u2728\n\n` +
        `Добро пожаловать в *IMAN* — ваш помощник на пути к Аллаху.\n\n` +
        `Мы каждый день тратим часы на дунью — соцсети, видео, игры... ` +
        `Но сколько минут мы уделяем своей религии?\n\n` +
        `\u{1F4A1} *Наша цель:* уделяй хотя бы *5-10 минут в день* изучению дина. ` +
        `Читай Коран, изучай хадисы, делай зикр, проверяй знания в квизе. ` +
        `Каждая минута, проведённая ради Аллаха — это инвестиция в Ахират.\n\n` +
        `Мы будем присылать вам напоминания о намазах, хадисы и аяты прямо в Телеграм. ` +
        `А пока — пользуйтесь нашим мини-приложением!\n\n` +
        `\u{1F54C} Намазы (ханафитский масхаб)\n` +
        `\u{1F4D6} Коран с тафсиром (источник: Аль-Мунтахаб)\n` +
        `\u{1F4DC} 40 хадисов Ан-Навави\n` +
        `\u{1F64F} Дуа на каждый день\n` +
        `\u{1F4FF} Зикр — счётчик поминаний\n` +
        `\u{1F9E0} Квиз — 300+ вопросов\n\n` +
        `\u{1F514} *Вы подписаны на напоминания:*\n` +
        `   • Каждое утро 7:00 — аят, хадис, дуа дня\n` +
        `   • День 13:00 — короткий хадис\n` +
        `   • Вечер 20:00 — азкары перед сном\n` +
        `   • Перед сном 22:30 — защитные суры\n` +
        `   • Пятница 9:00 — про Аль-Кахф и джуму\n` +
        `   • Воскресенье 19:00 — мотивация на неделю\n` +
        `\u{1F514} Плюс: уведомление точно ко времени каждого намаза (Бишкек).\n` +
        `\u{1F4E2} Подписывайтесь на наш канал: ${CHANNEL_LINK}\n\n` +
        `Команды:\n` +
        `/namaz — Время намаза (ханафитский масхаб)\n` +
        `/hadith — Случайный хадис (пул ~16 300, все степени)\n` +
        `/ayat — Случайный аят (весь Коран, 6236 аятов)\n` +
        `/dua — Случайное дуа\n` +
        `/audio — Случайное аудио (Коран, лекции — реальные голоса)\n` +
        `/zikr — Зикр после намаза\n` +
        `/remind — Подписка на напоминания\n` +
        `/stop — Отписка\n` +
        `/help — Помощь\n\n` +
        `_«Самое любимое дело для Аллаха — то, которое совершается постоянно, даже если оно малое» (Аль-Бухари, Муслим)_`,
      appButton,
    );
  } else if (text === "/namaz" || text === "/prayer" || text === "/times") {
    const times = await fetchPrayerTimes();
    await sendMessage(chatId, formatPrayerTimesMessage(times));
  } else if (text === "/hadith") {
    // Большой локальный пул (~16 300), с фолбэком на короткий офлайн-список
    const h =
      getRandomHadithFromPool() ||
      HADITHS[Math.floor(Math.random() * HADITHS.length)];
    await sendMessage(chatId, formatHadithMessage(h));
  } else if (text === "/ayat") {
    // Живой случайный аят из ВСЕГО Корана (6236), фолбэк — короткий список
    const a =
      (await getRandomAyahLive()) ||
      AYATS[Math.floor(Math.random() * AYATS.length)];
    await sendMessage(
      chatId,
      `\u{1F4D6} *Аят Корана:*\n\n${a.text}\n\n_${a.surah}_`,
    );
  } else if (text === "/dua") {
    const d =
      getRandomDuaFromPool() || DUAS[Math.floor(Math.random() * DUAS.length)];
    await sendMessage(
      chatId,
      `\u{1F64F} *Дуа:*\n\n${d.text}\n\n_Источник: ${d.source}_`,
    );
  } else if (text === "/audio") {
    const track = getRandomAudioTrack();
    if (track) {
      await sendAudio(chatId, track.url, track.title, appButton);
    } else {
      await sendMessage(chatId, "Аудио-библиотека временно недоступна. Попробуйте позже.");
    }
  } else if (text === "/zikr") {
    await sendMessage(
      chatId,
      `\u{1F4FF} *Зикр — поминание Аллаха*\n\n` +
        `Читай после каждого намаза или в любое свободное время:\n\n` +
        `\u{1F539} *Субхана-Ллах* (سُبْحَانَ اللّٰهِ) — 33 раза\n` +
        `_Пречист Аллах от всех недостатков_\n\n` +
        `\u{1F539} *Альхамдули-Ллях* (الْحَمْدُ لِلّٰهِ) — 33 раза\n` +
        `_Хвала Аллаху_\n\n` +
        `\u{1F539} *Аллаху Акбар* (اللّٰهُ أَكْبَرُ) — 33 раза\n` +
        `_Аллах Велик_\n\n` +
        `\u{1F539} *Ля иляха илля-Ллах* (لَا إِلٰهَ إِلَّا اللّٰهُ) — 1 раз\n` +
        `_Нет божества, кроме Аллаха_\n\n` +
        `\u{1F4D6} Пророк ﷺ сказал: _«Кто скажет после каждого намаза «Субхана-Ллах» 33 раза, «Альхамдули-Ллях» 33 раза и «Аллаху Акбар» 33 раза — итого 99 раз, а в сотый скажет «Ля иляха илля-Ллах», тому простятся грехи, даже если их будет столько, сколько пены морской»_ (Муслим)\n\n` +
        `\u{1F449} Открой приложение для счётчика зикра!`,
      appButton,
    );
  } else if (text === "/remind") {
    await addSubscriber(chatId);
    await sendMessage(
      chatId,
      `\u{1F514} Вы подписаны на ежедневные напоминания!\n\nКаждый день в 7:00 (Бишкек) вы будете получать хадис, аят, дуа и время намаза.\n\nДля отписки: /stop`,
    );
  } else if (text === "/stop") {
    await removeSubscriber(chatId);
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
        `/hadith — Случайный хадис (пул ~16 300)\n` +
        `/ayat — Случайный аят (весь Коран)\n` +
        `/dua — Случайное дуа\n` +
        `/audio — Случайное аудио (реальные голоса)\n` +
        `/zikr — Зикр после намаза\n` +
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

  // ── Rate limiting (API only, skip static files) ──────────────────────
  const isApiOrWebhook = req.url?.startsWith("/api/") || req.url === WEBHOOK_PATH || req.url === "/health";
  if (isApiOrWebhook && isRateLimited(clientIP)) {
    res.writeHead(429, {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "Retry-After": "60",
    });
    res.end('{"error":"Too many requests"}');
    return;
  }

  // ── Global CORS preflight for API routes ─────────────────────────────
  if (req.method === "OPTIONS" && req.url?.startsWith("/api/")) {
    res.writeHead(204, {
      ...SECURITY_HEADERS,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, X-Telegram-Id, X-Telegram-Username, X-Dashboard-Token",
      "Access-Control-Max-Age": "86400",
    });
    res.end();
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
    (async () => {
      try {
        const usersCount = await pool.query(
          "SELECT COUNT(*) as count FROM iman_users",
        );
        const subsCount = await pool.query(
          "SELECT COUNT(*) as count FROM iman_subscribers",
        );
        res.writeHead(200, {
          ...SECURITY_HEADERS,
          "Content-Type": "application/json",
        });
        res.end(
          JSON.stringify({
            status: "ok",
            subscribers: parseInt(subsCount.rows[0].count),
            users: parseInt(usersCount.rows[0].count),
            uptime: Math.floor(process.uptime()),
          }),
        );
      } catch (e) {
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
      }
    })();
    return;
  }

  // ── Database status endpoint ──────────────────────────────────────────
  if (req.url === "/api/db-status" && req.method === "GET") {
    (async () => {
      try {
        const dbCheck = await pool.query(
          "SELECT NOW(), pg_database_size(current_database()) as size",
        );
        const usersCount = await pool.query(
          "SELECT COUNT(*) as count FROM iman_users",
        );
        const analyticsCount = await pool.query(
          "SELECT COUNT(*) as count FROM iman_analytics",
        );

        res.writeHead(200, {
          ...SECURITY_HEADERS,
          "Content-Type": "application/json",
        });
        res.end(
          JSON.stringify({
            status: "connected",
            database: "PostgreSQL",
            timestamp: dbCheck.rows[0].now,
            size_bytes: parseInt(dbCheck.rows[0].size),
            tables: {
              users: parseInt(usersCount.rows[0].count),
              analytics: parseInt(analyticsCount.rows[0].count),
            },
          }),
        );
      } catch (err) {
        res.writeHead(500, {
          ...SECURITY_HEADERS,
          "Content-Type": "application/json",
        });
        res.end(
          JSON.stringify({
            status: "error",
            database: "unknown",
            error: err.message,
          }),
        );
      }
    })();
    return;
  }

  // ── Set Credentials API — придумать логин+пароль ВНУТРИ Telegram ───────
  // Вызывается только из настоящего Telegram Mini App: identity проверяется
  // подписью initData, поэтому подделать чужой telegram_id нельзя.
  if (req.url === "/api/set-credentials" && req.method === "POST") {
    const corsHeaders = {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    const ip = req.socket.remoteAddress || "unknown";
    if (isLoginRateLimited(ip)) {
      res.writeHead(429, corsHeaders);
      res.end(JSON.stringify({ error: "too_many_attempts" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const { initData, username, password } = JSON.parse(body || "{}");

        const tgUser = validateTelegramInitData(initData || "");
        if (!tgUser?.id) {
          res.writeHead(401, corsHeaders);
          res.end(JSON.stringify({ error: "invalid_telegram_data" }));
          return;
        }

        const cleanUsername = String(username || "").trim().toLowerCase();
        if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
          res.writeHead(400, corsHeaders);
          res.end(
            JSON.stringify({
              error: "bad_username",
              message: "Логин: 3-20 символов, латиница/цифры/подчёркивание",
            }),
          );
          return;
        }
        if (!password || String(password).length < 6) {
          res.writeHead(400, corsHeaders);
          res.end(
            JSON.stringify({
              error: "bad_password",
              message: "Пароль минимум 6 символов",
            }),
          );
          return;
        }

        // Логин занят кем-то ДРУГИМ?
        const existing = await pool.query(
          "SELECT telegram_id FROM iman_credentials WHERE LOWER(username) = $1",
          [cleanUsername],
        );
        if (existing.rows.length && existing.rows[0].telegram_id !== tgUser.id) {
          res.writeHead(409, corsHeaders);
          res.end(JSON.stringify({ error: "username_taken" }));
          return;
        }

        const { salt, hash } = hashPassword(String(password));
        const now = Date.now();
        await pool.query(
          `INSERT INTO iman_credentials (telegram_id, username, password_hash, password_salt, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5)
           ON CONFLICT (telegram_id) DO UPDATE
             SET username = $2, password_hash = $3, password_salt = $4, updated_at = $5`,
          [tgUser.id, cleanUsername, hash, salt, now],
        );

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ ok: true, username: cleanUsername }));
        console.log(`✅ Credentials set for telegramId ${tgUser.id} (${cleanUsername})`);
        await auditLog(tgUser.id, "credentials_set", "user", String(tgUser.id), {});
      } catch (err) {
        console.error("set-credentials error:", err);
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: "bad_request" }));
      }
    });
    return;
  }

  // ── Browser Login API — вход логином+паролем вне Telegram ──────────────
  if (req.url === "/api/browser-login" && req.method === "POST") {
    const corsHeaders = {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    const ip = req.socket.remoteAddress || "unknown";
    if (isLoginRateLimited(ip)) {
      res.writeHead(429, corsHeaders);
      res.end(JSON.stringify({ error: "too_many_attempts" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const { login, password } = JSON.parse(body || "{}");
        const cleanUsername = String(login || "").trim().toLowerCase();

        const result = await pool.query(
          "SELECT telegram_id, password_hash, password_salt FROM iman_credentials WHERE LOWER(username) = $1",
          [cleanUsername],
        );
        const row = result.rows[0];
        // Одинаковое сообщение и на "нет логина", и на "неверный пароль" —
        // не давать перебору подсказку, какие логины вообще существуют.
        if (!row || !verifyPassword(String(password || ""), row.password_salt, row.password_hash)) {
          res.writeHead(401, corsHeaders);
          res.end(JSON.stringify({ error: "invalid_credentials" }));
          return;
        }

        const telegramId = row.telegram_id;
        const expiresAt = Date.now() + 90 * 24 * 60 * 60 * 1000; // 90 дней
        const token = signBrowserSession(telegramId, expiresAt);

        let firstName = "Друг";
        try {
          const userRow = await stmtGetUser.get(telegramId);
          const data =
            userRow && (typeof userRow.data === "string" ? JSON.parse(userRow.data) : userRow.data);
          if (data?.iman_profile?.name) {
            firstName = String(data.iman_profile.name).split(" ")[0];
          }
        } catch {
          /* профиля ещё нет — оставляем дефолтное имя */
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ token, telegramId, firstName, expiresAt }));
        console.log(`✅ Browser login OK for telegramId ${telegramId}`);
      } catch (err) {
        console.error("browser-login error:", err);
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: "bad_request" }));
      }
    });
    return;
  }

  // ── Subscription Check API — Check if user subscribed to channel ──────
  if (req.url?.startsWith("/api/check-subscription") && req.method === "GET") {
    const corsHeaders = {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const telegramId = url.searchParams.get("telegram_id");
    const channelUsername = url.searchParams.get("channel") || "atavaliev";

    if (!telegramId) {
      res.writeHead(400, corsHeaders);
      res.end(JSON.stringify({ error: "telegram_id required" }));
      return;
    }

    (async () => {
      try {
        // Check subscription via Telegram Bot API
        const checkUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=@${channelUsername}&user_id=${telegramId}`;
        const response = await fetch(checkUrl);
        const data = await response.json();

        if (!data.ok) {
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({ subscribed: false, reason: "not_found" }));
          return;
        }

        const status = data.result.status;
        const isSubscribed = ["creator", "administrator", "member"].includes(
          status,
        );

        res.writeHead(200, corsHeaders);
        res.end(
          JSON.stringify({
            subscribed: isSubscribed,
            status: status,
            channel: `@${channelUsername}`,
          }),
        );
      } catch (err) {
        console.error("Subscription check error:", err);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: "check_failed" }));
      }
    })();
    return;
  }

  // ── User Data API — Save/Load user data ──────────────────────────────
  // GET /api/user/:telegramId - Load user data
  if (req.url?.match(/^\/api\/user\/(\d+)$/) && req.method === "GET") {
    const telegramId = parseInt(RegExp.$1, 10);
    const corsHeaders = {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    };

    (async () => {
      try {
        const row = await stmtGetUser.get(telegramId);
        if (!row) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: "not_found" }));
          return;
        }
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(row));
      } catch (err) {
        console.error("User load error:", err);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: "internal_error" }));
      }
    })();
    return;
  }

  // POST /api/user/:telegramId - Save user data
  if (req.url?.match(/^\/api\/user\/(\d+)$/) && req.method === "POST") {
    const telegramId = parseInt(RegExp.$1, 10);
    const corsHeaders = {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    };

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const { data } = JSON.parse(body);
        const dataStr = typeof data === "string" ? data : JSON.stringify(data);
        const updatedAt = Date.now();

        await stmtUpsertUser.run(telegramId, dataStr, updatedAt);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ ok: true, updated_at: updatedAt }));
        console.log(
          `✅ User ${telegramId} data saved (${dataStr.length} bytes)`,
        );
        await auditLog(telegramId, "user_data_save", "user", String(telegramId), { bytes: dataStr.length });
      } catch (err) {
        console.error("User save error:", err);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: "save_failed" }));
      }
    });
    return;
  }

  // ── Admin API — Get all users ─────────────────────────────────────────
  if (req.url === "/api/admin/users" && req.method === "GET") {
    const corsHeaders = {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, X-Telegram-Id, X-Telegram-Username, X-Dashboard-Token",
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    // Admin authorization check
    const telegramId = req.headers["x-telegram-id"]
      ? parseInt(req.headers["x-telegram-id"], 10)
      : null;
    const telegramUsername = req.headers["x-telegram-username"] || null;

    if (!isAdmin(telegramId, telegramUsername) && !dashboardTokenOk(req)) {
      res.writeHead(403, corsHeaders);
      res.end('{"error":"forbidden","message":"Admin access required"}');
      return;
    }

    (async () => {
      try {
        const result = await pool.query(
          "SELECT telegram_id, data, updated_at FROM iman_users ORDER BY updated_at DESC",
        );
        const rows = result.rows.map((row) => ({
          telegram_id: row.telegram_id,
          data:
            typeof row.data === "string" ? row.data : JSON.stringify(row.data),
          updated_at: row.updated_at,
        }));

        const countResult = await pool.query("SELECT COUNT(*) as count FROM iman_users");
        const subsResult = await pool.query("SELECT COUNT(*) as count FROM iman_subscribers").catch(() => ({ rows: [{ count: 0 }] }));
        const totalUsers = parseInt(countResult.rows[0].count);
        const totalSubscribers = parseInt(subsResult.rows[0].count);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ users: rows, totalUsers, totalSubscribers }));
      } catch (e) {
        console.error("Admin API error:", e);
        res.writeHead(500, corsHeaders);
        res.end('{"error":"internal_error"}');
      }
    })();
    return;
  }

  // ── Analytics API — Track events ──────────────────────────────────────
  if (req.url === "/api/analytics" && req.method === "POST") {
    const corsHeaders = {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    let body = "";
    let bodySize = 0;
    const MAX = 1024 * 1024; // 1MB for analytics batch

    req.on("data", (chunk) => {
      bodySize += chunk.length;
      if (bodySize > MAX) {
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on("end", async () => {
      if (bodySize > MAX) {
        res.writeHead(413, corsHeaders);
        res.end('{"error":"too_large"}');
        return;
      }

      try {
        const { telegramId, events } = JSON.parse(body);

        if (!telegramId || !Array.isArray(events)) {
          res.writeHead(400, corsHeaders);
          res.end('{"error":"invalid_payload"}');
          return;
        }

        // Insert all events
        for (const evt of events) {
          await stmtInsertAnalytics.run(
            telegramId,
            evt.type || "unknown",
            evt.page || null,
            evt.action || null,
            evt.metadata ? JSON.stringify(evt.metadata) : null,
            evt.timestamp || Date.now(),
          );
        }

        res.writeHead(200, corsHeaders);
        res.end('{"ok":true}');
      } catch (e) {
        console.error("Analytics error:", e);
        res.writeHead(500, corsHeaders);
        res.end('{"error":"internal_error"}');
      }
    });
    return;
  }

  // ── Leaderboard API — Public endpoint ─────────────────────────────────
  if (req.url === "/api/leaderboard" && req.method === "GET") {
    const corsHeaders = {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    (async () => {
      try {
        // Получаем всех пользователей с баллами
        const result = await pool.query(
          `SELECT
            telegram_id,
            data
           FROM iman_users
           WHERE data IS NOT NULL
           ORDER BY COALESCE((data->'iman_profile'->>'totalPoints')::int, (data->>'totalPoints')::int, 0) DESC
           LIMIT 100`,
        );

        const users = result.rows.map((row, index) => {
          const userData =
            typeof row.data === "string" ? JSON.parse(row.data) : row.data;
          const profile = userData.iman_profile || userData;
          return {
            telegram_id: row.telegram_id,
            name: profile.name || "Пользователь",
            totalPoints: profile.totalPoints || 0,
            level: profile.level || "Новичок",
            streak: profile.streak || 0,
            rank: index + 1,
          };
        });

        // Real user count + subscribers count
        const countResult = await pool.query(
          "SELECT COUNT(*) as count FROM iman_users",
        );
        const subsResult = await pool.query(
          "SELECT COUNT(*) as count FROM iman_subscribers",
        );
        const totalUsers = parseInt(countResult.rows[0].count);
        const totalSubscribers = parseInt(subsResult.rows[0].count);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ users, totalUsers, totalSubscribers }));
      } catch (e) {
        console.error("Leaderboard error:", e);
        res.writeHead(500, corsHeaders);
        res.end('{"error":"internal_error"}');
      }
    })();
    return;
  }

  // ── Dua Wall API — Anonymous prayer requests ───────────────────────────
  // GET /api/dua-wall — Get all prayer requests (newest first)
  if (req.url === "/api/dua-wall" && req.method === "GET") {
    const corsHeaders = {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    };

    (async () => {
      try {
        const result = await pool.query(
          "SELECT id, text, category, pray_count, created_at FROM dua_wall ORDER BY created_at DESC LIMIT 100",
        );
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(result.rows));
      } catch (e) {
        console.error("Dua wall GET error:", e);
        res.writeHead(500, corsHeaders);
        res.end('{"error":"internal_error"}');
      }
    })();
    return;
  }

  // POST /api/dua-wall — Create new prayer request
  if (req.url === "/api/dua-wall" && req.method === "POST") {
    const corsHeaders = {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    let body = "";
    let bodySize = 0;
    const MAX = 4096;

    req.on("data", (chunk) => {
      bodySize += chunk.length;
      if (bodySize > MAX) {
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on("end", async () => {
      if (bodySize > MAX) {
        res.writeHead(413, corsHeaders);
        res.end('{"error":"too_large"}');
        return;
      }

      try {
        const { text, category, telegramId } = JSON.parse(body);

        if (!text || typeof text !== "string" || text.trim().length < 3 || text.trim().length > 500) {
          res.writeHead(400, corsHeaders);
          res.end('{"error":"Text must be between 3 and 500 characters"}');
          return;
        }

        const result = await pool.query(
          "INSERT INTO dua_wall (text, category, telegram_id) VALUES ($1, $2, $3) RETURNING id, text, category, pray_count, created_at",
          [text.trim(), category || "general", telegramId || null],
        );

        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify(result.rows[0]));
      } catch (e) {
        console.error("Dua wall POST error:", e);
        res.writeHead(500, corsHeaders);
        res.end('{"error":"internal_error"}');
      }
    });
    return;
  }

  // POST /api/dua-wall/:id/pray — Increment pray count
  if (req.url?.match(/^\/api\/dua-wall\/(\d+)\/pray$/) && req.method === "POST") {
    const id = parseInt(RegExp.$1, 10);
    const corsHeaders = {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    (async () => {
      try {
        const result = await pool.query(
          "UPDATE dua_wall SET pray_count = pray_count + 1 WHERE id = $1 RETURNING pray_count",
          [id],
        );

        if (result.rowCount === 0) {
          res.writeHead(404, corsHeaders);
          res.end('{"error":"not_found"}');
          return;
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ ok: true, pray_count: result.rows[0].pray_count }));
      } catch (e) {
        console.error("Dua wall pray error:", e);
        res.writeHead(500, corsHeaders);
        res.end('{"error":"internal_error"}');
      }
    })();
    return;
  }


  // ── Admin Analytics API — Get aggregated stats ────────────────────────
  if (req.url === "/api/admin/analytics" && req.method === "GET") {
    const corsHeaders = {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, X-Telegram-Id, X-Telegram-Username, X-Dashboard-Token",
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    // Admin authorization check
    const telegramId = req.headers["x-telegram-id"]
      ? parseInt(req.headers["x-telegram-id"], 10)
      : null;
    const telegramUsername = req.headers["x-telegram-username"] || null;

    if (!isAdmin(telegramId, telegramUsername) && !dashboardTokenOk(req)) {
      res.writeHead(403, corsHeaders);
      res.end('{"error":"forbidden","message":"Admin access required"}');
      return;
    }

    (async () => {
      try {
        const now = Date.now();
        const FIVE_MIN = 5 * 60 * 1000;
        const ONE_DAY = 24 * 60 * 60 * 1000;
        const TZ = "Asia/Bishkek"; // UTC+6, без перехода на летнее время

        // ── Границы периодов по бишкекскому времени ──
        // Начало сегодняшнего дня (00:00 в Бишкеке) в формате epoch-ms (UTC)
        const BISHKEK_OFFSET = 6 * 60 * 60 * 1000;
        const daysSinceEpoch = Math.floor((now + BISHKEK_OFFSET) / ONE_DAY);
        const startOfToday = daysSinceEpoch * ONE_DAY - BISHKEK_OFFSET;
        const startOfWeek = startOfToday - 6 * ONE_DAY; // сегодня + 6 предыдущих = 7 дней
        const startOfMonth = startOfToday - 29 * ONE_DAY; // 30 дней
        const chartFrom = startOfToday - 13 * ONE_DAY; // график за 14 дней

        // Хелпер: уникальные посетители с заданного момента
        const countVisitorsSince = async (since) => {
          const r = await pool.query(
            `SELECT COUNT(DISTINCT telegram_id) as count
             FROM iman_analytics WHERE timestamp >= $1`,
            [since],
          );
          return parseInt(r.rows[0].count);
        };

        // Online users (active in last 5 min)
        const online = await countVisitorsSince(now - FIVE_MIN);

        // ── Уникальные посетители: сегодня / неделя / месяц (Бишкек) ──
        const visitorsToday = await countVisitorsSince(startOfToday);
        const visitorsWeek = await countVisitorsSince(startOfWeek);
        const visitorsMonth = await countVisitorsSince(startOfMonth);
        const activeToday = visitorsToday; // совместимость со старым полем

        // Top pages (last 7 days) — заходы + уникальные пользователи
        const topPagesResult = await pool.query(
          `SELECT page, COUNT(*) as count, COUNT(DISTINCT telegram_id) as users
           FROM iman_analytics
           WHERE type = 'page_view' AND page IS NOT NULL AND timestamp >= $1
           GROUP BY page
           ORDER BY count DESC
           LIMIT 10`,
          [startOfWeek],
        );
        const topPages = topPagesResult.rows;

        // Top actions (last 7 days)
        const topActionsResult = await pool.query(
          `SELECT action, COUNT(*) as count
           FROM iman_analytics
           WHERE type = 'action' AND action IS NOT NULL AND timestamp >= $1
           GROUP BY action
           ORDER BY count DESC
           LIMIT 10`,
          [startOfWeek],
        );
        const topActions = topActionsResult.rows;

        // Average session duration (last 7 days)
        const avgSessionResult = await pool.query(
          `SELECT AVG((metadata->>'duration')::INTEGER) as avg_duration
           FROM iman_analytics
           WHERE type = 'session_end' AND timestamp >= $1 AND metadata IS NOT NULL`,
          [startOfWeek],
        );
        const avgDuration = avgSessionResult.rows[0].avg_duration
          ? Math.round(avgSessionResult.rows[0].avg_duration / 1000)
          : 0; // convert to seconds

        // ── График: уникальные посетители по дням (14 дней, Бишкек) ──
        const dailyResult = await pool.query(
          `SELECT
            (to_timestamp(timestamp / 1000) AT TIME ZONE $2)::date AS day,
            COUNT(DISTINCT telegram_id) as users,
            COUNT(*) FILTER (WHERE type = 'page_view') as views
           FROM iman_analytics
           WHERE timestamp >= $1
           GROUP BY day ORDER BY day`,
          [chartFrom, TZ],
        );
        const dailyVisitors = dailyResult.rows.map((r) => ({
          date: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10),
          users: parseInt(r.users),
          views: parseInt(r.views),
        }));

        // ── Сегодня по часам (Бишкек) ──
        const timelineResult = await pool.query(
          `SELECT
            EXTRACT(HOUR FROM (to_timestamp(timestamp / 1000) AT TIME ZONE $2)) as hour,
            COUNT(DISTINCT telegram_id) as users
           FROM iman_analytics
           WHERE timestamp >= $1
           GROUP BY hour
           ORDER BY hour`,
          [startOfToday, TZ],
        );
        const timeline = timelineResult.rows;

        // Top 5 users by points (data is nested in iman_profile)
        const topUsersResult = await pool.query(
          `SELECT
            telegram_id,
            COALESCE(data->'iman_profile'->>'name', data->>'name') as name,
            COALESCE(data->'iman_profile'->>'telegramUsername', data->>'telegramUsername') as username,
            COALESCE((data->'iman_profile'->>'totalPoints')::int, (data->>'totalPoints')::int, 0) as points,
            COALESCE(data->'iman_profile'->>'level', data->>'level') as level
           FROM iman_users
           WHERE data->'iman_profile'->>'totalPoints' IS NOT NULL
              OR data->>'totalPoints' IS NOT NULL
           ORDER BY COALESCE((data->'iman_profile'->>'totalPoints')::int, (data->>'totalPoints')::int, 0) DESC
           LIMIT 5`,
        );
        const topUsers = topUsersResult.rows.map((row) => ({
          telegram_id: row.telegram_id,
          name: row.name || "Пользователь",
          username: row.username || null,
          points: row.points || 0,
          level: row.level || "Новичок",
        }));

        // ── Молитвы отмечены: сегодня / неделя / месяц (Бишкек) ──
        const countActionSince = async (action, since) => {
          const r = await pool.query(
            `SELECT COUNT(*) as count FROM iman_analytics
             WHERE action = $1 AND timestamp >= $2`,
            [action, since],
          );
          return parseInt(r.rows[0].count);
        };
        const prayersToday = await countActionSince("prayer_marked", startOfToday);
        const prayersWeek = await countActionSince("prayer_marked", startOfWeek);
        const prayersMonth = await countActionSince("prayer_marked", startOfMonth);

        // ── Вовлечённость: заходы (сессии) и просмотры по периодам ──
        const engResult = await pool.query(
          `SELECT
            COUNT(*) FILTER (WHERE type = 'session_start' AND timestamp >= $1) AS s_today,
            COUNT(*) FILTER (WHERE type = 'session_start' AND timestamp >= $2) AS s_week,
            COUNT(*) FILTER (WHERE type = 'session_start' AND timestamp >= $3) AS s_month,
            COUNT(*) FILTER (WHERE type = 'page_view'    AND timestamp >= $1) AS v_today,
            COUNT(*) FILTER (WHERE type = 'page_view'    AND timestamp >= $2) AS v_week,
            COUNT(*) FILTER (WHERE type = 'page_view'    AND timestamp >= $3) AS v_month
           FROM iman_analytics WHERE timestamp >= $3`,
          [startOfToday, startOfWeek, startOfMonth],
        );
        const eng = engResult.rows[0];
        const sessionsToday = parseInt(eng.s_today);
        const sessionsWeek = parseInt(eng.s_week);
        const sessionsMonth = parseInt(eng.s_month);
        const pageViewsToday = parseInt(eng.v_today);
        const pageViewsWeek = parseInt(eng.v_week);
        const pageViewsMonth = parseInt(eng.v_month);
        // Сколько раз в среднем человек заходит (сессий на 1 посетителя)
        const avgVisitsPerUserToday = visitorsToday > 0
          ? Math.round((sessionsToday / visitorsToday) * 10) / 10 : 0;
        const avgVisitsPerUserWeek = visitorsWeek > 0
          ? Math.round((sessionsWeek / visitorsWeek) * 10) / 10 : 0;

        // ── Детально по функциям (7 дней): заходов, людей, среднее время ──
        const featureResult = await pool.query(
          `SELECT page,
            COUNT(*) FILTER (WHERE type = 'page_view') AS views,
            COUNT(DISTINCT telegram_id) FILTER (WHERE type = 'page_view') AS users,
            AVG((metadata->>'duration')::BIGINT) FILTER (WHERE type = 'page_time') AS avg_ms
           FROM iman_analytics
           WHERE timestamp >= $1 AND page IS NOT NULL
           GROUP BY page
           ORDER BY views DESC
           LIMIT 20`,
          [startOfWeek],
        );
        const featureStats = featureResult.rows.map((r) => ({
          page: r.page,
          views: parseInt(r.views),
          users: parseInt(r.users),
          avgSeconds: r.avg_ms ? Math.round(r.avg_ms / 1000) : 0,
        }));

        // ── Новые пользователи по реальной дате регистрации (created_at) ──
        const countNewUsersSince = async (since) => {
          const r = await pool.query(
            `SELECT COUNT(*) as count FROM iman_users WHERE created_at >= $1`,
            [since],
          );
          return parseInt(r.rows[0].count);
        };
        const newUsersToday = await countNewUsersSince(startOfToday);
        const newUsersWeek = await countNewUsersSince(startOfWeek);
        const newUsersMonth = await countNewUsersSince(startOfMonth);

        // Quran reading stats (page views on /quran, последние 7 дней)
        const quranViewsResult = await pool.query(
          `SELECT COUNT(*) as count
           FROM iman_analytics
           WHERE page = '/quran' AND timestamp >= $1`,
          [startOfWeek],
        );
        const quranViews = parseInt(quranViewsResult.rows[0].count);

        const totalUsersResult = await pool.query("SELECT COUNT(*) as count FROM iman_users");
        const totalUsers = parseInt(totalUsersResult.rows[0].count);

        res.writeHead(200, corsHeaders);
        res.end(
          JSON.stringify({
            totalUsers,
            timezone: "Бишкек (UTC+6)",
            onlineNow: online,
            online,
            activeToday,
            // Уникальные посетители по бишкекскому времени
            visitors: {
              today: visitorsToday,
              week: visitorsWeek,
              month: visitorsMonth,
            },
            topPages,
            topActions,
            avgSessionDuration: avgDuration,
            timeline,
            dailyVisitors,
            featureStats,
            engagement: {
              sessions: { today: sessionsToday, week: sessionsWeek, month: sessionsMonth },
              pageViews: { today: pageViewsToday, week: pageViewsWeek, month: pageViewsMonth },
              avgVisitsPerUser: { today: avgVisitsPerUserToday, week: avgVisitsPerUserWeek },
            },
            topUsers,
            prayers: {
              today: prayersToday,
              week: prayersWeek,
              month: prayersMonth,
            },
            newUsers: {
              today: newUsersToday,
              week: newUsersWeek,
              month: newUsersMonth,
            },
            quranViews,
          }),
        );
      } catch (e) {
        console.error("Admin analytics error:", e);
        res.writeHead(500, corsHeaders);
        res.end('{"error":"internal_error"}');
      }
    })();
    return;
  }

  // ── User Data API ─────────────────────────────────────────────────────
  const userMatch = req.url?.match(/^\/api\/user\/(\d+)$/);
  if (userMatch) {
    const telegramId = parseInt(userMatch[1], 10);
    const corsHeaders = {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    if (req.method === "GET") {
      try {
        const row = await stmtGetUser.get(telegramId);
        if (!row) {
          res.writeHead(404, corsHeaders);
          res.end('{"error":"not_found"}');
        } else {
          res.writeHead(200, corsHeaders);
          res.end(
            JSON.stringify({
              data: JSON.parse(row.data),
              updated_at: row.updated_at,
            }),
          );
        }
      } catch (e) {
        console.error("User GET error:", e);
        res.writeHead(500, corsHeaders);
        res.end('{"error":"internal_error"}');
      }
      return;
    }

    if (req.method === "POST") {
      let body = "";
      let bodySize = 0;
      const MAX = 2 * 1024 * 1024; // 2MB

      req.on("data", (chunk) => {
        bodySize += chunk.length;
        if (bodySize > MAX) {
          req.destroy();
          return;
        }
        body += chunk;
      });

      req.on("end", async () => {
        if (bodySize > MAX) {
          res.writeHead(413, corsHeaders);
          res.end('{"error":"too_large"}');
          return;
        }
        try {
          const parsed = JSON.parse(body);
          if (!parsed.data || typeof parsed.data !== "object") {
            res.writeHead(400, corsHeaders);
            res.end('{"error":"invalid_data"}');
            return;
          }
          const now = Date.now();
          await stmtUpsertUser.run(
            telegramId,
            JSON.stringify(parsed.data),
            now,
          );
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({ ok: true, updated_at: now }));
        } catch (e) {
          res.writeHead(400, corsHeaders);
          res.end('{"error":"invalid_json"}');
        }
      });
      return;
    }

    res.writeHead(405, corsHeaders);
    res.end('{"error":"method_not_allowed"}');
    return;
  }

  // ── Отдельный дашборд статистики (доступ по секретной ссылке) ──────────
  if (req.method === "GET" && req.url && req.url.startsWith("/dashboard/")) {
    const t = req.url.slice("/dashboard/".length).split(/[?#]/)[0];
    if (DASHBOARD_TOKEN && t === DASHBOARD_TOKEN) {
      try {
        const html = readFileSync(join(__dirname, "admin-dashboard.html"), "utf8");
        res.writeHead(200, {
          ...SECURITY_HEADERS,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache",
        });
        res.end(html);
      } catch (e) {
        res.writeHead(500, { ...SECURITY_HEADERS, "Content-Type": "text/plain" });
        res.end("dashboard unavailable");
      }
    } else {
      res.writeHead(404, { ...SECURITY_HEADERS, "Content-Type": "text/plain" });
      res.end("Not found");
    }
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

  // Async file read — non-blocking event loop
  readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { ...SECURITY_HEADERS, "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, headers);
    res.end(data);
  });
});

// =========================================================================
// AUTOMATIC BACKUP SYSTEM — Full backup of all iman_* tables
// =========================================================================
const BACKUP_TABLES = [
  "iman_users", "iman_analytics", "iman_subscribers", "iman_prayer_logs",
  "iman_habit_logs", "iman_dhikr_sessions", "iman_quran_progress",
  "iman_quran_bookmarks", "iman_memorization", "iman_dua_reads",
  "iman_ramadan_tracker", "iman_quiz_results", "iman_achievements",
  "iman_streaks", "iman_favorite_hadiths", "iman_audit_log"
];

// Токен этого бота был захардкожен здесь и утёк через публичный GitHub-репо
// (боты сканируют GitHub на утечки Telegram-токенов) — учётку переименовали
// в спам. Теперь ТОЛЬКО из env; старый токен нужно отозвать через BotFather.
const MONITOR_BOT_TOKEN = process.env.MONITOR_BOT_TOKEN || "";
const MONITOR_CHAT_ID = process.env.MONITOR_CHAT_ID || "526330944";

/**
 * Send a file as Telegram document using multipart/form-data over https
 */
function sendTelegramDocument(token, chatId, fileName, fileBuffer, caption) {
  return new Promise((resolve, reject) => {
    const boundary = "----BackupBoundary" + Date.now().toString(16);
    const parts = [];

    // chat_id field
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}`);

    // caption field
    if (caption) {
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}`);
    }

    // document field (file)
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${fileName}"\r\nContent-Type: application/json\r\n\r\n`);

    const header = Buffer.from(parts.join("\r\n") + "\r\n", "utf-8");
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`, "utf-8");
    const body = Buffer.concat([header, fileBuffer, footer]);

    const options = {
      hostname: "api.telegram.org",
      path: `/bot${token}/sendDocument`,
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) {
            resolve(parsed);
          } else {
            reject(new Error(`Telegram API error: ${parsed.description}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Telegram response: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Create full JSON backup of all iman_* tables and send to Telegram
 */
async function createBackup() {
  try {
    console.log("🔄 Creating full backup of all iman_* tables...");
    const backup = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      app: "ImanApp",
      tables: {},
    };

    for (const table of BACKUP_TABLES) {
      try {
        const result = await pool.query(`SELECT * FROM ${table}`);
        backup.tables[table] = {
          count: result.rows.length,
          rows: result.rows,
        };
      } catch (e) {
        // Table may not exist yet — skip silently
        backup.tables[table] = { count: 0, rows: [], error: e.message };
      }
    }

    // Stats
    const userCount = backup.tables.iman_users?.count || 0;
    const subscriberCount = backup.tables.iman_subscribers?.count || 0;
    const totalTables = Object.keys(backup.tables).filter(
      (t) => backup.tables[t].count > 0
    ).length;

    console.log(`✅ Backup created: ${userCount} users, ${subscriberCount} subscribers, ${totalTables} tables with data`);

    // Store latest backup in memory
    global.LATEST_BACKUP = backup;

    // Send to Telegram as document
    if (!MONITOR_BOT_TOKEN) {
      console.warn("⚠️ MONITOR_BOT_TOKEN не задан — бэкап не отправлен в Telegram (только в памяти)");
    } else {
      try {
        const jsonStr = JSON.stringify(backup, null, 2);
        const fileBuffer = Buffer.from(jsonStr, "utf-8");
        const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const fileName = `iman-backup-${dateStr}.json`;
        const caption = `ImanApp Backup\n${new Date().toISOString()}\nUsers: ${userCount} | Subs: ${subscriberCount} | Tables: ${totalTables}`;

        await sendTelegramDocument(MONITOR_BOT_TOKEN, MONITOR_CHAT_ID, fileName, fileBuffer, caption);
        console.log("✅ Backup sent to Telegram monitor bot");
      } catch (tgErr) {
        console.error("⚠️ Failed to send backup to Telegram:", tgErr.message);
      }
    }

    // Audit log
    await auditLog(null, "backup_created", "system", null, {
      userCount,
      subscriberCount,
      totalTables,
    });
  } catch (error) {
    console.error("❌ Backup creation error:", error);
  }
}

/**
 * Sync data to backup Supabase database (BACKUP_DATABASE_URL)
 */
async function syncToBackupDb() {
  const backupUrl = process.env.BACKUP_DATABASE_URL;
  if (!backupUrl) {
    console.log("⏭️ BACKUP_DATABASE_URL not set — skipping backup DB sync");
    return;
  }

  let backupPool;
  try {
    console.log("🔄 Syncing data to backup database...");
    backupPool = new Pool({
      connectionString: backupUrl,
      ssl: { rejectUnauthorized: false },
    });

    for (const table of BACKUP_TABLES) {
      try {
        // Get source data
        const source = await pool.query(`SELECT * FROM ${table}`);
        if (source.rows.length === 0) continue;

        // Ensure table exists in backup (get DDL from source)
        const ddlResult = await pool.query(
          `SELECT column_name, data_type, is_nullable
           FROM information_schema.columns
           WHERE table_name = $1
           ORDER BY ordinal_position`,
          [table]
        );

        if (ddlResult.rows.length === 0) continue;

        // Create table if not exists with basic column types
        const cols = ddlResult.rows.map((c) => {
          let type = c.data_type;
          if (type === "integer") type = "INTEGER";
          else if (type === "bigint") type = "BIGINT";
          else if (type === "jsonb") type = "JSONB";
          else if (type === "text" || type === "character varying") type = "TEXT";
          else if (type === "timestamp without time zone" || type === "timestamp with time zone") type = "TIMESTAMPTZ";
          else type = "TEXT";
          return `"${c.column_name}" ${type}`;
        });

        await backupPool.query(`CREATE TABLE IF NOT EXISTS ${table} (${cols.join(", ")})`);

        // Truncate and re-insert (full sync)
        await backupPool.query(`DELETE FROM ${table}`);

        for (const row of source.rows) {
          const keys = Object.keys(row);
          const vals = keys.map((_, i) => `${i + 1}`);
          await backupPool.query(
            `INSERT INTO ${table} (${keys.map((k) => `"${k}"`).join(", ")}) VALUES (${vals.join(", ")})`,
            keys.map((k) => row[k])
          );
        }

        console.log(`  ✅ ${table}: ${source.rows.length} rows synced`);
      } catch (tableErr) {
        console.error(`  ⚠️ ${table}: sync failed —`, tableErr.message);
      }
    }

    console.log("✅ Backup DB sync completed");
    await auditLog(null, "backup_db_sync", "system", null, { status: "success" });
  } catch (error) {
    console.error("❌ Backup DB sync error:", error);
    await auditLog(null, "backup_db_sync", "system", null, { status: "error", error: error.message });
  } finally {
    if (backupPool) {
      await backupPool.end().catch(() => {});
    }
  }
}

// JSON backup every 4 hours + send to Telegram
setInterval(createBackup, 4 * 60 * 60 * 1000);

// Sync to backup DB every 6 hours
setInterval(syncToBackupDb, 6 * 60 * 60 * 1000);

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`IMAN server running on port ${PORT}`);
  console.log(`Security: webhook secret, rate limiting, CSP, HSTS enabled`);

  // Backup on startup with 30s delay (let DB init finish)
  setTimeout(async () => {
    try {
      await createBackup();
      await syncToBackupDb();
    } catch (e) {
      console.error("Startup backup error:", e);
    }
  }, 30000);

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
            { command: "audio", description: "Случайное аудио (реальные голоса)" },
            { command: "remind", description: "Подписка на напоминания" },
            { command: "stop", description: "Отписка от напоминаний" },
            { command: "app", description: "Открыть приложение" },
            { command: "help", description: "Помощь" },
          ],
          language_code: "ru",
        }),
      });

      // Сбрасываем команды по умолчанию (без языкового кода) — на случай если был англ.
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
            { command: "audio", description: "Случайное аудио (реальные голоса)" },
            { command: "remind", description: "Подписка на напоминания" },
            { command: "stop", description: "Отписка от напоминаний" },
            { command: "app", description: "Открыть приложение" },
            { command: "help", description: "Помощь" },
          ],
        }),
      });

      // Полное описание бота (показывается ДО /start на пустом чате)
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyDescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description:
            "IMAN — ваш помощник на пути к Аллаху.\n\n" +
            "🕌 Время намаза (ханафитский масхаб)\n" +
            "📖 Коран с тафсиром Ас-Саади\n" +
            "📜 40 хадисов Ан-Навави + 200+ других\n" +
            "🙏 Дуа на каждый день\n" +
            "📿 Счётчик зикра\n" +
            "🧠 Викторина с 300+ вопросами\n\n" +
            "Нажми /start чтобы начать.",
          language_code: "ru",
        }),
      });
      // Дефолт (без языкового кода) — на случай если у пользователя нерусская локаль
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyDescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description:
            "IMAN — ваш помощник на пути к Аллаху.\n\n" +
            "🕌 Время намаза · 📖 Коран · 📜 Хадисы · 🙏 Дуа · 📿 Зикр · 🧠 Квиз\n\n" +
            "Нажми /start чтобы начать.",
        }),
      });

      // Короткое описание (карточка профиля бота — до 120 символов)
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyShortDescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          short_description:
            "Время намаза, Коран, хадисы, дуа, зикр и викторина. Уделяй 5–10 минут в день своей религии.",
          language_code: "ru",
        }),
      });
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyShortDescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          short_description:
            "Намаз, Коран, хадисы, дуа, зикр. 5–10 минут в день своей религии.",
        }),
      });

      // Имя бота — на русском
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyName`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "IMAN — Путь мусульманина",
          language_code: "ru",
        }),
      });
    } catch (e) {
      console.error("Failed to set webhook/bot meta:", e);
    }
  }
});
