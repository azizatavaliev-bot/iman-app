import { createServer } from "http";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, extname, normalize } from "path";
import { fileURLToPath } from "url";
import { randomBytes, createHmac } from "crypto";
import pkg from "pg";
const { Pool } = pkg;

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "dist");
const PORT = parseInt(process.env.PORT || "3000", 10);
const BOT_TOKEN =
  process.env.BOT_TOKEN || "8598576939:AAHSAtSNp0a8zULTBUJuFamzp4CbvXG9cqM";
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
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Test connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
  console.log("✅ Database connected:", res.rows[0].now);
});

// Create tables
async function initDatabase() {
  const client = await pool.connect();
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        telegram_id BIGINT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `);

    // Analytics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        page TEXT,
        action TEXT,
        metadata JSONB,
        timestamp BIGINT NOT NULL
      )
    `);

    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_telegram_id ON analytics(telegram_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics(type)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at)
    `);

    console.log("✅ Database schema initialized");
  } catch (err) {
    console.error("❌ Database initialization failed:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Initialize database on startup
await initDatabase();

// Database helper functions
async function getUser(telegramId) {
  const result = await pool.query(
    "SELECT data, updated_at FROM users WHERE telegram_id = $1",
    [telegramId]
  );
  return result.rows[0] || null;
}

async function upsertUser(telegramId, data, updatedAt) {
  await pool.query(
    `INSERT INTO users (telegram_id, data, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_id)
     DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
    [telegramId, JSON.stringify(data), updatedAt]
  );
}

async function insertAnalytics(telegramId, type, page, action, metadata, timestamp) {
  await pool.query(
    `INSERT INTO analytics (telegram_id, type, page, action, metadata, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [telegramId, type, page, action, metadata ? JSON.stringify(metadata) : null, timestamp]
  );
}

// =========================================================================
// ADMIN AUTHORIZATION
// =========================================================================
const ADMIN_TELEGRAM_IDS = [
  // Add your Telegram ID here after first login
  // Example: 123456789
];

const ADMIN_USERNAMES = [
  "atavaliev", // @atavaliev - fallback (less secure than ID)
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
    for (const [ip, entry] of rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  },
  5 * 60 * 1000,
);
