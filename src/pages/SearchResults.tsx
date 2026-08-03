import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Loader2, ChevronDown, ExternalLink, X } from "lucide-react";
import {
  type SearchResult,
  type HadithIndexEntry,
  type AyahIndexEntry,
  type QA,
  CATEGORY_COLORS,
  loadHadithIndexOnce,
  loadQuranIndexOnce,
  loadQAOnce,
  loadFactsOnce,
  searchInstant,
  searchHadithIndex,
  searchQuranIndex,
  searchQAList,
  searchFactsList,
} from "../lib/megaSearch";
import type { IslamicFact } from "../data/facts";

// =============================================================================
// Полный экран результатов мега-поиска (открывается по Enter из GlobalSearch) —
// без урезания: показывает ВСЕ совпадения по каждому источнику, сгруппированные
// по категориям, с общим счётчиком.
// =============================================================================

const FULL_LIMIT = 500; // практический потолок на источник, чтобы не подвесить рендер

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const [hadithIndex, setHadithIndex] = useState<HadithIndexEntry[] | null>(null);
  const [quranIndex, setQuranIndex] = useState<AyahIndexEntry[] | null>(null);
  const [qaList, setQaList] = useState<QA[] | null>(null);
  const [factsList, setFactsList] = useState<IslamicFact[] | null>(null);
  const loadingExtra = !hadithIndex || !quranIndex || !qaList || !factsList;

  // Раскрытые «на месте» результаты — читаем превью без перехода на другую страницу
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    loadHadithIndexOnce().then(setHadithIndex);
    loadQuranIndexOnce().then(setQuranIndex);
    loadQAOnce().then(setQaList);
    loadFactsOnce().then(setFactsList);
  }, []);

  // Держим query параметр в URL синхронным (можно поделиться ссылкой на поиск)
  useEffect(() => {
    if (query.trim().length >= 2) {
      setSearchParams({ q: query.trim() }, { replace: true });
    }
  }, [query, setSearchParams]);

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    return [
      ...searchInstant(query, FULL_LIMIT),
      ...(quranIndex ? searchQuranIndex(query, quranIndex, FULL_LIMIT) : []),
      ...(hadithIndex ? searchHadithIndex(query, hadithIndex, FULL_LIMIT) : []),
      ...(qaList ? searchQAList(query, qaList, FULL_LIMIT) : []),
      ...(factsList ? searchFactsList(query, factsList, FULL_LIMIT) : []),
    ];
  }, [query, quranIndex, hadithIndex, qaList, factsList]);

  // Группировка по категории — так проще охватить «тысячи тем разом»
  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    }
    return Array.from(map.entries());
  }, [results]);

  return (
    <div
      className="min-h-screen px-3 sm:px-4 max-w-2xl mx-auto"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 20px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 110px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="glass-card w-10 h-10 flex items-center justify-center shrink-0 hover:bg-white/10 active:bg-white/15 transition-colors"
        >
          <ArrowLeft size={18} className="text-white/70" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-white">Мега-поиск</h1>
          <p className="text-xs text-slate-400 truncate">
            {results.length > 0
              ? `${results.length} результат${
                  results.length % 10 === 1 && results.length % 100 !== 11
                    ? ""
                    : results.length % 10 >= 2 &&
                        results.length % 10 <= 4 &&
                        (results.length % 100 < 10 || results.length % 100 >= 20)
                      ? "а"
                      : "ов"
                } по «${query}»`
              : "по всему приложению"}
          </p>
        </div>
      </div>

      {/* Search input (можно уточнить запрос прямо здесь) */}
      <div className="relative mb-4 animate-fade-in">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Любое слово — вода, жена, терпение..."
          enterKeyHint="search"
          inputMode="search"
          className="w-full pl-10 pr-10 py-3.5 rounded-xl t-bg text-base sm:text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/40"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-300 active:bg-white/10 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loadingExtra && (
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-3">
          <Loader2 className="w-3 h-3 animate-spin" />
          Догружаю хадисы, вопросы-ответы и факты…
        </p>
      )}

      {query.trim().length < 2 && (
        <div className="glass-card p-8 text-center">
          <span className="text-3xl block mb-2">🔎</span>
          <p className="text-sm text-slate-400">Введите минимум 2 буквы</p>
        </div>
      )}

      {query.trim().length >= 2 && results.length === 0 && !loadingExtra && (
        <div className="glass-card p-8 text-center">
          <span className="text-3xl block mb-2">🔍</span>
          <p className="text-sm text-slate-400">
            Ничего не найдено по «{query}»
          </p>
        </div>
      )}

      {/* Группы результатов по категориям */}
      <div className="space-y-4">
        {grouped.map(([category, items]) => {
          const colorClass =
            CATEGORY_COLORS[category] || "text-white/50 bg-white/5 border-white/10";
          return (
            <div key={category} className="glass-card p-3.5 rounded-3xl">
              <div className="flex items-center gap-2 mb-2.5 px-0.5">
                <span
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${colorClass}`}
                >
                  {category}
                </span>
                <span className="text-[11px] text-slate-500">
                  {items.length}
                </span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {items.map((result, i) => {
                  const key = `${result.path}-${i}`;
                  const isOpen = expanded.has(key);
                  const hasPreview = !!result.preview;
                  return (
                    <div key={key}>
                      <button
                        onClick={() =>
                          hasPreview ? toggleExpanded(key) : navigate(result.path)
                        }
                        className="w-full py-3 flex items-start gap-3 text-left hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-sm shrink-0 mt-0.5">
                          {result.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white/40 mb-0.5">
                            {result.subtitle}
                          </p>
                          <p
                            className={`text-sm text-white/85 leading-relaxed ${
                              isOpen ? "" : "line-clamp-3"
                            }`}
                          >
                            {isOpen && result.preview ? result.preview : result.title}
                          </p>
                        </div>
                        {hasPreview && (
                          <ChevronDown
                            size={16}
                            className={`text-white/25 shrink-0 mt-1 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </button>
                      {isOpen && (
                        <button
                          onClick={() => navigate(result.path)}
                          className="w-full flex items-center gap-1.5 py-2.5 pl-11 text-[13px] text-emerald-400 hover:text-emerald-300 active:text-emerald-200 transition-colors"
                        >
                          <ExternalLink size={12} />
                          Открыть полностью
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
