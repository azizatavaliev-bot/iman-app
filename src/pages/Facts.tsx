import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, Search, Sparkles, Shuffle } from "lucide-react";
import { trackAction } from "../lib/analytics";
import {
  FACTS,
  FACT_CATEGORIES,
  getFactOfTheDay,
  type FactCategory,
} from "../data/facts";

const READ_KEY = "iman_facts_read";

function loadRead(): Set<number> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}

function saveRead(set: Set<number>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export default function Facts() {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<FactCategory | "all">("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const [read, setRead] = useState<Set<number>>(new Set());

  const factOfTheDay = useMemo(() => getFactOfTheDay(), []);

  useEffect(() => {
    setRead(loadRead());
    trackAction("facts_opened");
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FACTS.filter((f) => {
      if (activeCat !== "all" && f.category !== activeCat) return false;
      if (!q) return true;
      return (
        f.title.toLowerCase().includes(q) || f.body.toLowerCase().includes(q)
      );
    });
  }, [search, activeCat]);

  const toggleOpen = (id: number) => {
    setOpenId(openId === id ? null : id);
    if (!read.has(id)) {
      const next = new Set(read);
      next.add(id);
      setRead(next);
      saveRead(next);
    }
  };

  const random = () => {
    const idx = Math.floor(Math.random() * FACTS.length);
    setOpenId(FACTS[idx].id);
    document
      .getElementById(`fact-${FACTS[idx].id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen pb-28 px-4 pt-6 max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <header className="flex items-center gap-3 mb-5">
        <button
          onClick={() => window.history.back()}
          className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <ChevronLeft size={18} className="text-slate-300" />
        </button>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl">
            💡
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white">Факты об исламе</h1>
            <p className="text-xs text-slate-500">
              {FACTS.length} проверенных фактов · {read.size} прочитано
            </p>
          </div>
        </div>
        <button
          onClick={random}
          title="Случайный факт"
          className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Shuffle size={16} className="text-amber-400" />
        </button>
      </header>

      {/* Fact of the day */}
      <button
        onClick={() => toggleOpen(factOfTheDay.id)}
        className="w-full text-left glass-card p-4 mb-4 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent border border-indigo-500/20"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-indigo-400" />
          <span className="text-[11px] uppercase tracking-wider text-indigo-300 font-bold">
            Факт дня
          </span>
        </div>
        <p className="text-white font-semibold text-[15px] mb-1">
          {factOfTheDay.title}
        </p>
        <p className="text-xs text-slate-400 line-clamp-2">
          {factOfTheDay.body}
        </p>
      </button>

      {/* Search */}
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск факта..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white outline-none bg-white/[0.04] border border-white/5 focus:border-indigo-500/30 transition"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1">
        <button
          onClick={() => setActiveCat("all")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeCat === "all"
              ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30"
              : "bg-white/[0.03] text-slate-400 hover:text-slate-300"
          }`}
        >
          Все ({FACTS.length})
        </button>
        {FACT_CATEGORIES.map((cat) => {
          const count = FACTS.filter((f) => f.category === cat.key).length;
          const active = activeCat === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCat(cat.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                active
                  ? "bg-white/10 text-white ring-1 ring-white/20"
                  : "bg-white/[0.03] text-slate-400 hover:text-slate-300"
              }`}
            >
              <span className="mr-1">{cat.emoji}</span>
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm text-slate-500">Ничего не найдено</p>
          </div>
        )}
        {filtered.map((f) => {
          const cat = FACT_CATEGORIES.find((c) => c.key === f.category);
          const isOpen = openId === f.id;
          const isRead = read.has(f.id);
          return (
            <div
              key={f.id}
              id={`fact-${f.id}`}
              className={`glass-card overflow-hidden transition-all ${
                isOpen ? "ring-1 ring-indigo-500/20" : ""
              }`}
            >
              <button
                onClick={() => toggleOpen(f.id)}
                className="w-full flex items-start gap-3 p-3.5 text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-base shrink-0">
                  {cat?.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-semibold text-sm flex-1 ${
                        isRead ? "text-slate-300" : "text-white"
                      }`}
                    >
                      {f.title}
                    </p>
                    {isRead && (
                      <span className="text-emerald-400 text-[10px]">✓</span>
                    )}
                  </div>
                  {!isOpen && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {f.body}
                    </p>
                  )}
                </div>
              </button>
              {isOpen && (
                <div className="px-3.5 pb-4 -mt-1 animate-slide-down">
                  <div className="h-px bg-white/[0.05] mb-3" />
                  <p className="text-sm leading-relaxed text-slate-200">
                    {f.body}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      Категория:
                    </span>
                    <span className="text-[10px] text-slate-300">
                      {cat?.emoji} {cat?.name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
