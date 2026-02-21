import { useState, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trophy,
  Sparkles,
  Zap,
} from "lucide-react";
import { QUIZ_CATEGORIES, QUIZ_DATA } from "../data/quiz";
import type { QuizQuestion } from "../data/quiz";
import { storage, POINTS } from "../lib/storage";
import { scheduleSyncPush } from "../lib/sync";

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = "iman_quiz_scores";

// ============================================================
// Types
// ============================================================

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

interface QuizHistoryEntry {
  date: string;
  category: string | null;
  correct: number;
  total: number;
  percentage: number;
  pointsEarned: number;
}

const HISTORY_KEY = "iman_quiz_history";

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
  scheduleSyncPush();
}

function loadQuizHistory(): QuizHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw) as QuizHistoryEntry[];
  } catch {}
  return [];
}

function saveQuizHistory(entry: QuizHistoryEntry): void {
  const history = loadQuizHistory();
  history.unshift(entry); // newest first
  // Keep last 50 entries
  if (history.length > 50) history.length = 50;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  scheduleSyncPush();
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

// ============================================================
// Main Component
// ============================================================

export default function Quiz() {
  const [view, setView] = useState<ViewMode>("home");
  const [highScores, setHighScores] = useState<HighScores>(loadHighScores);

  // Quiz state
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);

  // Scoring: first attempt only
  const [isFirstAttempt, setIsFirstAttempt] = useState(true);
  const [pointsEarned, setPointsEarned] = useState(0);

  // Animations
  const [shakeAnswer, setShakeAnswer] = useState(false);
  const [flashCorrect, setFlashCorrect] = useState(false);

  // Count questions per category
  const categoryQuestionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    QUIZ_DATA.forEach((q) => {
      counts[q.category] = (counts[q.category] || 0) + 1;
    });
    return counts;
  }, []);

  // Start quiz
  const startQuiz = useCallback((categoryKey: string | null) => {
    setActiveCategory(categoryKey);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setCorrectCount(0);
    setWrongAnswers([]);
    setShowExplanation(false);
    setShakeAnswer(false);
    setFlashCorrect(false);
    setPointsEarned(0);

    // Check if this quiz was already scored
    const scoreKey = categoryKey || "_all";
    setIsFirstAttempt(!storage.isQuizScored(scoreKey));

    // Get question pool
    const pool = categoryKey
      ? QUIZ_DATA.filter((q) => q.category === categoryKey)
      : [...QUIZ_DATA];

    // Shuffle questions
    const shuffled = shuffle(pool);
    setQuestions(shuffled);
    setView("playing");
  }, []);

  // Handle answer
  const handleAnswer = useCallback(
    (optionIndex: number) => {
      if (selectedAnswer !== null) return;

      const currentQ = questions[currentIndex];
      const isCorrect = optionIndex === currentQ.correctIndex;

      setSelectedAnswer(optionIndex);
      setShowExplanation(true);

      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
        setFlashCorrect(true);
        setTimeout(() => setFlashCorrect(false), 600);
      } else {
        setShakeAnswer(true);
        navigator.vibrate?.(100);
        setTimeout(() => setShakeAnswer(false), 500);
        setWrongAnswers((prev) => [
          ...prev,
          { question: currentQ, selectedIndex: optionIndex },
        ]);
      }
    },
    [selectedAnswer, questions, currentIndex],
  );

  // Next question
  const nextQuestion = useCallback(() => {
    const isLast = currentIndex + 1 >= questions.length;

    if (isLast) {
      // Finish — save scores
      const total = questions.length;
      const correct = correctCount;
      const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
      const key = activeCategory || "_all";

      const updated = { ...loadHighScores() };
      const prev = updated[key];
      if (!prev || percentage > prev.percentage) {
        updated[key] = { correct, total, percentage };
        saveHighScores(updated);
        setHighScores(updated);
      }

      // Award points only on first attempt
      let earned = 0;
      if (isFirstAttempt && correct > 0) {
        earned = correct * POINTS.QUIZ_CORRECT;
        storage.addExtraPoints(earned);
        storage.markQuizScored(key);
        setPointsEarned(earned);
      }

      // Save to history
      saveQuizHistory({
        date: new Date().toISOString(),
        category: activeCategory,
        correct,
        total,
        percentage,
        pointsEarned: earned,
      });

      setView("finished");
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setShakeAnswer(false);
    setFlashCorrect(false);
  }, [currentIndex, questions, correctCount, activeCategory, isFirstAttempt]);

  // Go back to home
  const goHome = useCallback(() => {
    setView("home");
  }, []);

  // ============================================================
  // VIEW 1: Category Selection
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

        {/* Category Grid */}
        <div className="px-4 mt-5">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
            Категории
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {QUIZ_CATEGORIES.map((cat) => {
              const colors = getColorClasses(cat.color);
              const count = categoryQuestionCounts[cat.key] || 0;
              const scoreKey = cat.key;
              const score = highScores[scoreKey];

              return (
                <button
                  key={cat.key}
                  onClick={() => startQuiz(cat.key)}
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
            onClick={() => startQuiz(null)}
            className="w-full mt-4 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-lg flex items-center justify-center gap-3 active:scale-[0.97] transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
          >
            <Sparkles className="w-5 h-5" />
            Все вопросы ({QUIZ_DATA.length})
          </button>

          {highScores["_all"] && (
            <div className="flex items-center justify-center gap-2 mt-3 text-sm">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-gray-400">
                Лучший результат:{" "}
                <span
                  className={`font-medium ${
                    highScores["_all"].percentage >= 70
                      ? "text-emerald-400"
                      : highScores["_all"].percentage >= 40
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  {highScores["_all"].percentage}%
                </span>
              </span>
            </div>
          )}

          {/* Quiz History */}
          {(() => {
            const history = loadQuizHistory();
            if (history.length === 0) return null;
            return (
              <div className="mt-6">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 px-1">
                  История прохождений
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.slice(0, 10).map((entry, i) => {
                    const catName = entry.category
                      ? QUIZ_CATEGORIES.find((c) => c.key === entry.category)?.name || entry.category
                      : "Все вопросы";
                    const d = new Date(entry.date);
                    const dateStr = d.toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                    });
                    const timeStr = d.toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <div
                        key={i}
                        className="glass-card p-3 flex items-center gap-3"
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                            entry.percentage >= 70
                              ? "bg-emerald-500/20 text-emerald-400"
                              : entry.percentage >= 40
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {entry.percentage}%
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">
                            {catName}
                          </p>
                          <p className="text-[10px] text-white/30">
                            {entry.correct}/{entry.total} правильных
                            {entry.pointsEarned > 0 && (
                              <span className="text-emerald-400 ml-1">
                                +{entry.pointsEarned} баллов
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="text-[10px] text-white/20">
                          {dateStr} {timeStr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
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
    if (!currentQ) {
      // Safety check - if no question, go to results
      setView("finished");
      return null;
    }

    const totalQ = questions.length;
    const progress = ((currentIndex + 1) / totalQ) * 100;
    const categoryName = activeCategory
      ? QUIZ_CATEGORIES.find((c) => c.key === activeCategory)?.name ||
        "Викторина"
      : "Все вопросы";

    return (
      <div className="min-h-screen pb-24">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 pt-6 pb-2">
          <div className="flex-1">
            <p className="text-gray-400 text-xs">{categoryName}</p>
            <p className="text-white text-sm font-medium">
              Вопрос {currentIndex + 1} из {totalQ}
            </p>
          </div>

          <button
            onClick={goHome}
            className="w-9 h-9 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Training mode indicator */}
        {!isFirstAttempt && (
          <div className="flex items-center justify-center gap-1.5 px-4 mb-2">
            <RotateCcw size={12} className="text-slate-500" />
            <span className="text-xs text-slate-500">
              Тренировка (без очков)
            </span>
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
                btnClass = "t-bg border t-border text-gray-500 opacity-40";
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
              {currentIndex + 1 >= questions.length
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
  const total = questions.length;
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const wrongCount = total - correctCount;
  const categoryName = activeCategory
    ? QUIZ_CATEGORIES.find((c) => c.key === activeCategory)?.name || "Викторина"
    : "Все вопросы";

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
        <h2 className="text-gray-400 text-sm">{categoryName}</h2>
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

        {/* Points earned or training mode */}
        {pointsEarned > 0 ? (
          <div className="mt-5 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
            <Zap className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-semibold text-sm">
              +{pointsEarned} очков начислено!
            </span>
          </div>
        ) : !isFirstAttempt ? (
          <div className="mt-5 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-500/15 border border-slate-500/30">
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-sm">
              Тренировка — очки уже получены
            </span>
          </div>
        ) : null}
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
          onClick={() => startQuiz(activeCategory)}
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
            return (
              <div
                key={idx}
                className="glass-card p-4 border border-red-500/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-white text-sm font-medium flex-1">
                    {wa.question.question}
                  </p>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span className="text-red-400 text-xs">
                    {wa.question.options[wa.selectedIndex]}
                  </span>
                </div>

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
