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
 * Get the current Telegram user from WebApp context.
 * Returns null if not running inside Telegram.
 */
export function getTelegramUser(): TelegramUser | null {
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

/**
 * Check if the app is running inside Telegram WebApp.
 */
export function isTelegramWebApp(): boolean {
  return !!window.Telegram?.WebApp?.initDataUnsafe?.user;
}
