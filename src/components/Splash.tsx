import { useEffect, useState } from "react";

interface SplashProps {
  onDone: () => void;
  /** Duration in ms before fade-out (default 2000) */
  duration?: number;
}

// Мерцающие звёзды — фиксированные позиции (доли экрана) + задержки
const STARS: [number, number, number, number][] = [
  [14, 18, 2, 0], [82, 14, 3, 0.4], [24, 30, 1.5, 0.8], [70, 26, 2, 1.1],
  [88, 40, 2.5, 0.3], [10, 46, 2, 0.9], [90, 68, 2, 0.6], [16, 72, 2.5, 1.3],
  [78, 80, 2, 0.2], [30, 84, 1.5, 1.0], [58, 12, 1.5, 0.7], [46, 90, 2, 0.5],
];

/**
 * Splash screen — кинематографичный экран запуска IMAN App:
 * пошаговое появление, вращающийся орнамент, мерцающие звёзды, прогресс.
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
          "radial-gradient(ellipse at center, #0a3d2e 0%, #051a14 55%, #000000 100%)",
      }}
    >
      {/* Расходящиеся кольца */}
      {[0, 0.9, 1.8].map((d, i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 w-[260px] h-[260px] rounded-full border border-emerald-400/20"
          style={{ animation: "splashRing 2.7s ease-out infinite", animationDelay: `${d}s` }}
        />
      ))}

      {/* Мерцающие звёзды */}
      {STARS.map(([x, y, r, d], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-emerald-200"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: r,
            height: r,
            animation: "splashTwinkle 2.4s ease-in-out infinite",
            animationDelay: `${d}s`,
          }}
        />
      ))}

      {/* Вращающийся 8-конечный орнамент (рубʼ аль-хизб) за логотипом */}
      <svg
        className="absolute top-[38%] left-1/2 w-[340px] h-[340px] opacity-[0.12]"
        viewBox="0 0 100 100"
        style={{ animation: "splashSpin 22s linear infinite" }}
      >
        <g fill="none" stroke="rgb(52,211,153)" strokeWidth="0.6">
          <rect x="18" y="18" width="64" height="64" />
          <rect x="18" y="18" width="64" height="64" transform="rotate(45 50 50)" />
          <circle cx="50" cy="50" r="45" strokeWidth="0.4" />
        </g>
      </svg>

      {/* Мягкое золотое свечение по центру */}
      <div
        className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)" }}
      />

      <div className="relative flex flex-col items-center px-8">
        {/* Бисмиллях */}
        <p
          className="text-amber-400/80 text-3xl mb-6"
          style={{
            fontFamily: "'Amiri', 'Scheherazade New', serif",
            animation: "splashFadeUp 0.7s ease-out both",
            animationDelay: "0.05s",
          }}
        >
          ﷽
        </p>

        {/* Логотип с шиммером */}
        <div
          className="flex items-baseline gap-1 mb-2"
          style={{ animation: "splashFadeUp 0.7s ease-out both", animationDelay: "0.25s" }}
        >
          <h1
            className="text-6xl font-bold tracking-tight"
            style={{
              background:
                "linear-gradient(110deg, #6ee7b7 0%, #ffffff 40%, #d1fae5 50%, #ffffff 60%, #6ee7b7 100%)",
              backgroundSize: "250% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 40px rgba(16,185,129,0.4)",
              animation: "splashShimmer 2.6s ease-in-out 0.6s infinite",
            }}
          >
            IMAN
          </h1>
          <span className="text-3xl font-light text-emerald-300/80" style={{ letterSpacing: "0.05em" }}>
            App
          </span>
        </div>

        {/* Подпись */}
        <p
          className="text-emerald-200/60 text-sm tracking-[0.2em] uppercase mb-8"
          style={{ animation: "splashFadeUp 0.7s ease-out both", animationDelay: "0.4s" }}
        >
          Путь мусульманина
        </p>

        {/* Орнаментальный разделитель */}
        <div
          className="flex items-center gap-3 mb-7"
          style={{ animation: "splashFadeUp 0.7s ease-out both", animationDelay: "0.55s" }}
        >
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-emerald-500/40" />
          <span className="text-emerald-400/70 text-lg">✦</span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-emerald-500/40" />
        </div>

        {/* Прогресс-бар загрузки */}
        <div
          className="w-40 h-1 rounded-full bg-white/10 overflow-hidden"
          style={{ animation: "splashFadeUp 0.7s ease-out both", animationDelay: "0.7s" }}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300"
            style={{ animation: "splashProgress linear both", animationDuration: `${duration}ms` }}
          />
        </div>
      </div>

      {/* Нижняя подпись */}
      <div
        className="absolute bottom-8 left-0 right-0 text-center"
        style={{ animation: "splashFadeUp 0.9s ease-out both", animationDelay: "0.9s" }}
      >
        <p className="text-emerald-200/40 text-base" style={{ fontFamily: "'Amiri', serif" }}>
          الإسلام
        </p>
        <p className="text-emerald-200/30 text-[10px] mt-1 tracking-widest uppercase">
          бисмиллях
        </p>
      </div>
    </div>
  );
}
