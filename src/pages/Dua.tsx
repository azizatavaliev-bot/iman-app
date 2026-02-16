import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Heart,
  ChevronDown,
  BookOpen,
  Sparkles,
  Layers,
  Star,
} from "lucide-react";
import { DUA_CATEGORIES, DUA_DATA, SITUATIONS } from "../data/dua";
import type { Dua } from "../data/dua";
import { storage, POINTS } from "../lib/storage";

// ============================================================
// Dua Collection Page
// Dark glassmorphism theme, emerald/gold accents, Arabic typography
// ============================================================

// ---- Helpers ----

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Deterministic "dua of the day" — uses date string as seed */
function getDuaOfDay(): Dua {
  const dateStr = todayKey();
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % DUA_DATA.length;
  return DUA_DATA[index];
}

/** Get set of dua IDs already read today (to prevent double-counting points) */
function getReadDuasToday(): Set<number> {
  try {
    const key = `iman_dua_read_${todayKey()}`;
    const raw = localStorage.getItem(key);
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

/** Mark a dua as read today */
function markDuaReadToday(duaId: number): void {
  const key = `iman_dua_read_${todayKey()}`;
  const current = getReadDuasToday();
  current.add(duaId);
  localStorage.setItem(key, JSON.stringify([...current]));
}

/** Get favorite dua IDs */
function getFavoriteDuas(): Set<number> {
  try {
    const raw = localStorage.getItem("iman_favorite_duas");
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

/** Save favorite dua IDs */
function saveFavoriteDuas(ids: Set<number>): void {
  localStorage.setItem("iman_favorite_duas", JSON.stringify([...ids]));
}

// ============================================================
// Points Animation Component
// ============================================================

function PointsPopup({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-points-float">
      <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-md shadow-lg shadow-emerald-500/10">
        <span className="text-xl font-bold text-emerald-400">+3</span>
        <span className="text-lg">&#x1F31F;</span>
      </div>
      <style>{`
        @keyframes points-float-up {
          0% { transform: translate(-50%, 0) scale(0.5); opacity: 0; }
          15% { transform: translate(-50%, -8px) scale(1.15); opacity: 1; }
          70% { transform: translate(-50%, -35px) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -70px) scale(0.8); opacity: 0; }
        }
        .animate-points-float {
          animation: points-float-up 1.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Dua Card Component (Expandable)
// ============================================================

function DuaCard({
  dua,
  isExpanded,
  isFavorite,
  isReadToday,
  onToggleExpand,
  onToggleFavorite,
  onMarkRead,
}: {
  dua: Dua;
  isExpanded: boolean;
  isFavorite: boolean;
  isReadToday: boolean;
  onToggleExpand: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onMarkRead: () => void;
}) {
  return (
    <div
      className={`glass-card rounded-2xl transition-all duration-300 overflow-hidden ${
        isExpanded
          ? "ring-1 ring-emerald-500/20 bg-gradient-to-br from-white/[0.07] to-white/[0.02]"
          : "hover:bg-white/[0.04] active:scale-[0.99]"
      }`}
    >
      {/* Collapsed header — always visible */}
      <button
        onClick={onToggleExpand}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        <div className="flex-1 min-w-0">
          {/* Arabic preview (truncated) */}
          <p
            className={`font-['Amiri'] text-right text-lg text-amber-100/80 leading-[2] ${
              isExpanded ? "" : "line-clamp-1"
            }`}
            dir="rtl"
          >
            {dua.arabic}
          </p>
          {/* Russian name + source */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm text-slate-300 truncate">
              {dua.translation.slice(0, 60)}...
            </span>
          </div>
          <span className="text-[11px] text-slate-500 t-bg px-2 py-0.5 rounded-full inline-block mt-1">
            {dua.source}
          </span>
        </div>
        {/* Expand chevron */}
        <div className="flex items-center gap-2 pt-1 shrink-0">
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Expanded content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4">
          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            <div className="w-1 h-1 rounded-full bg-emerald-500/30" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          </div>

          {/* Full Arabic text */}
          <p
            className="font-['Amiri'] text-right text-2xl leading-loose text-white mb-4"
            dir="rtl"
          >
            {dua.arabic}
          </p>

          {/* Transcription */}
          <p className="text-sm text-amber-300/70 italic mb-3 leading-relaxed">
            {dua.transcription}
          </p>

          {/* Russian translation */}
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            {dua.translation}
          </p>

          {/* Source reference */}
          <div className="flex items-center gap-1.5 mb-4">
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] text-slate-500">{dua.source}</span>
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-3">
            {/* Mark as read button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
              disabled={isReadToday}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${
                isReadToday
                  ? "bg-emerald-500/10 text-emerald-400/60 cursor-default"
                  : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
              }`}
            >
              {isReadToday ? (
                <>
                  <span className="text-xs">&#x2714;</span>
                  <span>Прочитано сегодня</span>
                </>
              ) : (
                <>
                  <span className="text-xs">&#x1F31F;</span>
                  <span>Прочитал +3</span>
                </>
              )}
            </button>

            {/* Favorite button */}
            <button
              onClick={onToggleFavorite}
              className="w-10 h-10 rounded-xl flex items-center justify-center t-bg hover:t-bg transition-all active:scale-90"
              aria-label="В избранное"
            >
              <Heart
                className={`w-5 h-5 transition-all duration-300 ${
                  isFavorite
                    ? "fill-red-500 text-red-500 scale-110"
                    : "text-slate-500 hover:text-red-400"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Page Component
// ============================================================

type TabKey = "categories" | "situations" | "favorites";

export default function DuaPage() {
  const navigate = useNavigate();

  // ---- State ----
  const [activeTab, setActiveTab] = useState<TabKey>("categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSituation, setSelectedSituation] = useState<string | null>(
    null,
  );
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [readToday, setReadToday] = useState<Set<number>>(new Set());
  const [showPointsPopup, setShowPointsPopup] = useState(false);
  const [duaOfDay] = useState<Dua>(() => getDuaOfDay());
  const [duaOfDayExpanded, setDuaOfDayExpanded] = useState(false);

  // ---- Load persisted state ----
  useEffect(() => {
    setFavorites(getFavoriteDuas());
    setReadToday(getReadDuasToday());
  }, []);

  // ---- Filtered duas ----
  const filteredDuas = DUA_DATA.filter((dua) => {
    // Tab: favorites
    if (activeTab === "favorites" && !favorites.has(dua.id)) return false;
    // Tab: situations
    if (activeTab === "situations" && selectedSituation) {
      if ((dua as Dua & { situation?: string }).situation !== selectedSituation)
        return false;
    }
    // Category filter (only in categories tab)
    if (
      activeTab === "categories" &&
      selectedCategory &&
      dua.category !== selectedCategory
    )
      return false;
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        dua.translation.toLowerCase().includes(q) ||
        dua.transcription.toLowerCase().includes(q) ||
        dua.arabic.includes(searchQuery) ||
        dua.source.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ---- Handlers ----
  const handleToggleFavorite = useCallback(
    (duaId: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(duaId)) {
          next.delete(duaId);
        } else {
          next.add(duaId);
        }
        saveFavoriteDuas(next);
        return next;
      });
    },
    [],
  );

  const handleMarkRead = useCallback(
    (duaId: number) => {
      if (readToday.has(duaId)) return;

      // Award points
      storage.addPoints(POINTS.DUA);
      storage.recalculateTotalPoints();
      markDuaReadToday(duaId);

      setReadToday((prev) => new Set(prev).add(duaId));

      // Show animation
      setShowPointsPopup(true);
      setTimeout(() => setShowPointsPopup(false), 1500);
    },
    [readToday],
  );

  const handleCategoryClick = useCallback((categoryKey: string) => {
    setSelectedCategory((prev) => (prev === categoryKey ? null : categoryKey));
    setExpandedId(null);
  }, []);

  const handleSituationClick = useCallback((situationKey: string) => {
    setSelectedSituation((prev) =>
      prev === situationKey ? null : situationKey,
    );
    setExpandedId(null);
  }, []);

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    setSelectedCategory(null);
    setSelectedSituation(null);
    setExpandedId(null);
  }, []);

  return (
    <div className="min-h-screen pb-28">
      {/* Points popup animation */}
      <PointsPopup visible={showPointsPopup} />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl glass flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Дуа-коллекция</h1>
          <p className="text-xs text-emerald-400/70">
            {DUA_DATA.length} дуа из Корана и Сунны
          </p>
        </div>
      </div>

      {/* ── Instruction Banner ─────────────────────────────────────── */}
      <div className="mx-4 mb-4 glass-card p-4 border border-emerald-500/20">
        <p className="text-xs text-emerald-300/90 leading-relaxed">
          <span className="font-semibold text-emerald-400">
            Дуа — оружие верующего.
          </span>{" "}
          Выберите категорию или ситуацию. Читайте на арабском с транскрипцией и
          переводом. «Дуа — это поклонение»{" "}
          <span className="text-white/50">
            (Абу Дауд, 1479; ат-Тирмизи, 3247)
          </span>
          . Намерение: «Обращаюсь к Аллаху с искренней мольбой».
        </p>
      </div>

      {/* ── Search Bar ─────────────────────────────────────────────── */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Поиск дуа..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl t-bg border t-border-s text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              &#x2715;
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Switcher ───────────────────────────────────────────── */}
      <div className="px-4 mb-5">
        <div className="flex gap-1 p-1 rounded-xl t-bg border t-border">
          {[
            { key: "categories" as TabKey, label: "Категории", icon: Layers },
            { key: "situations" as TabKey, label: "Ситуации", icon: Sparkles },
            { key: "favorites" as TabKey, label: "Избранное", icon: Star },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === key
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-white/40 hover:t-text-s"
              }`}
            >
              <Icon size={14} />
              {label}
              {key === "favorites" && favorites.size > 0 && (
                <span className="text-[10px] t-bg px-1.5 rounded-full">
                  {favorites.size}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Dua of the Day (only on categories tab) ────────────────── */}
      {activeTab === "categories" && (
        <div className="px-4 mb-6">
          <div
            className="relative rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-200"
            onClick={() => setDuaOfDayExpanded((prev) => !prev)}
          >
            {/* Gold gradient border */}
            <div className="absolute inset-0 rounded-2xl p-[1.5px] pointer-events-none">
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(245,158,11,0.6), rgba(217,119,6,0.3), rgba(245,158,11,0.6))",
                  mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  maskComposite: "exclude",
                  WebkitMaskComposite: "xor",
                  padding: "1.5px",
                }}
              />
            </div>

            <div className="relative glass-card rounded-2xl p-5 border-0">
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-500/10 blur-3xl" />
              <div className="flex items-center justify-between mb-3 relative">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400/90">
                    Дуа дня
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-amber-400/60 transition-transform duration-300 ${
                    duaOfDayExpanded ? "rotate-180" : ""
                  }`}
                />
              </div>
              <p
                className={`font-['Amiri'] text-amber-100/90 text-center leading-[2.2] relative ${
                  duaOfDayExpanded ? "text-xl" : "text-lg line-clamp-2"
                }`}
                dir="rtl"
              >
                {duaOfDay.arabic}
              </p>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  duaOfDayExpanded
                    ? "max-h-[500px] opacity-100 mt-3"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/40" />
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                </div>
                <p className="text-sm text-amber-300/60 italic mb-3 leading-relaxed">
                  {duaOfDay.transcription}
                </p>
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                  {duaOfDay.translation}
                </p>
                <div className="flex items-center justify-end pt-2 border-t t-border">
                  <span className="text-[11px] font-medium text-amber-500/70 bg-amber-500/10 px-2.5 py-1 rounded-full">
                    {duaOfDay.source}
                  </span>
                </div>
              </div>
              {!duaOfDayExpanded && (
                <p className="text-xs text-slate-500 text-center mt-2">
                  {duaOfDay.translation.slice(0, 80)}...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Categories Tab Content ─────────────────────────────────── */}
      {activeTab === "categories" && (
        <div className="px-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Категории</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {DUA_CATEGORIES.map((cat) => {
              const count = DUA_DATA.filter(
                (d) => d.category === cat.key,
              ).length;
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => handleCategoryClick(cat.key)}
                  className={`relative p-3 rounded-2xl text-center active:scale-[0.95] transition-all duration-200 ${
                    isActive
                      ? "bg-emerald-500/20 border border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                      : "t-bg backdrop-blur-sm border t-border-s hover:t-border-s"
                  }`}
                >
                  <div className="text-2xl mb-1.5">{cat.icon}</div>
                  <div
                    className={`text-xs font-medium mb-0.5 ${isActive ? "text-emerald-300" : "text-white"}`}
                  >
                    {cat.name}
                  </div>
                  <div
                    className={`text-[10px] ${isActive ? "text-emerald-400/60" : "text-slate-500"}`}
                  >
                    {count} дуа
                  </div>
                </button>
              );
            })}
          </div>
          {selectedCategory && (
            <button
              onClick={() => {
                setSelectedCategory(null);
                setExpandedId(null);
              }}
              className="mt-2.5 text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors flex items-center gap-1 mx-auto"
            >
              <span>&#x2715;</span> Сбросить фильтр
            </button>
          )}
        </div>
      )}

      {/* ── Situations Tab Content ─────────────────────────────────── */}
      {activeTab === "situations" && (
        <div className="px-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">
            Дуа по ситуациям
          </h2>
          <p className="text-xs text-white/40 mb-4">
            Выберите жизненную ситуацию, чтобы найти подходящее дуа
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {(typeof SITUATIONS !== "undefined" ? SITUATIONS : []).map(
              (sit) => {
                const count = DUA_DATA.filter(
                  (d) =>
                    (d as Dua & { situation?: string }).situation === sit.key,
                ).length;
                const isActive = selectedSituation === sit.key;
                return (
                  <button
                    key={sit.key}
                    onClick={() => handleSituationClick(sit.key)}
                    className={`relative p-3.5 rounded-2xl text-left active:scale-[0.97] transition-all duration-200 ${
                      isActive
                        ? "bg-violet-500/20 border border-violet-500/50 shadow-lg shadow-violet-500/10"
                        : "t-bg backdrop-blur-sm border t-border-s hover:t-border-s"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="text-xl">{sit.icon}</span>
                      <span
                        className={`text-sm font-medium ${isActive ? "text-violet-300" : "text-white"}`}
                      >
                        {sit.name}
                      </span>
                    </div>
                    <p
                      className={`text-[10px] leading-relaxed ${isActive ? "text-violet-400/60" : "text-slate-500"}`}
                    >
                      {sit.description}
                    </p>
                    {count > 0 && (
                      <span
                        className={`absolute top-2.5 right-2.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-violet-500/30 text-violet-300"
                            : "t-bg text-white/40"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              },
            )}
          </div>
          {selectedSituation && (
            <button
              onClick={() => {
                setSelectedSituation(null);
                setExpandedId(null);
              }}
              className="mt-2.5 text-xs text-violet-400/70 hover:text-violet-400 transition-colors flex items-center gap-1 mx-auto"
            >
              <span>&#x2715;</span> Сбросить фильтр
            </button>
          )}
        </div>
      )}

      {/* ── Favorites Tab Empty State ──────────────────────────────── */}
      {activeTab === "favorites" && favorites.size === 0 && (
        <div className="px-4 mb-6">
          <div className="glass-card p-8 text-center rounded-2xl">
            <Heart className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Нет избранных дуа</p>
            <p className="text-slate-500 text-xs mt-1">
              Нажмите на сердечко, чтобы добавить дуа в избранное
            </p>
          </div>
        </div>
      )}

      {/* ── Dua List ───────────────────────────────────────────────── */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">
            {activeTab === "favorites"
              ? "Избранные дуа"
              : activeTab === "situations"
                ? selectedSituation
                  ? (typeof SITUATIONS !== "undefined" ? SITUATIONS : []).find(
                      (s) => s.key === selectedSituation,
                    )?.name || "Дуа"
                  : "Все ситуационные дуа"
                : selectedCategory
                  ? DUA_CATEGORIES.find((c) => c.key === selectedCategory)
                      ?.name || "Дуа"
                  : "Все дуа"}
          </h2>
          <span className="text-xs text-slate-500">
            {filteredDuas.length}{" "}
            {activeTab === "favorites" ? "" : `из ${DUA_DATA.length}`}
          </span>
        </div>

        {filteredDuas.length === 0 && activeTab !== "favorites" ? (
          <div className="glass-card p-8 text-center rounded-2xl">
            <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Ничего не найдено</p>
            <p className="text-slate-500 text-xs mt-1">
              Попробуйте изменить запрос или категорию
            </p>
          </div>
        ) : filteredDuas.length > 0 ? (
          <div className="space-y-3">
            {filteredDuas.map((dua, index) => (
              <div
                key={dua.id}
                className="animate-fade-in"
                style={{
                  animationDelay: `${0.04 + index * 0.03}s`,
                  opacity: 0,
                }}
              >
                <DuaCard
                  dua={dua}
                  isExpanded={expandedId === dua.id}
                  isFavorite={favorites.has(dua.id)}
                  isReadToday={readToday.has(dua.id)}
                  onToggleExpand={() =>
                    setExpandedId((prev) => (prev === dua.id ? null : dua.id))
                  }
                  onToggleFavorite={(e) => handleToggleFavorite(dua.id, e)}
                  onMarkRead={() => handleMarkRead(dua.id)}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
