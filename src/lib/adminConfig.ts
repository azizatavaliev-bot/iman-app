// ============================================================
// IMAN App - Admin Configuration
// List of Telegram IDs authorized to access admin panel
// ============================================================

/**
 * Telegram IDs of administrators
 *
 * To get your Telegram ID:
 * 1. Open browser console in the app
 * 2. Run: getTelegramUser()
 * 3. Copy the "id" field
 */
export const ADMIN_TELEGRAM_IDS = [
  508698471, // Aziz Atavaliev
  542914483, // Akylai
];

/**
 * Telegram usernames of administrators (fallback method)
 */
export const ADMIN_USERNAMES = [
  "atavaliev", // @atavaliev
];

/**
 * Check if a user is an administrator
 */
export function isAdmin(telegramId?: number, username?: string): boolean {
  // Check by Telegram ID (primary)
  if (telegramId && ADMIN_TELEGRAM_IDS.includes(telegramId)) {
    return true;
  }
  // Check by username (fallback)
  if (username && ADMIN_USERNAMES.includes(username.toLowerCase())) {
    return true;
  }
  return false;
}
