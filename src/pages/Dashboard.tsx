import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  Moon,
  BookOpen,
  Quote,
  Star,
  Flame,
  Clock,
  ChevronRight,
  Check,
  X,
  Target,
  Heart,
  Timer,
  Brain,
  BarChart3,
  Headphones,
  GraduationCap,
  Play,
  Pause,
  Volume2,
  Repeat,
  Scroll,
  Sparkles,
  Info,
  Trophy,
  CalendarDays,
  Bookmark,
  Landmark,
  Users,
  Calculator,
  Lock,
  Search,
} from "lucide-react";
import { storage, getCurrentLevel, LEVELS, POINTS } from "../lib/storage";
import { getTelegramUser } from "../lib/telegram";
import { isSyncDone } from "../lib/sync";
import { useAudio } from "../components/AudioPlayer";
import { trackAction } from "../lib/analytics";
import SawabCoin from "../components/SawabCoin";
import GlobalSearch from "../components/GlobalSearch";
import {
  getPrayerTimes,
  getHadithOfDay,
  hapticSuccess,
  hapticImpact,
} from "../lib/api";
import type { PrayerTimes, Hadith } from "../lib/api";
import type { UserProfile, TodayStats, HabitLog } from "../lib/storage";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRAYER_NAMES_MAP: Record<string, string> = {
  Fajr: "Фаджр",
  Dhuhr: "Зухр",
  Asr: "Аср",
  Maghrib: "Магриб",
  Isha: "Иша",
};

const PRAYER_ORDER: (keyof PrayerTimes)[] = [
  "Fajr",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
];

type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

const PRAYER_KEYS: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

const PRAYER_KEY_TO_API: Record<PrayerKey, keyof PrayerTimes> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

const PRAYER_ICONS: Record<PrayerKey, string> = {
  fajr: "\u{1F305}",
  dhuhr: "\u{2600}\u{FE0F}",
  asr: "\u{1F324}\u{FE0F}",
  maghrib: "\u{1F307}",
  isha: "\u{1F319}",
};

type HabitKey = keyof Omit<HabitLog, "date">;

interface HabitDef {
  key: HabitKey;
  label: string;
  emoji: string;
  points: number;
}

const HABITS: HabitDef[] = [
  {
    key: "quran",
    label: "Чтение Корана",
    emoji: "\u{1F4D6}",
    points: POINTS.QURAN,
  },
  {
    key: "azkar_morning",
    label: "Утренние азкары",
    emoji: "\u{1F932}",
    points: POINTS.AZKAR,
  },
  {
    key: "azkar_evening",
    label: "Вечерние азкары",
    emoji: "\u{1F319}",
    points: POINTS.AZKAR,
  },
  {
    key: "charity",
    label: "Садака",
    emoji: "\u{1F4B0}",
    points: POINTS.CHARITY,
  },
  { key: "fasting", label: "Пост", emoji: "\u{1F54C}", points: POINTS.FASTING },
  { key: "dua", label: "Дуа", emoji: "\u{1F4FF}", points: POINTS.DUA },
];

const DEFAULT_LAT = 42.8746;
const DEFAULT_LNG = 74.5698;

// Max possible per day: 5*10 (prayers on time) + 3+2+2+5+15+2 (habits) = 79
const MAX_DAILY_POINTS =
  5 * POINTS.PRAYER_ONTIME + HABITS.reduce((s, h) => s + h.points, 0);

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateKey(date?: Date | string): string {
  if (!date) return new Date().toISOString().slice(0, 10);
  if (typeof date === "string") return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

const DAILY_MOTIVATIONS = [
  "Каждый намаз — разговор с Аллахом",
  "Терпение — половина имана",
  "Лучший из вас — полезный для людей",
  "Улыбка — тоже садака",
  "Начни день с Бисмиллях",
  "Знание — свет на твоём пути",
  "Дуа — оружие верующего",
  "Сегодня лучше, чем вчера",
  "Аллах любит постоянные дела",
  "Благодари Аллаха за каждый вздох",
  "Тот, кто идёт к Аллаху шагом — Аллах идёт к нему бегом",
  "Самый любимый пост — пост Давуда",
  "Рай под ногами матерей",
  "Зикр — пища для сердца",
  "Ихсан — поклоняйся, будто видишь Аллаха",
  "Кто читает Аль-Кахф в пятницу — свет до следующей пятницы",
  "Лучшее украшение — хороший нрав",
  "Щедрость не уменьшает богатства",
  "Тавба стирает то, что было до неё",
  "Каждый день — шанс стать ближе к Аллаху",
];

function getGreeting(): { headline: string; sub: string } {
  const hour = new Date().getHours();
  const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_MOTIVATIONS.length;
  let sub: string;
  if (hour >= 4 && hour < 12) {
    sub = "Доброе утро";
  } else if (hour >= 12 && hour < 17) {
    sub = "Добрый день";
  } else {
    sub = "Добрый вечер";
  }
  return { headline: DAILY_MOTIVATIONS[dayIndex], sub };
}

function parseTimeToDate(timeStr: string): Date {
  const clean = timeStr.replace(/\s*\(.*\)/, "").trim();
  const [h, m] = clean.split(":").map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
}

function findNextPrayer(times: PrayerTimes): {
  key: PrayerKey;
  apiKey: keyof PrayerTimes;
  russianName: string;
  time: string;
  date: Date;
} | null {
  const now = new Date();

  for (const apiKey of PRAYER_ORDER) {
    const timeStr = times[apiKey];
    const prayerDate = parseTimeToDate(timeStr);
    if (prayerDate > now) {
      const lowerKey = apiKey.toLowerCase() as PrayerKey;
      return {
        key: lowerKey === ("dhuhr" as PrayerKey) ? "dhuhr" : lowerKey,
        apiKey,
        russianName: PRAYER_NAMES_MAP[apiKey],
        time: timeStr.replace(/\s*\(.*\)/, "").trim(),
        date: prayerDate,
      };
    }
  }

  // All prayers have passed -- next is Fajr tomorrow
  const fajrTomorrow = parseTimeToDate(times.Fajr);
  fajrTomorrow.setDate(fajrTomorrow.getDate() + 1);
  return {
    key: "fajr",
    apiKey: "Fajr",
    russianName: PRAYER_NAMES_MAP.Fajr,
    time: times.Fajr.replace(/\s*\(.*\)/, "").trim(),
    date: fajrTomorrow,
  };
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/** Get difference in minutes between now and a prayer time */
function getMinutesSincePrayer(timeStr: string): number | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const now = new Date();
  const d = new Date(now);
  d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
  return Math.round((now.getTime() - d.getTime()) / 60000);
}

/** Get week dates (Mon-Sun) for current week */
function getWeekDates(): Date[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

/** Compute total points for a given day */
function getDayPoints(dateKey: string): number {
  const prayerLog = storage.getPrayerLog(dateKey);
  const habitLog = storage.getHabitLog(dateKey);
  let pts = 0;
  for (const p of PRAYER_KEYS) {
    if (prayerLog.prayers[p].status === "ontime") pts += POINTS.PRAYER_ONTIME;
    else if (prayerLog.prayers[p].status === "late") pts += POINTS.PRAYER_LATE;
  }
  if (habitLog.quran) pts += POINTS.QURAN;
  if (habitLog.azkar_morning) pts += POINTS.AZKAR;
  if (habitLog.azkar_evening) pts += POINTS.AZKAR;
  if (habitLog.charity) pts += POINTS.CHARITY;
  if (habitLog.fasting) pts += POINTS.FASTING;
  if (habitLog.dua) pts += POINTS.DUA;
  return pts;
}

// ---------------------------------------------------------------------------
// Circular Progress Ring (for Daily Score)
// ---------------------------------------------------------------------------

function DailyProgressRing({
  earned,
  possible,
  size = 130,
}: {
  earned: number;
  possible: number;
  size?: number;
}) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = possible > 0 ? earned / possible : 0;
  const offset = circumference * (1 - pct);

  let strokeColor: string;
  let glowColor: string;
  if (pct >= 0.7) {
    strokeColor = "#10b981";
    glowColor = "rgba(16,185,129,0.5)";
  } else if (pct >= 0.4) {
    strokeColor = "#f59e0b";
    glowColor = "rgba(245,158,11,0.5)";
  } else {
    strokeColor = "#ef4444";
    glowColor = "rgba(239,68,68,0.5)";
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white tabular-nums">
          {earned}
        </span>
        <span className="text-[11px] text-white/40 font-medium">
          из {possible}
        </span>
        <span className="text-[9px] text-white/25 uppercase tracking-widest mt-0.5 flex items-center gap-1 justify-center">
          саваб <SawabCoin size={12} />
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Celebration Particles (confetti burst when marking prayer)
// ---------------------------------------------------------------------------

function CelebrationBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1400);
    return () => clearTimeout(timer);
  }, [onDone]);

  const particles = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => {
      const angle = (i / 20) * 360;
      const distance = 30 + Math.random() * 50;
      const pSize = 3 + Math.random() * 5;
      const colors = [
        "#10b981",
        "#34d399",
        "#6ee7b7",
        "#fbbf24",
        "#f59e0b",
        "#a78bfa",
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const delay = Math.random() * 0.12;
      return { angle, distance, size: pSize, color, delay };
    });
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center">
      <div className="relative">
        <div
          className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/50"
          style={{ animation: "celebration-scale 0.5s ease-out forwards" }}
        >
          <Check className="w-6 h-6 text-white" strokeWidth={3} />
        </div>
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              top: "50%",
              left: "50%",
              marginTop: -p.size / 2,
              marginLeft: -p.size / 2,
              animation: `celebration-particle 0.7s ease-out ${p.delay}s forwards`,
              ["--tx" as string]: `${Math.cos((p.angle * Math.PI) / 180) * p.distance}px`,
              ["--ty" as string]: `${Math.sin((p.angle * Math.PI) / 180) * p.distance}px`,
              opacity: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Floating Points Animation
// ---------------------------------------------------------------------------

function FloatingPoints({
  points,
  id,
  onDone,
}: {
  points: number;
  id: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <span
      key={id}
      className="absolute -top-2 right-2 text-sm font-bold text-emerald-400 pointer-events-none z-50"
      style={{ animation: "float-up 1.2s ease-out forwards" }}
    >
      +{points}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Activity Feed Item (REDESIGNED - NO TIMESTAMPS)
// ---------------------------------------------------------------------------

interface ActivityItem {
  type: "prayer" | "habit";
  key: string;
  label: string;
  emoji: string;
  status: "done" | "pending" | "missed" | "none";
  points: number;
  earnedPoints: number;
}

function ActivityRow({
  item,
  onTap,
  floatingPts,
  onClearFloat,
}: {
  item: ActivityItem;
  onTap: () => void;
  floatingPts: { id: string; points: number } | null;
  onClearFloat: () => void;
}) {
  // Only show completed items
  if (item.status !== "done") return null;

  return (
    <button
      onClick={onTap}
      className="w-full flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 transition-all duration-200 active:scale-[0.98] relative"
    >
      {/* Checkmark */}
      <div className="w-6 h-6 rounded-full bg-emerald-500/25 flex items-center justify-center shrink-0">
        <Check size={12} className="text-emerald-400" />
      </div>

      {/* Emoji + Label */}
      <span className="text-sm mr-1">{item.emoji}</span>
      <span className="text-sm font-medium flex-1 text-left text-white/90">
        {item.label}
      </span>

      {/* Points */}
      <span className="text-xs font-bold tabular-nums text-emerald-400">
        +{item.earnedPoints}
      </span>

      {/* Floating points animation */}
      {floatingPts && (
        <FloatingPoints
          points={floatingPts.points}
          id={floatingPts.id}
          onDone={onClearFloat}
        />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Component
// ---------------------------------------------------------------------------

// Popular surahs for quick play
const POPULAR_SURAHS = [
  { number: 1, name: "Аль-Фатиха", ar: "الفاتحة" },
  { number: 36, name: "Йа Син", ar: "يس" },
  { number: 55, name: "Ар-Рахман", ar: "الرحمن" },
  { number: 67, name: "Аль-Мульк", ar: "الملك" },
  { number: 18, name: "Аль-Кахф", ar: "الكهف" },
  { number: 56, name: "Аль-Вакиа", ar: "الواقعة" },
];

// ---------------------------------------------------------------------------
// Feature Banner Carousel
// ---------------------------------------------------------------------------

const FEATURE_SLIDES = [
  {
    emoji: "📖",
    title: "Заучивание сур Корана",
    desc: "Запоминай аяты с подсказками и повторением",
    path: "/memorize",
    from: "from-emerald-500",
    to: "to-green-600",
    shadow: "shadow-emerald-500/25",
  },
  {
    emoji: "📜",
    title: "Хадис дня",
    desc: "Каждый день новый достоверный хадис",
    path: "/hadiths",
    from: "from-amber-500",
    to: "to-yellow-600",
    shadow: "shadow-amber-500/25",
  },
  {
    emoji: "🤲",
    title: "Стена дуа",
    desc: "Анонимные мольбы мусульман со всего мира",
    path: "/dua-wall",
    from: "from-rose-500",
    to: "to-pink-600",
    shadow: "shadow-rose-500/25",
  },
  {
    emoji: "🍅",
    title: "Помодоро-таймер ибадата",
    desc: "Фокусируйся на поклонении без отвлечений",
    path: "/ibadah-timer",
    from: "from-red-500",
    to: "to-orange-600",
    shadow: "shadow-red-500/25",
  },
  {
    emoji: "🕌",
    title: "Гид по намазу",
    desc: "Пошаговая инструкция для каждого намаза",
    path: "/namaz-guide",
    from: "from-indigo-500",
    to: "to-violet-600",
    shadow: "shadow-indigo-500/25",
  },
  {
    emoji: "🌙",
    title: "Трекер Рамадана",
    desc: "Счётчик дней, сухуры и ифтары",
    path: "/ramadan",
    from: "from-purple-500",
    to: "to-indigo-600",
    shadow: "shadow-purple-500/25",
  },
  {
    emoji: "✨",
    title: "99 имён Аллаха",
    desc: "Изучай значения и игра на запоминание",
    path: "/names",
    from: "from-yellow-500",
    to: "to-amber-600",
    shadow: "shadow-yellow-500/25",
  },
  {
    emoji: "📿",
    title: "Цифровые чётки",
    desc: "Считай зикры с вибрацией и звуком",
    path: "/dhikr",
    from: "from-teal-500",
    to: "to-emerald-600",
    shadow: "shadow-teal-500/25",
  },
  {
    emoji: "📕",
    title: "30 историй Ислама",
    desc: "Достоверные истории с источниками хадисов",
    path: "/stories",
    from: "from-orange-500",
    to: "to-red-600",
    shadow: "shadow-orange-500/25",
  },
  {
    emoji: "🧭",
    title: "Компас Киблы",
    desc: "Направление на Мекку в реальном времени",
    path: "/qibla",
    from: "from-sky-500",
    to: "to-cyan-600",
    shadow: "shadow-sky-500/25",
  },
  {
    emoji: "🎧",
    title: "Слушай Коран",
    desc: "Аудио всех 114 сур с переводом",
    path: "/quran",
    from: "from-violet-500",
    to: "to-purple-600",
    shadow: "shadow-violet-500/25",
  },
  {
    emoji: "🧠",
    title: "Викторина по Исламу",
    desc: "Проверь знания и соревнуйся с друзьями",
    path: "/quiz",
    from: "from-fuchsia-500",
    to: "to-pink-600",
    shadow: "shadow-fuchsia-500/25",
  },
  {
    emoji: "📖",
    title: "25 историй пророков",
    desc: "От Адама до Мухаммада ﷺ",
    path: "/prophets",
    from: "from-emerald-500",
    to: "to-teal-600",
    shadow: "shadow-emerald-500/25",
  },
];

function FeatureBanner() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDirection("left");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % FEATURE_SLIDES.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoPlay]);

  const goTo = useCallback(
    (index: number) => {
      if (isAnimating || index === current) return;
      setDirection(index > current ? "left" : "right");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrent(index);
        setIsAnimating(false);
      }, 300);
      startAutoPlay();
    },
    [current, isAnimating, startAutoPlay],
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    const delta = touchDeltaX.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) {
        // свайп влево — следующий
        const next = (current + 1) % FEATURE_SLIDES.length;
        goTo(next);
      } else {
        // свайп вправо — предыдущий
        const prev =
          (current - 1 + FEATURE_SLIDES.length) % FEATURE_SLIDES.length;
        goTo(prev);
      }
    }
  };

  const slide = FEATURE_SLIDES[current];

  return (
    <div className="relative">
      {/* Banner card */}
      <button
        onClick={() => navigate(slide.path)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full rounded-2xl bg-gradient-to-br ${slide.from} ${slide.to} p-4 shadow-lg ${slide.shadow} overflow-hidden relative text-left transition-all duration-200 active:scale-[0.98]`}
        style={{ minHeight: 88 }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/8 rounded-full blur-lg pointer-events-none" />

        {/* Content */}
        <div
          className={`flex items-center gap-3.5 transition-all duration-300 ${
            isAnimating
              ? direction === "left"
                ? "opacity-0 -translate-x-4"
                : "opacity-0 translate-x-4"
              : "opacity-100 translate-x-0"
          }`}
        >
          <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/10">
            <span className="text-2xl">{slide.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white leading-tight">
              {slide.title}
            </h3>
            <p className="text-xs text-white/75 mt-0.5">{slide.desc}</p>
            <p className="text-[10px] text-white/45 mt-1 flex items-center gap-1">
              Нажми, чтобы открыть
              <ChevronRight size={10} />
            </p>
          </div>
        </div>
      </button>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 mt-2.5">
        {FEATURE_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "w-5 h-1.5 bg-emerald-400"
                : "w-1.5 h-1.5 bg-white/20 hover:bg-white/35"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Welcome Modal (first visit)
// ---------------------------------------------------------------------------

function WelcomeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-5 bg-gradient-to-b from-slate-900 via-[#0d1117] to-black animate-fade-in overflow-auto">
      {/* Decorative glow */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm space-y-6 relative z-10">
        {/* Logo + Brand */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 border border-emerald-400/20">
            <span className="text-4xl">☪️</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            IMAN
          </h1>
          <p className="text-white/40 text-xs mt-1">by Aziz Atavaliev</p>
          <p className="text-emerald-400/80 text-sm mt-3 font-medium">
            Ас-саляму алейкум! Добро пожаловать
          </p>
        </div>

        {/* Features */}
        <div className="glass-card p-4 space-y-2.5">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">
            Что внутри
          </p>
          {[
            { emoji: "🕌", text: "Трекер 5 намазов с напоминаниями" },
            { emoji: "📖", text: "Коран с переводом и заучиванием" },
            { emoji: "📿", text: "Зикры, дуа и стена мольб" },
            { emoji: "🌙", text: "Трекер Рамадана и хадисы дня" },
            { emoji: "🧠", text: "Викторина и 30 историй Ислама" },
            { emoji: "🏆", text: "Саваб — зарабатывай награду за ибадат" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <span className="text-base">{item.emoji}</span>
              </div>
              <span className="text-white/70 text-sm">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Telegram CTA */}
        <a
          href="https://t.me/iman_app_official"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2AABEE]/15 border border-[#2AABEE]/30 text-[#2AABEE] text-sm font-medium hover:bg-[#2AABEE]/25 transition-all active:scale-[0.97]"
        >
          <span className="text-lg">✈️</span>
          Подпишись на наш Telegram-канал
        </a>

        {/* Start button */}
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl text-base font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white transition-all active:scale-[0.97] shadow-xl shadow-emerald-500/25"
        >
          Начать путь к Аллаху
        </button>

        <p className="text-center text-white/20 text-[10px]">
          Включите уведомления, чтобы не пропускать намазы
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const audio = useAudio();

  // Favorites count state
  const [favoritesCount, setFavoritesCount] = useState(0);

  // Leaderboard preview
  const [leaderTop, setLeaderTop] = useState<
    {
      name: string;
      totalPoints: number;
      rank: number;
      streak: number;
      telegram_id: string;
    }[]
  >([]);
  const [myRank, setMyRank] = useState<{
    rank: number;
    totalPoints: number;
  } | null>(null);
  const [totalUsersCount, setTotalUsersCount] = useState(0);

  // Points info modal
  const [showPointsInfo, setShowPointsInfo] = useState(false);

  // Welcome modal state
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem("iman_welcome_shown");
  });

  const dismissWelcome = () => {
    localStorage.setItem("iman_welcome_shown", "1");
    setShowWelcome(false);
  };

  // Sawab info modal
  const [showSawabInfo, setShowSawabInfo] = useState(false);

  // Global search
  const [showSearch, setShowSearch] = useState(false);

  // Core state
  const [profile, setProfile] = useState<UserProfile>(storage.getProfile());
  const [todayStats, setTodayStats] = useState<TodayStats>(
    storage.getTodayStats(),
  );
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [nextPrayer, setNextPrayer] =
    useState<ReturnType<typeof findNextPrayer>>(null);
  const [countdown, setCountdown] = useState<string>("--:--:--");
  const [hadith] = useState<Hadith>(getHadithOfDay());
  const [loading, setLoading] = useState(true);

  // Prayer & Habit logs for today
  const todayKey = toDateKey();
  const [prayerLog, setPrayerLog] = useState(() =>
    storage.getPrayerLog(todayKey),
  );
  const [habitLog, setHabitLog] = useState<HabitLog>(() =>
    storage.getHabitLog(todayKey),
  );

  // Animation state
  const [celebrating, setCelebrating] = useState(false);
  const [floatingPts, setFloatingPts] = useState<{
    id: string;
    points: number;
  } | null>(null);

  // Community stats (from /health)
  const [communityUsers, setCommunityUsers] = useState(0);
  useEffect(() => {
    fetch("/health")
      .then((r) => r.json())
      .then((d) => setCommunityUsers(d.subscribers || d.users || 0))
      .catch(() => {});
  }, []);

  // Weekly data
  const [weekDates] = useState<Date[]>(getWeekDates);

  const greeting = getGreeting();
  const currentLevel = getCurrentLevel(profile.totalPoints);
  const nextLevel = LEVELS.find((l) => l.minPoints > profile.totalPoints);
  const currentLevelIndex = LEVELS.findIndex(
    (l) => l.name === currentLevel.name,
  );
  const prevLevel =
    currentLevelIndex > 0 ? LEVELS[currentLevelIndex - 1] : null;

  // Level progress
  const levelProgressPct = nextLevel
    ? Math.min(
        100,
        ((profile.totalPoints - currentLevel.minPoints) /
          (nextLevel.minPoints - currentLevel.minPoints)) *
          100,
      )
    : 100;

  // ---------- Refresh all local data ----------
  const refreshAll = useCallback(() => {
    setProfile(storage.getProfile());
    setTodayStats(storage.getTodayStats());
    setPrayerLog(storage.getPrayerLog(todayKey));
    setHabitLog(storage.getHabitLog(todayKey));
  }, [todayKey]);

  // ---------- Cleanup old logs + daily bonus AFTER sync completes ----------
  useEffect(() => {
    function runAfterSync() {
      storage.cleanupOldLogs();
      if (storage.checkDailyBonus()) {
        setProfile(storage.getProfile());
      }
    }
    if (isSyncDone()) {
      runAfterSync();
    } else {
      const handler = () => runAfterSync();
      window.addEventListener("iman-sync-done", handler, { once: true });
      return () => window.removeEventListener("iman-sync-done", handler);
    }
  }, []);

  // ---------- Fetch prayer times ----------
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const lat = profile.lat ?? DEFAULT_LAT;
        const lng = profile.lng ?? DEFAULT_LNG;
        const times = await getPrayerTimes(lat, lng);
        if (cancelled) return;
        setPrayerTimes(times);
        setNextPrayer(findNextPrayer(times));
      } catch (err) {
        console.error("Failed to load prayer times:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [profile.lat, profile.lng]);

  // ---------- Fetch leaderboard top-5 + my rank ----------
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/leaderboard");
        if (cancelled || !res.ok) return;
        const data = await res.json();
        const users = data.users || [];
        setLeaderTop(users.slice(0, 5));
        setTotalUsersCount(data.totalUsers || users.length);
        const tgUser = getTelegramUser();
        if (tgUser?.id) {
          const me = users.find(
            (u: { telegram_id: string }) =>
              String(u.telegram_id) === String(tgUser.id),
          );
          if (me) setMyRank({ rank: me.rank, totalPoints: me.totalPoints });
        }
      } catch {}
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Count favorites ----------
  useEffect(() => {
    const bookmarks = storage.getQuranBookmarks().length;
    const hadiths = storage.getFavoriteHadiths().length;
    let duas = 0;
    try {
      const raw = localStorage.getItem("iman_favorite_duas");
      if (raw) duas = (JSON.parse(raw) as number[]).length;
    } catch {}
    setFavoritesCount(bookmarks + hadiths + duas);
  }, []);

  // ---------- Countdown timer ----------
  useEffect(() => {
    if (!nextPrayer) return;
    function tick() {
      if (!nextPrayer) return;
      const now = new Date();
      const diffMs = nextPrayer.date.getTime() - now.getTime();
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));
      setCountdown(formatCountdown(diffSec));
      if (diffSec <= 0 && prayerTimes) {
        setNextPrayer(findNextPrayer(prayerTimes));
      }
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextPrayer, prayerTimes]);

  // ---------- Refresh on focus ----------
  useEffect(() => {
    function handleFocus() {
      refreshAll();
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshAll]);

  // ---------- Is next prayer already marked? ----------
  const nextPrayerAlreadyDone = useMemo(() => {
    if (!nextPrayer) return false;
    const entry = prayerLog.prayers[nextPrayer.key];
    return entry.status === "ontime" || entry.status === "late";
  }, [nextPrayer, prayerLog]);

  // ---------- Mark prayer as done from dashboard ----------
  const markPrayerDone = useCallback(
    (prayerKey: PrayerKey) => {
      const currentLog = storage.getPrayerLog(todayKey);
      const currentStatus = currentLog.prayers[prayerKey].status;

      // Already marked? do nothing on dashboard (go to /prayers for full control)
      if (currentStatus === "ontime" || currentStatus === "late") return;

      // Auto-determine on-time vs late
      if (!prayerTimes) return;
      const apiKey = PRAYER_KEY_TO_API[prayerKey];
      const timeStr = prayerTimes[apiKey];
      const diffMinutes = getMinutesSincePrayer(timeStr);

      // Block if prayer time hasn't arrived yet
      if (diffMinutes !== null && diffMinutes < 0) return;

      let status: "ontime" | "late" = "ontime";
      if (diffMinutes !== null && diffMinutes > 30) {
        status = "late";
      }

      currentLog.prayers[prayerKey] = {
        status,
        timestamp: new Date().toISOString(),
      };

      const pts =
        status === "ontime" ? POINTS.PRAYER_ONTIME : POINTS.PRAYER_LATE;
      storage.setPrayerLog(todayKey, currentLog.prayers);
      storage.updateStreak();
      storage.recalculateTotalPoints();

      // Track analytics
      trackAction("prayer_marked", { prayer: prayerKey, status });

      // Haptic + Animations
      hapticSuccess();
      setCelebrating(true);
      setFloatingPts({ id: `prayer-${prayerKey}-${Date.now()}`, points: pts });
      setTimeout(() => setFloatingPts(null), 1300);

      refreshAll();
    },
    [todayKey, prayerTimes, refreshAll],
  );

  // ---------- Toggle habit ----------
  const toggleHabit = useCallback(
    (habit: HabitDef) => {
      const currentHabitLog = storage.getHabitLog(todayKey);
      const newValue = !currentHabitLog[habit.key];
      const updatedHabits: Omit<HabitLog, "date"> = {
        quran: currentHabitLog.quran,
        azkar_morning: currentHabitLog.azkar_morning,
        azkar_evening: currentHabitLog.azkar_evening,
        charity: currentHabitLog.charity,
        fasting: currentHabitLog.fasting,
        dua: currentHabitLog.dua,
        [habit.key]: newValue,
      };

      storage.setHabitLog(todayKey, updatedHabits);
      storage.recalculateTotalPoints();

      if (newValue) {
        hapticImpact("light");
        setFloatingPts({
          id: `habit-${habit.key}-${Date.now()}`,
          points: habit.points,
        });
        setTimeout(() => setFloatingPts(null), 1300);
      }

      refreshAll();
    },
    [todayKey, refreshAll],
  );

  // ---------- Build activity feed ----------
  const activityItems: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    // Prayers
    for (const pk of PRAYER_KEYS) {
      const entry = prayerLog.prayers[pk];
      const apiKey = PRAYER_KEY_TO_API[pk];

      let status: ActivityItem["status"] = "none";
      let earnedPts = 0;
      if (entry.status === "ontime") {
        status = "done";
        earnedPts = POINTS.PRAYER_ONTIME;
      } else if (entry.status === "late") {
        status = "done";
        earnedPts = POINTS.PRAYER_LATE;
      } else if (entry.status === "missed") {
        status = "missed";
      } else {
        // Check if prayer time has passed
        if (prayerTimes) {
          const diff = getMinutesSincePrayer(prayerTimes[apiKey]);
          if (diff !== null && diff > 0) {
            status = "none";
          } else {
            status = "pending";
          }
        } else {
          status = "pending";
        }
      }

      items.push({
        type: "prayer",
        key: pk,
        label: PRAYER_NAMES_MAP[apiKey],
        emoji: PRAYER_ICONS[pk],
        status,
        points: POINTS.PRAYER_ONTIME,
        earnedPoints: earnedPts,
      });
    }

    // Habits
    for (const h of HABITS) {
      const done = habitLog[h.key];
      items.push({
        type: "habit",
        key: h.key,
        label: h.label,
        emoji: h.emoji,
        status: done ? "done" : "none",
        points: h.points,
        earnedPoints: done ? h.points : 0,
      });
    }

    return items;
  }, [prayerLog, habitLog, prayerTimes]);

  // ---------- Stats ----------
  const streak = profile.streak;
  const longestStreak = profile.longestStreak;
  const prayersCompleted = todayStats.prayersCompleted;
  const habitsCompleted = todayStats.habitsCompleted;
  const pointsEarned = todayStats.pointsEarned;
  const overallPct = MAX_DAILY_POINTS > 0 ? pointsEarned / MAX_DAILY_POINTS : 0;

  // ---------- Weekly bar data ----------
  const weeklyBarData = useMemo(() => {
    const todayStr = toDateKey();
    return weekDates.map((d, i) => {
      const key = toDateKey(d);
      const pts = getDayPoints(key);
      const isToday = key === todayStr;
      const isFuture = key > todayStr;
      return {
        date: key,
        dayLabel: DAY_LABELS[i],
        points: pts,
        isToday,
        isFuture,
      };
    });
  }, [weekDates, todayStats]);

  const maxWeekPoints = Math.max(...weeklyBarData.map((d) => d.points), 1);

  // Filter completed items for activity feed
  const completedItems = activityItems.filter((item) => item.status === "done");

  // =======================================================================
  // RENDER - NEW LAYOUT ORDER
  // =======================================================================

  return (
    <div className="min-h-screen pb-8 px-4 pt-6 max-w-lg mx-auto space-y-5 animate-fade-in">
      {/* Welcome modal (first visit) */}
      {showWelcome && <WelcomeModal onClose={dismissWelcome} />}

      {/* Sawab info modal */}
      {showSawabInfo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSawabInfo(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-secondary)",
            }}
          >
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/30">
                  <span className="text-3xl font-black text-white">С</span>
                </div>
                <h2 className="text-xl font-bold text-white">Саваб-коины</h2>
                <p className="text-xs text-white/40 mt-1">
                  Ваша духовная валюта
                </p>
              </div>

              {/* Explanation */}
              <div className="space-y-3 text-[13px] text-white/60 leading-relaxed">
                <p>
                  <span className="text-amber-400 font-semibold">Саваб</span>{" "}
                  (ثواب) — в исламе это награда от Аллаха за благие деяния. В
                  приложении IMAN саваб-коины отражают вашу ежедневную
                  активность в ибадате.
                </p>
                <div className="glass-card p-3 space-y-2">
                  <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">
                    Как заработать
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: "🕌", text: "Намаз вовремя", pts: "+10" },
                      { icon: "📖", text: "Чтение Корана", pts: "+5" },
                      { icon: "📿", text: "Зикры", pts: "+3" },
                      { icon: "🧠", text: "Викторина", pts: "+8" },
                      { icon: "🤲", text: "Дуа", pts: "+3" },
                      { icon: "⏰", text: "Помодоро", pts: "+5" },
                    ].map((item) => (
                      <div
                        key={item.text}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <span>{item.icon}</span>
                        <span className="text-white/50 flex-1">
                          {item.text}
                        </span>
                        <span className="text-emerald-400 font-semibold">
                          {item.pts}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-white/30 italic text-center">
                  Чем больше саваба — тем выше ваш уровень имана
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowSawabInfo(false)}
                className="w-full py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-white transition-all active:scale-[0.97] shadow-lg shadow-amber-500/30"
              >
                Понятно!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebration overlay */}
      {celebrating && <CelebrationBurst onDone={() => setCelebrating(false)} />}

      {/* ================================================================ */}
      {/* 1. HEADER                                                        */}
      {/* ================================================================ */}
      <header className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/50">
            {greeting.sub}
            {profile.name ? `, ${profile.name}` : ""} ☪️
          </p>
          <h1 className="text-base font-bold text-white leading-snug mt-0.5 truncate">
            {greeting.headline}
          </h1>
        </div>
        <button
          onClick={() => setShowSearch(true)}
          className="w-9 h-9 rounded-xl glass-card flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shrink-0 ml-2"
          title="Поиск"
        >
          <Search size={16} className="text-white/50" />
        </button>
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-1.5 glass-card px-3 py-1.5 text-xs font-medium text-amber-400 hover:scale-105 active:scale-95 transition-transform shrink-0 ml-1.5"
        >
          <span>{currentLevel.icon}</span>
          <span>{currentLevel.name}</span>
        </button>
      </header>

      {/* ================================================================ */}
      {/* 1.5 FEATURE BANNER CAROUSEL                                      */}
      {/* ================================================================ */}
      <FeatureBanner />

      {/* ================================================================ */}
      {/* 1.6 DUA WALL PROMO (с счётчиком пользователей)                   */}
      {/* ================================================================ */}
      {communityUsers > 0 && (
        <button
          onClick={() => navigate("/dua-wall")}
          className="w-full glass-card p-4 flex items-center gap-3.5 hover:scale-[1.01] active:scale-[0.99] transition-transform relative overflow-hidden"
        >
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/30 to-pink-500/20 border border-rose-500/20 flex items-center justify-center shrink-0">
            <span className="text-xl">{"\u{1F932}"}</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h3 className="text-sm font-bold text-white">Стена дуа</h3>
            <p className="text-xs text-white/50 mt-0.5">
              Анонимные мольбы мусульман
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-rose-500/15 px-2.5 py-1 rounded-full border border-rose-500/20 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            <span className="text-xs font-bold text-rose-400 tabular-nums">
              {communityUsers}
            </span>
            <span className="text-[10px] text-rose-400/60">чел.</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
        </button>
      )}

      {/* ================================================================ */}
      {/* 2. ДВЕ БОЛЬШИЕ КНОПКИ (Инструкция + Новичкам)                   */}
      {/* ================================================================ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Большая кнопка "Инструкция" — первый */}
        <Link
          to="/guide"
          className="col-span-1 h-28 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 flex flex-col justify-between shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          <Info className="w-8 h-8 text-white" strokeWidth={2} />
          <div>
            <h3 className="text-base font-bold text-white">Инструкция</h3>
            <p className="text-xs text-white/80 mt-0.5">Как пользоваться</p>
          </div>
        </Link>

        {/* Большая кнопка "Новичкам" — второй */}
        <Link
          to="/beginners"
          className="col-span-1 h-28 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 flex flex-col justify-between shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          <GraduationCap className="w-8 h-8 text-white" strokeWidth={2} />
          <div>
            <h3 className="text-base font-bold text-white">Новичкам</h3>
            <p className="text-xs text-white/80 mt-0.5">Начните здесь</p>
          </div>
        </Link>
      </div>

      {/* ================================================================ */}
      {/* 3. DAILY SCORE + LEVEL (компактно в одну строку)                */}
      {/* ================================================================ */}
      <div className="glass-card p-4 flex items-center gap-4">
        {/* Daily Score Ring — нажми для объяснения */}
        <button
          onClick={() => setShowSawabInfo(true)}
          className="active:scale-95 transition-transform"
        >
          <DailyProgressRing
            earned={pointsEarned}
            possible={MAX_DAILY_POINTS}
            size={90}
          />
        </button>

        {/* Stats + Level */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">
              Сегодня
            </p>
            <p className="text-base font-semibold text-white">
              {pointsEarned}
              <span className="t-text-f font-normal text-sm">
                /{MAX_DAILY_POINTS}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
              <span className="text-sm">{currentLevel.icon}</span>
              <span className="text-xs font-semibold text-emerald-400">
                {currentLevel.name}
              </span>
            </div>
            <div className="flex-1 h-1.5 t-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-emerald-500 to-emerald-400"
                style={{ width: `${levelProgressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 4. NEXT PRAYER TIMER                                             */}
      {/* ================================================================ */}
      <div className="glass-card glow-green p-5 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : nextPrayer ? (
          <>
            <div className="flex items-center gap-2 text-emerald-400/70 text-xs font-medium uppercase tracking-widest mb-3">
              <Clock size={14} />
              <span>Следующий намаз</span>
            </div>

            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold text-white">
                  {nextPrayer.russianName}
                </h2>
                <p className="text-lg t-text-s mt-1">{nextPrayer.time}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/40 mb-1">через</p>
                <p className="text-2xl font-mono font-bold text-emerald-400 tabular-nums tracking-tight">
                  {countdown}
                </p>
              </div>
            </div>

            {/* "Прочитал" button */}
            {nextPrayerAlreadyDone ? (
              <div className="w-full py-3 rounded-2xl text-sm font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center gap-2 cursor-default">
                <Check size={18} strokeWidth={2.5} />
                Прочитано
              </div>
            ) : (
              <button
                onClick={() => markPrayerDone(nextPrayer.key)}
                className="w-full py-3 rounded-2xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-white transition-all duration-200 active:scale-[0.97] shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
              >
                <Check size={18} strokeWidth={2.5} />
                Прочитал
              </button>
            )}
          </>
        ) : (
          <p className="t-text-m text-sm text-center py-4">
            Не удалось загрузить время намазов
          </p>
        )}
      </div>

      {/* ================================================================ */}
      {/* 4.5 PRAYER STATUS BAR (все 5 намазов мини)                      */}
      {/* ================================================================ */}
      {prayerTimes && (
        <div className="glass-card p-3">
          <div className="flex items-center justify-between gap-1">
            {PRAYER_KEYS.map((pk) => {
              const apiKey = PRAYER_KEY_TO_API[pk];
              const entry = prayerLog.prayers[pk];
              const timeStr =
                prayerTimes[apiKey]?.replace(/\s*\(.*\)/, "").trim() || "";
              const isDone =
                entry.status === "ontime" || entry.status === "late";
              const isMissed = entry.status === "missed";
              const isNext = nextPrayer?.key === pk;
              const diff = getMinutesSincePrayer(prayerTimes[apiKey] || "");
              const notYet = diff !== null && diff < 0;

              return (
                <button
                  key={pk}
                  onClick={() => {
                    if (!isDone && !isMissed && !notYet) markPrayerDone(pk);
                  }}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-200 ${
                    isDone
                      ? "bg-emerald-500/15 border border-emerald-500/25"
                      : isMissed
                        ? "bg-red-500/10 border border-red-500/20"
                        : notYet
                          ? "opacity-30 t-bg border t-border-s"
                          : isNext
                            ? "bg-amber-500/10 border border-amber-500/25 ring-1 ring-amber-500/20"
                            : "t-bg border t-border-s"
                  }`}
                >
                  <span className="text-xs">{PRAYER_ICONS[pk]}</span>
                  <span
                    className={`text-[10px] font-semibold ${
                      isDone
                        ? "text-emerald-400"
                        : isMissed
                          ? "text-red-400"
                          : notYet
                            ? "text-white/20"
                            : isNext
                              ? "text-amber-400"
                              : "text-white/50"
                    }`}
                  >
                    {PRAYER_NAMES_MAP[apiKey]?.slice(0, 3)}
                  </span>
                  <span className="text-[9px] text-white/30 tabular-nums">
                    {timeStr}
                  </span>
                  {isDone && <Check size={10} className="text-emerald-400" />}
                  {isMissed && <X size={10} className="text-red-400" />}
                  {notYet && !isDone && !isMissed && (
                    <Lock size={9} className="text-white/20" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 4.6 RAMADAN BLOCK (countdown or progress)                        */}
      {/* ================================================================ */}
      {(() => {
        const RAMADAN_START = new Date(2026, 1, 19); // Feb 19, 2026
        const RAMADAN_END = new Date(2026, 2, 20); // Mar 20, 2026
        const now = new Date();
        const isBeforeRamadan = now < RAMADAN_START;
        const isDuringRamadan = now >= RAMADAN_START && now <= RAMADAN_END;

        if (!isBeforeRamadan && !isDuringRamadan) return null;

        const daysUntil = isBeforeRamadan
          ? Math.ceil(
              (RAMADAN_START.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            )
          : 0;
        const currentDay = isDuringRamadan
          ? Math.min(
              30,
              Math.ceil(
                (now.getTime() - RAMADAN_START.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : 0;

        return (
          <Link
            to="/ramadan"
            className="glass-card glow-green p-4 flex items-center gap-4 hover:scale-[1.01] active:scale-[0.99] transition-transform"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <CalendarDays className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white">
                {isBeforeRamadan
                  ? "Рамадан 2026"
                  : `Рамадан — день ${currentDay}/30`}
              </h3>
              <p className="text-sm text-white/50 mt-0.5">
                {isBeforeRamadan
                  ? `Через ${daysUntil} ${daysUntil === 1 ? "день" : daysUntil >= 2 && daysUntil <= 4 ? "дня" : "дней"} — 19 февраля`
                  : "Откройте трекер поста и целей"}
              </p>
              {isDuringRamadan && (
                <div className="mt-2 w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${(currentDay / 30) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-white/20 shrink-0" />
          </Link>
        );
      })()}

      {/* ================================================================ */}
      {/* 5. QUICK ACTIONS — по категориям                                */}
      {/* ================================================================ */}
      {[
        {
          title: "Намаз и поклонение",
          emoji: "🕌",
          items: [
            {
              icon: Moon,
              label: "Намазы",
              path: "/prayers",
              color: "text-emerald-300",
              grad: "from-emerald-600/40 to-emerald-500/20",
            },
            {
              icon: Landmark,
              label: "Гид по намазу",
              path: "/namaz-guide",
              color: "text-indigo-300",
              grad: "from-indigo-600/40 to-indigo-500/20",
            },
            {
              icon: Heart,
              label: "Дуа",
              path: "/dua",
              color: "text-pink-300",
              grad: "from-pink-600/40 to-pink-500/20",
            },
            {
              icon: Repeat,
              label: "Зикры",
              path: "/dhikr",
              color: "text-teal-300",
              grad: "from-teal-600/40 to-teal-500/20",
            },
            {
              icon: CalendarDays,
              label: "Рамадан",
              path: "/ramadan",
              color: "text-emerald-200",
              grad: "from-emerald-600/40 to-teal-500/20",
            },
            {
              icon: Calculator,
              label: "Закят",
              path: "/zakat",
              color: "text-green-300",
              grad: "from-green-600/40 to-green-500/20",
            },
          ],
        },
        {
          title: "Коран и знания",
          emoji: "📖",
          items: [
            {
              icon: BookOpen,
              label: "Коран",
              path: "/quran",
              color: "text-sky-300",
              grad: "from-sky-600/40 to-sky-500/20",
            },
            {
              icon: Headphones,
              label: "Заучивание",
              path: "/memorize",
              color: "text-violet-300",
              grad: "from-violet-600/40 to-violet-500/20",
            },
            {
              icon: Bookmark,
              label: "Рекомендации",
              path: "/recommended",
              color: "text-amber-200",
              grad: "from-amber-600/40 to-amber-400/20",
            },
            {
              icon: Quote,
              label: "Хадисы",
              path: "/hadiths",
              color: "text-amber-300",
              grad: "from-amber-600/40 to-amber-500/20",
            },
            {
              icon: Star,
              label: "99 имён",
              path: "/names",
              color: "text-purple-300",
              grad: "from-purple-600/40 to-purple-500/20",
            },
          ],
        },
        {
          title: "Истории и сира",
          emoji: "📜",
          items: [
            {
              icon: Scroll,
              label: "Сира пророка",
              path: "/seerah",
              color: "text-rose-300",
              grad: "from-rose-600/40 to-rose-500/20",
            },
            {
              icon: BookOpen,
              label: "Пророки",
              path: "/prophets",
              color: "text-emerald-300",
              grad: "from-emerald-600/40 to-emerald-500/20",
            },
            {
              icon: Users,
              label: "Истории",
              path: "/stories",
              color: "text-cyan-300",
              grad: "from-cyan-600/40 to-cyan-500/20",
            },
          ],
        },
        {
          title: "Развитие и прогресс",
          emoji: "🏆",
          items: [
            {
              icon: Brain,
              label: "Викторина",
              path: "/quiz",
              color: "text-orange-300",
              grad: "from-orange-600/40 to-orange-500/20",
            },
            {
              icon: Target,
              label: "Привычки",
              path: "/habits",
              color: "text-rose-300",
              grad: "from-rose-600/40 to-rose-500/20",
            },
            {
              icon: Timer,
              label: "Помидоро",
              path: "/ibadah",
              color: "text-cyan-300",
              grad: "from-cyan-600/40 to-cyan-500/20",
            },
            {
              icon: BarChart3,
              label: "Статистика",
              path: "/stats",
              color: "text-lime-300",
              grad: "from-lime-600/40 to-lime-500/20",
            },
          ],
        },
        {
          title: "Сообщество",
          emoji: "🤲",
          items: [
            {
              icon: Heart,
              label: "Стена дуа",
              path: "/dua-wall",
              color: "text-rose-300",
              grad: "from-rose-600/40 to-rose-500/20",
            },
          ],
        },
      ].map((section) => (
        <div key={section.title}>
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <span className="text-sm">{section.emoji}</span>
            <h3 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
              {section.title}
            </h3>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {section.items.map(({ icon: Icon, label, path, color, grad }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="glass-card p-3 flex flex-col items-center gap-2 hover:scale-105 active:scale-95 transition-transform border border-white/[0.06]"
              >
                <div
                  className={`bg-gradient-to-br ${grad} w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg`}
                >
                  <Icon size={22} className={color} />
                </div>
                <span className="text-[10px] text-white/80 font-medium text-center leading-tight line-clamp-2 px-0.5">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* ================================================================ */}
      {/* 6. ACTIVITY TODAY (компактно, без времени, только выполненные)   */}
      {/* ================================================================ */}
      {completedItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
              Активность сегодня
            </h3>
            <span className="text-[10px] text-white/20">
              {completedItems.length} выполнено
            </span>
          </div>

          <div className="space-y-1.5">
            {completedItems.slice(0, 8).map((item) => (
              <ActivityRow
                key={item.key}
                item={item}
                onTap={() => {
                  if (item.type === "prayer") {
                    navigate("/prayers");
                  } else {
                    const habit = HABITS.find((h) => h.key === item.key);
                    if (habit) toggleHabit(habit);
                  }
                }}
                floatingPts={
                  floatingPts && floatingPts.id.includes(item.key)
                    ? floatingPts
                    : null
                }
                onClearFloat={() => setFloatingPts(null)}
              />
            ))}
          </div>

          {completedItems.length > 8 && (
            <button
              onClick={() => navigate("/stats")}
              className="w-full py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Показать все ({completedItems.length})
            </button>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* 7. STREAK (полоска прогресса)                                    */}
      {/* ================================================================ */}
      <div className="glass-card p-4 relative overflow-hidden">
        {streak > 7 && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`relative flex items-center justify-center w-12 h-12 rounded-xl ${
                streak > 7
                  ? "bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-amber-500/30"
                  : streak > 0
                    ? "bg-amber-500/10 border border-amber-500/20"
                    : "t-bg border t-border"
              }`}
            >
              <Flame
                size={26}
                className={
                  streak > 7
                    ? "text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                    : streak > 0
                      ? "text-amber-400/70"
                      : "text-white/20"
                }
                fill={streak > 0 ? "currentColor" : "none"}
              />
            </div>
            <div>
              <p className="text-2xl font-bold text-white tabular-nums leading-none">
                {streak}
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                {streak === 1
                  ? "день подряд"
                  : streak >= 2 && streak <= 4
                    ? "дня подряд"
                    : "дней подряд"}
              </p>
            </div>
          </div>
          {longestStreak > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-white/30 uppercase tracking-wider">
                Рекорд
              </p>
              <p className="text-lg font-bold text-amber-400/60 tabular-nums">
                {longestStreak}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar to next level */}
        {nextLevel && (
          <div className="mt-4 pt-3 border-t t-border">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-white/30">
                {profile.totalPoints.toLocaleString()} саваб
              </p>
              <p className="text-[10px] text-white/20">
                Ещё{" "}
                {(nextLevel.minPoints - profile.totalPoints).toLocaleString()}{" "}
                до <span className="text-amber-400/40">{nextLevel.name}</span>
              </p>
            </div>
            <div className="w-full h-1.5 t-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-emerald-500 to-emerald-400"
                style={{ width: `${levelProgressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* 7.5 LEADERBOARD SECTION                                          */}
      {/* ================================================================ */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

        {/* Header with CTA */}
        <div className="text-center mb-4">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-amber-500/20 border border-yellow-500/30 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-yellow-400" />
          </div>
          <h3 className="text-lg font-bold text-white">
            Ворвитесь в топ лидеров!
          </h3>
          <p className="text-xs text-white/40 mt-1">
            Делайте ибадаты и соревнуйтесь в благом
          </p>
        </div>

        {/* Top-5 list */}
        {leaderTop.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {leaderTop.map((user, idx) => {
              const medals = ["🥇", "🥈", "🥉"];
              const isMe =
                String(user.telegram_id) === String(getTelegramUser()?.id || 0);
              return (
                <div
                  key={user.telegram_id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${
                    isMe
                      ? "bg-emerald-500/15 border border-emerald-500/30"
                      : "bg-white/[0.03] border border-white/5"
                  }`}
                >
                  <span className="text-base w-6 text-center shrink-0">
                    {idx < 3 ? (
                      medals[idx]
                    ) : (
                      <span className="text-xs font-bold text-white/30">
                        #{user.rank}
                      </span>
                    )}
                  </span>
                  <p
                    className={`text-sm font-medium flex-1 truncate ${isMe ? "text-emerald-400" : "text-white/70"}`}
                  >
                    {user.name}
                    {isMe && (
                      <span className="text-[10px] text-emerald-400/50 ml-1">
                        (Вы)
                      </span>
                    )}
                  </p>
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      idx === 0
                        ? "text-yellow-400"
                        : idx === 1
                          ? "text-gray-300"
                          : idx === 2
                            ? "text-amber-600"
                            : "text-white/40"
                    }`}
                  >
                    {user.totalPoints.toLocaleString()}
                  </span>
                  {user.streak > 0 && (
                    <span className="text-[10px]">🔥{user.streak}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* My rank (if not in top-5) */}
        {myRank && myRank.rank > 5 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 py-1.5">
              <div className="flex-1 border-t border-dashed border-white/10" />
              <span className="text-[10px] text-white/25">Ваша позиция</span>
              <div className="flex-1 border-t border-dashed border-white/10" />
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <span className="text-xs font-bold text-white/40 w-6 text-center">
                #{myRank.rank}
              </span>
              <p className="text-sm font-medium flex-1 text-emerald-400">
                {profile.name || "Вы"}
              </p>
              <span className="text-xs font-bold tabular-nums text-emerald-400">
                {myRank.totalPoints.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/leaderboard")}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/25 text-sm font-semibold text-yellow-400 flex items-center justify-center gap-2 hover:from-yellow-500/30 hover:to-amber-500/30 active:scale-[0.97] transition-all"
          >
            <Trophy size={16} />
            Все лидеры ({totalUsersCount})
          </button>
          <button
            onClick={() => setShowPointsInfo(true)}
            className="py-2.5 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-sm font-medium text-white/50 flex items-center justify-center gap-1.5 hover:bg-white/[0.08] active:scale-[0.97] transition-all"
          >
            <Info size={14} />
            Саваб
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* POINTS INFO MODAL                                                */}
      {/* ================================================================ */}
      {showPointsInfo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-5 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowPointsInfo(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-5 py-4 text-center">
              <h2 className="text-lg font-bold text-white">
                Как зарабатывать саваб?
              </h2>
              <p className="text-emerald-100/70 text-xs mt-1">
                Система саваб-коинов IMAN
              </p>
            </div>
            <div className="bg-[#1a1a2e] px-4 py-4 space-y-1.5 max-h-[60vh] overflow-auto">
              {[
                {
                  emoji: "🕌",
                  label: "Намаз вовремя",
                  pts: POINTS.PRAYER_ONTIME,
                },
                {
                  emoji: "🕐",
                  label: "Намаз с опозданием",
                  pts: POINTS.PRAYER_LATE,
                },
                { emoji: "📖", label: "Чтение Корана", pts: POINTS.QURAN },
                { emoji: "📿", label: "Дуа", pts: POINTS.DUA },
                {
                  emoji: "🤲",
                  label: "Азкары (утро/вечер)",
                  pts: POINTS.AZKAR,
                },
                { emoji: "💰", label: "Садака", pts: POINTS.CHARITY },
                { emoji: "🕌", label: "Пост", pts: POINTS.FASTING },
                {
                  emoji: "🧠",
                  label: "Викторина (за ответ)",
                  pts: POINTS.QUIZ_CORRECT,
                },
                {
                  emoji: "📝",
                  label: "Заучивание аятов",
                  pts: POINTS.MEMORIZE_REPEAT,
                },
                {
                  emoji: "⏱️",
                  label: "Ибадат-таймер (за мин.)",
                  pts: POINTS.IBADAH_MINUTE,
                },
                {
                  emoji: "💳",
                  label: "Расчёт закята",
                  pts: POINTS.ZAKAT_LOGGED,
                },
                {
                  emoji: "🌟",
                  label: "Ежедневный бонус",
                  pts: POINTS.DAILY_BONUS,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/[0.03]"
                >
                  <span className="text-base">{item.emoji}</span>
                  <span className="text-sm text-white/70 flex-1">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold text-emerald-400">
                    +{item.pts}
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-[#1a1a2e] px-4 pb-4">
              <button
                onClick={() => setShowPointsInfo(false)}
                className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm active:scale-[0.97] transition-all"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 7.6 FAVORITES CARD                                                */}
      {/* ================================================================ */}
      <div
        className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform"
        onClick={() => navigate("/favorites")}
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/25 flex items-center justify-center shrink-0">
          <Bookmark className="w-6 h-6 text-pink-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white">Избранное</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {favoritesCount > 0
              ? `${favoritesCount} сохранённых — аяты, хадисы, дуа`
              : "Сохраняйте аяты, хадисы и дуа"}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-white/20 shrink-0" />
      </div>

      {/* ================================================================ */}
      {/* 8. HADITH OF THE DAY                                             */}
      {/* ================================================================ */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="absolute -top-8 -left-8 w-32 h-32 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2 text-amber-400/70 text-xs font-medium uppercase tracking-widest mb-4">
          <Quote size={14} />
          <span>Хадис дня</span>
        </div>

        <p className="arabic-text text-xl text-white/90 leading-loose mb-4">
          {hadith.arabic}
        </p>

        <p className="text-sm text-white/70 leading-relaxed mb-4">
          {hadith.russian}
        </p>

        <div className="flex items-center justify-between pt-3 border-t t-border">
          <p className="text-[11px] t-text-f">{hadith.narrator}</p>
          <p className="text-[11px] text-amber-400/40 font-medium">
            {hadith.source}
          </p>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 9. WEEKLY OVERVIEW (график)                                      */}
      {/* ================================================================ */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
            Ваша неделя
          </h3>
          <span className="text-xs text-emerald-400/60 font-medium tabular-nums">
            {weeklyBarData.reduce((s, d) => s + (d.isFuture ? 0 : d.points), 0)}{" "}
            саваб
          </span>
        </div>

        <div
          className="flex items-end justify-between gap-2.5"
          style={{ height: 100 }}
        >
          {weeklyBarData.map((day) => {
            const barHeight = day.isFuture
              ? 0
              : day.points === 0
                ? 4
                : Math.max(8, (day.points / maxWeekPoints) * 72);
            let barBg = "bg-white/6";
            if (!day.isFuture && day.points > 0) {
              if (day.points >= 50)
                barBg = "bg-gradient-to-t from-emerald-600 to-emerald-400";
              else if (day.points >= 20)
                barBg = "bg-gradient-to-t from-amber-600 to-amber-400";
              else barBg = "bg-gradient-to-t from-white/20 to-white/30";
            }

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1.5"
              >
                {/* Points label */}
                <span
                  className={`text-[10px] font-bold tabular-nums ${
                    day.isFuture
                      ? "text-transparent"
                      : day.points >= 50
                        ? "text-emerald-400"
                        : day.points >= 20
                          ? "text-amber-400"
                          : day.points > 0
                            ? "text-white/40"
                            : "text-transparent"
                  }`}
                >
                  {day.points || ""}
                </span>

                {/* Bar */}
                <div
                  className={`w-full max-w-[32px] rounded-lg transition-all duration-700 ease-out ${barBg} ${
                    day.isToday
                      ? "ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20"
                      : ""
                  }`}
                  style={{ height: barHeight }}
                />

                {/* Day label */}
                <span
                  className={`text-[11px] font-semibold ${
                    day.isToday
                      ? "text-emerald-400"
                      : day.isFuture
                        ? "text-white/15"
                        : "text-white/40"
                  }`}
                >
                  {day.dayLabel}
                </span>

                {/* Today indicator */}
                {day.isToday && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 -mt-1 shadow-lg shadow-emerald-400/50" />
                )}
              </div>
            );
          })}
        </div>

        {/* Summary row */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t t-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-emerald-600 to-emerald-400" />
              <span className="text-[10px] text-white/30">Отлично</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-amber-600 to-amber-400" />
              <span className="text-[10px] text-white/30">Хорошо</span>
            </div>
          </div>
          <button
            onClick={() => navigate("/stats")}
            className="text-[10px] text-emerald-400/60 font-medium hover:text-emerald-400 transition-colors flex items-center gap-1"
          >
            Подробнее
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* INLINE KEYFRAME STYLES                                           */}
      {/* ================================================================ */}
      <style>{`
        @keyframes celebration-scale {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes celebration-particle {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes float-up {
          0% { opacity: 0; transform: translateY(8px) scale(0.7); }
          30% { opacity: 1; transform: translateY(-4px) scale(1.15); }
          60% { transform: translateY(-12px) scale(1); }
          100% { opacity: 0; transform: translateY(-24px) scale(0.8); }
        }
        @keyframes streak-flame {
          0%, 100% { transform: scaleY(1) scaleX(1); }
          25% { transform: scaleY(1.15) scaleX(0.9); }
          50% { transform: scaleY(0.95) scaleX(1.05); }
          75% { transform: scaleY(1.1) scaleX(0.95); }
        }
      `}</style>

      {/* Global Search */}
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  );
}
