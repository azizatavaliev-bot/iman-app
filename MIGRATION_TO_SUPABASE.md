# 🚀 Миграция IMAN App на Supabase PostgreSQL

## Почему Supabase вместо SQLite + Railway Volume?

✅ **Не нужен Railway Volume** — БД живёт отдельно от приложения  
✅ **Автоматические бэкапы** — Supabase делает бэкапы каждый день  
✅ **Бесплатный план** — 500 MB БД бесплатно  
✅ **Масштабируемость** — PostgreSQL надёжнее SQLite для продакшена  
✅ **Проверенное решение** — WB Analytics уже работает на Supabase  

---

## 📋 План миграции (30 минут)

### Шаг 1: Создать проект Supabase (5 мин)
1. Откройте https://supabase.com/dashboard
2. **New Project**
3. Параметры:
   - Name: `iman-app`
   - Database Password: `<сгенерируйте надёжный пароль>`
   - Region: **Central EU (Frankfurt)** или ближайший к вам
   - Pricing Plan: **Free**
4. Создайте проект (займёт 1-2 минуты)

### Шаг 2: Получить DATABASE_URL (2 мин)
1. В проекте Supabase → **Settings** → **Database**
2. Прокрутите до **Connection String**
3. Выберите **URI** (не Transaction pooler!)
4. Скопируйте строку (будет вида `postgresql://postgres:[YOUR-PASSWORD]@...`)
5. Замените `[YOUR-PASSWORD]` на ваш пароль из Шага 1

### Шаг 3: Обновить код IMAN App (10 мин)
Я подготовлю:
- Замена `better-sqlite3` на `pg` (node-postgres)
- SQL схема для PostgreSQL
- Обновлённый `server.js`

### Шаг 4: Настроить Railway переменные (5 мин)
1. Railway Dashboard → IMAN APP → Variables
2. Добавить переменную:
   - **Name:** `DATABASE_URL`
   - **Value:** `<ваша строка подключения из Шага 2>`

### Шаг 5: Деплой (5 мин)
1. Закоммитить изменения
2. Запушить в GitHub
3. Railway автоматически задеплоит
4. Проверить, что всё работает

---

## 🔧 Технические детали

### Что изменится в коде:

**Было (SQLite):**
```javascript
import Database from "better-sqlite3";
const db = new Database(join(DATA_DIR, "iman.db"));
db.exec(`CREATE TABLE IF NOT EXISTS users ...`);
const stmtGetUser = db.prepare("SELECT ...");
```

**Станет (PostgreSQL):**
```javascript
import pkg from "pg";
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE TABLE IF NOT EXISTS users ...`);
const result = await pool.query("SELECT ...", [telegramId]);
```

### Схема БД (PostgreSQL):

```sql
-- users table
CREATE TABLE IF NOT EXISTS users (
  telegram_id BIGINT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at BIGINT NOT NULL
);

-- analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  type TEXT NOT NULL,
  page TEXT,
  action TEXT,
  metadata JSONB,
  timestamp BIGINT NOT NULL
);

-- indexes
CREATE INDEX IF NOT EXISTS idx_analytics_telegram_id ON analytics(telegram_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics(type);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
```

### Основные изменения:

| Было (SQLite) | Стало (PostgreSQL) |
|---------------|-------------------|
| `INTEGER` | `BIGINT` (для Telegram ID) |
| `TEXT` для JSON | `JSONB` (нативный JSON) |
| `AUTOINCREMENT` | `SERIAL` |
| `db.prepare()` | `pool.query()` с параметрами |
| Синхронный код | Асинхронный (`async/await`) |

---

## 📦 Зависимости

**Удалить:**
```json
"better-sqlite3": "^12.6.2"
```

**Добавить:**
```json
"pg": "^8.13.1"
```

---

## ✅ Преимущества после миграции

1. **Данные всегда сохранены** — БД живёт отдельно от Railway
2. **Автобэкапы** — Supabase делает Point-in-Time Recovery
3. **Мониторинг** — Dashboard Supabase показывает использование
4. **Масштабирование** — можно легко увеличить лимиты
5. **Бесплатно** — до 500 MB БД и 2 GB трафика/месяц

---

## 🆘 Если что-то пойдёт не так

### Проблема: Ошибка подключения к БД

**Проверьте:**
1. DATABASE_URL правильный (с паролем)
2. Supabase проект запущен (Status: Active)
3. Railway переменная DATABASE_URL добавлена

### Проблема: Старые данные SQLite

**Решение:** Миграция данных не требуется — это новая БД, пользователи зарегистрируются заново.

Если нужно перенести старых пользователей — напишите, создам скрипт миграции.

---

## 🎯 Следующий шаг

**Начните с создания Supabase проекта:**
https://supabase.com/dashboard

После создания скажите мне, и я обновлю код для работы с PostgreSQL! 🚀
