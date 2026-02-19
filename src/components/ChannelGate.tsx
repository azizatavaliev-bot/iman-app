import { useState, useEffect } from "react";
import { Users, ExternalLink, RefreshCw, Check } from "lucide-react";
import { getTelegramUser } from "../lib/telegram";

// ДОБРОВОЛЬНАЯ подписка на канал - с возможностью пропустить
// Приватный канал не может быть проверен через Bot API, поэтому делаем добровольно
const CHANNEL_LINK = "https://t.me/+UcggjLlqNuAyN2Qy";
const STORAGE_KEY = "iman_channel_skipped";

interface ChannelGateProps {
  children: React.ReactNode;
}

export default function ChannelGate({ children }: ChannelGateProps) {
  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tgUser = getTelegramUser();

  useEffect(() => {
    checkSubscription();
  }, []);

  async function checkSubscription() {
    setChecking(true);
    setError(null);

    try {
      // Проверяем — пользователь уже пропустил или подписался
      const skipped = localStorage.getItem(STORAGE_KEY);
      if (skipped === "true") {
        setHasAccess(true);
        setChecking(false);
        return;
      }

      // Если нет Telegram ID - даём доступ (для тестирования)
      if (!tgUser?.id) {
        console.log("No Telegram ID - allowing access for testing");
        setHasAccess(true);
        setChecking(false);
        return;
      }

      // Показываем экран призыва к подписке
      setHasAccess(false);
    } catch (err) {
      console.error("Subscription check error:", err);
      setError("Ошибка при проверке. Можете продолжить.");
    } finally {
      setChecking(false);
    }
  }

  function handleSkip() {
    // Пользователь решил пропустить подписку
    localStorage.setItem(STORAGE_KEY, "true");
    setHasAccess(true);
  }

  function handleSubscribeClick() {
    // Открываем канал
    window.open(CHANNEL_LINK, "_blank");

    // После клика — автоматически пропускаем (приватный канал нельзя проверить)
    setTimeout(() => {
      handleSkip();
    }, 1000);
  }

  // Показываем загрузку
  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 z-[200]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-lg">Проверяем подписку...</p>
        </div>
      </div>
    );
  }

  // Если подписан - показываем приложение
  if (hasAccess) {
    return <>{children}</>;
  }

  // ОБЯЗАТЕЛЬНЫЙ ЭКРАН ПОДПИСКИ - БЕЗ КНОПКИ ЗАКРЫТЬ!
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-start pt-[env(safe-area-inset-top)] bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 z-[200] overflow-auto">
      <div className="max-w-md w-full px-5 py-8 flex flex-col items-center gap-6">
        {/* Icon + Title */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/50 flex items-center justify-center shrink-0">
          <Users className="w-10 h-10 text-emerald-400" />
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            Добро пожаловать в IMAN
          </h1>
          <p className="text-slate-300 text-sm">
            Приложение для мусульман Кыргызстана
          </p>
        </div>

        {/* Призыв к подписке */}
        <div className="w-full bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border-2 border-emerald-400/30 rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Check className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg mb-1">
                Присоединяйтесь к нам!
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Подпишитесь на наш Telegram-канал и получайте полезные материалы
              </p>
            </div>
          </div>

          <div className="bg-black/20 rounded-xl p-4 mb-4">
            <p className="text-emerald-400 font-semibold mb-2">
              📱 Что вы получите:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Обновления</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Материалы</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Напоминания</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Сообщество</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full bg-red-900/30 border border-red-500/50 rounded-xl p-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Subscribe button */}
        <button
          onClick={handleSubscribeClick}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:from-emerald-600 hover:to-teal-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/30"
        >
          <ExternalLink className="w-6 h-6" />
          Подписаться на канал
        </button>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="w-full bg-slate-700/50 hover:bg-slate-600/50 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 border border-slate-600 transition-all active:scale-95"
        >
          Продолжить без подписки
        </button>

        <p className="text-slate-500 text-xs text-center max-w-xs">
          Подписка добровольная. Вы можете начать пользоваться приложением прямо
          сейчас.
        </p>

        <p className="text-[10px] text-slate-600 mt-4">
          by{" "}
          <span className="text-emerald-400 font-semibold">Aziz Atavaliev</span>
        </p>
      </div>
    </div>
  );
}
