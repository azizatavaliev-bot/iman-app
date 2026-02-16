import { useState, useEffect, useCallback } from "react";
import {
  Heart,
  BookOpen,
  Loader2,
  RefreshCw,
  Shuffle,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
import {
  getAllHadiths,
  getHadithOfDay,
  getHadithSection,
  getRandomExtendedHadith,
  hapticImpact,
} from "../lib/api";
import { storage, POINTS } from "../lib/storage";
import type { Hadith, ExtendedHadith, HadithCollection } from "../lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Hadiths Page — "40 хадисов ан-Навави" + Бухари + Муслим
// Dark theme, emerald/gold accents, premium Arabic typography
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "all" | "favorites";
type CollectionTab = "nawawi" | "bukhari" | "muslim";

const COLLECTION_INFO: Record<
  CollectionTab,
  { label: string; subtitle: string; maxSection: number }
> = {
  nawawi: {
    label: "Навави (40)",
    subtitle: "40 хадисов ан-Навави",
    maxSection: 0,
  },
  bukhari: {
    label: "Бухари",
    subtitle: "Сахих аль-Бухари — 7563 хадиса",
    maxSection: 97,
  },
  muslim: {
    label: "Муслим",
    subtitle: "Сахих Муслим — 7563 хадиса",
    maxSection: 56,
  },
};

export default function Hadiths() {
  // ── Shared state ──
  const [tab, setTab] = useState<Tab>("all");
  const [collectionTab, setCollectionTab] = useState<CollectionTab>("nawawi");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // ── Nawawi state ──
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [hadithOfDay, setHadithOfDay] = useState<Hadith | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());

  // ── Extended collections state (Bukhari / Muslim) ──
  const [selectedSection, setSelectedSection] = useState<number>(1);
  const [extendedHadiths, setExtendedHadiths] = useState<ExtendedHadith[]>([]);
  const [extLoading, setExtLoading] = useState(false);
  const [extError, setExtError] = useState<string | null>(null);
  const [expandedExtId, setExpandedExtId] = useState<string | null>(null);

  // ── Random hadith state ──
  const [randomHadith, setRandomHadith] = useState<ExtendedHadith | null>(null);
  const [randomLoading, setRandomLoading] = useState(false);

  // ── Load Nawawi on mount ──
  useEffect(() => {
    setHadiths(getAllHadiths());
    setHadithOfDay(getHadithOfDay());

    const favs = storage.getFavoriteHadiths();
    setFavorites(new Set(favs.map((f) => f.id)));
  }, []);

  // ── Fetch extended hadiths when collection or section changes ──
  const fetchSection = useCallback(
    async (collection: HadithCollection, section: number) => {
      setExtLoading(true);
      setExtError(null);
      setExpandedExtId(null);
      try {
        const data = await getHadithSection(collection, section);
        setExtendedHadiths(data);
      } catch (err) {
        setExtError(
          err instanceof Error ? err.message : "Ошибка загрузки хадисов",
        );
        setExtendedHadiths([]);
      } finally {
        setExtLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (collectionTab === "bukhari" || collectionTab === "muslim") {
      fetchSection(collectionTab, selectedSection);
    }
  }, [collectionTab, selectedSection, fetchSection]);

  // Reset section when switching collection
  useEffect(() => {
    setSelectedSection(1);
    setExpandedExtId(null);
    setRandomHadith(null);
  }, [collectionTab]);

  // ── Random hadith ──
  const handleRandomHadith = async () => {
    hapticImpact("medium");
    setRandomLoading(true);
    try {
      const collection: HadithCollection =
        collectionTab === "muslim" ? "muslim" : "bukhari";
      const h = await getRandomExtendedHadith(collection);
      setRandomHadith(h);
    } catch {
      // silently fail
    } finally {
      setRandomLoading(false);
    }
  };

  // ── Nawawi: Toggle favorite ──
  const handleToggleFavorite = (hadith: Hadith, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    hapticImpact("light");

    const id = String(hadith.id);
    const wasFavorite = favorites.has(id);

    storage.toggleFavoriteHadith({
      id,
      collection: hadith.source,
      text: hadith.russian,
      narrator: hadith.narrator,
    });

    setFavorites((prev) => {
      const next = new Set(prev);
      if (wasFavorite) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Extended: Toggle favorite ──
  const handleToggleFavoriteExt = (
    hadith: ExtendedHadith,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();
    hapticImpact("light");

    const id = `${hadith.collection}_${hadith.hadithnumber}`;
    const wasFavorite = favorites.has(id);

    const collectionLabel =
      hadith.collection === "bukhari" ? "Сахих аль-Бухари" : "Сахих Муслим";

    storage.toggleFavoriteHadith({
      id,
      collection: collectionLabel,
      text: hadith.text,
      narrator: "",
    });

    setFavorites((prev) => {
      const next = new Set(prev);
      if (wasFavorite) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Nawawi: Expand hadith + award points ──
  const handleExpand = (hadith: Hadith) => {
    const isClosing = expandedId === hadith.id;
    setExpandedId(isClosing ? null : hadith.id);

    if (!isClosing && !readIds.has(hadith.id)) {
      storage.addPoints(POINTS.HADITH);
      setReadIds((prev) => new Set(prev).add(hadith.id));
    }
  };

  // ── Extended: Expand hadith ──
  const handleExpandExt = (hadith: ExtendedHadith) => {
    const id = `${hadith.collection}_${hadith.hadithnumber}`;
    const isClosing = expandedExtId === id;
    setExpandedExtId(isClosing ? null : id);

    if (!isClosing) {
      storage.addPoints(POINTS.HADITH);
    }
  };

  // Filtered list for favorites tab (Nawawi only)
  const displayedHadiths =
    tab === "favorites"
      ? hadiths.filter((h) => favorites.has(String(h.id)))
      : hadiths;

  // Build section chips array
  const maxSection = COLLECTION_INFO[collectionTab].maxSection;
  const sections = Array.from({ length: maxSection }, (_, i) => i + 1);

  const isExtendedCollection =
    collectionTab === "bukhari" || collectionTab === "muslim";

  return (
    <div className="min-h-screen pb-28 px-4 pt-6 max-w-2xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 animate-fade-in">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Хадисы</h1>
          <p className="text-xs text-slate-400">
            {COLLECTION_INFO[collectionTab].subtitle}
          </p>
        </div>
      </div>

      {/* ── Instruction Banner ────────────────────────────────────────── */}
      <div
        className="glass-card p-4 mb-4 border border-amber-500/20 animate-fade-in"
        style={{ animationDelay: "0.02s" }}
      >
        <p className="text-xs text-amber-300/90 leading-relaxed">
          <span className="font-semibold text-amber-400">
            Изучайте хадисы Пророка (мир ему).
          </span>{" "}
          «40 хадисов» ан-Навави — основа знаний каждого мусульманина. Сахих
          аль-Бухари и Муслим — самые достоверные сборники. Добавляйте в
          избранное и перечитывайте. Намерение: «Изучаю Сунну ради следования
          Пророку (мир ему)».
        </p>
        <p className="text-[10px] text-white/30 mt-1">
          Источники: «40 хадисов» имама ан-Навави, Сахих аль-Бухари, Сахих
          Муслим
        </p>
      </div>

      {/* ── Collection Selector ────────────────────────────────────────── */}
      <div
        className="flex gap-1 p-1 rounded-xl t-bg mb-4 animate-fade-in"
        style={{ animationDelay: "0.03s" }}
      >
        {(
          Object.entries(COLLECTION_INFO) as [
            CollectionTab,
            typeof COLLECTION_INFO.nawawi,
          ][]
        ).map(([key, info]) => (
          <button
            key={key}
            onClick={() => {
              setCollectionTab(key);
              setTab("all");
              hapticImpact("light");
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
              collectionTab === key
                ? "bg-amber-500/20 text-amber-400 shadow-sm"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            {info.label}
          </button>
        ))}
      </div>

      {/* ── Random Hadith Button (for Bukhari/Muslim) ─────────────────── */}
      {isExtendedCollection && (
        <div
          className="mb-4 animate-fade-in"
          style={{ animationDelay: "0.05s" }}
        >
          <button
            onClick={handleRandomHadith}
            disabled={randomLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {randomLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Shuffle className="w-4 h-4" />
            )}
            Случайный хадис
          </button>
        </div>
      )}

      {/* ── Random Hadith Card ─────────────────────────────────────────── */}
      {randomHadith && isExtendedCollection && (
        <div
          className="relative mb-5 rounded-2xl overflow-hidden animate-fade-in"
          style={{ animationDelay: "0.05s" }}
        >
          <div className="absolute inset-0 rounded-2xl p-[1.5px] pointer-events-none">
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(16,185,129,0.6), rgba(5,150,105,0.3), rgba(16,185,129,0.6))",
                mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                maskComposite: "exclude",
                WebkitMaskComposite: "xor",
                padding: "1.5px",
              }}
            />
          </div>

          <div className="relative glass-card rounded-2xl p-5 border-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400/90">
                Случайный хадис
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-slate-500 t-bg px-2 py-0.5 rounded-full">
                  #{randomHadith.hadithnumber}
                </span>
                <button
                  onClick={(e) => handleToggleFavoriteExt(randomHadith, e)}
                  className="p-1.5 rounded-full hover:t-bg transition-colors active:scale-90"
                >
                  <Heart
                    className={`w-4 h-4 transition-all duration-300 ${
                      favorites.has(
                        `${randomHadith.collection}_${randomHadith.hadithnumber}`,
                      )
                        ? "fill-red-500 text-red-500 scale-110"
                        : "text-slate-500 hover:text-red-400"
                    }`}
                  />
                </button>
              </div>
            </div>

            {randomHadith.arabicText && (
              <p className="arabic-text text-lg text-amber-100/90 mb-4 leading-[2.2] text-center">
                {randomHadith.arabicText}
              </p>
            )}

            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              {randomHadith.text}
            </p>

            <div className="flex items-center justify-between pt-2 border-t t-border">
              <span className="text-[10px] text-slate-500">
                Книга {randomHadith.book}
              </span>
              <span className="text-[11px] font-medium text-emerald-500/70 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                {randomHadith.collection === "bukhari"
                  ? "Аль-Бухари"
                  : "Муслим"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* NAWAWI TAB                                                      */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {collectionTab === "nawawi" && (
        <>
          {/* ── Hadith of the Day ──────────────────────────────────────── */}
          {hadithOfDay && (
            <div
              className="relative mb-6 rounded-2xl overflow-hidden animate-fade-in"
              style={{ animationDelay: "0.05s" }}
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

              <div className="relative glass-card rounded-2xl p-5 glow-gold border-0">
                {/* Label */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400/90">
                    Хадис дня
                  </span>
                  <button
                    onClick={(e) => handleToggleFavorite(hadithOfDay, e)}
                    className="p-1.5 rounded-full hover:t-bg transition-colors active:scale-90"
                    aria-label="В избранное"
                  >
                    <Heart
                      className={`w-5 h-5 transition-all duration-300 ${
                        favorites.has(String(hadithOfDay.id))
                          ? "fill-red-500 text-red-500 scale-110"
                          : "text-slate-500 hover:text-red-400"
                      }`}
                    />
                  </button>
                </div>

                {/* Arabic */}
                <p className="arabic-text text-xl text-amber-100/90 mb-4 leading-[2.2] text-center">
                  {hadithOfDay.arabic}
                </p>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/40" />
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                </div>

                {/* Russian translation */}
                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                  {hadithOfDay.russian}
                </p>

                {/* Narrator + Source */}
                <div className="flex items-center justify-between pt-2 border-t t-border">
                  <p className="text-[11px] text-slate-500 leading-snug max-w-[65%]">
                    {hadithOfDay.narrator}
                  </p>
                  <span className="text-[11px] font-medium text-amber-500/70 bg-amber-500/10 px-2.5 py-1 rounded-full">
                    {hadithOfDay.source}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Tabs: Все / Избранное ──────────────────────────────────── */}
          <div
            className="flex gap-1 p-1 rounded-xl t-bg mb-5 animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            {[
              { key: "all" as Tab, label: "Все" },
              { key: "favorites" as Tab, label: "Избранное" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  tab === key
                    ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                {label}
                {key === "favorites" && favorites.size > 0 && (
                  <span className="ml-1.5 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
                    {favorites.size}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Nawawi Hadith List ──────────────────────────────────────── */}
          <div className="space-y-3">
            {displayedHadiths.length === 0 && tab === "favorites" && (
              <div
                className="glass-card p-8 text-center animate-fade-in"
                style={{ animationDelay: "0.15s" }}
              >
                <Heart className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Нет избранных хадисов</p>
                <p className="text-slate-500 text-xs mt-1">
                  Нажмите на сердечко, чтобы сохранить
                </p>
              </div>
            )}

            {displayedHadiths.map((hadith, index) => {
              const isExpanded = expandedId === hadith.id;
              const isFav = favorites.has(String(hadith.id));

              return (
                <div
                  key={hadith.id}
                  className="animate-fade-in"
                  style={{
                    animationDelay: `${0.08 + index * 0.04}s`,
                    opacity: 0,
                  }}
                >
                  <div
                    className={`glass-card p-4 cursor-pointer transition-all duration-300 ${
                      isExpanded
                        ? "ring-1 ring-emerald-500/20 bg-gradient-to-br from-white/[0.07] to-white/[0.02]"
                        : "hover:bg-white/[0.04] active:scale-[0.99]"
                    }`}
                    onClick={() => handleExpand(hadith)}
                  >
                    {/* Top row: number badge + source + fav button */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        {/* Number badge */}
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-emerald-400">
                            {hadith.number}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 t-bg px-2 py-0.5 rounded-full">
                          {hadith.source}
                        </span>
                        {readIds.has(hadith.id) && (
                          <span className="text-[10px] text-emerald-500/60">
                            +{POINTS.HADITH}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleToggleFavorite(hadith, e)}
                        className="p-1.5 rounded-full hover:t-bg transition-all active:scale-90"
                        aria-label="В избранное"
                      >
                        <Heart
                          className={`w-4 h-4 transition-all duration-300 ${
                            isFav
                              ? "fill-red-500 text-red-500 scale-110"
                              : "text-slate-600 hover:text-red-400"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Arabic text (always visible, smaller) */}
                    <p
                      className={`arabic-text text-amber-100/80 mb-2 text-center transition-all duration-300 ${
                        isExpanded
                          ? "text-lg leading-[2.2]"
                          : "text-base leading-[2] line-clamp-2"
                      }`}
                    >
                      {hadith.arabic}
                    </p>

                    {/* Russian translation - collapsed/expanded */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded
                          ? "max-h-[600px] opacity-100 mt-3"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      {/* Divider */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                        <div className="w-1 h-1 rounded-full bg-emerald-500/30" />
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                      </div>

                      <p className="text-sm text-slate-300 leading-relaxed mb-3">
                        {hadith.russian}
                      </p>

                      <p className="text-[11px] text-slate-500 leading-snug">
                        {hadith.narrator}
                      </p>
                    </div>

                    {/* Expand hint */}
                    {!isExpanded && (
                      <p className="text-[11px] text-slate-600 mt-1.5 text-center">
                        Нажмите, чтобы прочитать перевод
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* BUKHARI / MUSLIM TABS                                           */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {isExtendedCollection && (
        <>
          {/* ── Section Selector (horizontal scrollable chips) ─────────── */}
          <div
            className="mb-4 animate-fade-in"
            style={{ animationDelay: "0.07s" }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400 font-medium">
                Раздел (книга)
              </p>
              <span className="text-[10px] text-slate-500">
                {selectedSection} из {maxSection}
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
              {sections.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSelectedSection(s);
                    hapticImpact("light");
                  }}
                  className={`shrink-0 min-w-[36px] h-8 px-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    selectedSection === s
                      ? "bg-amber-500/20 text-amber-400 shadow-sm ring-1 ring-amber-500/30"
                      : "t-bg text-slate-500 hover:text-slate-300 hover:t-bg"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* ── Quick navigation arrows ────────────────────────────────── */}
          <div
            className="flex items-center gap-2 mb-4 animate-fade-in"
            style={{ animationDelay: "0.09s" }}
          >
            <button
              onClick={() => {
                if (selectedSection > 1) {
                  setSelectedSection((s) => s - 1);
                  hapticImpact("light");
                }
              }}
              disabled={selectedSection <= 1}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl t-bg text-slate-400 text-xs font-medium hover:t-bg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Пред. раздел
            </button>
            <button
              onClick={() => {
                if (selectedSection < maxSection) {
                  setSelectedSection((s) => s + 1);
                  hapticImpact("light");
                }
              }}
              disabled={selectedSection >= maxSection}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl t-bg text-slate-400 text-xs font-medium hover:t-bg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              След. раздел
              <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>

          {/* ── Loading Spinner ─────────────────────────────────────────── */}
          {extLoading && (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
              <p className="text-sm text-slate-400">Загрузка хадисов...</p>
            </div>
          )}

          {/* ── Error State ────────────────────────────────────────────── */}
          {extError && !extLoading && (
            <div className="glass-card p-6 text-center animate-fade-in">
              <AlertCircle className="w-10 h-10 text-red-400/60 mx-auto mb-3" />
              <p className="text-sm text-red-400 mb-1">Ошибка загрузки</p>
              <p className="text-xs text-slate-500 mb-4">{extError}</p>
              <button
                onClick={() =>
                  fetchSection(
                    collectionTab as HadithCollection,
                    selectedSection,
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Попробовать снова
              </button>
            </div>
          )}

          {/* ── Extended Hadith List ────────────────────────────────────── */}
          {!extLoading && !extError && (
            <div className="space-y-3">
              {extendedHadiths.length === 0 && (
                <div className="glass-card p-8 text-center animate-fade-in">
                  <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">
                    В этом разделе нет хадисов
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    Выберите другой раздел
                  </p>
                </div>
              )}

              {extendedHadiths.map((hadith, index) => {
                const cardId = `${hadith.collection}_${hadith.hadithnumber}`;
                const isExpanded = expandedExtId === cardId;
                const isFav = favorites.has(cardId);
                const collectionLabel =
                  hadith.collection === "bukhari" ? "Аль-Бухари" : "Муслим";

                return (
                  <div
                    key={cardId}
                    className="animate-fade-in"
                    style={{
                      animationDelay: `${0.08 + Math.min(index, 15) * 0.03}s`,
                      opacity: 0,
                    }}
                  >
                    <div
                      className={`glass-card p-4 cursor-pointer transition-all duration-300 ${
                        isExpanded
                          ? "ring-1 ring-amber-500/20 bg-gradient-to-br from-white/[0.07] to-white/[0.02]"
                          : "hover:bg-white/[0.04] active:scale-[0.99]"
                      }`}
                      onClick={() => handleExpandExt(hadith)}
                    >
                      {/* Top row: number badge + collection tag + fav */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-amber-400">
                              {hadith.hadithnumber}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-amber-500/70 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            {collectionLabel}
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleToggleFavoriteExt(hadith, e)}
                          className="p-1.5 rounded-full hover:t-bg transition-all active:scale-90"
                          aria-label="В избранное"
                        >
                          <Heart
                            className={`w-4 h-4 transition-all duration-300 ${
                              isFav
                                ? "fill-red-500 text-red-500 scale-110"
                                : "text-slate-600 hover:text-red-400"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Arabic text (always visible) */}
                      {hadith.arabicText && (
                        <p
                          className={`arabic-text text-amber-100/80 mb-2 text-center transition-all duration-300 ${
                            isExpanded
                              ? "text-lg leading-[2.2]"
                              : "text-base leading-[2] line-clamp-2"
                          }`}
                        >
                          {hadith.arabicText}
                        </p>
                      )}

                      {/* Russian translation - collapsed/expanded */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          isExpanded
                            ? "max-h-[800px] opacity-100 mt-3"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        {/* Divider */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                          <div className="w-1 h-1 rounded-full bg-amber-500/30" />
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                        </div>

                        <p className="text-sm text-slate-300 leading-relaxed mb-3">
                          {hadith.text}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t t-border">
                          <span className="text-[10px] text-slate-500">
                            Книга {hadith.book}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Арабский #{hadith.arabicnumber}
                          </span>
                        </div>
                      </div>

                      {/* Expand hint */}
                      {!isExpanded && (
                        <p className="text-[11px] text-slate-600 mt-1.5 text-center">
                          Нажмите, чтобы прочитать перевод
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Bottom spacer for nav */}
      <div className="h-8" />
    </div>
  );
}
