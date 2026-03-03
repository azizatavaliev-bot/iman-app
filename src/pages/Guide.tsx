import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { storage, getCurrentLevel, LEVELS } from "../lib/storage";
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

type Tab = "glossary" | "features" | "levels";

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

      {/* ── TAB: Levels ──────────────────────────────────────────────── */}
      {activeTab === "levels" && (
        <div className="space-y-4 animate-fade-in" id="levels">
          {/* Current status */}
          <div className="glass-card p-5 text-center">
            <div className="text-4xl mb-2">{currentLevel.icon}</div>
            <h3 className="text-white font-bold text-lg">
              {currentLevel.name}
            </h3>
            <p className="text-emerald-400 text-sm font-medium mt-1">
              {profile?.totalPoints?.toLocaleString() || 0} саваб
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
                { action: "Намаз вовремя", pts: 15 },
                { action: "Намаз с опозданием", pts: 7 },
                { action: "Чтение Корана", pts: 5 },
                { action: "Хадис", pts: 3 },
                { action: "Утренние/вечерние азкары", pts: 3 },
                { action: "Садака", pts: 8 },
                { action: "Пост", pts: 20 },
                { action: "Дуа", pts: 3 },
                { action: "Минута ибады", pts: 2 },
                { action: "Повтор хифза", pts: 5 },
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
                Все 5 намазов + привычки = ~79 саваб/день. Уровень "Муслим"
                можно достичь за 3 дня активного использования.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
