import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Clock,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Award,
  Zap,
  Target,
  Lock,
} from "lucide-react";
import { storage, POINTS } from "../lib/storage";
import { getPrayerTimes } from "../lib/api";
import type { PrayerStatus } from "../lib/storage";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
type TimeSlotKey = PrayerKey | "sunrise" | "doha";

interface PrayerInfo {
  key: TimeSlotKey;
  name: string;
  icon: string;
  isInfo?: boolean; // true = informational (no tracking)
}

const PRAYERS: PrayerInfo[] = [
  { key: "fajr", name: "Фаджр", icon: "🌅" },
  { key: "sunrise", name: "Восход", icon: "☀️", isInfo: true },
  { key: "doha", name: "Духа", icon: "🌤️", isInfo: true },
  { key: "dhuhr", name: "Зухр", icon: "🕐" },
  { key: "asr", name: "Аср", icon: "🌤️" },
  { key: "maghrib", name: "Магриб", icon: "🌇" },
  { key: "isha", name: "Иша", icon: "🌙" },
];

const DAY_ABBRS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

const HIJRI_MONTHS: Record<number, string> = {
  1: "Мухаррам",
  2: "Сафар",
  3: "Раби аль-Авваль",
  4: "Раби ас-Сани",
  5: "Джумада аль-Уля",
  6: "Джумада ас-Сания",
  7: "Раджаб",
  8: "Шаабан",
  9: "Рамадан",
  10: "Шавваль",
  11: "Зуль-Каада",
  12: "Зуль-Хиджа",
};

const GREGORIAN_MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

// Default coordinates: Bishkek
const DEFAULT_LAT = 42.8746;
const DEFAULT_LNG = 74.5698;

// ---------------------------------------------------------------------------
// Hijri Date
// ---------------------------------------------------------------------------

interface HijriDate {
  day: number;
  month: string;
  year: number;
}

async function fetchHijriDate(
  lat: number,
  lng: number,
): Promise<HijriDate | null> {
  try {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;

    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=3&school=1`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hijri = data?.data?.date?.hijri;

    if (hijri) {
      return {
        day: parseInt(hijri.day, 10),
        month: HIJRI_MONTHS[hijri.month.number] || hijri.month.en,
        year: parseInt(hijri.year, 10),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatGregorian(): string {
  const now = new Date();
  const day = now.getDate();
  const month = GREGORIAN_MONTHS[now.getMonth()];
  const year = now.getFullYear();
  return `${day} ${month} ${year}`;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parse "HH:MM" (or "HH:MM (XXX)") string into today's Date */
function parseTimeToday(timeStr: string): Date | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const now = new Date();
  const d = new Date(now);
  d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
  return d;
}

/** Get difference in minutes between now and a prayer time (positive = after prayer time) */
function getMinutesSincePrayer(timeStr: string): number | null {
  const prayerDate = parseTimeToday(timeStr);
  if (!prayerDate) return null;
  const now = new Date();
  return Math.round((now.getTime() - prayerDate.getTime()) / 60000);
}

/** Format minute difference as human-readable Russian text */
function formatTimeDiff(minutes: number): string {
  const abs = Math.abs(minutes);
  if (abs < 1) return "сейчас";
  if (abs < 60) {
    return minutes > 0
      ? `через ${abs} мин после азана`
      : `за ${abs} мин до азана`;
  }
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  const suffix = minutes > 0 ? "после азана" : "до азана";
  if (mins === 0) return `через ${hours} ч ${suffix}`;
  return `через ${hours} ч ${mins} мин ${suffix}`;
}

/** Determine which prayer's time window is currently active */
function getCurrentPrayerIndex(prayerTimes: Record<PrayerKey, string>): number {
  const now = new Date();
  const keys: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

  // Walk backwards: the current prayer is the last one whose time has passed
  for (let i = keys.length - 1; i >= 0; i--) {
    const t = parseTimeToday(prayerTimes[keys[i]]);
    if (t && now >= t) return i;
  }

  // Before Fajr — technically still Isha from yesterday, show Fajr as upcoming
  return -1;
}

// ---------------------------------------------------------------------------
// Confetti / Celebration Particles
// ---------------------------------------------------------------------------

function CelebrationBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1800);
    return () => clearTimeout(timer);
  }, [onDone]);

  const particles = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => {
      const angle = (i / 24) * 360;
      const distance = 40 + Math.random() * 60;
      const size = 4 + Math.random() * 6;
      const colors = [
        "#10b981",
        "#34d399",
        "#6ee7b7",
        "#fbbf24",
        "#f59e0b",
        "#a78bfa",
        "#60a5fa",
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const delay = Math.random() * 0.15;
      return { angle, distance, size, color, delay };
    });
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center">
      {/* Central checkmark burst */}
      <div className="relative">
        <div
          className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/50"
          style={{
            animation: "celebration-scale 0.6s ease-out forwards",
          }}
        >
          <Check className="w-8 h-8 text-white" strokeWidth={3} />
        </div>

        {/* Particles */}
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
              animation: `celebration-particle 0.8s ease-out ${p.delay}s forwards`,
              ["--tx" as string]: `${Math.cos((p.angle * Math.PI) / 180) * p.distance}px`,
              ["--ty" as string]: `${Math.sin((p.angle * Math.PI) / 180) * p.distance}px`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* Inject keyframes */}
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
        @keyframes streak-flame {
          0%, 100% { transform: scaleY(1) scaleX(1); }
          25% { transform: scaleY(1.15) scaleX(0.9); }
          50% { transform: scaleY(0.95) scaleX(1.05); }
          75% { transform: scaleY(1.1) scaleX(0.95); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
          50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.6); }
        }
        @keyframes juma-shine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes motivational-slide {
          0% { transform: translateY(20px); opacity: 0; }
          15% { transform: translateY(0); opacity: 1; }
          85% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-10px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Motivational Toast
// ---------------------------------------------------------------------------

function MotivationalToast({
  message,
  onDone,
}: {
  message: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-full px-4">
      <div
        className="glass-card p-4 text-center border border-emerald-500/30 shadow-lg shadow-emerald-500/20"
        style={{ animation: "motivational-slide 3.5s ease-in-out forwards" }}
      >
        <p className="text-white font-semibold text-sm">{message}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Prayers() {
  const navigate = useNavigate();

  // State
  const [prayerTimes, setPrayerTimes] = useState<Record<TimeSlotKey, string>>({
    fajr: "--:--",
    sunrise: "--:--",
    doha: "--:--",
    dhuhr: "--:--",
    asr: "--:--",
    maghrib: "--:--",
    isha: "--:--",
  });
  const [hijriDate, setHijriDate] = useState<HijriDate | null>(null);
  const [loading, setLoading] = useState(true);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [motivationalMsg, setMotivationalMsg] = useState<string | null>(null);

  // Date navigation (0 = today, -1 = yesterday, etc.)
  const [dateOffset, setDateOffset] = useState(0);
  const isToday = dateOffset === 0;
  const selectedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d;
  }, [dateOffset]);
  const selectedDateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);

  // Prayer log for selected day
  const todayKey = selectedDateKey;
  const [prayerLog, setPrayerLog] = useState(() =>
    storage.getPrayerLog(todayKey),
  );

  // Reload prayer log when date changes
  useEffect(() => {
    setPrayerLog(storage.getPrayerLog(selectedDateKey));
  }, [selectedDateKey]);

  // Weekly data
  const [weeklyData, setWeeklyData] = useState<
    { date: string; dayAbbr: string; completed: number; hasData: boolean }[]
  >([]);

  // Coordinates
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  });

  // Is today Friday?
  const isFriday = new Date().getDay() === 5;

  // Current streak
  const [streak, setStreak] = useState(() => storage.getStreak());

  // Load profile coords on mount
  useEffect(() => {
    const profile = storage.getProfile();
    if (profile.lat && profile.lng) {
      setCoords({ lat: profile.lat, lng: profile.lng });
    }
  }, []);

  // Fetch prayer times and hijri date
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [times, hijri] = await Promise.all([
          getPrayerTimes(coords.lat, coords.lng),
          fetchHijriDate(coords.lat, coords.lng),
        ]);

        if (cancelled) return;

        // Compute Doha time = Sunrise + 20 minutes
        let dohaTime = "--:--";
        if (times.Sunrise) {
          const m = times.Sunrise.match(/^(\d{1,2}):(\d{2})/);
          if (m) {
            const totalMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + 20;
            dohaTime = `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
          }
        }

        setPrayerTimes({
          fajr: times.Fajr,
          sunrise: times.Sunrise,
          doha: dohaTime,
          dhuhr: times.Dhuhr,
          asr: times.Asr,
          maghrib: times.Maghrib,
          isha: times.Isha,
        });

        if (hijri) setHijriDate(hijri);
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
  }, [coords]);

  // Build weekly calendar data
  useEffect(() => {
    const days: typeof weeklyData = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = toDateKey(d);
      const log = storage.getPrayerLog(key);

      const completed = (
        ["fajr", "dhuhr", "asr", "maghrib", "isha"] as PrayerKey[]
      ).filter(
        (p) =>
          log.prayers[p].status === "ontime" ||
          log.prayers[p].status === "late",
      ).length;

      const hasData = (
        ["fajr", "dhuhr", "asr", "maghrib", "isha"] as PrayerKey[]
      ).some((p) => log.prayers[p].status !== "none");

      days.push({
        date: key,
        dayAbbr: DAY_ABBRS[d.getDay()],
        completed,
        hasData,
      });
    }

    setWeeklyData(days);
  }, [prayerLog]);

  // Current prayer index
  const currentPrayerIdx = useMemo(
    () => getCurrentPrayerIndex(prayerTimes),
    [prayerTimes],
  );

  // Count completed prayers today
  const completedToday = useMemo(() => {
    return (["fajr", "dhuhr", "asr", "maghrib", "isha"] as PrayerKey[]).filter(
      (p) =>
        prayerLog.prayers[p].status === "ontime" ||
        prayerLog.prayers[p].status === "late",
    ).length;
  }, [prayerLog]);

  // Today's points
  const todayPoints = useMemo(() => {
    let pts = 0;
    (["fajr", "dhuhr", "asr", "maghrib", "isha"] as PrayerKey[]).forEach(
      (p) => {
        if (prayerLog.prayers[p].status === "ontime")
          pts += POINTS.PRAYER_ONTIME;
        else if (prayerLog.prayers[p].status === "late")
          pts += POINTS.PRAYER_LATE;
      },
    );
    return pts;
  }, [prayerLog]);

  // ------ Show motivational message ------
  const showMotivation = useCallback((newCompletedCount: number) => {
    let msg: string | null = null;

    // Streak milestones
    const currentStreak = storage.getStreak();
    if (currentStreak > 0 && currentStreak % 10 === 0 && currentStreak <= 100) {
      msg = `${currentStreak} дней подряд! Ты молодец!`;
    } else if (currentStreak === 1 && newCompletedCount === 1) {
      msg = "Отличное начало дня!";
    }

    // Count-based messages override streak unless it's a milestone
    if (newCompletedCount === 5) {
      msg = "Субханаллах! Все 5 намазов! \u{1F31F}";
    } else if (newCompletedCount === 4 && !msg) {
      msg = "Отлично! Ещё один намаз до совершенства!";
    } else if (newCompletedCount === 3 && !msg) {
      msg = "Хорошо! Продолжай в том же духе!";
    } else if (newCompletedCount === 1 && !msg) {
      msg = "Отличное начало дня!";
    }

    if (msg) {
      setMotivationalMsg(msg);
    }
  }, []);

  // ------ Smart Mark Prayer (big button) ------
  const smartMarkPrayer = useCallback(
    (prayerKey: PrayerKey) => {
      const currentLog = storage.getPrayerLog(todayKey);
      const currentStatus = currentLog.prayers[prayerKey].status;

      // If already marked, toggle off
      if (currentStatus === "ontime" || currentStatus === "late") {
        currentLog.prayers[prayerKey] = { status: "none", timestamp: null };
        const saved = storage.setPrayerLog(todayKey, currentLog.prayers);
        const streakResult = storage.updateStreak();
        setStreak(streakResult.streak);
        setPrayerLog({ ...saved });
        return;
      }

      let status: PrayerStatus;

      if (isToday) {
        // Today: check if prayer time has arrived
        const timeStr = prayerTimes[prayerKey];
        const diffMinutes = getMinutesSincePrayer(timeStr);

        // Block if prayer time hasn't arrived yet
        if (diffMinutes !== null && diffMinutes < 0) return;

        status = "ontime";
        if (diffMinutes !== null && diffMinutes > 30) {
          status = "late";
        }
      } else {
        // Past days: always "late" (retroactive logging)
        status = "late";
      }

      currentLog.prayers[prayerKey] = {
        status,
        timestamp: new Date().toISOString(),
      };

      // Visual feedback
      setFlashKey(`${prayerKey}-${status}`);
      setTimeout(() => setFlashKey(null), 500);

      // Celebration
      setCelebrating(true);

      const saved = storage.setPrayerLog(todayKey, currentLog.prayers);
      const streakResult = storage.updateStreak();
      storage.recalculateTotalPoints();
      setStreak(streakResult.streak);
      setPrayerLog({ ...saved });

      // Count completed after this action
      const newCount = (
        ["fajr", "dhuhr", "asr", "maghrib", "isha"] as PrayerKey[]
      ).filter(
        (p) =>
          saved.prayers[p].status === "ontime" ||
          saved.prayers[p].status === "late",
      ).length;

      showMotivation(newCount);
    },
    [todayKey, isToday, prayerTimes, showMotivation],
  );

  // ------ Mark Prayer (manual status) ------
  const markPrayer = useCallback(
    (prayerKey: PrayerKey, status: PrayerStatus) => {
      // For today: block if prayer time hasn't arrived
      if (isToday && status !== "missed") {
        const timeStr = prayerTimes[prayerKey];
        const diffMinutes = getMinutesSincePrayer(timeStr);
        if (diffMinutes !== null && diffMinutes < 0) return;
      }

      // Past days: can't mark as "ontime"
      if (!isToday && status === "ontime") return;

      const currentLog = storage.getPrayerLog(todayKey);
      const currentStatus = currentLog.prayers[prayerKey].status;

      // If tapping same status, toggle off
      if (currentStatus === status) {
        currentLog.prayers[prayerKey] = { status: "none", timestamp: null };
      } else {
        currentLog.prayers[prayerKey] = {
          status,
          timestamp: new Date().toISOString(),
        };

        setFlashKey(`${prayerKey}-${status}`);
        setTimeout(() => setFlashKey(null), 500);
      }

      const saved = storage.setPrayerLog(todayKey, currentLog.prayers);
      const streakResult = storage.updateStreak();
      storage.recalculateTotalPoints();
      setStreak(streakResult.streak);
      setPrayerLog({ ...saved });
    },
    [todayKey, isToday, prayerTimes],
  );

  // ------ Stats ------

  const totalPrayersThisWeek = weeklyData.reduce(
    (sum, d) => sum + d.completed,
    0,
  );
  const totalPossibleThisWeek = weeklyData.length * 5;

  const ontimeThisWeek = (() => {
    let count = 0;
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const log = storage.getPrayerLog(toDateKey(d));
      (["fajr", "dhuhr", "asr", "maghrib", "isha"] as PrayerKey[]).forEach(
        (p) => {
          if (log.prayers[p].status === "ontime") count++;
        },
      );
    }
    return count;
  })();

  const ontimePct =
    totalPrayersThisWeek > 0
      ? Math.round((ontimeThisWeek / totalPrayersThisWeek) * 100)
      : 0;

  // ------ Render helpers ------

  function getStatusIcon(status: PrayerStatus) {
    switch (status) {
      case "ontime":
        return <Check className="w-4 h-4" />;
      case "late":
        return <Clock className="w-4 h-4" />;
      case "missed":
        return <X className="w-4 h-4" />;
      default:
        return null;
    }
  }

  function getStatusColor(status: PrayerStatus) {
    switch (status) {
      case "ontime":
        return "text-emerald-400";
      case "late":
        return "text-amber-400";
      case "missed":
        return "text-red-400";
      default:
        return "text-slate-500";
    }
  }

  function getStatusBg(status: PrayerStatus) {
    switch (status) {
      case "ontime":
        return "bg-emerald-500/20 border-emerald-500/40";
      case "late":
        return "bg-amber-500/20 border-amber-500/40";
      case "missed":
        return "bg-red-500/20 border-red-500/40";
      default:
        return "t-bg t-border-s";
    }
  }

  function getWeekCircleColor(day: (typeof weeklyData)[0]) {
    if (!day.hasData) return "bg-slate-700/50 border-slate-600/30";
    if (day.completed === 5) return "bg-emerald-500/30 border-emerald-400/50";
    if (day.completed > 0) return "bg-amber-500/30 border-amber-400/50";
    return "bg-red-500/30 border-red-400/50";
  }

  function getWeekCircleText(day: (typeof weeklyData)[0]) {
    if (!day.hasData) return "text-slate-500";
    if (day.completed === 5) return "text-emerald-300";
    if (day.completed > 0) return "text-amber-300";
    return "text-red-300";
  }

  /** Get smart time message for a prayer */
  function getSmartTimeMessage(prayerKey: PrayerKey): string | null {
    const entry = prayerLog.prayers[prayerKey];
    if (entry.status === "none" || !entry.timestamp) return null;

    const timeStr = prayerTimes[prayerKey];
    const prayerDate = parseTimeToday(timeStr);
    if (!prayerDate) return null;

    const markedAt = new Date(entry.timestamp);
    const diffMs = markedAt.getTime() - prayerDate.getTime();
    const diffMinutes = Math.round(diffMs / 60000);

    if (diffMinutes < 0) {
      // Marked before prayer time (rare edge case)
      return null;
    }

    if (diffMinutes <= 30) {
      return "Машаллах! Прочитал вовремя";
    } else if (diffMinutes <= 120) {
      return "Лучше поздно, чем никогда";
    }

    return formatTimeDiff(diffMinutes);
  }

  /** Determine if a prayer is the "current" one (active window), past, or future */
  function getPrayerPhase(idx: number): "current" | "past" | "future" {
    if (currentPrayerIdx < 0) {
      // Before Fajr: all are "future" except Isha which we treat as past
      return idx === 4 ? "past" : "future";
    }
    if (idx < currentPrayerIdx) return "past";
    if (idx === currentPrayerIdx) return "current";
    return "future";
  }

  // ------ JSX ------

  return (
    <div className="min-h-screen pb-24 px-4 pt-4 max-w-lg mx-auto relative">
      {/* Celebration burst overlay */}
      {celebrating && <CelebrationBurst onDone={() => setCelebrating(false)} />}

      {/* Motivational toast */}
      {motivationalMsg && (
        <MotivationalToast
          message={motivationalMsg}
          onDone={() => setMotivationalMsg(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full glass flex items-center justify-center
                     text-white/70 hover:text-white transition-colors active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Намаз</h1>
          <p className="text-xs text-white/40">Отслеживание молитв</p>
        </div>
        {/* Today's score badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400">
            {todayPoints}
          </span>
        </div>
      </div>

      {/* Juma (Friday) Reminder */}
      {isFriday && (
        <div
          className="relative overflow-hidden rounded-2xl p-4 mb-6 border border-amber-500/30 animate-fade-in"
          style={{
            background:
              "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))",
          }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.3), transparent)",
              backgroundSize: "200% 100%",
              animation: "juma-shine 3s ease-in-out infinite",
            }}
          />
          <div className="relative flex items-center gap-3">
            <span className="text-3xl">🕌</span>
            <div>
              <p className="text-amber-300 font-bold text-sm">Джума муборак!</p>
              <p className="text-amber-200/60 text-xs mt-0.5">
                Не забудь прочитать Джума-намаз
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Streak Flame Section */}
      {streak > 0 && (
        <div
          className="glass-card p-4 mb-6 animate-fade-in flex items-center gap-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(239, 68, 68, 0.05))",
            borderColor: "rgba(251, 146, 60, 0.3)",
          }}
        >
          <div className="relative">
            <span
              className="text-4xl block"
              style={{
                animation: "streak-flame 1.5s ease-in-out infinite",
                display: "inline-block",
                transformOrigin: "bottom center",
              }}
            >
              🔥
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-orange-400">
                {streak}
              </span>
              <span className="text-sm text-orange-300/70 font-medium">
                {streak === 1
                  ? "день подряд"
                  : streak < 5
                    ? "дня подряд"
                    : "дней подряд"}
              </span>
            </div>
            <p className="text-xs text-white/40 mt-0.5">
              {streak >= 30
                ? "Невероятная стабильность!"
                : streak >= 10
                  ? "Так держать, чемпион!"
                  : streak >= 3
                    ? "Отличная серия!"
                    : "Продолжай каждый день!"}
            </p>
          </div>
          <Target className="w-5 h-5 text-orange-400/50" />
        </div>
      )}

      {/* Date Navigation + Date Card */}
      <div className="glass-card p-4 mb-6 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setDateOffset((o) => Math.max(o - 1, -7))}
            className="w-8 h-8 rounded-lg flex items-center justify-center t-bg active:scale-90 transition-all"
          >
            <ChevronLeft size={16} className="text-white/50" />
          </button>
          <div className="text-center">
            {isToday && hijriDate ? (
              <p className="text-emerald-400 font-semibold text-sm">
                {hijriDate.day} {hijriDate.month} {hijriDate.year} г.х.
              </p>
            ) : null}
            <p className="t-text-m text-xs mt-0.5">
              {isToday
                ? formatGregorian()
                : (() => {
                    const d = selectedDate;
                    const day = d.getDate();
                    const month = GREGORIAN_MONTHS[d.getMonth()];
                    const year = d.getFullYear();
                    const label = dateOffset === -1 ? " (вчера)" : dateOffset === -2 ? " (позавчера)" : "";
                    return `${day} ${month} ${year}${label}`;
                  })()}
            </p>
            {!isToday && (
              <p className="text-[10px] text-amber-400/70 mt-0.5">
                Ретроспективная отметка
              </p>
            )}
          </div>
          <button
            onClick={() => dateOffset < 0 && setDateOffset((o) => o + 1)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center t-bg active:scale-90 transition-all ${
              dateOffset >= 0 ? "opacity-20 pointer-events-none" : ""
            }`}
          >
            <ChevronRight size={16} className="text-white/50" />
          </button>
        </div>
        {/* Completed counter */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i < completedToday
                  ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                  : "t-bg"
              }`}
            />
          ))}
          <span className="text-[10px] t-text-f ml-1.5">
            {completedToday}/5
          </span>
        </div>
      </div>

      {/* Prayer Cards */}
      <div className="space-y-3 mb-6">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="glass-card p-4 animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="h-5 w-24 t-bg rounded mb-2" />
                <div className="h-4 w-16 t-bg rounded" />
              </div>
            ))
          : PRAYERS.map((prayer, idx) => {
              const time = prayerTimes[prayer.key];

              // Info-only slots (Sunrise, Doha) — compact card, no tracking
              if (prayer.isInfo) {
                return (
                  <div
                    key={prayer.key}
                    className="glass-card px-4 py-2.5 transition-all duration-300 animate-fade-in opacity-70"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{prayer.icon}</span>
                        <span className="text-white/60 font-medium text-xs">
                          {prayer.name}
                        </span>
                      </div>
                      <span className="text-white/50 text-xs font-mono">
                        {time}
                      </span>
                    </div>
                  </div>
                );
              }

              const prayerKey = prayer.key as PrayerKey;
              const entry = prayerLog.prayers[prayerKey];
              const isFlashing = flashKey?.startsWith(prayer.key);
              // Map visible index to mandatory prayer index for phase calculation
              const mandatoryIdx = [
                "fajr",
                "dhuhr",
                "asr",
                "maghrib",
                "isha",
              ].indexOf(prayerKey);
              const phase = getPrayerPhase(mandatoryIdx);
              const isCurrent = phase === "current";
              const isPast = phase === "past";
              const smartMsg = getSmartTimeMessage(prayerKey);
              const diffMinutes = getMinutesSincePrayer(time);

              return (
                <div
                  key={prayer.key}
                  className={`glass-card p-4 transition-all duration-300 animate-fade-in relative
                    ${entry.status === "ontime" ? "border-emerald-500/30" : ""}
                    ${entry.status === "late" ? "border-amber-500/30" : ""}
                    ${entry.status === "missed" ? "border-red-500/30" : ""}
                    ${isToday && isCurrent && entry.status === "none" ? "border-emerald-500/20 ring-1 ring-emerald-500/10" : ""}
                    ${isFlashing ? "scale-[1.02] glow-green" : ""}
                  `}
                  style={{
                    animationDelay: `${idx * 60}ms`,
                    ...(isToday && isCurrent && entry.status === "none"
                      ? { animation: "pulse-glow 3s ease-in-out infinite" }
                      : {}),
                  }}
                >
                  {/* Current prayer indicator (today only) */}
                  {isToday && isCurrent && entry.status === "none" && (
                    <div className="absolute -top-2 left-4 px-2 py-0.5 rounded-full bg-emerald-500 text-[9px] text-white font-bold uppercase tracking-wider">
                      Сейчас
                    </div>
                  )}

                  {/* Top row: name + time + status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{prayer.icon}</span>
                      <div>
                        <h3 className="text-white font-semibold text-sm">
                          {prayer.name}
                        </h3>
                        <p className="text-white/40 text-xs font-mono">
                          {time}
                        </p>
                      </div>
                    </div>

                    {/* Current status badge */}
                    {entry.status !== "none" && (
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                          ${getStatusBg(entry.status)} ${getStatusColor(entry.status)}
                          border transition-all duration-300`}
                      >
                        {getStatusIcon(entry.status)}
                        <span>
                          {entry.status === "ontime" && "Вовремя"}
                          {entry.status === "late" && "С опозданием"}
                          {entry.status === "missed" && "Пропущен"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Smart time message */}
                  {smartMsg && (
                    <p className="text-[11px] text-emerald-400/70 mb-3 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {smartMsg}
                    </p>
                  )}

                  {/* Big "Я ПРОЧИТАЛ" button for current/active prayer (today only) */}
                  {isToday && isCurrent && entry.status === "none" && (
                    <button
                      onClick={() => smartMarkPrayer(prayerKey)}
                      className="w-full py-3.5 rounded-2xl text-sm font-bold
                        bg-emerald-500 hover:bg-emerald-400 text-white
                        transition-all duration-200 active:scale-[0.97]
                        shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 mb-2"
                    >
                      <Check className="w-5 h-5" strokeWidth={2.5} />
                      Прочитал намаз
                    </button>
                  )}

                  {/* For past unmarked prayers today: "Missed" prominent + small "I read it" */}
                  {isToday && isPast && entry.status === "none" && (
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => smartMarkPrayer(prayerKey)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold
                          t-bg border t-border-s t-text-s
                          hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400
                          transition-all duration-200 active:scale-95
                          flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Прочитал
                      </button>
                      <button
                        onClick={() => markPrayer(prayerKey, "missed")}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold
                          bg-red-500/10 border border-red-500/20 text-red-400/70
                          hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400
                          transition-all duration-200 active:scale-95
                          flex items-center justify-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        Пропустил
                      </button>
                    </div>
                  )}

                  {/* For future prayers today: locked */}
                  {isToday && phase === "future" && entry.status === "none" && (
                    <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl t-bg border t-border-s opacity-40">
                      <Lock className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-xs text-white/30">Время ещё не наступило</span>
                    </div>
                  )}

                  {/* For past days, unmarked prayers: "Прочитал" (late) + "Пропустил" */}
                  {!isToday && entry.status === "none" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => smartMarkPrayer(prayerKey)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold
                          t-bg border t-border-s t-text-s
                          hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400
                          transition-all duration-200 active:scale-95
                          flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Прочитал (поздно)
                      </button>
                      <button
                        onClick={() => markPrayer(prayerKey, "missed")}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold
                          bg-red-500/10 border border-red-500/20 text-red-400/70
                          hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400
                          transition-all duration-200 active:scale-95
                          flex items-center justify-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        Пропустил
                      </button>
                    </div>
                  )}

                  {/* If already marked: small toggle buttons to change */}
                  {entry.status !== "none" && (
                    <div className="flex gap-2">
                      {/* "Вовремя" only available for today */}
                      {isToday && (
                        <button
                          onClick={() => markPrayer(prayerKey, "ontime")}
                          className={`flex-1 py-2 rounded-xl text-xs font-medium
                            transition-all duration-200 active:scale-95 border
                            ${
                              entry.status === "ontime"
                                ? "bg-emerald-500/25 border-emerald-400/50 text-emerald-300"
                                : "t-bg t-border-s t-text-m hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400"
                            }`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            Вовремя
                          </div>
                        </button>
                      )}
                      <button
                        onClick={() => markPrayer(prayerKey, "late")}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium
                          transition-all duration-200 active:scale-95 border
                          ${
                            entry.status === "late"
                              ? "bg-amber-500/25 border-amber-400/50 text-amber-300"
                              : "t-bg t-border-s t-text-m hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400"
                          }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />С опозд.
                        </div>
                      </button>
                      <button
                        onClick={() => markPrayer(prayerKey, "missed")}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium
                          transition-all duration-200 active:scale-95 border
                          ${
                            entry.status === "missed"
                              ? "bg-red-500/25 border-red-400/50 text-red-300"
                              : "t-bg t-border-s t-text-m hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                          }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <X className="w-3.5 h-3.5" />
                          Пропущен
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Timestamp + time diff */}
                  {entry.timestamp && (
                    <div className="flex items-center justify-between mt-2">
                      {diffMinutes !== null && diffMinutes >= 0 && (
                        <p className="text-[10px] text-white/20">
                          {formatTimeDiff(diffMinutes)}
                        </p>
                      )}
                      <p className="text-[10px] text-white/25 ml-auto">
                        Отмечено в{" "}
                        {new Date(entry.timestamp).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
      </div>

      {/* Weekly Calendar */}
      <div
        className="glass-card p-4 mb-4 animate-fade-in"
        style={{ animationDelay: "350ms" }}
      >
        <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3">
          Неделя
        </h2>
        <div className="flex justify-between items-end">
          {weeklyData.map((day) => {
            const isToday = day.date === todayKey;

            return (
              <div
                key={day.date}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className={`text-[10px] font-mono ${
                    day.hasData ? "text-white/40" : "text-white/15"
                  }`}
                >
                  {day.hasData ? `${day.completed}/5` : "-"}
                </span>

                <div
                  className={`w-9 h-9 rounded-full border flex items-center justify-center
                    transition-all duration-300
                    ${getWeekCircleColor(day)}
                    ${isToday ? "ring-2 ring-emerald-400/40 ring-offset-1 ring-offset-transparent" : ""}
                  `}
                >
                  <span
                    className={`text-xs font-bold ${getWeekCircleText(day)}`}
                  >
                    {day.dayAbbr}
                  </span>
                </div>

                {isToday && (
                  <div className="w-1 h-1 rounded-full bg-emerald-400" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t t-border">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
            <span className="text-[10px] t-text-f">Все 5</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
            <span className="text-[10px] t-text-f">Частично</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <span className="text-[10px] t-text-f">Пропущено</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50" />
            <span className="text-[10px] t-text-f">Нет данных</span>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div
        className="glass-card p-4 mb-4 animate-fade-in"
        style={{ animationDelay: "420ms" }}
      >
        <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3">
          Статистика за неделю
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="t-bg rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {totalPrayersThisWeek}
            </p>
            <p className="text-[10px] text-white/40 mt-0.5">
              из {totalPossibleThisWeek} намазов
            </p>
          </div>

          <div className="t-bg rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{ontimePct}%</p>
            <p className="text-[10px] text-white/40 mt-0.5">вовремя</p>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-[10px] t-text-f mb-1">
            <span>Прогресс недели</span>
            <span>
              {totalPrayersThisWeek}/{totalPossibleThisWeek}
            </span>
          </div>
          <div className="h-2 t-bg rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${
                  totalPossibleThisWeek > 0
                    ? (totalPrayersThisWeek / totalPossibleThisWeek) * 100
                    : 0
                }%`,
                background: "linear-gradient(90deg, #10b981, #f59e0b)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Points Breakdown Card */}
      <div
        className="glass-card p-4 animate-fade-in"
        style={{ animationDelay: "490ms" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Система баллов
          </h2>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-400">
              {todayPoints} сегодня
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          {[
            {
              label: "Намаз вовремя",
              points: POINTS.PRAYER_ONTIME,
              icon: "✅",
              color: "text-emerald-400",
            },
            {
              label: "Намаз с опозданием",
              points: POINTS.PRAYER_LATE,
              icon: "⏰",
              color: "text-amber-400",
            },
            {
              label: "Чтение Корана",
              points: POINTS.QURAN,
              icon: "📖",
              color: "text-blue-400",
            },
            {
              label: "Хадис дня",
              points: POINTS.HADITH,
              icon: "📜",
              color: "text-purple-400",
            },
            {
              label: "Утренний/вечерний азкар",
              points: POINTS.AZKAR,
              icon: "🤲",
              color: "text-cyan-400",
            },
            {
              label: "Садака",
              points: POINTS.CHARITY,
              icon: "💝",
              color: "text-pink-400",
            },
            {
              label: "Пост",
              points: POINTS.FASTING,
              icon: "🌙",
              color: "text-indigo-400",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs">{item.icon}</span>
                <span className="text-xs t-text-s">{item.label}</span>
              </div>
              <span className={`text-xs font-bold ${item.color}`}>
                +{item.points}
              </span>
            </div>
          ))}
        </div>

        {/* Max possible today */}
        <div className="mt-3 pt-3 border-t t-border flex items-center justify-between">
          <span className="text-[10px] t-text-f">
            Макс. за 5 намазов вовремя
          </span>
          <span className="text-xs font-bold t-text-m">
            +{POINTS.PRAYER_ONTIME * 5}
          </span>
        </div>
      </div>
    </div>
  );
}
