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
  // Add your Telegram ID here
  // Example: 123456789
];

/**
 * Check if a user is an administrator
 */
export function isAdmin(telegramId?: number): boolean {
  if (!telegramId) return false;
  return ADMIN_TELEGRAM_IDS.includes(telegramId);
}
