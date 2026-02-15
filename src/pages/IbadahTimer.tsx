import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Play, Pause, Square, Clock, Star, Zap, BookOpen } from "lucide-react";
import { storage, POINTS } from "../lib/storage";
import type { IbadahSession } from "../lib/storage";

// ============================================================
// Types & Constants
// ============================================================

type IbadahType = "quran" | "dhikr" | "dua" | "reflection" | "general";
type TimerState = "idle" | "running" | "paused";

interface TypeOption {
  key: IbadahType;
  label: string;
  emoji: string;
}

const IBADAH_TYPES: TypeOption[] = [
  { key: "quran", label: "Коран", emoji: "📖" },
  { key: "dhikr", label: "Зикр", emoji: "📿" },
  { key: "dua", label: "Дуа", emoji: "🤲" },
  { key: "reflection", label: "Размышление", emoji: "🌙" },
  { key: "general", label: "Общий", emoji: "☪️" },
];

const MOTIVATIONAL_QUOTES = [
  "«Поминайте Меня, и Я буду помнить о вас» — Коран 2:152",
  "«Разве не поминанием Аллаха успокаиваются сердца?» — Коран 13:28",
  "«Ближе всего раб к своему Господу во время суджуда» — Муслим",
  "«Кто приблизится ко Мне на пядь, Я приближусь к нему на локоть» — Бухари",
  "«Лучший зикр — Ля иляха илляЛлах» — Тирмизи",
  "«Два слова легки на языке, тяжелы на весах: СубханаЛлахи ва бихамдихи, СубханаЛлахиль Азым» — Бухари",
  "«Тот, кто читает Коран и действует по нему — его родители будут увенчаны светом» — Абу Дауд",
  "«Дуа — это суть поклонения» — Тирмизи",
  "«Поистине, в поминании Аллаха — жизнь сердец» — Ибн Таймия",
  "«Час размышления лучше года поклонения без размышления» — аль-Хасан аль-Басри",
];

// ============================================================
// Helpers
// ============================================================

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatTimeShort(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function getTypeEmoji(type: IbadahType): string {
  return IBADAH_TYPES.find((t) => t.key === type)?.emoji || "☪️";
}

function getTypeLabel(type: IbadahType): string {
  return IBADAH_TYPES.find((t) => t.key === type)?.label || "Общий";
}

function getRandomQuote(): string {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

// ============================================================
// Reward Animation Component
// ============================================================

function RewardAnimation({
  points,
  visible,
  onDone,
}: {
  points: number;
  visible: boolean;
  onDone: () => void;
}) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onDone, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, onDone]);

  if (!visible) return null;

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 1.2 + Math.random() * 1,
    size: 4 + Math.random() * 5,
    color: ["#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#fbbf24"][i % 5],
  }));

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      {/* Confetti */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: "30%",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `reward-particle ${p.duration}s ${p.delay}s ease-out forwards`,
          }}
        />
      ))}
      {/* Points badge */}
      <div className="animate-reward-badge">
        <div className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-xl shadow-2xl shadow-emerald-500/20">
          <span className="text-3xl">{"🌟"}</span>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-400">+{points}</div>
            <div className="text-sm text-emerald-400/70">баллов заработано</div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes reward-particle {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          20% { transform: translateY(-20px) scale(1.2); opacity: 1; }
          100% { transform: translateY(60vh) rotate(720deg) scale(0.2); opacity: 0; }
        }
        @keyframes reward-badge-anim {
          0% { transform: scale(0.3); opacity: 0; }
          30% { transform: scale(1.15); opacity: 1; }
          50% { transform: scale(1); }
          80% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0; }
        }
        .animate-reward-badge {
          animation: reward-badge-anim 2.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Timer Circle SVG
// ============================================================

function TimerCircle({
  elapsedSeconds,
  isActive,
}: {
  elapsedSeconds: number;
  isActive: boolean;
}) {
  const size = 200;
  const strokeWidth = 6;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // Progress fills based on minutes (one full rotation = 60 seconds)
  const secondsInCurrentMinute = elapsedSeconds % 60;
  const progress = secondsInCurrentMinute / 60;
  const offset = circumference - progress * circumference;

  const earnedMinutes = Math.floor(elapsedSeconds / 60);
  const earnedPoints = earnedMinutes * POINTS.IBADAH_MINUTE;

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulsing glow when active */}
      {isActive && (
        <div
          className="absolute rounded-full animate-pulse-glow"
          style={{
            width: size + 30,
            height: size + 30,
            background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
          }}
        />
      )}

      <svg width={size} height={size} className="transform -rotate-90">
        {/* Defs for gradient */}
        <defs>
          <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#timer-gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          filter={isActive ? "url(#glow)" : undefined}
          className="transition-all duration-300 ease-linear"
        />

        {/* Minute tick marks (subtle) */}
        {earnedMinutes > 0 &&
          Array.from({ length: Math.min(earnedMinutes, 60) }, (_, i) => {
            const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
            const innerR = radius - 10;
            const outerR = radius - 5;
            return (
              <line
                key={i}
                x1={size / 2 + innerR * Math.cos(angle)}
                y1={size / 2 + innerR * Math.sin(angle)}
                x2={size / 2 + outerR * Math.cos(angle)}
                y2={size / 2 + outerR * Math.sin(angle)}
                stroke="rgba(16,185,129,0.3)"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            );
          })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-mono font-bold text-white tracking-wider">
          {formatTime(elapsedSeconds)}
        </span>
        {earnedPoints > 0 && (
          <div className="flex items-center gap-1 mt-2 text-amber-400">
            <span className="text-lg font-semibold">+{earnedPoints}</span>
            <span className="text-lg">{"🌟"}</span>
          </div>
        )}
        {earnedPoints === 0 && elapsedSeconds > 0 && (
          <div className="text-xs text-gray-500 mt-2">
            {"< 1 мин для баллов"}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-glow-anim {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        .animate-pulse-glow {
          animation: pulse-glow-anim 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function IbadahTimer() {
  const navigate = useNavigate();

  // Timer state
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [selectedType, setSelectedType] = useState<IbadahType>("general");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<string>("");

  // Reward animation
  const [showReward, setShowReward] = useState(false);
  const [rewardPoints, setRewardPoints] = useState(0);

  // Quote
  const [quote] = useState(() => getRandomQuote());

  // Refresh trigger for stats
  const [refreshKey, setRefreshKey] = useState(0);

  // Refs for interval
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load data
  const todayMinutes = storage.getTodayIbadahMinutes();
  const totalMinutes = storage.getTotalIbadahMinutes();
  const allSessions = storage.getIbadahSessions();
  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySessions = allSessions.filter((s) => s.date === todayKey);
  const todayPoints = todaySessions.reduce((sum, s) => sum + s.pointsEarned, 0);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Start timer
  const handleStart = useCallback(() => {
    const now = new Date().toISOString();
    setStartedAt(now);
    setElapsedSeconds(0);
    setTimerState("running");

    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  // Pause timer
  const handlePause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerState("paused");
  }, []);

  // Resume timer
  const handleResume = useCallback(() => {
    setTimerState("running");
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  // Stop timer and save
  const handleStop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const durationMinutes = Math.floor(elapsedSeconds / 60);

    if (durationMinutes >= 1) {
      const session = storage.addIbadahSession({
        startedAt,
        durationMinutes,
        type: selectedType,
      });

      // Haptic feedback
      navigator.vibrate?.(200);

      // Show reward animation
      setRewardPoints(session.pointsEarned);
      setShowReward(true);
    }

    setTimerState("idle");
    setElapsedSeconds(0);
    setRefreshKey((k) => k + 1);
  }, [elapsedSeconds, startedAt, selectedType]);

  const handleRewardDone = useCallback(() => {
    setShowReward(false);
  }, []);

  return (
    <div className="min-h-screen pb-28" key={refreshKey}>
      {/* Reward animation */}
      <RewardAnimation
        points={rewardPoints}
        visible={showReward}
        onDone={handleRewardDone}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full t-bg border t-border-s flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Таймер ибадата</h1>
          <p className="text-emerald-400/60 text-xs">Время с Аллахом</p>
        </div>
      </div>

      {/* Type Selector */}
      <div className="px-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {IBADAH_TYPES.map((type) => (
            <button
              key={type.key}
              onClick={() => {
                if (timerState === "idle") setSelectedType(type.key);
              }}
              disabled={timerState !== "idle"}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border whitespace-nowrap text-sm font-medium transition-all ${
                selectedType === type.key
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                  : "t-bg t-border-s text-gray-400 hover:text-gray-300"
              } ${timerState !== "idle" ? "opacity-50 cursor-not-allowed" : "active:scale-95"}`}
            >
              <span>{type.emoji}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Timer Circle */}
      <div className="flex flex-col items-center px-4 mb-6">
        <TimerCircle
          elapsedSeconds={elapsedSeconds}
          isActive={timerState === "running"}
        />

        {/* Motivational quote during active timer */}
        {timerState !== "idle" && (
          <div className="mt-4 mx-4 px-5 py-3 t-bg backdrop-blur-sm border t-border-s rounded-xl">
            <p className="text-xs text-amber-400/80 text-center italic leading-relaxed">
              {quote}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-4 mb-8">
        {timerState === "idle" && (
          <button
            onClick={handleStart}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-12 rounded-full text-lg flex items-center gap-3 active:scale-95 transition-all shadow-lg shadow-emerald-500/25"
          >
            <Play className="w-5 h-5 fill-white" />
            СТАРТ
          </button>
        )}

        {timerState === "running" && (
          <>
            <button
              onClick={handlePause}
              className="bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold py-4 px-8 rounded-full text-lg flex items-center gap-2 active:scale-95 transition-all"
            >
              <Pause className="w-5 h-5" />
              ПАУЗА
            </button>
            <button
              onClick={handleStop}
              className="bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-4 px-8 rounded-full text-lg flex items-center gap-2 active:scale-95 transition-all"
            >
              <Square className="w-4 h-4 fill-red-400" />
              СТОП
            </button>
          </>
        )}

        {timerState === "paused" && (
          <>
            <button
              onClick={handleResume}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-8 rounded-full text-lg flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/25"
            >
              <Play className="w-5 h-5 fill-white" />
              ПРОДОЛЖИТЬ
            </button>
            <button
              onClick={handleStop}
              className="bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-4 px-8 rounded-full text-lg flex items-center gap-2 active:scale-95 transition-all"
            >
              <Square className="w-4 h-4 fill-red-400" />
              СТОП
            </button>
          </>
        )}
      </div>

      {/* Today's Summary */}
      <div className="px-4 mb-4">
        <div className="t-bg backdrop-blur-sm border t-border-s rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Сегодня
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{todayMinutes}</div>
              <div className="text-xs text-gray-500 mt-0.5">минут</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">{todayPoints}</div>
              <div className="text-xs text-gray-500 mt-0.5">баллов</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{todaySessions.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">сессий</div>
            </div>
          </div>
        </div>
      </div>

      {/* Session History (today) */}
      <div className="px-4 mb-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          История сессий
        </h3>

        {todaySessions.length === 0 ? (
          <div className="t-bg backdrop-blur-sm border t-border-s rounded-2xl p-6 text-center">
            <div className="text-3xl mb-2">{"🕌"}</div>
            <p className="text-gray-400 text-sm">Начните свою первую сессию ибадата сегодня</p>
            <p className="text-emerald-400/50 text-xs mt-1">
              Каждая минута приближает вас к Аллаху
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...todaySessions].reverse().map((session, idx) => (
              <div
                key={idx}
                className="t-bg backdrop-blur-sm border t-border-s rounded-2xl p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-lg shrink-0">
                  {getTypeEmoji(session.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {getTypeLabel(session.type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimeShort(session.startedAt)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {session.durationMinutes} мин
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-400 font-semibold text-sm">
                  <span>+{session.pointsEarned}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All-time Stats */}
      <div className="px-4 mb-6">
        <div className="t-bg backdrop-blur-sm border t-border-s rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Общая статистика
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{totalMinutes}</div>
              <div className="text-xs text-gray-500 mt-0.5">минут всего</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">
                {allSessions.reduce((sum, s) => sum + s.pointsEarned, 0)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">баллов всего</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{allSessions.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">сессий всего</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
