import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Headphones,
  Info,
  CheckCircle2,
} from "lucide-react";
import {
  RAKAT_STEPS,
  POSTURE_INFO,
  PRAYER_STRUCTURES,
} from "../data/prayer-flow";
import { trackAction } from "../lib/analytics";

const COLOR_MAP: Record<
  string,
  { bg: string; border: string; text: string; ring: string }
> = {
  emerald: {
    bg: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/30",
    text: "text-emerald-300",
    ring: "ring-emerald-500/40",
  },
  amber: {
    bg: "from-amber-500/20 to-amber-500/5",
    border: "border-amber-500/30",
    text: "text-amber-300",
    ring: "ring-amber-500/40",
  },
  rose: {
    bg: "from-rose-500/20 to-rose-500/5",
    border: "border-rose-500/30",
    text: "text-rose-300",
    ring: "ring-rose-500/40",
  },
  violet: {
    bg: "from-violet-500/20 to-violet-500/5",
    border: "border-violet-500/30",
    text: "text-violet-300",
    ring: "ring-violet-500/40",
  },
  sky: {
    bg: "from-sky-500/20 to-sky-500/5",
    border: "border-sky-500/30",
    text: "text-sky-300",
    ring: "ring-sky-500/40",
  },
};

export default function PrayerFlow() {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [showStructures, setShowStructures] = useState(false);

  useEffect(() => {
    trackAction("prayer_flow_opened");
  }, []);

  const step = RAKAT_STEPS[stepIdx];
  const posture = POSTURE_INFO[step.posture];
  const colors = COLOR_MAP[posture.color];
  const progressPct = ((stepIdx + 1) / RAKAT_STEPS.length) * 100;

  const goNext = () => {
    if (stepIdx < RAKAT_STEPS.length - 1) {
      setStepIdx(stepIdx + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const goPrev = () => {
    if (stepIdx > 0) {
      setStepIdx(stepIdx - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen pb-28 px-4 pt-4 max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <header className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} className="text-slate-300" />
        </button>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-lg">
            🕌
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">
              Структура намаза
            </h1>
            <p className="text-xs text-slate-500">
              Шаг {stepIdx + 1} из {RAKAT_STEPS.length}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowStructures((v) => !v)}
          title="Виды намазов"
          className="glass-card w-9 h-9 flex items-center justify-center"
        >
          <Info size={16} className="text-emerald-400" />
        </button>
      </header>

      {/* Progress bar */}
      <div className="relative h-1.5 bg-white/[0.04] rounded-full overflow-hidden mb-4">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Структуры намазов (раскрытие) */}
      {showStructures && (
        <div className="glass-card p-4 mb-4 animate-slide-down">
          <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold mb-3">
            Сколько ракаатов в каком намазе
          </p>
          <div className="space-y-2.5">
            {PRAYER_STRUCTURES.map((p) => (
              <div
                key={p.key}
                className="bg-white/[0.03] rounded-lg p-3 border border-white/5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{p.emoji}</span>
                  <span className="text-white text-sm font-semibold">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-auto">
                    {p.fardSunna}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-line">
                  {p.flow}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posture card — большое изображение/эмодзи положения */}
      <div
        className={`relative rounded-2xl p-5 bg-gradient-to-br ${colors.bg} border ${colors.border} mb-4 overflow-hidden`}
      >
        <div className="text-center">
          <div className="text-7xl mb-2 animate-fade-in">{posture.emoji}</div>
          <p
            className={`text-[10px] uppercase tracking-[0.2em] font-bold ${colors.text} mb-1`}
          >
            Положение тела
          </p>
          <p className="text-white text-base font-semibold">{posture.name}</p>
          <p className="text-slate-300 text-xs mt-1.5 leading-relaxed">
            {posture.description}
          </p>
        </div>
      </div>

      {/* Step card */}
      <div className="glass-card overflow-hidden mb-4">
        {/* Title */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`w-6 h-6 rounded-full ${colors.text} bg-white/[0.05] flex items-center justify-center text-[11px] font-bold`}
            >
              {stepIdx + 1}
            </span>
            <h2 className="text-white text-base font-semibold flex-1 min-w-0">
              {step.title}
            </h2>
            {step.repeat && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
                {step.repeat}
              </span>
            )}
          </div>
          {step.raktatHint && (
            <p className="text-[11px] text-violet-300 mt-1">
              📍 {step.raktatHint}
            </p>
          )}
          <p className="text-sm text-slate-300 leading-relaxed mt-2">
            {step.action}
          </p>
        </div>

        {/* Arabic */}
        {step.arabic && (
          <div className="p-4 border-b border-white/5">
            <p
              className="text-2xl leading-loose text-right text-amber-200 whitespace-pre-line"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif", direction: "rtl" }}
            >
              {step.arabic}
            </p>
          </div>
        )}

        {/* Transliteration */}
        {step.transliteration && (
          <div className="p-4 border-b border-white/5">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-bold mb-1.5">
              Транслит
            </p>
            <p className="text-sm text-emerald-200 leading-relaxed italic whitespace-pre-line">
              {step.transliteration}
            </p>
          </div>
        )}

        {/* Translation */}
        {step.translation && (
          <div className="p-4 border-b border-white/5">
            <p className="text-[10px] uppercase tracking-wider text-violet-400/80 font-bold mb-1.5">
              Перевод
            </p>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {step.translation}
            </p>
          </div>
        )}

        {/* Note */}
        {step.note && (
          <div className="p-4 bg-white/[0.02]">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              💡 Заметка
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {step.note}
            </p>
          </div>
        )}

        {/* Если это шаг с дополнительной сурой — кнопки заучивать */}
        {step.id === 5 && (
          <div className="p-4 bg-violet-500/5 border-t border-violet-500/20">
            <p className="text-[10px] uppercase tracking-wider text-violet-300 font-bold mb-2">
              Топ-5 коротких сур для намаза
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { num: 108, name: "Аль-Кавсар", ayahs: 3 },
                { num: 112, name: "Аль-Ихлас", ayahs: 4 },
                { num: 103, name: "Аль-Аср", ayahs: 3 },
                { num: 113, name: "Аль-Фалак", ayahs: 5 },
                { num: 114, name: "Ан-Нас", ayahs: 6 },
              ].map((s) => (
                <button
                  key={s.num}
                  onClick={() => navigate(`/memorize?surah=${s.num}`)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.04] hover:bg-violet-500/15 border border-white/5 hover:border-violet-500/30 active:scale-[0.97] transition text-left"
                >
                  <Headphones className="w-3 h-3 text-violet-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">
                      {s.name}
                    </p>
                    <p className="text-slate-500 text-[10px]">
                      {s.num} · {s.ayahs} аят.
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={goPrev}
          disabled={stepIdx === 0}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.97] transition disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Назад
        </button>
        <button
          onClick={goNext}
          disabled={stepIdx === RAKAT_STEPS.length - 1}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-[0.97] transition disabled:opacity-30 disabled:cursor-not-allowed text-emerald-200 text-sm font-medium ring-1 ring-emerald-500/30"
        >
          Далее
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Completion */}
      {stepIdx === RAKAT_STEPS.length - 1 && (
        <div className="glass-card p-4 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30 mb-4 text-center animate-fade-in">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-white font-semibold mb-1">Один ракаат завершён</p>
          <p className="text-emerald-200/70 text-xs leading-relaxed">
            Если намаз состоит из нескольких ракаатов — встаёшь с Такбиром и
            начинаешь со шага 4 (Аль-Фатиха). В конце последнего ракаата —
            Ташаххуд → Салават → Дуа → Салям.
          </p>
        </div>
      )}

      {/* Quick step navigation (dots) */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {RAKAT_STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => {
              setStepIdx(i);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            title={s.title}
            className={`w-6 h-6 rounded-full text-[10px] font-bold transition-all ${
              i === stepIdx
                ? "bg-emerald-500 text-white ring-2 ring-emerald-400/40 scale-110"
                : i < stepIdx
                  ? "bg-emerald-500/30 text-emerald-200"
                  : "bg-white/[0.04] text-slate-500 hover:bg-white/[0.08]"
            }`}
          >
            {s.id}
          </button>
        ))}
      </div>
    </div>
  );
}
