import { useEffect, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import {
  ChevronLeft,
  Lock,
  Crown,
  Star,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  QUEST_WORLDS,
  loadQuestProgress,
  isLevelUnlocked,
  isWorldUnlocked,
} from "../data/quest";
import { trackAction } from "../lib/analytics";

const COLOR_THEMES: Record<
  string,
  { from: string; to: string; ring: string; text: string }
> = {
  emerald: {
    from: "from-emerald-500/30",
    to: "to-emerald-700/20",
    ring: "ring-emerald-500/40",
    text: "text-emerald-300",
  },
  amber: {
    from: "from-amber-500/30",
    to: "to-orange-600/20",
    ring: "ring-amber-500/40",
    text: "text-amber-300",
  },
  rose: {
    from: "from-rose-500/30",
    to: "to-rose-700/20",
    ring: "ring-rose-500/40",
    text: "text-rose-300",
  },
  violet: {
    from: "from-violet-500/30",
    to: "to-violet-700/20",
    ring: "ring-violet-500/40",
    text: "text-violet-300",
  },
  sky: {
    from: "from-sky-500/30",
    to: "to-sky-700/20",
    ring: "ring-sky-500/40",
    text: "text-sky-300",
  },
  teal: {
    from: "from-teal-500/30",
    to: "to-teal-700/20",
    ring: "ring-teal-500/40",
    text: "text-teal-300",
  },
  indigo: {
    from: "from-indigo-500/30",
    to: "to-indigo-700/20",
    ring: "ring-indigo-500/40",
    text: "text-indigo-300",
  },
};

export default function QuestWorldMap() {
  const navigate = useNavigate();
  const { worldId } = useParams<{ worldId: string }>();
  const [progress, setProgress] = useState(() => loadQuestProgress());

  useEffect(() => {
    trackAction("quest_world_opened", { world: worldId });
    setProgress(loadQuestProgress());
  }, [worldId]);

  const world = QUEST_WORLDS.find((w) => w.id === worldId);

  if (!world) {
    return <Navigate to="/quest" replace />;
  }

  if (!isWorldUnlocked(world.id)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Lock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-white mb-3">Мир пока закрыт</p>
          <p className="text-slate-500 text-xs mb-4">
            Пройди предыдущий мир, чтобы открыть этот
          </p>
          <button
            onClick={() => navigate("/quest")}
            className="glass-card px-4 py-2 text-emerald-300"
          >
            ← К мирам
          </button>
        </div>
      </div>
    );
  }

  const theme = COLOR_THEMES[world.color];
  const worldProgress = progress[world.id] || {};
  const completedCount = Object.values(worldProgress).filter(
    (lp) => lp && lp.stars > 0,
  ).length;
  const totalStars = Object.values(worldProgress).reduce(
    (sum, lp) => sum + (lp?.stars ?? 0),
    0,
  );
  const maxStars = world.levels.length * 3;

  return (
    <div className="min-h-screen pb-28 max-w-lg mx-auto animate-fade-in">
      {/* Hero header */}
      <div
        className={`relative px-4 pt-4 pb-6 overflow-hidden bg-gradient-to-br ${theme.from} ${theme.to}`}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-orb-float" />
        <div className="absolute -bottom-12 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("/quest")}
            className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <ChevronLeft size={18} className="text-slate-300" />
          </button>
          <div className="flex-1" />
          <div className="glass-card px-3 py-1.5 flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-white text-sm font-bold tabular-nums">
              {totalStars} <span className="text-slate-500">/ {maxStars}</span>
            </span>
          </div>
        </div>

        <div className="relative text-center">
          <p className="text-amber-400/60 text-base mb-2" style={{ fontFamily: "'Amiri', serif" }}>
            ﷽
          </p>
          <div className="text-5xl mb-2">{world.emoji}</div>
          <h1 className="text-2xl font-bold text-white mb-1">{world.title}</h1>
          <p className={`text-xs ${theme.text} mb-3`}>{world.subtitle}</p>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-emerald-500/40" />
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-emerald-500/40" />
          </div>

          <p className="text-slate-400 text-xs mt-3">
            Пройдено{" "}
            <span className={`font-bold ${theme.text}`}>
              {completedCount} / {world.levels.length}
            </span>{" "}
            уровней
          </p>
        </div>
      </div>

      {/* Зигзаг уровней (как в Duolingo) */}
      <div className="px-4 pt-6">
        <div className="relative space-y-3">
          {world.levels.map((level, idx) => {
            const unlocked = isLevelUnlocked(world.id, level.id);
            const levelP = worldProgress[level.id];
            const stars = levelP?.stars ?? 0;
            const isCompleted = stars > 0;
            // Зигзаг — left/right offset
            const offset =
              idx % 4 === 0
                ? "ml-0"
                : idx % 4 === 1
                  ? "ml-12"
                  : idx % 4 === 2
                    ? "ml-16"
                    : "ml-8";

            return (
              <div
                key={level.id}
                className={`relative flex items-center gap-3 ${offset}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {/* Связующая линия с предыдущим */}
                {idx > 0 && (
                  <div
                    className={`absolute -top-3 left-7 w-px h-3 ${
                      isCompleted ? "bg-emerald-500/40" : "bg-white/[0.06]"
                    }`}
                  />
                )}

                <button
                  onClick={() => unlocked && navigate(`/quest/${world.id}/${level.id}`)}
                  disabled={!unlocked}
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all shrink-0
                              ${unlocked ? "active:scale-90 hover:scale-105 cursor-pointer" : "cursor-not-allowed"}
                              ${
                                level.isBoss
                                  ? `bg-gradient-to-br from-amber-500/40 to-orange-600/30 ring-2 ${
                                      isCompleted ? "ring-amber-400" : "ring-amber-500/30"
                                    } shadow-lg shadow-amber-500/30`
                                  : isCompleted
                                    ? `bg-gradient-to-br from-emerald-500/40 to-emerald-700/30 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/30`
                                    : unlocked
                                      ? `bg-gradient-to-br ${theme.from} ${theme.to} ring-1 ${theme.ring}`
                                      : "bg-white/[0.03] ring-1 ring-white/5"
                              }`}
                >
                  {!unlocked ? (
                    <Lock className="w-5 h-5 text-slate-600" />
                  ) : level.isBoss ? (
                    <Crown className="w-7 h-7 text-amber-300" />
                  ) : isCompleted ? (
                    <Trophy className="w-6 h-6 text-emerald-200" />
                  ) : (
                    <span className="text-white text-lg font-bold">{level.id}</span>
                  )}

                  {/* Звёздочки сверху */}
                  {isCompleted && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= stars
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-700 fill-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>

                <button
                  onClick={() => unlocked && navigate(`/quest/${world.id}/${level.id}`)}
                  disabled={!unlocked}
                  className={`flex-1 text-left rounded-xl py-2 transition ${
                    unlocked ? "active:scale-[0.99]" : "opacity-40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-semibold ${
                        unlocked ? "text-white" : "text-slate-500"
                      }`}
                    >
                      {level.title}
                    </p>
                    {level.isBoss && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold uppercase">
                        Босс
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {level.questions.length} вопросов · +{level.rewardSawab} саваб
                  </p>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
