import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { RECOMMENDED_ITEMS, CATEGORIES } from "../data/recommended";

export default function Recommended() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredItems =
    activeCategory === "all"
      ? RECOMMENDED_ITEMS
      : RECOMMENDED_ITEMS.filter((item) => item.category === activeCategory);

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
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-xl">
            ⭐
          </div>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Рекомендуемые аяты
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Суры и аяты на каждый день
            </p>
          </div>
        </div>
      </header>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10"
                  : "glass-card hover:bg-white/[0.06]"
              }`}
              style={!isActive ? { color: "var(--text-secondary)" } : undefined}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Items count */}
      <p
        className="text-xs mb-3 px-1"
        style={{ color: "var(--text-muted)" }}
      >
        {filteredItems.length}{" "}
        {filteredItems.length === 1
          ? "рекомендация"
          : filteredItems.length >= 2 && filteredItems.length <= 4
            ? "рекомендации"
            : "рекомендаций"}
      </p>

      {/* Cards */}
      <div className="space-y-3">
        {filteredItems.map((item, index) => {
          const isExpanded = expandedId === item.id;
          const catInfo = CATEGORIES.find((c) => c.key === item.category);

          return (
            <div
              key={item.id}
              className="animate-fade-in"
              style={{ animationDelay: `${0.03 + index * 0.04}s` }}
            >
              <div
                className={`glass-card overflow-hidden transition-all duration-300 ${
                  isExpanded
                    ? "ring-1 ring-amber-500/20"
                    : "hover:bg-white/[0.04] active:scale-[0.99]"
                }`}
              >
                {/* Card Header */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : item.id)
                  }
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{
                      background: "rgba(245,158,11,0.1)",
                    }}
                  >
                    <span>{catInfo?.icon || "📖"}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-sm font-semibold leading-snug"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="text-xs mt-0.5 leading-relaxed"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {item.surahNumber && item.ayahRange
                        ? `Сура ${item.surahNumber}, аят ${item.ayahRange}`
                        : item.category}
                    </p>
                  </div>

                  <div className="flex-shrink-0">
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

                {/* Expanded Content */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded
                      ? "max-h-[5000px] opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-4 pb-4">
                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                      <div className="w-1 h-1 rounded-full bg-amber-500/30" />
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                    </div>

                    {/* Arabic text */}
                    <div
                      className="rounded-xl p-4 mb-4"
                      style={{
                        background: "rgba(245,158,11,0.06)",
                        border: "1px solid rgba(245,158,11,0.12)",
                      }}
                    >
                      <p
                        className="text-lg leading-loose text-right mb-3"
                        style={{
                          fontFamily: "'Amiri', 'Scheherazade New', serif",
                          color: "var(--text-primary)",
                          direction: "rtl",
                        }}
                      >
                        {item.arabic}
                      </p>
                      <p className="text-xs text-amber-400/80 mb-2 italic">
                        {item.transcription}
                      </p>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {item.translation}
                      </p>
                    </div>

                    {/* Benefit */}
                    <div
                      className="rounded-xl p-3.5"
                      style={{
                        background: "rgba(16,185,129,0.06)",
                        border: "1px solid rgba(16,185,129,0.12)",
                      }}
                    >
                      <p
                        className="text-xs font-semibold mb-1.5"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Польза и достоинства
                      </p>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {item.benefit}
                      </p>
                    </div>

                    {/* Open in Quran button */}
                    {item.surahNumber && (
                      <button
                        onClick={() => navigate(`/quran`)}
                        className="mt-3 w-full py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                        style={{
                          background: "rgba(245,158,11,0.1)",
                          border: "1px solid rgba(245,158,11,0.2)",
                          color: "rgb(245,158,11)",
                        }}
                      >
                        <BookOpen size={14} />
                        Открыть в Коране
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-8" />
    </div>
  );
}
