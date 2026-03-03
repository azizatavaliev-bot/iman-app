import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ChevronRight } from "lucide-react";

// Data imports
import { NAMES_OF_ALLAH } from "../data/names";
import { DUA_DATA } from "../data/dua";
import { DHIKR_DATA } from "../data/dhikr";
import { STORIES } from "../data/stories";
import { PROPHETS } from "../data/prophets";
import { SEERAH_CHAPTERS } from "../data/seerah";
import { NAMAZ_GUIDE_SECTIONS } from "../data/namazGuide";
import { BEGINNER_SECTIONS } from "../data/beginners";
import { GLOSSARY, APP_FEATURES } from "../data/guide";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResult {
  title: string;
  subtitle: string;
  category: string;
  icon: string;
  path: string;
}

type CategoryColor = string;

const CATEGORY_COLORS: Record<string, CategoryColor> = {
  "99 имён": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Дуа": "text-pink-400 bg-pink-500/10 border-pink-500/20",
  "Зикры": "text-teal-400 bg-teal-500/10 border-teal-500/20",
  "Истории": "text-violet-400 bg-violet-500/10 border-violet-500/20",
  "Пророки": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "Сира": "text-sky-400 bg-sky-500/10 border-sky-500/20",
  "Намаз": "text-orange-400 bg-orange-500/10 border-orange-500/20",
  "Новичкам": "text-lime-400 bg-lime-500/10 border-lime-500/20",
  "Словарь": "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  "Функции": "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
};

// ---------------------------------------------------------------------------
// Search logic
// ---------------------------------------------------------------------------

function searchAll(query: string): SearchResult[] {
  if (!query || query.length < 2) return [];

  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];
  const limit = 20;

  // 99 имён Аллаха
  for (const name of NAMES_OF_ALLAH) {
    if (results.length >= limit) break;
    if (
      name.russian.toLowerCase().includes(q) ||
      name.transliteration.toLowerCase().includes(q) ||
      name.meaning.toLowerCase().includes(q)
    ) {
      results.push({
        title: `${name.russian} (${name.transliteration})`,
        subtitle: name.meaning,
        category: "99 имён",
        icon: "✨",
        path: "/names",
      });
    }
  }

  // Дуа
  for (const dua of DUA_DATA) {
    if (results.length >= limit) break;
    if (
      dua.translation.toLowerCase().includes(q) ||
      (dua.situation && dua.situation.toLowerCase().includes(q)) ||
      dua.transcription.toLowerCase().includes(q)
    ) {
      results.push({
        title: dua.situation || dua.translation.slice(0, 50) + "...",
        subtitle: dua.translation.slice(0, 80),
        category: "Дуа",
        icon: "🤲",
        path: "/dua",
      });
    }
  }

  // Зикры
  for (const dhikr of DHIKR_DATA) {
    if (results.length >= limit) break;
    if (
      dhikr.russian.toLowerCase().includes(q) ||
      dhikr.transcription.toLowerCase().includes(q)
    ) {
      results.push({
        title: dhikr.russian.slice(0, 60),
        subtitle: dhikr.transcription.slice(0, 60),
        category: "Зикры",
        icon: "📿",
        path: "/dhikr",
      });
    }
  }

  // Истории
  for (const story of STORIES) {
    if (results.length >= limit) break;
    if (
      story.title.toLowerCase().includes(q) ||
      story.subtitle.toLowerCase().includes(q)
    ) {
      results.push({
        title: story.title,
        subtitle: story.subtitle,
        category: "Истории",
        icon: story.icon,
        path: "/stories",
      });
    }
  }

  // Пророки
  for (const prophet of PROPHETS) {
    if (results.length >= limit) break;
    if (
      prophet.name.toLowerCase().includes(q) ||
      prophet.title.toLowerCase().includes(q) ||
      prophet.summary.toLowerCase().includes(q)
    ) {
      results.push({
        title: prophet.name,
        subtitle: prophet.summary.slice(0, 80),
        category: "Пророки",
        icon: "📖",
        path: "/prophets",
      });
    }
  }

  // Сира
  for (const chapter of SEERAH_CHAPTERS) {
    if (results.length >= limit) break;
    if (
      chapter.title.toLowerCase().includes(q) ||
      chapter.summary.toLowerCase().includes(q)
    ) {
      results.push({
        title: chapter.title,
        subtitle: chapter.summary.slice(0, 80),
        category: "Сира",
        icon: "🌙",
        path: "/seerah",
      });
    }
  }

  // Намаз-гайд
  for (const section of NAMAZ_GUIDE_SECTIONS) {
    if (results.length >= limit) break;
    if (
      section.title.toLowerCase().includes(q) ||
      section.summary.toLowerCase().includes(q)
    ) {
      results.push({
        title: section.title,
        subtitle: section.summary,
        category: "Намаз",
        icon: "🕌",
        path: "/namaz-guide",
      });
    }
  }

  // Новичкам
  for (const section of BEGINNER_SECTIONS) {
    if (results.length >= limit) break;
    if (
      section.title.toLowerCase().includes(q) ||
      section.summary.toLowerCase().includes(q)
    ) {
      results.push({
        title: section.title,
        subtitle: section.summary,
        category: "Новичкам",
        icon: "🌟",
        path: "/beginners",
      });
    }
  }

  // Глоссарий
  for (const item of GLOSSARY) {
    if (results.length >= limit) break;
    if (
      item.term.toLowerCase().includes(q) ||
      item.meaning.toLowerCase().includes(q)
    ) {
      results.push({
        title: item.term,
        subtitle: item.meaning.slice(0, 80),
        category: "Словарь",
        icon: "📚",
        path: "/guide",
      });
    }
  }

  // Функции приложения
  for (const feature of APP_FEATURES) {
    if (results.length >= limit) break;
    if (
      feature.name.toLowerCase().includes(q) ||
      feature.description.toLowerCase().includes(q)
    ) {
      results.push({
        title: feature.name,
        subtitle: feature.description,
        category: "Функции",
        icon: feature.icon,
        path: feature.path,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GlobalSearch({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setResults(searchAll(value));
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onClose();
      navigate(result.path);
    },
    [navigate, onClose],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg mx-auto px-4 pt-[env(safe-area-inset-top)] mt-4">
        {/* Search Input */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Поиск по всему приложению..."
            className="w-full pl-11 pr-12 py-4 rounded-2xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
          {query && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-12 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X size={12} className="text-white/50" />
            </button>
          )}
          <button
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white/60 transition-colors px-1"
          >
            Esc
          </button>
        </div>

        {/* Results */}
        <div
          className="mt-3 rounded-2xl overflow-hidden max-h-[70vh] overflow-y-auto"
          style={{
            background: "rgba(15,15,25,0.95)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {query.length >= 2 && results.length === 0 && (
            <div className="py-12 text-center">
              <span className="text-3xl mb-3 block">🔍</span>
              <p className="text-sm text-white/40">
                Ничего не найдено по «{query}»
              </p>
              <p className="text-xs text-white/20 mt-1">
                Попробуйте другой запрос
              </p>
            </div>
          )}

          {query.length < 2 && (
            <div className="py-8 text-center space-y-3">
              <span className="text-3xl block">🔎</span>
              <p className="text-sm text-white/40">
                Ищите по дуа, зикрам, именам Аллаха, историям...
              </p>
              <div className="flex flex-wrap gap-2 justify-center px-4">
                {["Фатиха", "Аль-Курси", "намаз", "вуду", "дуа", "Ибрахим"].map(
                  (hint) => (
                    <button
                      key={hint}
                      onClick={() => handleSearch(hint)}
                      className="px-3 py-1.5 rounded-full text-[11px] text-white/40 bg-white/5 border border-white/8 hover:bg-white/10 transition-colors"
                    >
                      {hint}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-1">
              {results.map((result, i) => {
                const colorClass =
                  CATEGORY_COLORS[result.category] ||
                  "text-white/50 bg-white/5 border-white/10";
                return (
                  <button
                    key={`${result.path}-${i}`}
                    onClick={() => handleSelect(result)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center text-base shrink-0">
                      {result.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 font-medium truncate">
                        {result.title}
                      </p>
                      <p className="text-[11px] text-white/30 truncate mt-0.5">
                        {result.subtitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}
                      >
                        {result.category}
                      </span>
                      <ChevronRight size={14} className="text-white/15" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
