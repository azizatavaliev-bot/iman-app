import { useEffect, useState } from "react";

interface SplashProps {
  onDone: () => void;
  /** Duration in ms before fade-out (default 2000) */
  duration?: number;
}

/**
 * Splash screen — минималистичный, спокойный и воодушевляющий вход в IMAN App:
 * один вдох света, мягкое дыхание вокруг лого, тонкая линия прогресса.
 */
export default function Splash({ onDone, duration = 2000 }: SplashProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), duration);
    const doneTimer = setTimeout(() => onDone(), duration + 500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [duration, onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, #0f4133 0%, #072019 45%, #030a08 75%, #000000 100%)",
      }}
    >
      {/* Сплошной исламский геометрический орнамент (гирих) — ковром по фону */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.13]"
        style={{ animation: "splashDrift 24s ease-in-out infinite" }}
      >
        <defs>
          <pattern
            id="girih"
            width="72"
            height="72"
            patternUnits="userSpaceOnUse"
          >
            <g fill="none" stroke="rgb(110,231,183)" strokeWidth="0.7">
              {/* 8-конечная звезда (рубʼ аль-хизб) в центре плитки */}
              <rect x="18" y="18" width="36" height="36" />
              <rect
                x="18"
                y="18"
                width="36"
                height="36"
                transform="rotate(45 36 36)"
              />
              {/* Четверти звёзд по углам — плитка стыкуется бесшовно */}
              <rect x="-18" y="-18" width="36" height="36" />
              <rect x="-18" y="-18" width="36" height="36" transform="rotate(45 0 0)" />
              <rect x="54" y="-18" width="36" height="36" />
              <rect x="54" y="-18" width="36" height="36" transform="rotate(45 72 0)" />
              <rect x="-18" y="54" width="36" height="36" />
              <rect x="-18" y="54" width="36" height="36" transform="rotate(45 0 72)" />
              <rect x="54" y="54" width="36" height="36" />
              <rect x="54" y="54" width="36" height="36" transform="rotate(45 72 72)" />
              {/* Связующие линии между звёздами */}
              <path d="M36 0 L36 72 M0 36 L72 36" strokeWidth="0.4" opacity="0.5" />
            </g>
          </pattern>
          {/* Виньетка: орнамент ярче в центре, тает к краям */}
          <radialGradient id="girihFade">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="55%" stopColor="white" stopOpacity="0.45" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="girihMask">
            <rect width="100%" height="100%" fill="url(#girihFade)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#girih)" mask="url(#girihMask)" />
      </svg>

      {/* Каллиграфия, «прописывающаяся» на заднем плане */}
      <p
        className="absolute top-[24%] left-0 right-0 text-center text-emerald-300/[0.07] whitespace-nowrap pointer-events-none select-none"
        style={{
          fontFamily: "'Amiri', 'Scheherazade New', serif",
          fontSize: "clamp(64px, 18vw, 170px)",
          animation: "splashWrite 2.4s ease-out both",
          animationDelay: "0.15s",
        }}
      >
        الله
      </p>
      <p
        className="absolute bottom-[20%] left-0 right-0 text-center text-amber-200/[0.05] whitespace-nowrap pointer-events-none select-none"
        style={{
          fontFamily: "'Amiri', 'Scheherazade New', serif",
          fontSize: "clamp(38px, 10vw, 96px)",
          animation: "splashWrite 2.6s ease-out both",
          animationDelay: "0.5s",
        }}
      >
        الحمد لله
      </p>

      {/* Дышащее свечение по центру */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full animate-pulse-slow"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center px-8">
        {/* Бисмиллях */}
        <p
          className="text-amber-300/80 text-3xl mb-7"
          style={{
            fontFamily: "'Amiri', 'Scheherazade New', serif",
            textShadow: "0 0 26px rgba(251,191,36,0.35)",
            animation: "splashWrite 1.5s ease-out both",
            animationDelay: "0.1s",
          }}
        >
          ﷽
        </p>

        {/* Логотип с шиммером */}
        <div
          className="flex items-baseline gap-1.5 mb-3"
          style={{ animation: "splashFadeUp 0.8s ease-out both", animationDelay: "0.32s" }}
        >
          <h1
            className="text-6xl font-bold tracking-tight text-white"
            style={{ textShadow: "0 0 44px rgba(16,185,129,0.4)" }}
          >
            IMAN
          </h1>
          <span
            className="text-2xl font-extralight text-emerald-300/70"
            style={{ letterSpacing: "0.06em" }}
          >
            App
          </span>
        </div>

        {/* Подпись */}
        <p
          className="text-emerald-100/50 text-[13px] tracking-[0.35em] uppercase mb-10 font-light"
          style={{ animation: "splashFadeUp 0.8s ease-out both", animationDelay: "0.5s" }}
        >
          Путь мусульманина
        </p>

        {/* Тонкая линия прогресса */}
        <div
          className="w-28 h-[3px] rounded-full bg-white/10 overflow-hidden"
          style={{ animation: "splashFadeUp 0.8s ease-out both", animationDelay: "0.68s" }}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-300 to-teal-200"
            style={{ animation: "splashProgress linear both", animationDuration: `${duration}ms` }}
          />
        </div>
      </div>
    </div>
  );
}
