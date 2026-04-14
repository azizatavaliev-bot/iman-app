import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Search,
  BookOpen,
  Check,
} from "lucide-react";
import { storage } from "../lib/storage";
import { scheduleSyncPush } from "../lib/sync";
import { trackAction } from "../lib/analytics";
import {
  ISLAMIC_TERMS,
  TERM_CATEGORIES,
  type TermCategory,
} from "../data/terms";

// ─────────────────────────────────────────────────────────────────────────────
// Terms Dictionary — Interactive Islamic glossary with categories and search
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "iman_terms_read";
const POINTS_PER_TERM = 1;

function getReadTerms(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

function saveReadTerms(ids: number[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  scheduleSyncPush();
}

export default function Terms() {
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<TermCategory | "all">(
    "all"
  );

  useEffect(() => {
    setReadIds(new Set(getReadTerms()));
    trackAction("terms_opened");
  }, []);

  const readCount = readIds.size;
  const totalCount = ISLAMIC_TERMS.length;
  const progressPct = Math.round((readCount / totalCount) * 100);

  const handleToggle = (termId: number) => {
    const isClosing = expandedId === termId;
    setExpandedId(isClosing ? null : termId);

    if (!isClosing && !readIds.has(termId)) {
      const newReadIds = new Set(readIds);
      newReadIds.add(termId);
      setReadIds(newReadIds);
      saveReadTerms(Array.from(newReadIds));
      storage.addExtraPoints(POINTS_PER_TERM);
      trackAction("term_read", { termId });
    }
  };

  const filtered = ISLAMIC_TERMS.filter((t) => {
    const matchCategory =
      activeCategory === "all" || t.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.term.toLowerCase().includes(q) ||
      t.arabic.includes(q) ||
      t.meaning.toLowerCase().includes(q);
    return matchCategory && matchSearch;
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
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <BookOpen size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Словарь терминов
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {totalCount} терминов
            </p>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="glass-card p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Изучено
          </span>
          <span className="text-sm font-bold text-violet-400">
            {readCount}/{totalCount} ({progressPct}%)
          </span>
        </div>
        <div className="h-2 rounded-full" style={{ background: "var(--progress-bg)" }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, #8b5cf6, #a78bfa)",
              boxShadow: "0 0 12px rgba(139,92,246,0.4)",
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
          placeholder="Поиск термина..."
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
              ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30"
              : "text-slate-400 hover:text-slate-300"
          }`}
          style={
            activeCategory !== "all"
              ? { background: "var(--bg-input)" }
              : undefined
          }
        >
          Все ({ISLAMIC_TERMS.length})
        </button>
        {TERM_CATEGORIES.map((cat) => {
          const count = ISLAMIC_TERMS.filter(
            (t) => t.category === cat.key
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

      {/* Terms list */}
      <div className="space-y-2.5">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Ничего не найдено
            </p>
          </div>
        )}
        {filtered.map((term, idx) => {
          const isExpanded = expandedId === term.id;
          const isRead = readIds.has(term.id);
          const cat = TERM_CATEGORIES.find((c) => c.key === term.category);

          return (
            <div
              key={term.id}
              className={`glass-card overflow-hidden transition-all duration-300 ${
                isExpanded ? "ring-1 ring-violet-500/20" : ""
              }`}
              style={{ animationDelay: `${0.02 * idx}s` }}
            >
              <button
                onClick={() => handleToggle(term.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div
                  className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-sm ${
                    isRead
                      ? "bg-emerald-500/20"
                      : "bg-violet-500/10"
                  }`}
                >
                  {isRead ? (
                    <Check size={14} className="text-emerald-400" />
                  ) : (
                    <span>{cat?.icon}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {term.term}
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {term.meaning}
                  </p>
                </div>
                <span className="arabic-text text-base text-amber-300/70 shrink-0 ml-1">
                  {term.arabic}
                </span>
                {isExpanded ? (
                  <ChevronUp size={16} style={{ color: "var(--text-muted)" }} />
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
                  <div className="h-px mb-3" style={{ background: "var(--border-primary)" }} />

                  {/* Arabic */}
                  <div className="text-center mb-3">
                    <span className="arabic-text text-2xl text-amber-200">
                      {term.arabic}
                    </span>
                  </div>

                  {/* Meaning */}
                  <p
                    className="text-sm leading-relaxed mb-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {term.details}
                  </p>

                  {/* Related terms */}
                  {term.related && term.related.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Связанные:
                      </span>
                      {term.related.map((r) => (
                        <span
                          key={r}
                          className="px-2 py-0.5 rounded-full text-xs bg-violet-500/10 text-violet-300"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
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
