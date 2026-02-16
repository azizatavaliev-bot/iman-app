import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Check,
} from "lucide-react";
import { storage } from "../lib/storage";
import { SEERAH_CHAPTERS } from "../data/seerah";

// ─────────────────────────────────────────────────────────────────────────────
// Seerah Page — Life of Prophet Muhammad (peace be upon him)
// Timeline-based chapter reader with reading progress tracking
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "iman_seerah_read";

function getReadChapters(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

function saveReadChapters(ids: number[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export default function Seerah() {
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Load read chapters from localStorage
  useEffect(() => {
    const stored = getReadChapters();
    setReadIds(new Set(stored));
  }, []);

  const readCount = readIds.size;
  const totalCount = SEERAH_CHAPTERS.length;
  const progressPct = Math.round((readCount / totalCount) * 100);

  // Toggle chapter expand/collapse
  const handleToggle = (chapterId: number) => {
    const isClosing = expandedId === chapterId;
    setExpandedId(isClosing ? null : chapterId);

    // Mark as read on first expand and award points
    if (!isClosing && !readIds.has(chapterId)) {
      const chapter = SEERAH_CHAPTERS.find((c) => c.id === chapterId);
      if (chapter) {
        const newReadIds = new Set(readIds);
        newReadIds.add(chapterId);
        setReadIds(newReadIds);
        saveReadChapters(Array.from(newReadIds));
        storage.addPoints(chapter.points);
      }
    }
  };

  return (
    <div className="min-h-screen pb-28 px-4 pt-6 max-w-lg mx-auto animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => window.history.back()}
          className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <ChevronLeft size={18} style={{ color: "var(--text-secondary)" }} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <BookOpen size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Сира
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Жизнеописание Пророка (мир ему)
            </p>
          </div>
        </div>
      </header>

      {/* ── Progress Bar ───────────────────────────────────────────────── */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {readCount}/{totalCount} глав прочитано
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {progressPct}%
          </span>
        </div>
        <div
          className="w-full h-2.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, #10b981, #34d399)",
              boxShadow: "0 0 12px rgba(16,185,129,0.4)",
            }}
          />
        </div>
      </div>

      {/* ── Timeline ───────────────────────────────────────────────────── */}
      <div className="relative">
        {SEERAH_CHAPTERS.map((chapter, index) => {
          const isRead = readIds.has(chapter.id);
          const isExpanded = expandedId === chapter.id;
          const isLast = index === SEERAH_CHAPTERS.length - 1;

          return (
            <div
              key={chapter.id}
              className="flex gap-4 animate-fade-in"
              style={{ animationDelay: `${0.05 + index * 0.03}s` }}
            >
              {/* ── Timeline column: dot + line ──────────────────────── */}
              <div className="flex flex-col items-center flex-shrink-0 w-10">
                {/* Year badge */}
                <span
                  className="text-[9px] font-bold mb-1.5 whitespace-nowrap"
                  style={{ color: isRead ? "#34d399" : "var(--text-faint)" }}
                >
                  {chapter.year}
                </span>

                {/* Dot */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isRead ? "ring-2 ring-emerald-400/30" : ""
                  }`}
                  style={{
                    background: isRead
                      ? "linear-gradient(135deg, #10b981, #059669)"
                      : "rgba(255,255,255,0.08)",
                    boxShadow: isRead
                      ? "0 0 12px rgba(16,185,129,0.4)"
                      : "none",
                  }}
                >
                  {isRead ? (
                    <Check size={10} className="text-white" />
                  ) : (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: "rgba(255,255,255,0.2)" }}
                    />
                  )}
                </div>

                {/* Connecting line */}
                {!isLast && (
                  <div
                    className="w-0.5 flex-1 min-h-[24px]"
                    style={{
                      background: isRead
                        ? "rgba(16,185,129,0.3)"
                        : "rgba(255,255,255,0.06)",
                    }}
                  />
                )}
              </div>

              {/* ── Chapter card ─────────────────────────────────────── */}
              <div className={`flex-1 ${isLast ? "pb-4" : "pb-3"}`}>
                <div
                  className={`glass-card p-4 cursor-pointer transition-all duration-300 ${
                    isExpanded
                      ? "ring-1 ring-emerald-500/20"
                      : "hover:bg-white/[0.04] active:scale-[0.99]"
                  }`}
                  onClick={() => handleToggle(chapter.id)}
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-sm font-semibold leading-snug"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {chapter.title}
                      </h3>
                      <p
                        className="text-xs mt-1 leading-relaxed"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {chapter.summary}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                      {isRead && (
                        <span className="text-[10px] text-emerald-400/70 font-medium">
                          +{chapter.points}
                        </span>
                      )}
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
                    </div>
                  </div>

                  {/* Expanded content */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded
                        ? "max-h-[2000px] opacity-100 mt-4"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                      <div className="w-1 h-1 rounded-full bg-emerald-500/30" />
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                    </div>

                    {/* Content paragraphs */}
                    <div className="space-y-3 mb-4">
                      {chapter.content.split("\n\n").map((paragraph, pIdx) => (
                        <p
                          key={pIdx}
                          className="text-sm leading-relaxed"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* Key Events */}
                    <div
                      className="rounded-xl p-3.5"
                      style={{ background: "rgba(16,185,129,0.06)" }}
                    >
                      <h4
                        className="text-xs font-semibold uppercase tracking-widest mb-3"
                        style={{ color: "rgba(52,211,153,0.8)" }}
                      >
                        Ключевые события
                      </h4>
                      <ul className="space-y-2">
                        {chapter.keyEvents.map((event, eIdx) => (
                          <li key={eIdx} className="flex items-start gap-2">
                            <div
                              className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                              style={{ background: "#34d399" }}
                            />
                            <span
                              className="text-xs leading-relaxed"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {event}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Source */}
                    {chapter.source && (
                      <p
                        className="mt-3 text-[10px] leading-relaxed"
                        style={{ color: "var(--text-faint)" }}
                      >
                        Источники: {chapter.source}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom spacer for nav */}
      <div className="h-8" />
    </div>
  );
}
