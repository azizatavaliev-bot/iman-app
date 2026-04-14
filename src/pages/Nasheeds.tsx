import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Music,
  Heart,
  Play,
  Pause,
  Clock,
  Mic2,
  ExternalLink,
  X,
} from "lucide-react";
import { trackAction } from "../lib/analytics";
import { scheduleSyncPush } from "../lib/sync";
import {
  NASHEEDS,
  NASHEED_CATEGORIES,
  type Nasheed,
  type NasheedCategory,
} from "../data/nasheeds";

// ─────────────────────────────────────────────────────────────────────────────
// Nasheeds — Islamic songs playlist (halal, vocal only)
// ─────────────────────────────────────────────────────────────────────────────

const FAVORITES_KEY = "iman_nasheed_favorites";

function getFavorites(): number[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

function saveFavorites(ids: number[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  scheduleSyncPush();
}

export default function Nasheeds() {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    NasheedCategory | "all" | "favorites"
  >("all");
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    setFavorites(new Set(getFavorites()));
    trackAction("nasheeds_opened");
  }, []);

  const playNasheed = (nasheed: Nasheed) => {
    setPlayingId(nasheed.id);
    setShowPlayer(true);
    trackAction("nasheed_play", { title: nasheed.title });
  };

  const stopPlaying = () => {
    setPlayingId(null);
    setShowPlayer(false);
  };

  const currentNasheed = playingId
    ? NASHEEDS.find((n) => n.id === playingId)
    : null;

  const playNext = () => {
    if (!currentNasheed) return;
    const idx = filtered.findIndex((n) => n.id === currentNasheed.id);
    if (idx < filtered.length - 1) playNasheed(filtered[idx + 1]);
  };

  const playPrev = () => {
    if (!currentNasheed) return;
    const idx = filtered.findIndex((n) => n.id === currentNasheed.id);
    if (idx > 0) playNasheed(filtered[idx - 1]);
  };

  const toggleFavorite = (id: number) => {
    const next = new Set(favorites);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setFavorites(next);
    saveFavorites(Array.from(next));
  };

  const handleToggle = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filtered = NASHEEDS.filter((n) => {
    if (activeCategory === "favorites") return favorites.has(n.id);
    const matchCat =
      activeCategory === "all" || n.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.artist.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q);
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
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <Music size={20} className="text-rose-400" />
          </div>
          <div>
            <h1
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Нашиды
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {NASHEEDS.length} нашидов
            </p>
          </div>
        </div>
      </header>

      {/* Info card */}
      <div className="glass-card p-4 mb-5">
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          🎵 Нашиды — исламские песнопения без музыкальных инструментов.
          Дозволены по мнению большинства учёных. Прославляют Аллаха, воспевают
          любовь к Пророку ﷺ и вдохновляют на благие дела.
        </p>
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
          placeholder="Поиск нашида или исполнителя..."
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
              ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30"
              : "text-slate-400 hover:text-slate-300"
          }`}
          style={
            activeCategory !== "all"
              ? { background: "var(--bg-input)" }
              : undefined
          }
        >
          Все ({NASHEEDS.length})
        </button>
        <button
          onClick={() => setActiveCategory("favorites")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeCategory === "favorites"
              ? "bg-pink-500/20 text-pink-300 ring-1 ring-pink-500/30"
              : "text-slate-400 hover:text-slate-300"
          }`}
          style={
            activeCategory !== "favorites"
              ? { background: "var(--bg-input)" }
              : undefined
          }
        >
          ❤️ Избранные ({favorites.size})
        </button>
        {NASHEED_CATEGORIES.map((cat) => {
          const count = NASHEEDS.filter(
            (n) => n.category === cat.key
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

      {/* Nasheed list */}
      <div className="space-y-2.5">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">🎵</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {activeCategory === "favorites"
                ? "Нет избранных нашидов"
                : "Ничего не найдено"}
            </p>
          </div>
        )}
        {filtered.map((nasheed, idx) => {
          const isExpanded = expandedId === nasheed.id;
          const isFav = favorites.has(nasheed.id);
          const cat = NASHEED_CATEGORIES.find(
            (c) => c.key === nasheed.category
          );

          return (
            <div
              key={nasheed.id}
              className={`glass-card overflow-hidden transition-all duration-300 ${
                isExpanded ? "ring-1 ring-rose-500/20" : ""
              }`}
              style={{ animationDelay: `${0.02 * idx}s` }}
            >
              <div className="flex items-center gap-3 p-4">
                {/* Play button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playNasheed(nasheed);
                  }}
                  className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                    playingId === nasheed.id
                      ? "bg-rose-500 shadow-lg shadow-rose-500/30"
                      : "bg-gradient-to-br from-rose-500/20 to-pink-500/10"
                  }`}
                >
                  {playingId === nasheed.id ? (
                    <Pause size={16} className="text-white" />
                  ) : (
                    <Play size={16} className="text-rose-400 ml-0.5" />
                  )}
                </button>

                <button
                  onClick={() => handleToggle(nasheed.id)}
                  className="flex-1 min-w-0 text-left flex items-center gap-3"
                >

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {nasheed.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Mic2
                      size={10}
                      style={{ color: "var(--text-muted)" }}
                    />
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {nasheed.artist}
                    </p>
                  </div>
                </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-xs flex items-center gap-1"
                      style={{ color: "var(--text-faint)" }}
                    >
                      <Clock size={10} />
                      {nasheed.duration}
                    </span>
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
                </button>
              </div>

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

                  {/* Category badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs bg-${cat?.color}-500/10 text-${cat?.color}-300`}
                    >
                      {cat?.icon} {cat?.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(nasheed.id);
                      }}
                      className="p-2 rounded-full hover:bg-white/5 active:scale-90 transition-all"
                    >
                      <Heart
                        size={18}
                        className={
                          isFav
                            ? "text-pink-400 fill-pink-400"
                            : "text-slate-500"
                        }
                      />
                    </button>
                  </div>

                  {/* Description */}
                  <p
                    className="text-sm leading-relaxed mb-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {nasheed.description}
                  </p>

                  {/* Lyrics */}
                  {nasheed.lyrics && (
                    <div
                      className="p-3 rounded-xl"
                      style={{ background: "var(--bg-input)" }}
                    >
                      <p
                        className="text-xs font-medium mb-2"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Текст:
                      </p>
                      <p
                        className="text-sm leading-relaxed whitespace-pre-line"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {nasheed.lyrics}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Floating YouTube Player ─────────────────────────────────────── */}
      {showPlayer && currentNasheed && (
        <div
          className="fixed bottom-20 left-0 right-0 z-50 px-3 animate-slide-down"
        >
          <div className="max-w-lg mx-auto glass-card overflow-hidden shadow-2xl shadow-black/40">
            {/* YouTube iframe */}
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${currentNasheed.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title={currentNasheed.title}
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>

            {/* Player controls bar */}
            <div className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {currentNasheed.title}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--text-muted)" }}
                >
                  {currentNasheed.artist}
                </p>
              </div>

              {/* Prev / Next / Close */}
              <button
                onClick={playPrev}
                className="p-2 rounded-lg hover:bg-white/5 active:scale-90 transition-all"
                style={{ color: "var(--text-secondary)" }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={playNext}
                className="p-2 rounded-lg hover:bg-white/5 active:scale-90 transition-all"
                style={{ color: "var(--text-secondary)" }}
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={stopPlaying}
                className="p-2 rounded-lg hover:bg-white/5 active:scale-90 transition-all"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
