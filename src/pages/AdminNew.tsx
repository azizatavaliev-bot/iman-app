import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Users,
  Activity,
  Clock,
  TrendingUp,
  Eye,
  MousePointerClick,
  Shield,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Wifi,
  BarChart3,
} from "lucide-react";
import { isAdmin } from "../lib/adminConfig";
import { getAdminDashboard, getAdminHeaders, type AdminDashboard } from "../lib/adminStats";
import { getTelegramUser } from "../lib/telegram";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface AnalyticsData {
  online: number;
  activeToday: number;
  topPages: Array<{ page: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  avgSessionDuration: number;
  timeline: Array<{ hour: string; users: number }>;
  topUsers: Array<{
    telegram_id: number;
    name: string;
    username: string | null;
    points: number;
    level: string;
  }>;
  prayers: {
    today: number;
    week: number;
  };
  newUsers: {
    today: number;
    week: number;
  };
  quranViews: number;
}

// ----------------------------------------------------------------
// StatCard Component
// ----------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
  bgColor,
  pulse = false,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
  bgColor: string;
  pulse?: boolean;
}) {
  return (
    <div className="glass-card p-4 relative overflow-hidden">
      {pulse && (
        <div
          className={`absolute top-2 right-2 w-2 h-2 rounded-full ${bgColor.replace("/10", "")} animate-pulse`}
        ></div>
      )}
      <div className="flex items-start gap-3">
        <div
          className={`${bgColor} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}
        >
          <Icon size={24} className={color} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs uppercase tracking-wider mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            {label}
          </p>
          <p
            className="text-2xl font-bold leading-none"
            style={{ color: "var(--text-primary)" }}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Page Names Mapping
// ----------------------------------------------------------------

const PAGE_NAMES: Record<string, string> = {
  "/": "Главная",
  "/prayers": "Намазы",
  "/quran": "Коран",
  "/hadith": "Хадисы",
  "/dua": "Дуа",
  "/zikr": "Зикры",
  "/quiz": "Викторина",
  "/habits": "Привычки",
  "/seerah": "Сира",
  "/names": "99 Имён",
  "/stats": "Статистика",
  "/qibla": "Кибла",
  "/hifz": "Заучивание",
  "/ibadah": "Поклонение",
  "/newcomers": "Новичкам",
  "/about": "О приложении",
  "/profile": "Профиль",
  "/admin": "Админ-панель",
};

const ACTION_NAMES: Record<string, string> = {
  prayer_marked: "Отметил намаз",
  habit_toggled: "Изменил привычку",
  quiz_completed: "Завершил викторину",
  quiz_started: "Начал викторину",
  quran_played: "Включил Коран",
  hadith_viewed: "Просмотрел хадис",
  dua_viewed: "Просмотрел дуа",
  zikr_completed: "Завершил зикр",
  ibadah_started: "Начал ибаду",
  hifz_session: "Сессия заучивания",
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} сек`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} мин`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}ч ${remainMins}м`;
}

// ----------------------------------------------------------------
// Admin Page Component
// ----------------------------------------------------------------

export default function AdminNew() {
  const navigate = useNavigate();
  const tgUser = getTelegramUser();

  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"points" | "prayers" | "lastActive">(
    "lastActive",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const USERS_PER_PAGE = 20;

  // Check admin access — also check localStorage profile as fallback
  useEffect(() => {
    let adminId = tgUser?.id;
    let adminUsername = tgUser?.username;

    if (!adminId) {
      try {
        const profile = localStorage.getItem("iman_profile");
        if (profile) {
          const p = JSON.parse(profile);
          adminId = p.telegramId;
          adminUsername = p.telegramUsername;
        }
      } catch {}
    }

    if (!isAdmin(adminId, adminUsername)) {
      navigate("/");
    }
  }, [tgUser, navigate]);

  // Load dashboard data
  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const headers = getAdminHeaders();

      const [dashData, analyticsData] = await Promise.all([
        getAdminDashboard(),
        fetch(`${API_BASE}/api/admin/analytics`, { headers }).then((r) => {
          if (!r.ok) throw new Error(`Analytics API: ${r.status} ${r.statusText}`);
          return r.json();
        }),
      ]);

      setDashboard(dashData);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error("Failed to load admin data:", err);
      setError(
        err instanceof Error
          ? `Ошибка: ${err.message}`
          : "Не удалось загрузить данные",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p style={{ color: "var(--text-muted)" }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-6 max-w-sm w-full text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-xs text-white/30 mb-4">
            {tgUser ? `TG ID: ${tgUser.id}` : "Telegram не обнаружен"}
          </p>
          <button
            onClick={() => { loadData(); }}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Загрузка..." : "Повторить"}
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  // Sort and filter users
  let users = [...dashboard.users];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    users = users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.city?.toLowerCase().includes(q),
    );
  }

  users.sort((a, b) => {
    let aVal, bVal;
    if (sortBy === "points") {
      aVal = a.points;
      bVal = b.points;
    } else if (sortBy === "prayers") {
      aVal = a.totalPrayers;
      bVal = b.totalPrayers;
    } else {
      aVal = new Date(a.lastActive).getTime();
      bVal = new Date(b.lastActive).getTime();
    }
    return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
  });

  const totalPages = Math.ceil(users.length / USERS_PER_PAGE);
  const paginatedUsers = users.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE,
  );

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  return (
    <div className="pb-24">
      {/* ============================================================ */}
      {/* HEADER                                                       */}
      {/* ============================================================ */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/40 border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
          >
            <ChevronLeft size={20} style={{ color: "var(--text-primary)" }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1
              className="text-xl font-bold leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              <Shield className="inline w-5 h-5 mr-2 text-red-500" />
              Админ-панель
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Статистика IMAN App
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center hover:bg-purple-500/30 active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={`text-purple-400 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* ============================================================ */}
        {/* LIVE STATS                                                   */}
        {/* ============================================================ */}
        <div>
          <h2
            className="text-sm uppercase tracking-wider mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            Live Статистика
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Wifi}
              label="Онлайн сейчас"
              value={analytics?.online || 0}
              subtitle="Активны последние 5 мин"
              color="text-green-400"
              bgColor="bg-green-400/10"
              pulse={true}
            />
            <StatCard
              icon={Activity}
              label="Активны сегодня"
              value={analytics?.activeToday || 0}
              subtitle="За последние 24 часа"
              color="text-blue-400"
              bgColor="bg-blue-400/10"
            />
            <StatCard
              icon={Users}
              label="Всего пользователей"
              value={dashboard.totalUsers}
              subtitle={`${dashboard.activeWeek} активны эту неделю`}
              color="text-purple-400"
              bgColor="bg-purple-400/10"
            />
            <StatCard
              icon={Clock}
              label="Средняя сессия"
              value={formatDuration(analytics?.avgSessionDuration || 0)}
              subtitle="За последние 7 дней"
              color="text-amber-400"
              bgColor="bg-amber-400/10"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* GROWTH & ACTIVITY STATS                                      */}
        {/* ============================================================ */}
        <div>
          <h2
            className="text-sm uppercase tracking-wider mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            Рост и активность
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Users}
              label="Новых сегодня"
              value={analytics?.newUsers?.today || 0}
              subtitle={`${analytics?.newUsers?.week || 0} за неделю`}
              color="text-cyan-400"
              bgColor="bg-cyan-400/10"
            />
            <StatCard
              icon={Activity}
              label="Намазов сегодня"
              value={analytics?.prayers?.today || 0}
              subtitle={`${analytics?.prayers?.week || 0} за неделю`}
              color="text-emerald-400"
              bgColor="bg-emerald-400/10"
            />
            <StatCard
              icon={Eye}
              label="Просмотров Корана"
              value={analytics?.quranViews || 0}
              subtitle="За последние 7 дней"
              color="text-indigo-400"
              bgColor="bg-indigo-400/10"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* TOP 5 USERS BY POINTS                                        */}
        {/* ============================================================ */}
        {analytics?.topUsers && analytics.topUsers.length > 0 && (
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-amber-400" />
              <h3
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Топ-5 по баллам
              </h3>
            </div>
            <div className="space-y-3">
              {analytics.topUsers.map((user, i) => (
                <div
                  key={user.telegram_id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      i === 0
                        ? "bg-amber-400/20"
                        : i === 1
                          ? "bg-slate-400/20"
                          : i === 2
                            ? "bg-orange-400/20"
                            : "bg-purple-400/20"
                    }`}
                  >
                    <span
                      className={`text-sm font-bold ${
                        i === 0
                          ? "text-amber-400"
                          : i === 1
                            ? "text-slate-400"
                            : i === 2
                              ? "text-orange-400"
                              : "text-purple-400"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {user.name}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {user.username ? `@${user.username}` : "—"} • {user.level}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-amber-400">
                      {user.points}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-faint)" }}
                    >
                      баллов
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TOP PAGES & ACTIONS                                          */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Pages */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={18} className="text-sky-400" />
              <h3
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Популярные страницы
              </h3>
            </div>
            <div className="space-y-2">
              {analytics?.topPages.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-sky-400/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-sky-400">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {PAGE_NAMES[item.page] || item.page}
                    </p>
                  </div>
                  <span
                    className="text-xs font-mono"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Actions */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <MousePointerClick size={18} className="text-emerald-400" />
              <h3
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Популярные действия
              </h3>
            </div>
            <div className="space-y-2">
              {analytics?.topActions.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-emerald-400">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {ACTION_NAMES[item.action] || item.action}
                    </p>
                  </div>
                  <span
                    className="text-xs font-mono"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* AVERAGE STATS + ACTIVE MONTH                                 */}
        {/* ============================================================ */}
        <div>
          <h2
            className="text-sm uppercase tracking-wider mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            Средние показатели
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Users}
              label="Активны за месяц"
              value={dashboard.activeMonth}
              subtitle="уникальных пользователей"
              color="text-teal-400"
              bgColor="bg-teal-400/10"
            />
            <StatCard
              icon={TrendingUp}
              label="Ср. уровень"
              value={dashboard.averageLevel}
              color="text-violet-400"
              bgColor="bg-violet-400/10"
            />
            <StatCard
              icon={BarChart3}
              label="Ср. очки"
              value={Math.round(dashboard.averagePoints)}
              color="text-amber-400"
              bgColor="bg-amber-400/10"
            />
            <StatCard
              icon={Activity}
              label="Ср. страйк"
              value={`${Math.round(dashboard.averageStreak)} д.`}
              color="text-orange-400"
              bgColor="bg-orange-400/10"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* TOP FEATURES                                                 */}
        {/* ============================================================ */}
        {dashboard.topFeatures && dashboard.topFeatures.length > 0 && (
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-violet-400" />
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Топ-фичи
              </h3>
              <span className="ml-auto text-xs" style={{ color: "var(--text-faint)" }}>
                использований
              </span>
            </div>
            <div className="space-y-3">
              {dashboard.topFeatures.map((feat, i) => {
                const maxUsage = Math.max(dashboard.topFeatures[0]?.usage || 1, 1);
                const pct = Math.round((feat.usage / maxUsage) * 100);
                const colors = ["bg-violet-400", "bg-blue-400", "bg-emerald-400", "bg-amber-400", "bg-pink-400"];
                return (
                  <div key={feat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {feat.name}
                      </span>
                      <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                        {feat.usage}
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--progress-bg)" }}>
                      <div
                        className={`h-full rounded-full ${colors[i % colors.length]}`}
                        style={{ width: `${pct}%`, transition: "width 0.5s ease" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* HOURLY ACTIVITY TIMELINE                                     */}
        {/* ============================================================ */}
        {analytics?.timeline && analytics.timeline.length > 0 && (
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-cyan-400" />
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Активность по часам (24ч)
              </h3>
            </div>
            <div className="flex items-end gap-0.5 h-20">
              {analytics.timeline.map((slot, i) => {
                const maxUsers = Math.max(...analytics.timeline.map((s) => s.users), 1);
                const heightPct = Math.round((slot.users / maxUsers) * 100);
                const isNow = new Date().getHours() === parseInt(slot.hour);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className={`w-full rounded-t-sm ${isNow ? "bg-cyan-400" : "bg-cyan-400/35"}`}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      title={`${slot.hour}:00 — ${slot.users} пользователей`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1 px-0.5">
              {[0, 6, 12, 18, 23].map((h) => (
                <span key={h} className="text-xs" style={{ color: "var(--text-faint)", fontSize: "9px" }}>
                  {h}:00
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* USER TABLE                                                   */}
        {/* ============================================================ */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Все пользователи ({users.length})
            </h2>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Поиск по имени или городу..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-purple-500/50 transition-colors"
              style={{ color: "var(--text-primary)" }}
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th
                    className="text-left py-2 px-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <button
                      onClick={() => toggleSort("lastActive")}
                      className="flex items-center gap-1 hover:text-purple-400 transition-colors"
                    >
                      Пользователь
                      {sortBy === "lastActive" &&
                        (sortOrder === "desc" ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronUp size={14} />
                        ))}
                    </button>
                  </th>
                  <th
                    className="text-center py-2 px-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <button
                      onClick={() => toggleSort("points")}
                      className="flex items-center gap-1 hover:text-purple-400 transition-colors mx-auto"
                    >
                      Очки
                      {sortBy === "points" &&
                        (sortOrder === "desc" ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronUp size={14} />
                        ))}
                    </button>
                  </th>
                  <th
                    className="text-center py-2 px-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <button
                      onClick={() => toggleSort("prayers")}
                      className="flex items-center gap-1 hover:text-purple-400 transition-colors mx-auto"
                    >
                      Намазы
                      {sortBy === "prayers" &&
                        (sortOrder === "desc" ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronUp size={14} />
                        ))}
                    </button>
                  </th>
                  <th
                    className="text-right py-2 px-2 hidden sm:table-cell"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Страйк
                  </th>
                  <th
                    className="text-right py-2 px-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Дата
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr
                    key={user.telegramId}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <div>
                        <p
                          className="font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {user.name}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-faint)" }}
                        >
                          {user.level} • {user.city || "—"}
                        </p>
                      </div>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="font-mono text-amber-400">
                        {user.totalPoints}
                      </span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span
                        className="font-mono"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {user.totalPrayers}
                      </span>
                    </td>
                    <td className="text-right py-3 px-2 hidden sm:table-cell">
                      <span className="font-mono text-orange-400">
                        {user.streak} д.
                      </span>
                    </td>
                    <td className="text-right py-3 px-2">
                      <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>
                        {new Date(user.joinedAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-sm disabled:opacity-30 hover:bg-white/10 transition-colors"
                style={{ color: "var(--text-primary)" }}
              >
                Назад
              </button>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                Страница {currentPage} из {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-sm disabled:opacity-30 hover:bg-white/10 transition-colors"
                style={{ color: "var(--text-primary)" }}
              >
                Далее
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
