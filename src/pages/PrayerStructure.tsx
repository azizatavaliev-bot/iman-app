import { useState, useRef } from "react";
import { ChevronLeft, ChevronDown, Headphones, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PRAYER_STRUCTURE } from "../data/prayer-structure";

// Цветовые акценты по разделам — для живого визуала
const ACCENTS: Record<string, { grad: string; ring: string; text: string; soft: string }> = {
  niyyah: { grad: "from-amber-500 to-orange-600", ring: "ring-amber-500/30", text: "text-amber-300", soft: "bg-amber-500/10" },
  counts: { grad: "from-sky-500 to-blue-600", ring: "ring-sky-500/30", text: "text-sky-300", soft: "bg-sky-500/10" },
  rakaat: { grad: "from-emerald-500 to-teal-600", ring: "ring-emerald-500/30", text: "text-emerald-300", soft: "bg-emerald-500/10" },
  qaada: { grad: "from-violet-500 to-purple-600", ring: "ring-violet-500/30", text: "text-violet-300", soft: "bg-violet-500/10" },
  full: { grad: "from-fuchsia-500 to-pink-600", ring: "ring-fuchsia-500/30", text: "text-fuchsia-300", soft: "bg-fuchsia-500/10" },
  witr: { grad: "from-indigo-500 to-violet-600", ring: "ring-indigo-500/30", text: "text-indigo-300", soft: "bg-indigo-500/10" },
  reading: { grad: "from-cyan-500 to-sky-600", ring: "ring-cyan-500/30", text: "text-cyan-300", soft: "bg-cyan-500/10" },
  short_surahs: { grad: "from-lime-500 to-green-600", ring: "ring-lime-500/30", text: "text-lime-300", soft: "bg-lime-500/10" },
  after: { grad: "from-teal-500 to-emerald-600", ring: "ring-teal-500/30", text: "text-teal-300", soft: "bg-teal-500/10" },
  women: { grad: "from-rose-500 to-pink-600", ring: "ring-rose-500/30", text: "text-rose-300", soft: "bg-rose-500/10" },
};
const DEFAULT_ACCENT = { grad: "from-emerald-500 to-teal-600", ring: "ring-emerald-500/30", text: "text-emerald-300", soft: "bg-emerald-500/10" };

export default function PrayerStructure() {
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(PRAYER_STRUCTURE[0]?.id ?? null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function toggleSection(id: string) {
    const willOpen = openId !== id;
    setOpenId(willOpen ? id : null);
    if (willOpen) {
      setTimeout(() => {
        sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }

  return (
    <div className="pb-24" style={{ background: "var(--bg-primary)" }}>
      {/* ─── Sticky compact header ─── */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-black/50 border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
          >
            <ChevronLeft size={20} style={{ color: "var(--text-primary)" }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
              Структура намаза
            </h1>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Полный порядок · ханафитский мазхаб
            </p>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-medium">
            {PRAYER_STRUCTURE.length} разделов
          </span>
        </div>
      </div>

      {/* ─── Hero ─── */}
      <div className="relative overflow-hidden px-5 pt-7 pb-8 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-600/20 via-teal-600/5 to-transparent" />
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 mb-3 text-3xl">
            📿
          </div>
          <p dir="rtl" className="text-2xl font-arabic mb-1.5" style={{ color: "var(--text-primary)" }}>
            الصَّلَاة
          </p>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Как совершать намаз
          </h2>
          <p className="text-sm mt-1.5 max-w-xs mx-auto leading-snug" style={{ color: "var(--text-muted)" }}>
            Пошагово: от намерения до зикров после намаза. С арабским, переводом и объяснением каждого этапа.
          </p>
        </div>
      </div>

      {/* ─── Sections ─── */}
      <div className="px-4 space-y-3.5">
        {PRAYER_STRUCTURE.map((section, idx) => {
          const open = openId === section.id;
          const a = ACCENTS[section.id] || DEFAULT_ACCENT;
          return (
            <div
              key={section.id}
              ref={(el) => {
                sectionRefs.current[section.id] = el;
              }}
              className={`rounded-3xl overflow-hidden scroll-mt-20 transition-all duration-300 ${
                open ? `ring-1 ${a.ring}` : ""
              }`}
              style={{
                background: "var(--bg-secondary, rgba(255,255,255,0.03))",
                border: "1px solid var(--border-secondary, rgba(255,255,255,0.06))",
              }}
            >
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 p-4 text-left active:scale-[0.99] transition-transform"
              >
                <div
                  className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${a.grad} flex items-center justify-center flex-shrink-0 text-2xl shadow-lg`}
                >
                  {section.icon}
                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-black/70 backdrop-blur flex items-center justify-center text-[10px] font-bold text-white border border-white/10">
                    {idx + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                    {section.title}
                  </p>
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>
                    {section.summary}
                  </p>
                </div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    open ? `${a.soft} ${a.text} rotate-180` : "text-slate-500"
                  }`}
                >
                  <ChevronDown size={18} />
                </div>
              </button>

              {/* Steps timeline */}
              {open && (
                <div className="px-4 pb-4">
                  <div className="relative pl-6">
                    {/* vertical line */}
                    <div className={`absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b ${a.grad} opacity-30`} />

                    <div className="space-y-3">
                      {section.steps.map((step, i) => (
                        <div key={i} className="relative">
                          {/* timeline dot */}
                          <div
                            className={`absolute -left-[22px] top-1.5 w-3.5 h-3.5 rounded-full bg-gradient-to-br ${a.grad} ring-4 ring-black/40`}
                          />

                          <div
                            className="rounded-2xl p-3.5"
                            style={{
                              background: "rgba(255,255,255,0.035)",
                              border: "1px solid rgba(255,255,255,0.05)",
                            }}
                          >
                            {/* Title */}
                            <p className="font-semibold text-sm mb-1.5" style={{ color: "var(--text-primary)" }}>
                              {step.title}
                              {step.repeat && (
                                <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-bold align-middle">
                                  {step.repeat}
                                </span>
                              )}
                            </p>

                            {/* Arabic — elegant block */}
                            {step.arabic && (
                              <div className="rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.01] border border-white/5 px-3 py-3 mb-2">
                                <p
                                  dir="rtl"
                                  className="text-right text-xl leading-loose font-arabic"
                                  style={{ color: "var(--text-primary)" }}
                                >
                                  {step.arabic}
                                </p>
                              </div>
                            )}

                            {/* Transliteration */}
                            {step.translit && (
                              <p className={`text-sm italic mb-1 ${a.text}`}>{step.translit}</p>
                            )}

                            {/* Translation */}
                            {step.translation && (
                              <p
                                className="text-sm leading-snug whitespace-pre-line"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {step.translation}
                              </p>
                            )}

                            {/* Explanation */}
                            {step.explain && (
                              <div className={`mt-2.5 rounded-xl ${a.soft} p-2.5`}>
                                <p className={`text-[10px] font-bold ${a.text} mb-1 uppercase tracking-wider flex items-center gap-1`}>
                                  💡 Объяснение
                                </p>
                                <p className="text-[13px] leading-snug" style={{ color: "var(--text-secondary, rgba(255,255,255,0.75))" }}>
                                  {step.explain}
                                </p>
                              </div>
                            )}

                            {/* Note */}
                            {step.note && (
                              <p
                                className="text-xs mt-2 leading-snug border-l-2 border-white/15 pl-2"
                                style={{ color: "var(--text-faint)" }}
                              >
                                {step.note}
                              </p>
                            )}

                            {/* Learn surah chips */}
                            {step.surahs && step.surahs.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {step.surahs.map((s) => (
                                  <button
                                    key={s.n}
                                    onClick={() => navigate(`/memorize?surah=${s.n}`)}
                                    className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full
                                               bg-gradient-to-r from-violet-500/20 to-fuchsia-500/15
                                               hover:from-violet-500/30 hover:to-fuchsia-500/25
                                               border border-violet-400/25 text-violet-100
                                               text-[11px] font-medium transition active:scale-95"
                                  >
                                    <span className="w-4 h-4 rounded-full bg-violet-400/30 flex items-center justify-center">
                                      <Headphones className="w-2.5 h-2.5" />
                                    </span>
                                    {s.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Footer hint */}
        <div className="flex items-center justify-center gap-2 pt-3 pb-1">
          <Check size={14} className="text-emerald-400" />
          <p className="text-center text-xs" style={{ color: "var(--text-faint)" }}>
            Кнопки с сурами открывают их в разделе «Заучивание»
          </p>
        </div>
      </div>
    </div>
  );
}
