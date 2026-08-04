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
  /** Координаты хадиса — чтобы догрузить ПОЛНЫЙ текст при раскрытии
   * (в поисковом индексе лежит только фрагмент на 280 символов). */
  hadithRef?: { c: string; b: number; n: number };
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
  /** Есть ли запрос хотя бы в одном из полей */
  const hit = (...fields: (string | undefined)[]) =>
    fields.some((f) => f && f.toLowerCase().includes(q));

  // 99 имён Аллаха
  for (const name of NAMES_OF_ALLAH) {
    if (results.length >= limit) break;
    if (hit(name.russian, name.transliteration, name.meaning, name.arabic)) {
      results.push({
        title: `${name.russian} (${name.transliteration})`,
        subtitle: `Имя Аллаха №${name.id} · ${name.arabic}`,
        preview: `${name.arabic}\n\n${name.russian} — ${name.transliteration}\n\n${name.meaning}`,
        category: "99 имён",
        icon: "✨",
        path: `/names?id=${name.id}`,
      });
    }
  }

  // Дуа
  for (const dua of DUA_DATA) {
    if (results.length >= limit) break;
    if (hit(dua.translation, dua.situation, dua.transcription, dua.category)) {
      results.push({
        title: dua.situation || dua.translation.slice(0, 60),
        subtitle: `Дуа · ${dua.source}`,
        preview: `${dua.arabic}\n\n${dua.transcription}\n\n${dua.translation}\n\nИсточник: ${dua.source}`,
        category: "Дуа",
        icon: "🤲",
        path: `/dua?id=${dua.id}`,
      });
    }
  }

  // Зикры
  for (const dhikr of DHIKR_DATA) {
    if (results.length >= limit) break;
    if (hit(dhikr.russian, dhikr.transcription, dhikr.reward, dhikr.category)) {
      results.push({
        title: dhikr.russian,
        subtitle: `Зикр · ${dhikr.count} раз · ${dhikr.source}`,
        preview: `${dhikr.arabic}\n\n${dhikr.transcription}\n\n${dhikr.russian}\n\nПовторений: ${dhikr.count}\n\n${dhikr.reward}\n\nИсточник: ${dhikr.source}`,
        category: "Зикры",
        icon: "📿",
        path: "/dhikr",
      });
    }
  }

  // Истории — ищем и по полному тексту
  for (const story of STORIES) {
    if (results.length >= limit) break;
    if (hit(story.title, story.subtitle, story.content)) {
      results.push({
        title: story.title,
        subtitle: `История · ${story.source}`,
        preview: `${story.subtitle}\n\n${story.content}\n\nИсточник: ${story.source} (${story.reliability})`,
        category: "Истории",
        icon: story.icon,
        path: `/stories?id=${story.id}`,
      });
    }
  }

  // Пророки — ищем и по полному жизнеописанию
  for (const prophet of PROPHETS) {
    if (results.length >= limit) break;
    if (hit(prophet.name, prophet.title, prophet.summary, prophet.content)) {
      const lessons = (prophet.lessons || []).map((l) => `• ${l}`).join("\n");
      results.push({
        title: `${prophet.name} — ${prophet.title}`,
        subtitle: `Пророк · ${prophet.quranicRef}`,
        preview: `${prophet.summary}\n\n${prophet.content}${
          lessons ? `\n\nУроки:\n${lessons}` : ""
        }\n\nВ Коране: ${prophet.quranicRef}`,
        category: "Пророки",
        icon: "📖",
        path: `/prophets?id=${prophet.id}`,
      });
    }
  }

  // Сира — ищем и по основному, и по расширенному тексту
  for (const chapter of SEERAH_CHAPTERS) {
    if (results.length >= limit) break;
    if (hit(chapter.title, chapter.summary, chapter.content, chapter.extended)) {
      const events = (chapter.keyEvents || []).map((e) => `• ${e}`).join("\n");
      results.push({
        title: chapter.title,
        subtitle: `Сира · ${chapter.year} · ${chapter.location}`,
        preview: `${chapter.quote ? `«${chapter.quote}»\n\n` : ""}${chapter.summary}\n\n${chapter.content}\n\n${chapter.extended}${
          events ? `\n\nКлючевые события:\n${events}` : ""
        }`,
        category: "Сира",
        icon: "🌙",
        path: `/seerah?id=${chapter.id}`,
      });
    }
  }

  // Намаз-гайд — ищем и по шагам
  for (const section of NAMAZ_GUIDE_SECTIONS) {
    if (results.length >= limit) break;
    const steps = (section.steps || []) as { title?: string; text?: string }[];
    const stepsText = steps
      .map((st) => `• ${st.title ?? ""}${st.text ? `\n  ${st.text}` : ""}`)
      .join("\n\n");
    if (hit(section.title, section.summary, stepsText)) {
      results.push({
        title: section.title,
        subtitle: "Руководство по намазу",
        preview: `${section.summary}\n\n${stepsText}`,
        category: "Намаз",
        icon: "🕌",
        path: "/namaz-guide",
      });
    }
  }

  // Новичкам — ищем и по шагам
  for (const section of BEGINNER_SECTIONS) {
    if (results.length >= limit) break;
    const steps = (section.steps || []) as {
      title?: string;
      description?: string;
    }[];
    const stepsText = steps
      .map(
        (st) => `• ${st.title ?? ""}${st.description ? `\n  ${st.description}` : ""}`,
      )
      .join("\n\n");
    if (hit(section.title, section.summary, stepsText)) {
      results.push({
        title: section.title,
        subtitle: `Новичкам · ${section.source}`,
        preview: `${section.summary}\n\n${stepsText}\n\nИсточник: ${section.source}`,
        category: "Новичкам",
        icon: "🌟",
        path: "/beginners",
      });
    }
  }

  // Глоссарий
  for (const item of GLOSSARY) {
    if (results.length >= limit) break;
    if (hit(item.term, item.meaning)) {
      results.push({
        title: item.term,
        subtitle: "Термин",
        preview: `${item.term} — ${item.meaning}`,
        category: "Словарь",
        icon: "📚",
        path: "/guide",
      });
    }
  }

  // Функции приложения
  for (const feature of APP_FEATURES) {
    if (results.length >= limit) break;
    if (hit(feature.name, feature.description, feature.group)) {
      results.push({
        title: feature.name,
        subtitle: `Раздел приложения · ${feature.group}`,
        preview: `${feature.name}\n\n${feature.description}`,
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
        hadithRef: { c: h.c, b: h.b, n: h.n },
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

// ---------------------------------------------------------------------------
// Полный текст хадиса по требованию — индекс хранит лишь фрагмент (280 симв.),
// а книга целиком весит немного и кэшируется на сессию.
// ---------------------------------------------------------------------------

const hadithBookCache = new Map<string, Promise<Record<string, unknown>[]>>();

export async function loadFullHadith(ref: {
  c: string;
  b: number;
  n: number;
}): Promise<string | null> {
  const key = `${ref.c}/${ref.b}`;
  if (!hadithBookCache.has(key)) {
    hadithBookCache.set(
      key,
      fetch(`${import.meta.env.BASE_URL}data/hadiths/${key}.json`)
        .then((r) => r.json())
        .catch(() => []),
    );
  }
  const book = await hadithBookCache.get(key)!;
  // В книгах поля называются ru / ar / g (не t — так только в поисковом индексе)
  const found = book.find((h) => (h as { n?: number }).n === ref.n) as
    | { ru?: string; ar?: string; g?: string }
    | undefined;
  if (!found?.ru) return null;
  const grade =
    found.g === "sahih"
      ? "достоверный /сахих/"
      : found.g === "hasan"
        ? "хороший /хасан/"
        : found.g === "daif"
          ? "слабый /даиф/"
          : null;
  return [
    found.ar?.trim() || null,
    found.ru,
    grade ? `Степень: ${grade}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}
