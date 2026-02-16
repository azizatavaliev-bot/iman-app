// ============================================================
// iOS / Telegram WebApp Audio Unlock
// Uses Web Audio API (AudioContext) — the official Apple-approved
// method for unlocking audio in WKWebView on user gesture.
// ============================================================

let unlocked = false;
let unlockPromiseResolve: (() => void) | null = null;
const unlockPromise = new Promise<void>((resolve) => {
  unlockPromiseResolve = resolve;
});

// Shared AudioContext instance
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

/**
 * Initialize audio for iOS / Telegram WebApp.
 * Call this once at app startup (e.g. in App.tsx).
 * Audio will be unlocked on the first user gesture via AudioContext.resume().
 */
export function initAudioUnlock(): void {
  if (unlocked) return;

  // iOS 16.4+: set audio session to playback mode
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession) {
    nav.audioSession.type = "playback";
  }

  const events = ["touchstart", "touchend", "click", "keydown"];

  const doUnlock = () => {
    if (unlocked) return;

    const ctx = getAudioContext();

    // AudioContext.resume() is the Apple-approved way to unlock audio in WebView
    ctx
      .resume()
      .then(() => {
        // Also play a short silent buffer to fully activate the audio path
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);

        unlocked = true;
        unlockPromiseResolve?.();
        events.forEach((e) => document.removeEventListener(e, doUnlock));
      })
      .catch(() => {
        // Will retry on next gesture
      });
  };

  events.forEach((e) =>
    document.addEventListener(e, doUnlock, { passive: true }),
  );

  // Handle returning from background — re-check audio state
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !unlocked) {
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
  return audio;
}
