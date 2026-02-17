import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Users,
  TrendingUp,
  Activity,
  BarChart3,
  Shield,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { isAdmin } from "../lib/adminConfig";
import { getAdminDashboard, type AdminDashboard } from "../lib/adminStats";
import { getTelegramUser } from "../lib/telegram";

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
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="glass-card p-4">
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
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-faint)" }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Admin Page Component
// ----------------------------------------------------------------

export default function Admin() {
  const navigate = useNavigate();
  const tgUser = getTelegramUser();

  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"points" | "prayers" | "lastActive">("points");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const USERS_PER_PAGE = 20;

  // Check admin access
  useEffect(() => {
    if (!isAdmin(tgUser?.id)) {
      navigate("/");
    }
  }, [tgUser, navigate]);

  // Load dashboard data
  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminDashboard();
      setDashboard(data);
    } catch (err) {
      console.error("Failed to load admin dashboard:", err);
      setError("Не удалось загрузить данные. Проверьте подключение к серверу.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (!isAdmin(tgUser?.id)) {
    return null;
  }

  // Filter and sort users
  const filteredUsers = dashboard
    ? dashboard.users
        .filter((user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .sort((a, b) => {
          let aVal: number | string;
          let bVal: number | string;

          if (sortBy === "points") {
            aVal = a.points;
            bVal = b.points;
          } else if (sortBy === "prayers") {
            aVal = a.totalPrayers;
            bVal = b.totalPrayers;
          } else {
            aVal = a.lastActive.getTime();
            bVal = b.lastActive.getTime();
          }

          if (sortOrder === "asc") {
            return aVal > bVal ? 1 : -1;
          } else {
            return aVal < bVal ? 1 : -1;
          }
        })
    : [];

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE,
  );

  // Toggle sort
  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  // Format date
  function formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "только что";
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} дн назад`;

    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatJoinedDate(date: Date): string {
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen pb-8 px-4 pt-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <ChevronLeft size={18} style={{ color: "var(--text-secondary)" }} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-red-400" />
              <h1
                className="text-xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Админ-панель
              </h1>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Статистика всех пользователей IMAN App
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="glass-card px-4 py-2 flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={`text-red-400 ${loading ? "animate-spin" : ""}`}
          />
          <span className="text-sm font-medium text-red-400">Обновить</span>
        </button>
      </header>

      {/* ================================================================ */}
      {/* LOADING / ERROR                                                  */}
      {/* ================================================================ */}
      {loading && !dashboard && (
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Загрузка данных...
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="glass-card p-6 border border-red-500/20">
          <p className="text-sm text-red-400 text-center">{error}</p>
        </div>
      )}

      {/* ================================================================ */}
      {/* DASHBOARD                                                        */}
      {/* ================================================================ */}
      {dashboard && !loading && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Всего пользователей"
              value={dashboard.totalUsers}
              color="text-red-400"
              bgColor="bg-red-400/10"
            />
            <StatCard
              icon={Activity}
              label="Активны сегодня"
              value={dashboard.activeToday}
              subtitle={`${dashboard.totalUsers > 0 ? Math.round((dashboard.activeToday / dashboard.totalUsers) * 100) : 0}% от всех`}
              color="text-emerald-400"
              bgColor="bg-emerald-400/10"
            />
            <StatCard
              icon={TrendingUp}
              label="Активны 7 дней"
              value={dashboard.activeWeek}
              subtitle={`${dashboard.totalUsers > 0 ? Math.round((dashboard.activeWeek / dashboard.totalUsers) * 100) : 0}% от всех`}
              color="text-blue-400"
              bgColor="bg-blue-400/10"
            />
            <StatCard
              icon={BarChart3}
              label="Активны 30 дней"
              value={dashboard.activeMonth}
              subtitle={`${dashboard.totalUsers > 0 ? Math.round((dashboard.activeMonth / dashboard.totalUsers) * 100) : 0}% от всех`}
              color="text-purple-400"
              bgColor="bg-purple-400/10"
            />
          </div>

          {/* Average Stats */}
          <div className="glass-card p-6">
            <h2
              className="text-sm font-semibold uppercase tracking-widest mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Средние показатели
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p
                  className="text-xs mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Средний уровень
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {dashboard.averageLevel}
                </p>
              </div>
              <div>
                <p
                  className="text-xs mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Средние очки
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {dashboard.averagePoints.toLocaleString()}
                </p>
              </div>
              <div>
                <p
                  className="text-xs mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Средняя серия
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {dashboard.averageStreak} дней
                </p>
              </div>
            </div>
          </div>

          {/* Top Features */}
          <div className="glass-card p-6">
            <h2
              className="text-sm font-semibold uppercase tracking-widest mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Топ функций
            </h2>
            <div className="space-y-3">
              {dashboard.topFeatures.map((feature, idx) => (
                <div key={feature.name} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{
                      background:
                        idx === 0
                          ? "linear-gradient(135deg, #f59e0b, #d97706)"
                          : idx === 1
                            ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                            : "rgba(255,255,255,0.1)",
                      color: idx < 2 ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {feature.name}
                    </p>
                  </div>
                  <p
                    className="text-sm font-bold tabular-nums"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {feature.usage.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-sm font-semibold uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                Все пользователи ({filteredUsers.length})
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
                placeholder="Поиск по имени..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-colors"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-input)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b"
                    style={{ borderColor: "var(--border-primary)" }}
                  >
                    <th
                      className="text-left py-3 px-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Telegram ID
                    </th>
                    <th
                      className="text-left py-3 px-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Имя
                    </th>
                    <th
                      className="text-left py-3 px-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Уровень
                    </th>
                    <th
                      className="text-left py-3 px-2 cursor-pointer hover:text-red-400 transition-colors"
                      onClick={() => toggleSort("points")}
                      style={{ color: "var(--text-muted)" }}
                    >
                      <div className="flex items-center gap-1">
                        Очки
                        {sortBy === "points" &&
                          (sortOrder === "desc" ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronUp size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="text-left py-3 px-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Серия
                    </th>
                    <th
                      className="text-left py-3 px-2 cursor-pointer hover:text-red-400 transition-colors"
                      onClick={() => toggleSort("prayers")}
                      style={{ color: "var(--text-muted)" }}
                    >
                      <div className="flex items-center gap-1">
                        Намазы
                        {sortBy === "prayers" &&
                          (sortOrder === "desc" ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronUp size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="text-left py-3 px-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Привычки
                    </th>
                    <th
                      className="text-left py-3 px-2 cursor-pointer hover:text-red-400 transition-colors"
                      onClick={() => toggleSort("lastActive")}
                      style={{ color: "var(--text-muted)" }}
                    >
                      <div className="flex items-center gap-1">
                        Последний визит
                        {sortBy === "lastActive" &&
                          (sortOrder === "desc" ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronUp size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="text-left py-3 px-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Регистрация
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user, idx) => (
                    <tr
                      key={user.telegramId}
                      className="border-b hover:bg-white/[0.02] transition-colors"
                      style={{
                        borderColor: "var(--border-primary)",
                        background:
                          idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                      }}
                    >
                      <td
                        className="py-3 px-2 font-mono text-xs"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {user.telegramId}
                      </td>
                      <td
                        className="py-3 px-2 font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {user.name}
                      </td>
                      <td
                        className="py-3 px-2"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {user.level}
                      </td>
                      <td
                        className="py-3 px-2 font-bold tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {user.points.toLocaleString()}
                      </td>
                      <td
                        className="py-3 px-2 tabular-nums"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {user.streak} / {user.longestStreak}
                      </td>
                      <td
                        className="py-3 px-2 tabular-nums"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {user.totalPrayers}
                      </td>
                      <td
                        className="py-3 px-2 tabular-nums"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {user.totalHabits}
                      </td>
                      <td
                        className="py-3 px-2 text-xs"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {formatDate(user.lastActive)}
                      </td>
                      <td
                        className="py-3 px-2 text-xs"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {formatJoinedDate(user.joinedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {paginatedUsers.map((user) => (
                <div
                  key={user.telegramId}
                  className="p-4 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-primary)",
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p
                        className="font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {user.name}
                      </p>
                      <p
                        className="text-xs font-mono"
                        style={{ color: "var(--text-faint)" }}
                      >
                        ID: {user.telegramId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {user.level}
                      </p>
                      <p
                        className="text-lg font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {user.points.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p style={{ color: "var(--text-muted)" }}>Серия</p>
                      <p style={{ color: "var(--text-secondary)" }}>
                        {user.streak} / {user.longestStreak}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: "var(--text-muted)" }}>Намазы</p>
                      <p style={{ color: "var(--text-secondary)" }}>
                        {user.totalPrayers}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: "var(--text-muted)" }}>Привычки</p>
                      <p style={{ color: "var(--text-secondary)" }}>
                        {user.totalHabits}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: "var(--text-muted)" }}>Последний визит</p>
                      <p style={{ color: "var(--text-faint)" }}>
                        {formatDate(user.lastActive)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30 transition-opacity"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Назад
                </button>
                <span
                  className="text-sm px-3"
                  style={{ color: "var(--text-muted)" }}
                >
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30 transition-opacity"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Вперёд
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
