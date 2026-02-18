import { useState, useEffect } from "react";
import { ChevronLeft, Trophy, Medal, Award, Users } from "lucide-react";
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
  const [totalUsers, setTotalUsers] = useState(44); // Минимум 44 пользователя
  const telegramUser = getTelegramUser();
  const currentUserId = telegramUser?.id;

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    try {
      // Получаем данные с сервера
      const response = await fetch(
        `https://iman-app-production.up.railway.app/api/leaderboard`
      );

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        // Учитываем локальных + серверных пользователей
        setTotalUsers(Math.max(44, data.totalUsers || 44));
      } else {
        // Фоллбэк: показываем только текущего пользователя
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
      // Показываем хотя бы текущего пользователя
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
    }
  }

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
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
              Таблица лидеров
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-24">
        {/* Total Users Card */}
        <div
          className="glass rounded-2xl p-4 mb-4 border"
          style={{ borderColor: "var(--border-secondary)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalUsers}</p>
                <p className="text-xs text-slate-400">Пользователей IMAN</p>
              </div>
            </div>
            <Award className="w-8 h-8 text-emerald-400/30" />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Leaderboard List */}
        {!loading && (
          <div className="space-y-2">
            {users.map((user) => {
              const isCurrentUser = user.telegram_id === currentUserId;
              return (
                <div
                  key={user.telegram_id}
                  className={`
                    glass rounded-xl p-4 border transition-all
                    ${isCurrentUser ? "ring-2 ring-emerald-400/50 scale-[1.02]" : ""}
                  `}
                  style={{
                    borderColor: isCurrentUser
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
                          {isCurrentUser && (
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
            })}
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
