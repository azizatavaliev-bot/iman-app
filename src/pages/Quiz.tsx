import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ArrowLeft,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trophy,
  Clock,
  Sparkles,
  Zap,
  TrendingUp,
} from "lucide-react";
import { QUIZ_CATEGORIES, QUIZ_DATA } from "../data/quiz";
import type { QuizQuestion, QuizCategory } from "../data/quiz";

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = "iman_quiz_scores";

// Timer per difficulty
const TIMER_MAP = { easy: 20, medium: 15, hard: 10 } as const;
const DEFAULT_TIMER = 15;

// Difficulty display
const DIFFICULTY_CONFIG = {
  easy: {
    label: "Лёгкий",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
  },
  medium: {
    label: "Средний",
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
  },
  hard: {
    label: "Сложный",
    color: "text-red-400",
    bg: "bg-red-500/15",
    border: "border-red-500/30",
  },
} as const;

type Difficulty = "easy" | "medium" | "hard";

// ============================================================
// Types
// ============================================================

type GameMode = "all" | "easy" | "medium" | "hard" | "adaptive";
type ViewMode = "home" | "playing" | "finished";

interface HighScores {
  [key: string]: {
    correct: number;
    total: number;
    percentage: number;
  };
}

interface WrongAnswer {
  question: QuizQuestion;
  selectedIndex: number;
}

interface DifficultyBreakdown {
  easy: { correct: number; total: number };
  medium: { correct: number; total: number };
  hard: { correct: number; total: number };
}

// ============================================================
// Helpers
// ============================================================

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadHighScores(): HighScores {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as HighScores;
  } catch {
    /* ignore */
  }
  return {};
}

function saveHighScores(scores: HighScores): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

function getColorClasses(color: string) {
  const map: Record<
    string,
    { border: string; bg: string; text: string; glow: string }
  > = {
    emerald: {
      border: "border-emerald-500/50",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      glow: "shadow-emerald-500/20",
    },
    amber: {
      border: "border-amber-500/50",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      glow: "shadow-amber-500/20",
    },
    sky: {
      border: "border-sky-500/50",
      bg: "bg-sky-500/10",
      text: "text-sky-400",
      glow: "shadow-sky-500/20",
    },
    purple: {
      border: "border-purple-500/50",
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      glow: "shadow-purple-500/20",
    },
    rose: {
      border: "border-rose-500/50",
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      glow: "shadow-rose-500/20",
    },
    teal: {
      border: "border-teal-500/50",
      bg: "bg-teal-500/10",
      text: "text-teal-400",
      glow: "shadow-teal-500/20",
    },
    violet: {
      border: "border-violet-500/50",
      bg: "bg-violet-500/10",
      text: "text-violet-400",
      glow: "shadow-violet-500/20",
    },
  };
  return map[color] || map.emerald;
}

function getTimerForQuestion(q: QuizQuestion): number {
  const diff = (q as QuizQuestion & { difficulty?: Difficulty }).difficulty;
  return diff ? TIMER_MAP[diff] : DEFAULT_TIMER;
}

function getDifficulty(q: QuizQuestion): Difficulty {
  return (
    (q as QuizQuestion & { difficulty?: Difficulty }).difficulty || "medium"
  );
}

// ============================================================
// Adaptive Engine
// ============================================================

function pickNextAdaptive(
  currentLevel: Difficulty,
  usedIds: Set<number>,
  categoryKey: string | null,
): QuizQuestion | null {
  const pool = categoryKey
    ? QUIZ_DATA.filter((q) => q.category === categoryKey)
    : QUIZ_DATA;

  // Try current level first
  const levels: Difficulty[] = [currentLevel];
  // Fallback to adjacent levels
  if (currentLevel === "easy") levels.push("medium", "hard");
  else if (currentLevel === "medium") levels.push("easy", "hard");
  else levels.push("medium", "easy");

  for (const lvl of levels) {
    const candidates = pool.filter(
      (q) => getDifficulty(q) === lvl && !usedIds.has(q.id),
    );
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }
  return null;
}

// ============================================================
// Game Modes Config
// ============================================================

const GAME_MODES: {
  key: GameMode;
  label: string;
  icon: string;
  desc: string;
  color: string;
}[] = [
  {
    key: "all",
    label: "Все",
    icon: "🎯",
    desc: "Все уровни вместе",
    color: "emerald",
  },
  {
    key: "easy",
    label: "Лёгкий",
    icon: "🌱",
    desc: "Базовые знания",
    color: "emerald",
  },
  {
    key: "medium",
    label: "Средний",
    icon: "📚",
    desc: "Углублённые знания",
    color: "amber",
  },
  {
    key: "hard",
    label: "Сложный",
    icon: "🔥",
    desc: "Для экспертов",
    color: "rose",
  },
  {
    key: "adaptive",
    label: "Адаптивный",
    icon: "🧠",
    desc: "Подстраивается под тебя",
    color: "violet",
  },
];

// ============================================================
// Main Component
// ============================================================

export default function Quiz() {
  const [view, setView] = useState<ViewMode>("home");
  const [highScores, setHighScores] = useState<HighScores>(loadHighScores);

  // Quiz state
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("all");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [timer, setTimer] = useState(DEFAULT_TIMER);
  const [timerMax, setTimerMax] = useState(DEFAULT_TIMER);
  const [timerActive, setTimerActive] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Adaptive state
  const [adaptiveLevel, setAdaptiveLevel] = useState<Difficulty>("easy");
  const [adaptiveStreak, setAdaptiveStreak] = useState(0); // positive = correct streak, negative = wrong streak
  const [usedIds, setUsedIds] = useState<Set<number>>(new Set());
  const [adaptiveQuestionCount, setAdaptiveQuestionCount] = useState(0);
  const ADAPTIVE_TOTAL = 20; // number of questions in adaptive mode

  // Animations
  const [shakeAnswer, setShakeAnswer] = useState(false);
  const [flashCorrect, setFlashCorrect] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Count questions per category
  const categoryQuestionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    QUIZ_DATA.forEach((q) => {
      counts[q.category] = (counts[q.category] || 0) + 1;
    });
    return counts;
  }, []);

  // Timer logic
  useEffect(() => {
    if (!timerActive || selectedAnswer !== null) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerActive, selectedAnswer]);

  const handleTimeUp = useCallback(() => {
    setTimerActive(false);
    setSelectedAnswer(-1);
    setShowExplanation(true);
    setShakeAnswer(true);
    navigator.vibrate?.(100);
    setTimeout(() => setShakeAnswer(false), 500);

    const currentQ = questions[currentIndex];
    if (currentQ) {
      setWrongAnswers((prev) => [
        ...prev,
        { question: currentQ, selectedIndex: -1 },
      ]);
    }

    // Adaptive: wrong
    if (gameMode === "adaptive") {
      setAdaptiveStreak((s) => (s > 0 ? -1 : s - 1));
    }
  }, [questions, currentIndex, gameMode]);

  // Start quiz
  const startQuiz = useCallback(
    (categoryKey: string | null, mode: GameMode) => {
      setActiveCategory(categoryKey);
      setGameMode(mode);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setCorrectCount(0);
      setWrongAnswers([]);
      setShowExplanation(false);
      setShakeAnswer(false);
      setFlashCorrect(false);

      if (mode === "adaptive") {
        // Adaptive: start with easy, pick first question
        const firstUsedIds = new Set<number>();
        const firstQ = pickNextAdaptive("easy", firstUsedIds, categoryKey);
        if (firstQ) {
          firstUsedIds.add(firstQ.id);
          setQuestions([firstQ]);
          setUsedIds(firstUsedIds);
          setAdaptiveLevel("easy");
          setAdaptiveStreak(0);
          setAdaptiveQuestionCount(1);
          const t = getTimerForQuestion(firstQ);
          setTimer(t);
          setTimerMax(t);
        }
      } else {
        let filtered: QuizQuestion[];
        if (mode === "easy" || mode === "medium" || mode === "hard") {
          const pool = categoryKey
            ? QUIZ_DATA.filter((q) => q.category === categoryKey)
            : QUIZ_DATA;
          filtered = pool.filter((q) => getDifficulty(q) === mode);
        } else {
          filtered = categoryKey
            ? QUIZ_DATA.filter((q) => q.category === categoryKey)
            : [...QUIZ_DATA];
        }
        const shuffled = shuffle(filtered);
        setQuestions(shuffled);

        if (shuffled.length > 0) {
          const t = getTimerForQuestion(shuffled[0]);
          setTimer(t);
          setTimerMax(t);
        }
      }

      setTimerActive(true);
      setView("playing");
    },
    [],
  );

  // Handle answer
  const handleAnswer = useCallback(
    (optionIndex: number) => {
      if (selectedAnswer !== null) return;

      const currentQ = questions[currentIndex];
      const isCorrect = optionIndex === currentQ.correctIndex;

      setSelectedAnswer(optionIndex);
      setTimerActive(false);
      setShowExplanation(true);

      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
        setFlashCorrect(true);
        setTimeout(() => setFlashCorrect(false), 600);

        // Adaptive: correct streak
        if (gameMode === "adaptive") {
          setAdaptiveStreak((s) => (s < 0 ? 1 : s + 1));
        }
      } else {
        setShakeAnswer(true);
        navigator.vibrate?.(100);
        setTimeout(() => setShakeAnswer(false), 500);
        setWrongAnswers((prev) => [
          ...prev,
          { question: currentQ, selectedIndex: optionIndex },
        ]);

        // Adaptive: wrong streak
        if (gameMode === "adaptive") {
          setAdaptiveStreak((s) => (s > 0 ? -1 : s - 1));
        }
      }
    },
    [selectedAnswer, questions, currentIndex, gameMode],
  );

  // Next question
  const nextQuestion = useCallback(() => {
    const isLastNonAdaptive =
      gameMode !== "adaptive" && currentIndex + 1 >= questions.length;
    const isLastAdaptive =
      gameMode === "adaptive" && adaptiveQuestionCount >= ADAPTIVE_TOTAL;

    if (isLastNonAdaptive || isLastAdaptive) {
      // Finish — save scores
      const total =
        gameMode === "adaptive" ? adaptiveQuestionCount : questions.length;
      const correct = correctCount;
      const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
      const catPart = activeCategory || "_all";
      const key = `${catPart}_${gameMode}`;

      const updated = { ...loadHighScores() };
      const prev = updated[key];
      if (!prev || percentage > prev.percentage) {
        updated[key] = { correct, total, percentage };
        saveHighScores(updated);
        setHighScores(updated);
      }

      setView("finished");
      return;
    }

    if (gameMode === "adaptive") {
      // Determine next level
      let nextLevel = adaptiveLevel;
      const currentQ = questions[currentIndex];
      const wasCorrect =
        selectedAnswer !== null &&
        selectedAnswer >= 0 &&
        selectedAnswer === currentQ?.correctIndex;

      // Check streaks for level changes
      const newStreak = adaptiveStreak;
      if (newStreak >= 3 && adaptiveLevel !== "hard") {
        nextLevel = adaptiveLevel === "easy" ? "medium" : "hard";
        setAdaptiveStreak(0);
      } else if (newStreak <= -2 && adaptiveLevel !== "easy") {
        nextLevel = adaptiveLevel === "hard" ? "medium" : "easy";
        setAdaptiveStreak(0);
      }

      setAdaptiveLevel(nextLevel);

      // Pick next question
      const nextQ = pickNextAdaptive(nextLevel, usedIds, activeCategory);
      if (nextQ) {
        const newUsed = new Set(usedIds);
        newUsed.add(nextQ.id);
        setUsedIds(newUsed);
        setQuestions((prev) => [...prev, nextQ]);
        setCurrentIndex((prev) => prev + 1);
        setAdaptiveQuestionCount((prev) => prev + 1);

        const t = getTimerForQuestion(nextQ);
        setTimer(t);
        setTimerMax(t);
      } else {
        // No more questions available
        setView("finished");
        return;
      }
    } else {
      setCurrentIndex((prev) => prev + 1);
      const nextQ = questions[currentIndex + 1];
      if (nextQ) {
        const t = getTimerForQuestion(nextQ);
        setTimer(t);
        setTimerMax(t);
      }
    }

    setSelectedAnswer(null);
    setShowExplanation(false);
    setTimerActive(true);
    setShakeAnswer(false);
    setFlashCorrect(false);
  }, [
    currentIndex,
    questions,
    correctCount,
    activeCategory,
    gameMode,
    adaptiveLevel,
    adaptiveStreak,
    usedIds,
    selectedAnswer,
    adaptiveQuestionCount,
  ]);

  // Go back to home
  const goHome = useCallback(() => {
    setView("home");
    setTimerActive(false);
  }, []);

  // ============================================================
  // VIEW 1: Category & Mode Selection
  // ============================================================
  if (view === "home") {
    return (
      <div className="min-h-screen pb-24 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-6 pb-4">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Исламская викторина
            </h1>
            <p className="text-emerald-400/70 text-sm">Проверь свои знания</p>
          </div>
        </div>

        {/* Game Mode Selector */}
        <div className="px-4 mt-2">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
            Режим игры
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {GAME_MODES.map((mode) => {
              const isActive = gameMode === mode.key;
              return (
                <button
                  key={mode.key}
                  onClick={() => setGameMode(mode.key)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? mode.key === "adaptive"
                        ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                        : mode.key === "hard"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : mode.key === "medium"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "t-bg t-text-m border t-border"
                  }`}
                >
                  <span className="mr-1.5">{mode.icon}</span>
                  {mode.label}
                </button>
              );
            })}
          </div>

          {/* Adaptive mode description */}
          {gameMode === "adaptive" && (
            <div className="mt-3 glass-card p-3 flex items-start gap-3 border border-violet-500/20">
              <Zap size={18} className="text-violet-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-white/70">
                  Начинает с лёгких вопросов. 3 правильных подряд — уровень
                  повышается. 2 ошибки подряд — понижается.
                </p>
                <p className="text-xs t-text-f mt-1">
                  20 вопросов, таймер зависит от сложности
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Category Grid */}
        <div className="px-4 mt-5">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
            Категории
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {QUIZ_CATEGORIES.map((cat) => {
              const colors = getColorClasses(cat.color);
              const count = categoryQuestionCounts[cat.key] || 0;
              const scoreKey = `${cat.key}_${gameMode}`;
              const score = highScores[scoreKey];

              return (
                <button
                  key={cat.key}
                  onClick={() => startQuiz(cat.key, gameMode)}
                  className={`relative glass-card p-4 text-left border-l-4 ${colors.border} active:scale-[0.97] transition-all duration-200 hover:shadow-lg ${colors.glow}`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center text-2xl mb-3`}
                  >
                    {cat.icon}
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1">
                    {cat.name}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed mb-2">
                    {cat.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-xs">
                      {count}{" "}
                      {count === 1
                        ? "вопрос"
                        : count < 5
                          ? "вопроса"
                          : "вопросов"}
                    </span>
                    {score && (
                      <span
                        className={`text-xs font-medium ${
                          score.percentage >= 70
                            ? "text-emerald-400"
                            : score.percentage >= 40
                              ? "text-amber-400"
                              : "text-red-400"
                        }`}
                      >
                        <Trophy className="w-3 h-3 inline mr-0.5" />
                        {score.percentage}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* All Questions Button */}
          <button
            onClick={() => startQuiz(null, gameMode)}
            className="w-full mt-4 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-lg flex items-center justify-center gap-3 active:scale-[0.97] transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
          >
            <Sparkles className="w-5 h-5" />
            {gameMode === "adaptive"
              ? `Адаптивный (${ADAPTIVE_TOTAL} вопросов)`
              : `Все вопросы (${QUIZ_DATA.length})`}
          </button>

          {highScores[`_all_${gameMode}`] && (
            <div className="flex items-center justify-center gap-2 mt-3 text-sm">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-gray-400">
                Лучший результат:{" "}
                <span
                  className={`font-medium ${
                    highScores[`_all_${gameMode}`].percentage >= 70
                      ? "text-emerald-400"
                      : highScores[`_all_${gameMode}`].percentage >= 40
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  {highScores[`_all_${gameMode}`].percentage}%
                </span>
              </span>
            </div>
          )}
        </div>

        <style>{quizStyles}</style>
      </div>
    );
  }

  // ============================================================
  // VIEW 2: Quiz Game
  // ============================================================
  if (view === "playing") {
    const currentQ = questions[currentIndex];
    const totalQ = gameMode === "adaptive" ? ADAPTIVE_TOTAL : questions.length;
    const progress = ((currentIndex + 1) / totalQ) * 100;
    const timerPct = timerMax > 0 ? (timer / timerMax) * 100 : 0;
    const isTimedOut = selectedAnswer === -1;
    const categoryName = activeCategory
      ? QUIZ_CATEGORIES.find((c) => c.key === activeCategory)?.name ||
        "Викторина"
      : "Все вопросы";
    const qDifficulty = currentQ ? getDifficulty(currentQ) : "medium";
    const diffConfig = DIFFICULTY_CONFIG[qDifficulty];

    return (
      <div className="min-h-screen pb-24">
        {/* Timer bar at very top */}
        {selectedAnswer === null && (
          <div className="fixed top-0 left-0 right-0 z-50 h-1 t-bg">
            <div
              className={`h-full transition-all duration-1000 linear rounded-r-full ${
                timer <= 5
                  ? "bg-red-500"
                  : timer <= 10
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
        )}

        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 pt-6 pb-2">
          <div className="flex-1">
            <p className="text-gray-400 text-xs">{categoryName}</p>
            <p className="text-white text-sm font-medium">
              Вопрос {currentIndex + 1} из {totalQ}
            </p>
          </div>

          {/* Difficulty badge */}
          <div
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${diffConfig.bg} ${diffConfig.color} ${diffConfig.border} border mr-3`}
          >
            {diffConfig.label}
          </div>

          {selectedAnswer === null && (
            <div className="flex items-center gap-1.5 mr-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <span
                className={`text-sm font-mono font-bold ${
                  timer <= 5
                    ? "text-red-400"
                    : timer <= 10
                      ? "text-amber-400"
                      : "text-gray-300"
                }`}
              >
                {timer}
              </span>
            </div>
          )}

          <button
            onClick={goHome}
            className="w-9 h-9 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Adaptive level indicator */}
        {gameMode === "adaptive" && (
          <div className="flex items-center justify-center gap-2 px-4 mb-2">
            <TrendingUp size={14} className="text-violet-400" />
            <span className="text-xs text-white/40">Уровень:</span>
            <span
              className={`text-xs font-semibold ${DIFFICULTY_CONFIG[adaptiveLevel].color}`}
            >
              {DIFFICULTY_CONFIG[adaptiveLevel].label}
            </span>
            {adaptiveStreak !== 0 && (
              <span
                className={`text-[10px] ${adaptiveStreak > 0 ? "text-emerald-400/60" : "text-red-400/60"}`}
              >
                ({adaptiveStreak > 0 ? `+${adaptiveStreak}` : adaptiveStreak}{" "}
                подряд)
              </span>
            )}
          </div>
        )}

        {/* Progress Bar */}
        <div className="mx-4 mt-1 mb-6 h-2 rounded-full t-bg overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="px-4 mb-6">
          <div
            className={`glass-card p-6 transition-all duration-300 ${flashCorrect ? "quiz-flash-correct" : ""}`}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold">
                {currentIndex + 1}
              </span>
              {activeCategory === null && currentQ && (
                <span className="text-xs text-gray-500 t-bg px-2 py-0.5 rounded-full">
                  {
                    QUIZ_CATEGORIES.find((c) => c.key === currentQ.category)
                      ?.name
                  }
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-white leading-relaxed">
              {currentQ?.question}
            </h2>
          </div>
        </div>

        {/* Answer Options */}
        <div className="px-4 space-y-3">
          {currentQ?.options.map((option, i) => {
            let btnClass =
              "t-bg border t-border-s text-gray-200 active:scale-[0.98]";
            let iconEl: React.ReactNode = (
              <span className="w-8 h-8 rounded-full t-bg flex items-center justify-center text-sm text-gray-400 shrink-0">
                {String.fromCharCode(1040 + i)}
              </span>
            );

            if (selectedAnswer !== null) {
              if (i === currentQ.correctIndex) {
                btnClass =
                  "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 quiz-flash-correct-btn";
                iconEl = (
                  <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </span>
                );
              } else if (i === selectedAnswer) {
                btnClass = `bg-red-500/20 border border-red-500/50 text-red-300 ${shakeAnswer ? "quiz-shake" : ""}`;
                iconEl = (
                  <span className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                    <X className="w-4 h-4 text-red-400" />
                  </span>
                );
              } else {
                btnClass =
                  "t-bg border t-border text-gray-500 opacity-40";
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={selectedAnswer !== null}
                className={`w-full py-4 px-4 rounded-xl font-medium transition-all duration-300 ${btnClass}`}
              >
                <span className="flex items-center gap-3">
                  {iconEl}
                  <span className="text-left">{option}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Timed out message */}
        {isTimedOut && (
          <div className="px-4 mt-4 animate-fade-in">
            <div className="glass-card p-4 border border-red-500/20">
              <p className="text-red-400 text-sm font-medium mb-1">
                Время вышло!
              </p>
              <p className="text-gray-400 text-sm">
                Правильный ответ:{" "}
                <span className="text-emerald-400 font-medium">
                  {currentQ?.options[currentQ.correctIndex]}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Explanation */}
        {showExplanation && currentQ?.explanation && (
          <div className="px-4 mt-4 animate-fade-in">
            <div className="glass-card p-4 border border-emerald-500/10">
              <p className="text-emerald-400/80 text-xs font-medium uppercase tracking-wider mb-1">
                Пояснение
              </p>
              <p className="text-gray-300 text-sm leading-relaxed">
                {currentQ.explanation}
              </p>
            </div>
          </div>
        )}

        {/* Next Button */}
        {selectedAnswer !== null && (
          <div className="px-4 mt-6 animate-fade-in">
            <button
              onClick={nextQuestion}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-lg active:scale-[0.97] transition-all shadow-lg shadow-emerald-500/20"
            >
              {(gameMode !== "adaptive" &&
                currentIndex + 1 >= questions.length) ||
              (gameMode === "adaptive" &&
                adaptiveQuestionCount >= ADAPTIVE_TOTAL)
                ? "Показать результаты"
                : "Далее"}
            </button>
          </div>
        )}

        <style>{quizStyles}</style>
      </div>
    );
  }

  // ============================================================
  // VIEW 3: Results
  // ============================================================
  const total =
    gameMode === "adaptive" ? adaptiveQuestionCount : questions.length;
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const wrongCount = total - correctCount;
  const categoryName = activeCategory
    ? QUIZ_CATEGORIES.find((c) => c.key === activeCategory)?.name || "Викторина"
    : "Все вопросы";
  const modeLabel = GAME_MODES.find((m) => m.key === gameMode)?.label || "";

  // Difficulty breakdown
  const diffBreakdown = useMemo<DifficultyBreakdown>(() => {
    const bd: DifficultyBreakdown = {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      hard: { correct: 0, total: 0 },
    };
    const wrongIds = new Set(wrongAnswers.map((w) => w.question.id));
    questions.forEach((q) => {
      const d = getDifficulty(q);
      bd[d].total++;
      if (!wrongIds.has(q.id)) {
        bd[d].correct++;
      }
    });
    return bd;
  }, [questions, wrongAnswers]);

  // Category breakdown for "all" mode
  const categoryBreakdown = useMemo(() => {
    if (activeCategory !== null) return null;
    const breakdown: Record<string, { correct: number; total: number }> = {};
    questions.forEach((q) => {
      if (!breakdown[q.category])
        breakdown[q.category] = { correct: 0, total: 0 };
      breakdown[q.category].total++;
    });
    const wrongIds = new Set(wrongAnswers.map((w) => w.question.id));
    questions.forEach((q) => {
      if (!wrongIds.has(q.id) && breakdown[q.category]) {
        breakdown[q.category].correct++;
      }
    });
    return breakdown;
  }, [activeCategory, questions, wrongAnswers]);

  // Score circle
  const scoreColorClass =
    percentage >= 70
      ? "text-emerald-400"
      : percentage >= 40
        ? "text-amber-400"
        : "text-red-400";
  const scoreRingClass =
    percentage >= 70
      ? "stroke-emerald-500"
      : percentage >= 40
        ? "stroke-amber-500"
        : "stroke-red-500";
  const scoreBgClass =
    percentage >= 70
      ? "bg-emerald-500/10 glow-green"
      : percentage >= 40
        ? "bg-amber-500/10 glow-gold"
        : "bg-red-500/10";

  const getMessage = () => {
    if (percentage >= 90) return "Машаллах! Ты настоящий учёный!";
    if (percentage >= 70) return "Отличный результат! Продолжай учиться";
    if (percentage >= 50) return "Хорошая попытка! Есть над чем поработать";
    return "Не сдавайся! Учись и пробуй снова";
  };

  const circleRadius = 54;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="min-h-screen pb-24 animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 text-center">
        <h2 className="text-gray-400 text-sm">
          {categoryName} / {modeLabel}
        </h2>
        <h1 className="text-xl font-bold text-white mt-1">Результаты</h1>
      </div>

      {/* Score Circle */}
      <div className="flex flex-col items-center px-4 mt-2">
        <div
          className={`relative w-36 h-36 rounded-full ${scoreBgClass} flex items-center justify-center`}
        >
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 120 120"
          >
            <circle
              cx="60"
              cy="60"
              r={circleRadius}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r={circleRadius}
              fill="none"
              className={scoreRingClass}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 1s ease-out" }}
            />
          </svg>
          <div className="text-center z-10">
            <span className={`text-4xl font-bold ${scoreColorClass}`}>
              {percentage}%
            </span>
            <p className="text-gray-500 text-xs mt-0.5">
              {correctCount}/{total}
            </p>
          </div>
        </div>

        <p className="text-white font-semibold text-lg mt-6 text-center">
          {getMessage()}
        </p>

        <div className="flex items-center gap-6 mt-5">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {correctCount}
            </div>
            <div className="text-xs text-gray-500">Верных</div>
          </div>
          <div className="w-px h-10 t-bg" />
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{wrongCount}</div>
            <div className="text-xs text-gray-500">Ошибок</div>
          </div>
          <div className="w-px h-10 t-bg" />
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{total}</div>
            <div className="text-xs text-gray-500">Всего</div>
          </div>
        </div>
      </div>

      {/* Difficulty Breakdown */}
      <div className="px-4 mt-6">
        <h3 className="text-gray-400 text-sm font-medium mb-3">По сложности</h3>
        <div className="grid grid-cols-3 gap-2">
          {(["easy", "medium", "hard"] as const).map((d) => {
            const data = diffBreakdown[d];
            if (data.total === 0) return null;
            const pct = Math.round((data.correct / data.total) * 100);
            const cfg = DIFFICULTY_CONFIG[d];
            return (
              <div
                key={d}
                className={`glass-card p-3 text-center border ${cfg.border}`}
              >
                <p className={`text-xs font-semibold ${cfg.color}`}>
                  {cfg.label}
                </p>
                <p className="text-white font-bold text-lg mt-1">{pct}%</p>
                <p className="text-gray-500 text-[10px]">
                  {data.correct}/{data.total}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown && (
        <div className="px-4 mt-6">
          <h3 className="text-gray-400 text-sm font-medium mb-3">
            По категориям
          </h3>
          <div className="space-y-2">
            {QUIZ_CATEGORIES.map((cat) => {
              const data = categoryBreakdown[cat.key];
              if (!data) return null;
              const catPct = Math.round((data.correct / data.total) * 100);
              return (
                <div
                  key={cat.key}
                  className="glass-card p-3 flex items-center gap-3"
                >
                  <span className="text-lg">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium truncate">
                        {cat.name}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          catPct >= 70
                            ? "text-emerald-400"
                            : catPct >= 40
                              ? "text-amber-400"
                              : "text-red-400"
                        }`}
                      >
                        {data.correct}/{data.total}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full t-bg overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          catPct >= 70
                            ? "bg-emerald-500"
                            : catPct >= 40
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${catPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wrong Answers Review */}
      {wrongAnswers.length > 0 && (
        <WrongAnswersReview wrongAnswers={wrongAnswers} />
      )}

      {/* Action Buttons */}
      <div className="px-4 mt-6 space-y-3">
        <button
          onClick={() => startQuiz(activeCategory, gameMode)}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-lg flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-emerald-500/20"
        >
          <RotateCcw className="w-5 h-5" />
          Попробовать снова
        </button>
        <button
          onClick={goHome}
          className="w-full py-4 rounded-xl glass text-gray-300 font-medium text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          Назад к категориям
        </button>
      </div>

      <style>{quizStyles}</style>
    </div>
  );
}

// ============================================================
// Wrong Answers Review
// ============================================================

function WrongAnswersReview({ wrongAnswers }: { wrongAnswers: WrongAnswer[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="px-4 mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-3 text-left"
      >
        <h3 className="text-gray-400 text-sm font-medium">
          Ошибки ({wrongAnswers.length})
        </h3>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 animate-fade-in">
          {wrongAnswers.map((wa, idx) => {
            const d = getDifficulty(wa.question);
            const cfg = DIFFICULTY_CONFIG[d];
            return (
              <div
                key={idx}
                className="glass-card p-4 border border-red-500/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-white text-sm font-medium flex-1">
                    {wa.question.question}
                  </p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} flex-shrink-0`}
                  >
                    {cfg.label}
                  </span>
                </div>

                {wa.selectedIndex >= 0 && (
                  <div className="flex items-center gap-2 mb-1">
                    <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="text-red-400 text-xs">
                      {wa.question.options[wa.selectedIndex]}
                    </span>
                  </div>
                )}
                {wa.selectedIndex === -1 && (
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="text-red-400 text-xs">Время вышло</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-400 text-xs">
                    {wa.question.options[wa.question.correctIndex]}
                  </span>
                </div>

                {wa.question.explanation && (
                  <p className="text-gray-500 text-xs leading-relaxed mt-2 pt-2 border-t t-border">
                    {wa.question.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// CSS
// ============================================================

const quizStyles = `
  @keyframes quiz-shake {
    0%, 100% { transform: translateX(0); }
    10%, 50%, 90% { transform: translateX(-6px); }
    30%, 70% { transform: translateX(6px); }
  }
  .quiz-shake {
    animation: quiz-shake 0.5s ease-in-out;
  }
  @keyframes quiz-flash-green {
    0% { box-shadow: 0 0 0 rgba(16, 185, 129, 0); }
    50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.4), inset 0 0 20px rgba(16, 185, 129, 0.1); }
    100% { box-shadow: 0 0 0 rgba(16, 185, 129, 0); }
  }
  .quiz-flash-correct {
    animation: quiz-flash-green 0.6s ease-out;
  }
  .quiz-flash-correct-btn {
    animation: quiz-flash-green 0.6s ease-out;
  }
`;
