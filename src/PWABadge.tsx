import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw } from "lucide-react";

// Баннер «Доступна новая версия» с кнопкой «Обновить».
// Появляется, когда service worker обнаружил новую сборку. Клик применяет
// обновление (SKIP_WAITING) и перезагружает страницу — свежая версия без
// ручной чистки кэша.
export function PWABadge() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      // периодически проверяем обновления (каждые 60 сек)
      if (r) {
        setInterval(() => {
          r.update().catch(() => {
            /* offline — игнор */
          });
        }, 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[100] w-[min(92vw,380px)] animate-slide-down">
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/15 backdrop-blur-xl ring-1 ring-emerald-400/40 px-4 py-3 shadow-2xl shadow-emerald-500/20"
        style={{ background: "#0f2a20" }}
      >
        <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
          <RefreshCw className="w-4 h-4 text-emerald-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-tight">
            Доступна новая версия
          </p>
          <p className="text-emerald-200/70 text-[11px] leading-tight">
            Обнови, чтобы увидеть последние изменения
          </p>
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="shrink-0 px-4 py-2 rounded-xl bg-emerald-500 text-slate-900 text-sm font-bold active:scale-95 transition"
        >
          Обновить
        </button>
      </div>
    </div>
  );
}
