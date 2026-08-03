import { useState, useEffect } from "react";
import { Users, ExternalLink, RefreshCw, Check } from "lucide-react";
import { getTelegramUser } from "../lib/telegram";

// ДОБРОВОЛЬНАЯ подписка на канал - с возможностью пропустить
// Приватный канал не может быть проверен через Bot API, поэтому делаем добровольно
const CHANNEL_LINK = "https://t.me/+UcggjLlqNuAyN2Qy";
const STORAGE_KEY = "iman_channel_skipped";

// Проверяем, показывали ли уже экран подписки в этой сессии
// sessionStorage НЕ теряется при навигации внутри Mini App, но сбрасывается при новом запуске
const SESSION_SHOWN_KEY = "iman_channel_shown_session";

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

  // Страховка: если проверка почему-то зависла — пускаем в приложение,
  // чтобы пользователь не остался запертым на экране «Проверяем подписку…».
  useEffect(() => {
    if (!checking) return;
    const watchdog = setTimeout(() => {
      setHasAccess(true);
      setChecking(false);
    }, 5000);
    return () => clearTimeout(watchdog);
  }, [checking]);

  async function checkSubscription() {
    setChecking(true);
    setError(null);

    try {
      // Проверяем — пользователь уже пропустил или подписался (localStorage)
      const skipped = localStorage.getItem(STORAGE_KEY);
      if (skipped === "true") {
        setHasAccess(true);
        setChecking(false);
        return;
      }

      // Если нет Telegram ID - даём доступ (для тестирования в браузере)
      if (!tgUser?.id) {
        console.log("No Telegram ID - allowing access for testing");
        setHasAccess(true);
        setChecking(false);
        return;
      }

      // ФИКС: Если экран подписки уже показывался в этой сессии — пропускаем
      // Это решает проблему потери localStorage на некоторых устройствах
      const shownThisSession = sessionStorage.getItem(SESSION_SHOWN_KEY);
      if (shownThisSession === "true") {
        // Пользователь уже видел экран в этой сессии, пропускаем
        localStorage.setItem(STORAGE_KEY, "true");
        setHasAccess(true);
        setChecking(false);
        return;
      }

      // ФИКС: Если у пользователя уже есть данные (profile, prayer logs и т.д.)
      // значит он НЕ новый — пропускаем экран подписки
      const hasProfile = localStorage.getItem("iman_profile");
      const hasPrayerLogs = localStorage.getItem("iman_prayer_logs");
      const hasOnboarded = localStorage.getItem("iman_onboarded");
      if (hasProfile || hasPrayerLogs || hasOnboarded) {
        localStorage.setItem(STORAGE_KEY, "true");
        setHasAccess(true);
        setChecking(false);
        return;
      }

      // Новый пользователь — показываем экран подписки один раз
      sessionStorage.setItem(SESSION_SHOWN_KEY, "true");
      setHasAccess(false);
    } catch (err) {
      console.error("Subscription check error:", err);
      // При любой ошибке — пропускаем, чтобы не блокировать приложение
      setHasAccess(true);
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
            Ассаламу алейкум! ☪️
          </h1>
          <p className="text-slate-300 text-base">
            Добро пожаловать в{" "}
            <span className="text-emerald-400 font-bold">IMAN</span>
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Приложение для мусульман Кыргызстана
          </p>
        </div>

        {/* Мотивирующий призыв к подписке */}
        <div className="w-full bg-gradient-to-br from-emerald-900/50 to-teal-900/50 border-2 border-emerald-400/40 rounded-2xl p-6 shadow-xl">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center shrink-0 shadow-lg">
              <Users className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl mb-2">
                Присоединяйтесь к нашему сообществу! 🤲
              </h3>
              <p className="text-slate-200 text-sm leading-relaxed">
                Подпишитесь на наш Telegram-канал и станьте частью дружной уммы
                Кыргызстана
              </p>
            </div>
          </div>

          <div className="bg-black/30 rounded-xl p-5 border border-emerald-400/20">
            <p className="text-emerald-300 font-bold mb-3 text-base">
              🌟 Что вы получите:
            </p>
            <div className="space-y-2.5 text-sm text-slate-200">
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 text-lg shrink-0">✓</span>
                <span>
                  <strong>Полезные материалы</strong> для мусульман
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 text-lg shrink-0">✓</span>
                <span>
                  <strong>Новости приложения</strong> и обновления
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 text-lg shrink-0">✓</span>
                <span>
                  <strong>Общение</strong> с братьями и сестрами
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-emerald-400/20">
            <p className="text-center text-emerald-200 text-xs italic">
              "Верующие — братья друг другу" (Коран 49:10)
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full bg-red-900/30 border border-red-500/50 rounded-xl p-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Subscribe button - основная кнопка */}
        <button
          onClick={handleSubscribeClick}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-5 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:from-emerald-600 hover:to-teal-600 transition-all active:scale-95 shadow-2xl shadow-emerald-500/40 border-2 border-emerald-300/20"
        >
          <ExternalLink className="w-6 h-6" />
          Подписаться на канал
        </button>

        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-600"></div>
          <span className="text-slate-500 text-xs">или</span>
          <div className="flex-1 h-px bg-slate-600"></div>
        </div>

        {/* Skip button - второстепенная */}
        <button
          onClick={handleSkip}
          className="w-full bg-slate-800/40 hover:bg-slate-700/50 text-slate-300 py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-2 border border-slate-700/50 transition-all active:scale-95"
        >
          Пропустить (начать без подписки)
        </button>

        <p className="text-slate-500 text-xs text-center max-w-sm leading-relaxed">
          Подписка добровольная, но мы очень рекомендуем присоединиться к нашему
          сообществу для получения пользы и баракята 🌙
        </p>

        <p className="text-[10px] text-slate-600 mt-4">
          by{" "}
          <span className="text-emerald-400 font-semibold">Aziz Atavaliev</span>
        </p>
      </div>
    </div>
  );
}
