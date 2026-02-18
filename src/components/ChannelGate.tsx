import { useState, useEffect } from "react";
import { Users, ExternalLink } from "lucide-react";

const CHANNEL_LINK = "https://t.me/+UcggjLlqNuAyN2Qy";
const CHANNEL_USERNAME = "@iman_kyrgyzstan"; // Placeholder - обновится после получения info
const STORAGE_KEY = "iman_channel_subscribed";

interface ChannelGateProps {
  children: React.ReactNode;
}

export default function ChannelGate({ children }: ChannelGateProps) {
  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    try {
      // Проверяем localStorage - пользователь уже подтвердил подписку
      const subscribed = localStorage.getItem(STORAGE_KEY);
      if (subscribed === "true") {
        setHasAccess(true);
        setChecking(false);
        return;
      }

      // Проверяем через Telegram Bot API (если возможно)
      // Примечание: требует bot token на сервере
      // Пока просто показываем gate при первом запуске
      setChecking(false);
    } catch {
      setChecking(false);
    }
  }

  function handleSubscribeClick() {
    // Открываем канал
    window.open(CHANNEL_LINK, "_blank");
  }

  function handleConfirmSubscription() {
    // Сохраняем что пользователь подписался
    localStorage.setItem(STORAGE_KEY, "true");
    setHasAccess(true);
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
        <div className="max-w-md w-full space-y-6 text-center">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 flex items-center justify-center">
              <Users className="w-12 h-12 text-emerald-400" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Добро пожаловать в IMAN
            </h1>
            <p className="text-slate-400 text-sm">
              Приложение для мусульман Кыргызстана
            </p>
          </div>

          {/* Message */}
          <div className="glass rounded-2xl p-6 border border-emerald-400/20">
            <p className="text-white mb-4 leading-relaxed">
              Для начала работы с приложением, пожалуйста, подпишитесь на наш
              Telegram-канал
            </p>
            <p className="text-slate-400 text-sm">
              В канале вы найдёте:
            </p>
            <ul className="text-sm text-slate-300 mt-2 space-y-1">
              <li>📱 Обновления приложения</li>
              <li>📖 Полезные материалы</li>
              <li>🤲 Напоминания и мотивацию</li>
              <li>💬 Поддержку сообщества</li>
            </ul>
          </div>

          {/* Subscribe Button */}
          <button
            onClick={handleSubscribeClick}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/25"
          >
            <ExternalLink className="w-5 h-5" />
            Подписаться на канал
          </button>

          {/* Confirm Button */}
          <button
            onClick={handleConfirmSubscription}
            className="w-full glass text-emerald-400 py-3 px-6 rounded-xl font-medium border border-emerald-400/30 hover:bg-emerald-400/10 transition-all active:scale-95"
          >
            Я подписался ✓
          </button>

          {/* Footer */}
          <p className="text-xs text-slate-500 mt-4">
            by <span className="text-emerald-400 font-semibold">Aziz Atavaliev</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
