import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  X,
  Heart,
  Check,
  ArrowRight,
  Trophy,
  Crown,
  RefreshCcw,
  ChevronLeft,
} from "lucide-react";
import {
  QUEST_WORLDS,
  setLevelProgress,
  type QuestQuestion,
} from "../data/quest";
import { storage } from "../lib/storage";
import { hapticImpact } from "../lib/api";
import { trackAction } from "../lib/analytics";

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function QuestLevel() {
  const navigate = useNavigate();
  const { worldId, levelId } = useParams<{ worldId: string; levelId: string }>();

  const world = QUEST_WORLDS.find((w) => w.id === worldId);
  const level = world?.levels.find((l) => l.id === Number(levelId));

  const [questions] = useState<QuestQuestion[]>(() =>
    level ? shuffleArray(level.questions) : [],
  );
  const [qIdx, setQIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [lives, setLives] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState<"win" | "loss" | null>(null);

  useEffect(() => {
    trackAction("quest_level_start", { world: worldId, level: levelId });
  }, [worldId, levelId]);

  if (!world || !level) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white mb-3">Уровень не найден</p>
          <button
            onClick={() => navigate("/quest")}
            className="glass-card px-4 py-2 text-emerald-300"
          >
            ← К карте
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[qIdx];
  const total = questions.length;
  const progressPct = ((qIdx + (answered ? 1 : 0)) / total) * 100;

  function chooseAnswer(idx: number) {
    if (answered) return;
    setSelectedIdx(idx);
    setAnswered(true);
    const isCorrect = idx === currentQ.correctIdx;
    if (isCorrect) {
      hapticImpact("medium");
      setCorrectCount((c) => c + 1);
    } else {
      hapticImpact("heavy");
      setLives((l) => Math.max(0, l - 1));
    }
  }

  function nextQuestion() {
    // Победа?
    if (lives <= 0) {
      setFinished("loss");
      return;
    }
    if (qIdx + 1 >= total) {
      // Победа — рассчитываем результат
      const accuracy = correctCount / total;
      const passThreshold = level.isBoss ? 0.8 : 0.6;
      if (accuracy >= passThreshold) {
        const stars =
          accuracy === 1 ? 3 : accuracy >= 0.8 ? 2 : 1;
        const earnedSawab = Math.round(level.rewardSawab * accuracy);
        setLevelProgress(worldId!, level.id, {
          stars,
          attempts: 1,
          completedAt: new Date().toISOString(),
          bestScore: correctCount,
        });
        try {
          storage.addExtraPoints(earnedSawab);
        } catch { /* ignore */ }
        setFinished("win");
      } else {
        setFinished("loss");
      }
      return;
    }
    setQIdx((i) => i + 1);
    setSelectedIdx(null);
    setAnswered(false);
  }

  function restart() {
    setQIdx(0);
    setSelectedIdx(null);
    setAnswered(false);
    setLives(3);
    setCorrectCount(0);
    setFinished(null);
  }

  // ─── ЭКРАН ПОБЕДЫ ─────────────────────────────────────────────
  if (finished === "win") {
    const accuracy = correctCount / total;
    const stars = accuracy === 1 ? 3 : accuracy >= 0.8 ? 2 : 1;
    const earnedSawab = Math.round(level.rewardSawab * accuracy);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
        {/* Конфетти-фон */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl opacity-70 animate-bounce"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
              }}
            >
              {["✨", "⭐", "🌟"][i % 3]}
            </div>
          ))}
        </div>

        <div className="relative max-w-sm w-full text-center animate-card-enter">
          {level.isBoss ? (
            <Crown className="w-20 h-20 text-amber-300 mx-auto mb-3" />
          ) : (
            <Trophy className="w-20 h-20 text-emerald-300 mx-auto mb-3" />
          )}
          <h2 className="text-3xl font-bold text-white mb-1">
            {level.isBoss ? "Босс повержен!" : "Уровень пройден!"}
          </h2>
          <p className="text-emerald-300/80 text-sm mb-6">{level.title}</p>

          {/* Звёзды */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`text-5xl transition-all ${
                  s <= stars ? "opacity-100" : "opacity-20"
                }`}
                style={{ animationDelay: `${s * 0.2}s` }}
              >
                {s <= stars ? "⭐" : "☆"}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="glass-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                Правильных
              </p>
              <p className="text-2xl font-bold text-emerald-300">
                {correctCount} / {total}
              </p>
            </div>
            <div className="glass-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                Награда
              </p>
              <p className="text-2xl font-bold text-amber-400">
                +{earnedSawab}
                <span className="text-xs text-slate-500 ml-1">саваб</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/quest")}
            className="w-full py-3 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/40 active:scale-[0.98] text-white font-semibold ring-1 ring-emerald-400/40 transition"
          >
            К карте мира
          </button>
          {level.isBoss === undefined && qIdx + 1 < world.levels.length && (
            <button
              onClick={() => {
                const next = level.id + 1;
                navigate(`/quest/${worldId}/${next}`);
              }}
              className="w-full mt-2 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] text-slate-300 font-medium transition"
            >
              Следующий уровень →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── ЭКРАН ПОРАЖЕНИЯ ──────────────────────────────────────────
  if (finished === "loss") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-sm w-full text-center animate-card-enter">
          <div className="text-7xl mb-3">😔</div>
          <h2 className="text-2xl font-bold text-white mb-1">Попробуй ещё</h2>
          <p className="text-slate-400 text-sm mb-2">
            Правильных: {correctCount} / {total}
          </p>
          <p className="text-rose-300/80 text-xs mb-6">
            {level.isBoss
              ? "Нужно 80%+ правильных для победы над боссом"
              : "Нужно 60%+ правильных для прохождения"}
          </p>

          <button
            onClick={restart}
            className="w-full py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-[0.98] text-emerald-200 font-semibold ring-1 ring-emerald-500/30 transition flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Начать заново
          </button>
          <button
            onClick={() => navigate("/quest")}
            className="w-full mt-2 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] text-slate-300 font-medium transition"
          >
            ← К карте мира
          </button>
        </div>
      </div>
    );
  }

  // ─── ИГРОВОЙ ЭКРАН ────────────────────────────────────────────
  const isCorrectChoice = answered && selectedIdx === currentQ.correctIdx;
  const isWrongChoice = answered && selectedIdx !== currentQ.correctIdx;

  return (
    <div className="min-h-screen pb-6 px-4 pt-4 max-w-lg mx-auto flex flex-col">
      {/* Top bar — close, lives, progress */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate("/quest")}
          className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <X size={18} className="text-slate-300" />
        </button>

        {/* Progress bar */}
        <div className="flex-1 h-2.5 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Lives */}
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((i) => (
            <Heart
              key={i}
              className={`w-5 h-5 transition-all ${
                i <= lives ? "text-rose-400 fill-rose-400" : "text-slate-700 fill-slate-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question counter */}
      <p className="text-center text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
        Вопрос {qIdx + 1} из {total} · {level.title}
      </p>

      {/* Question */}
      <div className="glass-card p-5 mb-4 animate-card-enter">
        <p className="text-white text-lg font-bold leading-snug">
          {currentQ.q}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2.5 mb-4 flex-1">
        {currentQ.options.map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrect = idx === currentQ.correctIdx;
          let style = "bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.08]";
          if (answered) {
            if (isCorrect) {
              style = "bg-emerald-500/20 border-emerald-400/60 text-emerald-100 ring-2 ring-emerald-400/40";
            } else if (isSelected) {
              style = "bg-rose-500/20 border-rose-400/60 text-rose-100 ring-2 ring-rose-400/40";
            } else {
              style = "bg-white/[0.02] border-white/5 text-slate-500 opacity-60";
            }
          } else if (isSelected) {
            style = "bg-emerald-500/15 border-emerald-400/40 text-white ring-2 ring-emerald-500/30";
          }

          return (
            <button
              key={idx}
              onClick={() => chooseAnswer(idx)}
              disabled={answered}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all active:scale-[0.99] ${style}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  answered
                    ? isCorrect
                      ? "bg-emerald-500/40 text-white"
                      : isSelected
                        ? "bg-rose-500/40 text-white"
                        : "bg-white/[0.05] text-slate-500"
                    : "bg-white/[0.06] text-slate-300"
                }`}
              >
                {answered && isCorrect ? <Check className="w-4 h-4" /> :
                 answered && isSelected ? <X className="w-4 h-4" /> :
                 String.fromCharCode(65 + idx)}
              </div>
              <span className="text-sm leading-snug">{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation + next */}
      {answered && (
        <div
          className={`glass-card p-4 mb-3 border animate-slide-down ${
            isCorrectChoice ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
          }`}
        >
          <p
            className={`text-[11px] uppercase tracking-wider font-bold mb-1.5 ${
              isCorrectChoice ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {isCorrectChoice ? "✓ Правильно!" : "✗ Не совсем"}
          </p>
          <p className="text-sm text-slate-200 leading-relaxed mb-1">
            {currentQ.explanation}
          </p>
          {currentQ.source && (
            <p className="text-[11px] text-slate-500">📚 {currentQ.source}</p>
          )}
        </div>
      )}

      {answered ? (
        <button
          onClick={nextQuestion}
          className={`w-full py-3.5 rounded-xl font-semibold active:scale-[0.98] transition ring-1 ${
            lives <= 0
              ? "bg-rose-500/20 text-rose-200 ring-rose-500/30"
              : qIdx + 1 >= total
                ? "bg-amber-500/20 text-amber-200 ring-amber-500/30"
                : "bg-emerald-500/20 text-emerald-200 ring-emerald-500/30"
          }`}
        >
          {lives <= 0
            ? "Завершить (жизни кончились)"
            : qIdx + 1 >= total
              ? "Завершить уровень 🏆"
              : "Дальше →"}
        </button>
      ) : (
        <button
          disabled
          className="w-full py-3.5 rounded-xl bg-white/[0.03] text-slate-600 font-medium cursor-not-allowed"
        >
          Выбери ответ
        </button>
      )}
    </div>
  );
}
