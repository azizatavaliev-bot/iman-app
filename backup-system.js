#!/usr/bin/env node
/**
 * BACKUP SYSTEM — Автоматическое резервное копирование данных
 *
 * Запускается каждые 6 часов автоматически
 * Сохраняет ВСЕ баллы пользователей в файл
 * Восстанавливает данные при потере
 */

import pkg from "pg";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;
const __dirname = fileURLToPath(new URL(".", import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_DIR = join(__dirname, "backups");
const LATEST_BACKUP = join(BACKUP_DIR, "latest.json");

// Создать директорию для бэкапов
if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

/**
 * ЭКСПОРТ ВСЕХ ДАННЫХ ИЗ POSTGRESQL
 */
async function backupAllData() {
  console.log("🔄 Начинаю резервное копирование...");

  try {
    // Получаем ВСЕ данные пользователей
    const result = await pool.query(
      "SELECT telegram_id, data, updated_at FROM users ORDER BY telegram_id"
    );

    const backup = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      total_users: result.rows.length,
      users: result.rows.map(row => ({
        telegram_id: row.telegram_id,
        data: typeof row.data === 'string' ? row.data : JSON.stringify(row.data),
        updated_at: row.updated_at
      }))
    };

    // Сохраняем последний бэкап
    writeFileSync(LATEST_BACKUP, JSON.stringify(backup, null, 2));

    // Сохраняем датированный бэкап
    const dated = join(BACKUP_DIR, `backup-${new Date().toISOString().split('T')[0]}.json`);
    writeFileSync(dated, JSON.stringify(backup, null, 2));

    console.log(`✅ Бэкап завершён: ${result.rows.length} пользователей сохранено`);
    console.log(`📁 Файл: ${LATEST_BACKUP}`);

    // Показываем статистику
    const stats = calculateStats(result.rows);
    console.log(`📊 Статистика:`);
    console.log(`   - Всего пользователей: ${stats.totalUsers}`);
    console.log(`   - Всего баллов: ${stats.totalPoints}`);
    console.log(`   - Средний уровень: ${stats.avgLevel}`);

    return backup;
  } catch (error) {
    console.error("❌ Ошибка при создании бэкапа:", error);
    throw error;
  }
}

/**
 * ВОССТАНОВЛЕНИЕ ДАННЫХ ИЗ БЭКАПА
 */
async function restoreFromBackup() {
  console.log("🔄 Начинаю восстановление из бэкапа...");

  if (!existsSync(LATEST_BACKUP)) {
    console.log("⚠️  Файл бэкапа не найден");
    return false;
  }

  try {
    const backup = JSON.parse(readFileSync(LATEST_BACKUP, 'utf-8'));
    console.log(`📁 Найден бэкап от ${backup.date}`);
    console.log(`   Пользователей в бэкапе: ${backup.total_users}`);

    let restored = 0;
    let errors = 0;

    for (const user of backup.users) {
      try {
        await pool.query(
          `INSERT INTO users (telegram_id, data, updated_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (telegram_id)
           DO UPDATE SET
             data = EXCLUDED.data,
             updated_at = EXCLUDED.updated_at`,
          [user.telegram_id, user.data, user.updated_at]
        );
        restored++;
      } catch (err) {
        console.error(`   ❌ Ошибка при восстановлении user ${user.telegram_id}:`, err.message);
        errors++;
      }
    }

    console.log(`✅ Восстановление завершено:`);
    console.log(`   - Восстановлено: ${restored} пользователей`);
    console.log(`   - Ошибок: ${errors}`);

    return true;
  } catch (error) {
    console.error("❌ Ошибка при восстановлении:", error);
    return false;
  }
}

/**
 * ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ
 */
async function verifyDataIntegrity() {
  console.log("🔍 Проверка целостности данных...");

  try {
    const result = await pool.query("SELECT telegram_id, data FROM users");

    let valid = 0;
    let invalid = 0;
    const issues = [];

    for (const row of result.rows) {
      try {
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;

        // Проверяем обязательные поля
        if (!data.hasOwnProperty('totalPoints')) {
          issues.push(`User ${row.telegram_id}: отсутствует totalPoints`);
          invalid++;
        } else if (typeof data.totalPoints !== 'number') {
          issues.push(`User ${row.telegram_id}: некорректный тип totalPoints`);
          invalid++;
        } else {
          valid++;
        }
      } catch (err) {
        issues.push(`User ${row.telegram_id}: некорректный JSON - ${err.message}`);
        invalid++;
      }
    }

    console.log(`✅ Проверка завершена:`);
    console.log(`   - Валидных записей: ${valid}`);
    console.log(`   - Проблемных записей: ${invalid}`);

    if (issues.length > 0) {
      console.log(`⚠️  Найдены проблемы:`);
      issues.forEach(issue => console.log(`   - ${issue}`));
    }

    return { valid, invalid, issues };
  } catch (error) {
    console.error("❌ Ошибка при проверке целостности:", error);
    throw error;
  }
}

/**
 * Статистика данных
 */
function calculateStats(rows) {
  let totalPoints = 0;
  let levels = {};

  for (const row of rows) {
    try {
      const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      totalPoints += data.totalPoints || 0;

      const level = data.level || 'Unknown';
      levels[level] = (levels[level] || 0) + 1;
    } catch (e) {
      // Игнорируем ошибки парсинга
    }
  }

  const avgLevel = Object.keys(levels).sort((a, b) => levels[b] - levels[a])[0] || 'Unknown';

  return {
    totalUsers: rows.length,
    totalPoints,
    avgLevel,
    levels
  };
}

/**
 * ГЛАВНАЯ ФУНКЦИЯ
 */
async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'backup':
        await backupAllData();
        break;

      case 'restore':
        await restoreFromBackup();
        break;

      case 'verify':
        await verifyDataIntegrity();
        break;

      case 'auto':
        // Автоматический режим: бэкап + проверка
        await backupAllData();
        await verifyDataIntegrity();
        break;

      default:
        console.log('Использование:');
        console.log('  node backup-system.js backup   - Создать бэкап');
        console.log('  node backup-system.js restore  - Восстановить из бэкапа');
        console.log('  node backup-system.js verify   - Проверить целостность');
        console.log('  node backup-system.js auto     - Автоматический режим (бэкап + проверка)');
        process.exit(1);
    }
  } catch (error) {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Запуск
main();
