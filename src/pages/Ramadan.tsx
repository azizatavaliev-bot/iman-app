import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Moon,
  Sun,
  Calendar,
  Check,
  Clock,
  ChevronLeft,
  Star,
} from "lucide-react";
import { getPrayerTimes } from "../lib/api";
import { storage, POINTS } from "../lib/storage";
import { scheduleSyncPush } from "../lib/sync";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_LAT = 42.8746; // Bishkek
const DEFAULT_LNG = 74.5698;

// Ramadan 1447 approximate dates (Kyrgyzstan)
const RAMADAN_START = new Date(2026, 1, 19); // Feb 19, 2026
const RAMADAN_END = new Date(2026, 2, 20); // Mar 20, 2026
const RAMADAN_DAYS = 30;

const STORAGE_KEY = "iman_ramadan_2026";

// =============================================================================
// Types
// =============================================================================

interface RamadanData {
  fastingDays: Record<number, "fasted" | "missed">; // day 1..30
  goals: Record<string, Record<number, boolean>>; // goalKey -> day -> done
}

interface RamadanGoal {
  key: string;
  label: string;
  icon: typeof Star;
}

const RAMADAN_GOALS: RamadanGoal[] = [
  { key: "taraweeh", label: "Таравих намаз", icon: Moon },
  { key: "quran_juz", label: "Чтение 1 джуза Корана", icon: Star },
  { key: "sadaqa", label: "Садака", icon: Sun },
  { key: "dua_iftar", label: "Дуа перед ифтаром", icon: Clock },
];

// =============================================================================
// Helpers
// =============================================================================

function loadRamadanData(): RamadanData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { fastingDays: {}, goals: {} };
}

function saveRamadanData(data: RamadanData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  scheduleSyncPush(); // Trigger sync to server
}

/** Parse "HH:MM" or "HH:MM (TZ)" into today's Date */
function parseTimeToDate(timeStr: string, date?: Date): Date {
  const clean = timeStr.replace(/\s*\(.*\)/, "").trim();
  const [h, m] = clean.split(":").map(Number);
  const base = date || new Date();
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0);
}

/** Format seconds into HH:MM:SS */
function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/** Get which Ramadan day a given date falls on (1-based), or 0 if outside */
function getRamadanDay(date: Date): number {
  const start = new Date(
    RAMADAN_START.getFullYear(),
    RAMADAN_START.getMonth(),
    RAMADAN_START.getDate(),
  );
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor(
    (d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0 || diff >= RAMADAN_DAYS) return 0;
  return diff + 1;
}

/** Days until Ramadan starts */
function daysUntilRamadan(): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(
    RAMADAN_START.getFullYear(),
    RAMADAN_START.getMonth(),
    RAMADAN_START.getDate(),
  );
  const diff = Math.floor(
    (start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff;
}

/** Is Ramadan over? */
function isRamadanOver(): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(
    RAMADAN_END.getFullYear(),
    RAMADAN_END.getMonth(),
    RAMADAN_END.getDate(),
  );
  return today > end;
}

/** Is currently during Ramadan? */
function isDuringRamadan(): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(
    RAMADAN_START.getFullYear(),
    RAMADAN_START.getMonth(),
    RAMADAN_START.getDate(),
  );
  const end = new Date(
    RAMADAN_END.getFullYear(),
    RAMADAN_END.getMonth(),
    RAMADAN_END.getDate(),
  );
  return today >= start && today <= end;
}

// =============================================================================
// Component
// =============================================================================

export default function Ramadan() {
  const navigate = useNavigate();

  // State
  const [ramadanData, setRamadanData] = useState<RamadanData>(loadRamadanData);
  const [fajrTime, setFajrTime] = useState<string>("--:--");
  const [maghribTime, setMaghribTime] = useState<string>("--:--");
  const [countdown, setCountdown] = useState<string>("--:--:--");
  const [nextEvent, setNextEvent] = useState<"suhur" | "iftar">("iftar");
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentDay = getRamadanDay(now);
  const during = isDuringRamadan();
  const over = isRamadanOver();
  const daysLeft = daysUntilRamadan();

  // Count fasted days
  const fastedCount = Object.values(ramadanData.fastingDays).filter(
    (v) => v === "fasted",
  ).length;

  // ---------- Load coordinates and prayer times ----------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const profile = storage.getProfile();
        const lat = profile.lat ?? DEFAULT_LAT;
        const lng = profile.lng ?? DEFAULT_LNG;
        const times = await getPrayerTimes(lat, lng);

        if (cancelled) return;

        setFajrTime(times.Fajr.replace(/\s*\(.*\)/, "").trim());
        setMaghribTime(times.Maghrib.replace(/\s*\(.*\)/, "").trim());
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
  }, []);

  // ---------- Countdown timer to Suhur/Iftar ----------
  useEffect(() => {
    if (fajrTime === "--:--" || maghribTime === "--:--") return;

    function tick() {
      const now = new Date();
      const fajrDate = parseTimeToDate(fajrTime);
      const maghribDate = parseTimeToDate(maghribTime);

      let target: Date;
      let event: "suhur" | "iftar";

      if (now < fajrDate) {
        // Before Fajr -> countdown to Suhur end (Fajr)
        target = fajrDate;
        event = "suhur";
      } else if (now < maghribDate) {
        // Between Fajr and Maghrib -> countdown to Iftar (Maghrib)
        target = maghribDate;
        event = "iftar";
      } else {
        // After Maghrib -> countdown to tomorrow's Suhur (Fajr)
        const tomorrowFajr = parseTimeToDate(fajrTime);
        tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
        target = tomorrowFajr;
        event = "suhur";
      }

      const diffMs = target.getTime() - now.getTime();
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));
      setCountdown(formatCountdown(diffSec));
      setNextEvent(event);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [fajrTime, maghribTime]);

  // ---------- Toggle fasting day ----------
  function toggleFastingDay(day: number) {
    setRamadanData((prev) => {
      const next = { ...prev, fastingDays: { ...prev.fastingDays } };
      const current = next.fastingDays[day];
      if (!current) {
        next.fastingDays[day] = "fasted";
        storage.addExtraPoints(POINTS.FASTING);
      } else if (current === "fasted") {
        next.fastingDays[day] = "missed";
        // Remove fasting points
        storage.addExtraPoints(-POINTS.FASTING);
      } else {
        delete next.fastingDays[day];
      }
      saveRamadanData(next);
      return next;
    });
  }

  // ---------- Toggle daily goal ----------
  function toggleGoal(goalKey: string, day: number) {
    setRamadanData((prev) => {
      const next = {
        ...prev,
        goals: { ...prev.goals },
      };
      if (!next.goals[goalKey]) next.goals[goalKey] = {};
      next.goals[goalKey] = { ...next.goals[goalKey] };
      next.goals[goalKey][day] = !next.goals[goalKey][day];
      saveRamadanData(next);
      return next;
    });
  }

  // ---------- Fasting day cell color ----------
  function getDayCellStyle(day: number): string {
    const status = ramadanData.fastingDays[day];
    if (status === "fasted") {
      return "bg-emerald-500/30 border-emerald-400/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]";
    }
    if (status === "missed") {
      return "bg-red-500/25 border-red-400/50 text-red-300";
    }
    // Future or unmarked
    if (during && day > currentDay) {
      return "t-bg t-border-s t-text-f";
    }
    return "t-bg t-border-s t-text-m hover:t-bg hover:border-white/20";
  }

  // ==========================================================================
  // JSX
  // ==========================================================================

  return (
    <div className="min-h-screen pb-24 px-4 pt-4 max-w-lg mx-auto">
      {/* ================================================================ */}
      {/* Header                                                           */}
      {/* ================================================================ */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full glass flex items-center justify-center
                     text-white/70 hover:text-white transition-colors active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Рамадан</h1>
          <p className="text-xs text-white/40">Благословенный месяц</p>
        </div>
        <Moon className="w-6 h-6 text-amber-400/70" />
      </div>

      {/* ================================================================ */}
      {/* Ramadan Header Card                                              */}
      {/* ================================================================ */}
      <div className="glass-card p-5 mb-5 relative overflow-hidden animate-fade-in">
        {/* Decorative crescent glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          {/* Title row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-400/20 flex items-center justify-center">
              <Moon className="w-6 h-6 text-amber-400" fill="currentColor" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Рамадан 2026</h2>
              <p className="text-xs text-white/40">1447 год по Хиджре</p>
            </div>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 text-xs t-text-m mb-4">
            <Calendar className="w-3.5 h-3.5 text-emerald-400/60" />
            <span>19 февраля — 20 марта 2026</span>
          </div>

          {/* Status */}
          <div className="flex items-center justify-center">
            {!during && !over && daysLeft > 0 && (
              <div className="text-center">
                <p className="text-sm t-text-s mb-1">До Рамадана осталось</p>
                <p className="text-4xl font-bold text-amber-400">{daysLeft}</p>
                <p className="text-xs text-white/40 mt-1">
                  {daysLeft === 1
                    ? "день"
                    : daysLeft >= 2 && daysLeft <= 4
                      ? "дня"
                      : "дней"}
                </p>
              </div>
            )}
            {during && (
              <div className="text-center">
                <p className="text-sm t-text-s mb-1">Сейчас идёт</p>
                <p className="text-3xl font-bold text-emerald-400">
                  День {currentDay}{" "}
                  <span className="t-text-f text-lg font-normal">
                    из {RAMADAN_DAYS}
                  </span>
                </p>
                <div className="mt-3 w-full h-2 t-bg rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${(currentDay / RAMADAN_DAYS) * 100}%`,
                      background: "linear-gradient(90deg, #10b981, #f59e0b)",
                      boxShadow: "0 0 12px rgba(16,185,129,0.4)",
                    }}
                  />
                </div>
              </div>
            )}
            {over && (
              <div className="text-center">
                <p className="text-lg font-semibold text-amber-400">
                  Рамадан 1447 завершён
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Да примет Аллах наши поклонения
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Suhur / Iftar Timer                                              */}
      {/* ================================================================ */}
      <div
        className="glass-card p-5 mb-5 relative overflow-hidden animate-fade-in"
        style={{ animationDelay: "80ms" }}
      >
        {/* Glow effect */}
        <div
          className={`absolute -top-10 -right-10 w-44 h-44 rounded-full blur-3xl pointer-events-none ${
            nextEvent === "iftar" ? "bg-amber-500/12" : "bg-emerald-500/12"
          }`}
        />

        <div className="relative">
          {/* Label */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                nextEvent === "iftar"
                  ? "bg-amber-500/20 border border-amber-400/20"
                  : "bg-emerald-500/20 border border-emerald-400/20"
              }`}
            >
              {nextEvent === "iftar" ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <p
                className={`text-xs font-medium uppercase tracking-widest ${
                  nextEvent === "iftar"
                    ? "text-amber-400/70"
                    : "text-emerald-400/70"
                }`}
              >
                {nextEvent === "iftar" ? "До ифтара" : "До сухура"}
              </p>
              <p className="text-[11px] t-text-f">
                {nextEvent === "iftar"
                  ? `Магриб: ${maghribTime}`
                  : `Фаджр: ${fajrTime}`}
              </p>
            </div>
          </div>

          {/* Countdown */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="text-center">
              <p
                className={`text-5xl font-mono font-bold tabular-nums tracking-tight ${
                  nextEvent === "iftar" ? "text-amber-400" : "text-emerald-400"
                }`}
                style={{
                  textShadow:
                    nextEvent === "iftar"
                      ? "0 0 30px rgba(245,158,11,0.3)"
                      : "0 0 30px rgba(16,185,129,0.3)",
                }}
              >
                {countdown}
              </p>
            </div>
          )}

          {/* Suhur & Iftar times row */}
          <div className="flex justify-between mt-4 pt-4 border-t t-border">
            <div className="text-center flex-1">
              <p className="text-[10px] t-text-f uppercase tracking-wider mb-1">
                Сухур
              </p>
              <p className="text-sm font-semibold text-emerald-400 font-mono">
                {fajrTime}
              </p>
            </div>
            <div className="w-px t-bg" />
            <div className="text-center flex-1">
              <p className="text-[10px] t-text-f uppercase tracking-wider mb-1">
                Ифтар
              </p>
              <p className="text-sm font-semibold text-amber-400 font-mono">
                {maghribTime}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Fasting Tracker (30-day grid)                                    */}
      {/* ================================================================ */}
      <div
        className="glass-card p-5 mb-5 animate-fade-in"
        style={{ animationDelay: "160ms" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400/70" />
            <h3 className="text-sm font-semibold text-white">Трекер поста</h3>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
            <Check className="w-3 h-3 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">
              {fastedCount}/{RAMADAN_DAYS}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-2 t-bg rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${(fastedCount / RAMADAN_DAYS) * 100}%`,
                background: "linear-gradient(90deg, #10b981, #34d399)",
                boxShadow: "0 0 12px rgba(16,185,129,0.3)",
              }}
            />
          </div>
          <p className="text-[10px] t-text-f mt-1.5 text-center">
            {fastedCount} из {RAMADAN_DAYS} дней поста
          </p>
        </div>

        {/* 30-day grid: 6 rows x 5 columns */}
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: RAMADAN_DAYS }, (_, i) => {
            const day = i + 1;
            const status = ramadanData.fastingDays[day];
            const isFuture = during && day > currentDay;

            return (
              <button
                key={day}
                onClick={() => {
                  if (!isFuture || !during) toggleFastingDay(day);
                }}
                disabled={isFuture && during}
                className={`relative aspect-square rounded-xl border text-xs font-bold
                  flex flex-col items-center justify-center gap-0.5
                  transition-all duration-200 active:scale-90
                  ${getDayCellStyle(day)}
                  ${day === currentDay && during ? "ring-2 ring-amber-400/40 ring-offset-1 ring-offset-transparent" : ""}
                `}
              >
                <span className="text-[10px] opacity-60">{day}</span>
                {status === "fasted" && (
                  <Check className="w-3 h-3 text-emerald-400" />
                )}
                {status === "missed" && (
                  <span className="text-red-400 text-[10px]">x</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t t-border">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            <span className="text-[10px] t-text-f">Постился</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="text-[10px] t-text-f">Пропущено</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <span className="text-[10px] t-text-f">Будущее</span>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Suhur Dua                                                        */}
      {/* ================================================================ */}
      <div
        className="glass-card p-5 mb-5 relative overflow-hidden animate-fade-in"
        style={{ animationDelay: "240ms" }}
      >
        {/* Decorative emerald glow */}
        <div className="absolute -top-10 -left-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center">
              <Moon className="w-4 h-4 text-emerald-400" fill="currentColor" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Дуа для сухура
              </h3>
              <p className="text-[10px] t-text-f">Намерение перед рассветом</p>
            </div>
          </div>

          {/* Arabic */}
          <div className="t-bg rounded-2xl p-4 mb-3 border t-border">
            <p
              className="text-xl text-white/90 leading-loose text-center"
              style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
              dir="rtl"
            >
              نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ فَرْضِ شَهْرِ رَمَضَانَ هَذِهِ
              السَّنَةِ لِلَّهِ تَعَالَى
            </p>
          </div>

          {/* Transliteration (Cyrillic) */}
          <div className="mb-3">
            <p className="text-[10px] text-emerald-400/60 uppercase tracking-wider mb-1">
              Произношение
            </p>
            <p className="text-sm text-white/70 leading-relaxed italic">
              Навайту саума гадин 'ан ада'и фарды шахри Рамадана хазихис-санати
              лилляхи та'аля
            </p>
          </div>

          {/* Russian translation */}
          <div className="pt-3 border-t t-border">
            <p className="text-[10px] text-emerald-400/60 uppercase tracking-wider mb-1">
              Перевод
            </p>
            <p className="text-sm t-text-s leading-relaxed">
              Я намереваюсь держать пост завтрашнего дня во исполнение
              обязательного поста месяца Рамадан в этом году ради Аллаха
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Iftar Dua                                                        */}
      {/* ================================================================ */}
      <div
        className="glass-card p-5 mb-5 relative overflow-hidden animate-fade-in"
        style={{ animationDelay: "280ms" }}
      >
        {/* Decorative gold glow */}
        <div className="absolute -top-10 -left-10 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/20 flex items-center justify-center">
              <Star className="w-4 h-4 text-amber-400" fill="currentColor" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Дуа для разговения
              </h3>
              <p className="text-[10px] t-text-f">Читается при ифтаре</p>
            </div>
          </div>

          {/* Arabic */}
          <div className="t-bg rounded-2xl p-4 mb-3 border t-border">
            <p
              className="text-xl text-white/90 leading-loose text-center"
              style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
              dir="rtl"
            >
              اللَّهُمَّ لَكَ صُمْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ
            </p>
          </div>

          {/* Transliteration (Cyrillic) */}
          <div className="mb-3">
            <p className="text-[10px] text-amber-400/60 uppercase tracking-wider mb-1">
              Произношение
            </p>
            <p className="text-sm text-white/70 leading-relaxed italic">
              Аллахумма ляка сумту ва 'аля ризкыка афтарту
            </p>
          </div>

          {/* Russian translation */}
          <div className="pt-3 border-t t-border">
            <p className="text-[10px] text-amber-400/60 uppercase tracking-wider mb-1">
              Перевод
            </p>
            <p className="text-sm t-text-s leading-relaxed">
              О Аллах! Ради Тебя я постился и Твоим пропитанием разговляюсь
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Daily Ramadan Goals                                              */}
      {/* ================================================================ */}
      <div
        className="glass-card p-5 animate-fade-in"
        style={{ animationDelay: "360ms" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400/70" />
            <h3 className="text-sm font-semibold text-white">
              Цели на Рамадан
            </h3>
          </div>
          {during && currentDay > 0 && (
            <span className="text-[10px] t-text-f">День {currentDay}</span>
          )}
        </div>

        {/* Goal description */}
        <p className="text-xs text-white/40 mb-4">
          Ежедневный чек-лист ибадата в Рамадан
        </p>

        {/* Goal items */}
        <div className="space-y-2.5">
          {RAMADAN_GOALS.map(({ key, label, icon: Icon }) => {
            const dayForGoals = during && currentDay > 0 ? currentDay : 1;
            const isDone = ramadanData.goals[key]?.[dayForGoals] ?? false;

            return (
              <button
                key={key}
                onClick={() => toggleGoal(key, dayForGoals)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 active:scale-[0.98]
                  ${
                    isDone
                      ? "bg-emerald-500/15 border-emerald-500/30"
                      : "t-bg t-border-s hover:t-bg hover:t-border-s"
                  }`}
              >
                {/* Checkbox */}
                <div
                  className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200
                    ${
                      isDone
                        ? "bg-emerald-500 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                        : "border-white/20 t-bg"
                    }`}
                >
                  {isDone && <Check className="w-4 h-4 text-white" />}
                </div>

                {/* Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isDone ? "bg-emerald-500/20" : "t-bg"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isDone ? "text-emerald-400" : "text-white/40"
                    }`}
                  />
                </div>

                {/* Label */}
                <span
                  className={`text-sm font-medium flex-1 text-left ${
                    isDone
                      ? "text-emerald-300 line-through decoration-emerald-500/40"
                      : "text-white/70"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Completed count */}
        {(() => {
          const dayForGoals = during && currentDay > 0 ? currentDay : 1;
          const completedGoals = RAMADAN_GOALS.filter(
            ({ key }) => ramadanData.goals[key]?.[dayForGoals],
          ).length;

          return (
            <div className="mt-4 pt-3 border-t t-border text-center">
              <p className="text-xs t-text-f">
                Выполнено{" "}
                <span
                  className={
                    completedGoals === RAMADAN_GOALS.length
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }
                >
                  {completedGoals}/{RAMADAN_GOALS.length}
                </span>{" "}
                целей сегодня
              </p>
              {completedGoals === RAMADAN_GOALS.length && (
                <p className="text-xs text-emerald-400/70 mt-1 animate-pulse">
                  Машаллах! Все цели выполнены
                </p>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
