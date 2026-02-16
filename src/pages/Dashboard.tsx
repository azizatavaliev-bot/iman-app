import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Moon,
  BookOpen,
  Quote,
  Star,
  Flame,
  Clock,
  ChevronRight,
  Check,
  X,
  Calendar,
  Target,
  Heart,
  Timer,
  Brain,
  BarChart3,
  Headphones,
} from "lucide-react";
import { storage, getCurrentLevel, LEVELS, POINTS } from "../lib/storage";
import {
  getPrayerTimes,
  getHadithOfDay,
  hapticSuccess,
  hapticImpact,
} from "../lib/api";
import type { PrayerTimes, Hadith } from "../lib/api";
import type { UserProfile, TodayStats, HabitLog } from "../lib/storage";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRAYER_NAMES_MAP: Record<string, string> = {
  Fajr: "Фаджр",
  Dhuhr: "Зухр",
  Asr: "Аср",
  Maghrib: "Магриб",
  Isha: "Иша",
};

const PRAYER_ORDER: (keyof PrayerTimes)[] = [
  "Fajr",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
];

type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

const PRAYER_KEYS: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

const PRAYER_KEY_TO_API: Record<PrayerKey, keyof PrayerTimes> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

const PRAYER_ICONS: Record<PrayerKey, string> = {
  fajr: "\u{1F305}",
  dhuhr: "\u{2600}\u{FE0F}",
  asr: "\u{1F324}\u{FE0F}",
  maghrib: "\u{1F307}",
  isha: "\u{1F319}",
};

type HabitKey = keyof Omit<HabitLog, "date">;

interface HabitDef {
  key: HabitKey;
  label: string;
  emoji: string;
  points: number;
}

const HABITS: HabitDef[] = [
  {
    key: "quran",
    label: "Чтение Корана",
    emoji: "\u{1F4D6}",
    points: POINTS.QURAN,
  },
  {
    key: "azkar_morning",
    label: "Утренние азкары",
    emoji: "\u{1F932}",
    points: POINTS.AZKAR,
  },
  {
    key: "azkar_evening",
    label: "Вечерние азкары",
    emoji: "\u{1F319}",
    points: POINTS.AZKAR,
  },
  {
    key: "charity",
    label: "Садака",
    emoji: "\u{1F4B0}",
    points: POINTS.CHARITY,
  },
  { key: "fasting", label: "Пост", emoji: "\u{1F54C}", points: POINTS.FASTING },
  { key: "dua", label: "Дуа", emoji: "\u{1F4FF}", points: POINTS.DUA },
];

const DEFAULT_LAT = 42.8746;
const DEFAULT_LNG = 74.5698;

// Max possible per day: 5*10 (prayers on time) + 3+2+2+5+15+2 (habits) = 79
const MAX_DAILY_POINTS =
  5 * POINTS.PRAYER_ONTIME + HABITS.reduce((s, h) => s + h.points, 0);

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateKey(date?: Date | string): string {
  if (!date) return new Date().toISOString().slice(0, 10);
  if (typeof date === "string") return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function getGreeting(): { salaam: string; timeGreeting: string } {
  const hour = new Date().getHours();
  let timeGreeting: string;
  if (hour >= 4 && hour < 12) {
    timeGreeting = "Доброе утро";
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = "Добрый день";
  } else {
    timeGreeting = "Добрый вечер";
  }
  return { salaam: "Ас-саляму алейкум!", timeGreeting };
}

function parseTimeToDate(timeStr: string): Date {
  const clean = timeStr.replace(/\s*\(.*\)/, "").trim();
  const [h, m] = clean.split(":").map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
}

function findNextPrayer(times: PrayerTimes): {
  key: PrayerKey;
  apiKey: keyof PrayerTimes;
  russianName: string;
  time: string;
  date: Date;
} | null {
  const now = new Date();

  for (const apiKey of PRAYER_ORDER) {
    const timeStr = times[apiKey];
    const prayerDate = parseTimeToDate(timeStr);
    if (prayerDate > now) {
      const lowerKey = apiKey.toLowerCase() as PrayerKey;
      return {
        key: lowerKey === ("dhuhr" as PrayerKey) ? "dhuhr" : lowerKey,
        apiKey,
        russianName: PRAYER_NAMES_MAP[apiKey],
        time: timeStr.replace(/\s*\(.*\)/, "").trim(),
        date: prayerDate,
      };
    }
  }

  // All prayers have passed -- next is Fajr tomorrow
  const fajrTomorrow = parseTimeToDate(times.Fajr);
  fajrTomorrow.setDate(fajrTomorrow.getDate() + 1);
  return {
    key: "fajr",
    apiKey: "Fajr",
    russianName: PRAYER_NAMES_MAP.Fajr,
    time: times.Fajr.replace(/\s*\(.*\)/, "").trim(),
    date: fajrTomorrow,
  };
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/** Determine which prayer's time window is currently active */
/** Get difference in minutes between now and a prayer time */
function getMinutesSincePrayer(timeStr: string): number | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const now = new Date();
  const d = new Date(now);
  d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
  return Math.round((now.getTime() - d.getTime()) / 60000);
}

/** Get week dates (Mon-Sun) for current week */
function getWeekDates(): Date[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

/** Compute total points for a given day */
function getDayPoints(dateKey: string): number {
  const prayerLog = storage.getPrayerLog(dateKey);
  const habitLog = storage.getHabitLog(dateKey);
  let pts = 0;
  for (const p of PRAYER_KEYS) {
    if (prayerLog.prayers[p].status === "ontime") pts += POINTS.PRAYER_ONTIME;
    else if (prayerLog.prayers[p].status === "late") pts += POINTS.PRAYER_LATE;
  }
  if (habitLog.quran) pts += POINTS.QURAN;
  if (habitLog.azkar_morning) pts += POINTS.AZKAR;
  if (habitLog.azkar_evening) pts += POINTS.AZKAR;
  if (habitLog.charity) pts += POINTS.CHARITY;
  if (habitLog.fasting) pts += POINTS.FASTING;
  if (habitLog.dua) pts += POINTS.AZKAR;
  return pts;
}

// ---------------------------------------------------------------------------
// Circular Progress Ring (for Daily Score)
// ---------------------------------------------------------------------------

function DailyProgressRing({
  earned,
  possible,
  size = 130,
}: {
  earned: number;
  possible: number;
  size?: number;
}) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = possible > 0 ? earned / possible : 0;
  const offset = circumference * (1 - pct);

  let strokeColor: string;
  let glowColor: string;
  if (pct >= 0.7) {
    strokeColor = "#10b981";
    glowColor = "rgba(16,185,129,0.5)";
  } else if (pct >= 0.4) {
    strokeColor = "#f59e0b";
    glowColor = "rgba(245,158,11,0.5)";
  } else {
    strokeColor = "#ef4444";
    glowColor = "rgba(239,68,68,0.5)";
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white tabular-nums">
          {earned}
        </span>
        <span className="text-[11px] text-white/40 font-medium">
          из {possible}
        </span>
        <span className="text-[9px] text-white/25 uppercase tracking-widest mt-0.5">
          очков
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Celebration Particles (confetti burst when marking prayer)
// ---------------------------------------------------------------------------

function CelebrationBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1400);
    return () => clearTimeout(timer);
  }, [onDone]);

  const particles = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => {
      const angle = (i / 20) * 360;
      const distance = 30 + Math.random() * 50;
      const pSize = 3 + Math.random() * 5;
      const colors = [
        "#10b981",
        "#34d399",
        "#6ee7b7",
        "#fbbf24",
        "#f59e0b",
        "#a78bfa",
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const delay = Math.random() * 0.12;
      return { angle, distance, size: pSize, color, delay };
    });
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center">
      <div className="relative">
        <div
          className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/50"
          style={{ animation: "celebration-scale 0.5s ease-out forwards" }}
        >
          <Check className="w-6 h-6 text-white" strokeWidth={3} />
        </div>
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              top: "50%",
              left: "50%",
              marginTop: -p.size / 2,
              marginLeft: -p.size / 2,
              animation: `celebration-particle 0.7s ease-out ${p.delay}s forwards`,
              ["--tx" as string]: `${Math.cos((p.angle * Math.PI) / 180) * p.distance}px`,
              ["--ty" as string]: `${Math.sin((p.angle * Math.PI) / 180) * p.distance}px`,
              opacity: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Floating Points Animation
// ---------------------------------------------------------------------------

function FloatingPoints({
  points,
  id,
  onDone,
}: {
  points: number;
  id: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <span
      key={id}
      className="absolute -top-2 right-2 text-sm font-bold text-emerald-400 pointer-events-none z-50"
      style={{ animation: "float-up 1.2s ease-out forwards" }}
    >
      +{points}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Activity Feed Item
// ---------------------------------------------------------------------------

interface ActivityItem {
  type: "prayer" | "habit";
  key: string;
  label: string;
  emoji: string;
  status: "done" | "pending" | "missed" | "none";
  time?: string | null;
  points: number;
  earnedPoints: number;
}

function ActivityRow({
  item,
  onTap,
  floatingPts,
}: {
  item: ActivityItem;
  onTap: () => void;
  floatingPts: { id: string; points: number } | null;
}) {
  const statusIcon =
    item.status === "done" ? (
      <Check size={14} className="text-emerald-400" />
    ) : item.status === "pending" ? (
      <Clock size={14} className="text-amber-400/60" />
    ) : (
      <X size={14} className="text-red-400/50" />
    );

  const statusBg =
    item.status === "done"
      ? "bg-emerald-500/15 border-emerald-500/25"
      : item.status === "pending"
        ? "bg-white/[0.03] border-white/[0.06]"
        : "bg-white/[0.02] border-white/[0.04]";

  const textColor =
    item.status === "done"
      ? "text-white/90"
      : item.status === "pending"
        ? "t-text-m"
        : "t-text-f";

  return (
    <button
      onClick={onTap}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 active:scale-[0.98] relative ${statusBg}`}
    >
      {/* Status icon */}
      <div className="w-7 h-7 rounded-full t-bg flex items-center justify-center shrink-0">
        {statusIcon}
      </div>

      {/* Time */}
      <span className="text-[11px] font-mono t-text-f w-11 shrink-0 text-left">
        {item.time || "--:--"}
      </span>

      {/* Emoji + Label */}
      <span className="text-sm mr-1">{item.emoji}</span>
      <span className={`text-sm font-medium flex-1 text-left ${textColor}`}>
        {item.label}
        {item.status === "done" && item.type === "prayer" && (
          <span className="text-emerald-400/50 text-xs ml-1.5">вовремя</span>
        )}
      </span>

      {/* Points */}
      <span
        className={`text-xs font-bold tabular-nums ${
          item.earnedPoints > 0 ? "text-emerald-400" : "text-white/15"
        }`}
      >
        {item.earnedPoints > 0 ? `+${item.earnedPoints}` : `0`}
      </span>

      {/* Floating points animation */}
      {floatingPts && (
        <FloatingPoints
          points={floatingPts.points}
          id={floatingPts.id}
          onDone={() => {}}
        />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const navigate = useNavigate();

  // Core state
  const [profile, setProfile] = useState<UserProfile>(storage.getProfile());
  const [todayStats, setTodayStats] = useState<TodayStats>(
    storage.getTodayStats(),
  );
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [nextPrayer, setNextPrayer] =
    useState<ReturnType<typeof findNextPrayer>>(null);
  const [countdown, setCountdown] = useState<string>("--:--:--");
  const [hadith] = useState<Hadith>(getHadithOfDay());
  const [loading, setLoading] = useState(true);

  // Prayer & Habit logs for today
  const todayKey = toDateKey();
  const [prayerLog, setPrayerLog] = useState(() =>
    storage.getPrayerLog(todayKey),
  );
  const [habitLog, setHabitLog] = useState<HabitLog>(() =>
    storage.getHabitLog(todayKey),
  );

  // Animation state
  const [celebrating, setCelebrating] = useState(false);
  const [floatingPts, setFloatingPts] = useState<{
    id: string;
    points: number;
  } | null>(null);

  // Weekly data
  const [weekDates] = useState<Date[]>(getWeekDates);

  const greeting = getGreeting();
  const currentLevel = getCurrentLevel(profile.totalPoints);
  const nextLevel = LEVELS.find((l) => l.minPoints > profile.totalPoints);

  // Level progress
  const levelProgressPct = nextLevel
    ? Math.min(
        100,
        ((profile.totalPoints - currentLevel.minPoints) /
          (nextLevel.minPoints - currentLevel.minPoints)) *
          100,
      )
    : 100;

  // ---------- Refresh all local data ----------
  const refreshAll = useCallback(() => {
    setProfile(storage.getProfile());
    setTodayStats(storage.getTodayStats());
    setPrayerLog(storage.getPrayerLog(todayKey));
    setHabitLog(storage.getHabitLog(todayKey));
  }, [todayKey]);

  // ---------- Cleanup old logs on mount ----------
  useEffect(() => {
    storage.cleanupOldLogs();
  }, []);

  // ---------- Fetch prayer times ----------
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const lat = profile.lat ?? DEFAULT_LAT;
        const lng = profile.lng ?? DEFAULT_LNG;
        const times = await getPrayerTimes(lat, lng);
        if (cancelled) return;
        setPrayerTimes(times);
        setNextPrayer(findNextPrayer(times));
      } catch (err) {
        console.error("Failed to load prayer times:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [profile.lat, profile.lng]);

  // ---------- Countdown timer ----------
  useEffect(() => {
    if (!nextPrayer) return;
    function tick() {
      if (!nextPrayer) return;
      const now = new Date();
      const diffMs = nextPrayer.date.getTime() - now.getTime();
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));
      setCountdown(formatCountdown(diffSec));
      if (diffSec <= 0 && prayerTimes) {
        setNextPrayer(findNextPrayer(prayerTimes));
      }
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextPrayer, prayerTimes]);

  // ---------- Refresh on focus ----------
  useEffect(() => {
    function handleFocus() {
      refreshAll();
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshAll]);

  // ---------- Is next prayer already marked? ----------
  const nextPrayerAlreadyDone = useMemo(() => {
    if (!nextPrayer) return false;
    const entry = prayerLog.prayers[nextPrayer.key];
    return entry.status === "ontime" || entry.status === "late";
  }, [nextPrayer, prayerLog]);

  // ---------- Mark prayer as done from dashboard ----------
  const markPrayerDone = useCallback(
    (prayerKey: PrayerKey) => {
      const currentLog = storage.getPrayerLog(todayKey);
      const currentStatus = currentLog.prayers[prayerKey].status;

      // Already marked? do nothing on dashboard (go to /prayers for full control)
      if (currentStatus === "ontime" || currentStatus === "late") return;

      // Auto-determine on-time vs late
      if (!prayerTimes) return;
      const apiKey = PRAYER_KEY_TO_API[prayerKey];
      const timeStr = prayerTimes[apiKey];
      const diffMinutes = getMinutesSincePrayer(timeStr);

      let status: "ontime" | "late" = "ontime";
      if (diffMinutes !== null && diffMinutes > 30) {
        status = "late";
      }

      currentLog.prayers[prayerKey] = {
        status,
        timestamp: new Date().toISOString(),
      };

      const pts =
        status === "ontime" ? POINTS.PRAYER_ONTIME : POINTS.PRAYER_LATE;
      storage.setPrayerLog(todayKey, currentLog.prayers);
      storage.updateStreak();
      storage.recalculateTotalPoints();

      // Haptic + Animations
      hapticSuccess();
      setCelebrating(true);
      setFloatingPts({ id: `prayer-${prayerKey}-${Date.now()}`, points: pts });
      setTimeout(() => setFloatingPts(null), 1300);

      refreshAll();
    },
    [todayKey, prayerTimes, refreshAll],
  );

  // ---------- Toggle habit ----------
  const toggleHabit = useCallback(
    (habit: HabitDef) => {
      const currentHabitLog = storage.getHabitLog(todayKey);
      const newValue = !currentHabitLog[habit.key];
      const updatedHabits: Omit<HabitLog, "date"> = {
        quran: currentHabitLog.quran,
        azkar_morning: currentHabitLog.azkar_morning,
        azkar_evening: currentHabitLog.azkar_evening,
        charity: currentHabitLog.charity,
        fasting: currentHabitLog.fasting,
        dua: currentHabitLog.dua,
        [habit.key]: newValue,
      };

      storage.setHabitLog(todayKey, updatedHabits);
      storage.recalculateTotalPoints();

      if (newValue) {
        hapticImpact("light");
        setFloatingPts({
          id: `habit-${habit.key}-${Date.now()}`,
          points: habit.points,
        });
        setTimeout(() => setFloatingPts(null), 1300);
      }

      refreshAll();
    },
    [todayKey, refreshAll],
  );

  // ---------- Build activity feed ----------
  const activityItems: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    // Prayers
    for (const pk of PRAYER_KEYS) {
      const entry = prayerLog.prayers[pk];
      const apiKey = PRAYER_KEY_TO_API[pk];
      const timeStr = prayerTimes
        ? prayerTimes[apiKey]?.replace(/\s*\(.*\)/, "").trim()
        : null;

      let status: ActivityItem["status"] = "none";
      let earnedPts = 0;
      if (entry.status === "ontime") {
        status = "done";
        earnedPts = POINTS.PRAYER_ONTIME;
      } else if (entry.status === "late") {
        status = "done";
        earnedPts = POINTS.PRAYER_LATE;
      } else if (entry.status === "missed") {
        status = "missed";
      } else {
        // Check if prayer time has passed
        if (prayerTimes) {
          const diff = getMinutesSincePrayer(prayerTimes[apiKey]);
          if (diff !== null && diff > 0) {
            // Time has passed but not marked — show as pending (could still mark)
            status = "none";
          } else {
            status = "pending";
          }
        } else {
          status = "pending";
        }
      }

      const recordedTime = entry.timestamp
        ? new Date(entry.timestamp).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : timeStr;

      items.push({
        type: "prayer",
        key: pk,
        label: PRAYER_NAMES_MAP[apiKey],
        emoji: PRAYER_ICONS[pk],
        status,
        time: status === "done" ? recordedTime : timeStr,
        points: POINTS.PRAYER_ONTIME,
        earnedPoints: earnedPts,
      });
    }

    // Habits
    for (const h of HABITS) {
      const done = habitLog[h.key];
      items.push({
        type: "habit",
        key: h.key,
        label: h.label,
        emoji: h.emoji,
        status: done ? "done" : "none",
        time: null,
        points: h.points,
        earnedPoints: done ? h.points : 0,
      });
    }

    return items;
  }, [prayerLog, habitLog, prayerTimes]);

  // ---------- Stats ----------
  const streak = profile.streak;
  const prayersCompleted = todayStats.prayersCompleted;
  const habitsCompleted = todayStats.habitsCompleted;
  const pointsEarned = todayStats.pointsEarned;
  const overallPct = MAX_DAILY_POINTS > 0 ? pointsEarned / MAX_DAILY_POINTS : 0;

  // ---------- Weekly bar data ----------
  const weeklyBarData = useMemo(() => {
    const todayStr = toDateKey();
    return weekDates.map((d, i) => {
      const key = toDateKey(d);
      const pts = getDayPoints(key);
      const isToday = key === todayStr;
      const isFuture = key > todayStr;
      return {
        date: key,
        dayLabel: DAY_LABELS[i],
        points: pts,
        isToday,
        isFuture,
      };
    });
  }, [weekDates, todayStats]); // re-calc when todayStats changes

  const maxWeekPoints = Math.max(...weeklyBarData.map((d) => d.points), 1);

  // =======================================================================
  // RENDER
  // =======================================================================

  return (
    <div className="min-h-screen pb-8 px-4 pt-6 max-w-lg mx-auto space-y-5 animate-fade-in">
      {/* Celebration overlay */}
      {celebrating && <CelebrationBurst onDone={() => setCelebrating(false)} />}

      {/* ================================================================ */}
      {/* 1. HEADER                                                        */}
      {/* ================================================================ */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">
            {greeting.salaam}
          </h1>
          <p className="text-sm t-text-m mt-0.5">
            {greeting.timeGreeting}
            {profile.name ? `, ${profile.name}` : ""}
          </p>
        </div>
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-1.5 glass-card px-3 py-1.5 text-xs font-medium text-amber-400 hover:scale-105 active:scale-95 transition-transform"
        >
          <span>{currentLevel.icon}</span>
          <span>{currentLevel.name}</span>
        </button>
      </header>

      {/* ================================================================ */}
      {/* INSTRUCTION BANNER                                               */}
      {/* ================================================================ */}
      <div className="glass-card p-4 border border-emerald-500/20 animate-fade-in">
        <p className="text-xs text-emerald-300/90 leading-relaxed">
          <span className="font-semibold text-emerald-400">
            Ас-саляму алейкум!
          </span>{" "}
          Мы тратим часы на дунью, но забываем уделить время дину. Это
          приложение — ваш помощник: уделяйте{" "}
          <span className="text-white font-medium">5–10 минут в день</span>{" "}
          намазу, Корану, хадисам и дуа в формате игры. Намерение (ният): ради
          довольства Аллаха.
        </p>
      </div>

      {/* ================================================================ */}
      {/* 2. DAILY SCORE CARD                                              */}
      {/* ================================================================ */}
      <div className="glass-card p-5 relative overflow-hidden">
        {/* Decorative glow based on completion */}
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{
            background:
              overallPct >= 0.7
                ? "rgba(16,185,129,0.08)"
                : overallPct >= 0.4
                  ? "rgba(245,158,11,0.08)"
                  : "rgba(239,68,68,0.06)",
          }}
        />

        <div className="flex items-center gap-5">
          <DailyProgressRing
            earned={pointsEarned}
            possible={MAX_DAILY_POINTS}
            size={120}
          />

          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5">
              Сегодня
            </p>
            <p className="text-lg font-bold text-white">
              {pointsEarned}
              <span className="t-text-f font-normal">/{MAX_DAILY_POINTS}</span>
            </p>
            <p className="text-xs t-text-m mt-1.5">
              <span
                className={prayersCompleted === 5 ? "text-emerald-400" : ""}
              >
                {prayersCompleted}/5 намазов
              </span>
              <span className="text-white/20 mx-1.5">&middot;</span>
              <span
                className={
                  habitsCompleted === HABITS.length ? "text-emerald-400" : ""
                }
              >
                {habitsCompleted}/{HABITS.length} привычек
              </span>
            </p>

            {/* Micro progress bar */}
            <div className="w-full h-1.5 t-bg rounded-full overflow-hidden mt-3">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.round(overallPct * 100)}%`,
                  background:
                    overallPct >= 0.7
                      ? "linear-gradient(90deg, #10b981, #34d399)"
                      : overallPct >= 0.4
                        ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                        : "linear-gradient(90deg, #ef4444, #f87171)",
                }}
              />
            </div>
            <p className="text-[10px] text-white/25 mt-1 text-right">
              {Math.round(overallPct * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 3. NEXT PRAYER TIMER + "ПРОЧИТАЛ" BUTTON                        */}
      {/* ================================================================ */}
      <div className="glass-card glow-green p-5 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : nextPrayer ? (
          <>
            <div className="flex items-center gap-2 text-emerald-400/70 text-xs font-medium uppercase tracking-widest mb-3">
              <Clock size={14} />
              <span>Следующий намаз</span>
            </div>

            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold text-white">
                  {nextPrayer.russianName}
                </h2>
                <p className="text-lg t-text-s mt-1">{nextPrayer.time}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/40 mb-1">через</p>
                <p className="text-2xl font-mono font-bold text-emerald-400 tabular-nums tracking-tight">
                  {countdown}
                </p>
              </div>
            </div>

            {/* "Прочитал" button right here on the dashboard */}
            {nextPrayerAlreadyDone ? (
              <div className="w-full py-3 rounded-2xl text-sm font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center gap-2 cursor-default">
                <Check size={18} strokeWidth={2.5} />
                Прочитано
              </div>
            ) : (
              <button
                onClick={() => markPrayerDone(nextPrayer.key)}
                className="w-full py-3 rounded-2xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-white transition-all duration-200 active:scale-[0.97] shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
              >
                <Check size={18} strokeWidth={2.5} />
                Прочитал
              </button>
            )}
          </>
        ) : (
          <p className="t-text-m text-sm text-center py-4">
            Не удалось загрузить время намазов
          </p>
        )}
      </div>

      {/* ================================================================ */}
      {/* 4. TODAY'S ACTIVITY FEED                                         */}
      {/* ================================================================ */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
            Активность сегодня
          </h3>
          <span className="text-[10px] text-white/20">
            {activityItems.filter((a) => a.status === "done").length}/
            {activityItems.length} выполнено
          </span>
        </div>

        {/* Prayer items */}
        {activityItems
          .filter((a) => a.type === "prayer")
          .map((item) => (
            <ActivityRow
              key={item.key}
              item={item}
              onTap={() => {
                if (item.status === "done") {
                  navigate("/prayers");
                } else {
                  markPrayerDone(item.key as PrayerKey);
                }
              }}
              floatingPts={
                floatingPts && floatingPts.id.includes(item.key)
                  ? floatingPts
                  : null
              }
            />
          ))}

        {/* Divider */}
        <div className="flex items-center gap-2 py-1.5 px-1">
          <div className="flex-1 h-px t-bg" />
          <span className="text-[9px] text-white/20 uppercase tracking-widest">
            Привычки
          </span>
          <div className="flex-1 h-px t-bg" />
        </div>

        {/* Habit items */}
        {activityItems
          .filter((a) => a.type === "habit")
          .map((item) => (
            <ActivityRow
              key={item.key}
              item={item}
              onTap={() => {
                const habit = HABITS.find((h) => h.key === item.key);
                if (habit) toggleHabit(habit);
              }}
              floatingPts={
                floatingPts && floatingPts.id.includes(item.key)
                  ? floatingPts
                  : null
              }
            />
          ))}
      </div>

      {/* ================================================================ */}
      {/* 5. STREAK + LEVEL PROGRESS (combined card)                       */}
      {/* ================================================================ */}
      <div className="glass-card p-4 relative overflow-hidden">
        {/* Fire glow for streak > 7 */}
        {streak > 7 && (
          <div className="absolute -bottom-6 left-8 w-24 h-24 bg-amber-500/15 rounded-full blur-2xl pointer-events-none animate-pulse" />
        )}

        <div className="flex items-center gap-5">
          {/* Left: Streak */}
          <div className="flex items-center gap-3">
            <Flame
              size={32}
              className={
                streak > 7
                  ? "text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                  : streak > 0
                    ? "text-amber-400/70"
                    : "text-white/20"
              }
              fill={streak > 0 ? "currentColor" : "none"}
              style={
                streak > 7
                  ? { animation: "streak-flame 1.5s ease-in-out infinite" }
                  : {}
              }
            />
            <div>
              <p className="text-2xl font-black text-white tabular-nums">
                {streak}
              </p>
              <p className="text-[10px] text-white/40">
                {streak === 1
                  ? "день подряд"
                  : streak >= 2 && streak <= 4
                    ? "дня подряд"
                    : "дней подряд"}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-12 t-bg" />

          {/* Right: Level progress */}
          <button
            onClick={() => navigate("/profile")}
            className="flex-1 min-w-0 group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{currentLevel.icon}</span>
                <span className="text-xs font-semibold t-text">
                  {currentLevel.name}
                </span>
              </div>
              {nextLevel ? (
                <span className="text-[10px] t-text-f group-hover:t-text-m transition-colors flex items-center gap-0.5">
                  {profile.totalPoints}/{nextLevel.minPoints}
                  <ChevronRight size={10} />
                </span>
              ) : (
                <span className="text-[10px] text-amber-400/70">MAX</span>
              )}
            </div>
            <div className="w-full h-2 t-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${levelProgressPct}%`,
                  background:
                    levelProgressPct >= 100
                      ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                      : "linear-gradient(90deg, #10b981, #34d399)",
                  boxShadow:
                    levelProgressPct >= 100
                      ? "0 0 12px rgba(245,158,11,0.4)"
                      : "0 0 12px rgba(16,185,129,0.4)",
                }}
              />
            </div>
            {nextLevel && (
              <p className="text-[9px] text-white/20 mt-1">
                Ещё {nextLevel.minPoints - profile.totalPoints} до{" "}
                <span className="text-amber-400/40">
                  {nextLevel.icon} {nextLevel.name}
                </span>
              </p>
            )}
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 6. HADITH OF THE DAY                                             */}
      {/* ================================================================ */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="absolute -top-8 -left-8 w-32 h-32 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2 text-amber-400/70 text-xs font-medium uppercase tracking-widest mb-4">
          <Quote size={14} />
          <span>Хадис дня</span>
        </div>

        <p className="arabic-text text-xl text-white/90 leading-loose mb-4">
          {hadith.arabic}
        </p>

        <p className="text-sm text-white/70 leading-relaxed mb-4">
          {hadith.russian}
        </p>

        <div className="flex items-center justify-between pt-3 border-t t-border">
          <p className="text-[11px] t-text-f">{hadith.narrator}</p>
          <p className="text-[11px] text-amber-400/40 font-medium">
            {hadith.source}
          </p>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 7. QUICK ACTIONS — 3x2 GRID                                      */}
      {/* ================================================================ */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            icon: Moon,
            label: "Намазы",
            path: "/prayers",
            color: "text-emerald-400",
            bg: "bg-emerald-400/10",
          },
          {
            icon: BookOpen,
            label: "Коран",
            path: "/quran",
            color: "text-sky-400",
            bg: "bg-sky-400/10",
          },
          {
            icon: Quote,
            label: "Хадисы",
            path: "/hadiths",
            color: "text-amber-400",
            bg: "bg-amber-400/10",
          },
          {
            icon: Star,
            label: "99 Имён",
            path: "/names",
            color: "text-purple-400",
            bg: "bg-purple-400/10",
          },
          {
            icon: Heart,
            label: "Дуа",
            path: "/dua",
            color: "text-pink-400",
            bg: "bg-pink-400/10",
          },
          {
            icon: Brain,
            label: "Викторина",
            path: "/quiz",
            color: "text-orange-400",
            bg: "bg-orange-400/10",
          },
          {
            icon: Timer,
            label: "Ибада",
            path: "/ibadah",
            color: "text-cyan-400",
            bg: "bg-cyan-400/10",
          },
          {
            icon: Headphones,
            label: "Хифз",
            path: "/memorize",
            color: "text-violet-400",
            bg: "bg-violet-400/10",
          },
          {
            icon: Target,
            label: "Привычки",
            path: "/habits",
            color: "text-rose-400",
            bg: "bg-rose-400/10",
          },
          {
            icon: Calendar,
            label: "Зикры",
            path: "/dhikr",
            color: "text-teal-400",
            bg: "bg-teal-400/10",
          },
          {
            icon: Moon,
            label: "Рамадан",
            path: "/ramadan",
            color: "text-indigo-400",
            bg: "bg-indigo-400/10",
          },
          {
            icon: BarChart3,
            label: "Статистика",
            path: "/stats",
            color: "text-lime-400",
            bg: "bg-lime-400/10",
          },
          {
            icon: BookOpen,
            label: "Сира",
            path: "/seerah",
            color: "text-rose-400",
            bg: "bg-rose-400/10",
          },
        ].map(({ icon: Icon, label, path, color, bg }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="glass-card p-3 flex flex-col items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
          >
            <div
              className={`${bg} w-11 h-11 rounded-xl flex items-center justify-center`}
            >
              <Icon size={20} className={color} />
            </div>
            <span className="text-[11px] text-white/70 font-medium">
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* ================================================================ */}
      {/* 8. WEEKLY OVERVIEW — Mini 7-day bar chart                        */}
      {/* ================================================================ */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
          Неделя
        </h3>

        <div
          className="flex items-end justify-between gap-2"
          style={{ height: 80 }}
        >
          {weeklyBarData.map((day) => {
            const barHeight = day.isFuture
              ? 0
              : Math.max(4, (day.points / maxWeekPoints) * 64);
            let barColor = "t-bg";
            if (!day.isFuture && day.points > 0) {
              if (day.points >= 50) barColor = "bg-emerald-500/70";
              else if (day.points >= 20) barColor = "bg-amber-500/60";
              else barColor = "bg-white/20";
            }

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1.5"
              >
                {/* Points label */}
                <span className="text-[9px] text-white/20 tabular-nums">
                  {day.isFuture ? "" : day.points > 0 ? day.points : ""}
                </span>

                {/* Bar */}
                <div
                  className={`w-full max-w-[28px] rounded-t-md transition-all duration-500 ease-out ${barColor} ${
                    day.isToday ? "ring-1 ring-emerald-400/40" : ""
                  }`}
                  style={{ height: barHeight }}
                />

                {/* Day label */}
                <span
                  className={`text-[10px] font-medium ${
                    day.isToday ? "text-emerald-400" : "t-text-f"
                  }`}
                >
                  {day.dayLabel}
                </span>

                {/* Today dot */}
                {day.isToday && (
                  <div className="w-1 h-1 rounded-full bg-emerald-400 -mt-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t t-border">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70" />
            <span className="text-[9px] text-white/25">&gt;50 очков</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/60" />
            <span className="text-[9px] text-white/25">&gt;20 очков</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-white/20" />
            <span className="text-[9px] text-white/25">&lt;20 очков</span>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* INLINE KEYFRAME STYLES                                           */}
      {/* ================================================================ */}
      <style>{`
        @keyframes celebration-scale {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes celebration-particle {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes float-up {
          0% { opacity: 0; transform: translateY(8px) scale(0.7); }
          30% { opacity: 1; transform: translateY(-4px) scale(1.15); }
          60% { transform: translateY(-12px) scale(1); }
          100% { opacity: 0; transform: translateY(-24px) scale(0.8); }
        }
        @keyframes streak-flame {
          0%, 100% { transform: scaleY(1) scaleX(1); }
          25% { transform: scaleY(1.15) scaleX(0.9); }
          50% { transform: scaleY(0.95) scaleX(1.05); }
          75% { transform: scaleY(1.1) scaleX(0.95); }
        }
      `}</style>
    </div>
  );
}
