import { useEffect, useRef } from "react";

/**
 * Единые способы выйти из модалки: клавиша Escape и аппаратная кнопка «Назад».
 *
 * Кнопка «Назад» (Android / свайп в Telegram / кнопка браузера) раньше уводила
 * со всей страницы, оставляя модалку висеть. Теперь при открытии модалки в
 * историю кладётся служебная запись — «Назад» съедает её и просто закрывает
 * модалку. Если модалку закрыли обычным способом (✕ / клик по фону), запись
 * убирается сама, чтобы кнопка «Назад» не требовала лишнего нажатия.
 *
 * @param isOpen  открыта ли модалка сейчас
 * @param onClose колбэк закрытия (можно передавать инлайн — не вызовет перезапуск)
 */
export function useModalDismiss(isOpen: boolean, onClose: () => void) {
  // Держим колбэк в ref, чтобы инлайн-стрелки не перезапускали эффект
  // (иначе на каждый ререндер в историю сыпались бы новые записи).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    const handlePop = () => closeRef.current();

    window.addEventListener("keydown", handleKey);
    window.addEventListener("popstate", handlePop);
    window.history.pushState({ imanModal: true }, "");

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("popstate", handlePop);
      // Закрыли не через «Назад» — подчищаем свою запись в истории
      if (window.history.state?.imanModal) window.history.back();
    };
  }, [isOpen]);
}
