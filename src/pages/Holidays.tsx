import { useState, useEffect } from "react";
import { ChevronLeft, Calendar, Star, Gift } from "lucide-react";
import { trackAction } from "../lib/analytics";
import {
  HOLIDAYS,
  getTodayHoliday,
  getNextHoliday,
  daysUntil,
  type Holiday,
} from "../data/holidays";

const COLOR_MAP: Record<
  Holiday["color"],
  { bg: string; border: string; text: string; ring: string }
> = {
  emerald: {
    bg: "from-emerald-500/15 to-emerald-500/5",
    border: "border-emerald-500/30",
    text: "text-emerald-300",
    ring: "ring-emerald-500/30",
  },
  amber: {
    bg: "from-amber-500/15 to-amber-500/5",
    border: "border-amber-500/30",
    text: "text-amber-300",
    ring: "ring-amber-500/30",
  },
  rose: {
    bg: "from-rose-500/15 to-rose-500/5",
    border: "border-rose-500/30",
    text: "text-rose-300",
    ring: "ring-rose-500/30",
  },
  violet: {
    bg: "from-violet-500/15 to-violet-500/5",
    border: "border-violet-500/30",
    text: "text-violet-300",
    ring: "ring-violet-500/30",
  },
  sky: {
    bg: "from-sky-500/15 to-sky-500/5",
    border: "border-sky-500/30",
    text: "text-sky-300",
    ring: "ring-sky-500/30",
  },
  teal: {
    bg: "from-teal-500/15 to-teal-500/5",
    border: "border-teal-500/30",
    text: "text-teal-300",
    ring: "ring-teal-500/30",
  },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Holidays() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const today = new Date();
  const todayHoliday = getTodayHoliday(today);
  const nextHoliday = getNextHoliday(today);

  useEffect(() => {
    trackAction("holidays_opened");
  }, []);

  // Sort by date: today/upcoming first
  const sorted = [...HOLIDAYS].sort((a, b) => {
    const aDaysUntil = daysUntil(a, today);
    const bDaysUntil = daysUntil(b, today);
    // Past dates go to bottom
    const aFuture = aDaysUntil >= 0;
    const bFuture = bDaysUntil >= 0;
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    return Math.abs(aDaysUntil) - Math.abs(bDaysUntil);
  });

  return (
    <div className="min-h-screen pb-28 max-w-lg mx-auto animate-fade-in">
      {/* Decorative hero header */}
      <div className="relative px-4 pt-4 pb-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-2 left-4 w-24 h-24 bg-amber-500/8 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-center gap-3 mb-3">
          <button
            onClick={() => window.history.back()}
            className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <ChevronLeft size={18} className="text-slate-300" />
          </button>
          <div className="flex-1" />
        </div>

        <div className="relative text-center">
          <p className="text-amber-400/60 text-base mb-1" style={{ fontFamily: "'Amiri', serif" }}>
            ﷽
          </p>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center justify-center gap-2">
            <span className="text-2xl">📅</span>
            Праздники ислама
          </h1>
          <p className="text-emerald-400/70 text-xs">
            Священные даты и значимые дни
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-emerald-500/40" />
            <span className="text-emerald-500/40 text-xs">✦</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-emerald-500/40" />
          </div>
        </div>
      </div>

      <div className="px-4">

      {/* Today */}
      {todayHoliday && (
        <div
          className={`mb-4 rounded-2xl p-4 bg-gradient-to-br ${COLOR_MAP[todayHoliday.color].bg} border ${COLOR_MAP[todayHoliday.color].border} relative overflow-hidden`}
        >
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">
            Сегодня
          </div>
          <div className="text-4xl mb-2">{todayHoliday.emoji}</div>
          <h2 className="text-xl font-bold text-white mb-1">
            {todayHoliday.name}
          </h2>
          <p
            className="text-base mb-2"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            <span className={COLOR_MAP[todayHoliday.color].text}>
              {todayHoliday.nameAr}
            </span>
          </p>
          <p className="text-sm text-slate-200 mb-3">{todayHoliday.short}</p>
          <p className="text-xs text-slate-400">{todayHoliday.hijriDate}</p>
        </div>
      )}

      {/* Next holiday countdown */}
      {!todayHoliday && nextHoliday && (
        <div className="glass-card p-4 mb-4 flex items-center gap-3">
          <div className="text-3xl">{nextHoliday.emoji}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Ближайший праздник
            </p>
            <p className="text-white font-semibold truncate">
              {nextHoliday.name}
            </p>
            <p className="text-xs text-slate-400">
              {formatDate(nextHoliday.date2026)}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">
              {daysUntil(nextHoliday, today)}
            </p>
            <p className="text-[10px] text-slate-500">дней</p>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2.5">
        {sorted.map((h) => {
          const days = daysUntil(h, today);
          const isPast = days < 0;
          const isToday = days === 0;
          const isExpanded = expanded === h.key;
          const colors = COLOR_MAP[h.color];
          return (
            <div
              key={h.key}
              className={`glass-card overflow-hidden transition-all ${
                isExpanded ? `ring-1 ${colors.ring}` : ""
              } ${isPast ? "opacity-60" : ""}`}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : h.key)}
                className="w-full flex items-start gap-3 p-4 text-left"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${colors.bg} border ${colors.border} text-xl shrink-0`}
                >
                  {h.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold text-[15px]">
                      {h.name}
                    </p>
                    {isToday && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase animate-pulse">
                        Сегодня
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {h.short}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                    <Calendar size={10} />
                    {formatDate(h.date2026)}
                    {!isPast && !isToday && (
                      <span className={colors.text}>
                        · через {days}{" "}
                        {days === 1
                          ? "день"
                          : days < 5
                            ? "дня"
                            : "дней"}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 -mt-1 animate-slide-down">
                  <div className="h-px bg-white/[0.05] mb-3" />

                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                    Хиджра
                  </p>
                  <p className="text-sm text-slate-200 mb-3">{h.hijriDate}</p>

                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                    Суть праздника
                  </p>
                  <p className="text-sm leading-relaxed text-slate-200 mb-3">
                    {h.about}
                  </p>

                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                    Что принято делать
                  </p>
                  <ul className="space-y-1.5 mb-3">
                    {h.traditions.map((t, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-slate-300"
                      >
                        <Star
                          size={12}
                          className={`${colors.text} mt-1 shrink-0`}
                        />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>

                  <div
                    className={`rounded-xl p-3 bg-gradient-to-br ${colors.bg} border ${colors.border}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Gift size={12} className={colors.text} />
                      <p
                        className={`text-[10px] uppercase tracking-wider font-bold ${colors.text}`}
                      >
                        Награда
                      </p>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-200">
                      {h.reward}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
