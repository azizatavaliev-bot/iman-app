import { useState } from "react";
import { KeyRound, Check, Loader2, ChevronDown } from "lucide-react";
import { getTelegramInitDataRaw } from "../lib/telegram";

const STORAGE_KEY = "iman_credentials_username"; // только для отображения, не секрет

/**
 * Внутри Telegram Mini App — придумать логин+пароль для входа с других
 * устройств (обычный браузер, другой телефон без Telegram). Личность
 * подтверждается подписанным initData, поэтому чужой telegramId занять
 * нельзя (проверяется на сервере).
 */
export default function CredentialsSetup() {
  const [open, setOpen] = useState(false);
  const [savedUsername, setSavedUsername] = useState(() =>
    localStorage.getItem(STORAGE_KEY),
  );
  const [username, setUsername] = useState(savedUsername || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError("Логин: 3-20 символов, латиница/цифры/подчёркивание");
      return;
    }
    if (password.length < 6) {
      setError("Пароль минимум 6 символов");
      return;
    }

    const initData = getTelegramInitDataRaw();
    if (!initData) {
      setError("Доступно только внутри Telegram");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/set-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, username: cleanUsername, password }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(
          data.error === "username_taken"
            ? "Этот логин уже занят — выберите другой"
            : data.error === "too_many_attempts"
              ? "Слишком много попыток — попробуйте позже"
              : data.message || "Не получилось сохранить",
        );
        return;
      }
      localStorage.setItem(STORAGE_KEY, cleanUsername);
      setSavedUsername(cleanUsername);
      setPassword("");
      setSuccess(true);
    } catch {
      setError("Не удалось связаться с сервером");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-4 flex items-center justify-between active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-3">
          <KeyRound className="w-5 h-5 text-emerald-400" />
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Вход с других устройств
            </p>
            <p className="text-xs opacity-60">
              {savedUsername
                ? `Логин: ${savedUsername}`
                : "Придумайте логин и пароль"}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-2.5">
          <p className="text-xs text-slate-400 leading-relaxed">
            Этим логином и паролем можно будет войти в обычном браузере на
            любом устройстве — и видеть тот же прогресс, что и здесь.
          </p>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Логин (латиницей)"
            autoComplete="username"
            className="w-full px-3.5 py-3 rounded-lg t-bg text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/40"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль (минимум 6 символов)"
            autoComplete="new-password"
            className="w-full px-3.5 py-3 rounded-lg t-bg text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/40"
          />

          {error && <p className="text-xs text-red-400">{error}</p>}
          {success && (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Сохранено — теперь можно войти этим логином на другом устройстве
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full py-3 rounded-lg font-semibold text-sm text-white bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить"}
          </button>
        </form>
      )}
    </div>
  );
}
