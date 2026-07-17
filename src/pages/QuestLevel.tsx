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
  loadQuestProgress,
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

// Перемешиваем варианты ответа внутри вопроса и пересчитываем correctIdx.
// Через перестановку индексов — надёжно даже при одинаковом тексте вариантов.
// Решает проблему «викторина угадывается» (60% правильных стояли на варианте А).
function shuffleQuestionOptions(q: QuestQuestion): QuestQuestion {
  const order = shuffleArray([0, 1, 2, 3]);
  const newOptions = order.map((i) => q.options[i]) as [
    string,
    string,
    string,
    string,
  ];
  const newCorrect = order.indexOf(q.correctIdx) as 0 | 1 | 2 | 3;
  return { ...q, options: newOptions, correctIdx: newCorrect };
}

export default function QuestLevel() {
  const navigate = useNavigate();
  const { worldId, levelId } = useParams<{ worldId: string; levelId: string }>();

  const world = QUEST_WORLDS.find((w) => w.id === worldId);
  const level = world?.levels.find((l) => l.id === Number(levelId));

  const [questions] = useState<QuestQuestion[]>(() =>
    level ? shuffleArray(level.questions).map(shuffleQuestionOptions) : [],
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
    // Прогресс по миру
    const worldProg = loadQuestProgress()[worldId!] || {};
    const passedInWorld = Object.values(worldProg).filter((lp) => lp && lp.stars > 0).length;
    const isLastInWorld = level.id === world.levels.length;
    const hasNext = level.id < world.levels.length;
    const themeColor = level.isBoss ? "amber" : "emerald";

    return (
      <div
        className={`min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4 bg-gradient-to-br ${
          level.isBoss
            ? "from-amber-500/20 via-orange-500/10"
            : "from-emerald-500/15 via-emerald-500/5"
        } to-slate-950`}
      >
        {/* КОНФЕТТИ — 40 кусочков */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 1.5;
            const duration = 2.5 + Math.random() * 1.5;
            const symbol = ["🎉", "🎊", "✨", "⭐", "🌟", "💫"][i % 6];
            return (
              <div
                key={i}
                className="absolute text-2xl animate-confetti"
                style={{
                  left: `${left}%`,
                  top: "-10vh",
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`,
                }}
              >
                {symbol}
              </div>
            );
          })}
        </div>

        {/* Glow orbs */}
        <div
          className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 ${
            level.isBoss ? "bg-amber-500/15" : "bg-emerald-500/15"
          } rounded-full blur-3xl animate-orb-float pointer-events-none`}
        />

        <div className="relative max-w-sm w-full text-center">
          {/* Большой трофей с анимацией */}
          <div className="relative inline-block mb-4 animate-trophy-bounce">
            <div
              className={`absolute inset-0 ${
                level.isBoss ? "bg-amber-500/40" : "bg-emerald-500/40"
              } rounded-full blur-2xl scale-110 animate-pulse-glow`}
            />
            <div
              className={`relative w-28 h-28 rounded-full ${
                level.isBoss
                  ? "bg-gradient-to-br from-amber-400 to-orange-600"
                  : "bg-gradient-to-br from-emerald-400 to-emerald-700"
              } flex items-center justify-center shadow-2xl ${
                level.isBoss ? "shadow-amber-500/50" : "shadow-emerald-500/40"
              }`}
            >
              {level.isBoss ? (
                <Crown className="w-14 h-14 text-white" strokeWidth={2.5} />
              ) : (
                <Trophy className="w-14 h-14 text-white" strokeWidth={2.5} />
              )}
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white mb-1">
            {level.isBoss ? "БОСС ПОВЕРЖЕН!" : "Победа!"}
          </h2>
          <p
            className={`text-sm mb-1 ${
              level.isBoss ? "text-amber-300/80" : "text-emerald-300/80"
            }`}
          >
            {level.title}
          </p>
          <p className="text-slate-500 text-xs mb-5">
            {world.emoji} {world.title} · Уровень {level.id} из {world.levels.length}
          </p>

          {/* Звёзды — каждая с задержкой появления */}
          <div className="flex justify-center gap-3 mb-6 min-h-[60px]">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`text-6xl animate-star-pop ${
                  s <= stars ? "" : "opacity-15"
                }`}
                style={{
                  animationDelay: `${0.6 + s * 0.25}s`,
                  filter: s <= stars ? "drop-shadow(0 0 12px rgba(251,191,36,0.6))" : "none",
                }}
              >
                {s <= stars ? "⭐" : "☆"}
              </span>
            ))}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div className="glass-card p-3 bg-emerald-500/5 border-emerald-500/20">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400/80 mb-1 font-bold">
                ✓ Правильных
              </p>
              <p className="text-2xl font-bold text-white tabular-nums">
                {correctCount}
                <span className="text-slate-500 text-base"> / {total}</span>
              </p>
            </div>
            <div className="glass-card p-3 bg-amber-500/5 border-amber-500/20">
              <p className="text-[10px] uppercase tracking-wider text-amber-400/80 mb-1 font-bold">
                🪙 Награда
              </p>
              <p className="text-2xl font-bold text-amber-300 tabular-nums">
                +{earnedSawab}
                <span className="text-xs text-slate-500 ml-1 font-normal">саваб</span>
              </p>
            </div>
          </div>

          {/* Прогресс по миру */}
          <div className="glass-card p-3 mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Прогресс мира
              </span>
              <span className="text-xs text-white font-bold tabular-nums">
                {passedInWorld} / {world.levels.length}
              </span>
            </div>
            <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${
                  level.isBoss ? "from-amber-500 to-orange-400" : "from-emerald-500 to-emerald-400"
                } rounded-full transition-all duration-1000`}
                style={{ width: `${(passedInWorld / world.levels.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Кнопки */}
          {hasNext && (
            <button
              onClick={() => navigate(`/quest/${worldId}/${level.id + 1}`)}
              className={`w-full py-3.5 rounded-xl ${
                level.isBoss
                  ? "bg-amber-500/30 hover:bg-amber-500/40 ring-amber-400/40 shadow-amber-500/30"
                  : "bg-emerald-500/30 hover:bg-emerald-500/40 ring-emerald-400/40 shadow-emerald-500/30"
              } active:scale-[0.98] text-white font-bold ring-1 shadow-lg transition`}
            >
              Следующий уровень →
            </button>
          )}
          {isLastInWorld && (
            <div className="glass-card p-3 bg-gradient-to-br from-violet-500/10 to-transparent border-violet-500/30 mb-2">
              <p className="text-white text-sm font-bold">🎊 Мир завершён!</p>
              <p className="text-slate-400 text-xs mt-1">
                Выбери следующий мир из карты
              </p>
            </div>
          )}
          <button
            onClick={() => navigate("/quest")}
            className={`w-full mt-2 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] text-slate-300 font-medium transition`}
          >
            ← К карте мира
          </button>
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
