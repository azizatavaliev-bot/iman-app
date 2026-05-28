import { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Shuffle,
  Sparkles,
  HelpCircle,
  List,
  Layers,
  Check as CheckIcon,
} from "lucide-react";
import { trackAction } from "../lib/analytics";
import {
  QA_LIST,
  QA_CATEGORIES,
  QA_TOTAL,
  getQAOfTheDay,
  type QACategory,
} from "../data/islamic-qa";

const READ_KEY = "iman_qa_read";

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

export default function IslamicQA() {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<QACategory | "all">("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const [read, setRead] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<"list" | "cards">(() => {
    try { return (localStorage.getItem("iman_qa_mode") as "list" | "cards") || "list"; } catch { return "list"; }
  });
  const [cardIdx, setCardIdx] = useState(0);
  const [cardOpen, setCardOpen] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartX = useRef(0);

  function setModeP(m: "list" | "cards") {
    setMode(m);
    try { localStorage.setItem("iman_qa_mode", m); } catch { /* ignore */ }
  }

  const qaOfTheDay = useMemo(() => getQAOfTheDay(), []);

  useEffect(() => {
    setRead(loadRead());
    trackAction("qa_opened");
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return QA_LIST.filter((item) => {
      if (activeCat !== "all" && item.category !== activeCat) return false;
      if (!q) return true;
      return (
        item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
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
    if (mode === "cards") {
      // в режиме карточек — прыжок на случайную карту
      const idx = Math.floor(Math.random() * filtered.length);
      setCardIdx(idx);
      setCardOpen(false);
      return;
    }
    const idx = Math.floor(Math.random() * QA_LIST.length);
    const target = QA_LIST[idx];
    setActiveCat("all");
    setSearch("");
    setOpenId(target.id);
    requestAnimationFrame(() => {
      document
        .getElementById(`qa-${target.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  // ── Карточный режим: навигация и swipe ─────────────────────────────────
  const currentCard = filtered[cardIdx];

  function goNextCard() {
    if (cardIdx < filtered.length - 1) {
      setCardIdx(cardIdx + 1);
      setCardOpen(false);
      // помечаем предыдущую как прочитанную
      const prev = filtered[cardIdx];
      if (prev && !read.has(prev.id)) {
        const next = new Set(read);
        next.add(prev.id);
        setRead(next);
        saveRead(next);
      }
    }
  }
  function goPrevCard() {
    if (cardIdx > 0) {
      setCardIdx(cardIdx - 1);
      setCardOpen(false);
    }
  }

  function onTouchStart(e: React.TouchEvent | React.MouseEvent) {
    setSwiping(true);
    touchStartX.current =
      "touches" in e ? e.touches[0].clientX : e.clientX;
  }
  function onTouchMove(e: React.TouchEvent | React.MouseEvent) {
    if (!swiping) return;
    const x = "touches" in e ? e.touches[0].clientX : e.clientX;
    setSwipeX(x - touchStartX.current);
  }
  function onTouchEnd() {
    if (!swiping) return;
    const dx = swipeX;
    setSwiping(false);
    setSwipeX(0);
    const threshold = 80;
    if (dx < -threshold) goNextCard();
    else if (dx > threshold) goPrevCard();
  }

  // Сброс индекса при смене фильтра/категории
  useEffect(() => {
    setCardIdx(0);
    setCardOpen(false);
  }, [activeCat, search, mode]);

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
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-xl">
            <HelpCircle className="w-5 h-5 text-teal-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white">Вопросы и ответы</h1>
            <p className="text-xs text-slate-500">
              {QA_TOTAL} вопросов · {read.size} прочитано
            </p>
          </div>
        </div>
        <button
          onClick={random}
          title="Случайный вопрос"
          className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Shuffle size={16} className="text-amber-400" />
        </button>
      </header>

      {/* QA of the day */}
      <button
        onClick={() => toggleOpen(qaOfTheDay.id)}
        className="w-full text-left glass-card p-4 mb-4 bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/20"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-teal-400" />
          <span className="text-[11px] uppercase tracking-wider text-teal-300 font-bold">
            Вопрос дня
          </span>
        </div>
        <p className="text-white font-semibold text-[15px] mb-1">
          {qaOfTheDay.q}
        </p>
        <p className="text-xs text-slate-400 line-clamp-2">{qaOfTheDay.a}</p>
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
          placeholder="Поиск вопроса или ответа..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white outline-none bg-white/[0.04] border border-white/5 focus:border-teal-500/30 transition"
        />
      </div>

      {/* Categories — wrap so all are visible without horizontal scroll */}
      <div className="flex flex-wrap gap-1.5 pb-3">
        <button
          onClick={() => setActiveCat("all")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeCat === "all"
              ? "bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/30"
              : "bg-white/[0.03] text-slate-400 hover:text-slate-300"
          }`}
        >
          Все ({QA_TOTAL})
        </button>
        {QA_CATEGORIES.map((cat) => {
          const count = QA_LIST.filter((q) => q.category === cat.key).length;
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

      {/* Mode switcher: Список / Карточки */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setModeP("list")}
          className={`flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
            mode === "list"
              ? "bg-teal-500/20 text-teal-200 ring-1 ring-teal-500/40"
              : "bg-white/[0.03] text-slate-400"
          }`}
        >
          <List className="w-4 h-4" />
          Список
        </button>
        <button
          onClick={() => setModeP("cards")}
          className={`flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
            mode === "cards"
              ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/40"
              : "bg-white/[0.03] text-slate-400"
          }`}
        >
          <Layers className="w-4 h-4" />
          Карточки
        </button>
      </div>

      {/* CARDS MODE */}
      {mode === "cards" && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">🤔</p>
              <p className="text-sm text-slate-500">Ничего не найдено</p>
            </div>
          ) : currentCard ? (
            <>
              {/* Card stack */}
              <div className="relative h-[440px] mb-4 select-none">
                {/* Next card (peek behind) */}
                {filtered[cardIdx + 1] && (
                  <div className="absolute inset-x-4 top-3 bottom-0 rounded-2xl bg-white/[0.04] border border-white/5 -z-10 scale-[0.97]" />
                )}
                {/* Current card */}
                <div
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  onMouseDown={onTouchStart}
                  onMouseMove={swiping ? onTouchMove : undefined}
                  onMouseUp={onTouchEnd}
                  onMouseLeave={swiping ? onTouchEnd : undefined}
                  onClick={() => !swiping && Math.abs(swipeX) < 5 && setCardOpen((v) => !v)}
                  className="absolute inset-0 glass-card p-5 cursor-grab active:cursor-grabbing overflow-y-auto"
                  style={{
                    transform: `translateX(${swipeX}px) rotate(${swipeX * 0.04}deg)`,
                    transition: swiping ? "none" : "transform 0.3s cubic-bezier(0.16,1,0.3,1)",
                    opacity: 1 - Math.min(Math.abs(swipeX) / 400, 0.5),
                  }}
                >
                  {/* Hint indicators */}
                  {swipeX < -30 && (
                    <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-teal-500/30 border border-teal-400 text-[10px] font-bold uppercase text-teal-200">
                      Далее →
                    </div>
                  )}
                  {swipeX > 30 && (
                    <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-amber-500/30 border border-amber-400 text-[10px] font-bold uppercase text-amber-200">
                      ← Назад
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-center gap-2 mb-4">
                    {(() => {
                      const cat = QA_CATEGORIES.find((c) => c.key === currentCard.category);
                      return (
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                          {cat?.emoji} {cat?.name}
                        </span>
                      );
                    })()}
                    {read.has(currentCard.id) && (
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-emerald-400">
                        <CheckIcon className="w-3 h-3" />
                        Прочитано
                      </span>
                    )}
                  </div>

                  {/* Question */}
                  <p className="text-white text-xl font-bold leading-snug mb-5">
                    {currentCard.q}
                  </p>

                  {/* Answer (toggled) */}
                  {cardOpen ? (
                    <>
                      <div className="h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent mb-4" />
                      <p className="text-slate-200 text-[15px] leading-relaxed mb-4">
                        {currentCard.a}
                      </p>
                      {currentCard.source && (
                        <div className="text-[11px] text-slate-500 bg-white/[0.02] rounded-lg p-2.5">
                          <span className="font-bold text-teal-400/80">Источник:</span>{" "}
                          {currentCard.source}
                        </div>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCardOpen(true);
                        if (!read.has(currentCard.id)) {
                          const next = new Set(read);
                          next.add(currentCard.id);
                          setRead(next);
                          saveRead(next);
                        }
                      }}
                      className="w-full py-3 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-200 text-sm font-semibold active:scale-[0.98] transition"
                    >
                      Показать ответ
                    </button>
                  )}

                  {/* Hint */}
                  {!cardOpen && (
                    <p className="text-[11px] text-slate-500 text-center mt-6">
                      👆 тап чтобы открыть · 👈👉 свайп для переключения
                    </p>
                  )}
                </div>
              </div>

              {/* Card navigation */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={goPrevCard}
                  disabled={cardIdx === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.97] transition disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </button>
                <div className="px-3 py-2.5 rounded-xl bg-white/[0.04] text-slate-300 text-xs font-bold tabular-nums">
                  {cardIdx + 1} / {filtered.length}
                </div>
                <button
                  onClick={goNextCard}
                  disabled={cardIdx === filtered.length - 1}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 active:scale-[0.97] transition disabled:opacity-30 disabled:cursor-not-allowed text-teal-200 text-sm font-medium ring-1 ring-teal-500/30"
                >
                  Далее
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Progress dots */}
              <div className="flex flex-wrap justify-center gap-1">
                {filtered.slice(0, Math.min(filtered.length, 30)).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCardIdx(i);
                      setCardOpen(false);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      i === cardIdx
                        ? "w-6 bg-teal-400"
                        : i < cardIdx
                          ? "w-1.5 bg-teal-500/40"
                          : "w-1.5 bg-white/10"
                    }`}
                  />
                ))}
                {filtered.length > 30 && (
                  <span className="text-[9px] text-slate-500 ml-1">
                    +{filtered.length - 30}
                  </span>
                )}
              </div>
            </>
          ) : null}
        </>
      )}

      {/* LIST MODE */}
      {mode === "list" && (
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">🤔</p>
            <p className="text-sm text-slate-500">Ничего не найдено</p>
          </div>
        )}
        {filtered.map((item) => {
          const cat = QA_CATEGORIES.find((c) => c.key === item.category);
          const isOpen = openId === item.id;
          const isRead = read.has(item.id);
          return (
            <div
              key={item.id}
              id={`qa-${item.id}`}
              className={`glass-card overflow-hidden transition-all scroll-mt-4 ${
                isOpen ? "ring-1 ring-teal-500/20" : ""
              }`}
            >
              <button
                onClick={() => toggleOpen(item.id)}
                className="w-full flex items-start gap-3 p-3.5 text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-base shrink-0">
                  {cat?.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-semibold text-sm flex-1 ${
                        isRead ? "text-slate-300" : "text-white"
                      }`}
                    >
                      {item.q}
                    </p>
                    {isRead && (
                      <span className="text-emerald-400 text-[10px]">✓</span>
                    )}
                  </div>
                </div>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-3.5 pb-4 -mt-1">
                  <div className="h-px bg-white/[0.05] mb-3" />
                  <p className="text-sm leading-relaxed text-slate-200 mb-3">
                    {item.a}
                  </p>
                  {item.source && (
                    <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-white/[0.02] rounded-lg p-2.5">
                      <span className="font-bold text-teal-400/80">
                        Источник:
                      </span>
                      <span>{item.source}</span>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      Категория:
                    </span>
                    <span className="text-[10px] text-slate-300">
                      {cat?.emoji} {cat?.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
