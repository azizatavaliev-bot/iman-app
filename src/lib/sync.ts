// ============================================================
// Server Sync — Persist user data to SQLite via API
// Only active inside Telegram WebApp (has telegramId)
// ============================================================

import { isTelegramWebApp, getTelegramUser } from "./telegram";

const SYNC_DEBOUNCE_MS = 5_000; // 5 seconds — reduced from 30s to prevent data loss
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
  "iman_quiz_history",
  "iman_onboarded",
  "iman_terms_read",
  "iman_nasheed_favorites",
  "iman_dreams_read",
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
  "iman_quran_notes",
  "iman_stories_read",
  "iman_zakat_assets",
  "iman_zakat_history",
] as const;

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncAt = 0;
let syncDone = false;

// Метка времени ПОСЛЕДНЕГО РЕАЛЬНОГО изменения локальных данных — не путать
// с "сейчас". Раньше gatherLocalData() штамповала Date.now() при КАЖДОМ
// вызове, включая вызовы только для сравнения — из-за этого localUpdatedAt
// в syncUserData() был всегда «прямо сейчас» и ветка «сервер новее»
// становилась практически недостижимой (сервер почти никогда не
// побеждал в мёрдже по времени). Теперь отметка ставится только в момент
// реальной правки (scheduleSyncPush вызывается из storage.ts на каждую
// запись), а сравнение читает именно её.
const LAST_MODIFIED_KEY = "iman_local_modified_at";

function stampLocalModified(): void {
  try {
    localStorage.setItem(LAST_MODIFIED_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Check if initial sync has completed */
export function isSyncDone(): boolean {
  return syncDone;
}

function getTelegramId(): number | null {
  const user = getTelegramUser();
  return user?.id ?? null;
}

/** Telegram-id, которому принадлежат данные в localStorage (из профиля). */
function getLocalOwnerId(): number | null {
  try {
    const raw = localStorage.getItem("iman_profile");
    if (!raw) return null;
    const p = JSON.parse(raw);
    const id = p?.telegramId;
    return typeof id === "number" ? id : null;
  } catch {
    return null;
  }
}

/** Проставить владельца текущих локальных данных (id текущего пользователя). */
function stampLocalOwner(telegramId: number): void {
  try {
    const raw = localStorage.getItem("iman_profile");
    const p = raw ? JSON.parse(raw) : {};
    if (p.telegramId !== telegramId) {
      p.telegramId = telegramId;
      localStorage.setItem("iman_profile", JSON.stringify(p));
    }
  } catch {
    /* ignore */
  }
}

/** Стереть все синкаемые ключи (данные чужого аккаунта на общем устройстве,
 * либо анонимная активность до входа по логину+паролю — см. BrowserLogin.tsx). */
export function clearSyncedLocalData(): void {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (
      k &&
      (k.startsWith("iman_") &&
        k !== "iman_onboarded" &&
        k !== "iman_channel_skipped")
    ) {
      toRemove.push(k);
    }
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
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
  // Читаем ПЕРСИСТЕНТНУЮ метку последнего изменения (см. stampLocalModified),
  // а не текущее время — иначе сравнение времени в syncUserData() всегда
  // считало бы локальные данные «только что изменёнными».
  data._updated_at =
    Number(localStorage.getItem(LAST_MODIFIED_KEY)) || Date.now();
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

    // server.data may be a JSON string (double-encoded) — parse it first
    const serverDataParsed: Record<string, unknown> | null = server
      ? typeof server.data === "string"
        ? JSON.parse(server.data)
        : server.data
      : null;

    // ⚠️ ЗАЩИТА ОТ КРОСС-АТРИБУЦИИ БАЛЛОВ.
    // На общем устройстве / при смене Telegram-аккаунта localStorage не
    // очищается, и данные ПРЕДЫДУЩЕГО пользователя (с его баллами) могут
    // «перетечь» к текущему через pushToServer. Если владелец локальных
    // данных не совпадает с текущим id — НЕ пушим чужое: восстанавливаем
    // данные текущего пользователя с сервера, либо чистим localStorage.
    const localOwnerId = getLocalOwnerId();
    if (localOwnerId != null && localOwnerId !== telegramId) {
      console.warn(
        `[sync] ⚠️ localStorage принадлежит другому пользователю (${localOwnerId} ≠ ${telegramId}). Чужие данные не пушим.`,
      );
      if (serverDataParsed) {
        restoreToLocal(serverDataParsed);
      } else {
        clearSyncedLocalData();
      }
      stampLocalOwner(telegramId);
      return; // finally проставит syncDone
    }

    if (!server || !serverDataParsed) {
      // No server data yet — push local to server (first time user)
      console.log("[sync] ✅ First time user, pushing local to server");
      await pushToServer(telegramId);
      stampLocalOwner(telegramId);
      return;
    }

    const serverData: Record<string, unknown> = serverDataParsed;

    // SMART MERGE: сравниваем по updated_at и totalPoints
    const localData = gatherLocalData();
    const localUpdatedAt = (localData._updated_at as number) || 0;
    const serverUpdatedAt = (serverData._updated_at as number) || server.updated_at || 0;

    // Извлекаем totalPoints для защиты от потери баллов
    let localPoints = 0;
    try {
      const lp = localData.iman_profile;
      if (typeof lp === "object" && lp !== null) localPoints = (lp as Record<string, unknown>).totalPoints as number || 0;
    } catch { /* ignore */ }

    const serverProfile = serverData.iman_profile as Record<string, unknown> | undefined;
    const serverPoints = (serverProfile?.totalPoints as number) || 0;

    // Проверяем, пустой ли localStorage (очищен Telegram WebView)
    const localKeyCount = Object.keys(localData).filter(k => k !== "_updated_at").length;
    const serverKeyCount = Object.keys(serverData).filter(k => k !== "_updated_at").length;
    const localIsEmpty = localKeyCount <= 2; // только iman_profile + iman_onboarded (авто-созданные)

    if (localIsEmpty && serverKeyCount > 2) {
      // localStorage был очищен — восстанавливаем ВСЁ из сервера
      console.log(`[sync] 🔄 localStorage empty (${localKeyCount} keys), restoring ALL from server (${serverKeyCount} keys)`);
      restoreToLocal(serverData);
    } else if (localPoints > serverPoints && localPoints > 0) {
      // Локальные баллы БОЛЬШЕ — пушим на сервер
      console.log(`[sync] ⚠️ Local points (${localPoints}) > server (${serverPoints}), pushing to server`);
      await pushToServer(telegramId);
    } else if (serverPoints > localPoints) {
      // Серверные баллы больше — восстанавливаем из сервера
      console.log(`[sync] ✅ Server points (${serverPoints}) > local (${localPoints}), restoring`);
      restoreToLocal(serverData);
    } else {
      // Одинаковые баллы — берём более свежие данные
      if (serverUpdatedAt > localUpdatedAt) {
        console.log(`[sync] ✅ Server is newer, restoring`);
        restoreToLocal(serverData);
      } else {
        console.log(`[sync] ✅ Local is newer or equal, pushing to server`);
        await pushToServer(telegramId);
      }
    }

    // Помечаем, что localStorage теперь принадлежит текущему пользователю
    stampLocalOwner(telegramId);
    console.log("[sync] ✅ Sync complete.");
  } catch (e) {
    console.error("[sync] ❌ Initial sync failed:", e);
  } finally {
    syncDone = true;
    window.dispatchEvent(new Event("iman-sync-done"));
  }
}

/**
 * Schedule a debounced push to server.
 * Call this after any localStorage write.
 */
export function scheduleSyncPush(): void {
  // Штампуем momент реальной правки ВСЕГДА, а не только внутри Telegram —
  // это дешёвая операция, и если позже (после логина) синк включится,
  // метка уже будет достоверной.
  stampLocalModified();

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
