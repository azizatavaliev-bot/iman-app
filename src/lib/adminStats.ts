// ============================================================
// IMAN App - Admin Statistics
// Fetch and analyze user data from server database
// ============================================================

import type { UserProfile, PrayerLog, HabitLog } from "./storage";
import { LEVELS } from "./storage";
import { getTelegramUser } from "./telegram";

// ---- Types ----

export interface UserStats {
  telegramId: number;
  name: string;
  level: string;
  points: number;
  streak: number;
  longestStreak: number;
  lastActive: Date;
  totalPrayers: number;
  totalHabits: number;
  joinedAt: Date;
  city: string;
}

export interface AdminDashboard {
  totalUsers: number;
  activeToday: number;
  activeWeek: number;
  activeMonth: number;
  averageLevel: string;
  averagePoints: number;
  averageStreak: number;
  topFeatures: { name: string; usage: number }[];
  users: UserStats[];
}

interface ServerUserData {
  telegram_id: number;
  data: string;
  updated_at: number;
}

// ---- Helper Functions ----

function parseStorageData(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getProfile(data: Record<string, unknown>): UserProfile | null {
  const profile = data.iman_profile;
  if (!profile || typeof profile !== "object") return null;
  return profile as UserProfile;
}

function getPrayerLogs(
  data: Record<string, unknown>,
): Record<string, PrayerLog> {
  const logs = data.iman_prayer_logs;
  if (!logs || typeof logs !== "object") return {};
  return logs as Record<string, PrayerLog>;
}

function getHabitLogs(data: Record<string, unknown>): Record<string, HabitLog> {
  const logs = data.iman_habit_logs;
  if (!logs || typeof logs !== "object") return {};
  return logs as Record<string, HabitLog>;
}

function countTotalPrayers(prayerLogs: Record<string, PrayerLog>): number {
  let count = 0;
  const prayerNames = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

  for (const log of Object.values(prayerLogs)) {
    for (const prayer of prayerNames) {
      const status = log.prayers[prayer]?.status;
      if (status === "ontime" || status === "late") {
        count++;
      }
    }
  }

  return count;
}

function countTotalHabits(habitLogs: Record<string, HabitLog>): number {
  let count = 0;
  const habitKeys = [
    "quran",
    "azkar_morning",
    "azkar_evening",
    "charity",
    "fasting",
    "dua",
  ] as const;

  for (const log of Object.values(habitLogs)) {
    for (const key of habitKeys) {
      if (log[key]) count++;
    }
  }

  return count;
}

function isActiveWithinDays(lastActive: Date, days: number): boolean {
  const now = new Date();
  const diff = now.getTime() - lastActive.getTime();
  return diff <= days * 24 * 60 * 60 * 1000;
}

// ---- Main Functions ----

/**
 * Fetch all users from server database
 * This is a server-side endpoint that returns all user records
 */
async function fetchAllUsersFromServer(): Promise<ServerUserData[]> {
  try {
    const tgUser = getTelegramUser();
    const headers: Record<string, string> = {};
    if (tgUser) {
      headers["X-Telegram-Id"] = tgUser.id.toString();
      if (tgUser.username) headers["X-Telegram-Username"] = tgUser.username;
    }

    const response = await fetch("/api/admin/users", { headers });
    if (!response.ok) {
      console.error("Failed to fetch users:", response.statusText);
      return [];
    }
    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

/**
 * Get all users with their statistics
 */
export async function getAllUsers(): Promise<UserStats[]> {
  const serverUsers = await fetchAllUsersFromServer();
  const users: UserStats[] = [];

  for (const serverUser of serverUsers) {
    const data = parseStorageData(serverUser.data);
    const profile = getProfile(data);

    if (!profile) continue;

    const prayerLogs = getPrayerLogs(data);
    const habitLogs = getHabitLogs(data);
    const lastActive = new Date(serverUser.updated_at);

    users.push({
      telegramId: serverUser.telegram_id,
      name: profile.name || "Без имени",
      level: profile.level || LEVELS[0].name,
      points: profile.totalPoints || 0,
      streak: profile.streak || 0,
      longestStreak: profile.longestStreak || 0,
      lastActive,
      totalPrayers: countTotalPrayers(prayerLogs),
      totalHabits: countTotalHabits(habitLogs),
      joinedAt: new Date(profile.joinedAt || Date.now()),
      city: profile.city || "",
    });
  }

  return users;
}

/**
 * Get users active within the last N days
 */
export async function getActiveUsers(days: number): Promise<UserStats[]> {
  const allUsers = await getAllUsers();
  return allUsers.filter((user) => isActiveWithinDays(user.lastActive, days));
}

/**
 * Get most used features across all users
 */
export async function getMostUsedFeatures(): Promise<
  { name: string; usage: number }[]
> {
  const allUsers = await getAllUsers();

  let totalPrayers = 0;
  let totalHabits = 0;
  let totalQuran = 0;
  let totalAzkar = 0;
  let totalDua = 0;

  for (const user of allUsers) {
    totalPrayers += user.totalPrayers;
    totalHabits += user.totalHabits;
  }

  // Get detailed habit breakdown
  const serverUsers = await fetchAllUsersFromServer();
  for (const serverUser of serverUsers) {
    const data = parseStorageData(serverUser.data);
    const habitLogs = getHabitLogs(data);

    for (const log of Object.values(habitLogs)) {
      if (log.quran) totalQuran++;
      if (log.azkar_morning || log.azkar_evening) totalAzkar++;
      if (log.dua) totalDua++;
    }
  }

  const features = [
    { name: "Намазы", usage: totalPrayers },
    { name: "Коран", usage: totalQuran },
    { name: "Азкар", usage: totalAzkar },
    { name: "Дуа", usage: totalDua },
    { name: "Привычки", usage: totalHabits },
  ];

  return features.sort((a, b) => b.usage - a.usage);
}

/**
 * Get complete admin dashboard statistics
 */
export async function getAdminDashboard(): Promise<AdminDashboard> {
  const allUsers = await getAllUsers();
  const activeToday = allUsers.filter((u) =>
    isActiveWithinDays(u.lastActive, 1),
  ).length;
  const activeWeek = allUsers.filter((u) =>
    isActiveWithinDays(u.lastActive, 7),
  ).length;
  const activeMonth = allUsers.filter((u) =>
    isActiveWithinDays(u.lastActive, 30),
  ).length;

  const totalPoints = allUsers.reduce((sum, u) => sum + u.points, 0);
  const totalStreaks = allUsers.reduce((sum, u) => sum + u.streak, 0);
  const averagePoints =
    allUsers.length > 0 ? Math.round(totalPoints / allUsers.length) : 0;
  const averageStreak =
    allUsers.length > 0 ? Math.round(totalStreaks / allUsers.length) : 0;

  // Calculate average level
  const levelValues = allUsers.map((u) => {
    const levelIndex = LEVELS.findIndex((l) => l.name === u.level);
    return levelIndex >= 0 ? levelIndex : 0;
  });
  const avgLevelIndex =
    levelValues.length > 0
      ? Math.round(
          levelValues.reduce((sum, v) => sum + v, 0) / levelValues.length,
        )
      : 0;
  const averageLevel = LEVELS[avgLevelIndex]?.name || LEVELS[0].name;

  const topFeatures = await getMostUsedFeatures();

  // Sort users by points (descending)
  const sortedUsers = [...allUsers].sort((a, b) => b.points - a.points);

  return {
    totalUsers: allUsers.length,
    activeToday,
    activeWeek,
    activeMonth,
    averageLevel,
    averagePoints,
    averageStreak,
    topFeatures,
    users: sortedUsers,
  };
}
