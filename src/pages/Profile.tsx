import { useState, useEffect } from "react";
import {
  User,
  MapPin,
  Trophy,
  Flame,
  Star,
  BookOpen,
  Moon,
  Sun,
  RotateCcw,
  ChevronLeft,
  Check,
} from "lucide-react";
import { storage, getCurrentLevel, LEVELS } from "../lib/storage";
import type { UserProfile } from "../lib/storage";
import { COMMON_CITIES } from "../data/cities";
import type { CityOption } from "../data/cities";
import { useTheme } from "../lib/ThemeContext";
import { getTelegramUser } from "../lib/telegram";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pluralDays(n: number): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs >= 11 && abs <= 19) return "дней";
  if (lastDigit === 1) return "день";
  if (lastDigit >= 2 && lastDigit <= 4) return "дня";
  return "дней";
}

function daysSinceJoined(joinedAt: string): number {
  const joined = new Date(joinedAt);
  const now = new Date();
  const diffMs = now.getTime() - joined.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

// ---------------------------------------------------------------------------
// StatCard component
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <div
        className={`${bgColor} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}
      >
        <Icon size={20} className={color} />
      </div>
      <div className="min-w-0">
        <p
          className="text-lg font-bold leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </p>
        <p
          className="text-[11px] leading-tight mt-0.5"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile Component
// ---------------------------------------------------------------------------

export default function Profile() {
  const { theme, toggleTheme, isDark } = useTheme();
  const [profile, setProfile] = useState<UserProfile>(storage.getProfile());
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [cityInput, setCityInput] = useState(profile.city);
  const [showCities, setShowCities] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Derived data
  const currentLevel = getCurrentLevel(profile.totalPoints);
  const currentLevelIndex = LEVELS.findIndex(
    (l) => l.name === currentLevel.name,
  );
  const nextLevel = LEVELS.find((l) => l.minPoints > profile.totalPoints);
  const pointsIntoLevel = profile.totalPoints - currentLevel.minPoints;
  const pointsNeeded = nextLevel
    ? nextLevel.minPoints - currentLevel.minPoints
    : 1;
  const levelProgressPct = nextLevel
    ? Math.min(100, (pointsIntoLevel / pointsNeeded) * 100)
    : 100;

  const daysJoined = daysSinceJoined(profile.joinedAt);

  // Stats from storage
  const namesProgress = storage.getNamesProgress();
  const favoriteHadiths = storage.getFavoriteHadiths();
  const quranBookmarks = storage.getQuranBookmarks();

  // Count total prayers completed (scan all prayer logs)
  const [totalPrayers, setTotalPrayers] = useState(0);

  useEffect(() => {
    // Scan prayer logs to count total completed prayers
    const raw = localStorage.getItem("iman_prayer_logs");
    if (!raw) {
      setTotalPrayers(0);
      return;
    }
    try {
      const logs = JSON.parse(raw) as Record<
        string,
        {
          prayers: Record<string, { status: string }>;
        }
      >;
      let count = 0;
      for (const log of Object.values(logs)) {
        for (const prayer of Object.values(log.prayers)) {
          if (prayer.status === "ontime" || prayer.status === "late") {
            count++;
          }
        }
      }
      setTotalPrayers(count);
    } catch {
      setTotalPrayers(0);
    }
  }, []);

  // Refresh on focus
  useEffect(() => {
    function handleFocus() {
      setProfile(storage.getProfile());
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // --- Handlers ---

  function handleSaveName() {
    const trimmed = nameInput.trim();
    const updated = storage.setProfile({ name: trimmed });
    setProfile(updated);
    setEditingName(false);
  }

  function handleSelectCity(city: CityOption) {
    setCityInput(city.name);
    setShowCities(false);
    const updated = storage.setProfile({
      city: city.name,
      lat: city.lat,
      lng: city.lng,
    });
    setProfile(updated);
  }

  function handleCityInputChange(value: string) {
    setCityInput(value);
    setShowCities(value.length > 0);
  }

  function handleCityInputBlur() {
    // Delay to allow click on dropdown
    setTimeout(() => setShowCities(false), 200);
  }

  function handleResetData() {
    storage.clearAll();
    setProfile(storage.getProfile());
    setShowResetConfirm(false);
    setCityInput("");
    setNameInput("");
  }

  // Filter cities for dropdown
  const filteredCities = cityInput
    ? COMMON_CITIES.filter((c) =>
        c.name.toLowerCase().includes(cityInput.toLowerCase()),
      )
    : COMMON_CITIES;

  // User initial for avatar + Telegram photo
  const userInitial = profile.name ? profile.name.charAt(0).toUpperCase() : "?";
  const tgUser = getTelegramUser();
  const avatarUrl =
    tgUser?.photoUrl ||
    ((profile as Record<string, unknown>).telegramPhoto as string) ||
    "";

  return (
    <div className="min-h-screen pb-8 px-4 pt-6 max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}
      <header className="flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <ChevronLeft size={18} style={{ color: "var(--text-secondary)" }} />
        </button>
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Профиль
        </h1>
      </header>

      {/* ================================================================ */}
      {/* AVATAR & NAME                                                    */}
      {/* ================================================================ */}
      <div className="flex flex-col items-center text-center space-y-3">
        {/* Avatar with level glow */}
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={profile.name}
              className="w-24 h-24 rounded-full object-cover"
              style={{
                boxShadow:
                  currentLevelIndex >= 4
                    ? "0 0 30px rgba(245,158,11,0.4), 0 0 60px rgba(245,158,11,0.15)"
                    : currentLevelIndex >= 2
                      ? "0 0 20px rgba(16,185,129,0.3), 0 0 40px rgba(16,185,129,0.1)"
                      : "0 0 15px rgba(255,255,255,0.05)",
              }}
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
              style={{
                color: "var(--text-primary)",
                background:
                  "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(245,158,11,0.3))",
                boxShadow:
                  currentLevelIndex >= 4
                    ? "0 0 30px rgba(245,158,11,0.4), 0 0 60px rgba(245,158,11,0.15)"
                    : currentLevelIndex >= 2
                      ? "0 0 20px rgba(16,185,129,0.3), 0 0 40px rgba(16,185,129,0.1)"
                      : "0 0 15px rgba(255,255,255,0.05)",
              }}
            >
              {userInitial}
            </div>
          )}

          {/* Level badge pinned to avatar */}
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
            style={{
              background:
                currentLevelIndex >= 4
                  ? "linear-gradient(135deg, #f59e0b, #d97706)"
                  : currentLevelIndex >= 2
                    ? "linear-gradient(135deg, #10b981, #059669)"
                    : "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))",
              boxShadow:
                currentLevelIndex >= 4
                  ? "0 0 12px rgba(245,158,11,0.5)"
                  : currentLevelIndex >= 2
                    ? "0 0 12px rgba(16,185,129,0.4)"
                    : "none",
              color: currentLevelIndex >= 2 ? "#fff" : "rgba(255,255,255,0.7)",
            }}
          >
            <span>{currentLevel.icon}</span>
            <span>{currentLevel.name}</span>
          </div>
        </div>

        {/* Name (editable) */}
        <div className="mt-4 w-full max-w-xs">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                autoFocus
                placeholder="Ваше имя"
                className="flex-1 rounded-xl px-4 py-2.5 text-center text-lg font-semibold focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-input)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                onClick={handleSaveName}
                className="bg-emerald-500/20 text-emerald-400 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
              >
                <Check size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setNameInput(profile.name);
                setEditingName(true);
              }}
              className="text-lg font-semibold text-white hover:text-emerald-400 transition-colors"
            >
              {profile.name || "Укажите имя"}
            </button>
          )}
        </div>

        {/* Joined date */}
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          {daysJoined === 0
            ? "Присоединился сегодня"
            : `С нами ${daysJoined} ${pluralDays(daysJoined)}`}
        </p>
      </div>

      {/* ================================================================ */}
      {/* LEVEL PROGRESS                                                   */}
      {/* ================================================================ */}
      <div className="glass-card p-5 space-y-5 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

        {/* Current level header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">{currentLevel.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-white">
                {currentLevel.name}
              </h2>
              <p className="text-xs t-text-m">
                {profile.totalPoints.toLocaleString()} очков
              </p>
            </div>
          </div>
          {nextLevel && (
            <div className="text-right">
              <p className="text-xs t-text-f">Следующий</p>
              <p className="text-sm font-semibold text-amber-400/80">
                {nextLevel.icon} {nextLevel.name}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar to next level */}
        <div>
          <div className="flex items-center justify-between text-[11px] t-text-f mb-1.5">
            <span>
              {pointsIntoLevel.toLocaleString()} /{" "}
              {(nextLevel ? pointsNeeded : pointsIntoLevel).toLocaleString()}
            </span>
            <span>{Math.round(levelProgressPct)}%</span>
          </div>
          <div className="w-full h-3 t-bg rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${levelProgressPct}%`,
                background:
                  levelProgressPct >= 100
                    ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                    : "linear-gradient(90deg, #10b981, #34d399)",
                boxShadow:
                  levelProgressPct >= 100
                    ? "0 0 12px rgba(245,158,11,0.5)"
                    : "0 0 12px rgba(16,185,129,0.4)",
              }}
            />
          </div>
          {nextLevel && (
            <p className="text-[10px] t-text-f mt-1.5">
              Ещё {(nextLevel.minPoints - profile.totalPoints).toLocaleString()}{" "}
              очков до{" "}
              <span className="text-amber-400/50">
                {nextLevel.icon} {nextLevel.name}
              </span>
            </p>
          )}
        </div>

        {/* Vertical timeline of all levels */}
        <div className="space-y-0">
          {LEVELS.map((level, idx) => {
            const isCompleted =
              profile.totalPoints >= level.minPoints && idx < currentLevelIndex;
            const isCurrent = idx === currentLevelIndex;
            const isLocked = idx > currentLevelIndex;

            return (
              <div key={level.name} className="flex items-stretch gap-3">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center w-8 flex-shrink-0">
                  {/* Connector line top (hidden for first) */}
                  <div
                    className={`w-0.5 flex-1 ${
                      idx === 0
                        ? "bg-transparent"
                        : isCompleted || isCurrent
                          ? "bg-emerald-500/40"
                          : "t-bg"
                    }`}
                  />
                  {/* Dot */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm transition-all duration-300 ${
                      isCurrent ? "ring-2 ring-emerald-400/50" : ""
                    }`}
                    style={{
                      background: isCurrent
                        ? "linear-gradient(135deg, #10b981, #059669)"
                        : isCompleted
                          ? "rgba(16,185,129,0.2)"
                          : "rgba(255,255,255,0.05)",
                      boxShadow: isCurrent
                        ? "0 0 16px rgba(16,185,129,0.4)"
                        : "none",
                    }}
                  >
                    {isCompleted ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <span
                        className={`text-xs ${isCurrent ? "" : "grayscale opacity-50"}`}
                      >
                        {level.icon}
                      </span>
                    )}
                  </div>
                  {/* Connector line bottom (hidden for last) */}
                  <div
                    className={`w-0.5 flex-1 ${
                      idx === LEVELS.length - 1
                        ? "bg-transparent"
                        : isCompleted
                          ? "bg-emerald-500/40"
                          : "t-bg"
                    }`}
                  />
                </div>

                {/* Level info */}
                <div
                  className={`flex-1 py-2.5 flex items-center justify-between ${
                    isCurrent
                      ? "text-white"
                      : isCompleted
                        ? "t-text-s"
                        : "t-text-f"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        isCurrent ? "text-emerald-400" : ""
                      }`}
                    >
                      {level.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] uppercase tracking-widest bg-emerald-500/15 text-emerald-400/80 px-2 py-0.5 rounded-full font-semibold">
                        Сейчас
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      isLocked ? "t-text-h" : "t-text-f"
                    }`}
                  >
                    {level.minPoints.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================ */}
      {/* STATISTICS CARDS                                                 */}
      {/* ================================================================ */}
      <div>
        <h2 className="text-sm font-semibold t-text-m uppercase tracking-widest mb-3 px-1">
          Статистика
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Moon}
            label="Намазов совершено"
            value={totalPrayers}
            color="text-emerald-400"
            bgColor="bg-emerald-400/10"
          />
          <StatCard
            icon={Flame}
            label={`Серия / рекорд`}
            value={`${profile.streak} / ${profile.longestStreak}`}
            color="text-amber-400"
            bgColor="bg-amber-400/10"
          />
          <StatCard
            icon={Trophy}
            label="Всего очков"
            value={profile.totalPoints.toLocaleString()}
            color="text-yellow-400"
            bgColor="bg-yellow-400/10"
          />
          <StatCard
            icon={Star}
            label="Имён Аллаха изучено"
            value={`${namesProgress.learned.length}/99`}
            color="text-purple-400"
            bgColor="bg-purple-400/10"
          />
          <StatCard
            icon={BookOpen}
            label="Хадисов прочитано"
            value={favoriteHadiths.length}
            color="text-sky-400"
            bgColor="bg-sky-400/10"
          />
          <StatCard
            icon={User}
            label="Сур в закладках"
            value={quranBookmarks.length}
            color="text-rose-400"
            bgColor="bg-rose-400/10"
          />
        </div>
      </div>

      {/* ================================================================ */}
      {/* SETTINGS                                                         */}
      {/* ================================================================ */}
      <div>
        <h2
          className="text-sm font-semibold uppercase tracking-widest mb-3 px-1"
          style={{ color: "var(--text-muted)" }}
        >
          Настройки
        </h2>
        <div className="glass-card p-4 space-y-4">
          {/* Theme toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: isDark
                    ? "rgba(99,102,241,0.15)"
                    : "rgba(245,158,11,0.15)",
                }}
              >
                {isDark ? (
                  <Moon size={20} className="text-indigo-400" />
                ) : (
                  <Sun size={20} className="text-amber-500" />
                )}
              </div>
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isDark ? "Тёмная тема" : "Светлая тема"}
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {isDark ? "Переключить на светлую" : "Переключить на тёмную"}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="relative w-14 h-8 rounded-full transition-all duration-300"
              style={{
                background: isDark
                  ? "rgba(99,102,241,0.3)"
                  : "rgba(16,185,129,0.3)",
              }}
            >
              <div
                className="absolute top-1 w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center"
                style={{
                  left: isDark ? "4px" : "calc(100% - 28px)",
                  background: isDark ? "#6366f1" : "#10b981",
                  boxShadow: `0 0 10px ${isDark ? "rgba(99,102,241,0.5)" : "rgba(16,185,129,0.5)"}`,
                }}
              >
                {isDark ? (
                  <Moon size={12} className="text-white" />
                ) : (
                  <Sun size={12} className="text-white" />
                )}
              </div>
            </button>
          </div>

          <div
            className="h-px"
            style={{ background: "var(--border-primary)" }}
          />

          {/* City input */}
          <div className="relative">
            <label
              className="flex items-center gap-2 text-xs mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              <MapPin size={14} />
              <span>Город (для времени намаза)</span>
            </label>
            <input
              type="text"
              value={cityInput}
              onChange={(e) => handleCityInputChange(e.target.value)}
              onFocus={() => setShowCities(true)}
              onBlur={handleCityInputBlur}
              placeholder="Введите город..."
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-input)",
                color: "var(--text-primary)",
              }}
            />

            {/* Cities dropdown */}
            {showCities && filteredCities.length > 0 && (
              <div
                className="absolute z-20 top-full mt-1 left-0 right-0 backdrop-blur-xl rounded-xl overflow-hidden shadow-2xl"
                style={{
                  background: "var(--dropdown-bg)",
                  border: "1px solid var(--border-secondary)",
                }}
              >
                {filteredCities.map((city) => (
                  <button
                    key={city.name}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectCity(city)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                      profile.city === city.name ? "text-emerald-400" : ""
                    }`}
                    style={{
                      color:
                        profile.city === city.name
                          ? undefined
                          : "var(--text-secondary)",
                    }}
                  >
                    <span>{city.name}</span>
                    {profile.city === city.name && (
                      <Check size={14} className="text-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {profile.city && (
              <p className="text-[10px] t-text-h mt-1.5 px-1">
                Текущий город: {profile.city}
                {profile.lat && profile.lng && (
                  <span>
                    {" "}
                    ({profile.lat.toFixed(2)}, {profile.lng.toFixed(2)})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* RESET DATA                                                       */}
      {/* ================================================================ */}
      <div className="pt-4">
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-500/20 text-red-400/70 text-sm font-medium hover:bg-red-500/5 hover:border-red-500/30 active:scale-[0.98] transition-all"
          >
            <RotateCcw size={16} />
            <span>Сбросить все данные</span>
          </button>
        ) : (
          <div className="glass-card p-5 border-red-500/20 space-y-4">
            <div className="text-center">
              <p className="text-sm font-semibold text-red-400 mb-1">
                Вы уверены?
              </p>
              <p className="text-xs t-text-m leading-relaxed">
                Все данные будут удалены: прогресс намазов, очки, уровень,
                закладки и избранные хадисы. Это действие нельзя отменить.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl t-bg t-text-s text-sm font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleResetData}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors"
              >
                Удалить всё
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom spacing for mobile nav */}
      <div className="h-4" />
    </div>
  );
}
