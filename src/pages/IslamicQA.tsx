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

// Маппинг цвета категории → статические Tailwind классы
// (динамические классы Tailwind не purg'ает, поэтому только литералы)
const CAT_COLOR_MAP: Record<
  string,
  { bar: string; bg: string; text: string; ring: string; glow: string; cardBg: string; orb: string }
> = {
  emerald: { bar: "from-emerald-400/60 to-emerald-600/30", bg: "bg-emerald-500/15", text: "text-emerald-300", ring: "ring-emerald-500/30", glow: "shadow-emerald-500/20",  cardBg: "from-emerald-500/[0.08] via-emerald-500/[0.02] to-transparent", orb: "bg-emerald-500/20" },
  sky:     { bar: "from-sky-400/60 to-sky-600/30",         bg: "bg-sky-500/15",     text: "text-sky-300",     ring: "ring-sky-500/30",     glow: "shadow-sky-500/20",      cardBg: "from-sky-500/[0.08] via-sky-500/[0.02] to-transparent",         orb: "bg-sky-500/20" },
  cyan:    { bar: "from-cyan-400/60 to-cyan-600/30",       bg: "bg-cyan-500/15",    text: "text-cyan-300",    ring: "ring-cyan-500/30",    glow: "shadow-cyan-500/20",     cardBg: "from-cyan-500/[0.08] via-cyan-500/[0.02] to-transparent",       orb: "bg-cyan-500/20" },
  amber:   { bar: "from-amber-400/60 to-amber-600/30",     bg: "bg-amber-500/15",   text: "text-amber-300",   ring: "ring-amber-500/30",   glow: "shadow-amber-500/25",    cardBg: "from-amber-500/[0.08] via-amber-500/[0.02] to-transparent",     orb: "bg-amber-500/20" },
  violet:  { bar: "from-violet-400/60 to-violet-600/30",   bg: "bg-violet-500/15",  text: "text-violet-300",  ring: "ring-violet-500/30",  glow: "shadow-violet-500/25",   cardBg: "from-violet-500/[0.08] via-violet-500/[0.02] to-transparent",   orb: "bg-violet-500/20" },
  rose:    { bar: "from-rose-400/60 to-rose-600/30",       bg: "bg-rose-500/15",    text: "text-rose-300",    ring: "ring-rose-500/30",    glow: "shadow-rose-500/25",     cardBg: "from-rose-500/[0.08] via-rose-500/[0.02] to-transparent",       orb: "bg-rose-500/20" },
  pink:    { bar: "from-pink-400/60 to-pink-600/30",       bg: "bg-pink-500/15",    text: "text-pink-300",    ring: "ring-pink-500/30",    glow: "shadow-pink-500/25",     cardBg: "from-pink-500/[0.08] via-pink-500/[0.02] to-transparent",       orb: "bg-pink-500/20" },
  teal:    { bar: "from-teal-400/60 to-teal-600/30",       bg: "bg-teal-500/15",    text: "text-teal-300",    ring: "ring-teal-500/30",    glow: "shadow-teal-500/25",     cardBg: "from-teal-500/[0.08] via-teal-500/[0.02] to-transparent",       orb: "bg-teal-500/20" },
  indigo:  { bar: "from-indigo-400/60 to-indigo-600/30",   bg: "bg-indigo-500/15",  text: "text-indigo-300",  ring: "ring-indigo-500/30",  glow: "shadow-indigo-500/25",   cardBg: "from-indigo-500/[0.08] via-indigo-500/[0.02] to-transparent",   orb: "bg-indigo-500/20" },
  orange:  { bar: "from-orange-400/60 to-orange-600/30",   bg: "bg-orange-500/15",  text: "text-orange-300",  ring: "ring-orange-500/30",  glow: "shadow-orange-500/25",   cardBg: "from-orange-500/[0.08] via-orange-500/[0.02] to-transparent",   orb: "bg-orange-500/20" },
};
const DEFAULT_COLOR = CAT_COLOR_MAP.teal;

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
    // Нормализация: регистр, ё→е, убираем диакритику (ударения в транскрипциях)
    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/ё/g, "е")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
    // Все слова запроса должны найтись (AND) по вопросу+ответу+источнику+учёному
    const words = norm(search.trim()).split(/\s+/).filter(Boolean);
    return QA_LIST.filter((item) => {
      if (activeCat !== "all" && item.category !== activeCat) return false;
      if (!words.length) return true;
      const hay = norm(
        `${item.q} ${item.a} ${item.source ?? ""} ${item.scholar ?? ""}`,
      );
      return words.every((w) => hay.includes(w));
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
    <div className="min-h-screen pb-28 max-w-lg mx-auto animate-fade-in">
      {/* Decorative hero header */}
      <div className="relative px-4 pt-4 pb-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-2 left-4 w-24 h-24 bg-emerald-500/8 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-center gap-3 mb-3">
          <button
            onClick={() => window.history.back()}
            className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <ChevronLeft size={18} className="text-slate-300" />
          </button>
          <div className="flex-1" />
          <button
            onClick={random}
            title="Случайный вопрос"
            className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <Shuffle size={16} className="text-amber-400" />
          </button>
        </div>

        <div className="relative text-center">
          <p className="text-amber-400/60 text-base mb-1" style={{ fontFamily: "'Amiri', serif" }}>
            ﷽
          </p>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center justify-center gap-2">
            <HelpCircle className="w-6 h-6 text-teal-400" />
            Вопросы и ответы
          </h1>
          <p className="text-teal-400/70 text-xs">
            {QA_TOTAL} вопросов · {read.size} прочитано
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-teal-500/40" />
            <span className="text-teal-500/40 text-xs">✦</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-teal-500/40" />
          </div>
        </div>
      </div>

      <div className="px-4">

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
              {/* Premium card with glow + gradient + decorative orbs */}
              {(() => {
                const cardCat = QA_CATEGORIES.find((c) => c.key === currentCard.category);
                const cardColors = (cardCat && CAT_COLOR_MAP[cardCat.color]) || DEFAULT_COLOR;
                return (
              <div
                key={currentCard.id}
                className="relative mb-4 select-none animate-card-enter"
                style={{ minHeight: cardOpen ? 'auto' : '380px' }}
              >
                {/* Glow shadow under card in category color */}
                <div className={`absolute inset-x-8 -inset-y-2 ${cardColors.orb} rounded-3xl blur-2xl opacity-40 pointer-events-none`} />

                <div
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  onMouseDown={onTouchStart}
                  onMouseMove={swiping ? onTouchMove : undefined}
                  onMouseUp={onTouchEnd}
                  onMouseLeave={swiping ? onTouchEnd : undefined}
                  onClick={() => !swiping && Math.abs(swipeX) < 5 && setCardOpen((v) => !v)}
                  className={`relative glass-card overflow-hidden cursor-grab active:cursor-grabbing bg-gradient-to-br ${cardColors.cardBg} shadow-2xl ${cardColors.glow}`}
                  style={{
                    transform: `translateX(${swipeX}px) rotate(${swipeX * 0.04}deg)`,
                    transition: swiping ? "none" : "transform 0.3s cubic-bezier(0.16,1,0.3,1)",
                    opacity: 1 - Math.min(Math.abs(swipeX) / 400, 0.5),
                  }}
                >
                  {/* Decorative orbs in corners (animated) */}
                  <div className={`absolute -top-12 -right-12 w-32 h-32 ${cardColors.orb} rounded-full blur-3xl pointer-events-none animate-orb-float`} />
                  <div className={`absolute -bottom-16 -left-12 w-40 h-40 ${cardColors.orb} rounded-full blur-3xl pointer-events-none opacity-50 animate-orb-float`} style={{ animationDelay: '2s' }} />

                  {/* Ornament corner (top-right) */}
                  <div className="absolute top-3 right-3 text-amber-400/20 text-2xl font-serif pointer-events-none select-none">✦</div>

                  {/* Top gradient bar */}
                  <div className={`relative h-1 w-full bg-gradient-to-r ${cardColors.bar}`} />

                  <div className="relative p-5 flex flex-col" style={{ minHeight: cardOpen ? 'auto' : '360px' }}>
                    {/* Swipe hint chips */}
                    {swipeX < -30 && (
                      <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-teal-500/40 border border-teal-300 text-[10px] font-bold uppercase text-white z-10 shadow-lg shadow-teal-500/50">
                        Далее →
                      </div>
                    )}
                    {swipeX > 30 && (
                      <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-amber-500/40 border border-amber-300 text-[10px] font-bold uppercase text-white z-10 shadow-lg shadow-amber-500/50">
                        ← Назад
                      </div>
                    )}

                    {/* Header — категория + статус */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${cardColors.bg} ${cardColors.text} ring-1 ${cardColors.ring}`}>
                        <span className="text-sm">{cardCat?.emoji}</span>
                        {cardCat?.name}
                      </span>
                      {read.has(currentCard.id) && (
                        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ring-1 ring-emerald-500/30">
                          <CheckIcon className="w-3 h-3" />
                          Прочитано
                        </span>
                      )}
                    </div>

                    {/* Decorative quote mark */}
                    <div className={`text-4xl ${cardColors.text} opacity-30 leading-none mb-1 font-serif`}>"</div>

                    {/* Question — центральная часть, растягивается */}
                    <div className="flex-1 flex items-start py-1">
                      <p className="text-white text-xl font-bold leading-snug -mt-2">
                        {currentCard.q}
                      </p>
                    </div>

                    {/* Answer (toggled) или кнопка снизу */}
                    {cardOpen ? (
                      <div className="mt-4 animate-slide-down">
                        <div className={`h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-3`} />
                        <p className="text-slate-100 text-[15px] leading-relaxed mb-3">
                          {currentCard.a}
                        </p>
                        {currentCard.source && (
                          <div className={`text-[11px] text-slate-300 ${cardColors.bg} rounded-lg p-3 ring-1 ${cardColors.ring} flex items-start gap-2`}>
                            <span className={`font-bold ${cardColors.text} shrink-0`}>📚 Источник:</span>
                            <span>{currentCard.source}</span>
                          </div>
                        )}
                        {currentCard.scholar && (
                          <div className={`mt-2 text-[11px] text-slate-300 ${cardColors.bg} rounded-lg p-3 ring-1 ${cardColors.ring} flex items-start gap-2`}>
                            <span className={`font-bold ${cardColors.text} shrink-0`}>🎓 Ответил:</span>
                            <span>{currentCard.scholar}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
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
                          className={`relative w-full py-3.5 rounded-xl ${cardColors.bg} border ${cardColors.ring.replace('ring-', 'border-')} ${cardColors.text} text-sm font-bold active:scale-[0.98] transition overflow-hidden group hover:bg-opacity-30`}
                        >
                          <span
                            className="absolute inset-0 opacity-30 animate-shimmer pointer-events-none"
                            style={{
                              backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                            }}
                          />
                          <span className="relative">Показать ответ ✨</span>
                        </button>
                        <p className="text-[10px] text-slate-400 text-center font-medium">
                          👆 тап карты · 👈👉 свайп для переключения
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
                );
              })()}

              {/* Unified nav + progress */}
              <div className="glass-card overflow-hidden">
                {/* Progress thin bar — inside nav top edge */}
                <div className="relative h-1 bg-white/[0.03]">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${((cardIdx + 1) / filtered.length) * 100}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 p-2">
                  <button
                    onClick={goPrevCard}
                    disabled={cardIdx === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg hover:bg-white/[0.04] active:scale-[0.97] transition disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 text-sm font-medium"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Назад
                  </button>
                  <div className="px-3 py-2 text-slate-400 text-xs font-bold tabular-nums whitespace-nowrap">
                    {cardIdx + 1} / {filtered.length}
                  </div>
                  <button
                    onClick={goNextCard}
                    disabled={cardIdx === filtered.length - 1}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 active:scale-[0.97] transition disabled:opacity-30 disabled:cursor-not-allowed text-teal-200 text-sm font-medium"
                  >
                    Далее
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
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
          const colors = (cat && CAT_COLOR_MAP[cat.color]) || DEFAULT_COLOR;
          const isOpen = openId === item.id;
          const isRead = read.has(item.id);
          return (
            <div
              key={item.id}
              id={`qa-${item.id}`}
              className={`glass-card overflow-hidden transition-all scroll-mt-4 relative ${
                isOpen ? `ring-1 ${colors.ring} shadow-lg` : ""
              }`}
            >
              {/* Цветная левая полоска по категории */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${colors.bar}`} />
              <button
                onClick={() => toggleOpen(item.id)}
                className="w-full flex items-start gap-3 p-3.5 pl-4 text-left"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${colors.bg} ring-1 ring-white/[0.04]`}>
                  <span className={colors.text}>{cat?.emoji}</span>
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
                  {item.scholar && (
                    <div className="mt-2 flex items-start gap-2 text-[11px] text-slate-500 bg-white/[0.02] rounded-lg p-2.5">
                      <span className="font-bold text-amber-400/80">
                        Ответил:
                      </span>
                      <span>{item.scholar}</span>
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
    </div>
  );
}
