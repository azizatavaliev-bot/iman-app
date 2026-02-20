// ============================================================
// Server Sync — Persist user data to SQLite via API
// Only active inside Telegram WebApp (has telegramId)
// ============================================================

import { isTelegramWebApp, getTelegramUser } from "./telegram";

const SYNC_DEBOUNCE_MS = 30_000; // 30 seconds
const API_BASE = ""; // same origin

// All localStorage keys that hold user data
const SYNC_KEYS = [
  "iman_profile",
  "iman_prayer_logs",
  "iman_habit_logs",
  "iman_favorite_hadiths",
  "iman_quran_bookmarks",
  "iman_names_progress",
  "iman_ibadah_sessions",
  "iman_memorization",
  "iman_quiz_scores",
  "iman_onboarded",
  "iman_ramadan_2026",
  // Additional keys
  "iman_dhikr_progress",
  "iman_favorite_duas",
  "iman_beginners_read",
  "iman_namaz_guide_read",
  "iman_seerah_read",
  "iman_channel_skipped",
  "iman_welcome_shown",
  "iman_quran_read_surahs",
  "iman_daily_bonus_date",
  "iman_hadiths_nawawi_read",
  "iman_hadiths_ext_read",
] as const;

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncAt = 0;

function getTelegramId(): number | null {
  const user = getTelegramUser();
  return user?.id ?? null;
}

/** Gather all iman_* data from localStorage into one object */
function gatherLocalData(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of SYNC_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  }
  // Also gather dynamic keys (quiz used IDs, quiz scored, dua reads)
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith("iman_quiz_used_") || k.startsWith("iman_quiz_scored_") || k.startsWith("iman_dua_read_"))) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          data[k] = JSON.parse(raw);
        } catch {
          data[k] = raw;
        }
      }
    }
  }
  data._updated_at = Date.now();
  return data;
}

/** Restore server data into localStorage */
function restoreToLocal(data: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(data)) {
    if (key === "_updated_at") continue;
    if (typeof value === "string") {
      localStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }
}

/** Fetch user data from server */
async function fetchServerData(
  telegramId: number,
): Promise<{ data: Record<string, unknown>; updated_at: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/user/${telegramId}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Push local data to server */
async function pushToServer(telegramId: number): Promise<boolean> {
  try {
    const data = gatherLocalData();
    const res = await fetch(`${API_BASE}/api/user/${telegramId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    if (res.ok) {
      lastSyncAt = Date.now();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Main sync function — call on app startup.
 * ЖЕЛЕЗНАЯ ГАРАНТИЯ: всегда загружаем из базы при старте!
 *
 * КРИТИЧНО: НЕ перезаписываем базу сразу после загрузки!
 * Сохранение произойдёт автоматически через scheduleSyncPush()
 * когда пользователь что-то изменит.
 */
export async function syncUserData(): Promise<void> {
  if (!isTelegramWebApp()) return;

  const telegramId = getTelegramId();
  if (!telegramId) return;

  try {
    const server = await fetchServerData(telegramId);

    if (!server) {
      // No server data yet — push local to server (first time user)
      console.log("[sync] ✅ First time user, pushing local to server");
      await pushToServer(telegramId);
      return;
    }

    // ВСЕГДА загружаем из базы при старте
    // Это гарантирует что баллы НЕ потеряются
    console.log("[sync] ✅ Loading data from server (restoring saved points)");
    // server.data may be a JSON string (double-encoded) — parse it first
    const serverData: Record<string, unknown> =
      typeof server.data === "string"
        ? JSON.parse(server.data)
        : server.data;
    restoreToLocal(serverData);

    // ❌ НЕ делаем pushToServer здесь!
    // Иначе мы затрём хорошие данные из базы пустым localStorage
    //
    // Сохранение произойдёт автоматически когда пользователь:
    // - Отметит намаз → storage.write() → notifySync() → scheduleSyncPush()
    // - Прочитает Коран → storage.write() → scheduleSyncPush()
    // - И т.д.

    console.log("[sync] ✅ Sync complete. Points restored from database.");
  } catch (e) {
    console.error("[sync] ❌ Initial sync failed:", e);
  }
}

/**
 * Schedule a debounced push to server.
 * Call this after any localStorage write.
 */
export function scheduleSyncPush(): void {
  if (!isTelegramWebApp()) return;

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const telegramId = getTelegramId();
    if (telegramId) {
      pushToServer(telegramId);
    }
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Immediate push (no debounce) — used on app close/hide.
 */
function immediateSync(): void {
  if (!isTelegramWebApp()) return;
  const telegramId = getTelegramId();
  if (!telegramId) return;

  // Cancel any pending debounced push
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  // Use sendBeacon for reliable delivery on page close
  const data = gatherLocalData();
  const url = `/api/user/${telegramId}`;
  const body = JSON.stringify({ data });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
  } else {
    // Fallback: regular fetch (may not complete on close, but better than nothing)
    pushToServer(telegramId).catch(() => {});
  }
}

/**
 * Initialize save-on-close listeners.
 * Call once on app startup.
 */
export function initSyncOnClose(): void {
  // visibilitychange fires when user switches apps in Telegram
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      immediateSync();
    }
  });

  // pagehide fires on iOS Safari / some mobile browsers
  window.addEventListener("pagehide", () => {
    immediateSync();
  });

  // beforeunload for desktop browsers
  window.addEventListener("beforeunload", () => {
    immediateSync();
  });
}
