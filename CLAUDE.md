# IMAN App

**Что:** мусульманское приложение (бот + Mini App).
**Стек:** Express + Telegraf + Railway Postgres (основная) + Supabase (backup).
**Prod:** https://iman-app-production.up.railway.app
**Railway:** `IMAN APP` · **GitHub:** `azizatavaliev-bot/iman-app`.
**Локальный порт:** 3000.

## Особенности

- DATABASE_URL — Railway Postgres (`ballast.proxy.rlwy.net:34568`).
- Backup БД — Supabase (общая Unity DB).
- Telegram-бот: токен в [[KEYS-VAULT]].

## Дубль

`Apps/IRfan/` — копия этого проекта (исторический клон под другое имя). **Решить:** удалить или переименовать в новый продукт.
