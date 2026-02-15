import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Sun,
  Moon,
  Heart,
  Utensils,
  HandHeart,
  ChevronLeft,
} from "lucide-react";
import { storage, POINTS } from "../lib/storage";
import type { HabitLog } from "../lib/storage";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

type HabitKey = keyof Omit<HabitLog, "date">;

interface HabitDef {
  key: HabitKey;
  label: string;
  emoji: string;
  icon: typeof BookOpen;
  points: number;
  color: string;
  bgColor: string;
}

const HABITS: HabitDef[] = [
  {
    key: "quran",
    label: "Чтение Корана",
    emoji: "\u{1F4D6}",
    icon: BookOpen,
    points: POINTS.QURAN,
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
  },
  {
    key: "azkar_morning",
    label: "Утренние азкары",
    emoji: "\u{1F932}",
    icon: Sun,
    points: POINTS.AZKAR,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
  },
  {
    key: "azkar_evening",
    label: "Вечерние азкары",
    emoji: "\u{1F319}",
    icon: Moon,
    points: POINTS.AZKAR,
    color: "text-indigo-400",
    bgColor: "bg-indigo-400/10",
  },
  {
    key: "charity",
    label: "Садака",
    emoji: "\u{1F4B0}",
    icon: Heart,
    points: POINTS.CHARITY,
    color: "text-rose-400",
    bgColor: "bg-rose-400/10",
  },
  {
    key: "fasting",
    label: "Пост",
    emoji: "\u{1F54C}",
    icon: Utensils,
    points: POINTS.FASTING,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
  },
  {
    key: "dua",
    label: "Дуа",
    emoji: "\u{1F4FF}",
    icon: HandHeart,
    points: POINTS.AZKAR,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
  },
];

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Get Monday-based week dates ending with today's week */
function getWeekDates(): Date[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  // Convert to Monday-based index (Mon=0, Sun=6)
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

/** Calculate streak for a single habit (consecutive days backwards from yesterday/today) */
function getHabitStreak(habitKey: HabitKey): number {
  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const log = storage.getHabitLog(d);

    if (log[habitKey]) {
      streak++;
    } else {
      // If today hasn't been completed yet, skip it (day still in progress)
      if (i === 0) continue;
      break;
    }
  }

  return streak;
}

// ---------------------------------------------------------------------------
// Toggle Switch Component
// ---------------------------------------------------------------------------

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-300 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50
        ${checked ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]" : "t-bg"}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-[22px] w-[22px] rounded-full
          bg-white shadow-lg ring-0 transition-transform duration-300 ease-in-out
          ${checked ? "translate-x-[22px]" : "translate-x-0.5"}
        `}
        style={{ marginTop: "1px" }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Daily Progress Ring Component
// ---------------------------------------------------------------------------

function ProgressRing({
  completed,
  total,
  size = 130,
}: {
  completed: number;
  total: number;
  size?: number;
}) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const offset = circumference * (1 - progress);

  const isComplete = completed === total && total > 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isComplete ? "#10b981" : "#10b981"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          style={{
            filter: isComplete
              ? "drop-shadow(0 0 10px rgba(16,185,129,0.6))"
              : "drop-shadow(0 0 6px rgba(16,185,129,0.3))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-3xl font-bold ${isComplete ? "text-emerald-400" : "text-white"}`}
        >
          {completed}/{total}
        </span>
        <span className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
          привычек
        </span>
        {isComplete && (
          <span className="text-xs text-emerald-400/80 mt-1 animate-pulse">
            Отлично!
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Points Toast Component
// ---------------------------------------------------------------------------

function PointsToast({
  points,
  habitKey,
}: {
  points: number;
  habitKey: string;
}) {
  return (
    <span
      key={`${habitKey}-${Date.now()}`}
      className="
        inline-block ml-2 text-sm font-bold text-emerald-400
        animate-bounce-up
      "
    >
      +{points}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Weekly Heatmap Component
// ---------------------------------------------------------------------------

function WeeklyHeatmap({ weekDates }: { weekDates: Date[] }) {
  const today = toDateKey(new Date());

  // Fetch habit logs for the week
  const weekLogs: HabitLog[] = weekDates.map((d) => storage.getHabitLog(d));

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-widest mb-4">
        Неделя
      </h3>

      <div className="grid grid-cols-7 gap-1.5">
        {/* Day labels */}
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={`text-center text-[10px] font-medium mb-1 ${
              toDateKey(weekDates[i]) === today
                ? "text-emerald-400"
                : "t-text-f"
            }`}
          >
            {label}
          </div>
        ))}

        {/* Heatmap cells: 6 rows (habits) x 7 columns (days) */}
        {HABITS.map((habit) =>
          weekDates.map((date, dayIdx) => {
            const log = weekLogs[dayIdx];
            const done = log[habit.key];
            const isFuture = toDateKey(date) > today;
            const isToday = toDateKey(date) === today;

            return (
              <div
                key={`${habit.key}-${dayIdx}`}
                title={`${habit.label} - ${DAY_LABELS[dayIdx]}`}
                className={`
                  h-5 rounded-sm transition-all duration-300
                  ${isFuture ? "bg-white/[0.02]" : done ? "bg-emerald-500/70 shadow-[0_0_4px_rgba(16,185,129,0.3)]" : "bg-white/[0.06]"}
                  ${isToday && !done && !isFuture ? "ring-1 ring-emerald-500/30" : ""}
                `}
              />
            );
          }),
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-white/[0.06]" />
          <span className="text-[10px] t-text-f">Не выполнено</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/70" />
          <span className="text-[10px] t-text-f">Выполнено</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Streak Section Component
// ---------------------------------------------------------------------------

function StreakSection() {
  const streaks = HABITS.map((h) => ({
    ...h,
    streak: getHabitStreak(h.key),
  }));

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-widest mb-4">
        Серии дней
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {streaks.map(({ key, label, emoji, streak, color }) => (
          <div
            key={key}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]"
          >
            <span className="text-lg">{emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs t-text-m truncate">{label}</p>
              <p
                className={`text-lg font-bold ${streak > 0 ? color : "text-white/20"}`}
              >
                {streak}
                <span className="text-[10px] t-text-f font-normal ml-1">
                  {streak === 1
                    ? "день"
                    : streak >= 2 && streak <= 4
                      ? "дня"
                      : "дней"}
                </span>
              </p>
            </div>
            {streak >= 7 && (
              <span
                className="text-amber-400 animate-pulse"
                title="Серия 7+ дней!"
              >
                {"\u{1F525}"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Habits Component
// ---------------------------------------------------------------------------

export default function Habits() {
  const navigate = useNavigate();
  const today = new Date();
  const dateKey = toDateKey(today);

  const [habitLog, setHabitLog] = useState<HabitLog>(
    storage.getHabitLog(dateKey),
  );
  const [recentToggle, setRecentToggle] = useState<{
    key: string;
    points: number;
  } | null>(null);
  const [weekDates] = useState<Date[]>(getWeekDates);

  // Count completed habits
  const completedCount = HABITS.filter((h) => habitLog[h.key]).length;

  // Handle toggling a habit
  const toggleHabit = useCallback(
    (habit: HabitDef) => {
      const newValue = !habitLog[habit.key];
      const updatedHabits: Omit<HabitLog, "date"> = {
        quran: habitLog.quran,
        azkar_morning: habitLog.azkar_morning,
        azkar_evening: habitLog.azkar_evening,
        charity: habitLog.charity,
        fasting: habitLog.fasting,
        dua: habitLog.dua,
        [habit.key]: newValue,
      };

      // Persist
      const updatedLog = storage.setHabitLog(dateKey, updatedHabits);
      setHabitLog(updatedLog);

      // Recalculate total points from source of truth
      storage.recalculateTotalPoints();

      if (newValue) {
        setRecentToggle({ key: habit.key, points: habit.points });

        // Clear the toast after animation
        setTimeout(() => {
          setRecentToggle((prev) =>
            prev && prev.key === habit.key ? null : prev,
          );
        }, 1200);
      }
    },
    [habitLog, dateKey],
  );

  // Refresh on window focus (e.g., switching back to the app)
  useEffect(() => {
    function handleFocus() {
      setHabitLog(storage.getHabitLog(dateKey));
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [dateKey]);

  return (
    <div className="min-h-screen pb-8 px-4 pt-6 max-w-lg mx-auto space-y-5 animate-fade-in">
      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}
      <header className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="glass-card p-2 hover:scale-105 active:scale-95 transition-transform"
        >
          <ChevronLeft size={20} className="text-white/70" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Трекер привычек</h1>
          <p className="text-xs text-white/40 capitalize mt-0.5">
            {formatDate(today)}
          </p>
        </div>
      </header>

      {/* ================================================================ */}
      {/* DAILY PROGRESS RING                                              */}
      {/* ================================================================ */}
      <div className="glass-card p-6 flex flex-col items-center relative overflow-hidden">
        {/* Decorative glow */}
        {completedCount === HABITS.length && (
          <div className="absolute inset-0 bg-emerald-500/[0.04] pointer-events-none" />
        )}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/[0.06] rounded-full blur-3xl pointer-events-none" />

        <ProgressRing completed={completedCount} total={HABITS.length} />
      </div>

      {/* ================================================================ */}
      {/* TODAY'S HABITS CHECKLIST                                         */}
      {/* ================================================================ */}
      <div className="space-y-3">
        {HABITS.map((habit) => {
          const Icon = habit.icon;
          const checked = habitLog[habit.key];
          const showToast = recentToggle?.key === habit.key;

          return (
            <div
              key={habit.key}
              className={`
                glass-card p-4 flex items-center gap-4 transition-all duration-300
                ${checked ? "ring-1 ring-emerald-500/20 bg-emerald-500/[0.04]" : ""}
              `}
            >
              {/* Icon */}
              <div
                className={`
                  w-11 h-11 rounded-xl flex items-center justify-center shrink-0
                  transition-all duration-300
                  ${checked ? "bg-emerald-500/15" : habit.bgColor}
                `}
              >
                <Icon
                  size={20}
                  className={`transition-colors duration-300 ${
                    checked ? "text-emerald-400" : habit.color
                  }`}
                />
              </div>

              {/* Label & points */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm font-medium transition-colors duration-300 ${
                      checked ? "text-emerald-300" : "text-white/90"
                    }`}
                  >
                    {habit.emoji} {habit.label}
                  </p>
                  {showToast && (
                    <PointsToast points={habit.points} habitKey={habit.key} />
                  )}
                </div>
                <p className="text-[11px] t-text-f mt-0.5">
                  +{habit.points} очков
                </p>
              </div>

              {/* Toggle */}
              <ToggleSwitch
                checked={checked}
                onChange={() => toggleHabit(habit)}
              />
            </div>
          );
        })}
      </div>

      {/* ================================================================ */}
      {/* WEEKLY HEATMAP                                                   */}
      {/* ================================================================ */}
      <WeeklyHeatmap weekDates={weekDates} />

      {/* ================================================================ */}
      {/* STREAK SECTION                                                   */}
      {/* ================================================================ */}
      <StreakSection />

      {/* ================================================================ */}
      {/* INLINE KEYFRAME STYLE (for bounce-up animation)                  */}
      {/* ================================================================ */}
      <style>{`
        @keyframes bounce-up {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.8);
          }
          40% {
            opacity: 1;
            transform: translateY(-4px) scale(1.1);
          }
          60% {
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-12px) scale(0.9);
          }
        }
        .animate-bounce-up {
          animation: bounce-up 1.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
