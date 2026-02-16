// ============================================================
// IMAN App - Local Storage Manager
// All user data persisted in localStorage with 'iman_' prefix
// ============================================================

// ---- Storage Keys ----

const KEYS = {
  PROFILE: "iman_profile",
  PRAYER_LOGS: "iman_prayer_logs",
  HABIT_LOGS: "iman_habit_logs",
  FAVORITE_HADITHS: "iman_favorite_hadiths",
  QURAN_BOOKMARKS: "iman_quran_bookmarks",
  NAMES_PROGRESS: "iman_names_progress",
  IBADAH_SESSIONS: "iman_ibadah_sessions",
  MEMORIZATION: "iman_memorization",
} as const;

// ---- Points System ----

export const POINTS = {
  PRAYER_ONTIME: 15,
  PRAYER_LATE: 7,
  QURAN: 5,
  HADITH: 3,
  AZKAR: 3,
  CHARITY: 8,
  FASTING: 20,
  NAMES_QUIZ: 5,
  DUA: 3,
  TAFSIR: 4,
  DAILY_BONUS: 25,
  IBADAH_MINUTE: 2,
  MEMORIZE_REPEAT: 5,
  QUIZ_CORRECT: 2,
} as const;

// ---- Levels ----

export interface Level {
  name: string;
  minPoints: number;
  icon: string;
}

export const LEVELS: Level[] = [
  { name: "Талиб", minPoints: 0, icon: "🌱" },
  { name: "Муслим", minPoints: 200, icon: "☪️" },
  { name: "Му'мин", minPoints: 750, icon: "📿" },
  { name: "Мухсин", minPoints: 2000, icon: "⭐" },
  { name: "Муттакий", minPoints: 5000, icon: "🌙" },
  { name: "Салих", minPoints: 10000, icon: "🕌" },
  { name: "Хафиз", minPoints: 20000, icon: "📖" },
  { name: "Муджтахид", minPoints: 40000, icon: "🔥" },
  { name: "Шейх", minPoints: 75000, icon: "👑" },
  { name: "Имам", minPoints: 150000, icon: "✨" },
];

export function getCurrentLevel(points: number): Level {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (points >= level.minPoints) {
      current = level;
    } else {
      break;
    }
  }
  return current;
}

// ---- Types ----

export type PrayerStatus = "ontime" | "late" | "missed" | "none";

export interface PrayerEntry {
  status: PrayerStatus;
  timestamp: string | null;
}

export interface PrayerPrayers {
  fajr: PrayerEntry;
  dhuhr: PrayerEntry;
  asr: PrayerEntry;
  maghrib: PrayerEntry;
  isha: PrayerEntry;
}

export interface PrayerLog {
  date: string; // YYYY-MM-DD
  prayers: PrayerPrayers;
}

export interface HabitLog {
  date: string; // YYYY-MM-DD
  quran: boolean;
  azkar_morning: boolean;
  azkar_evening: boolean;
  charity: boolean;
  fasting: boolean;
  dua: boolean;
}

export interface UserProfile {
  name: string;
  city: string;
  lat: number | null;
  lng: number | null;
  level: string;
  totalPoints: number;
  streak: number;
  longestStreak: number;
  joinedAt: string;
  language: string;
}

export interface FavoriteHadith {
  id: string;
  collection: string;
  text: string;
  narrator: string;
}

export interface QuranBookmark {
  surahNumber: number;
  ayahNumber: number;
  timestamp: string;
}

export interface NamesProgress {
  learned: number[];
  quizHighScore: number;
}

export interface TodayStats {
  prayersCompleted: number;
  prayersTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
  pointsEarned: number;
}

export interface WeeklyStats {
  days: {
    date: string;
    prayersCompleted: number;
    habitsCompleted: number;
    points: number;
  }[];
  totalPoints: number;
  avgPrayers: number;
  avgHabits: number;
  perfectDays: number;
}

// ---- Ibadah Session ----

export interface IbadahSession {
  date: string; // YYYY-MM-DD
  startedAt: string; // ISO timestamp
  durationMinutes: number;
  pointsEarned: number;
  type: "quran" | "dhikr" | "dua" | "reflection" | "general";
}

// ---- Memorization Progress ----

export interface MemorizationSurah {
  surahNumber: number;
  addedAt: string; // ISO
  lastReviewedAt: string | null;
  reviewCount: number;
  confidence: number; // 0-100
  pointsEarned: number;
}

// ---- Prayer Names List (for iteration) ----

const PRAYER_NAMES: (keyof PrayerPrayers)[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

const HABIT_KEYS: (keyof Omit<HabitLog, "date">)[] = [
  "quran",
  "azkar_morning",
  "azkar_evening",
  "charity",
  "fasting",
  "dua",
];

// ---- Helper: date formatting ----

function toDateKey(date?: Date | string): string {
  if (!date) {
    return new Date().toISOString().slice(0, 10);
  }
  if (typeof date === "string") {
    return date.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function defaultPrayers(): PrayerPrayers {
  const entry: PrayerEntry = { status: "none", timestamp: null };
  return {
    fajr: { ...entry },
    dhuhr: { ...entry },
    asr: { ...entry },
    maghrib: { ...entry },
    isha: { ...entry },
  };
}

function defaultHabitLog(date: string): HabitLog {
  return {
    date,
    quran: false,
    azkar_morning: false,
    azkar_evening: false,
    charity: false,
    fasting: false,
    dua: false,
  };
}

function defaultProfile(): UserProfile {
  return {
    name: "",
    city: "",
    lat: null,
    lng: null,
    level: LEVELS[0].name,
    totalPoints: 0,
    streak: 0,
    longestStreak: 0,
    joinedAt: new Date().toISOString(),
    language: "ru",
  };
}

// ---- Storage Class ----

// Максимум дней хранения детальных логов (старые архивируются)
const MAX_LOG_DAYS = 90;

class Storage {
  // ---- Raw helpers ----

  private read<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private write<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
    this.notifySync();
  }

  // ---- Очистка старых логов (>90 дней) ----

  cleanupOldLogs(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_LOG_DAYS);
    const cutoffKey = toDateKey(cutoff);

    // Prayer logs
    const prayerLogs = this.getAllPrayerLogs();
    let prayerCleaned = false;
    for (const key of Object.keys(prayerLogs)) {
      if (key < cutoffKey) {
        delete prayerLogs[key];
        prayerCleaned = true;
      }
    }
    if (prayerCleaned) this.saveAllPrayerLogs(prayerLogs);

    // Habit logs
    const habitLogs = this.getAllHabitLogs();
    let habitCleaned = false;
    for (const key of Object.keys(habitLogs)) {
      if (key < cutoffKey) {
        delete habitLogs[key];
        habitCleaned = true;
      }
    }
    if (habitCleaned) this.saveAllHabitLogs(habitLogs);

    // Ibadah sessions — оставляем только за 90 дней
    const sessions = this.getIbadahSessions();
    const filteredSessions = sessions.filter((s) => s.date >= cutoffKey);
    if (filteredSessions.length < sessions.length) {
      this.write(KEYS.IBADAH_SESSIONS, filteredSessions);
    }
  }

  // ---- Profile ----

  getProfile(): UserProfile {
    const stored = this.read<UserProfile>(KEYS.PROFILE);
    if (!stored) return defaultProfile();
    return { ...defaultProfile(), ...stored };
  }

  setProfile(profile: Partial<UserProfile>): UserProfile {
    const current = this.getProfile();
    const updated: UserProfile = { ...current, ...profile };
    updated.level = getCurrentLevel(updated.totalPoints).name;
    this.write(KEYS.PROFILE, updated);
    return updated;
  }

  addPoints(amount: number): UserProfile {
    const profile = this.getProfile();
    profile.totalPoints += amount;
    profile.level = getCurrentLevel(profile.totalPoints).name;
    this.write(KEYS.PROFILE, profile);
    return profile;
  }

  /** Recalculate totalPoints from all stored prayer/habit logs (source of truth) */
  recalculateTotalPoints(): UserProfile {
    const profile = this.getProfile();
    const allPrayerLogs = this.getAllPrayerLogs();
    const allHabitLogs = this.getAllHabitLogs();

    let total = 0;

    // Sum points from all prayer logs
    for (const log of Object.values(allPrayerLogs)) {
      for (const p of PRAYER_NAMES) {
        if (log.prayers[p].status === "ontime") total += POINTS.PRAYER_ONTIME;
        else if (log.prayers[p].status === "late") total += POINTS.PRAYER_LATE;
      }
    }

    // Sum points from all habit logs
    for (const log of Object.values(allHabitLogs)) {
      if (log.quran) total += POINTS.QURAN;
      if (log.azkar_morning) total += POINTS.AZKAR;
      if (log.azkar_evening) total += POINTS.AZKAR;
      if (log.charity) total += POINTS.CHARITY;
      if (log.fasting) total += POINTS.FASTING;
      if (log.dua) total += POINTS.DUA;
    }

    // Add names quiz / hadith bonus points (keep extra points that came from these)
    const namesProgress = this.getNamesProgress();
    total += namesProgress.learned.length * POINTS.NAMES_QUIZ;

    profile.totalPoints = total;
    profile.level = getCurrentLevel(total).name;
    this.write(KEYS.PROFILE, profile);
    return profile;
  }

  // ---- Prayer Logs ----

  private getAllPrayerLogs(): Record<string, PrayerLog> {
    return this.read<Record<string, PrayerLog>>(KEYS.PRAYER_LOGS) || {};
  }

  private saveAllPrayerLogs(logs: Record<string, PrayerLog>): void {
    this.write(KEYS.PRAYER_LOGS, logs);
  }

  getPrayerLog(date?: Date | string): PrayerLog {
    const key = toDateKey(date);
    const logs = this.getAllPrayerLogs();
    if (logs[key]) return logs[key];
    return { date: key, prayers: defaultPrayers() };
  }

  setPrayerLog(date: Date | string, prayers: PrayerPrayers): PrayerLog {
    const key = toDateKey(date);
    const logs = this.getAllPrayerLogs();
    const log: PrayerLog = { date: key, prayers };
    logs[key] = log;
    this.saveAllPrayerLogs(logs);
    return log;
  }

  // ---- Habit Logs ----

  private getAllHabitLogs(): Record<string, HabitLog> {
    return this.read<Record<string, HabitLog>>(KEYS.HABIT_LOGS) || {};
  }

  private saveAllHabitLogs(logs: Record<string, HabitLog>): void {
    this.write(KEYS.HABIT_LOGS, logs);
  }

  getHabitLog(date?: Date | string): HabitLog {
    const key = toDateKey(date);
    const logs = this.getAllHabitLogs();
    if (logs[key]) return logs[key];
    return defaultHabitLog(key);
  }

  setHabitLog(date: Date | string, habits: Omit<HabitLog, "date">): HabitLog {
    const key = toDateKey(date);
    const logs = this.getAllHabitLogs();
    const log: HabitLog = { date: key, ...habits };
    logs[key] = log;
    this.saveAllHabitLogs(logs);
    return log;
  }

  // ---- Streak Calculation ----

  getStreak(): number {
    return this.getProfile().streak;
  }

  updateStreak(): { streak: number; longestStreak: number } {
    const logs = this.getAllPrayerLogs();
    const today = new Date();
    let streak = 0;

    // Walk backwards from today counting consecutive days with all 5 prayers completed
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = toDateKey(d);
      const log = logs[key];

      if (!log) {
        // If today has no log yet, skip it (day not started)
        if (i === 0) continue;
        break;
      }

      const allCompleted = PRAYER_NAMES.every(
        (p) =>
          log.prayers[p].status === "ontime" ||
          log.prayers[p].status === "late",
      );

      if (allCompleted) {
        streak++;
      } else {
        // If today is incomplete, skip (still in progress)
        if (i === 0) continue;
        break;
      }
    }

    const profile = this.getProfile();
    const longestStreak = Math.max(profile.longestStreak, streak);
    this.setProfile({ streak, longestStreak });

    return { streak, longestStreak };
  }

  // ---- Favorite Hadiths ----

  getFavoriteHadiths(): FavoriteHadith[] {
    return this.read<FavoriteHadith[]>(KEYS.FAVORITE_HADITHS) || [];
  }

  toggleFavoriteHadith(hadith: FavoriteHadith): boolean {
    const favorites = this.getFavoriteHadiths();
    const index = favorites.findIndex((h) => h.id === hadith.id);

    if (index >= 0) {
      favorites.splice(index, 1);
      this.write(KEYS.FAVORITE_HADITHS, favorites);
      return false; // removed
    } else {
      favorites.push(hadith);
      this.write(KEYS.FAVORITE_HADITHS, favorites);
      return true; // added
    }
  }

  isFavoriteHadith(id: string): boolean {
    const favorites = this.getFavoriteHadiths();
    return favorites.some((h) => h.id === id);
  }

  // ---- Quran Bookmarks ----

  getQuranBookmarks(): QuranBookmark[] {
    return this.read<QuranBookmark[]>(KEYS.QURAN_BOOKMARKS) || [];
  }

  addQuranBookmark(surahNumber: number, ayahNumber: number): QuranBookmark {
    const bookmarks = this.getQuranBookmarks();
    const bookmark: QuranBookmark = {
      surahNumber,
      ayahNumber,
      timestamp: new Date().toISOString(),
    };

    // Remove duplicate if same surah+ayah already bookmarked
    const filtered = bookmarks.filter(
      (b) => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber),
    );
    filtered.push(bookmark);
    this.write(KEYS.QURAN_BOOKMARKS, filtered);
    return bookmark;
  }

  removeQuranBookmark(surahNumber: number, ayahNumber: number): void {
    const bookmarks = this.getQuranBookmarks();
    const filtered = bookmarks.filter(
      (b) => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber),
    );
    this.write(KEYS.QURAN_BOOKMARKS, filtered);
  }

  // ---- 99 Names Progress ----

  getNamesProgress(): NamesProgress {
    return (
      this.read<NamesProgress>(KEYS.NAMES_PROGRESS) || {
        learned: [],
        quizHighScore: 0,
      }
    );
  }

  updateNamesProgress(progress: Partial<NamesProgress>): NamesProgress {
    const current = this.getNamesProgress();
    const updated: NamesProgress = {
      learned: progress.learned ?? current.learned,
      quizHighScore:
        progress.quizHighScore !== undefined
          ? Math.max(current.quizHighScore, progress.quizHighScore)
          : current.quizHighScore,
    };
    this.write(KEYS.NAMES_PROGRESS, updated);
    return updated;
  }

  markNameLearned(nameIndex: number): NamesProgress {
    const progress = this.getNamesProgress();
    if (!progress.learned.includes(nameIndex)) {
      progress.learned.push(nameIndex);
      progress.learned.sort((a, b) => a - b);
    }
    this.write(KEYS.NAMES_PROGRESS, progress);
    return progress;
  }

  // ---- Today Stats ----

  getTodayStats(): TodayStats {
    const today = toDateKey();
    const prayerLog = this.getPrayerLog(today);
    const habitLog = this.getHabitLog(today);

    const prayersCompleted = PRAYER_NAMES.filter(
      (p) =>
        prayerLog.prayers[p].status === "ontime" ||
        prayerLog.prayers[p].status === "late",
    ).length;

    const habitsCompleted = HABIT_KEYS.filter((k) => habitLog[k]).length;

    // Calculate points earned today
    let pointsEarned = 0;
    for (const p of PRAYER_NAMES) {
      if (prayerLog.prayers[p].status === "ontime")
        pointsEarned += POINTS.PRAYER_ONTIME;
      else if (prayerLog.prayers[p].status === "late")
        pointsEarned += POINTS.PRAYER_LATE;
    }
    if (habitLog.quran) pointsEarned += POINTS.QURAN;
    if (habitLog.azkar_morning) pointsEarned += POINTS.AZKAR;
    if (habitLog.azkar_evening) pointsEarned += POINTS.AZKAR;
    if (habitLog.charity) pointsEarned += POINTS.CHARITY;
    if (habitLog.fasting) pointsEarned += POINTS.FASTING;
    if (habitLog.dua) pointsEarned += POINTS.DUA;

    return {
      prayersCompleted,
      prayersTotal: 5,
      habitsCompleted,
      habitsTotal: HABIT_KEYS.length,
      pointsEarned,
    };
  }

  // ---- Weekly Stats ----

  getWeeklyStats(): WeeklyStats {
    const days: WeeklyStats["days"] = [];
    const today = new Date();
    let totalPoints = 0;
    let totalPrayers = 0;
    let totalHabits = 0;
    let perfectDays = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = toDateKey(d);

      const prayerLog = this.getPrayerLog(key);
      const habitLog = this.getHabitLog(key);

      const prayersCompleted = PRAYER_NAMES.filter(
        (p) =>
          prayerLog.prayers[p].status === "ontime" ||
          prayerLog.prayers[p].status === "late",
      ).length;

      const habitsCompleted = HABIT_KEYS.filter((k) => habitLog[k]).length;

      // Day points
      let dayPoints = 0;
      for (const p of PRAYER_NAMES) {
        if (prayerLog.prayers[p].status === "ontime")
          dayPoints += POINTS.PRAYER_ONTIME;
        else if (prayerLog.prayers[p].status === "late")
          dayPoints += POINTS.PRAYER_LATE;
      }
      if (habitLog.quran) dayPoints += POINTS.QURAN;
      if (habitLog.azkar_morning) dayPoints += POINTS.AZKAR;
      if (habitLog.azkar_evening) dayPoints += POINTS.AZKAR;
      if (habitLog.charity) dayPoints += POINTS.CHARITY;
      if (habitLog.fasting) dayPoints += POINTS.FASTING;
      if (habitLog.dua) dayPoints += POINTS.DUA;

      days.push({
        date: key,
        prayersCompleted,
        habitsCompleted,
        points: dayPoints,
      });

      totalPoints += dayPoints;
      totalPrayers += prayersCompleted;
      totalHabits += habitsCompleted;

      if (prayersCompleted === 5 && habitsCompleted === HABIT_KEYS.length) {
        perfectDays++;
      }
    }

    return {
      days,
      totalPoints,
      avgPrayers: Math.round((totalPrayers / 7) * 10) / 10,
      avgHabits: Math.round((totalHabits / 7) * 10) / 10,
      perfectDays,
    };
  }

  // ---- Ibadah Sessions ----

  getIbadahSessions(): IbadahSession[] {
    return this.read<IbadahSession[]>(KEYS.IBADAH_SESSIONS) || [];
  }

  addIbadahSession(
    session: Omit<IbadahSession, "date" | "pointsEarned">,
  ): IbadahSession {
    const sessions = this.getIbadahSessions();
    const points = session.durationMinutes * POINTS.IBADAH_MINUTE;
    const entry: IbadahSession = {
      ...session,
      date: toDateKey(),
      pointsEarned: points,
    };
    sessions.push(entry);
    this.write(KEYS.IBADAH_SESSIONS, sessions);
    // Add points to profile
    const profile = this.getProfile();
    profile.totalPoints += points;
    profile.level = getCurrentLevel(profile.totalPoints).name;
    this.write(KEYS.PROFILE, profile);
    return entry;
  }

  getTodayIbadahMinutes(): number {
    const today = toDateKey();
    const sessions = this.getIbadahSessions();
    return sessions
      .filter((s) => s.date === today)
      .reduce((sum, s) => sum + s.durationMinutes, 0);
  }

  getTotalIbadahMinutes(): number {
    return this.getIbadahSessions().reduce(
      (sum, s) => sum + s.durationMinutes,
      0,
    );
  }

  // ---- Memorization ----

  getMemorizationList(): MemorizationSurah[] {
    return this.read<MemorizationSurah[]>(KEYS.MEMORIZATION) || [];
  }

  addMemorizationSurah(surahNumber: number): MemorizationSurah {
    const list = this.getMemorizationList();
    const existing = list.find((s) => s.surahNumber === surahNumber);
    if (existing) return existing;

    const entry: MemorizationSurah = {
      surahNumber,
      addedAt: new Date().toISOString(),
      lastReviewedAt: null,
      reviewCount: 0,
      confidence: 0,
      pointsEarned: 0,
    };
    list.push(entry);
    this.write(KEYS.MEMORIZATION, list);
    return entry;
  }

  removeMemorizationSurah(surahNumber: number): void {
    const list = this.getMemorizationList();
    this.write(
      KEYS.MEMORIZATION,
      list.filter((s) => s.surahNumber !== surahNumber),
    );
  }

  reviewMemorizationSurah(
    surahNumber: number,
    newConfidence: number,
  ): MemorizationSurah | null {
    const list = this.getMemorizationList();
    const entry = list.find((s) => s.surahNumber === surahNumber);
    if (!entry) return null;

    entry.lastReviewedAt = new Date().toISOString();
    entry.reviewCount += 1;
    entry.confidence = Math.min(100, newConfidence);
    entry.pointsEarned += POINTS.MEMORIZE_REPEAT;
    this.write(KEYS.MEMORIZATION, list);

    // Add points
    const profile = this.getProfile();
    profile.totalPoints += POINTS.MEMORIZE_REPEAT;
    profile.level = getCurrentLevel(profile.totalPoints).name;
    this.write(KEYS.PROFILE, profile);

    return entry;
  }

  // ---- Quiz Used IDs (persist across sessions) ----

  getQuizUsedIds(key: string): Set<number> {
    const stored = localStorage.getItem(`iman_quiz_used_${key}`);
    if (!stored) return new Set();
    try {
      return new Set(JSON.parse(stored) as number[]);
    } catch {
      return new Set();
    }
  }

  setQuizUsedIds(key: string, ids: Set<number>): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(`iman_quiz_used_${key}`, JSON.stringify([...ids]));
    this.notifySync();
  }

  clearQuizUsedIds(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`iman_quiz_used_${key}`);
    this.notifySync();
  }

  // ---- Quiz Completion Tracking (one-time scoring) ----

  isQuizScored(key: string): boolean {
    return localStorage.getItem(`iman_quiz_scored_${key}`) === "1";
  }

  markQuizScored(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(`iman_quiz_scored_${key}`, "1");
    this.notifySync();
  }

  // ---- Clear All Data ----

  clearAll(): void {
    if (typeof window === "undefined") return;
    for (const key of Object.values(KEYS)) {
      localStorage.removeItem(key);
    }
  }

  // ---- Sync hook ----

  private notifySync(): void {
    // Dynamic import to avoid circular dependency
    import("./sync").then((m) => m.scheduleSyncPush()).catch(() => {});
  }
}

// ---- Singleton Export ----

export const storage = new Storage();
export default storage;
