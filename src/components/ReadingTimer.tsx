import { useEffect } from "react";
import { Clock, Pause, Play, Plus, X, Check, Timer } from "lucide-react";
import {
  useReadingTimer,
  startReadingTimer,
  pauseReadingTimer,
  resumeReadingTimer,
  addReadingMinutes,
  stopReadingTimer,
  ackReadingFinished,
  setReadingSection,
  formatTimer,
} from "../lib/readingTimer";
import { hapticImpact } from "../lib/api";
import { useAudio } from "./AudioPlayer";

const PRESETS = [5, 10, 15, 20, 30];

// ------------------------------------------------------------
// Плавающий виджет — монтируется глобально, виден во всех разделах
// ------------------------------------------------------------
export function ReadingTimerWidget() {
  const t = useReadingTimer();
  const audio = useAudio();
  // Если играет глобальный плеер — поднимаем виджет выше, чтобы не перекрывался.
  // Навбар (панель + подпись "by...") занимает 83px; мини-плеер аудио — ещё ~63px.
  const playerVisible = !!audio.currentSurah;
  const bottomOffset = playerVisible ? 156 : 93; // px над плеером / над навбаром

  // Хаптик при завершении
  useEffect(() => {
    if (t.finished) {
      try {
        hapticImpact("heavy");
      } catch {
        /* ignore */
      }
    }
  }, [t.finished]);

  if (!t.active) return null;

  // Экран завершения
  if (t.finished) {
    return (
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[65] w-[min(92vw,360px)] animate-slide-down"
        style={{ bottom: bottomOffset }}
      >
        <div className="glass-card p-4 border border-emerald-400/40 bg-emerald-500/10 shadow-2xl shadow-emerald-500/20 text-center">
          <div className="text-2xl mb-1">🎉</div>
          <p className="text-white text-sm font-bold mb-0.5">
            Время чтения истекло
          </p>
          <p className="text-slate-400 text-xs mb-3">
            {t.durationMin} мин · {t.section || "чтение"}. БаракаЛлаху фик!
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                hapticImpact("light");
                startReadingTimer(t.durationMin, t.section);
              }}
              className="flex-1 py-2 rounded-xl bg-emerald-500/25 text-emerald-200 text-sm font-semibold ring-1 ring-emerald-400/40"
            >
              Ещё {t.durationMin} мин
            </button>
            <button
              onClick={() => {
                hapticImpact("light");
                ackReadingFinished();
              }}
              className="flex-1 py-2 rounded-xl bg-white/[0.06] text-slate-300 text-sm font-medium flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4" /> Готово
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress =
    t.durationMin > 0
      ? 1 - t.remainingSec / (t.durationMin * 60)
      : 0;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[65]"
      style={{ bottom: bottomOffset }}
    >
      <div className="glass-card px-3 py-2.5 flex items-center gap-2.5 shadow-xl shadow-black/40 border border-white/10 bg-slate-900/90 backdrop-blur-xl">
        {/* Круговой прогресс */}
        <div className="relative w-9 h-9 shrink-0">
          <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="rgb(52,211,153)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 15}
              strokeDashoffset={2 * Math.PI * 15 * (1 - progress)}
            />
          </svg>
          <Timer className="absolute inset-0 m-auto w-4 h-4 text-emerald-400" />
        </div>

        <div className="min-w-[52px]">
          <p className="text-white text-sm font-bold tabular-nums leading-none">
            {formatTimer(t.remainingSec)}
          </p>
          <p className="text-[9px] text-slate-500 leading-none mt-1 truncate max-w-[70px]">
            {t.section || "чтение"}
          </p>
        </div>

        {/* Управление */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              hapticImpact("light");
              addReadingMinutes(5);
            }}
            className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-slate-300 hover:bg-white/10"
            title="+5 минут"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              hapticImpact("light");
              t.running ? pauseReadingTimer() : resumeReadingTimer();
            }}
            className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-300 hover:bg-emerald-500/25"
            title={t.running ? "Пауза" : "Продолжить"}
          >
            {t.running ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => {
              hapticImpact("light");
              stopReadingTimer();
            }}
            className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-slate-500 hover:bg-rose-500/20 hover:text-rose-300"
            title="Остановить"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Панель запуска — ставится наверху раздела чтения.
// Адаптируется под раздел (section), синхронизирует раздел в таймере.
// ------------------------------------------------------------
export function ReadingTimerBar({ section }: { section: string }) {
  const t = useReadingTimer();

  // Держим раздел таймера в актуальном состоянии
  useEffect(() => {
    setReadingSection(section);
  }, [section]);

  // Активный таймер — компактная строка статуса (сам виджет плавающий)
  if (t.active && !t.finished) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-300 text-xs font-medium">
        <Clock className="w-3.5 h-3.5" />
        Таймер чтения: {formatTimer(t.remainingSec)} · {t.section || section}
      </div>
    );
  }

  // Нет таймера — предложить выставить
  return (
    <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Timer className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
          Таймер чтения
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((m) => (
          <button
            key={m}
            onClick={() => {
              hapticImpact("light");
              startReadingTimer(m, section);
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs font-semibold ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition"
          >
            {m} мин
          </button>
        ))}
      </div>
    </div>
  );
}
