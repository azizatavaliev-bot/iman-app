import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Lock, Star, Check } from "lucide-react";
import { QUEST_WORLDS, isWorldUnlocked, getWorldStats } from "../data/quest";
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

export default function Quest() {
  const navigate = useNavigate();
  const [, forceRerender] = useState(0);

  useEffect(() => {
    trackAction("quest_map_opened");
    // Прогресс мог измениться, пока была открыта другая страница
    forceRerender((n) => n + 1);
  }, []);

  const totalStars = QUEST_WORLDS.reduce(
    (sum, w) => sum + getWorldStats(w.id).stars,
    0,
  );
  const totalMaxStars = QUEST_WORLDS.reduce(
    (sum, w) => sum + getWorldStats(w.id).maxStars,
    0,
  );

  return (
    <div className="min-h-screen pb-28 max-w-lg mx-auto animate-fade-in px-4 pt-4">
      <div className="relative flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <ChevronLeft size={18} className="text-slate-300" />
        </button>
        <div className="flex-1" />
        <div className="glass-card px-3 py-1.5 flex items-center gap-1.5">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-white text-sm font-bold tabular-nums">
            {totalStars} <span className="text-slate-500">/ {totalMaxStars}</span>
          </span>
        </div>
      </div>

      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🎮</div>
        <h1 className="text-2xl font-bold text-white mb-1">IMAN Quest</h1>
        <p className="text-slate-400 text-xs">
          Выбери мир и проходи уровни, отвечая на вопросы об исламе
        </p>
      </div>

      <div className="space-y-3">
        {QUEST_WORLDS.map((world) => {
          const theme = COLOR_THEMES[world.color];
          const unlocked = isWorldUnlocked(world.id);
          const stats = getWorldStats(world.id);
          const isDone = stats.completed === stats.total && stats.total > 0;

          return (
            <button
              key={world.id}
              onClick={() => unlocked && navigate(`/quest/${world.id}`)}
              disabled={!unlocked}
              className={`w-full text-left relative overflow-hidden rounded-2xl p-4 flex items-center gap-4 transition-all bg-gradient-to-br ${
                unlocked ? `${theme.from} ${theme.to}` : "from-white/[0.03] to-transparent"
              } ${unlocked ? "active:scale-[0.98] hover:scale-[1.01] cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
              style={{
                border: `1px solid ${unlocked ? "var(--border-secondary)" : "rgba(255,255,255,0.05)"}`,
              }}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${
                  unlocked ? "bg-white/[0.06]" : "bg-white/[0.02]"
                }`}
              >
                {unlocked ? world.emoji : <Lock className="w-6 h-6 text-slate-600" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-bold ${unlocked ? "text-white" : "text-slate-500"}`}>
                    {world.title}
                  </p>
                  {isDone && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-emerald-300" />
                    </span>
                  )}
                </div>
                <p className={`text-xs ${unlocked ? theme.text : "text-slate-600"} truncate`}>
                  {unlocked ? world.subtitle : "Пройди предыдущий мир"}
                </p>

                {unlocked && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                        style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 tabular-nums shrink-0">
                      {stats.completed}/{stats.total}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
