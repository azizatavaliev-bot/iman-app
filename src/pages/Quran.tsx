import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  BookmarkPlus,
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Loader2,
  Play,
  Pause,
  Square,
  Volume2,
  X,
  Mic2,
  Check,
  PenLine,
  Trash2,
  Share2,
  Headphones,
} from "lucide-react";
import {
  getSurahList,
  getSurah,
  getSurahTranslation,
  getReciters,
  getReciterAudioUrl,
  POPULAR_RECITERS,
  hapticSelection,
  hapticImpact,
} from "../lib/api";
import { storage, POINTS } from "../lib/storage";
import { scheduleSyncPush } from "../lib/sync";
import { useAudio } from "../components/AudioPlayer";
import { getTafsir, TAFSIR_SOURCE } from "../data/tafsir";
import {
  getTransliteration,
  hasTransliteration,
} from "../data/quran-transliteration";
import ShareCard from "../components/ShareCard";
import { reciterRuName, reciterRuInfo } from "../data/reciters-ru";
import { getSurahInfo } from "../data/surah-info";
import { ReadingTimerBar } from "../components/ReadingTimer";
import {
  TOTAL_AYAHS,
  TOTAL_SURAHS,
  sumAyahsForSurahs,
} from "../data/surah-ayah-counts";
import type { Surah, SurahDetail, Reciter } from "../lib/api";
import type { QuranBookmark } from "../lib/storage";

// ---- Merged ayah type ----

interface MergedAyah {
  numberInSurah: number;
  globalNumber: number;
  arabic: string;
  translation: string;
}

// ---- Audio state ----

interface AudioState {
  isPlaying: boolean;
  currentAyahIndex: number;
  surahNumber: number;
  surahName: string;
  totalAyahs: number;
  mode: "single" | "surah";
}

// ---- Russian surah names ----

const SURAH_NAMES_RU: Record<number, string> = {
  1: "Открывающая",
  2: "Корова",
  3: "Семейство Имрана",
  4: "Женщины",
  5: "Трапеза",
  6: "Скот",
  7: "Преграды",
  8: "Трофеи",
  9: "Покаяние",
  10: "Юнус",
  11: "Худ",
  12: "Юсуф",
  13: "Гром",
  14: "Ибрахим",
  15: "Аль-Хиджр",
  16: "Пчёлы",
  17: "Ночной перенос",
  18: "Пещера",
  19: "Марьям",
  20: "Та Ха",
  21: "Пророки",
  22: "Хадж",
  23: "Верующие",
  24: "Свет",
  25: "Различение",
  26: "Поэты",
  27: "Муравьи",
  28: "Рассказ",
  29: "Паук",
  30: "Римляне",
  31: "Лукман",
  32: "Поклон",
  33: "Союзники",
  34: "Саба",
  35: "Творец",
  36: "Йа Син",
  37: "Стоящие в ряд",
  38: "Сад",
  39: "Толпы",
  40: "Прощающий",
  41: "Разъяснены",
  42: "Совет",
  43: "Украшения",
  44: "Дым",
  45: "Коленопреклонённая",
  46: "Барханы",
  47: "Мухаммад",
  48: "Победа",
  49: "Комнаты",
  50: "Каф",
  51: "Рассеивающие",
  52: "Гора",
  53: "Звезда",
  54: "Месяц",
  55: "Милостивый",
  56: "Событие",
  57: "Железо",
  58: "Препирающаяся",
  59: "Сбор",
  60: "Испытуемая",
  61: "Ряд",
  62: "Пятница",
  63: "Лицемеры",
  64: "Взаимное обделение",
  65: "Развод",
  66: "Запрещение",
  67: "Власть",
  68: "Письменная трость",
  69: "Неизбежное",
  70: "Ступени",
  71: "Нух",
  72: "Джинны",
  73: "Закутавшийся",
  74: "Завернувшийся",
  75: "Воскресение",
  76: "Человек",
  77: "Посылаемые",
  78: "Весть",
  79: "Вырывающие",
  80: "Нахмурился",
  81: "Скручивание",
  82: "Раскалывание",
  83: "Обвешивающие",
  84: "Разверзнётся",
  85: "Созвездия",
  86: "Ночной путник",
  87: "Высочайший",
  88: "Покрывающее",
  89: "Заря",
  90: "Город",
  91: "Солнце",
  92: "Ночь",
  93: "Утро",
  94: "Раскрытие",
  95: "Смоковница",
  96: "Сгусток",
  97: "Предопределение",
  98: "Ясное знамение",
  99: "Землетрясение",
  100: "Скачущие",
  101: "Великое бедствие",
  102: "Приумножение",
  103: "Время",
  104: "Хулитель",
  105: "Слон",
  106: "Курайш",
  107: "Мелочь",
  108: "Изобилие",
  109: "Неверующие",
  110: "Помощь",
  111: "Пальмовые волокна",
  112: "Искренность",
  113: "Рассвет",
  114: "Люди",
};

// ---- Bismillah ----

const BISMILLAH = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

// ---- Очистка вшитой басмалы из аята 1 ----
// API (quran-uthmani) возвращает у аята №1 большинства сур басмалу,
// приклеенную к началу реального текста аята. Перевод/транскрипция её НЕ
// содержат, а сама басмала уже отрисована отдельным заголовком суры.
// Убираем префикс-басмалу у аята 1, КРОМЕ:
//   • суры 1 (Аль-Фатиха) — там басмала является законным аятом 1;
//   • суры 9 (Ат-Тауба) — там басмалы нет вовсе.
// Возможные варианты огласовки/алифа (ٱ alef wasla vs ا) — перечислены.
const BASMALA_PREFIXES = [
  "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِۦ",
];

function cleanAyahArabic(
  text: string,
  surahNum: number,
  numberInSurah: number,
): string {
  // BOM и ведущие пробелы убираем всегда
  let t = text.replace(/^﻿/, "").trimStart();
  if (numberInSurah === 1 && surahNum !== 1 && surahNum !== 9) {
    for (const p of BASMALA_PREFIXES) {
      if (t.startsWith(p)) {
        t = t.slice(p.length).trimStart();
        break;
      }
    }
  }
  return t.trim();
}

// Рендер **жирного** текста в фактах о суре
function renderFactText(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="text-emerald-300 font-semibold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      p
    ),
  );
}

// ---- Audio URL helper ----

function getAyahAudioUrl(globalNumber: number): string {
  return `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNumber}.mp3`;
}

// ---- Reciter storage helpers ----

interface SavedReciter {
  id: number;
  name: string;
  server: string;
  moshafId: number;
  surahTotal: number;
  surahList: number[];
}

const RECITER_STORAGE_KEY = "iman_selected_reciter";

const DEFAULT_RECITER: SavedReciter = {
  id: 123, // актуальный id Аль-Афаси в mp3quran v3
  name: "Мишари Рашид аль-Афаси",
  server: "https://server8.mp3quran.net/afs/", // сервер Аль-Афаси (аудио корректно)
  moshafId: 123,
  surahTotal: 114,
  surahList: Array.from({ length: 114 }, (_, i) => i + 1),
};

function loadSavedReciter(): SavedReciter {
  try {
    const raw = localStorage.getItem(RECITER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Старый кэш хранил арабское имя — сбрасываем на дефолт, чтобы имя
      // отображалось по-русски (список теперь language=ru).
      const hasArabic = /[؀-ۿ]/.test(parsed?.name || "");
      if (parsed && parsed.id && parsed.name && parsed.server && !hasArabic) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_RECITER;
}

function saveReciter(reciter: SavedReciter): void {
  try {
    localStorage.setItem(RECITER_STORAGE_KEY, JSON.stringify(reciter));
  } catch {
    // ignore
  }
}

// ---- Component ----

export default function Quran() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // --- State ---
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [ayahs, setAyahs] = useState<MergedAyah[]>([]);
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>([]);
  const [readSurahs, setReadSurahs] = useState<number[]>([]);
  const [expandedTafsirs, setExpandedTafsirs] = useState<Set<number>>(new Set());

  // --- Режим чтения Корана: "scroll" (лента) или "book" (по одному аяту) ---
  const QURAN_MODE_KEY = "iman_quran_mode";
  const [quranMode, setQuranMode] = useState<"scroll" | "book">(
    () => (localStorage.getItem(QURAN_MODE_KEY) as "scroll" | "book") || "scroll",
  );
  const [bookAyahIdx, setBookAyahIdx] = useState(0); // индекс текущего аята в книжном режиме
  const [showSurahInfo, setShowSurahInfo] = useState(false); // карточка «О суре»
  const [speaking, setSpeaking] = useState(false); // озвучка перевода (TTS)
  const [flipDir, setFlipDir] = useState<"next" | "prev">("next"); // направление перелистывания

  // Озвучка перевода на русском через синтез речи браузера (работает оффлайн).
  // В книжном режиме читает текущий аят, в ленте — всю суру подряд.
  function speakTranslation() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const text =
      quranMode === "book"
        ? ayahs[bookAyahIdx]?.translation || ""
        : ayahs.map((a) => a.translation).join(". ");
    if (!text.trim()) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ru-RU";
    u.rate = 0.95;
    const ruVoice = synth
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith("ru"));
    if (ruVoice) u.voice = ruVoice;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  }

  // Останавливаем озвучку при уходе со страницы/смене суры
  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function setQuranModePersist(m: "scroll" | "book") {
    hapticImpact("light");
    setQuranMode(m);
    localStorage.setItem(QURAN_MODE_KEY, m);
  }

  // --- Позиция чтения: где пользователь остановился (сура + аят) ---
  const LAST_POS_KEY = "iman_quran_last_pos";
  const [lastPos, setLastPos] = useState<{ surah: number; ayah: number } | null>(
    () => {
      try {
        const r = localStorage.getItem(LAST_POS_KEY);
        return r ? JSON.parse(r) : null;
      } catch {
        return null;
      }
    },
  );
  // Аят, к которому нужно проскроллить после открытия суры (для "продолжить")
  const pendingScrollAyah = useRef<number | null>(null);
  const quranTouchX = useRef<number | null>(null); // свайп в книжном режиме

  function saveLastPos(surah: number, ayah: number) {
    setLastPos((prev) => {
      if (prev && prev.surah === surah && prev.ayah === ayah) return prev;
      const pos = { surah, ayah };
      try {
        localStorage.setItem(LAST_POS_KEY, JSON.stringify(pos));
      } catch {
        /* ignore */
      }
      return pos;
    });
  }

  // Переход по страницам в книжном режиме (+ запоминание позиции)
  function goToBookAyah(idx: number) {
    const clamped = Math.max(0, Math.min(ayahs.length - 1, idx));
    if (clamped !== bookAyahIdx) setFlipDir(clamped > bookAyahIdx ? "next" : "prev");
    setBookAyahIdx(clamped);
    const a = ayahs[clamped];
    if (a && selectedSurah != null) saveLastPos(selectedSurah, a.numberInSurah);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // --- Share state ---
  const [shareAyah, setShareAyah] = useState<{
    arabic: string;
    text: string;
    surah: string;
  } | null>(null);

  // --- Notes state ---
  const NOTES_KEY = "iman_quran_notes";
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [editingNote, setEditingNote] = useState<string | null>(null); // "surah:ayah" key
  const [noteText, setNoteText] = useState("");

  function noteKey(surah: number, ayah: number) {
    return `${surah}:${ayah}`;
  }

  function saveNote(surah: number, ayah: number, text: string) {
    const key = noteKey(surah, ayah);
    const updated = { ...notes };
    if (text.trim()) {
      updated[key] = text.trim();
    } else {
      delete updated[key];
    }
    setNotes(updated);
    localStorage.setItem(NOTES_KEY, JSON.stringify(updated));
    scheduleSyncPush();
    setEditingNote(null);
    setNoteText("");
  }

  function deleteNote(surah: number, ayah: number) {
    const key = noteKey(surah, ayah);
    const updated = { ...notes };
    delete updated[key];
    setNotes(updated);
    localStorage.setItem(NOTES_KEY, JSON.stringify(updated));
    scheduleSyncPush();
  }

  // --- Reciter state ---
  const [selectedReciter, setSelectedReciter] =
    useState<SavedReciter>(loadSavedReciter);
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [allReciters, setAllReciters] = useState<Reciter[]>([]);
  const [recitersLoading, setRecitersLoading] = useState(false);
  const [reciterSearch, setReciterSearch] = useState("");

  // --- Global audio player ---
  const globalAudio = useAudio();

  // --- Audio state ---
  const [audioState, setAudioState] = useState<AudioState | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Предзагрузчик следующего аята — для бесшовного перехода без пауз
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  function preloadAyah(globalNumber: number | undefined) {
    if (globalNumber == null) return;
    try {
      if (!preloadRef.current) preloadRef.current = new Audio();
      preloadRef.current.preload = "auto";
      preloadRef.current.src = getAyahAudioUrl(globalNumber);
      preloadRef.current.load(); // прогреваем кэш браузера
    } catch {
      /* ignore */
    }
  }
  const ayahRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // --- Load surah list + bookmarks ---
  useEffect(() => {
    async function load() {
      try {
        const list = await getSurahList();
        setSurahs(list);
      } catch (err) {
        console.warn("Surah list offline:", err instanceof Error ? err.message : err);
      } finally {
        setLoading(false);
      }
    }
    load();
    setBookmarks(storage.getQuranBookmarks());
    try {
      const raw = localStorage.getItem("iman_quran_read_surahs");
      setReadSurahs(raw ? (JSON.parse(raw) as number[]) : []);
    } catch {
      setReadSurahs([]);
    }
  }, []);

  // --- Create audio element once (no crossOrigin — breaks iOS WKWebView/Telegram) ---
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
      if (preloadRef.current) {
        preloadRef.current.src = "";
        preloadRef.current = null;
      }
    };
  }, []);

  // --- Play a single ayah ---
  const playSingleAyah = useCallback(
    (ayahIndex: number) => {
      if (!audioRef.current || ayahs.length === 0) return;

      const ayah = ayahs[ayahIndex];
      if (!ayah) return;

      const audio = audioRef.current;
      audio.pause();
      audio.src = getAyahAudioUrl(ayah.globalNumber);

      setAudioState({
        isPlaying: true,
        currentAyahIndex: ayahIndex,
        surahNumber: selectedSurah!,
        surahName:
          SURAH_NAMES_RU[selectedSurah!] || surahDetail?.englishName || "",
        totalAyahs: ayahs.length,
        mode: "single",
      });

      setAudioLoading(true);

      audio.oncanplay = () => {
        setAudioLoading(false);
      };

      audio.onended = () => {
        setAudioState((prev) => (prev ? { ...prev, isPlaying: false } : null));
      };

      audio.ontimeupdate = () => {
        setAudioProgress(audio.currentTime);
      };

      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration);
      };

      audio.onerror = () => {
        setAudioLoading(false);
        setAudioState((prev) => (prev ? { ...prev, isPlaying: false } : null));
      };

      audio.play().catch(() => {
        setAudioLoading(false);
      });
    },
    [ayahs, selectedSurah, surahDetail],
  );

  // --- Play all ayahs sequentially ---
  const playAllAyahs = useCallback(
    (startIndex = 0) => {
      if (!audioRef.current || ayahs.length === 0) return;

      const audio = audioRef.current;
      audio.pause();

      const ayah = ayahs[startIndex];
      if (!ayah) return;

      audio.src = getAyahAudioUrl(ayah.globalNumber);

      setAudioState({
        isPlaying: true,
        currentAyahIndex: startIndex,
        surahNumber: selectedSurah!,
        surahName:
          SURAH_NAMES_RU[selectedSurah!] || surahDetail?.englishName || "",
        totalAyahs: ayahs.length,
        mode: "surah",
      });

      // Scroll to current ayah
      const ref = ayahRefs.current.get(startIndex);
      if (ref) {
        ref.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      setAudioLoading(true);

      audio.oncanplay = () => {
        setAudioLoading(false);
        // Как только текущий готов — предзагружаем следующий (бесшовность)
        preloadAyah(ayahs[startIndex + 1]?.globalNumber);
      };

      audio.onended = () => {
        const nextIndex = startIndex + 1;
        if (nextIndex < ayahs.length) {
          playAllAyahs(nextIndex);
        } else {
          // Finished entire surah
          setAudioState((prev) =>
            prev ? { ...prev, isPlaying: false } : null,
          );
        }
      };

      audio.ontimeupdate = () => {
        setAudioProgress(audio.currentTime);
      };

      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration);
      };

      audio.onerror = () => {
        setAudioLoading(false);
        setAudioState((prev) => (prev ? { ...prev, isPlaying: false } : null));
      };

      audio.play().catch(() => {
        setAudioLoading(false);
      });
    },
    [ayahs, selectedSurah, surahDetail],
  );

  // --- Toggle play/pause ---
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !audioState) return;

    const audio = audioRef.current;

    if (audioState.isPlaying) {
      audio.pause();
      setAudioState((prev) => (prev ? { ...prev, isPlaying: false } : null));
    } else {
      audio.play().catch(console.error);
      setAudioState((prev) => (prev ? { ...prev, isPlaying: true } : null));
    }
  }, [audioState]);

  // --- Stop playback ---
  const stopPlayback = useCallback(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    audio.pause();
    audio.src = "";
    audio.onended = null;
    audio.ontimeupdate = null;
    audio.onloadedmetadata = null;
    audio.oncanplay = null;
    audio.onerror = null;
    setAudioState(null);
    setAudioProgress(0);
    setAudioDuration(0);
    setAudioLoading(false);
  }, []);

  // --- Scroll to top when surah opens ---
  useEffect(() => {
    if (selectedSurah !== null) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [selectedSurah]);

  // --- Auto-scroll when playing ayah changes ---
  useEffect(() => {
    if (audioState?.isPlaying && audioState.mode === "surah") {
      const ref = ayahRefs.current.get(audioState.currentAyahIndex);
      if (ref) {
        ref.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [audioState?.currentAyahIndex, audioState?.isPlaying, audioState?.mode]);

  // --- Track read surahs for points ---
  const QURAN_READ_KEY = "iman_quran_read_surahs";

  function getReadSurahs(): number[] {
    try {
      const raw = localStorage.getItem(QURAN_READ_KEY);
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  }

  function markSurahRead(num: number): boolean {
    const read = getReadSurahs();
    if (read.includes(num)) return false;
    read.push(num);
    localStorage.setItem(QURAN_READ_KEY, JSON.stringify(read));
    setReadSurahs(read);
    scheduleSyncPush();
    return true;
  }

  // Явная отметка ТЕКУЩЕЙ открытой суры прочитанной (по действию пользователя).
  // Привязка строго к selectedSurah — исключает мис-атрибуцию другой суре.
  function markCurrentSurahRead() {
    if (selectedSurah == null) return;
    if (markSurahRead(selectedSurah)) {
      storage.addExtraPoints(POINTS.QURAN);
      hapticImpact("medium");
    }
  }

  const isCurrentSurahRead =
    selectedSurah != null && readSurahs.includes(selectedSurah);

  // --- Open surah (targetAyah — аят, к которому проскроллить, для "продолжить") ---
  async function openSurah(num: number, targetAyah?: number) {
    // Stop any playing audio when switching surah
    stopPlayback();

    pendingScrollAyah.current = targetAyah ?? null;
    setSelectedSurah(num);
    setLoadingAyahs(true);
    setAyahs([]);
    setSurahDetail(null);
    ayahRefs.current.clear();

    try {
      const [arabic, russian] = await Promise.all([
        getSurah(num),
        getSurahTranslation(num),
      ]);

      setSurahDetail(arabic);

      const merged: MergedAyah[] = arabic.ayahs.map((a, i) => ({
        numberInSurah: a.numberInSurah,
        globalNumber: a.number,
        arabic: cleanAyahArabic(a.text, num, a.numberInSurah),
        translation: russian.ayahs[i]?.text || "",
      }));

      setAyahs(merged);
      // По дефолту все тафсиры свёрнуты — раскрываются по тапу
      setExpandedTafsirs(new Set());
      // Синхронизируем страницу книжного режима с целевым аятом
      if (targetAyah != null) {
        const ti = merged.findIndex((a) => a.numberInSurah === targetAyah);
        setBookAyahIdx(ti >= 0 ? ti : 0);
      } else {
        setBookAyahIdx(0);
      }

      // После отрисовки: либо скролл к целевому аяту ("продолжить"), либо наверх
      const target = pendingScrollAyah.current;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (target != null) {
            const idx = merged.findIndex((a) => a.numberInSurah === target);
            const el = idx >= 0 ? ayahRefs.current.get(idx) : null;
            if (el) {
              el.scrollIntoView({ behavior: "instant", block: "start" });
              pendingScrollAyah.current = null;
              return;
            }
          }
          window.scrollTo({ top: 0, behavior: "instant" });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          pendingScrollAyah.current = null;
        }),
      );

      // ВАЖНО: открытие суры НЕ засчитывает её прочитанной и НЕ начисляет
      // саваб. Прогресс растёт только по явному действию пользователя
      // (кнопка «Отметить прочитанной» в конце суры) — см. markCurrentSurahRead.
    } catch (err) {
      console.error("Failed to load surah:", err);
    } finally {
      setLoadingAyahs(false);
    }
  }

  // --- Открытие суры/аята по query-параметрам (?surah=&ayah=) — из «Избранного» ---
  useEffect(() => {
    const s = Number(searchParams.get("surah"));
    const a = Number(searchParams.get("ayah"));
    if (s >= 1 && s <= 114) {
      openSurah(s, a >= 1 ? a : undefined);
      setSearchParams({}, { replace: true }); // очищаем, чтобы не переоткрывать
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Трекинг позиции чтения: следим, какой аят вверху экрана ---
  useEffect(() => {
    if (selectedSurah === null || ayahs.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleIdx = entries
          .filter((e) => e.isIntersecting)
          .map((e) =>
            Number((e.target as HTMLElement).dataset.ayahIdx),
          )
          .filter((n) => !Number.isNaN(n));
        if (visibleIdx.length) {
          const idx = Math.min(...visibleIdx);
          const a = ayahs[idx];
          if (a) saveLastPos(selectedSurah, a.numberInSurah);
        }
      },
      // Узкая полоса у верха экрана = "текущий читаемый аят"
      { rootMargin: "-12% 0px -78% 0px", threshold: 0 },
    );
    // Наблюдаем за отрисованными карточками (после того как refs заполнились)
    const t = setTimeout(() => {
      ayahRefs.current.forEach((el) => observer.observe(el));
    }, 300);
    return () => {
      clearTimeout(t);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSurah, ayahs.length]);

  // --- Bookmark helpers ---
  function isSurahBookmarked(surahNumber: number): boolean {
    return bookmarks.some((b) => b.surahNumber === surahNumber);
  }

  function toggleBookmark(surahNumber: number, ayahNumber: number) {
    const exists = bookmarks.some(
      (b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber,
    );
    if (exists) {
      storage.removeQuranBookmark(surahNumber, ayahNumber);
    } else {
      storage.addQuranBookmark(surahNumber, ayahNumber);
    }
    setBookmarks(storage.getQuranBookmarks());
  }

  function isAyahBookmarked(surahNumber: number, ayahNumber: number): boolean {
    return bookmarks.some(
      (b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber,
    );
  }

  // --- Back to list ---
  function goBack() {
    stopPlayback();
    setSelectedSurah(null);
    setAyahs([]);
    setSurahDetail(null);
    setExpandedTafsirs(new Set());
    ayahRefs.current.clear();
  }

  // --- Reciter modal ---
  async function openReciterModal() {
    setShowReciterModal(true);
    setReciterSearch("");
    if (allReciters.length === 0 && !recitersLoading) {
      setRecitersLoading(true);
      try {
        const list = await getReciters();
        setAllReciters(list);
      } catch (err) {
        console.error("Failed to load reciters:", err);
      } finally {
        setRecitersLoading(false);
      }
    }
  }

  function selectReciter(reciter: Reciter) {
    const saved: SavedReciter = {
      id: reciter.id,
      name: reciter.name,
      server: reciter.server,
      moshafId: reciter.moshafId,
      surahTotal: reciter.surahTotal,
      surahList: reciter.surahList,
    };
    setSelectedReciter(saved);
    saveReciter(saved);
    hapticSelection();
    setShowReciterModal(false);
  }

  function selectPopularReciter(popularId: number) {
    // If we already have the full list, find the reciter there
    const found = allReciters.find((r) => r.id === popularId);
    if (found) {
      selectReciter(found);
      return;
    }
    // Otherwise, load the list and find it
    if (!recitersLoading) {
      setRecitersLoading(true);
      getReciters()
        .then((list) => {
          setAllReciters(list);
          const reciter = list.find((r) => r.id === popularId);
          if (reciter) {
            selectReciter(reciter);
          }
        })
        .catch(console.error)
        .finally(() => setRecitersLoading(false));
    }
  }

  // Helper to get audio URL for current reciter + surah
  function getReciterSurahUrl(surahNumber: number): string {
    return getReciterAudioUrl(selectedReciter as Reciter, surahNumber);
  }

  // Filtered reciters for the modal search — по русскому и арабскому имени
  const filteredReciters = reciterSearch.trim()
    ? allReciters.filter((r) => {
        const q = reciterSearch.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          reciterRuName(r.id, r.name).toLowerCase().includes(q)
        );
      })
    : allReciters;

  // --- Filtered surahs ---
  const filtered = surahs.filter((s) => {
    const raw = search.trim();
    if (!raw) return true;
    const q = raw.toLowerCase();
    const ruName = SURAH_NAMES_RU[s.number] || "";
    // Чисто числовой запрос → сопоставляем по номеру точным ИЛИ префиксным
    // совпадением. Иначе "2" совпадал бы со всеми сурами, содержащими цифру 2
    // (2, 12, 20…112) и список почти не фильтровался.
    if (/^\d+$/.test(raw)) {
      const num = String(s.number);
      return num === raw || num.startsWith(raw);
    }
    return (
      s.name.includes(search) ||
      s.englishName.toLowerCase().includes(q) ||
      s.englishNameTranslation.toLowerCase().includes(q) ||
      ruName.toLowerCase().includes(q)
    );
  });

  // --- Format time helper ---
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // ============================
  // RECITER SELECTOR MODAL
  // ============================
  const renderReciterModal = () => {
    if (!showReciterModal) return null;

    return (
      <div className="fixed inset-0 z-[80] flex flex-col justify-end">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowReciterModal(false)}
        />

        {/* Modal sheet */}
        <div
          className="relative z-10 glass t-bg-el backdrop-blur-xl
                     rounded-t-3xl border-t t-border-s
                     max-h-[85vh] flex flex-col
                     animate-slide-up"
          style={{
            animation: "slideUp 0.3s ease-out",
          }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3">
            <div>
              <h2 className="text-white text-lg font-semibold">Выбор чтеца</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Текущий: {reciterRuName(selectedReciter.id, selectedReciter.name)}
              </p>
            </div>
            <button
              onClick={() => setShowReciterModal(false)}
              className="flex items-center justify-center w-9 h-9 rounded-full
                         t-bg hover:t-bg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Search bar */}
          <div className="px-5 pb-3">
            <div className="glass-card flex items-center gap-3 px-4 py-2.5">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Поиск чтеца..."
                value={reciterSearch}
                onChange={(e) => setReciterSearch(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500
                           outline-none"
              />
              {reciterSearch && (
                <button
                  onClick={() => setReciterSearch("")}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 pb-8 overscroll-contain">
            {/* Popular section (only when not searching) */}
            {!reciterSearch.trim() && (
              <div className="mb-5">
                <h3 className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
                  Популярные чтецы
                </h3>
                <div className="space-y-1.5">
                  {POPULAR_RECITERS.map((pr) => {
                    const isSelected = selectedReciter.id === pr.id;
                    return (
                      <button
                        key={pr.id}
                        onClick={() => selectPopularReciter(pr.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl
                                    transition-all duration-150 text-left
                                    ${
                                      isSelected
                                        ? "bg-emerald-500/15 border border-emerald-500/30"
                                        : "bg-white/[0.03] border border-transparent hover:bg-white/[0.06]"
                                    }`}
                      >
                        <div
                          className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0
                                      ${isSelected ? "bg-emerald-500/20" : "t-bg"}`}
                        >
                          <Mic2
                            className={`w-4 h-4 ${isSelected ? "text-emerald-400" : "text-slate-400"}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-semibold truncate ${
                              isSelected ? "text-emerald-300" : "text-white"
                            }`}
                          >
                            {reciterRuName(pr.id, pr.name)}
                          </p>
                          {reciterRuInfo(pr.id) && (
                            <p className="text-[11px] text-slate-500 truncate">
                              {reciterRuInfo(pr.id)!.country} ·{" "}
                              {reciterRuInfo(pr.id)!.bio}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All reciters section */}
            <div>
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
                {reciterSearch.trim()
                  ? `Результаты (${filteredReciters.length})`
                  : "Все чтецы"}
              </h3>

              {recitersLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-slate-400 text-sm">Загрузка списка...</p>
                </div>
              )}

              {!recitersLoading && filteredReciters.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-500 text-sm">
                    {reciterSearch.trim()
                      ? "Ничего не найдено"
                      : "Не удалось загрузить список чтецов"}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                {filteredReciters.map((reciter) => {
                  const isSelected = selectedReciter.id === reciter.id;
                  const hasSurah = selectedSurah
                    ? reciter.surahList.includes(selectedSurah)
                    : true;

                  return (
                    <button
                      key={reciter.id}
                      onClick={() => selectReciter(reciter)}
                      disabled={!hasSurah}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
                                  transition-all duration-150 text-left
                                  ${
                                    !hasSurah
                                      ? "opacity-40 cursor-not-allowed"
                                      : isSelected
                                        ? "bg-emerald-500/15 border border-emerald-500/30"
                                        : "bg-white/[0.02] border border-transparent hover:bg-white/[0.05]"
                                  }`}
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0
                                    ${isSelected ? "bg-emerald-500/20" : "t-bg"}`}
                      >
                        <span
                          className={`text-xs font-bold ${isSelected ? "text-emerald-400" : "text-slate-500"}`}
                        >
                          {reciter.letter}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold truncate ${
                            isSelected ? "text-emerald-300" : "text-white/90"
                          }`}
                        >
                          {reciterRuName(reciter.id, reciter.name)}
                        </p>
                        <p className="text-slate-500 text-[11px] truncate">
                          {reciterRuInfo(reciter.id)?.country
                            ? `${reciterRuInfo(reciter.id)!.country} · `
                            : ""}
                          {reciter.surahTotal} сур
                          {!hasSurah && " — нет этой суры"}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* CSS animation */}
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  };

  // ============================
  // AUDIO PLAYER BAR (fixed bottom)
  // ============================
  const renderAudioPlayerBar = () => {
    if (!audioState) return null;

    const progressPercent =
      audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0;

    return (
      <div className="fixed bottom-16 left-0 right-0 z-50">
        {/* Progress bar (thin line at top of player) */}
        <div className="w-full h-1 t-bg">
          <div
            className="h-full bg-emerald-500 transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="glass t-bg-el backdrop-blur-xl border-t t-border px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Audio icon */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/15 shrink-0">
              <Volume2 className="w-5 h-5 text-emerald-400" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {audioState.surahName}
              </p>
              <p className="text-slate-400 text-xs">
                {audioState.mode === "surah"
                  ? `Аят ${audioState.currentAyahIndex + 1} из ${audioState.totalAyahs}`
                  : `Аят ${audioState.currentAyahIndex + 1}`}
                {audioDuration > 0 && (
                  <span className="ml-2">
                    {formatTime(audioProgress)} / {formatTime(audioDuration)}
                  </span>
                )}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Play/Pause */}
              <button
                onClick={togglePlayPause}
                className="flex items-center justify-center w-10 h-10 rounded-full
                           bg-emerald-500/20 hover:bg-emerald-500/30 transition-colors"
              >
                {audioState.isPlaying ? (
                  <Pause className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Play className="w-5 h-5 text-emerald-400 ml-0.5" />
                )}
              </button>

              {/* Stop */}
              <button
                onClick={stopPlayback}
                className="flex items-center justify-center w-10 h-10 rounded-full
                           hover:t-bg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================
  // VIEW 2 - Surah Detail
  // ============================
  if (selectedSurah !== null) {
    const showBismillah = selectedSurah !== 1 && selectedSurah !== 9;

    return (
      <div className="min-h-screen pb-24" style={{ overflowAnchor: "none" }}>
        {/* Header */}
        <div className="sticky top-0 z-10 glass px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="flex items-center justify-center w-10 h-10 rounded-full
                         t-bg hover:t-bg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-300" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-white truncate">
                {surahDetail?.englishName || `Surah ${selectedSurah}`}
              </h1>
              <p className="text-xs text-slate-400">
                {SURAH_NAMES_RU[selectedSurah] || ""} &middot;{" "}
                {surahDetail?.numberOfAyahs || "..."} аятов
              </p>
            </div>
            <div className="arabic-text text-emerald-400 text-lg">
              {surahDetail?.name || ""}
            </div>
          </div>

          {/* Переключатель режима чтения */}
          <div className="flex gap-1 mt-2.5 p-0.5 rounded-lg bg-white/[0.04]">
            <button
              onClick={() => setQuranModePersist("scroll")}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                quranMode === "scroll"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-slate-400"
              }`}
            >
              Лента
            </button>
            <button
              onClick={() => setQuranModePersist("book")}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                quranMode === "book"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-slate-400"
              }`}
            >
              Книга
            </button>
          </div>
        </div>

        {/* Loading */}
        {loadingAyahs && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <p className="text-slate-400 text-sm">Загрузка суры...</p>
          </div>
        )}

        {/* Ayahs */}
        {!loadingAyahs && ayahs.length > 0 && (
          <div
            className="px-4 py-6 space-y-6"
            onTouchStart={(e) => {
              if (quranMode === "book") quranTouchX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (quranMode !== "book" || quranTouchX.current === null) return;
              const dx = e.changedTouches[0].clientX - quranTouchX.current;
              if (Math.abs(dx) > 60) {
                if (dx < 0) goToBookAyah(bookAyahIdx + 1);
                else goToBookAyah(bookAyahIdx - 1);
              }
              quranTouchX.current = null;
            }}
          >
            {/* Таймер чтения Корана */}
            <ReadingTimerBar section="Коран" />

            {/* ═══ ВЕРХНИЙ БЛОК: О суре + управление ═══ */}
            {(() => {
              const info = getSurahInfo(
                selectedSurah,
                SURAH_NAMES_RU[selectedSurah] || surahDetail?.englishName || "",
                surahDetail?.revelationType,
              );
              const isMeccan = /mecc/i.test(surahDetail?.revelationType || "");
              const surahPlaying =
                audioState?.isPlaying && audioState.mode === "surah";
              const bgPlaying =
                globalAudio.currentSurah?.number === selectedSurah &&
                globalAudio.isPlaying;
              return (
                <div className="space-y-3">
                  {/* Карточка «О суре» */}
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] to-transparent ring-1 ring-emerald-500/15 overflow-hidden">
                    <button
                      onClick={() => setShowSurahInfo((v) => !v)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold">
                          {info.meaning}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {isMeccan ? "🕋 Мекканская" : "🕌 Мединская"} ·{" "}
                          {surahDetail?.numberOfAyahs || ayahs.length} аятов
                        </p>
                      </div>
                      {showSurahInfo ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {showSurahInfo && (
                      <div className="px-4 pb-3 -mt-1 space-y-3">
                        <p className="text-[13px] text-slate-300 leading-relaxed">
                          {info.about}
                        </p>
                        {info.facts && info.facts.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-amber-400/80 font-bold mb-1.5">
                              ✨ Интересные факты
                            </p>
                            <ul className="space-y-1.5">
                              {info.facts.map((f, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-[12.5px] text-slate-300 leading-relaxed"
                                >
                                  <span className="text-emerald-400/70 shrink-0 mt-0.5">
                                    {i + 1}.
                                  </span>
                                  <span>{renderFactText(f)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Главная кнопка — слушать суру */}
                  <button
                    onClick={() =>
                      surahPlaying ? togglePlayPause() : playAllAyahs(0)
                    }
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl
                               bg-emerald-500/20 ring-1 ring-emerald-400/40 text-emerald-100
                               font-semibold shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition"
                  >
                    {audioLoading && audioState?.mode === "surah" ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : surahPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                    <span>
                      {audioLoading && audioState?.mode === "surah"
                        ? "Загрузка..."
                        : surahPlaying
                          ? `Пауза · аят ${audioState!.currentAyahIndex + 1} из ${audioState!.totalAyahs}`
                          : "Слушать суру"}
                    </span>
                  </button>

                  {/* Сетка действий */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Слушать перевод (озвучка на русском) */}
                    <button
                      onClick={speakTranslation}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ring-1 active:scale-[0.98] transition ${
                        speaking
                          ? "bg-sky-500/25 ring-sky-400/40 text-sky-100"
                          : "bg-sky-500/10 ring-sky-500/20 text-sky-300 hover:bg-sky-500/20"
                      }`}
                    >
                      <Volume2 className="w-4 h-4" />
                      {speaking ? "Стоп перевод" : "Слушать перевод"}
                    </button>

                    {/* Учить суру */}
                    <button
                      onClick={() =>
                        selectedSurah && navigate(`/memorize?surah=${selectedSurah}`)
                      }
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
                                 bg-violet-500/10 ring-1 ring-violet-500/20 text-violet-300 hover:bg-violet-500/20 active:scale-[0.98] transition"
                    >
                      <Headphones className="w-4 h-4" />
                      Учить суру
                    </button>

                    {/* Выбор чтеца (русское имя) */}
                    <button
                      onClick={openReciterModal}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
                                 bg-white/[0.04] ring-1 ring-white/10 text-slate-300 hover:bg-white/[0.08] active:scale-[0.98] transition"
                    >
                      <Mic2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {reciterRuName(selectedReciter.id, selectedReciter.name)}
                      </span>
                    </button>

                    {/* Слушать фоном */}
                    <button
                      onClick={() => {
                        if (bgPlaying) {
                          globalAudio.pause();
                        } else if (surahDetail) {
                          globalAudio.play(
                            selectedSurah,
                            surahDetail.name,
                            SURAH_NAMES_RU[selectedSurah] || surahDetail.englishName,
                            getReciterSurahUrl(selectedSurah),
                          );
                        }
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ring-1 active:scale-[0.98] transition ${
                        bgPlaying
                          ? "bg-amber-500/25 ring-amber-400/40 text-amber-100"
                          : "bg-amber-500/10 ring-amber-500/20 text-amber-300 hover:bg-amber-500/20"
                      }`}
                    >
                      {bgPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                      {bgPlaying ? "Фон играет" : "Слушать фоном"}
                    </button>
                  </div>

                  {/* Тафсиры + стоп */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setExpandedTafsirs(
                          expandedTafsirs.size === ayahs.length
                            ? new Set()
                            : new Set(ayahs.map((a) => a.numberInSurah)),
                        )
                      }
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
                                 bg-purple-500/10 ring-1 ring-purple-500/20 text-purple-300 hover:bg-purple-500/20 active:scale-[0.98] transition"
                    >
                      {expandedTafsirs.size === ayahs.length
                        ? "Свернуть тафсиры"
                        : "Все тафсиры"}
                    </button>
                    {(surahPlaying || audioState?.mode === "surah") && (
                      <button
                        onClick={stopPlayback}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium
                                   bg-red-500/10 ring-1 ring-red-500/20 text-red-300 hover:bg-red-500/20 active:scale-[0.98] transition"
                      >
                        <Square className="w-4 h-4" /> Стоп
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Bismillah */}
            {showBismillah && (
              <div className="text-center py-6">
                <p className="arabic-text text-2xl text-amber-200/90 leading-loose">
                  {BISMILLAH}
                </p>
                <div className="mt-3 mx-auto w-32 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
              </div>
            )}

            {/* Ayah cards */}
            {ayahs.map((ayah, index) => {
              // В книжном режиме показываем только текущий аят
              if (quranMode === "book" && index !== bookAyahIdx) return null;
              const isCurrentlyPlaying =
                audioState?.isPlaying && audioState.currentAyahIndex === index;
              const isCurrentlyLoading =
                audioLoading && audioState?.currentAyahIndex === index;
              const wasPlayed =
                audioState &&
                audioState.mode === "surah" &&
                audioState.currentAyahIndex > index;

              return (
                <div
                  key={quranMode === "book" ? `book-${bookAyahIdx}-${flipDir}` : ayah.numberInSurah}
                  data-ayah-idx={index}
                  ref={(el) => {
                    if (el) ayahRefs.current.set(index, el);
                    else ayahRefs.current.delete(index);
                  }}
                  className={`glass-card p-5 transition-all duration-300 ${
                    quranMode === "book"
                      ? flipDir === "next"
                        ? "animate-page-turn-next"
                        : "animate-page-turn-prev"
                      : "animate-fade-in"
                  } ${
                    isCurrentlyPlaying
                      ? "ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/10"
                      : ""
                  } ${wasPlayed ? "opacity-60" : ""}`}
                >
                  {/* Top row: ayah number + play + share + bookmark */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center justify-center w-9 h-9 rounded-full
                                    border ${
                                      isCurrentlyPlaying
                                        ? "border-emerald-400/60 bg-emerald-500/20"
                                        : "border-emerald-500/30 bg-emerald-500/10"
                                    }`}
                      >
                        <span className="text-emerald-400 text-xs font-bold">
                          {ayah.numberInSurah}
                        </span>
                      </div>

                      {/* Play button for individual ayah */}
                      <button
                        onClick={() => {
                          if (
                            audioState?.isPlaying &&
                            audioState.currentAyahIndex === index
                          ) {
                            togglePlayPause();
                          } else {
                            playSingleAyah(index);
                          }
                        }}
                        className={`flex items-center justify-center w-9 h-9 rounded-full
                                    transition-all duration-200 ${
                                      isCurrentlyPlaying
                                        ? "bg-emerald-500/25 scale-110"
                                        : isCurrentlyLoading
                                          ? "bg-emerald-500/15 animate-pulse"
                                          : "t-bg hover:bg-emerald-500/15"
                                    }`}
                        title={
                          isCurrentlyLoading
                            ? "Загрузка..."
                            : isCurrentlyPlaying
                              ? "Пауза"
                              : "Воспроизвести аят"
                        }
                      >
                        {isCurrentlyLoading ? (
                          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                        ) : isCurrentlyPlaying ? (
                          <Pause className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Play className="w-4 h-4 text-slate-400 hover:text-emerald-400 ml-0.5 transition-colors" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setShareAyah({
                            arabic: ayah.arabic,
                            text: ayah.translation,
                            surah: `${SURAH_NAMES_RU[selectedSurah] || surahDetail?.englishName} : ${ayah.numberInSurah}`,
                          })
                        }
                        className="p-2 rounded-full hover:t-bg transition-colors"
                      >
                        <Share2 className="w-5 h-5 text-slate-500 hover:text-emerald-400 transition-colors" />
                      </button>
                      <button
                        onClick={() =>
                          toggleBookmark(selectedSurah, ayah.numberInSurah)
                        }
                        className="p-2 rounded-full hover:t-bg transition-colors"
                      >
                        {isAyahBookmarked(selectedSurah, ayah.numberInSurah) ? (
                          <Bookmark className="w-5 h-5 text-amber-400 fill-amber-400" />
                        ) : (
                          <BookmarkPlus className="w-5 h-5 text-slate-500 hover:text-amber-400 transition-colors" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Arabic text */}
                  <p className="arabic-text text-xl sm:text-2xl text-amber-50 text-right leading-[2.2] mb-4">
                    {ayah.arabic}
                  </p>

                  {/* Transliteration (cyrillic) - если есть */}
                  {hasTransliteration(selectedSurah, ayah.numberInSurah) && (
                    <div className="mb-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/70">
                          Произношение
                        </span>
                      </div>
                      <p className="text-emerald-200 text-sm leading-relaxed italic">
                        {getTransliteration(selectedSurah, ayah.numberInSurah)}
                      </p>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="w-full h-px t-bg mb-3" />

                  {/* Translation */}
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {ayah.translation}
                  </p>

                  {/* Tafsir button + content — always shown, all 6236 ayahs covered */}
                  <div className="mt-3">
                      <button
                        onClick={() =>
                          setExpandedTafsirs((prev) => {
                            const next = new Set(prev);
                            if (next.has(ayah.numberInSurah)) {
                              next.delete(ayah.numberInSurah);
                            } else {
                              next.add(ayah.numberInSurah);
                            }
                            return next;
                          })
                        }
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          expandedTafsirs.has(ayah.numberInSurah)
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "t-bg text-slate-400 hover:text-purple-300 hover:bg-purple-500/10"
                        }`}
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        Тафсир
                      </button>

                      <div
                        className={`overflow-hidden transition-all duration-500 ease-in-out ${
                          expandedTafsirs.has(ayah.numberInSurah)
                            ? "max-h-[3000px] opacity-100 mt-3"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/80">
                              Толкование
                            </span>
                            <span className="text-[10px] text-purple-400/60 italic">
                              {TAFSIR_SOURCE}
                            </span>
                          </div>
                          {(() => {
                            const t = getTafsir(
                              selectedSurah,
                              ayah.numberInSurah,
                            )?.text;
                            const prev =
                              index > 0
                                ? getTafsir(
                                    selectedSurah,
                                    ayahs[index - 1].numberInSurah,
                                  )?.text
                                : null;
                            // Тафсир Саади нередко комментирует НЕСКОЛЬКО аятов
                            // одним блоком: тогда текст совпадает с предыдущим
                            // аятом. Не выдаём чужой текст как толкование именно
                            // этого аята — честно помечаем, что оно общее.
                            if (t && prev && t === prev) {
                              return (
                                <p className="text-xs text-purple-300/70 italic">
                                  Толкование объединено с предыдущим аятом
                                  (Саади комментирует эти аяты вместе).
                                </p>
                              );
                            }
                            return (
                              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                                {t}
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                  {/* Notes section */}
                  {(() => {
                    const nk = noteKey(selectedSurah, ayah.numberInSurah);
                    const existingNote = notes[nk];
                    const isEditing = editingNote === nk;

                    return (
                      <div className="mt-3">
                        {/* Show existing note */}
                        {existingNote && !isEditing && (
                          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-2">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/70">
                                Заметка
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    setEditingNote(nk);
                                    setNoteText(existingNote);
                                  }}
                                  className="p-1 rounded hover:bg-amber-500/10"
                                >
                                  <PenLine className="w-3 h-3 text-amber-400/60" />
                                </button>
                                <button
                                  onClick={() =>
                                    deleteNote(
                                      selectedSurah,
                                      ayah.numberInSurah,
                                    )
                                  }
                                  className="p-1 rounded hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-3 h-3 text-red-400/60" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-amber-200/80 leading-relaxed">
                              {existingNote}
                            </p>
                          </div>
                        )}

                        {/* Edit/Create note */}
                        {isEditing ? (
                          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/30">
                            <textarea
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder="Ваша заметка к аяту..."
                              className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 resize-none outline-none min-h-[60px]"
                              autoFocus
                            />
                            <div className="flex gap-2 mt-2 justify-end">
                              <button
                                onClick={() => {
                                  setEditingNote(null);
                                  setNoteText("");
                                }}
                                className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:bg-slate-700/50"
                              >
                                Отмена
                              </button>
                              <button
                                onClick={() =>
                                  saveNote(
                                    selectedSurah,
                                    ayah.numberInSurah,
                                    noteText,
                                  )
                                }
                                className="px-3 py-1 rounded-lg text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                              >
                                Сохранить
                              </button>
                            </div>
                          </div>
                        ) : (
                          !existingNote && (
                            <button
                              onClick={() => {
                                setEditingNote(nk);
                                setNoteText("");
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-amber-300 hover:bg-amber-500/10 t-bg transition-all"
                            >
                              <PenLine className="w-3.5 h-3.5" />
                              Заметка
                            </button>
                          )
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}

            {/* Навигация страниц — книжный режим */}
            {quranMode === "book" && ayahs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => goToBookAyah(bookAyahIdx - 1)}
                    disabled={bookAyahIdx === 0}
                    className="flex items-center gap-1 px-4 py-2.5 rounded-xl glass-card text-sm font-medium text-slate-300 disabled:opacity-30 active:scale-95 transition"
                  >
                    <ChevronLeft className="w-4 h-4" /> Пред.
                  </button>
                  <span className="text-xs text-slate-400 tabular-nums">
                    Аят {ayahs[bookAyahIdx]?.numberInSurah} / {ayahs.length}
                  </span>
                  <button
                    onClick={() => goToBookAyah(bookAyahIdx + 1)}
                    disabled={bookAyahIdx >= ayahs.length - 1}
                    className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-200 text-sm font-semibold ring-1 ring-emerald-400/40 disabled:opacity-30 active:scale-95 transition"
                  >
                    След. <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {bookAyahIdx >= ayahs.length - 1 && (
                  <div className="text-center pt-1">
                    <p className="text-slate-500 text-xs mb-2">
                      Конец суры &laquo;
                      {SURAH_NAMES_RU[selectedSurah] || surahDetail?.englishName}
                      &raquo;
                    </p>
                    {isCurrentSurahRead ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                        <Check className="w-4 h-4" /> Сура отмечена прочитанной
                      </span>
                    ) : (
                      <button
                        onClick={markCurrentSurahRead}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-200 text-sm font-semibold ring-1 ring-emerald-400/40 active:scale-95 transition"
                      >
                        <Check className="w-4 h-4" /> Отметить прочитанной (+{POINTS.QURAN})
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* End of surah — режим ленты */}
            {quranMode === "scroll" && (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent mb-3" />
              <p className="text-slate-500 text-xs mb-3">
                Конец суры &laquo;
                {SURAH_NAMES_RU[selectedSurah] || surahDetail?.englishName}
                &raquo;
              </p>
              {/* Явная отметка прочитанного — прогресс растёт только отсюда */}
              {isCurrentSurahRead ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                  <Check className="w-4 h-4" /> Сура отмечена прочитанной
                </span>
              ) : (
                <button
                  onClick={markCurrentSurahRead}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-200 text-sm font-semibold ring-1 ring-emerald-400/40 active:scale-95 transition"
                >
                  <Check className="w-4 h-4" /> Отметить прочитанной (+{POINTS.QURAN})
                </button>
              )}
            </div>
            )}

            {/* Spacer for audio player bar */}
            {audioState && <div className="h-24" />}
          </div>
        )}

        {/* Audio player bar */}
        {renderAudioPlayerBar()}

        {/* Reciter selector modal */}
        {renderReciterModal()}

        {/* Share Card Modal */}
        {shareAyah && (
          <ShareCard
            type="ayat"
            arabic={shareAyah.arabic}
            text={shareAyah.text}
            surah={shareAyah.surah}
            onClose={() => setShareAyah(null)}
          />
        )}
      </div>
    );
  }

  // ============================
  // VIEW 1 - Surah List
  // ============================
  return (
    <div className="min-h-screen pb-24">
      {/* Page header — восточный стиль */}
      <div className="relative px-4 pt-6 pb-5 overflow-hidden">
        {/* Декоративный фон */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/30 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-2 left-4 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative text-center">
          {/* Бисмиллях */}
          <p
            className="text-amber-400/60 text-lg font-serif mb-1"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            ﷽
          </p>
          {/* Заголовок */}
          <h1 className="text-2xl font-bold text-white mb-1">
            Священный Коран
          </h1>
          <p className="text-emerald-400/60 text-sm">114 сур • Слово Аллаха</p>
          {/* Декоративная линия */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-emerald-500/40" />
            <span className="text-emerald-500/40 text-xs">✦</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-emerald-500/40" />
          </div>
        </div>
      </div>

      {/* Прогресс чтения */}
      {(() => {
        const doneSurahs = readSurahs.length;
        const doneAyahs = sumAyahsForSurahs(readSurahs);
        const ayahPct = Math.round((doneAyahs / TOTAL_AYAHS) * 100);
        const surahPct = Math.round((doneSurahs / TOTAL_SURAHS) * 100);
        // Позиция для "продолжить": авто-позиция чтения, иначе последняя закладка
        const resume =
          lastPos ||
          (bookmarks.length > 0
            ? {
                surah: bookmarks[bookmarks.length - 1].surahNumber,
                ayah: bookmarks[bookmarks.length - 1].ayahNumber,
              }
            : null);
        const resumeName = resume
          ? SURAH_NAMES_RU[resume.surah] || `Сура ${resume.surah}`
          : null;
        return (
          <div className="px-4 mb-4">
            <div className="glass-card p-4">
              {/* Заголовок + Аяты */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">📖</span>
                  <span className="text-white text-sm font-medium">
                    Прогресс чтения
                  </span>
                </div>
                <span className="text-emerald-400 text-sm font-bold tabular-nums">
                  {doneAyahs.toLocaleString("ru")}
                  <span className="text-slate-500 font-normal">
                    {" "}/ {TOTAL_AYAHS.toLocaleString("ru")} аятов
                  </span>
                </span>
              </div>
              {/* Главный прогресс-бар по аятам */}
              <div className="relative h-2 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${ayahPct}%` }}
                />
              </div>
              {/* Под-строка: % + суры */}
              <div className="flex items-center justify-between mt-2 text-[11px]">
                <span className="text-emerald-400 font-medium">
                  {ayahPct}% Корана
                </span>
                <span className="text-slate-400">
                  Сур: <span className="text-slate-200 font-medium">{doneSurahs}</span>
                  <span className="text-slate-500"> / {TOTAL_SURAHS}</span>
                  <span className="text-slate-500"> · {surahPct}%</span>
                </span>
              </div>
              {/* Continue button — прыгает прямо к аяту, где остановился */}
              {resume && (
                <button
                  onClick={() => openSurah(resume.surah, resume.ayah)}
                  className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg
                             bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-[0.98]
                             text-emerald-200 text-xs font-semibold ring-1 ring-emerald-400/30 transition"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Продолжить чтение: {resumeName} · аят {resume.ayah}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Избранные аяты — отдельный блок */}
      {bookmarks.length > 0 && (
        <div className="px-4 mb-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bookmark className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-white text-sm font-medium">Избранные аяты</span>
              <span className="text-slate-500 text-xs">({bookmarks.length})</span>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {[...bookmarks].reverse().map((b) => (
                <div
                  key={`${b.surahNumber}:${b.ayahNumber}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openSurah(b.surahNumber, b.ayahNumber)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                             bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition"
                >
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {SURAH_NAMES_RU[b.surahNumber] || `Сура ${b.surahNumber}`}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Аят {b.ayahNumber}
                      {notes[`${b.surahNumber}:${b.ayahNumber}`] ? " · есть заметка" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(b.surahNumber, b.ayahNumber);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Убрать из избранного"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-emerald-400/70" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="glass-card flex items-center gap-3 px-4 py-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Поиск суры..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500
                       outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-slate-500 hover:text-slate-300 text-xs"
            >
              Очистить
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          <p className="text-slate-400 text-sm">Загрузка списка сур...</p>
        </div>
      )}

      {/* Surah list */}
      {!loading && (
        <div className="px-4 space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-500">Ничего не найдено</p>
            </div>
          )}

          {filtered.map((surah) => {
            const ruName = SURAH_NAMES_RU[surah.number] || "";
            const bookmarked = isSurahBookmarked(surah.number);
            const isRead = readSurahs.includes(surah.number);
            const isMeccan = surah.revelationType === "Meccan";

            return (
              <button
                key={surah.number}
                onClick={() => openSurah(surah.number)}
                className={`glass-card w-full flex items-center gap-4 p-4
                           hover:bg-white/[0.04] active:scale-[0.99]
                           transition-all duration-150 text-left ${
                             isRead ? "border-emerald-500/20" : ""
                           }`}
              >
                {/* Surah number — восточный ромб */}
                <div className="relative flex items-center justify-center w-11 h-11 shrink-0">
                  <div className="absolute inset-0 rotate-45 rounded-lg border border-emerald-500/30 bg-emerald-500/10" />
                  <span className="relative text-emerald-400 text-sm font-bold">
                    {surah.number}
                  </span>
                  {bookmarked && (
                    <div className="absolute -top-1.5 -right-1.5 z-10">
                      <svg
                        className="w-4 h-4 text-amber-400 fill-amber-400"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                  )}
                  {isRead && !bookmarked && (
                    <div className="absolute -bottom-1 -right-1 z-10 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center ring-1 ring-emerald-300/50">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* Name info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm truncate">
                      {ruName}
                    </span>
                    <span className="text-slate-500 text-xs truncate">
                      / {surah.englishName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-slate-400 text-xs">
                      {surah.numberOfAyahs} аятов
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        isMeccan
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {isMeccan ? "Мекканская" : "Мединская"}
                    </span>
                  </div>
                </div>

                {/* Arabic name */}
                <span
                  className="text-amber-400/70 text-lg shrink-0"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  {surah.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
