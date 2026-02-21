import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Trophy, Medal, Award, Users, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getTelegramUser } from "../lib/telegram";
import { storage } from "../lib/storage";

interface LeaderboardUser {
  telegram_id: number;
  name: string;
  totalPoints: number;
  level: string;
  streak: number;
  rank: number;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const telegramUser = getTelegramUser();
  const currentUserId = telegramUser?.id;

  const fetchLeaderboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      const response = await fetch(`/api/leaderboard`);

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotalUsers(data.totalUsers || 0);
        setTotalSubscribers(data.totalSubscribers || 0);
      } else {
        const profile = storage.getProfile();
        const mockUser: LeaderboardUser = {
          telegram_id: currentUserId || 0,
          name: profile.name || "Вы",
          totalPoints: profile.totalPoints || 0,
          level: profile.level || "Новичок",
          streak: profile.streak || 0,
          rank: 1,
        };
        setUsers([mockUser]);
      }
    } catch (error) {
      console.error("Leaderboard fetch error:", error);
      const profile = storage.getProfile();
      const mockUser: LeaderboardUser = {
        telegram_id: currentUserId || 0,
        name: profile.name || "Вы",
        totalPoints: profile.totalPoints || 0,
        level: profile.level || "Новичок",
        streak: profile.streak || 0,
        rank: 1,
      };
      setUsers([mockUser]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const currentUserInList = users.find((u) => u.telegram_id === currentUserId);

  function getRankIcon(rank: number) {
    if (rank === 1)
      return <Trophy className="w-6 h-6 text-yellow-400" />;
    if (rank === 2)
      return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 3)
      return <Medal className="w-6 h-6 text-amber-600" />;
    return (
      <div className="w-6 h-6 flex items-center justify-center text-sm font-bold text-slate-400">
        #{rank}
      </div>
    );
  }

  function getRankBadgeColor(rank: number) {
    if (rank === 1) return "from-yellow-500/20 to-amber-500/20 border-yellow-500/30";
    if (rank === 2) return "from-gray-400/20 to-slate-400/20 border-gray-400/30";
    if (rank === 3) return "from-amber-600/20 to-orange-600/20 border-amber-600/30";
    return "from-slate-700/20 to-slate-800/20 border-slate-600/30";
  }

  function renderUserCard(user: LeaderboardUser, highlight: boolean) {
    return (
      <div
        key={user.telegram_id}
        className={`
          glass rounded-xl p-4 border transition-all
          ${highlight ? "ring-2 ring-emerald-400/50 scale-[1.02]" : ""}
        `}
        style={{
          borderColor: highlight
            ? "var(--emerald-400)"
            : "var(--border-secondary)",
        }}
      >
        <div className="flex items-center gap-3">
          {/* Rank Icon */}
          <div className="flex-shrink-0">
            {getRankIcon(user.rank)}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="font-semibold text-white truncate">
                {user.name}
                {highlight && (
                  <span className="ml-2 text-xs text-emerald-400">(Вы)</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-slate-400">{user.level}</p>
              {user.streak > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs">🔥</span>
                  <span className="text-xs text-orange-400">{user.streak} дн</span>
                </div>
              )}
            </div>
          </div>

          {/* Points Badge */}
          <div
            className={`
              px-3 py-2 rounded-xl border bg-gradient-to-br
              ${getRankBadgeColor(user.rank)}
            `}
          >
            <p className="text-lg font-bold text-white">
              {user.totalPoints.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400">баллов</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(to bottom, var(--bg-primary), var(--bg-secondary))`,
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-40 glass px-4 py-3 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-white/[0.05] active:scale-95 transition-all"
          >
            <ChevronLeft className="w-5 h-5" style={{ color: "var(--text)" }} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
              Таблица лидеров
            </h1>
          </div>
          <button
            onClick={() => fetchLeaderboard(true)}
            disabled={refreshing}
            className="p-2 rounded-xl hover:bg-white/[0.05] active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-5 h-5 text-emerald-400 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-24">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div
            className="glass rounded-2xl p-4 border"
            style={{ borderColor: "var(--border-secondary)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{totalUsers}</p>
                <p className="text-[10px] text-slate-400">Пользователей</p>
              </div>
            </div>
          </div>
          <div
            className="glass rounded-2xl p-4 border"
            style={{ borderColor: "var(--border-secondary)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{totalSubscribers}</p>
                <p className="text-[10px] text-slate-400">Подписчиков</p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Leaderboard List */}
        {!loading && users.length > 0 && (
          <div className="space-y-2">
            {users.map((user) => {
              const isCurrentUser = user.telegram_id === currentUserId;
              return renderUserCard(user, isCurrentUser);
            })}

            {/* Current user position if not in top list */}
            {currentUserId && !currentUserInList && (
              <>
                {/* Separator */}
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 border-t border-dashed border-slate-600/50" />
                  <span className="text-xs text-slate-500">Ваша позиция</span>
                  <div className="flex-1 border-t border-dashed border-slate-600/50" />
                </div>

                {/* Current user card built from local profile */}
                {(() => {
                  const profile = storage.getProfile();
                  const currentUser: LeaderboardUser = {
                    telegram_id: currentUserId,
                    name: profile.name || telegramUser?.first_name || "Вы",
                    totalPoints: profile.totalPoints || 0,
                    level: profile.level || "Новичок",
                    streak: profile.streak || 0,
                    rank: totalUsers > 0 ? totalUsers : users.length + 1,
                  };
                  return renderUserCard(currentUser, true);
                })()}
              </>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && users.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Пока нет данных</p>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 glass rounded-xl p-4 border" style={{ borderColor: "var(--border-secondary)" }}>
          <p className="text-xs text-slate-400 text-center">
            💡 Зарабатывайте баллы выполняя намазы, читая Коран, проходя викторины и выполняя привычки
          </p>
        </div>
      </div>
    </div>
  );
}
