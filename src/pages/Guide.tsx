import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { storage, getCurrentLevel, LEVELS, LEVEL_DESCRIPTIONS } from "../lib/storage";
import type { UserProfile } from "../lib/storage";
import {
  GLOSSARY,
  APP_FEATURES,
  FEATURE_GROUPS,
  LEVEL_TIPS,
} from "../data/guide";

// ─────────────────────────────────────────────────────────────────────────────
// Guide Page — Introduction, Glossary, Features, Levels
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "glossary" | "features" | "levels" | "sawab";

export default function Guide() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("features");
  const [expandedTerm, setExpandedTerm] = useState<number | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setProfile(storage.getProfile());
    // If URL has #levels hash, switch to levels tab
    if (window.location.hash === "#levels") {
      setActiveTab("levels");
    }
  }, []);

  const currentLevel = profile
    ? getCurrentLevel(profile.totalPoints)
    : LEVELS[0];
  const currentLevelIndex = LEVELS.findIndex(
    (l) => l.name === currentLevel.name,
  );

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "features", label: "Функции", icon: "📱" },
    { key: "sawab", label: "Саваб", icon: "⭐" },
    { key: "glossary", label: "Словарик", icon: "📖" },
    { key: "levels", label: "Уровни", icon: "🏆" },
  ];

  return (
    <div className="min-h-screen pb-28 px-4 pt-6 max-w-lg mx-auto animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => window.history.back()}
          className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <ChevronLeft size={18} style={{ color: "var(--text-secondary)" }} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-xl">
            <BookOpen size={22} className="text-violet-400" />
          </div>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Введение в IMAN
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Инструкция, словарик и уровни
            </p>
          </div>
        </div>
      </header>

      {/* ── Tab Switcher ─────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                : "t-bg t-text-m border t-border"
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Features ────────────────────────────────────────────── */}
      {activeTab === "features" && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card p-4">
            <p className="text-sm text-white/70 leading-relaxed">
              IMAN — это ваш личный помощник на пути к Аллаху. Уделяйте хотя бы
              5-10 минут в день изучению дина. Вот что вы можете делать в
              приложении:
            </p>
          </div>

          {(
            Object.keys(FEATURE_GROUPS) as Array<keyof typeof FEATURE_GROUPS>
          ).map((groupKey) => {
            const features = APP_FEATURES.filter((f) => f.group === groupKey);
            if (features.length === 0) return null;

            return (
              <div key={groupKey}>
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 px-1">
                  {FEATURE_GROUPS[groupKey]}
                </h3>
                <div className="space-y-2">
                  {features.map((feature) => (
                    <button
                      key={feature.path}
                      onClick={() => navigate(feature.path)}
                      className="w-full glass-card p-4 flex items-start gap-3 text-left hover:scale-[0.99] active:scale-[0.97] transition-transform"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl shrink-0">
                        {feature.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-white font-semibold text-sm">
                            {feature.name}
                          </h4>
                          <ChevronRight
                            size={16}
                            className="text-white/20 shrink-0"
                          />
                        </div>
                        <p className="text-white/50 text-xs leading-relaxed mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: Sawab ──────────────────────────────────────────────── */}
      {activeTab === "sawab" && (
        <div className="space-y-4 animate-fade-in">
          {/* Sawab coin visual */}
          <div className="glass-card p-6 text-center">
            <div
              className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706, #b45309)",
                boxShadow: "0 0 30px rgba(245,158,11,0.3), inset 0 -4px 8px rgba(0,0,0,0.2), inset 0 4px 8px rgba(255,255,255,0.2)",
                border: "3px solid rgba(253,224,71,0.5)",
              }}
            >
              <span className="text-4xl font-bold text-white" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>S</span>
            </div>
            <h3 className="text-white font-bold text-xl mb-1">Саваб-коин</h3>
            <p className="text-emerald-400 text-sm font-medium mb-3">
              {profile?.totalPoints?.toLocaleString() || 0} саваб накоплено
            </p>
            <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
              Внутренняя валюта приложения для отслеживания вашей активности.
              Это <strong className="text-white/70">НЕ</strong> религиозный саваб — а система мотивации, которая помогает не забывать о ежедневных действиях.
            </p>
          </div>

          {/* How to earn */}
          <div className="glass-card p-4">
            <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 0 12px rgba(245,158,11,0.2)" }}>+</span>
              Как заработать саваб-коины
            </h4>
            <div className="space-y-2">
              {[
                { icon: "🕌", action: "Намаз вовремя", pts: 10 },
                { icon: "🕐", action: "Намаз с опозданием", pts: 3 },
                { icon: "📖", action: "Чтение Корана", pts: 5 },
                { icon: "📿", action: "Хадис дня", pts: 2 },
                { icon: "🤲", action: "Утренние/вечерние азкары", pts: 3 },
                { icon: "💚", action: "Садака", pts: 8 },
                { icon: "🌙", action: "Пост", pts: 20 },
                { icon: "📝", action: "Дуа", pts: 3 },
                { icon: "⏱️", action: "Минута сессии", pts: 2 },
                { icon: "🧠", action: "Повтор заучивания", pts: 5 },
                { icon: "🎯", action: "Ответ на викторину", pts: 2 },
              ].map(({ icon, action, pts }) => (
                <div key={action} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <span className="text-lg shrink-0">{icon}</span>
                  <span className="text-white/60 text-sm flex-1">{action}</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff" }}
                  >
                    +{pts}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-white/30 text-[11px] leading-relaxed">
                Все 5 намазов вовремя (50) + азкары (6) + Коран (5) + дуа (3) = ~64 очка/день. Уровень "Муслим" за ~3 дня.
              </p>
            </div>
          </div>

          {/* What sawab is NOT */}
          <div className="glass-card p-4" style={{ borderColor: "rgba(245,158,11,0.2)" }}>
            <h4 className="text-amber-400/80 text-xs font-semibold uppercase tracking-wider mb-2">
              Важно понимать
            </h4>
            <p className="text-white/50 text-sm leading-relaxed">
              Саваб-коины в приложении — это <strong className="text-white/70">инструмент мотивации</strong>, а не замена настоящего саваба перед Аллахом. Настоящий саваб зависит от вашего намерения (ният) и искренности. Приложение лишь помогает вам не забывать о ежедневных действиях.
            </p>
          </div>
        </div>
      )}

      {/* ── TAB: Glossary ────────────────────────────────────────────── */}
      {activeTab === "glossary" && (
        <div className="space-y-2 animate-fade-in">
          <div className="glass-card p-4 mb-4">
            <p className="text-sm text-white/70 leading-relaxed">
              Основные термины, которые встретятся вам в приложении и в изучении
              ислама. Нажмите на термин, чтобы прочитать пояснение.
            </p>
          </div>

          {GLOSSARY.map((item, i) => {
            const isExpanded = expandedTerm === i;
            return (
              <button
                key={i}
                onClick={() => setExpandedTerm(isExpanded ? null : i)}
                className="w-full glass-card p-4 text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-semibold text-sm">
                    {item.term}
                  </h4>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-white/30 shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-white/30 shrink-0" />
                  )}
                </div>
                {isExpanded && (
                  <p className="text-white/60 text-sm leading-relaxed mt-2 animate-fade-in">
                    {item.meaning}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Creator Info (only on features tab) ────────────────────── */}
      {activeTab === "features" && <div className="mt-8 glass-card p-5 text-center">
        <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(20,184,166,0.2))", border: "2px solid rgba(16,185,129,0.3)" }}>
          👨‍💻
        </div>
        <h4 className="text-white font-bold text-sm">Создатель приложения</h4>
        <p className="text-emerald-400 font-semibold text-sm mt-1">Азиз Атавалиев</p>
        <p className="text-white/40 text-xs mt-2 leading-relaxed max-w-xs mx-auto">
          Разработчик из Кыргызстана. Приложение создано с намерением помочь мусульманам укрепить свою веру через ежедневную практику.
        </p>
        <p className="text-white/20 text-[10px] mt-3 italic">
          "Лучший из вас тот, кто изучает Коран и обучает ему других"
        </p>
      </div>}

      {/* ── TAB: Levels ──────────────────────────────────────────────── */}
      {activeTab === "levels" && (
        <div className="space-y-4 animate-fade-in" id="levels">
          {/* Current status */}
          <div className="glass-card p-5 text-center">
            <div className="text-4xl mb-2">{currentLevel.icon}</div>
            <h3 className="text-white font-bold text-lg">
              {currentLevel.name} <span className="text-white/40 font-normal text-sm">({LEVEL_DESCRIPTIONS[currentLevel.name]})</span>
            </h3>
            <p className="text-emerald-400 text-sm font-medium mt-1">
              {profile?.totalPoints?.toLocaleString() || 0} очков
            </p>
            {currentLevelIndex < LEVELS.length - 1 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                  <span>{currentLevel.name}</span>
                  <span>{LEVELS[currentLevelIndex + 1].name}</span>
                </div>
                <div className="h-2 rounded-full t-bg overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (((profile?.totalPoints || 0) - currentLevel.minPoints) / (LEVELS[currentLevelIndex + 1].minPoints - currentLevel.minPoints)) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-white/30 mt-1">
                  {LEVELS[currentLevelIndex + 1].minPoints -
                    (profile?.totalPoints || 0)}{" "}
                  саваб до следующего уровня
                </p>
              </div>
            )}
          </div>

          <div className="glass-card p-3" style={{ borderColor: "rgba(245,158,11,0.15)" }}>
            <p className="text-white/40 text-[11px] leading-relaxed text-center">
              Уровни — это система внутри приложения для отслеживания вашей активности. Они не являются религиозными титулами.
            </p>
          </div>

          {/* Level ladder */}
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest px-1">
            Путь роста
          </h3>

          <div className="relative">
            {/* Vertical connecting line */}
            <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-emerald-500/40 via-emerald-500/20 to-white/5" />

            <div className="space-y-1">
              {LEVELS.map((level, i) => {
                const isCurrent = i === currentLevelIndex;
                const isPast = i < currentLevelIndex;
                const tip = LEVEL_TIPS[i];

                return (
                  <div
                    key={level.name}
                    className={`relative flex items-center gap-4 p-3 rounded-xl transition-all ${
                      isCurrent
                        ? "glass-card border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                        : ""
                    }`}
                  >
                    {/* Level dot */}
                    <div
                      className={`relative z-10 w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 ${
                        isPast
                          ? "bg-emerald-500/30"
                          : isCurrent
                            ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                            : "t-bg border t-border"
                      }`}
                    >
                      {isPast && (
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                      {isCurrent && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                      )}
                    </div>

                    {/* Level info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{level.icon}</span>
                        <span
                          className={`font-semibold text-sm ${
                            isCurrent
                              ? "text-emerald-400"
                              : isPast
                                ? "text-white/70"
                                : "text-white/40"
                          }`}
                        >
                          {level.name}
                        </span>
                        <span className={`text-[10px] ${isCurrent ? "text-emerald-400/50" : "text-white/20"}`}>
                          ({LEVEL_DESCRIPTIONS[level.name]})
                        </span>
                        <span className="text-[10px] text-white/20 font-mono">
                          {level.minPoints.toLocaleString()} pts
                        </span>
                      </div>
                      {(isCurrent || isPast) && tip && (
                        <p
                          className={`text-xs mt-0.5 ${
                            isCurrent ? "text-emerald-400/60" : "text-white/30"
                          }`}
                        >
                          {tip.tip}
                        </p>
                      )}
                    </div>

                    {/* Current badge */}
                    {isCurrent && (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                        Сейчас
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily earning info */}
          <div className="glass-card p-4">
            <h4 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">
              Как зарабатывать очки
            </h4>
            <div className="space-y-1.5">
              {[
                { action: "Намаз вовремя", pts: 10 },
                { action: "Намаз с опозданием", pts: 3 },
                { action: "Чтение Корана", pts: 5 },
                { action: "Хадис", pts: 2 },
                { action: "Утренние/вечерние азкары", pts: 3 },
                { action: "Садака", pts: 8 },
                { action: "Пост", pts: 20 },
                { action: "Дуа", pts: 3 },
                { action: "Минута сессии", pts: 2 },
                { action: "Повтор заучивания", pts: 5 },
              ].map(({ action, pts }) => (
                <div key={action} className="flex items-center justify-between">
                  <span className="text-white/50 text-xs">{action}</span>
                  <span className="text-emerald-400 text-xs font-medium">
                    +{pts}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t t-border">
              <p className="text-white/30 text-[11px] leading-relaxed">
                Все 5 намазов вовремя (50) + азкары (6) + Коран (5) + дуа (3) = ~64 очка/день. Уровень "Муслим" за ~3 дня.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
