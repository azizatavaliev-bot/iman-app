import { useEffect, useState } from "react";

interface SplashProps {
  onDone: () => void;
  /** Duration in ms before fade-out (default 1800) */
  duration?: number;
}

/**
 * Splash screen — shows IMAN App logo with arabesque ornament for ~2 seconds
 * on app launch. Smooth fade-out, then onDone is called.
 */
export default function Splash({ onDone, duration = 1800 }: SplashProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), duration);
    const doneTimer = setTimeout(() => onDone(), duration + 400);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [duration, onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background:
          "radial-gradient(ellipse at center, #0a3d2e 0%, #051a14 60%, #000000 100%)",
      }}
    >
      {/* Декоративные круги */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 animate-pulse-slow"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center px-8 animate-splash-rise">
        {/* Бисмиллях */}
        <p
          className="text-amber-400/80 text-3xl mb-6"
          style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
        >
          ﷽
        </p>

        {/* Логотип */}
        <div className="flex items-baseline gap-1 mb-2">
          <h1
            className="text-6xl font-bold tracking-tight"
            style={{
              background:
                "linear-gradient(180deg, #fff 0%, #d1fae5 50%, #6ee7b7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 40px rgba(16,185,129,0.4)",
            }}
          >
            IMAN
          </h1>
          <span
            className="text-3xl font-light text-emerald-300/80"
            style={{ letterSpacing: "0.05em" }}
          >
            App
          </span>
        </div>

        {/* Подпись */}
        <p className="text-emerald-200/60 text-sm tracking-wider uppercase mb-8">
          Путь мусульманина
        </p>

        {/* Орнаментальный разделитель */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-emerald-500/40" />
          <span className="text-emerald-400/60 text-lg">✦</span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-emerald-500/40" />
        </div>

        {/* Loading spinner */}
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
      </div>

      {/* Местная подпись (с подписью на арабском) */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p
          className="text-emerald-200/40 text-base"
          style={{ fontFamily: "'Amiri', serif" }}
        >
          الإسلام
        </p>
        <p className="text-emerald-200/30 text-[10px] mt-1 tracking-widest uppercase">
          бисмиллях
        </p>
      </div>
    </div>
  );
}
