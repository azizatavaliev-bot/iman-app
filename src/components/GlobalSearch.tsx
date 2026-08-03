import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ChevronRight, Loader2, CornerDownLeft } from "lucide-react";
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
import { useModalDismiss } from "../hooks/useModalDismiss";

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

  // Escape / кнопка «Назад» закрывают поиск даже без фокуса в поле ввода
  useModalDismiss(isOpen, onClose);

  // Ленивые источники «мега-поиска» — грузятся при открытии, кэшируются на сессию
  const [hadithIndex, setHadithIndex] = useState<HadithIndexEntry[] | null>(null);
  const [quranIndex, setQuranIndex] = useState<AyahIndexEntry[] | null>(null);
  const [qaList, setQaList] = useState<QA[] | null>(null);
  const [factsList, setFactsList] = useState<IslamicFact[] | null>(null);
  const loadingExtra = !hadithIndex || !quranIndex || !qaList || !factsList;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      loadHadithIndexOnce().then(setHadithIndex);
      loadQuranIndexOnce().then(setQuranIndex);
      loadQAOnce().then(setQaList);
      loadFactsOnce().then(setFactsList);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Пересчитываем результаты при каждом изменении запроса И по мере
  // подгрузки тяжёлых источников (появляются «доездом», без блокировки UI)
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const combined = [
      ...searchInstant(query),
      ...(quranIndex ? searchQuranIndex(query, quranIndex) : []),
      ...(hadithIndex ? searchHadithIndex(query, hadithIndex) : []),
      ...(qaList ? searchQAList(query, qaList) : []),
      ...(factsList ? searchFactsList(query, factsList) : []),
    ];
    setResults(combined);
  }, [query, quranIndex, hadithIndex, qaList, factsList]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onClose();
      navigate(result.path);
    },
    [navigate, onClose],
  );

  // Enter — открыть полный экран со всеми результатами (без ограничений)
  const handleShowAll = useCallback(() => {
    if (query.trim().length < 2) return;
    onClose();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }, [query, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg mx-auto px-3 sm:px-4 flex-1 min-h-0 flex flex-col"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 12px)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)",
        }}
      >
        {/* Search Input */}
        <div className="relative shrink-0">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleShowAll();
              if (e.key === "Escape") onClose();
            }}
            placeholder="Поиск по всему приложению..."
            enterKeyHint="search"
            inputMode="search"
            className="w-full pl-11 pr-20 py-4 rounded-2xl text-base sm:text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
          {query && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-11 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:bg-white/25 transition-colors"
            >
              <X size={14} className="text-white/50" />
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Закрыть поиск"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white/60 active:bg-white/10 transition-colors"
          >
            <span className="hidden sm:inline text-xs">Esc</span>
            <X size={16} className="sm:hidden" />
          </button>
        </div>

        {/* Results */}
        <div
          className="mt-3 rounded-2xl overflow-hidden flex-1 min-h-0 overflow-y-auto overscroll-contain"
          style={{
            background: "rgba(15,15,25,0.95)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {query.length >= 2 && results.length === 0 && !loadingExtra && (
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
              <p className="text-sm text-white/40 px-6">
                Мега-поиск: любое слово — по всему Корану (6 236 аятов), хадисам
                (16 400+), вопросам-ответам, дуа, зикрам, историям, фактам и
                всему приложению
              </p>
              <div className="flex flex-wrap gap-2 justify-center px-4">
                {["вода", "жена", "терпение", "закят", "намаз", "пост"].map(
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
              {loadingExtra && (
                <p className="text-[10px] text-white/20 flex items-center justify-center gap-1.5 pt-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Догружаю хадисы и базу вопросов…
                </p>
              )}
            </div>
          )}

          {query.length >= 2 && loadingExtra && (
            <p className="text-[10px] text-white/25 flex items-center justify-center gap-1.5 py-2 border-b border-white/5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Ищу также в хадисах и вопросах-ответах…
            </p>
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
                        className={`hidden sm:inline text-[9px] font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}
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

          {query.length >= 2 && (
            <button
              onClick={handleShowAll}
              className="w-full px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 border-t border-white/5 transition-colors"
            >
              <CornerDownLeft size={14} />
              Показать все результаты по «{query}»
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
