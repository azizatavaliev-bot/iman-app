import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Search,
  Moon,
  Check,
  Info,
} from "lucide-react";
import { storage } from "../lib/storage";
import { scheduleSyncPush } from "../lib/sync";
import { trackAction } from "../lib/analytics";
import {
  DREAM_SYMBOLS,
  DREAM_CATEGORIES,
  DREAM_INFO,
  type DreamCategory,
} from "../data/dreams";

// ─────────────────────────────────────────────────────────────────────────────
// Dreams — Islamic Dream Interpretation based on Ibn Sirin
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "iman_dreams_read";
const POINTS_PER_SYMBOL = 1;

function getReadSymbols(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

function saveReadSymbols(ids: number[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  scheduleSyncPush();
}

export default function Dreams() {
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    DreamCategory | "all"
  >("all");
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    setReadIds(new Set(getReadSymbols()));
    trackAction("dreams_opened");
  }, []);

  const readCount = readIds.size;
  const totalCount = DREAM_SYMBOLS.length;
  const progressPct = Math.round((readCount / totalCount) * 100);

  const handleToggle = (symbolId: number) => {
    const isClosing = expandedId === symbolId;
    setExpandedId(isClosing ? null : symbolId);

    if (!isClosing && !readIds.has(symbolId)) {
      const newReadIds = new Set(readIds);
      newReadIds.add(symbolId);
      setReadIds(newReadIds);
      saveReadSymbols(Array.from(newReadIds));
      storage.addExtraPoints(POINTS_PER_SYMBOL);
      trackAction("dream_symbol_read", { symbolId });
    }
  };

  const filtered = DREAM_SYMBOLS.filter((s) => {
    const matchCat =
      activeCategory === "all" || s.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.symbol.toLowerCase().includes(q) ||
      s.meaning.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen pb-28 px-4 pt-6 max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => window.history.back()}
          className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <ChevronLeft size={18} style={{ color: "var(--text-secondary)" }} />
        </button>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Moon size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Толкование снов
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              По Ибн Сирину
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            showInfo
              ? "bg-indigo-500/20 text-indigo-300"
              : "glass-card"
          }`}
        >
          <Info
            size={18}
            style={showInfo ? undefined : { color: "var(--text-muted)" }}
          />
        </button>
      </header>

      {/* Info panel */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          showInfo ? "max-h-[2000px] opacity-100 mb-5" : "max-h-0 opacity-0"
        }`}
      >
        <div className="glass-card p-4 animate-slide-down">
          <p
            className="text-sm font-semibold mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            {DREAM_INFO.title}
          </p>
          <p
            className="text-sm leading-relaxed mb-4 italic"
            style={{ color: "var(--text-secondary)" }}
          >
            {DREAM_INFO.intro}
          </p>

          {/* Three types of dreams */}
          <div className="space-y-3 mb-4">
            {DREAM_INFO.types.map((type) => (
              <div
                key={type.name}
                className="flex gap-3 p-3 rounded-xl"
                style={{ background: "var(--bg-input)" }}
              >
                <span className="text-xl shrink-0">{type.icon}</span>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {type.name}
                  </p>
                  <p
                    className="text-xs leading-relaxed mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {type.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Etiquette */}
          <p
            className="text-xs font-semibold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Адаб (этикет) снов:
          </p>
          <ul className="space-y-1.5">
            {DREAM_INFO.etiquette.map((rule, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                <span className="text-indigo-400 mt-0.5">•</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Progress */}
      <div className="glass-card p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Изучено символов
          </span>
          <span className="text-sm font-bold text-indigo-400">
            {readCount}/{totalCount} ({progressPct}%)
          </span>
        </div>
        <div
          className="h-2 rounded-full"
          style={{ background: "var(--progress-bg)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, #6366f1, #818cf8)",
              boxShadow: "0 0 12px rgba(99,102,241,0.4)",
            }}
          />
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          placeholder="Что вам приснилось?"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
          style={{
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-input)",
          }}
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1">
        <button
          onClick={() => setActiveCategory("all")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeCategory === "all"
              ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30"
              : "text-slate-400 hover:text-slate-300"
          }`}
          style={
            activeCategory !== "all"
              ? { background: "var(--bg-input)" }
              : undefined
          }
        >
          Все ({DREAM_SYMBOLS.length})
        </button>
        {DREAM_CATEGORIES.map((cat) => {
          const count = DREAM_SYMBOLS.filter(
            (s) => s.category === cat.key
          ).length;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat.key
                  ? `bg-${cat.color}-500/20 text-${cat.color}-300 ring-1 ring-${cat.color}-500/30`
                  : "text-slate-400 hover:text-slate-300"
              }`}
              style={
                activeCategory !== cat.key
                  ? { background: "var(--bg-input)" }
                  : undefined
              }
            >
              {cat.icon} {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Symbols list */}
      <div className="space-y-2.5">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">🌙</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Символ не найден
            </p>
          </div>
        )}
        {filtered.map((symbol, idx) => {
          const isExpanded = expandedId === symbol.id;
          const isRead = readIds.has(symbol.id);
          const cat = DREAM_CATEGORIES.find(
            (c) => c.key === symbol.category
          );

          return (
            <div
              key={symbol.id}
              className={`glass-card overflow-hidden transition-all duration-300 ${
                isExpanded ? "ring-1 ring-indigo-500/20" : ""
              }`}
              style={{ animationDelay: `${0.02 * idx}s` }}
            >
              <button
                onClick={() => handleToggle(symbol.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div
                  className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-lg ${
                    isRead ? "bg-emerald-500/20" : "bg-indigo-500/10"
                  }`}
                >
                  {isRead ? (
                    <Check size={14} className="text-emerald-400" />
                  ) : (
                    <span>{symbol.icon}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {symbol.symbol}
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {symbol.meaning}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUp
                    size={16}
                    style={{ color: "var(--text-muted)" }}
                  />
                ) : (
                  <ChevronDown
                    size={16}
                    style={{ color: "var(--text-muted)" }}
                  />
                )}
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isExpanded
                    ? "max-h-[600px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-4 pb-4 animate-slide-down">
                  <div
                    className="h-px mb-3"
                    style={{ background: "var(--border-primary)" }}
                  />

                  {/* Icon large */}
                  <div className="text-center mb-3">
                    <span className="text-4xl">{symbol.icon}</span>
                  </div>

                  {/* Category */}
                  <div className="flex justify-center mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs bg-${cat?.color}-500/10 text-${cat?.color}-300`}
                    >
                      {cat?.icon} {cat?.name}
                    </span>
                  </div>

                  {/* Meaning */}
                  <p
                    className="text-sm font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {symbol.meaning}
                  </p>

                  {/* Details */}
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {symbol.details}
                  </p>

                  {/* Source */}
                  {symbol.source && (
                    <p
                      className="text-xs mt-3 italic"
                      style={{ color: "var(--text-faint)" }}
                    >
                      Источник: {symbol.source}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
