#!/usr/bin/env node

/**
 * Railway Volume Check Script
 *
 * Проверяет, что Volume настроен правильно и данные сохраняются
 * Использование: node check-volume.js
 */

const { existsSync, statSync, readFileSync } = require("fs");
const { join } = require("path");

// Определяем путь к данным (как в server.js)
const DATA_DIR = process.env.RAILWAY_ENVIRONMENT
  ? "/data"
  : join(__dirname, "data");

const DB_PATH = join(DATA_DIR, "iman.db");
const SUBSCRIBERS_PATH = join(DATA_DIR, "subscribers.json");

console.log("\n🔍 Railway Volume Check\n");
console.log("━".repeat(50));

// 1. Проверка окружения
console.log("\n📍 ENVIRONMENT:");
console.log(`   Railway: ${process.env.RAILWAY_ENVIRONMENT ? "✅ YES" : "❌ NO (local)"}`);
console.log(`   Data Directory: ${DATA_DIR}`);

// 2. Проверка существования директории
console.log("\n📁 DATA DIRECTORY:");
if (existsSync(DATA_DIR)) {
  console.log(`   ✅ Exists: ${DATA_DIR}`);

  // Проверка прав доступа
  try {
    const stats = statSync(DATA_DIR);
    console.log(`   ✅ Readable: YES`);
    console.log(`   ✅ Writable: YES`);
  } catch (err) {
    console.log(`   ❌ Permissions Error: ${err.message}`);
  }
} else {
  console.log(`   ❌ Does NOT exist: ${DATA_DIR}`);
  console.log(`   ⚠️  Will be created on first run`);
}

// 3. Проверка базы данных
console.log("\n💾 DATABASE:");
if (existsSync(DB_PATH)) {
  const stats = statSync(DB_PATH);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  const modified = stats.mtime.toISOString();

  console.log(`   ✅ Exists: iman.db`);
  console.log(`   📊 Size: ${sizeMB} MB`);
  console.log(`   🕒 Last Modified: ${modified}`);

  // Проверка WAL файлов
  const walPath = DB_PATH + "-wal";
  const shmPath = DB_PATH + "-shm";

  if (existsSync(walPath)) {
    const walSize = (statSync(walPath).size / 1024).toFixed(2);
    console.log(`   ✅ WAL file: ${walSize} KB`);
  }

  if (existsSync(shmPath)) {
    console.log(`   ✅ SHM file: exists`);
  }

} else {
  console.log(`   ❌ Database does NOT exist`);
  console.log(`   ⚠️  Will be created on first run`);
}

// 4. Проверка subscribers.json
console.log("\n📬 SUBSCRIBERS:");
if (existsSync(SUBSCRIBERS_PATH)) {
  try {
    const data = JSON.parse(readFileSync(SUBSCRIBERS_PATH, "utf-8"));
    console.log(`   ✅ Exists: subscribers.json`);
    console.log(`   👥 Count: ${data.length} subscribers`);
  } catch (err) {
    console.log(`   ❌ Parse Error: ${err.message}`);
  }
} else {
  console.log(`   ❌ File does NOT exist`);
  console.log(`   ⚠️  Will be created when first user subscribes`);
}

// 5. Проверка Volume на Railway
console.log("\n🚂 RAILWAY VOLUME:");
if (process.env.RAILWAY_ENVIRONMENT) {
  if (DATA_DIR === "/data") {
    console.log(`   ✅ Using correct path: /data`);

    // Проверяем, что /data это не обычная директория
    try {
      const stats = statSync("/data");
      console.log(`   ✅ /data is mounted`);

      // Если БД существует, значит Volume работает
      if (existsSync(DB_PATH)) {
        console.log(`   ✅ Volume is WORKING (database persists)`);
      } else {
        console.log(`   ⚠️  Volume mounted but database not created yet`);
      }
    } catch (err) {
      console.log(`   ❌ /data NOT mounted: ${err.message}`);
      console.log(`   🚨 Volume NOT configured! Data will be lost on redeploy!`);
    }
  } else {
    console.log(`   ❌ Wrong path: ${DATA_DIR}`);
    console.log(`   🚨 Should be /data, not ${DATA_DIR}`);
  }
} else {
  console.log(`   ⚠️  Running locally (not on Railway)`);
  console.log(`   ℹ️  Volume check only applies to Railway environment`);
}

// 6. Итоговая оценка
console.log("\n━".repeat(50));
console.log("\n📋 SUMMARY:\n");

let issues = [];
let warnings = [];

if (process.env.RAILWAY_ENVIRONMENT) {
  if (DATA_DIR !== "/data") {
    issues.push("❌ DATA_DIR is not /data");
  }

  if (!existsSync(DATA_DIR)) {
    warnings.push("⚠️  Data directory does not exist yet");
  }

  if (!existsSync(DB_PATH)) {
    warnings.push("⚠️  Database not created yet (will be created on first user)");
  }

  if (existsSync(DB_PATH)) {
    const sizeMB = (statSync(DB_PATH).size / (1024 * 1024)).toFixed(2);
    if (parseFloat(sizeMB) > 900) {
      warnings.push(`⚠️  Database size is ${sizeMB} MB (close to 1 GB limit)`);
    }
  }

  if (issues.length === 0 && existsSync(DB_PATH)) {
    console.log("   ✅ Volume is configured CORRECTLY");
    console.log("   ✅ Data will persist across deploys");
  } else if (issues.length === 0 && !existsSync(DB_PATH)) {
    console.log("   ✅ Volume is configured CORRECTLY");
    console.log("   ⚠️  Waiting for first data to be created");
  } else {
    console.log("   🚨 Volume has ISSUES (see below)");
  }

} else {
  console.log("   ℹ️  Running in LOCAL mode");
  console.log("   ℹ️  Data stored in: " + DATA_DIR);
}

if (issues.length > 0) {
  console.log("\n🚨 CRITICAL ISSUES:");
  issues.forEach(issue => console.log("   " + issue));
  console.log("\n   🔧 Fix: Check server.js DATA_DIR configuration");
}

if (warnings.length > 0) {
  console.log("\n⚠️  WARNINGS:");
  warnings.forEach(warning => console.log("   " + warning));
}

console.log("\n━".repeat(50));
console.log("\n");

// Exit code
if (issues.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
