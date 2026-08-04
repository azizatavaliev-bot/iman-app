import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Loader2, Lock, User } from "lucide-react";
import { setBrowserSession } from "../lib/telegram";

/**
 * Вход в браузере вне Telegram — к тем же данным, что и в Telegram-версии
 * (намазы, саваб, уровень). Логин/пароль проверяются на сервере
 * (POST /api/browser-login), успешный ответ несёт HMAC-подписанную сессию
 * на твой telegramId — дальше приложение синхронизируется как обычно.
 */
export default function BrowserLogin() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!login.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/browser-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), password }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(
          data.error === "too_many_attempts"
            ? "Слишком много попыток — попробуйте позже"
            : data.error === "not_configured"
              ? "Вход в браузере пока не настроен"
              : "Неверный логин или пароль",
        );
        return;
      }
      setBrowserSession({
        telegramId: data.telegramId,
        firstName: data.firstName,
        token: data.token,
        expiresAt: data.expiresAt,
      });
      // Полная перезагрузка — чтобы App заново определил личность через
      // getTelegramUser() и запустил синхронизацию с самого начала.
      window.location.href = "/";
    } catch {
      setError("Не удалось связаться с сервером");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Вход в IMAN</h1>
          <p className="text-sm text-slate-400 mt-1">
            К тем же данным, что и в Telegram
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              autoFocus
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Логин"
              autoComplete="username"
              className="w-full pl-10 pr-4 py-3.5 rounded-xl t-bg text-base text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              autoComplete="current-password"
              className="w-full pl-10 pr-4 py-3.5 rounded-xl t-bg text-base text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !login.trim() || !password}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Войти"
            )}
          </button>
        </form>

        <button
          onClick={() => navigate("/")}
          className="w-full text-center text-sm text-slate-500 hover:text-slate-300 mt-5 transition-colors"
        >
          Продолжить без входа
        </button>
      </div>
    </div>
  );
}
