import { useState, useEffect, useRef, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Share2,
  ScrollText,
  BookMarked,
} from "lucide-react";
import { storage } from "../lib/storage";
import { scheduleSyncPush } from "../lib/sync";
import { SEERAH_CHAPTERS, PROPHET_LIFE_YEARS } from "../data/seerah";
import { ReadingTimerBar } from "../components/ReadingTimer";
import { hapticImpact } from "../lib/api";

type ReadMode = "scroll" | "book";
const MODE_KEY = "iman_seerah_mode";
const POS_KEY = "iman_seerah_pos"; // индекс главы, где остановился (книжный режим)

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
  scheduleSyncPush();
}

export default function Seerah() {
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchParams] = useSearchParams();

  // Переход из мега-поиска: ?id=N — раскрываем нужный элемент и скроллим к нему
  useEffect(() => {
    const id = Number(searchParams.get("id"));
    if (!id) return;
    // Якоря глав отрисованы только в режиме «лента»: если у пользователя
    // сохранён режим «книга», переход из поиска иначе никуда не приведёт.
    setMode("scroll");
    setExpandedId(id);
    const t = setTimeout(() => {
      document
        .getElementById(`chapter-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    return () => clearTimeout(t);
  }, [searchParams]);

  const [extendedIds, setExtendedIds] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<ReadMode>(
    () => (localStorage.getItem(MODE_KEY) as ReadMode) || "scroll",
  );
  // Позиция чтения в книжном режиме (индекс главы), запоминается
  const [bookIdx, setBookIdx] = useState<number>(() => {
    const raw = Number(localStorage.getItem(POS_KEY));
    return Number.isFinite(raw) && raw >= 0 && raw < SEERAH_CHAPTERS.length
      ? raw
      : 0;
  });
  const touchStartX = useRef<number | null>(null);

  function changeMode(next: ReadMode) {
    hapticImpact("light");
    setMode(next);
    localStorage.setItem(MODE_KEY, next);
  }

  function goToChapter(idx: number, markRead = true) {
    const clamped = Math.max(0, Math.min(SEERAH_CHAPTERS.length - 1, idx));
    setBookIdx(clamped);
    localStorage.setItem(POS_KEY, String(clamped));
    if (markRead) {
      const ch = SEERAH_CHAPTERS[clamped];
      if (ch && !readIds.has(ch.id)) {
        const next = new Set(readIds);
        next.add(ch.id);
        setReadIds(next);
        saveReadChapters(Array.from(next));
        storage.addExtraPoints(ch.points);
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Render text with **bold** segments */
  function renderRichText(text: string): ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) {
        return (
          <strong key={i} className="text-emerald-300 font-semibold">
            {p.slice(2, -2)}
          </strong>
        );
      }
      return p;
    });
  }

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
        storage.addExtraPoints(chapter.points);
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

      {/* ── Таймер чтения ──────────────────────────────────────────────── */}
      <div className="mb-3">
        <ReadingTimerBar section="Сира" />
      </div>

      {/* ── Переключатель режима чтения ────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl glass-card mb-4">
        <button
          onClick={() => changeMode("scroll")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            mode === "scroll"
              ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ScrollText className="w-3.5 h-3.5" />
          Лента
        </button>
        <button
          onClick={() => changeMode("book")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            mode === "book"
              ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookMarked className="w-3.5 h-3.5" />
          Книга
        </button>
      </div>

      {/* ── Progress Bar ───────────────────────────────────────────────── */}
      <div className="glass-card p-4 mb-4">
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

      {/* ── Life Timeline (Visualization) ───────────────────────────────── */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Жизнь Пророка ﷺ
            </p>
            <p className="text-white text-sm font-semibold">
              570 — 632 г. ·{" "}
              <span className="text-emerald-400">{PROPHET_LIFE_YEARS} лет</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Пророчество
            </p>
            <p className="text-white text-sm font-semibold">
              с 40 лет ·{" "}
              <span className="text-amber-400">23 года</span>
            </p>
          </div>
        </div>

        {/* Life bar with event markers */}
        <div className="relative h-8 mb-1">
          {/* base line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full bg-white/[0.06]" />
          {/* prophecy segment (40 → 63) */}
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500/60 to-emerald-500/60"
            style={{
              left: `${(40 / PROPHET_LIFE_YEARS) * 100}%`,
              width: `${(23 / PROPHET_LIFE_YEARS) * 100}%`,
            }}
          />
          {/* chapter markers */}
          {SEERAH_CHAPTERS.map((c) => {
            const pct = (c.age / PROPHET_LIFE_YEARS) * 100;
            const isRead = readIds.has(c.id);
            return (
              <button
                key={`marker-${c.id}`}
                onClick={() => {
                  document
                    .getElementById(`chapter-${c.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  setExpandedId(c.id);
                }}
                title={`${c.age} лет — ${c.title}`}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg leading-none transition-transform hover:scale-125 active:scale-95"
                style={{
                  left: `${pct}%`,
                  filter: isRead ? "none" : "grayscale(50%) opacity(0.6)",
                }}
              >
                {c.emoji}
              </button>
            );
          })}
        </div>

        {/* Age scale */}
        <div className="flex justify-between text-[9px] text-slate-500 mt-1 px-1">
          <span>0</span>
          <span>20</span>
          <span className="text-amber-400/70">40 ·миссия</span>
          <span>60</span>
          <span className="text-emerald-400/70">63</span>
        </div>
      </div>

      {/* ── Режим ЛЕНТА: таймлайн со всеми главами ─────────────────────── */}
      {mode === "scroll" && (
      <div className="relative">
        {SEERAH_CHAPTERS.map((chapter, index) => {
          const isRead = readIds.has(chapter.id);
          const isExpanded = expandedId === chapter.id;
          const isLast = index === SEERAH_CHAPTERS.length - 1;

          return (
            <div
              key={chapter.id}
              id={`chapter-${chapter.id}`}
              className="flex gap-4 animate-fade-in scroll-mt-4"
              style={{ animationDelay: `${0.05 + index * 0.03}s` }}
            >
              {/* ── Timeline column: dot + line ──────────────────────── */}
              <div className="flex flex-col items-center flex-shrink-0 w-12">
                {/* Year badge */}
                <span
                  className="text-[9px] font-bold whitespace-nowrap"
                  style={{ color: isRead ? "#34d399" : "var(--text-faint)" }}
                >
                  {chapter.year}
                </span>
                {/* Age badge */}
                <span className="text-[9px] text-slate-500 font-medium mb-1.5">
                  {chapter.age} лет
                </span>

                {/* Dot with emoji */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 text-lg ${
                    isRead ? "ring-2 ring-emerald-400/40" : ""
                  }`}
                  style={{
                    background: isRead
                      ? "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.15))"
                      : "rgba(255,255,255,0.04)",
                    boxShadow: isRead
                      ? "0 0 16px rgba(16,185,129,0.3)"
                      : "none",
                    filter: isRead ? "none" : "grayscale(20%)",
                  }}
                >
                  {chapter.emoji}
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
                      <p className="text-[10px] text-emerald-400/70 mt-0.5">
                        📍 {chapter.location}
                      </p>
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

                    {/* Quote / Key verse */}
                    {chapter.quote && (
                      <blockquote className="mb-4 border-l-2 border-amber-500/40 pl-3 py-1">
                        <p
                          className="text-sm italic leading-relaxed"
                          style={{ color: "rgba(252,211,77,0.9)" }}
                        >
                          {chapter.quote}
                        </p>
                      </blockquote>
                    )}

                    {/* Version toggle — Простая ↔ Подробная */}
                    {chapter.extended && (
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExtendedIds((prev) => {
                              const next = new Set(prev);
                              next.delete(chapter.id);
                              return next;
                            });
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                            !extendedIds.has(chapter.id)
                              ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                              : "bg-white/[0.03] text-slate-400 hover:text-slate-300"
                          }`}
                        >
                          📖 Простая
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExtendedIds((prev) => {
                              const next = new Set(prev);
                              next.add(chapter.id);
                              return next;
                            });
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                            extendedIds.has(chapter.id)
                              ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                              : "bg-white/[0.03] text-slate-400 hover:text-slate-300"
                          }`}
                        >
                          📚 Подробная
                        </button>
                      </div>
                    )}

                    {/* Content paragraphs */}
                    <div className="space-y-3 mb-4">
                      {(extendedIds.has(chapter.id) && chapter.extended
                        ? chapter.extended
                        : chapter.content
                      )
                        .split("\n\n")
                        .map((paragraph, pIdx) => (
                          <p
                            key={pIdx}
                            className="text-sm leading-relaxed whitespace-pre-line"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {renderRichText(paragraph)}
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

                    {/* Поделиться */}
                    <button
                      onClick={() => {
                        const shareText = `${chapter.title}\n\n${chapter.content.slice(0, 300)}...\n\n— IMAN App`;
                        if (navigator.share) {
                          navigator.share({ title: chapter.title, text: shareText });
                        } else {
                          navigator.clipboard.writeText(shareText);
                        }
                      }}
                      className="mt-3 w-full py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 active:scale-95 transition-all"
                      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-secondary)", color: "var(--text-secondary)" }}
                    >
                      <Share2 size={14} />
                      Поделиться
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* ── Режим КНИГА: одна глава на страницу, свайп/стрелки ──────────── */}
      {mode === "book" && (() => {
        const chapter = SEERAH_CHAPTERS[bookIdx];
        const showExt = extendedIds.has(chapter.id);
        const body = showExt && chapter.extended ? chapter.extended : chapter.content;
        return (
          <div
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              if (Math.abs(dx) > 60) {
                if (dx < 0 && bookIdx < SEERAH_CHAPTERS.length - 1)
                  goToChapter(bookIdx + 1);
                else if (dx > 0 && bookIdx > 0) goToChapter(bookIdx - 1);
              }
              touchStartX.current = null;
            }}
          >
            {/* Страница-глава */}
            <div className="glass-card p-5 animate-fade-in min-h-[60vh]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{chapter.emoji}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  Глава {bookIdx + 1} из {SEERAH_CHAPTERS.length} · {chapter.year} · {chapter.age} лет
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{chapter.title}</h2>
              <p className="text-xs text-slate-500 mb-3">📍 {chapter.location}</p>

              {chapter.quote && (
                <p className="text-sm italic text-amber-200/80 border-l-2 border-amber-500/40 pl-3 mb-4 leading-relaxed">
                  {chapter.quote}
                </p>
              )}

              <div className="text-[15px] leading-[1.8] text-slate-200 whitespace-pre-line">
                {renderRichText(body)}
              </div>

              {/* Переключатель расширенной версии */}
              {chapter.extended && (
                <button
                  onClick={() => {
                    hapticImpact("light");
                    setExtendedIds((prev) => {
                      const next = new Set(prev);
                      next.has(chapter.id)
                        ? next.delete(chapter.id)
                        : next.add(chapter.id);
                      return next;
                    });
                  }}
                  className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-300"
                >
                  {showExt ? (
                    <>
                      <ChevronUp className="w-4 h-4" /> Свернуть подробности
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" /> Подробнее из источников
                    </>
                  )}
                </button>
              )}

              {/* Ключевые события */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
                  Ключевые события
                </h4>
                <ul className="space-y-2">
                  {chapter.keyEvents.map((event, eIdx) => (
                    <li key={eIdx} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-emerald-400" />
                      <span className="text-xs leading-relaxed text-slate-400">
                        {event}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {chapter.source && (
                <p className="mt-3 text-[10px] leading-relaxed text-slate-600">
                  Источники: {chapter.source}
                </p>
              )}
            </div>

            {/* Навигация страниц */}
            <div className="flex items-center justify-between gap-3 mt-4">
              <button
                onClick={() => goToChapter(bookIdx - 1, false)}
                disabled={bookIdx === 0}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl glass-card text-sm font-medium text-slate-300 disabled:opacity-30 active:scale-95 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Назад
              </button>
              <span className="text-xs text-slate-500 tabular-nums">
                {bookIdx + 1} / {SEERAH_CHAPTERS.length}
              </span>
              <button
                onClick={() => goToChapter(bookIdx + 1)}
                disabled={bookIdx === SEERAH_CHAPTERS.length - 1}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-200 text-sm font-semibold ring-1 ring-emerald-400/40 disabled:opacity-30 active:scale-95 transition"
              >
                Далее <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Точки-страницы */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
              {SEERAH_CHAPTERS.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => goToChapter(i, false)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === bookIdx
                      ? "w-5 bg-emerald-400"
                      : readIds.has(c.id)
                        ? "w-1.5 bg-emerald-500/50"
                        : "w-1.5 bg-white/15"
                  }`}
                  title={`${i + 1}. ${c.title}`}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Bottom spacer for nav */}
      <div className="h-8" />
    </div>
  );
}
