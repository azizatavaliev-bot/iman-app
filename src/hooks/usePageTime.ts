import { useEffect, useRef } from "react";
import { getTelegramUser } from "../lib/telegram";

// ============================================================================
// Page Time Tracker — Track time spent on each page
// ============================================================================

interface PageTimeEvent {
  telegramId: number;
  page: string;
  startTime: number;
  endTime: number;
  duration: number;
}

const BATCH_SIZE = 10;
const BATCH_INTERVAL = 30000; // 30 seconds
let pageTimeQueue: PageTimeEvent[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;

async function sendPageTimeBatch() {
  if (pageTimeQueue.length === 0) return;

  const batch = [...pageTimeQueue];
  pageTimeQueue = [];

  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramId: batch[0].telegramId,
        events: batch.map((e) => ({
          type: "page_time",
          page: e.page,
          metadata: {
            startTime: e.startTime,
            endTime: e.endTime,
            duration: e.duration,
          },
          timestamp: e.endTime,
        })),
      }),
    });
  } catch (err) {
    console.error("Failed to send page time batch:", err);
  }
}

function schedulePageTimeBatch() {
  if (batchTimer) return;

  batchTimer = setTimeout(() => {
    sendPageTimeBatch();
    batchTimer = null;
  }, BATCH_INTERVAL);
}

export function trackPageTime(telegramId: number, page: string, startTime: number, endTime: number) {
  const duration = endTime - startTime;

  // Игнорируем слишком короткие сессии (< 1 сек) или слишком длинные (> 1 час)
  if (duration < 1000 || duration > 3600000) return;

  pageTimeQueue.push({
    telegramId,
    page,
    startTime,
    endTime,
    duration,
  });

  // Отправляем немедленно если набрался батч
  if (pageTimeQueue.length >= BATCH_SIZE) {
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    sendPageTimeBatch();
  } else {
    schedulePageTimeBatch();
  }
}

export function usePageTime(pageName: string) {
  const startTimeRef = useRef<number>(Date.now());
  const tgUser = getTelegramUser();

  useEffect(() => {
    // Обновляем время начала при монтировании
    startTimeRef.current = Date.now();

    // При размонтировании отправляем время
    return () => {
      if (tgUser?.id) {
        const endTime = Date.now();
        trackPageTime(tgUser.id, pageName, startTimeRef.current, endTime);
      }
    };
  }, [pageName, tgUser?.id]);
}

// Отправить оставшиеся события при закрытии страницы
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (pageTimeQueue.length > 0) {
      sendPageTimeBatch();
    }
  });
}
