import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Award,
  RotateCcw,
  Zap,
  Target,
} from "lucide-react";
import { DHIKR_DATA, DHIKR_CATEGORIES } from "../data/dhikr";
import type { Dhikr } from "../data/dhikr";
import { storage, POINTS } from "../lib/storage";
import { scheduleSyncPush } from "../lib/sync";

// ============================================================
// Types
// ============================================================

interface DhikrProgress {
  [date: string]: {
    [category: string]: {
      completed: number[]; // IDs of completed dhikr
      totalTaps: number;
    };
  };
}

type ViewMode = "main" | "practice" | "complete";

// ============================================================
// Helpers
// ============================================================

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getProgress(): DhikrProgress {
  try {
    const raw = localStorage.getItem("iman_dhikr_progress");
    if (raw) return JSON.parse(raw) as DhikrProgress;
  } catch {
    /* ignore */
  }
  return {};
}

function saveProgress(progress: DhikrProgress): void {
  localStorage.setItem("iman_dhikr_progress", JSON.stringify(progress));
  scheduleSyncPush();
}

function getCategoryProgress(categoryId: string): {
  completed: number[];
  totalTaps: number;
} {
  const progress = getProgress();
  const today = todayKey();
  return progress[today]?.[categoryId] || { completed: [], totalTaps: 0 };
}

function markDhikrCompleted(
  categoryId: string,
  dhikrId: number,
  taps: number,
): void {
  const progress = getProgress();
  const today = todayKey();
  if (!progress[today]) progress[today] = {};
  if (!progress[today][categoryId])
    progress[today][categoryId] = { completed: [], totalTaps: 0 };
  if (!progress[today][categoryId].completed.includes(dhikrId)) {
    progress[today][categoryId].completed.push(dhikrId);
  }
  progress[today][categoryId].totalTaps += taps;
  saveProgress(progress);
}

function getTotalTapsToday(): number {
  const progress = getProgress();
  const today = todayKey();
  if (!progress[today]) return 0;
  return Object.values(progress[today]).reduce(
    (sum, cat) => sum + cat.totalTaps,
    0,
  );
}

function getTotalCompletedToday(): number {
  const progress = getProgress();
  const today = todayKey();
  if (!progress[today]) return 0;
  return Object.values(progress[today]).reduce(
    (sum, cat) => sum + cat.completed.length,
    0,
  );
}

function getStreakDays(categoryId: string): number {
  const progress = getProgress();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const cat = progress[key]?.[categoryId];
    const dhikrInCat = DHIKR_DATA.filter(
      (item: Dhikr) => item.category === categoryId,
    );
    if (cat && cat.completed.length >= dhikrInCat.length) {
      streak++;
    } else {
      if (i === 0) continue; // today might not be done yet
      break;
    }
  }
  return streak;
}

function isMorning(): boolean {
  const hour = new Date().getHours();
  return hour >= 4 && hour < 16;
}

// ============================================================
// Confetti Particle System
// ============================================================

function ConfettiEffect({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 1.5,
    size: 4 + Math.random() * 6,
    color: ["#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"][i % 5],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: "-5%",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg) scale(0.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// XP Popup
// ============================================================

function XpPopup({ amount, visible }: { amount: number; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 animate-xp-popup pointer-events-none">
      <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 backdrop-blur-md">
        <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
        <span className="text-2xl font-bold text-amber-400">+{amount} XP</span>
      </div>
      <style>{`
        @keyframes xp-float {
          0% { transform: translate(-50%, 0) scale(0.5); opacity: 0; }
          20% { transform: translate(-50%, -10px) scale(1.1); opacity: 1; }
          80% { transform: translate(-50%, -40px) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -80px) scale(0.8); opacity: 0; }
        }
        .animate-xp-popup {
          animation: xp-float 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Circular Progress Ring
// ============================================================

function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  color = "#10b981",
  children,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - Math.min(progress, 1) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function Dhikr() {
  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [currentDhikrIndex, setCurrentDhikrIndex] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showXp, setShowXp] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [tapScale, setTapScale] = useState(1);
  const [completedInSession, setCompletedInSession] = useState<number[]>([]);
  const [, setTick] = useState(0); // force re-render on progress change

  // Get dhikr for active category
  const categoryDhikr = activeCategory
    ? DHIKR_DATA.filter((d: Dhikr) => d.category === activeCategory)
    : [];
  const currentDhikr = categoryDhikr[currentDhikrIndex] || null;

  // ---- Start practice ----
  const startPractice = useCallback((categoryId: string) => {
    const progress = getCategoryProgress(categoryId);
    setActiveCategory(categoryId);
    setTapCount(0);
    setTotalXpEarned(0);
    setCompletedInSession([...progress.completed]);
    setStartTime(Date.now());

    // Find first uncompleted dhikr to continue from where user stopped
    const catDhikr = DHIKR_DATA.filter((d: Dhikr) => d.category === categoryId);
    const firstUncompleted = catDhikr.findIndex(
      (d) => !progress.completed.includes(d.id)
    );
    setCurrentDhikrIndex(firstUncompleted >= 0 ? firstUncompleted : 0);

    setViewMode("practice");
  }, []);

  // ---- Tap handler ----
  const handleTap = useCallback(() => {
    if (!currentDhikr) return;
    if (tapCount >= currentDhikr.count) return;

    const newCount = tapCount + 1;
    setTapCount(newCount);

    // Tap animation
    setTapScale(0.92);
    setTimeout(() => setTapScale(1), 100);

    // Vibration feedback
    if (navigator.vibrate) {
      navigator.vibrate(newCount >= currentDhikr.count ? [50, 30, 50] : 15);
    }

    // Dhikr completed
    if (newCount >= currentDhikr.count) {
      const xp = POINTS.AZKAR;
      markDhikrCompleted(activeCategory!, currentDhikr.id, newCount);
      // Dhikr points are now recalculated from iman_dhikr_progress
      storage.recalculateTotalPoints();
      setTotalXpEarned((prev) => prev + xp);
      setCompletedInSession((prev) => [...prev, currentDhikr.id]);
      setXpAmount(xp);
      setShowXp(true);
      setTimeout(() => setShowXp(false), 1500);

      // Check if full category is now completed
      const catDhikr = DHIKR_DATA.filter(
        (d: Dhikr) => d.category === activeCategory,
      );
      const updatedCompleted = [...completedInSession, currentDhikr.id];
      if (updatedCompleted.length >= catDhikr.length) {
        // Category bonus (not recalculable)
        const bonus = 10;
        storage.addExtraPoints(bonus);
        setTotalXpEarned((prev) => prev + xp + bonus);
        setTimeout(() => {
          setShowConfetti(true);
          setXpAmount(bonus);
          setShowXp(true);
          setTimeout(() => {
            setShowXp(false);
            setShowConfetti(false);
            setViewMode("complete");
          }, 2000);
        }, 800);
      }
    }
  }, [currentDhikr, tapCount, activeCategory, completedInSession]);

  // ---- Next dhikr ----
  const goNext = useCallback(() => {
    if (currentDhikrIndex + 1 >= categoryDhikr.length) {
      // All done
      setViewMode("complete");
      return;
    }
    setCurrentDhikrIndex((i) => i + 1);
    setTapCount(0);
  }, [currentDhikrIndex, categoryDhikr.length]);

  // ---- Back to main ----
  const goBack = useCallback(() => {
    setViewMode("main");
    setActiveCategory(null);
    setCurrentDhikrIndex(0);
    setTapCount(0);
    setTick((t) => t + 1); // force refresh
  }, []);

  // ---- Render by view mode ----
  if (viewMode === "practice" && currentDhikr) {
    return (
      <PracticeView
        dhikr={currentDhikr}
        dhikrIndex={currentDhikrIndex}
        totalDhikr={categoryDhikr.length}
        tapCount={tapCount}
        tapScale={tapScale}
        onTap={handleTap}
        onNext={goNext}
        onBack={goBack}
        showConfetti={showConfetti}
        showXp={showXp}
        xpAmount={xpAmount}
        isCompleted={tapCount >= currentDhikr.count}
      />
    );
  }

  if (viewMode === "complete") {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return (
      <CompletionView
        totalXp={totalXpEarned}
        timeSpent={`${minutes}:${seconds.toString().padStart(2, "0")}`}
        categoryName={
          DHIKR_CATEGORIES.find((c) => c.key === activeCategory)?.name || ""
        }
        onBack={goBack}
      />
    );
  }

  return <MainView onStartPractice={startPractice} />;
}

// ============================================================
// Main View
// ============================================================

function MainView({
  onStartPractice,
}: {
  onStartPractice: (categoryId: string) => void;
}) {
  const morning = isMorning();
  const totalTaps = getTotalTapsToday();
  const totalCompleted = getTotalCompletedToday();

  // Daily quest progress
  const questCategory = morning ? "morning" : "evening";
  const questDhikr = DHIKR_DATA.filter(
    (d: Dhikr) => d.category === questCategory,
  );
  const questProgress = getCategoryProgress(questCategory);
  const questPct =
    questDhikr.length > 0
      ? questProgress.completed.length / questDhikr.length
      : 0;
  const questDone = questPct >= 1;

  // Achievement badges
  const morningStreak = getStreakDays("morning");
  const badges = [
    {
      id: "morning_7",
      label: "7 дней утренних азкаров",
      icon: "🌅",
      unlocked: morningStreak >= 7,
      progress: Math.min(morningStreak, 7),
      max: 7,
    },
    {
      id: "taps_100",
      label: "100 зикров за день",
      icon: "📿",
      unlocked: totalTaps >= 100,
      progress: Math.min(totalTaps, 100),
      max: 100,
    },
    {
      id: "complete_3",
      label: "3 категории за день",
      icon: "⭐",
      unlocked: (() => {
        const progress = getProgress();
        const today = todayKey();
        if (!progress[today]) return false;
        let fullCategories = 0;
        for (const cat of DHIKR_CATEGORIES) {
          const catDhikr = DHIKR_DATA.filter(
            (d: Dhikr) => d.category === cat.key,
          );
          const catProg = progress[today][cat.key];
          if (catProg && catProg.completed.length >= catDhikr.length)
            fullCategories++;
        }
        return fullCategories >= 3;
      })(),
      progress: (() => {
        const progress = getProgress();
        const today = todayKey();
        if (!progress[today]) return 0;
        let fullCategories = 0;
        for (const cat of DHIKR_CATEGORIES) {
          const catDhikr = DHIKR_DATA.filter(
            (d: Dhikr) => d.category === cat.key,
          );
          const catProg = progress[today][cat.key];
          if (catProg && catProg.completed.length >= catDhikr.length)
            fullCategories++;
        }
        return Math.min(fullCategories, 3);
      })(),
      max: 3,
    },
    {
      id: "taps_500",
      label: "500 зикров за день",
      icon: "🏆",
      unlocked: totalTaps >= 500,
      progress: Math.min(totalTaps, 500),
      max: 500,
    },
  ];

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-white text-center mb-1">
          Зикры
        </h1>
        <p className="text-emerald-400/70 text-center text-sm">
          Цифровой тасбих
        </p>
      </div>

      {/* Today stats mini bar */}
      <div className="flex items-center justify-center gap-6 px-4 mt-2 mb-4">
        <div className="flex items-center gap-1.5 text-sm">
          <Target className="w-4 h-4 text-emerald-400" />
          <span className="text-gray-400">{totalCompleted} зикров</span>
        </div>
        <div className="w-px h-4 t-bg" />
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-gray-500">Нажатий:</span>
          <span className="text-amber-400 font-medium">{totalTaps}</span>
        </div>
      </div>

      {/* Daily Quest Card */}
      <div className="px-4 mb-6">
        <div
          className={`relative overflow-hidden rounded-2xl p-5 cursor-pointer active:scale-[0.98] transition-all duration-200 ${
            questDone
              ? "bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30"
              : "bg-gradient-to-br from-amber-900/30 to-orange-900/20 border border-amber-500/20"
          }`}
          onClick={() => !questDone && onStartPractice(questCategory)}
        >
          {/* Decorative glow */}
          <div
            className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl ${
              questDone ? "bg-emerald-500/10" : "bg-amber-500/10"
            }`}
          />

          <div className="flex items-center justify-between relative">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Zap
                  className={`w-4 h-4 ${questDone ? "text-emerald-400" : "text-amber-400"} fill-current`}
                />
                <span
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    questDone ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  Ежедневный квест
                </span>
              </div>
              <h3 className="text-white font-semibold text-lg mb-1">
                {questDone
                  ? "Квест завершён!"
                  : morning
                    ? "Прочитай утренние азкары"
                    : "Прочитай вечерние азкары"}
              </h3>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm ${questDone ? "text-emerald-400/70" : "text-amber-400/70"}`}
                >
                  {questDone ? "Выполнено" : `+15 XP`}
                </span>
                {!questDone && (
                  <span className="text-gray-500 text-xs">
                    {questProgress.completed.length}/{questDhikr.length} зикров
                  </span>
                )}
              </div>
            </div>
            <ProgressRing
              progress={questPct}
              size={56}
              strokeWidth={5}
              color={questDone ? "#10b981" : "#f59e0b"}
            >
              {questDone ? (
                <Check className="w-6 h-6 text-emerald-400" />
              ) : (
                <span className="text-xs font-bold text-white">
                  {Math.round(questPct * 100)}%
                </span>
              )}
            </ProgressRing>
          </div>

          {/* Progress bar */}
          {!questDone && (
            <div className="mt-4 h-1.5 rounded-full t-bg overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
                style={{ width: `${questPct * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Category Grid */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Категории</h2>
        <div className="grid grid-cols-2 gap-3">
          {DHIKR_CATEGORIES.map((cat) => {
            const catDhikr = DHIKR_DATA.filter(
              (d: Dhikr) => d.category === cat.key,
            );
            const catProgress = getCategoryProgress(cat.key);
            const pct =
              catDhikr.length > 0
                ? catProgress.completed.length / catDhikr.length
                : 0;
            const isDone = pct >= 1;

            return (
              <button
                key={cat.key}
                onClick={() => onStartPractice(cat.key)}
                className={`relative p-4 rounded-2xl text-left active:scale-[0.96] transition-all duration-200 overflow-hidden ${
                  isDone
                    ? "glass-card border border-emerald-500/40 shadow-lg shadow-emerald-500/10"
                    : "glass-card hover:t-border-s"
                }`}
                style={
                  isDone
                    ? {
                        boxShadow:
                          "0 0 20px rgba(16, 185, 129, 0.15), 0 0 60px rgba(16, 185, 129, 0.05)",
                      }
                    : undefined
                }
              >
                {/* Glow for completed */}
                {isDone && (
                  <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-emerald-500/10 blur-2xl" />
                )}

                <div className="text-2xl mb-2">{cat.icon}</div>
                <div className="text-white font-medium text-sm mb-0.5">
                  {cat.name}
                </div>
                <div className="text-gray-500 text-xs mb-3">
                  {catDhikr.length} зикров
                </div>

                {/* Mini progress bar */}
                <div className="h-1.5 rounded-full t-bg overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isDone
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                        : "bg-gradient-to-r from-emerald-600 to-emerald-500"
                    }`}
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span
                    className={`text-xs ${isDone ? "text-emerald-400" : "text-gray-500"}`}
                  >
                    {catProgress.completed.length}/{catDhikr.length}
                  </span>
                  <span
                    className={`text-xs font-medium ${isDone ? "text-emerald-400" : "text-gray-500"}`}
                  >
                    {Math.round(pct * 100)}%
                  </span>
                </div>

                {/* Done checkmark */}
                {isDone && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Достижения
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`glass-card p-4 rounded-2xl transition-all ${
                badge.unlocked ? "border border-amber-500/30" : "opacity-60"
              }`}
              style={
                badge.unlocked
                  ? {
                      boxShadow: "0 0 15px rgba(245, 158, 11, 0.1)",
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{badge.icon}</span>
                {badge.unlocked && (
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-amber-400" />
                  </div>
                )}
              </div>
              <div
                className={`text-xs font-medium mb-2 ${badge.unlocked ? "text-white" : "text-gray-400"}`}
              >
                {badge.label}
              </div>
              <div className="h-1 rounded-full t-bg overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    badge.unlocked
                      ? "bg-gradient-to-r from-amber-500 to-amber-400"
                      : "bg-gradient-to-r from-gray-600 to-gray-500"
                  }`}
                  style={{ width: `${(badge.progress / badge.max) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {badge.progress}/{badge.max}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Practice View (Game-Like Dhikr Counter)
// ============================================================

function PracticeView({
  dhikr,
  dhikrIndex,
  totalDhikr,
  tapCount,
  tapScale,
  onTap,
  onNext,
  onBack,
  showConfetti,
  showXp,
  xpAmount,
  isCompleted,
}: {
  dhikr: Dhikr;
  dhikrIndex: number;
  totalDhikr: number;
  tapCount: number;
  tapScale: number;
  onTap: () => void;
  onNext: () => void;
  onBack: () => void;
  showConfetti: boolean;
  showXp: boolean;
  xpAmount: number;
  isCompleted: boolean;
}) {
  const progress = tapCount / dhikr.count;
  const circumference = 2 * Math.PI * 72; // radius 72 for the big counter

  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-950 to-black select-none"
      onClick={(e) => {
        // Tap anywhere on screen to count (except buttons with data-no-tap)
        const target = e.target as HTMLElement;
        if (target.closest('[data-no-tap]') || target.closest('button:not([data-tap-ok])')) return;
        if (!isCompleted) {
          onTap();
        } else {
          onNext();
        }
      }}
    >
      <ConfettiEffect active={showConfetti} />
      <XpPopup amount={xpAmount} visible={showXp} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          data-no-tap
          onClick={(e) => { e.stopPropagation(); onBack(); }}
          className="w-10 h-10 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-400 font-medium">
          Зикр {dhikrIndex + 1} из {totalDhikr}
        </span>
        <div className="w-10" /> {/* spacer */}
      </div>

      {/* Top progress bar */}
      <div className="px-4 mb-2">
        <div className="flex gap-1">
          {Array.from({ length: totalDhikr }, (_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full overflow-hidden t-bg"
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  i < dhikrIndex
                    ? "bg-emerald-500 w-full"
                    : i === dhikrIndex
                      ? "bg-amber-400"
                      : ""
                }`}
                style={{
                  width:
                    i < dhikrIndex
                      ? "100%"
                      : i === dhikrIndex
                        ? `${progress * 100}%`
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Content — scrollable middle */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 overflow-y-auto">
        {/* Arabic text */}
        <div className="arabic-text text-3xl md:text-4xl text-amber-400 text-center mb-4 px-2 leading-relaxed select-none">
          {dhikr.arabic}
        </div>

        {/* Transcription */}
        <div className="text-base t-text text-center mb-1 font-medium">
          {dhikr.transcription}
        </div>

        {/* Translation */}
        <div className="text-sm text-gray-400 text-center mb-6 max-w-sm leading-relaxed">
          {dhikr.russian}
        </div>

        {/* Big Circular Tap Counter */}
        <div className="relative mb-6">
          <button
            onClick={onTap}
            disabled={isCompleted}
            className="relative focus:outline-none active:outline-none select-none"
            style={{
              transform: `scale(${tapScale})`,
              transition: "transform 0.1s ease-out",
            }}
          >
            {/* SVG Ring */}
            <svg width={168} height={168} className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx={84}
                cy={84}
                r={72}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={8}
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx={84}
                cy={84}
                r={72}
                stroke={isCompleted ? "#10b981" : "#f59e0b"}
                strokeWidth={8}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress * circumference}
                strokeLinecap="round"
                className="transition-all duration-200 ease-out"
                style={{
                  filter: `drop-shadow(0 0 10px ${isCompleted ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.3)"})`,
                }}
              />
            </svg>

            {/* Inner content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isCompleted ? (
                <div className="animate-fade-in">
                  <Check className="w-10 h-10 text-emerald-400 mx-auto mb-1" />
                  <span className="text-emerald-400 text-xs font-medium">
                    Готово!
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-3xl font-bold text-white">
                    {tapCount}
                  </span>
                  <span className="text-gray-500 text-sm">
                    из {dhikr.count}
                  </span>
                </>
              )}
            </div>
          </button>

          {/* Tap hint */}
          {!isCompleted && tapCount === 0 && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-gray-500 text-xs whitespace-nowrap animate-pulse">
              Тапай по экрану для счёта
            </div>
          )}
        </div>

        {/* Reward card */}
        <div className="w-full max-w-sm glass-card p-4 rounded-xl mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs text-emerald-400/80 font-medium mb-1">
                Награда из хадиса
              </div>
              <div className="text-sm text-gray-300 leading-relaxed">
                {dhikr.reward}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: hint */}
      <div className="px-4 pb-6 pt-2">
        {isCompleted ? (
          <div className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600/20 to-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-center text-base flex items-center justify-center gap-2">
            {dhikrIndex + 1 >= totalDhikr ? "Тапни чтобы завершить" : "Тапни — следующий зикр →"}
          </div>
        ) : (
          <div className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600/20 to-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold text-center text-base flex items-center justify-center gap-3">
            <span className="text-2xl">📿</span>
            Тапай — {tapCount}/{dhikr.count}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Completion View
// ============================================================

function CompletionView({
  totalXp,
  timeSpent,
  categoryName,
  onBack,
}: {
  totalXp: number;
  timeSpent: string;
  categoryName: string;
  onBack: () => void;
}) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-slate-900 via-slate-950 to-black">
      {/* Big checkmark with glow */}
      <div
        className={`transition-all duration-700 ${
          showContent ? "opacity-100 scale-100" : "opacity-0 scale-50"
        }`}
      >
        <div
          className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center mx-auto mb-6"
          style={{
            boxShadow:
              "0 0 40px rgba(16, 185, 129, 0.3), 0 0 80px rgba(16, 185, 129, 0.1)",
          }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 flex items-center justify-center">
            <Check className="w-10 h-10 text-emerald-400" strokeWidth={3} />
          </div>
        </div>
      </div>

      <div
        className={`text-center transition-all duration-700 delay-200 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <h2 className="text-2xl font-bold text-white mb-2">Машаллах!</h2>
        <p className="text-emerald-400/80 text-lg mb-1">Азкары завершены!</p>
        <p className="text-gray-500 text-sm mb-8">{categoryName}</p>
      </div>

      {/* Stats */}
      <div
        className={`glass-card p-6 rounded-2xl w-full max-w-sm mb-8 transition-all duration-700 delay-400 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="text-2xl font-bold text-amber-400">
                {totalXp}
              </span>
            </div>
            <span className="text-xs text-gray-500">XP заработано</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="text-2xl">⏱</span>
              <span className="text-2xl font-bold text-white">{timeSpent}</span>
            </div>
            <span className="text-xs text-gray-500">Время</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className={`w-full max-w-sm flex flex-col gap-3 transition-all duration-700 delay-500 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <button
          onClick={onBack}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-lg active:scale-[0.97] transition-all shadow-lg shadow-emerald-500/20"
        >
          Вернуться
        </button>
        <button
          onClick={onBack}
          className="w-full py-3 rounded-2xl glass text-gray-400 font-medium flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Повторить
        </button>
      </div>
    </div>
  );
}
