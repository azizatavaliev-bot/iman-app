import { useState, useEffect } from "react";
import { Check, ExternalLink, RefreshCw } from "lucide-react";
import { getTelegramUser } from "../lib/telegram";

// ============================================================================
// Subscription Gate — Mandatory channel subscription before app access
// ============================================================================

const CHANNEL_USERNAME = "atavaliev";
const CHANNEL_URL = `https://t.me/${CHANNEL_USERNAME}`;

interface SubscriptionGateProps {
  onSubscribed: () => void;
}

export default function SubscriptionGate({ onSubscribed }: SubscriptionGateProps) {
  const [checking, setChecking] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tgUser = getTelegramUser();

  // Check subscription status
  async function checkSubscription() {
    if (!tgUser?.id) {
      setError("Telegram ID не найден");
      setChecking(false);
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/check-subscription?telegram_id=${tgUser.id}&channel=${CHANNEL_USERNAME}`
      );
      const data = await response.json();

      if (data.subscribed) {
        setSubscribed(true);
        // Небольшая задержка для плавности
        setTimeout(() => {
          onSubscribed();
        }, 500);
      } else {
        setSubscribed(false);
      }
    } catch (err) {
      console.error("Subscription check failed:", err);
      setError("Не удалось проверить подписку. Попробуйте снова.");
    } finally {
      setChecking(false);
    }
  }

  // Check on mount
  useEffect(() => {
    checkSubscription();
  }, []);

  // Handle subscribe button click
  function handleSubscribe() {
    // Open channel in new tab
    window.open(CHANNEL_URL, "_blank");

    // Auto-check after 3 seconds
    setTimeout(() => {
      checkSubscription();
    }, 3000);
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
           style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg" style={{ color: "var(--text-primary)" }}>
            Проверяем подписку...
          </p>
        </div>
      </div>
    );
  }

  if (subscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
           style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
            <Check size={40} className="text-white" />
          </div>
          <p className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            ✅ Вы подписаны!
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Загружаем приложение...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: "linear-gradient(to bottom, #1a1a2e, #0f0f1e)" }}>
      <div className="max-w-md w-full glass-card p-8 text-center">
        {/* Logo/Icon */}
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
          <span className="text-5xl">🌙</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
          Добро пожаловать в IMAN App!
        </h1>

        {/* Subtitle */}
        <p className="mb-6" style={{ color: "var(--text-muted)" }}>
          Для доступа к приложению необходимо подписаться на наш канал
        </p>

        {/* Channel info */}
        <div className="bg-purple-900/30 border border-purple-700/50 rounded-xl p-4 mb-6">
          <p className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            Telegram канал
          </p>
          <p className="text-purple-400 text-xl font-mono mb-3">
            @{CHANNEL_USERNAME}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Полезные материалы по исламу, советы и поддержка
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Subscribe button */}
        <button
          onClick={handleSubscribe}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mb-4"
        >
          <ExternalLink size={20} />
          Подписаться на канал
        </button>

        {/* Check button */}
        <button
          onClick={checkSubscription}
          disabled={checking}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={18} className={checking ? "animate-spin" : ""} />
          {checking ? "Проверяем..." : "Я подписался"}
        </button>

        {/* Help text */}
        <p className="mt-6 text-xs" style={{ color: "var(--text-faint)" }}>
          После подписки нажмите кнопку "Я подписался" для проверки
        </p>
      </div>
    </div>
  );
}
