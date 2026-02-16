// ============================================================
// iOS / Telegram WebApp Audio Unlock
// Ensures audio playback works inside WKWebView (Telegram iOS)
// ============================================================

let unlocked = false;
let unlockPromiseResolve: (() => void) | null = null;
const unlockPromise = new Promise<void>((resolve) => {
  unlockPromiseResolve = resolve;
});

// Silent MP3 (shortest valid mp3 — 0.05s of silence)
const SILENT_MP3 =
  "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRBqpAAAAAAD/+1DEAAAB8AHoAAAAAN4AfQAAAABMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";

/**
 * Initialize audio for iOS / Telegram WebApp.
 * Call this once at app startup (e.g. in App.tsx or AudioProvider).
 * Audio will be unlocked on the first user gesture.
 */
export function initAudioUnlock(): void {
  if (unlocked) return;

  // iOS 16.4+: set audio session to playback mode
  // This prevents audio from being muted by the ringer switch
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession) {
    nav.audioSession.type = "playback";
  }

  const events = ["touchstart", "touchend", "click", "keydown"];

  const doUnlock = () => {
    if (unlocked) return;

    // Play a silent audio via <audio> element to unlock the media channel
    const silentAudio = new Audio(SILENT_MP3);
    silentAudio.volume = 0.01;
    const playPromise = silentAudio.play();
    if (playPromise) {
      playPromise
        .then(() => {
          silentAudio.pause();
          silentAudio.src = "";
          unlocked = true;
          unlockPromiseResolve?.();
          events.forEach((e) =>
            document.removeEventListener(e, doUnlock),
          );
        })
        .catch(() => {
          // Will retry on next gesture
        });
    }
  };

  events.forEach((e) =>
    document.addEventListener(e, doUnlock, { passive: true }),
  );

  // Handle returning from background — re-check audio state
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !unlocked) {
      // Re-attach listeners if audio wasn't unlocked yet
      events.forEach((e) =>
        document.addEventListener(e, doUnlock, { passive: true }),
      );
    }
  });
}

/**
 * Returns true if audio has been unlocked by a user gesture.
 */
export function isAudioUnlocked(): boolean {
  return unlocked;
}

/**
 * Wait until audio is unlocked. Resolves immediately if already unlocked.
 */
export function waitForAudioUnlock(): Promise<void> {
  return unlockPromise;
}

/**
 * Create an HTMLAudioElement optimized for iOS/Telegram playback.
 * Does NOT set crossOrigin (which breaks WKWebView if CDN lacks CORS headers).
 */
export function createAudioElement(): HTMLAudioElement {
  const audio = new Audio();
  audio.preload = "auto";
  // Do NOT set crossOrigin — it breaks audio on iOS WKWebView
  // when the CDN (cdn.islamic.network) doesn't return proper CORS headers
  return audio;
}
