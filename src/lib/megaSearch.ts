// =============================================================================
// Мега-поиск — общая логика для быстрого оверлея (GlobalSearch) и полного
// экрана результатов (SearchResults, открывается по Enter).
// =============================================================================

import { NAMES_OF_ALLAH } from "../data/names";
import { DUA_DATA } from "../data/dua";
import { DHIKR_DATA } from "../data/dhikr";
import { STORIES } from "../data/stories";
import { PROPHETS } from "../data/prophets";
import { SEERAH_CHAPTERS } from "../data/seerah";
import { NAMAZ_GUIDE_SECTIONS } from "../data/namazGuide";
import { BEGINNER_SECTIONS } from "../data/beginners";
import { GLOSSARY, APP_FEATURES } from "../data/guide";
import type { QA } from "../data/islamic-qa";
export type { QA };
import type { IslamicFact } from "../data/facts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResult {
  title: string;
  subtitle: string;
  /** Более длинный фрагмент текста — для полного экрана результатов (SearchResults),
   * чтобы читать сразу в списке, не заходя в каждый результат. */
  preview?: string;
  category: string;
  icon: string;
  path: string;
}

export const CATEGORY_COLORS: Record<string, string> = {
  "Аяты": "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
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
  "Хадисы": "text-rose-400 bg-rose-500/10 border-rose-500/20",
  "Вопросы": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Факты": "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

// ---------------------------------------------------------------------------
// «Мега-поиск»: тяжёлые источники (16 300+ хадисов, 1310+ вопросов, факты)
// грузятся ЛЕНИВО — только когда пользователь открыл поиск, и только один
// раз за сессию (модульный кэш-промис) — чтобы не раздувать стартовый бандл.
// ---------------------------------------------------------------------------

export interface HadithIndexEntry {
  c: "bukhari" | "muslim" | "abudawud" | "riyad";
  b: number; // книга
  n: number; // номер хадиса
  t: string; // короткий фрагмент текста (для поиска и превью)
}

export const HADITH_COLLECTION_LABEL: Record<string, string> = {
  bukhari: "Аль-Бухари",
  muslim: "Муслим",
  abudawud: "Абу Дауд",
  riyad: "Сады праведных",
};

let hadithIndexPromise: Promise<HadithIndexEntry[]> | null = null;
export function loadHadithIndexOnce(): Promise<HadithIndexEntry[]> {
  if (!hadithIndexPromise) {
    hadithIndexPromise = fetch(
      `${import.meta.env.BASE_URL}data/hadith-search-index.json`,
    )
      .then((r) => r.json())
      .catch(() => []);
  }
  return hadithIndexPromise;
}

/** Аят Корана в поисковом индексе: сура, номер аята, название суры, текст (Кулиев) */
export interface AyahIndexEntry {
  s: number;
  a: number;
  n: string;
  t: string;
}

let quranIndexPromise: Promise<AyahIndexEntry[]> | null = null;
export function loadQuranIndexOnce(): Promise<AyahIndexEntry[]> {
  if (!quranIndexPromise) {
    quranIndexPromise = fetch(
      `${import.meta.env.BASE_URL}data/quran-search-index.json`,
    )
      .then((r) => r.json())
      .catch(() => []);
  }
  return quranIndexPromise;
}

let qaPromise: Promise<QA[]> | null = null;
export function loadQAOnce(): Promise<QA[]> {
  if (!qaPromise) {
    qaPromise = import("../data/islamic-qa")
      .then((m) => m.QA_LIST)
      .catch(() => []);
  }
  return qaPromise;
}

let factsPromise: Promise<IslamicFact[]> | null = null;
export function loadFactsOnce(): Promise<IslamicFact[]> {
  if (!factsPromise) {
    factsPromise = import("../data/facts")
      .then((m) => m.FACTS)
      .catch(() => []);
  }
  return factsPromise;
}

// ---------------------------------------------------------------------------
// Search logic — мгновенные (маленькие, всегда в бандле) источники
// ---------------------------------------------------------------------------

export function searchInstant(query: string, limit = 14): SearchResult[] {
  if (!query || query.length < 2) return [];

  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];

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
        path: `/names?id=${name.id}`,
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
        path: `/dua?id=${dua.id}`,
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
        path: `/stories?id=${story.id}`,
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
        path: `/prophets?id=${prophet.id}`,
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
        path: `/seerah?id=${chapter.id}`,
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
// Search logic — тяжёлые (ленивые) источники: хадисы, Q&A, факты
// ---------------------------------------------------------------------------

export function searchHadithIndex(
  query: string,
  index: HadithIndexEntry[],
  limit = 10,
): SearchResult[] {
  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];
  for (const h of index) {
    if (results.length >= limit) break;
    if (h.t.toLowerCase().includes(q)) {
      results.push({
        title: h.t.length > 90 ? h.t.slice(0, 90) + "…" : h.t,
        subtitle: `${HADITH_COLLECTION_LABEL[h.c] || h.c} · №${h.n}`,
        preview: h.t,
        category: "Хадисы",
        icon: "📜",
        path: `/hadiths?collection=${h.c}&book=${h.b}&h=${h.n}`,
      });
    }
  }
  return results;
}

export function searchQuranIndex(
  query: string,
  index: AyahIndexEntry[],
  limit = 10,
): SearchResult[] {
  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];
  for (const v of index) {
    if (results.length >= limit) break;
    if (v.t.toLowerCase().includes(q)) {
      results.push({
        title: v.t.length > 90 ? v.t.slice(0, 90) + "…" : v.t,
        subtitle: `Сура ${v.s} «${v.n}» · аят ${v.a}`,
        preview: v.t,
        category: "Аяты",
        icon: "📕",
        path: `/quran?surah=${v.s}&ayah=${v.a}`,
      });
    }
  }
  return results;
}

export function searchQAList(query: string, list: QA[], limit = 8): SearchResult[] {
  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];
  for (const item of list) {
    if (results.length >= limit) break;
    if (
      item.q.toLowerCase().includes(q) ||
      item.a.toLowerCase().includes(q) ||
      (item.scholar && item.scholar.toLowerCase().includes(q)) ||
      (item.source && item.source.toLowerCase().includes(q))
    ) {
      results.push({
        title: item.q,
        subtitle: item.a.slice(0, 90),
        preview: item.a,
        category: "Вопросы",
        icon: "❓",
        path: `/qa?q=${encodeURIComponent(query)}`,
      });
    }
  }
  return results;
}

export function searchFactsList(
  query: string,
  list: IslamicFact[],
  limit = 6,
): SearchResult[] {
  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];
  for (const fact of list) {
    if (results.length >= limit) break;
    if (
      fact.title.toLowerCase().includes(q) ||
      fact.body.toLowerCase().includes(q)
    ) {
      results.push({
        title: fact.title,
        subtitle: fact.body.slice(0, 90),
        preview: fact.body,
        category: "Факты",
        icon: "💡",
        path: `/facts?q=${encodeURIComponent(query)}`,
      });
    }
  }
  return results;
}
