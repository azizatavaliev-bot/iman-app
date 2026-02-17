// ============================================================
// IMAN App - Analytics & Usage Tracking
// Track user activity for admin dashboard
// ============================================================

import { getTelegramUser, isTelegramWebApp } from "./telegram";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface AnalyticsEvent {
  type: "page_view" | "action" | "session_start" | "session_end";
  page?: string; // e.g. "/", "/prayers", "/quiz"
  action?: string; // e.g. "prayer_marked", "quiz_completed", "habit_toggled"
  metadata?: Record<string, unknown>; // additional data
  timestamp: number;
}

// ----------------------------------------------------------------
// Session Management
// ----------------------------------------------------------------

let sessionStartTime: number | null = null;
let currentPage: string | null = null;
let isTracking = false;

/**
 * Initialize analytics tracking
 * Call this once when app starts
 */
export function initAnalytics() {
  if (!isTelegramWebApp()) return;
  if (isTracking) return;

  isTracking = true;
  sessionStartTime = Date.now();

  // Track session start
  trackEvent({
    type: "session_start",
    timestamp: sessionStartTime,
  });

  // Track page visibility changes
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      // User returned to app
      if (!sessionStartTime) {
        sessionStartTime = Date.now();
        trackEvent({ type: "session_start", timestamp: sessionStartTime });
      }
    } else {
      // User left app
      if (sessionStartTime) {
        const duration = Date.now() - sessionStartTime;
        trackEvent({
          type: "session_end",
          timestamp: Date.now(),
          metadata: { duration },
        });
        sessionStartTime = null;
      }
    }
  });

  // Track session end on page unload
  window.addEventListener("beforeunload", () => {
    if (sessionStartTime) {
      const duration = Date.now() - sessionStartTime;
      trackEvent({
        type: "session_end",
        timestamp: Date.now(),
        metadata: { duration },
      });
    }
  });
}

/**
 * Track page view
 */
export function trackPageView(page: string) {
  if (!isTracking) return;
  currentPage = page;
  trackEvent({
    type: "page_view",
    page,
    timestamp: Date.now(),
  });
}

/**
 * Track user action
 */
export function trackAction(
  action: string,
  metadata?: Record<string, unknown>,
) {
  if (!isTracking) return;
  trackEvent({
    type: "action",
    page: currentPage || undefined,
    action,
    metadata,
    timestamp: Date.now(),
  });
}

/**
 * Get current session duration in seconds
 */
export function getSessionDuration(): number {
  if (!sessionStartTime) return 0;
  return Math.floor((Date.now() - sessionStartTime) / 1000);
}

// ----------------------------------------------------------------
// Send events to server
// ----------------------------------------------------------------

const eventQueue: AnalyticsEvent[] = [];
let isSending = false;

/**
 * Track an event (queued and sent in batches)
 */
function trackEvent(event: AnalyticsEvent) {
  eventQueue.push(event);

  // Send immediately for session_end, otherwise batch every 10 seconds
  if (event.type === "session_end") {
    sendEvents();
  } else if (!isSending) {
    isSending = true;
    setTimeout(() => {
      sendEvents();
      isSending = false;
    }, 10000); // batch every 10 seconds
  }
}

/**
 * Send queued events to server
 */
async function sendEvents() {
  if (eventQueue.length === 0) return;

  const tgUser = getTelegramUser();
  if (!tgUser) return;

  const events = eventQueue.splice(0, eventQueue.length); // take all and clear queue

  try {
    await fetch(`${API_BASE}/api/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramId: tgUser.id,
        events,
      }),
    });
  } catch (err) {
    console.error("Failed to send analytics:", err);
    // Don't retry — just drop events to avoid memory buildup
  }
}
