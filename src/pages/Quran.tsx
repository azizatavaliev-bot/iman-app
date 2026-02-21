import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  BookmarkPlus,
  Bookmark,
  ChevronLeft,
  ChevronRight,
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
} from "lucide-react";
import {
  getSurahList,
  getSurah,
  getSurahTranslation,
  getReciters,
  getReciterAudioUrl,
  POPULAR_RECITERS,
  hapticSelection,
} from "../lib/api";
import { storage, POINTS } from "../lib/storage";
import { scheduleSyncPush } from "../lib/sync";
import { useAudio } from "../components/AudioPlayer";
import { hasTafsir, getTafsir } from "../data/tafsir";
import {
  getTransliteration,
  hasTransliteration,
} from "../data/quran-transliteration";
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
  id: 7,
  name: "مشاري العفاسي",
  server: "https://server8.mp3quran.net/afs/",
  moshafId: 7,
  surahTotal: 114,
  surahList: Array.from({ length: 114 }, (_, i) => i + 1),
};

function loadSavedReciter(): SavedReciter {
  try {
    const raw = localStorage.getItem(RECITER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.name && parsed.server) {
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
  // --- State ---
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [ayahs, setAyahs] = useState<MergedAyah[]>([]);
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>([]);
  const [expandedTafsir, setExpandedTafsir] = useState<number | null>(null);

  // --- Notes state ---
  const NOTES_KEY = "iman_quran_notes";
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const [editingNote, setEditingNote] = useState<string | null>(null); // "surah:ayah" key
  const [noteText, setNoteText] = useState("");

  function noteKey(surah: number, ayah: number) { return `${surah}:${ayah}`; }

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
  const ayahRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // --- Load surah list + bookmarks ---
  useEffect(() => {
    async function load() {
      try {
        const list = await getSurahList();
        setSurahs(list);
      } catch (err) {
        console.error("Failed to load surah list:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
    setBookmarks(storage.getQuranBookmarks());
  }, []);

  // --- Create audio element once (no crossOrigin — breaks iOS WKWebView/Telegram) ---
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
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
        ref.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      setAudioLoading(true);

      audio.oncanplay = () => {
        setAudioLoading(false);
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

  // --- Auto-scroll when playing ayah changes ---
  useEffect(() => {
    if (audioState?.isPlaying && audioState.mode === "surah") {
      const ref = ayahRefs.current.get(audioState.currentAyahIndex);
      if (ref) {
        ref.scrollIntoView({ behavior: "smooth", block: "center" });
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
    scheduleSyncPush();
    return true;
  }

  // --- Open surah ---
  async function openSurah(num: number) {
    // Stop any playing audio when switching surah
    stopPlayback();

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
        arabic: a.text,
        translation: russian.ayahs[i]?.text || "",
      }));

      setAyahs(merged);

      // Award points for first-time surah reading
      if (markSurahRead(num)) {
        storage.addExtraPoints(POINTS.QURAN);
      }
    } catch (err) {
      console.error("Failed to load surah:", err);
    } finally {
      setLoadingAyahs(false);
    }
  }

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

  // Filtered reciters for the modal search
  const filteredReciters = reciterSearch.trim()
    ? allReciters.filter((r) =>
        r.name.toLowerCase().includes(reciterSearch.toLowerCase()),
      )
    : allReciters;

  // --- Filtered surahs ---
  const filtered = surahs.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const ruName = SURAH_NAMES_RU[s.number] || "";
    return (
      s.name.includes(search) ||
      s.englishName.toLowerCase().includes(q) ||
      s.englishNameTranslation.toLowerCase().includes(q) ||
      ruName.toLowerCase().includes(q) ||
      String(s.number).includes(q)
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
                Текущий: {selectedReciter.name}
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
                            className={`text-sm font-medium truncate arabic-text ${
                              isSelected ? "text-emerald-300" : "text-white"
                            }`}
                          >
                            {pr.name}
                          </p>
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
                          className={`text-sm font-medium truncate arabic-text ${
                            isSelected ? "text-emerald-300" : "text-white/90"
                          }`}
                        >
                          {reciter.name}
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          {reciter.surahTotal} сур
                          {!hasSurah && " -- нет этой суры"}
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
      <div className="min-h-screen pb-24">
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
          <div className="px-4 py-6 space-y-6">
            {/* Play All button */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  if (audioState?.isPlaying && audioState.mode === "surah") {
                    togglePlayPause();
                  } else {
                    playAllAyahs(0);
                  }
                }}
                className="flex items-center gap-3 px-6 py-3 rounded-full
                           bg-emerald-500/15 border border-emerald-500/30
                           hover:bg-emerald-500/25 active:scale-[0.97]
                           transition-all duration-150"
              >
                {audioLoading && audioState?.mode === "surah" ? (
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                ) : audioState?.isPlaying && audioState.mode === "surah" ? (
                  <Pause className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Play className="w-5 h-5 text-emerald-400 ml-0.5" />
                )}
                <span className="text-emerald-300 text-sm font-medium">
                  {audioLoading && audioState?.mode === "surah"
                    ? "Загрузка..."
                    : audioState?.isPlaying && audioState.mode === "surah"
                      ? `Пауза  --  Аят ${audioState.currentAyahIndex + 1} из ${audioState.totalAyahs}`
                      : "Слушать суру"}
                </span>
                <Volume2 className="w-4 h-4 text-emerald-500/60" />
              </button>
            </div>

            {/* Stop button (if surah is playing) */}
            {audioState && audioState.mode === "surah" && (
              <div className="flex justify-center">
                <button
                  onClick={stopPlayback}
                  className="flex items-center gap-2 px-4 py-2 rounded-full
                             bg-red-500/10 border border-red-500/20
                             hover:bg-red-500/20 transition-colors"
                >
                  <Square className="w-4 h-4 text-red-400" />
                  <span className="text-red-300 text-xs font-medium">
                    Остановить
                  </span>
                </button>
              </div>
            )}

            {/* Reciter selector button */}
            <div className="flex justify-center">
              <button
                onClick={openReciterModal}
                className="flex items-center gap-2 px-4 py-2 rounded-full
                           bg-white/[0.04] border t-border-s
                           hover:bg-white/[0.08] active:scale-[0.97]
                           transition-all duration-150"
              >
                <Mic2 className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300 text-xs font-medium truncate max-w-[180px] arabic-text">
                  {selectedReciter.name}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </button>
            </div>

            {/* Background play button */}
            <div className="flex justify-center">
              {globalAudio.currentSurah?.number === selectedSurah &&
              globalAudio.isPlaying ? (
                <button
                  onClick={() => globalAudio.pause()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full
                             bg-amber-500/15 border border-amber-500/30
                             hover:bg-amber-500/25 active:scale-[0.97]
                             transition-all duration-150"
                >
                  <Pause className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300 text-xs font-medium">
                    Фоновое воспроизведение...
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (surahDetail) {
                      globalAudio.play(
                        selectedSurah,
                        surahDetail.name,
                        SURAH_NAMES_RU[selectedSurah] ||
                          surahDetail.englishName,
                        getReciterSurahUrl(selectedSurah),
                      );
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full
                             bg-amber-500/10 border border-amber-500/20
                             hover:bg-amber-500/20 active:scale-[0.97]
                             transition-all duration-150"
                >
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300 text-xs font-medium">
                    Слушать фоном
                  </span>
                </button>
              )}
            </div>

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
                  key={ayah.numberInSurah}
                  ref={(el) => {
                    if (el) ayahRefs.current.set(index, el);
                    else ayahRefs.current.delete(index);
                  }}
                  className={`glass-card p-5 animate-fade-in transition-all duration-300 ${
                    isCurrentlyPlaying
                      ? "ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/10"
                      : ""
                  } ${wasPlayed ? "opacity-60" : ""}`}
                >
                  {/* Top row: ayah number + play + bookmark */}
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

                  {/* Tafsir button + content */}
                  {hasTafsir(selectedSurah, ayah.numberInSurah) && (
                    <div className="mt-3">
                      <button
                        onClick={() =>
                          setExpandedTafsir((prev) =>
                            prev === ayah.numberInSurah
                              ? null
                              : ayah.numberInSurah,
                          )
                        }
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          expandedTafsir === ayah.numberInSurah
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "t-bg text-slate-400 hover:text-purple-300 hover:bg-purple-500/10"
                        }`}
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        Тафсир
                      </button>

                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          expandedTafsir === ayah.numberInSurah
                            ? "max-h-[500px] opacity-100 mt-3"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/80">
                              Толкование
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {getTafsir(selectedSurah, ayah.numberInSurah)?.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

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
                                  onClick={() => { setEditingNote(nk); setNoteText(existingNote); }}
                                  className="p-1 rounded hover:bg-amber-500/10"
                                >
                                  <PenLine className="w-3 h-3 text-amber-400/60" />
                                </button>
                                <button
                                  onClick={() => deleteNote(selectedSurah, ayah.numberInSurah)}
                                  className="p-1 rounded hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-3 h-3 text-red-400/60" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-amber-200/80 leading-relaxed">{existingNote}</p>
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
                                onClick={() => { setEditingNote(null); setNoteText(""); }}
                                className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:bg-slate-700/50"
                              >
                                Отмена
                              </button>
                              <button
                                onClick={() => saveNote(selectedSurah, ayah.numberInSurah, noteText)}
                                className="px-3 py-1 rounded-lg text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                              >
                                Сохранить
                              </button>
                            </div>
                          </div>
                        ) : !existingNote && (
                          <button
                            onClick={() => { setEditingNote(nk); setNoteText(""); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-amber-300 hover:bg-amber-500/10 t-bg transition-all"
                          >
                            <PenLine className="w-3.5 h-3.5" />
                            Заметка
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}

            {/* End of surah */}
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent mb-3" />
              <p className="text-slate-500 text-xs">
                Конец суры &laquo;
                {SURAH_NAMES_RU[selectedSurah] || surahDetail?.englishName}
                &raquo;
              </p>
            </div>

            {/* Spacer for audio player bar */}
            {audioState && <div className="h-24" />}
          </div>
        )}

        {/* Audio player bar */}
        {renderAudioPlayerBar()}

        {/* Reciter selector modal */}
        {renderReciterModal()}
      </div>
    );
  }

  // ============================
  // VIEW 1 - Surah List
  // ============================
  return (
    <div className="min-h-screen pb-24">
      {/* Page header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white mb-1">Коран</h1>
        <p className="text-slate-400 text-sm">114 сур Священного Корана</p>
      </div>

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
            const isMeccan = surah.revelationType === "Meccan";

            return (
              <button
                key={surah.number}
                onClick={() => openSurah(surah.number)}
                className="glass-card w-full flex items-center gap-4 p-4
                           hover:bg-white/[0.04] active:scale-[0.99]
                           transition-all duration-150 text-left"
              >
                {/* Surah number circle */}
                <div
                  className="relative flex items-center justify-center w-12 h-12 shrink-0
                             rounded-full border border-emerald-500/30 bg-emerald-500/10"
                >
                  <span className="text-emerald-400 text-sm font-bold">
                    {surah.number}
                  </span>
                  {bookmarked && (
                    <div className="absolute -top-1 -right-1">
                      <svg
                        className="w-4 h-4 text-amber-400 fill-amber-400"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
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
                <span className="arabic-text text-amber-100/80 text-lg shrink-0">
                  {surah.name}
                </span>

                {/* Chevron */}
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
