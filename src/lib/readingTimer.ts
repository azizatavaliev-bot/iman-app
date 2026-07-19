// ============================================================
// Глобальный таймер чтения (помидор) для IMAN App
// Выставляется один раз, переживает переходы между разделами и
// перезагрузку страницы. Отсчёт основан на timestamp окончания —
// корректно работает даже если вкладка была в фоне.
// ============================================================

import { useEffect, useState } from "react";

const STORAGE_KEY = "iman_reading_timer";

export interface ReadingTimerState {
  active: boolean; // есть активная сессия таймера
  running: boolean; // тикает (не на паузе)
  durationMin: number; // выбранная длительность, мин
  endsAt: number | null; // timestamp окончания (для running)
  remainingSec: number; // остаток секунд (истина при паузе)
  section: string; // раздел, где запущен ("Сира", "Коран"…)
  finished: boolean; // только что завершился
}

const IDLE: ReadingTimerState = {
  active: false,
  running: false,
  durationMin: 10,
  endsAt: null,
  remainingSec: 0,
  section: "",
  finished: false,
};

function load(): ReadingTimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...IDLE };
    const s = JSON.parse(raw) as ReadingTimerState;
    // Пересчитываем остаток, если таймер шёл и вкладка была закрыта
    if (s.active && s.running && s.endsAt) {
      const rem = Math.round((s.endsAt - Date.now()) / 1000);
      s.remainingSec = Math.max(0, rem);
      if (rem <= 0) {
        s.running = false;
        s.finished = true;
      }
    }
    return s;
  } catch {
    return { ...IDLE };
  }
}

let state: ReadingTimerState = load();
const subscribers = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function emit() {
  persist();
  subscribers.forEach((fn) => fn());
}

function set(patch: Partial<ReadingTimerState>) {
  state = { ...state, ...patch };
  emit();
}

// Единый тик раз в секунду
let interval: ReturnType<typeof setInterval> | null = null;
function ensureTicking() {
  if (interval) return;
  interval = setInterval(() => {
    if (!state.active || !state.running || !state.endsAt) return;
    const rem = Math.max(0, Math.round((state.endsAt - Date.now()) / 1000));
    if (rem <= 0) {
      state = { ...state, remainingSec: 0, running: false, finished: true };
      emit();
    } else if (rem !== state.remainingSec) {
      state = { ...state, remainingSec: rem };
      emit();
    }
  }, 1000);
}

export function startReadingTimer(durationMin: number, section: string) {
  ensureTicking();
  const remainingSec = durationMin * 60;
  set({
    active: true,
    running: true,
    durationMin,
    remainingSec,
    endsAt: Date.now() + remainingSec * 1000,
    section,
    finished: false,
  });
}

export function pauseReadingTimer() {
  if (!state.active || !state.running || !state.endsAt) return;
  const rem = Math.max(0, Math.round((state.endsAt - Date.now()) / 1000));
  set({ running: false, remainingSec: rem, endsAt: null });
}

export function resumeReadingTimer() {
  if (!state.active || state.running) return;
  ensureTicking();
  set({
    running: true,
    endsAt: Date.now() + state.remainingSec * 1000,
    finished: false,
  });
}

export function addReadingMinutes(min: number) {
  if (!state.active) return;
  const extra = min * 60;
  if (state.running && state.endsAt) {
    set({
      remainingSec: state.remainingSec + extra,
      endsAt: state.endsAt + extra * 1000,
      finished: false,
    });
  } else {
    set({ remainingSec: state.remainingSec + extra, finished: false });
  }
}

export function stopReadingTimer() {
  set({ ...IDLE });
}

/** Обновить раздел (адаптация под текущую часть чтения) */
export function setReadingSection(section: string) {
  if (state.active && state.section !== section) {
    set({ section });
  }
}

/** Сбросить флаг "только что завершился" (после показа уведомления) */
export function ackReadingFinished() {
  if (state.finished) set({ finished: false, active: false });
}

export function getReadingTimer(): ReadingTimerState {
  return state;
}

export function useReadingTimer(): ReadingTimerState {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subscribers.add(fn);
    ensureTicking();
    return () => {
      subscribers.delete(fn);
    };
  }, []);
  return state;
}

export function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
