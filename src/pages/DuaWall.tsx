import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Heart, Send, X, Loader2 } from "lucide-react";
import { getTelegramUser } from "../lib/telegram";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DuaRequest {
  id: number;
  text: string;
  category: string;
  pray_count: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API = import.meta.env.VITE_API_URL || "";

const CATEGORIES = [
  { key: "health", label: "Здоровье", icon: "\u{1F49A}" },
  { key: "family", label: "Семья", icon: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}" },
  { key: "guidance", label: "Наставление", icon: "\u{1F31F}" },
  { key: "rizq", label: "Ризк", icon: "\u{1F4B0}" },
  { key: "forgiveness", label: "Прощение", icon: "\u{1F932}" },
  { key: "general", label: "Общее", icon: "\u{1F4FF}" },
];

const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return "только что";
  if (minutes < 60) {
    if (minutes === 1) return "1 мин назад";
    return `${minutes} мин назад`;
  }
  if (hours < 24) {
    if (hours === 1) return "1 час назад";
    if (hours >= 2 && hours <= 4) return `${hours} часа назад`;
    return `${hours} часов назад`;
  }
  if (days === 1) return "вчера";
  if (days >= 2 && days <= 4) return `${days} дня назад`;
  if (days <= 30) return `${days} дней назад`;

  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DuaWall() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState<DuaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [prayedIds, setPrayedIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem("iman_dua_wall_prayed");
      if (stored) return new Set(JSON.parse(stored));
    } catch {
      // ignore
    }
    return new Set();
  });
  const [animatingId, setAnimatingId] = useState<number | null>(null);

  // ---------- Fetch requests ----------
  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/dua-wall`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("Failed to fetch dua wall:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ---------- Save prayed IDs to localStorage ----------
  const savePrayedIds = useCallback((ids: Set<number>) => {
    try {
      localStorage.setItem(
        "iman_dua_wall_prayed",
        JSON.stringify([...ids]),
      );
    } catch {
      // ignore
    }
  }, []);

  // ---------- Submit new request ----------
  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    const trimmed = newText.trim();
    if (trimmed.length < 3 || trimmed.length > 500) return;

    setSubmitting(true);
    try {
      const tgUser = getTelegramUser();
      const res = await fetch(`${API}/api/dua-wall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          category: newCategory,
          telegramId: tgUser?.id,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setRequests((prev) => [created, ...prev]);
        setNewText("");
        setNewCategory("general");
        setShowForm(false);
      }
    } catch (err) {
      console.error("Failed to submit dua request:", err);
    } finally {
      setSubmitting(false);
    }
  }, [newText, newCategory, submitting]);

  // ---------- Pray for someone ----------
  const handlePray = useCallback(
    async (id: number) => {
      if (prayedIds.has(id)) return;

      // Optimistic update
      setAnimatingId(id);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, pray_count: r.pray_count + 1 } : r,
        ),
      );
      const newPrayed = new Set(prayedIds);
      newPrayed.add(id);
      setPrayedIds(newPrayed);
      savePrayedIds(newPrayed);

      setTimeout(() => setAnimatingId(null), 600);

      try {
        await fetch(`${API}/api/dua-wall/${id}/pray`, { method: "POST" });
      } catch (err) {
        console.error("Failed to pray:", err);
      }
    },
    [prayedIds, savePrayedIds],
  );

  // ---------- Stats ----------
  const totalRequests = requests.length;
  const totalPrayers = requests.reduce((sum, r) => sum + r.pray_count, 0);

  // =======================================================================
  // RENDER
  // =======================================================================

  return (
    <div className="min-h-screen pb-8 animate-fade-in">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass px-4 py-3" style={{ borderBottom: "1px solid var(--border-secondary)" }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 active:scale-95 transition-all"
          >
            <ChevronLeft size={22} className="text-white/70" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white">Стена дуа</h1>
            <p className="text-[11px] text-white/40 truncate">
              Попросите дуа у братьев и сестёр
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* ── Stats bar ────────────────────────────────────────────────────── */}
        <div className="glass-card p-3 flex items-center justify-around">
          <div className="text-center">
            <p className="text-xl font-bold text-white tabular-nums">
              {totalRequests}
            </p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">
              Просьб
            </p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-xl font-bold text-emerald-400 tabular-nums">
              {totalPrayers}
            </p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">
              Дуа прочитано
            </p>
          </div>
        </div>

        {/* ── Loading state ────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={28} className="text-emerald-400 animate-spin" />
              <span className="text-xs text-white/40">Загрузка...</span>
            </div>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {!loading && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <span className="text-4xl">{"\u{1F932}"}</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Стена дуа пока пуста
            </h3>
            <p className="text-sm text-white/50 max-w-xs">
              Будьте первым, кто попросит дуа у братьев и сестёр. Ваша просьба
              будет анонимной.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 px-6 py-3 rounded-2xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-white transition-all active:scale-[0.97] shadow-lg shadow-emerald-500/30 flex items-center gap-2"
            >
              <Plus size={18} />
              Попросить дуа
            </button>
          </div>
        )}

        {/* ── Request cards ────────────────────────────────────────────────── */}
        {!loading && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((req) => {
              const cat = CATEGORY_MAP[req.category] || CATEGORY_MAP.general;
              const hasPrayed = prayedIds.has(req.id);
              const isAnimating = animatingId === req.id;

              return (
                <div
                  key={req.id}
                  className="glass-card p-4 space-y-3 relative overflow-hidden"
                >
                  {/* Category + time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        {cat.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/30">
                      {timeAgo(req.created_at)}
                    </span>
                  </div>

                  {/* Text */}
                  <p className="text-sm text-white/80 leading-relaxed">
                    {req.text}
                  </p>

                  {/* Footer: anonymous + pray button */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-white/25 italic">
                      Аноним
                    </span>

                    <button
                      onClick={() => handlePray(req.id)}
                      disabled={hasPrayed}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
                        hasPrayed
                          ? "bg-rose-500/15 border border-rose-500/25 text-rose-400 cursor-default"
                          : "bg-white/5 border border-white/10 text-white/60 hover:bg-rose-500/10 hover:border-rose-500/25 hover:text-rose-400 active:scale-95"
                      }`}
                    >
                      <Heart
                        size={14}
                        className={`transition-all duration-300 ${
                          isAnimating ? "scale-125" : ""
                        } ${hasPrayed ? "fill-rose-400 text-rose-400" : ""}`}
                        fill={hasPrayed ? "currentColor" : "none"}
                      />
                      <span className="tabular-nums">{req.pray_count}</span>
                      {!hasPrayed && (
                        <span className="text-[10px] text-white/30 ml-0.5">
                          Прочитал дуа
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FAB button ─────────────────────────────────────────────────────── */}
      {!showForm && !loading && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/40 flex items-center justify-center transition-all active:scale-90"
        >
          <Plus size={24} />
        </button>
      )}

      {/* ── Add form modal (bottom sheet) ──────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl overflow-hidden"
            style={{ background: "var(--bg-primary)", borderTop: "1px solid var(--border-secondary)" }}
          >
            {/* Sheet header */}
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="text-lg font-bold text-white">Попросить дуа</h3>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
              >
                <X size={18} className="text-white/50" />
              </button>
            </div>

            <div className="px-5 pb-8 space-y-4">
              {/* Textarea */}
              <div>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Опишите вашу просьбу о дуа... (анонимно)"
                  maxLength={500}
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-secondary)" }}
                  autoFocus
                />
                <div className="flex items-center justify-between mt-1.5 px-1">
                  <span className="text-[10px] text-white/30">
                    {newText.trim().length < 3
                      ? "Минимум 3 символа"
                      : ""}
                  </span>
                  <span
                    className={`text-[10px] tabular-nums ${
                      newText.length > 450
                        ? "text-amber-400"
                        : "text-white/30"
                    }`}
                  >
                    {newText.length}/500
                  </span>
                </div>
              </div>

              {/* Category selector */}
              <div>
                <p className="text-xs text-white/40 mb-2 px-1">Категория</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setNewCategory(cat.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        newCategory === cat.key
                          ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                          : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10"
                      }`}
                    >
                      <span className="text-sm">{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  newText.trim().length < 3 ||
                  newText.trim().length > 500
                }
                className="w-full py-3.5 rounded-2xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-white transition-all active:scale-[0.97] shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                {submitting ? "Отправка..." : "Отправить просьбу"}
              </button>

              {/* Privacy note */}
              <p className="text-[10px] text-white/25 text-center px-4">
                Ваша просьба будет опубликована анонимно. Никто не увидит ваше
                имя.
              </p>
            </div>

            {/* Safe area */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </div>
        </div>
      )}

      {/* ── Inline styles for heart animation ──────────────────────────────── */}
      <style>{`
        @keyframes heart-pulse {
          0% { transform: scale(1); }
          25% { transform: scale(1.3); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
