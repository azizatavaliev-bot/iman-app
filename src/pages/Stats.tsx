import { useState, useMemo } from "react";
import {
  ChevronLeft,
  Share2,
  Trophy,
  Flame,
  Calendar,
  Star,
} from "lucide-react";
import { storage, POINTS, LEVELS, getCurrentLevel } from "../lib/storage";
import type { UserProfile, WeeklyStats } from "../lib/storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Period = "week" | "month" | "all";

type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
type HabitKey =
  | "quran"
  | "azkar_morning"
  | "azkar_evening"
  | "charity"
  | "fasting"
  | "dua";

interface DayData {
  date: string;
  points: number;
  prayersCompleted: number;
  prayersOntime: number;
  habitsCompleted: number;
}

interface PrayerStat {
  key: PrayerKey;
  label: string;
  emoji: string;
  total: number;
  ontime: number;
  late: number;
  missed: number;
}

interface HabitStat {
  key: HabitKey;
  label: string;
  emoji: string;
  total: number;
  completed: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRAYER_LABELS: Record<PrayerKey, { label: string; emoji: string }> = {
  fajr: { label: "Фаджр", emoji: "\u{1F305}" },
  dhuhr: { label: "Зухр", emoji: "\u{2600}\uFE0F" },
  asr: { label: "Аср", emoji: "\u{1F324}\uFE0F" },
  maghrib: { label: "Магриб", emoji: "\u{1F307}" },
  isha: { label: "Иша", emoji: "\u{1F319}" },
};

const HABIT_LABELS: Record<HabitKey, { label: string; emoji: string }> = {
  quran: { label: "Чтение Корана", emoji: "\u{1F4D6}" },
  azkar_morning: { label: "Утренние азкары", emoji: "\u{1F932}" },
  azkar_evening: { label: "Вечерние азкары", emoji: "\u{1F319}" },
  charity: { label: "Садака", emoji: "\u{1F4B0}" },
  fasting: { label: "Пост", emoji: "\u{1F54C}" },
  dua: { label: "Дуа", emoji: "\u{1F4FF}" },
};

const PRAYER_KEYS: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const HABIT_KEYS: HabitKey[] = [
  "quran",
  "azkar_morning",
  "azkar_evening",
  "charity",
  "fasting",
  "dua",
];

const DAY_LABELS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function pluralDays(n: number): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs >= 11 && abs <= 19) return "дней";
  if (lastDigit === 1) return "день";
  if (lastDigit >= 2 && lastDigit <= 4) return "дня";
  return "дней";
}

function daysSinceJoined(joinedAt: string): number {
  const joined = new Date(joinedAt);
  const now = new Date();
  return Math.max(
    0,
    Math.floor((now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

/** Get date range: last N days ending today */
function getDateRange(days: number): Date[] {
  const result: Date[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    result.push(d);
  }
  return result;
}

/** Compute per-day data for a list of dates */
function computeDayData(dates: Date[]): DayData[] {
  return dates.map((d) => {
    const key = toDateKey(d);
    const prayerLog = storage.getPrayerLog(key);
    const habitLog = storage.getHabitLog(key);

    let points = 0;
    let prayersCompleted = 0;
    let prayersOntime = 0;

    for (const p of PRAYER_KEYS) {
      const s = prayerLog.prayers[p].status;
      if (s === "ontime") {
        points += POINTS.PRAYER_ONTIME;
        prayersCompleted++;
        prayersOntime++;
      } else if (s === "late") {
        points += POINTS.PRAYER_LATE;
        prayersCompleted++;
      }
    }

    let habitsCompleted = 0;
    if (habitLog.quran) {
      points += POINTS.QURAN;
      habitsCompleted++;
    }
    if (habitLog.azkar_morning) {
      points += POINTS.AZKAR;
      habitsCompleted++;
    }
    if (habitLog.azkar_evening) {
      points += POINTS.AZKAR;
      habitsCompleted++;
    }
    if (habitLog.charity) {
      points += POINTS.CHARITY;
      habitsCompleted++;
    }
    if (habitLog.fasting) {
      points += POINTS.FASTING;
      habitsCompleted++;
    }
    if (habitLog.dua) {
      points += POINTS.DUA;
      habitsCompleted++;
    }

    return {
      date: key,
      points,
      prayersCompleted,
      prayersOntime,
      habitsCompleted,
    };
  });
}

/** Compute prayer stats for a list of dates */
function computePrayerStats(dates: Date[]): PrayerStat[] {
  const stats: Record<
    PrayerKey,
    { ontime: number; late: number; missed: number; total: number }
  > = {
    fajr: { ontime: 0, late: 0, missed: 0, total: 0 },
    dhuhr: { ontime: 0, late: 0, missed: 0, total: 0 },
    asr: { ontime: 0, late: 0, missed: 0, total: 0 },
    maghrib: { ontime: 0, late: 0, missed: 0, total: 0 },
    isha: { ontime: 0, late: 0, missed: 0, total: 0 },
  };

  for (const d of dates) {
    const key = toDateKey(d);
    const log = storage.getPrayerLog(key);
    for (const p of PRAYER_KEYS) {
      stats[p].total++;
      const s = log.prayers[p].status;
      if (s === "ontime") stats[p].ontime++;
      else if (s === "late") stats[p].late++;
      else if (s === "missed") stats[p].missed++;
    }
  }

  return PRAYER_KEYS.map((k) => ({
    key: k,
    label: PRAYER_LABELS[k].label,
    emoji: PRAYER_LABELS[k].emoji,
    ...stats[k],
  }));
}

/** Compute habit stats for a list of dates */
function computeHabitStats(dates: Date[]): HabitStat[] {
  const stats: Record<HabitKey, { total: number; completed: number }> = {
    quran: { total: 0, completed: 0 },
    azkar_morning: { total: 0, completed: 0 },
    azkar_evening: { total: 0, completed: 0 },
    charity: { total: 0, completed: 0 },
    fasting: { total: 0, completed: 0 },
    dua: { total: 0, completed: 0 },
  };

  for (const d of dates) {
    const key = toDateKey(d);
    const log = storage.getHabitLog(key);
    for (const h of HABIT_KEYS) {
      stats[h].total++;
      if (log[h]) stats[h].completed++;
    }
  }

  return HABIT_KEYS.map((k) => ({
    key: k,
    label: HABIT_LABELS[k].label,
    emoji: HABIT_LABELS[k].emoji,
    ...stats[k],
  }));
}

// ---------------------------------------------------------------------------
// Circular Progress Component
// ---------------------------------------------------------------------------

function CircularProgress({
  percentage,
  size = 100,
  strokeWidth = 8,
  label,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(percentage, 100) / 100);

  const strokeColor =
    percentage >= 70 ? "#10b981" : percentage >= 40 ? "#f59e0b" : "#ef4444";
  const glowColor =
    percentage >= 70
      ? "rgba(16,185,129,0.5)"
      : percentage >= 40
        ? "rgba(245,158,11,0.5)"
        : "rgba(239,68,68,0.5)";

  return (
    <div className="flex flex-col items-center gap-2">
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
            style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white tabular-nums">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      <span className="text-[11px] text-white/40 font-medium">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress Bar Component
// ---------------------------------------------------------------------------

function ProgressBar({
  value,
  max,
  label,
  emoji,
  showPct = true,
}: {
  value: number;
  max: number;
  label: string;
  emoji: string;
  showPct?: boolean;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{emoji}</span>
          <span className="text-xs text-white/70 font-medium">{label}</span>
        </div>
        <span className="text-[11px] text-white/40 tabular-nums">
          {showPct ? `${Math.round(pct)}%` : `${value}/${max}`}
        </span>
      </div>
      <div className="w-full h-2 t-bg rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out bg-emerald-500"
          style={{
            width: `${Math.min(pct, 100)}%`,
            boxShadow: pct > 0 ? "0 0 8px rgba(16,185,129,0.4)" : "none",
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats Component
// ---------------------------------------------------------------------------

export default function Stats() {
  const [period, setPeriod] = useState<Period>("week");
  const profile: UserProfile = storage.getProfile();
  const weeklyStats: WeeklyStats = storage.getWeeklyStats();

  // Determine date range based on period
  const dates = useMemo(() => {
    if (period === "week") return getDateRange(7);
    if (period === "month") return getDateRange(30);
    // "all" — from joined date to today
    const joined = new Date(profile.joinedAt);
    const today = new Date();
    const diffDays = Math.max(
      1,
      Math.floor((today.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24)) +
        1,
    );
    return getDateRange(Math.min(diffDays, 365)); // cap at 365 days
  }, [period, profile.joinedAt]);

  // Compute aggregated data
  const dayData = useMemo(() => computeDayData(dates), [dates]);
  const prayerStats = useMemo(() => computePrayerStats(dates), [dates]);
  const habitStats = useMemo(() => computeHabitStats(dates), [dates]);

  // Summary numbers
  const totalPoints = useMemo(
    () => dayData.reduce((s, d) => s + d.points, 0),
    [dayData],
  );
  const totalPrayersCompleted = useMemo(
    () => dayData.reduce((s, d) => s + d.prayersCompleted, 0),
    [dayData],
  );
  const totalPrayersOntime = useMemo(
    () => dayData.reduce((s, d) => s + d.prayersOntime, 0),
    [dayData],
  );
  const totalPrayersPossible = dates.length * 5;
  const ontimePct =
    totalPrayersPossible > 0
      ? (totalPrayersOntime / totalPrayersPossible) * 100
      : 0;
  const completedPct =
    totalPrayersPossible > 0
      ? (totalPrayersCompleted / totalPrayersPossible) * 100
      : 0;

  // Chart data — for week show 7 bars, for month show last 30, for all show last 30
  const chartData = useMemo(() => {
    if (period === "week") {
      return dayData.map((d, i) => {
        const dayOfWeek = new Date(d.date + "T00:00:00").getDay();
        // Convert JS Sunday=0 to Mon-based index
        const labelIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        return { ...d, label: DAY_LABELS_SHORT[labelIdx] };
      });
    }
    // For month and all, show the last 30 days at most, label with day number
    const slice = dayData.slice(-30);
    return slice.map((d) => {
      const day = parseInt(d.date.slice(8, 10), 10);
      return { ...d, label: String(day) };
    });
  }, [dayData, period]);

  const maxChartPoints = useMemo(
    () => Math.max(...chartData.map((d) => d.points), 1),
    [chartData],
  );

  // Level / achievement data
  const currentLevel = getCurrentLevel(profile.totalPoints);
  const currentLevelIndex = LEVELS.findIndex(
    (l) => l.name === currentLevel.name,
  );
  const nextLevel = LEVELS.find((l) => l.minPoints > profile.totalPoints);
  const levelProgressPct = nextLevel
    ? Math.min(
        100,
        ((profile.totalPoints - currentLevel.minPoints) /
          (nextLevel.minPoints - currentLevel.minPoints)) *
          100,
      )
    : 100;

  // Reached levels
  const reachedLevels = useMemo(
    () => LEVELS.filter((l) => profile.totalPoints >= l.minPoints),
    [profile.totalPoints],
  );

  // Calendar heatmap data (current month)
  const calendarData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    // Convert Sunday=0 to Monday=0 based
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const cells: {
      day: number;
      points: number;
      isToday: boolean;
      isEmpty: boolean;
    }[] = [];

    // Empty cells for offset
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: 0, points: 0, isToday: false, isEmpty: true });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = toDateKey(d);
      const prayerLog = storage.getPrayerLog(key);
      const habitLog = storage.getHabitLog(key);

      let pts = 0;
      for (const p of PRAYER_KEYS) {
        if (prayerLog.prayers[p].status === "ontime")
          pts += POINTS.PRAYER_ONTIME;
        else if (prayerLog.prayers[p].status === "late")
          pts += POINTS.PRAYER_LATE;
      }
      if (habitLog.quran) pts += POINTS.QURAN;
      if (habitLog.azkar_morning) pts += POINTS.AZKAR;
      if (habitLog.azkar_evening) pts += POINTS.AZKAR;
      if (habitLog.charity) pts += POINTS.CHARITY;
      if (habitLog.fasting) pts += POINTS.FASTING;
      if (habitLog.dua) pts += POINTS.DUA;

      const isToday = key === toDateKey(now);
      cells.push({ day, points: pts, isToday, isEmpty: false });
    }

    return { cells, monthName: MONTH_NAMES[month], year };
  }, []);

  const maxCalPoints = useMemo(
    () =>
      Math.max(
        ...calendarData.cells.filter((c) => !c.isEmpty).map((c) => c.points),
        1,
      ),
    [calendarData],
  );

  // Days since joined
  const daysJoined = daysSinceJoined(profile.joinedAt);

  // Share handler
  function handleShare() {
    const text = [
      `\u{1F54C} IMAN - Моя статистика`,
      ``,
      `${currentLevel.icon} Уровень: ${currentLevel.name}`,
      `\u{2B50} Очков: ${profile.totalPoints.toLocaleString()}`,
      `\u{1F525} Серия: ${profile.streak} ${pluralDays(profile.streak)}`,
      `\u{1F3C6} Лучшая серия: ${profile.longestStreak} ${pluralDays(profile.longestStreak)}`,
      ``,
      `\u{1F4C5} За ${period === "week" ? "неделю" : period === "month" ? "месяц" : "всё время"}:`,
      `   Очков заработано: ${totalPoints}`,
      `   Намазов вовремя: ${Math.round(ontimePct)}%`,
      `   Намазов выполнено: ${Math.round(completedPct)}%`,
      ``,
      `С нами ${daysJoined} ${pluralDays(daysJoined)}`,
    ].join("\n");

    if (navigator.share) {
      navigator.share({ title: "IMAN - Статистика", text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  // =======================================================================
  // RENDER
  // =======================================================================

  return (
    <div className="min-h-screen pb-8 px-4 pt-6 max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* ================================================================ */}
      {/* 1. HEADER                                                        */}
      {/* ================================================================ */}
      <header className="flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <ChevronLeft size={18} className="t-text-s" />
        </button>
        <h1 className="text-xl font-bold text-white flex-1">Статистика</h1>
      </header>

      {/* ================================================================ */}
      {/* 2. PERIOD SELECTOR                                               */}
      {/* ================================================================ */}
      <div className="flex gap-2 t-bg rounded-2xl p-1">
        {[
          { key: "week" as Period, label: "Неделя" },
          { key: "month" as Period, label: "Месяц" },
          { key: "all" as Period, label: "Всё время" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setPeriod(tab.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              period === tab.key
                ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                : "text-white/40 hover:t-text-s"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================================================================ */}
      {/* 3. SUMMARY CARDS (2x2)                                           */}
      {/* ================================================================ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total points */}
        <div className="t-bg backdrop-blur-sm border t-border-s rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-amber-400/10 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trophy size={20} className="text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-white leading-tight">
              {profile.totalPoints.toLocaleString()}
            </p>
            <p className="text-[11px] text-white/40 leading-tight mt-0.5">
              {currentLevel.icon} {currentLevel.name}
            </p>
          </div>
        </div>

        {/* Current streak */}
        <div className="t-bg backdrop-blur-sm border t-border-s rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-orange-400/10 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Flame size={20} className="text-orange-400" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-white leading-tight">
              {profile.streak} {pluralDays(profile.streak)}
            </p>
            <p className="text-[11px] text-white/40 leading-tight mt-0.5">
              {"Текущая серия 🔥"}
            </p>
          </div>
        </div>

        {/* Best streak */}
        <div className="t-bg backdrop-blur-sm border t-border-s rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-purple-400/10 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Star size={20} className="text-purple-400" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-white leading-tight">
              {profile.longestStreak} {pluralDays(profile.longestStreak)}
            </p>
            <p className="text-[11px] text-white/40 leading-tight mt-0.5">
              Лучшая серия
            </p>
          </div>
        </div>

        {/* Days since joined */}
        <div className="t-bg backdrop-blur-sm border t-border-s rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-emerald-400/10 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Calendar size={20} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-white leading-tight">
              {daysJoined} {pluralDays(daysJoined)}
            </p>
            <p className="text-[11px] text-white/40 leading-tight mt-0.5">
              С нами
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 4. CHART — Pure CSS bar chart                                    */}
      {/* ================================================================ */}
      <div className="t-bg backdrop-blur-sm border t-border-s rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
            {period === "week"
              ? "Саваб за неделю"
              : period === "month"
                ? "Саваб за месяц"
                : "Саваб за всё время"}
          </h3>
          <span className="text-xs text-emerald-400/60 font-medium tabular-nums">
            {totalPoints} саваб
          </span>
        </div>

        <div className="flex items-end gap-1" style={{ height: 100 }}>
          {chartData.map((day, i) => {
            const barHeight =
              day.points > 0
                ? Math.max(6, (day.points / maxChartPoints) * 80)
                : 4;
            const opacity =
              day.points > 0 ? 0.3 + (day.points / maxChartPoints) * 0.7 : 0.08;
            const isToday = day.date === toDateKey(new Date());

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1"
                style={{ minWidth: 0 }}
              >
                {/* Points label (only show for week view or every 5th bar) */}
                {(period === "week" || (period !== "week" && i % 5 === 0)) &&
                  day.points > 0 && (
                    <span className="text-[8px] text-white/20 tabular-nums truncate">
                      {day.points}
                    </span>
                  )}

                {/* Bar */}
                <div
                  className={`w-full rounded-t-md transition-all duration-500 ease-out ${
                    isToday ? "ring-1 ring-emerald-400/50" : ""
                  }`}
                  style={{
                    height: barHeight,
                    background:
                      day.points > 0
                        ? `linear-gradient(to top, rgba(16,185,129,${opacity}), rgba(52,211,153,${opacity * 0.8}))`
                        : "rgba(255,255,255,0.04)",
                    maxWidth: period === "week" ? 32 : undefined,
                  }}
                />

                {/* Day label — show for week, or every 5th for month */}
                {(period === "week" ||
                  (period !== "week" &&
                    (i % 5 === 0 || i === chartData.length - 1))) && (
                  <span
                    className={`text-[9px] font-medium truncate ${
                      isToday ? "text-emerald-400" : "text-white/25"
                    }`}
                  >
                    {day.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 5. PRAYER STATS                                                  */}
      {/* ================================================================ */}
      <div className="t-bg backdrop-blur-sm border t-border-s rounded-2xl p-5 space-y-5">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
          Намазы
        </h3>

        {/* Circle + overall stat */}
        <div className="flex items-center gap-6">
          <CircularProgress percentage={ontimePct} size={100} label="Вовремя" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs t-text-m">Выполнено</span>
              <span className="text-sm font-bold text-white tabular-nums">
                {totalPrayersCompleted}/{totalPrayersPossible}
              </span>
            </div>
            <div className="w-full h-2 t-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${completedPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs t-text-m">Вовремя</span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">
                {Math.round(ontimePct)}%
              </span>
            </div>
          </div>
        </div>

        {/* Per-prayer breakdown */}
        <div className="space-y-3 pt-2 border-t t-border">
          {prayerStats.map((stat) => {
            const completionPct =
              stat.total > 0
                ? ((stat.ontime + stat.late) / stat.total) * 100
                : 0;
            return (
              <ProgressBar
                key={stat.key}
                emoji={stat.emoji}
                label={stat.label}
                value={stat.ontime + stat.late}
                max={stat.total}
              />
            );
          })}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 6. HABITS STATS                                                  */}
      {/* ================================================================ */}
      <div className="t-bg backdrop-blur-sm border t-border-s rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
          Привычки
        </h3>

        <div className="space-y-3">
          {habitStats.map((stat) => (
            <ProgressBar
              key={stat.key}
              emoji={stat.emoji}
              label={stat.label}
              value={stat.completed}
              max={stat.total}
            />
          ))}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 7. ACHIEVEMENTS / LEVELS                                         */}
      {/* ================================================================ */}
      <div className="t-bg backdrop-blur-sm border t-border-s rounded-2xl p-5 space-y-5">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
          Достижения
        </h3>

        {/* Progress to next level */}
        {nextLevel && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{currentLevel.icon}</span>
                <span className="text-sm font-semibold text-white">
                  {currentLevel.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-400/80">
                  {nextLevel.icon} {nextLevel.name}
                </span>
              </div>
            </div>
            <div className="w-full h-3 t-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${levelProgressPct}%`,
                  background: "linear-gradient(90deg, #10b981, #34d399)",
                  boxShadow: "0 0 12px rgba(16,185,129,0.4)",
                }}
              />
            </div>
            <p className="text-[10px] text-white/25">
              {profile.totalPoints.toLocaleString()} /{" "}
              {nextLevel.minPoints.toLocaleString()} саваб
              <span className="text-white/15"> --- </span>
              ещё {(
                nextLevel.minPoints - profile.totalPoints
              ).toLocaleString()}{" "}
              до следующего
            </p>
          </div>
        )}

        {/* Reached levels list */}
        <div className="space-y-0 pt-2 border-t t-border">
          {LEVELS.map((level, idx) => {
            const isReached = profile.totalPoints >= level.minPoints;
            const isCurrent = idx === currentLevelIndex;

            return (
              <div
                key={level.name}
                className={`flex items-center gap-3 py-2.5 ${
                  isReached ? "opacity-100" : "opacity-30"
                }`}
              >
                <span
                  className={`text-lg w-8 text-center ${
                    !isReached ? "grayscale" : ""
                  }`}
                >
                  {level.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm font-medium ${
                      isCurrent
                        ? "text-emerald-400"
                        : isReached
                          ? "t-text"
                          : "t-text-f"
                    }`}
                  >
                    {level.name}
                  </span>
                  {isCurrent && (
                    <span className="ml-2 text-[9px] uppercase tracking-widest bg-emerald-500/15 text-emerald-400/80 px-2 py-0.5 rounded-full font-semibold">
                      Сейчас
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-white/20 tabular-nums font-mono">
                  {level.minPoints.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 8. MONTHLY CALENDAR HEATMAP                                      */}
      {/* ================================================================ */}
      <div className="t-bg backdrop-blur-sm border t-border-s rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
            Календарь активности
          </h3>
          <span className="text-xs t-text-f">
            {calendarData.monthName} {calendarData.year}
          </span>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_LABELS_SHORT.map((d) => (
            <div
              key={d}
              className="text-center text-[9px] text-white/25 font-medium pb-1"
            >
              {d}
            </div>
          ))}

          {/* Calendar cells */}
          {calendarData.cells.map((cell, i) => {
            if (cell.isEmpty) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }

            const intensity =
              cell.points > 0 ? Math.min(cell.points / maxCalPoints, 1) : 0;
            // Map intensity to emerald opacity levels
            let bgColor: string;
            if (intensity === 0) {
              bgColor = "rgba(255,255,255,0.03)";
            } else if (intensity < 0.25) {
              bgColor = "rgba(16,185,129,0.15)";
            } else if (intensity < 0.5) {
              bgColor = "rgba(16,185,129,0.30)";
            } else if (intensity < 0.75) {
              bgColor = "rgba(16,185,129,0.50)";
            } else {
              bgColor = "rgba(16,185,129,0.75)";
            }

            return (
              <div
                key={`day-${cell.day}`}
                className={`aspect-square rounded-lg flex items-center justify-center transition-colors ${
                  cell.isToday ? "ring-1 ring-emerald-400/60" : ""
                }`}
                style={{ backgroundColor: bgColor }}
                title={`${cell.day}: ${cell.points} саваб`}
              >
                <span
                  className={`text-[10px] tabular-nums font-medium ${
                    cell.isToday
                      ? "text-emerald-400"
                      : intensity > 0.5
                        ? "text-white/90"
                        : intensity > 0
                          ? "t-text-m"
                          : "text-white/20"
                  }`}
                >
                  {cell.day}
                </span>
              </div>
            );
          })}
        </div>

        {/* Heatmap legend */}
        <div className="flex items-center justify-center gap-2 pt-2 border-t t-border">
          <span className="text-[9px] text-white/25">Мало</span>
          {[0.03, 0.15, 0.3, 0.5, 0.75].map((opacity, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-sm"
              style={{
                backgroundColor:
                  i === 0
                    ? "rgba(255,255,255,0.03)"
                    : `rgba(16,185,129,${opacity})`,
              }}
            />
          ))}
          <span className="text-[9px] text-white/25">Много</span>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 9. SHARE BUTTON                                                  */}
      {/* ================================================================ */}
      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl t-bg backdrop-blur-sm border t-border-s t-text-s text-sm font-medium hover:t-bg hover:t-text active:scale-[0.98] transition-all"
      >
        <Share2 size={16} />
        <span>Поделиться результатами</span>
      </button>

      {/* Bottom spacing for mobile nav */}
      <div className="h-4" />
    </div>
  );
}
