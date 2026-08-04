// ============================================================
// Telegram WebApp Helper
// Extract user info from Telegram Mini App context
// ============================================================

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  languageCode?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        /** Сырая подписанная строка — нужна серверу для проверки подлинности
         * (в отличие от initDataUnsafe, который клиент не должен подделывать). */
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
            language_code?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink?: (url: string) => void;
        HapticFeedback: {
          impactOccurred: (style: string) => void;
          notificationOccurred: (type: string) => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

/**
 * Open external URL safely:
 * - in Telegram Mini App → use WebApp.openLink (opens in system browser/native app)
 * - in regular browser → window.open in a new tab
 */
export function openExternalLink(url: string): void {
  try {
    const tg = window.Telegram?.WebApp;
    if (tg?.openLink) {
      tg.openLink(url);
      return;
    }
  } catch {
    /* fall through */
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Get the current Telegram user from WebApp context.
 * Returns null if not running inside Telegram.
 */
function getRealTelegramUser(): TelegramUser | null {
  try {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!tgUser || !tgUser.id) return null;

    return {
      id: tgUser.id,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      username: tgUser.username,
      photoUrl: tgUser.photo_url,
      languageCode: tgUser.language_code,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Browser login — доступ к тем же данным вне Telegram (обычный браузер).
// Сессия выдаётся сервером (POST /api/browser-login) после проверки
// логина/пароля и хранится локально с проверкой срока годности.
// ---------------------------------------------------------------------------

const BROWSER_SESSION_KEY = "iman_browser_session";

interface BrowserSession {
  telegramId: number;
  firstName: string;
  token: string;
  expiresAt: number;
}

export function setBrowserSession(session: BrowserSession): void {
  localStorage.setItem(BROWSER_SESSION_KEY, JSON.stringify(session));
}

export function clearBrowserSession(): void {
  localStorage.removeItem(BROWSER_SESSION_KEY);
}

export function hasBrowserSession(): boolean {
  return !!getBrowserSession();
}

/** Настоящий ли это Telegram Mini App (в отличие от обычного браузера,
 * пусть даже с активной browser-login сессией). Нужно, чтобы решить,
 * показывать ли кнопку «Войти»/«Выйти» на странице профиля. */
export function isRealTelegramWebApp(): boolean {
  return !!window.Telegram?.WebApp?.initDataUnsafe?.user;
}

/** Сырая подписанная строка initData — передаётся на сервер для проверки
 * подлинности при регистрации логина/пароля (см. /api/set-credentials). */
export function getTelegramInitDataRaw(): string | null {
  return window.Telegram?.WebApp?.initData || null;
}

function getBrowserSession(): BrowserSession | null {
  try {
    const raw = localStorage.getItem(BROWSER_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as BrowserSession;
    if (!session?.telegramId || Date.now() > session.expiresAt) {
      clearBrowserSession(); // истекла — подчищаем, чтобы не проверять каждый раз
      return null;
    }
    return session;
  } catch {
    clearBrowserSession();
    return null;
  }
}

/**
 * Текущий пользователь — либо реальный Telegram WebApp, либо (в обычном
 * браузере) активная сессия логина. Оба случая ведут к одному и тому же
 * профилю на сервере, поэтому дальше по коду разница не важна.
 */
export function getTelegramUser(): TelegramUser | null {
  const real = getRealTelegramUser();
  if (real) return real;

  const session = getBrowserSession();
  if (!session) return null;
  return { id: session.telegramId, firstName: session.firstName };
}

/**
 * Check if the app has an identity to sync with — either real Telegram
 * WebApp context, or an active browser-login session.
 */
export function isTelegramWebApp(): boolean {
  return !!getTelegramUser();
}
