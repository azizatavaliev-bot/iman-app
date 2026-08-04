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
 * Модалки могут накладываться друг на друга (например, карточка поверх
 * поиска), поэтому ведётся стек: на Escape и «Назад» реагирует только САМАЯ
 * ВЕРХНЯЯ. Без стека одно нажатие закрывало разом все открытые окна.
 *
 * @param isOpen  открыта ли модалка сейчас
 * @param onClose колбэк закрытия (можно передавать инлайн — не вызовет перезапуск)
 */

// Стек открытых модалок: последний элемент — верхняя (активная)
const modalStack: symbol[] = [];

export function useModalDismiss(isOpen: boolean, onClose: () => void) {
  // Держим колбэк в ref, чтобы инлайн-стрелки не перезапускали эффект
  // (иначе на каждый ререндер в историю сыпались бы новые записи).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const token = Symbol("modal");
    modalStack.push(token);
    const isTop = () => modalStack[modalStack.length - 1] === token;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTop()) closeRef.current();
    };
    const handlePop = () => {
      if (isTop()) closeRef.current();
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("popstate", handlePop);
    window.history.pushState({ imanModal: true }, "");

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("popstate", handlePop);
      const i = modalStack.indexOf(token);
      if (i !== -1) modalStack.splice(i, 1);
      // Закрыли не через «Назад» — подчищаем свою запись в истории.
      // (После navigate() роутер подменяет history.state своим, поэтому
      // проверка заодно защищает от отмены перехода по ссылке.)
      if (window.history.state?.imanModal) window.history.back();
    };
  }, [isOpen]);
}
