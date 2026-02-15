import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  Play,
  Pause,
  Volume2,
  X,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  ChevronDown,
} from "lucide-react";

// ============================================================
// Russian surah names (full 114 for navigation)
// ============================================================

const SURAH_NAMES_RU: Record<number, string> = {
  1: "Аль-Фатиха",
  2: "Аль-Бакара",
  3: "Алю Имран",
  4: "Ан-Ниса",
  5: "Аль-Маида",
  6: "Аль-Анам",
  7: "Аль-Араф",
  8: "Аль-Анфаль",
  9: "Ат-Тауба",
  10: "Юнус",
  11: "Худ",
  12: "Юсуф",
  13: "Ар-Раад",
  14: "Ибрахим",
  15: "Аль-Хиджр",
  16: "Ан-Нахль",
  17: "Аль-Исра",
  18: "Аль-Кахф",
  19: "Марьям",
  20: "Та Ха",
  21: "Аль-Анбия",
  22: "Аль-Хадж",
  23: "Аль-Муминун",
  24: "Ан-Нур",
  25: "Аль-Фуркан",
  26: "Аш-Шуара",
  27: "Ан-Намль",
  28: "Аль-Касас",
  29: "Аль-Анкабут",
  30: "Ар-Рум",
  31: "Лукман",
  32: "Ас-Саджда",
  33: "Аль-Ахзаб",
  34: "Саба",
  35: "Фатыр",
  36: "Йа Син",
  37: "Ас-Саффат",
  38: "Сад",
  39: "Аз-Зумар",
  40: "Гафир",
  41: "Фуссилят",
  42: "Аш-Шура",
  43: "Аз-Зухруф",
  44: "Ад-Духан",
  45: "Аль-Джасия",
  46: "Аль-Ахкаф",
  47: "Мухаммад",
  48: "Аль-Фатх",
  49: "Аль-Худжурат",
  50: "Каф",
  51: "Аз-Зарият",
  52: "Ат-Тур",
  53: "Ан-Наджм",
  54: "Аль-Камар",
  55: "Ар-Рахман",
  56: "Аль-Вакиа",
  57: "Аль-Хадид",
  58: "Аль-Муджадила",
  59: "Аль-Хашр",
  60: "Аль-Мумтахана",
  61: "Ас-Сафф",
  62: "Аль-Джума",
  63: "Аль-Мунафикун",
  64: "Ат-Тагабун",
  65: "Ат-Талак",
  66: "Ат-Тахрим",
  67: "Аль-Мульк",
  68: "Аль-Калям",
  69: "Аль-Хакка",
  70: "Аль-Мааридж",
  71: "Нух",
  72: "Аль-Джинн",
  73: "Аль-Муззаммиль",
  74: "Аль-Муддассир",
  75: "Аль-Кияма",
  76: "Аль-Инсан",
  77: "Аль-Мурсалят",
  78: "Ан-Наба",
  79: "Ан-Назиат",
  80: "Абаса",
  81: "Ат-Таквир",
  82: "Аль-Инфитар",
  83: "Аль-Мутаффифин",
  84: "Аль-Иншикак",
  85: "Аль-Бурудж",
  86: "Ат-Тарик",
  87: "Аль-Аля",
  88: "Аль-Гашия",
  89: "Аль-Фаджр",
  90: "Аль-Балад",
  91: "Аш-Шамс",
  92: "Аль-Лейль",
  93: "Ад-Духа",
  94: "Аш-Шарх",
  95: "Ат-Тин",
  96: "Аль-Аляк",
  97: "Аль-Кадр",
  98: "Аль-Баййина",
  99: "Аз-Зальзаля",
  100: "Аль-Адият",
  101: "Аль-Кариа",
  102: "Ат-Такасур",
  103: "Аль-Аср",
  104: "Аль-Хумаза",
  105: "Аль-Филь",
  106: "Курайш",
  107: "Аль-Маун",
  108: "Аль-Каусар",
  109: "Аль-Кафирун",
  110: "Ан-Наср",
  111: "Аль-Масад",
  112: "Аль-Ихлас",
  113: "Аль-Фаляк",
  114: "Ан-Нас",
};

// Arabic names for the expanded view
const SURAH_NAMES_AR: Record<number, string> = {
  1: "الفاتحة",
  2: "البقرة",
  3: "آل عمران",
  4: "النساء",
  5: "المائدة",
  6: "الأنعام",
  7: "الأعراف",
  8: "الأنفال",
  9: "التوبة",
  10: "يونس",
  11: "هود",
  12: "يوسف",
  13: "الرعد",
  14: "إبراهيم",
  15: "الحجر",
  16: "النحل",
  17: "الإسراء",
  18: "الكهف",
  19: "مريم",
  20: "طه",
  21: "الأنبياء",
  22: "الحج",
  23: "المؤمنون",
  24: "النور",
  25: "الفرقان",
  26: "الشعراء",
  27: "النمل",
  28: "القصص",
  29: "العنكبوت",
  30: "الروم",
  31: "لقمان",
  32: "السجدة",
  33: "الأحزاب",
  34: "سبأ",
  35: "فاطر",
  36: "يس",
  37: "الصافات",
  38: "ص",
  39: "الزمر",
  40: "غافر",
  41: "فصلت",
  42: "الشورى",
  43: "الزخرف",
  44: "الدخان",
  45: "الجاثية",
  46: "الأحقاف",
  47: "محمد",
  48: "الفتح",
  49: "الحجرات",
  50: "ق",
  51: "الذاريات",
  52: "الطور",
  53: "النجم",
  54: "القمر",
  55: "الرحمن",
  56: "الواقعة",
  57: "الحديد",
  58: "المجادلة",
  59: "الحشر",
  60: "الممتحنة",
  61: "الصف",
  62: "الجمعة",
  63: "المنافقون",
  64: "التغابن",
  65: "الطلاق",
  66: "التحريم",
  67: "الملك",
  68: "القلم",
  69: "الحاقة",
  70: "المعارج",
  71: "نوح",
  72: "الجن",
  73: "المزمل",
  74: "المدثر",
  75: "القيامة",
  76: "الإنسان",
  77: "المرسلات",
  78: "النبأ",
  79: "النازعات",
  80: "عبس",
  81: "التكوير",
  82: "الإنفطار",
  83: "المطففين",
  84: "الإنشقاق",
  85: "البروج",
  86: "الطارق",
  87: "الأعلى",
  88: "الغاشية",
  89: "الفجر",
  90: "البلد",
  91: "الشمس",
  92: "الليل",
  93: "الضحى",
  94: "الشرح",
  95: "التين",
  96: "العلق",
  97: "القدر",
  98: "البينة",
  99: "الزلزلة",
  100: "العاديات",
  101: "القارعة",
  102: "التكاثر",
  103: "العصر",
  104: "الهمزة",
  105: "الفيل",
  106: "قريش",
  107: "الماعون",
  108: "الكوثر",
  109: "الكافرون",
  110: "النصر",
  111: "المسد",
  112: "الإخلاص",
  113: "الفلق",
  114: "الناس",
};

// ============================================================
// Types
// ============================================================

type RepeatMode = "off" | "one" | "all";

interface SurahInfo {
  number: number;
  arabicName: string;
  russianName: string;
}

interface AudioContextType {
  isPlaying: boolean;
  currentSurah: SurahInfo | null;
  play: (
    surahNumber: number,
    arabicName: string,
    russianName: string,
    audioUrl?: string,
  ) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  toggle: () => void;
}

// ============================================================
// Context
// ============================================================

const AudioContext = createContext<AudioContextType | null>(null);

export function useAudio(): AudioContextType {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error("useAudio must be used within <AudioProvider>");
  }
  return ctx;
}

// ============================================================
// Helper: surah audio URL (full surah, single mp3)
// ============================================================

function getSurahAudioUrl(surahNumber: number): string {
  return `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surahNumber}.mp3`;
}

// ============================================================
// Helper: format seconds -> MM:SS
// ============================================================

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ============================================================
// AudioProvider
// ============================================================

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSurah, setCurrentSurah] = useState<SurahInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Timeupdate interval for smooth progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let raf: number = 0;

    const onTimeUpdate = () => {
      setProgress(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const onEnded = () => {
      if (repeatMode === "one") {
        // Replay same surah
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else if (repeatMode === "all" && currentSurah) {
        // Go to next surah, wrap around
        const next = currentSurah.number >= 114 ? 1 : currentSurah.number + 1;
        const ruName = SURAH_NAMES_RU[next] || `Сура ${next}`;
        const arName = SURAH_NAMES_AR[next] || "";
        playSurah(next, arName, ruName);
      } else {
        setIsPlaying(false);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [repeatMode, currentSurah]);

  // ---- Playback controls ----

  const playSurah = useCallback(
    (
      surahNumber: number,
      arabicName: string,
      russianName: string,
      audioUrl?: string,
    ) => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.pause();
      audio.src = audioUrl || getSurahAudioUrl(surahNumber);
      audio.load();

      setCurrentSurah({ number: surahNumber, arabicName, russianName });
      setProgress(0);
      setDuration(0);
      setIsPlaying(true);

      audio.play().catch(console.error);
    },
    [],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(console.error);
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = "";
    setCurrentSurah(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setExpanded(false);
  }, []);

  const toggle = useCallback(() => {
    if (!audioRef.current || !currentSurah) return;
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  }, [isPlaying, currentSurah, pause, resume]);

  // ---- Seek ----

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setProgress(time);
  }, []);

  // ---- Prev / Next surah ----

  const playPrev = useCallback(() => {
    if (!currentSurah) return;
    const prev = currentSurah.number <= 1 ? 114 : currentSurah.number - 1;
    const ruName = SURAH_NAMES_RU[prev] || `Сура ${prev}`;
    const arName = SURAH_NAMES_AR[prev] || "";
    playSurah(prev, arName, ruName);
  }, [currentSurah, playSurah]);

  const playNext = useCallback(() => {
    if (!currentSurah) return;
    const next = currentSurah.number >= 114 ? 1 : currentSurah.number + 1;
    const ruName = SURAH_NAMES_RU[next] || `Сура ${next}`;
    const arName = SURAH_NAMES_AR[next] || "";
    playSurah(next, arName, ruName);
  }, [currentSurah, playSurah]);

  // ---- Repeat toggle ----

  const cycleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === "off") return "one";
      if (prev === "one") return "all";
      return "off";
    });
  }, []);

  // ---- Context value ----

  const contextValue: AudioContextType = {
    isPlaying,
    currentSurah,
    play: playSurah,
    pause,
    resume,
    stop,
    toggle,
  };

  // ---- Progress percentage ----

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  // ===========================================================
  // Render
  // ===========================================================

  return (
    <AudioContext.Provider value={contextValue}>
      {children}

      {/* ---- Mini player bar ---- */}
      {currentSurah && !expanded && (
        <div className="fixed left-0 right-0 z-[60]" style={{ bottom: "60px" }}>
          {/* Thin progress bar at top */}
          <div className="w-full h-[3px] t-bg overflow-hidden">
            <div
              className="h-full transition-[width] duration-300 ease-linear"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #059669, #10b981, #34d399)",
              }}
            />
          </div>

          {/* Bar body */}
          <div
            className="glass t-bg-el backdrop-blur-2xl border-t t-border
                        px-4 py-2 cursor-pointer"
            onClick={() => setExpanded(true)}
          >
            <div className="max-w-lg mx-auto flex items-center gap-3">
              {/* Left: volume icon + surah name */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0
                              ${isPlaying ? "bg-emerald-500/20 animate-pulse-glow" : "bg-emerald-500/10"}`}
                >
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {currentSurah.russianName}
                  </p>
                  <p className="text-slate-500 text-[11px] truncate">
                    Сура {currentSurah.number}
                  </p>
                </div>
              </div>

              {/* Center: Play/Pause */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggle();
                }}
                className={`flex items-center justify-center w-11 h-11 rounded-full shrink-0
                            transition-all duration-200
                            ${
                              isPlaying
                                ? "bg-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                                : "t-bg hover:bg-white/15"
                            }`}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Play className="w-5 h-5 text-emerald-400 ml-0.5" />
                )}
              </button>

              {/* Right: time + close */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-400 text-[11px] font-mono tabular-nums whitespace-nowrap">
                  {formatTime(progress)} / {formatTime(duration)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    stop();
                  }}
                  className="flex items-center justify-center w-8 h-8 rounded-full
                             hover:t-bg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Expanded player overlay ---- */}
      {currentSurah && expanded && (
        <div
          className="fixed inset-0 z-[70] flex flex-col"
          style={{
            background:
              "linear-gradient(180deg, rgba(2,6,23,0.97) 0%, rgba(6,15,35,0.99) 100%)",
            backdropFilter: "blur(40px)",
          }}
        >
          {/* Top bar with close */}
          <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] mt-4">
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center justify-center w-10 h-10 rounded-full
                         t-bg hover:t-bg transition-colors"
            >
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </button>
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">
              Воспроизведение
            </span>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>

          {/* Decorative Islamic pattern area */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
            {/* Decorative frame */}
            <div className="relative w-56 h-56 flex items-center justify-center">
              {/* Outer ornamental ring */}
              <svg
                viewBox="0 0 200 200"
                className="absolute inset-0 w-full h-full"
                style={{
                  filter: "drop-shadow(0 0 20px rgba(16,185,129,0.15))",
                }}
              >
                {/* Outer circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="96"
                  fill="none"
                  stroke="rgba(16,185,129,0.15)"
                  strokeWidth="1"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="88"
                  fill="none"
                  stroke="rgba(16,185,129,0.1)"
                  strokeWidth="0.5"
                />
                {/* Eight-point star pattern */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                  <line
                    key={angle}
                    x1="100"
                    y1="8"
                    x2="100"
                    y2="30"
                    stroke="rgba(245,158,11,0.25)"
                    strokeWidth="1"
                    transform={`rotate(${angle} 100 100)`}
                  />
                ))}
                {/* Inner decorative circles */}
                <circle
                  cx="100"
                  cy="100"
                  r="70"
                  fill="none"
                  stroke="rgba(245,158,11,0.1)"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="50"
                  fill="rgba(16,185,129,0.03)"
                  stroke="rgba(16,185,129,0.12)"
                  strokeWidth="0.5"
                />
                {/* Corner ornaments at cardinal points */}
                {[0, 90, 180, 270].map((angle) => (
                  <g
                    key={`orn-${angle}`}
                    transform={`rotate(${angle} 100 100)`}
                  >
                    <path
                      d="M100 4 L104 16 L100 12 L96 16 Z"
                      fill="rgba(245,158,11,0.3)"
                    />
                  </g>
                ))}
                {/* Diagonal ornaments */}
                {[45, 135, 225, 315].map((angle) => (
                  <g
                    key={`diag-${angle}`}
                    transform={`rotate(${angle} 100 100)`}
                  >
                    <circle
                      cx="100"
                      cy="10"
                      r="2"
                      fill="rgba(16,185,129,0.25)"
                    />
                  </g>
                ))}
              </svg>

              {/* Center content: surah number */}
              <div className="relative z-10 flex flex-col items-center gap-1">
                <span className="text-emerald-500/50 text-xs font-medium uppercase tracking-widest">
                  Сура
                </span>
                <span className="text-5xl font-bold text-white/90">
                  {currentSurah.number}
                </span>
              </div>
            </div>

            {/* Arabic name (large, golden) */}
            <p
              className="arabic-text text-4xl text-center leading-relaxed"
              style={{
                color: "#d4a853",
                textShadow: "0 0 30px rgba(212,168,83,0.2)",
              }}
            >
              {currentSurah.arabicName ||
                SURAH_NAMES_AR[currentSurah.number] ||
                ""}
            </p>

            {/* Russian name */}
            <p className="text-slate-300 text-lg font-medium text-center">
              {currentSurah.russianName}
            </p>

            {/* Background mode label */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-[11px] font-medium">
                Фоновый режим
              </span>
            </div>
          </div>

          {/* Progress slider area */}
          <div className="px-8 pb-2">
            {/* Seekable slider */}
            <div className="relative w-full h-8 flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={progress}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                           t-bg outline-none
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-emerald-400
                           [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(16,185,129,0.5)]
                           [&::-webkit-slider-thumb]:border-0
                           [&::-webkit-slider-thumb]:cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${progressPct}%, rgba(255,255,255,0.1) ${progressPct}%, rgba(255,255,255,0.1) 100%)`,
                }}
              />
            </div>
            {/* Time labels */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs font-mono tabular-nums">
                {formatTime(progress)}
              </span>
              <span className="text-slate-500 text-xs font-mono tabular-nums">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-6 px-8 pb-6 pt-2">
            {/* Repeat */}
            <button
              onClick={cycleRepeat}
              className={`flex items-center justify-center w-11 h-11 rounded-full transition-colors
                         ${repeatMode !== "off" ? "bg-emerald-500/15 text-emerald-400" : "text-slate-500 hover:text-slate-300"}`}
              title={
                repeatMode === "off"
                  ? "Повтор выкл"
                  : repeatMode === "one"
                    ? "Повтор суры"
                    : "Повтор всех"
              }
            >
              {repeatMode === "one" ? (
                <Repeat1 className="w-5 h-5" />
              ) : (
                <Repeat className="w-5 h-5" />
              )}
            </button>

            {/* Previous */}
            <button
              onClick={playPrev}
              className="flex items-center justify-center w-12 h-12 rounded-full
                         t-bg hover:t-bg transition-colors"
            >
              <SkipBack className="w-5 h-5 text-white" />
            </button>

            {/* Play / Pause (large, center) */}
            <button
              onClick={toggle}
              className={`flex items-center justify-center w-18 h-18 rounded-full
                          transition-all duration-300
                          ${
                            isPlaying
                              ? "bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.4)]"
                              : "bg-white/15 hover:bg-white/20"
                          }`}
              style={{ width: "72px", height: "72px" }}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={playNext}
              className="flex items-center justify-center w-12 h-12 rounded-full
                         t-bg hover:t-bg transition-colors"
            >
              <SkipForward className="w-5 h-5 text-white" />
            </button>

            {/* Close / stop */}
            <button
              onClick={stop}
              className="flex items-center justify-center w-11 h-11 rounded-full
                         text-slate-500 hover:text-red-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Safe area bottom spacer */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      )}
    </AudioContext.Provider>
  );
}

export default AudioProvider;
