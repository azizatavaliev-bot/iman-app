import { useState, useEffect } from "react";
import { ChevronLeft, ChevronDown, ChevronUp, Check } from "lucide-react";
import { storage } from "../lib/storage";
import { scheduleSyncPush } from "../lib/sync";
import { NAMAZ_GUIDE_SECTIONS, USEFUL_MATERIALS } from "../data/namazGuide";

const STORAGE_KEY = "iman_namaz_guide_read";

function getReadSections(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

function saveReadSections(ids: number[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  scheduleSyncPush();
}

export default function NamazGuide() {
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const stored = getReadSections();
    setReadIds(new Set(stored));
  }, []);

  const readCount = readIds.size;
  const totalCount = NAMAZ_GUIDE_SECTIONS.length;
  const progressPct = Math.round((readCount / totalCount) * 100);

  const handleToggle = (sectionId: number) => {
    const isClosing = expandedId === sectionId;
    setExpandedId(isClosing ? null : sectionId);

    if (!isClosing && !readIds.has(sectionId)) {
      const section = NAMAZ_GUIDE_SECTIONS.find((s) => s.id === sectionId);
      if (section) {
        const newReadIds = new Set(readIds);
        newReadIds.add(sectionId);
        setReadIds(newReadIds);
        saveReadSections(Array.from(newReadIds));
        storage.addExtraPoints(section.points);
      }
    }
  };

  return (
    <div className="min-h-screen pb-28 px-4 pt-6 max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => window.history.back()}
          className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <ChevronLeft size={18} style={{ color: "var(--text-secondary)" }} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl">
            🕌
          </div>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Гид по намазу
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Пошаговое обучение молитве
            </p>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {readCount}/{totalCount} разделов изучено
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {progressPct}%
          </span>
        </div>
        <div
          className="w-full h-2.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, #10b981, #34d399)",
              boxShadow: "0 0 12px rgba(16,185,129,0.4)",
            }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {NAMAZ_GUIDE_SECTIONS.map((section, index) => {
          const isRead = readIds.has(section.id);
          const isExpanded = expandedId === section.id;

          return (
            <div
              key={section.id}
              className="animate-fade-in"
              style={{ animationDelay: `${0.03 + index * 0.04}s` }}
            >
              <div
                className={`glass-card overflow-hidden transition-all duration-300 ${
                  isExpanded
                    ? "ring-1 ring-emerald-500/20"
                    : "hover:bg-white/[0.04] active:scale-[0.99]"
                }`}
              >
                {/* Section Header */}
                <button
                  onClick={() => handleToggle(section.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-all duration-300 ${
                      isRead ? "ring-2 ring-emerald-400/30" : ""
                    }`}
                    style={{
                      background: isRead
                        ? "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(52,211,153,0.1))"
                        : "rgba(255,255,255,0.05)",
                    }}
                  >
                    {isRead ? (
                      <Check size={16} className="text-emerald-400" />
                    ) : (
                      <span>{section.icon}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-sm font-semibold leading-snug"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {section.title}
                    </h3>
                    <p
                      className="text-xs mt-0.5 leading-relaxed"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {section.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isRead && (
                      <span className="text-[10px] text-emerald-400/70 font-medium">
                        +{section.points}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp
                        size={16}
                        style={{ color: "var(--text-muted)" }}
                      />
                    ) : (
                      <ChevronDown
                        size={16}
                        style={{ color: "var(--text-muted)" }}
                      />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded
                      ? "max-h-[8000px] opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-4 pb-4">
                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                      <div className="w-1 h-1 rounded-full bg-emerald-500/30" />
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                    </div>

                    {/* Steps */}
                    <div className="space-y-4">
                      {section.steps.map((step, sIdx) => (
                        <div key={sIdx}>
                          <h4
                            className="text-sm font-semibold mb-1.5"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {step.title}
                          </h4>

                          <div className="space-y-1.5">
                            {step.description.split("\n").map((line, lIdx) => (
                              <p
                                key={lIdx}
                                className="text-xs leading-relaxed"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {line}
                              </p>
                            ))}
                          </div>

                          {step.arabic && (
                            <div
                              className="mt-3 rounded-xl p-3.5"
                              style={{
                                background: "rgba(16,185,129,0.06)",
                                border: "1px solid rgba(16,185,129,0.12)",
                              }}
                            >
                              <p
                                className="text-base leading-loose text-right mb-2"
                                style={{
                                  fontFamily:
                                    "'Amiri', 'Scheherazade New', serif",
                                  color: "var(--text-primary)",
                                  direction: "rtl",
                                }}
                              >
                                {step.arabic}
                              </p>
                              {step.transcription && (
                                <p className="text-xs text-emerald-400/80 mb-1 italic">
                                  {step.transcription}
                                </p>
                              )}
                              {step.translation && (
                                <p
                                  className="text-xs leading-relaxed"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  {step.translation}
                                </p>
                              )}
                            </div>
                          )}

                          {sIdx < section.steps.length - 1 && (
                            <div
                              className="mt-4 h-px"
                              style={{
                                background:
                                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Useful Materials */}
      <div className="mt-8">
        <h3
          className="text-xs font-semibold uppercase tracking-widest mb-3 px-1"
          style={{ color: "var(--text-muted)" }}
        >
          Полезные материалы
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {USEFUL_MATERIALS.map((material) => (
            <div
              key={material.id}
              className="glass-card p-4 flex flex-col gap-2 opacity-70"
            >
              <span className="text-2xl">{material.icon}</span>
              <h4
                className="text-sm font-semibold leading-snug"
                style={{ color: "var(--text-primary)" }}
              >
                {material.title}
              </h4>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {material.description}
              </p>
              <span
                className="text-[10px] mt-auto font-medium"
                style={{ color: "var(--text-faint)" }}
              >
                Скоро
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}
