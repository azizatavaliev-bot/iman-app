import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronRight, ExternalLink, X, Sparkles } from "lucide-react";

const CHANNEL_LINK = "https://t.me/+UcggjLlqNuAyN2Qy";

interface WelcomeStoriesProps {
  onComplete: () => void;
}

interface StorySlide {
  bg: string;
  emoji: string;
  title: string;
  subtitle: string;
  bullets?: { emoji: string; text: string }[];
  isSubscribe?: boolean;
}

const STORIES: StorySlide[] = [
  {
    bg: "linear-gradient(to bottom, #064e3b, #022c22, #0f172a)",
    emoji: "🕌",
    title: "Ас-саляму алейкум!",
    subtitle: "Добро пожаловать в IMAN — ваш помощник для укрепления веры",
    bullets: [
      { emoji: "🕐", text: "Точное время намазов для вашего города" },
      { emoji: "📖", text: "Коран с аудио и переводом" },
      { emoji: "📿", text: "Дуа, азкары и зикры на каждый день" },
      { emoji: "🏆", text: "Система саваб-коинов и уровней" },
    ],
  },
  {
    bg: "linear-gradient(to bottom, #312e81, #1e1b4b, #0f172a)",
    emoji: "📚",
    title: "15+ функций для роста",
    subtitle: "Учитесь, практикуйте и развивайтесь духовно каждый день",
    bullets: [
      { emoji: "🧠", text: "Заучивание сур с подсказками и аудио" },
      { emoji: "📜", text: "Хадисы дня от достоверных источников" },
      { emoji: "🎯", text: "Викторины на знание ислама" },
      { emoji: "📕", text: "25 историй пророков и сира" },
    ],
  },
  {
    bg: "linear-gradient(to bottom, #78350f, #451a03, #0f172a)",
    emoji: "🏆",
    title: "Уровни и достижения",
    subtitle: "Зарабатывайте очки за действия и растите в уровне",
    bullets: [
      { emoji: "🌱", text: "10 уровней: от Талиба до Имама" },
      { emoji: "⚡", text: "Намаз вовремя = +10 очков" },
      { emoji: "📖", text: "Чтение Корана = +5 очков" },
      { emoji: "📈", text: "Серии дней увеличивают мотивацию" },
    ],
  },
  {
    bg: "linear-gradient(to bottom, #134e4a, #042f2e, #0f172a)",
    emoji: "🤝",
    title: "Присоединяйтесь!",
    subtitle: "Новости и обновления приложения — в нашем Telegram-канале",
    isSubscribe: true,
  },
];

export default function WelcomeStories({ onComplete }: WelcomeStoriesProps) {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const isPaused = useRef(false);

  const STORY_DURATION = 6000;
  const TICK = 50;

  const slide = STORIES[current];
  const isLast = current === STORIES.length - 1;

  useEffect(() => {
    setProgress(0);
    isPaused.current = false;

    // Pause auto-advance on last slide (has buttons)
    if (isLast) return;

    timerRef.current = setInterval(() => {
      if (isPaused.current) return;
      setProgress((prev) => {
        const next = prev + (TICK / STORY_DURATION) * 100;
        if (next >= 100) {
          if (current < STORIES.length - 1) {
            setCurrent((c) => c + 1);
            return 0;
          }
          clearInterval(timerRef.current!);
          return 100;
        }
        return next;
      });
    }, TICK);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [current, isLast]);

  const goNext = useCallback(() => {
    if (current < STORIES.length - 1) {
      setCurrent((c) => c + 1);
    }
  }, [current]);

  const goPrev = useCallback(() => {
    if (current > 0) {
      setCurrent((c) => c - 1);
    }
  }, [current]);

  function handleSubscribe() {
    window.open(CHANNEL_LINK, "_blank");
  }

  // Tap left/right halves for navigation (not on last slide with buttons)
  function handleTap(e: React.MouseEvent | React.TouchEvent) {
    if (isLast) return; // last slide has buttons, no tap navigation
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
    const midX = rect.left + rect.width / 2;
    if (clientX < midX) goPrev();
    else goNext();
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    isPaused.current = true;
  }

  function onTouchEnd(e: React.TouchEvent) {
    isPaused.current = false;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[300] flex flex-col select-none"
      style={{ background: slide.bg }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onPointerDown={() => { isPaused.current = true; }}
      onPointerUp={() => { isPaused.current = false; }}
      onClick={handleTap}
    >
      {/* Progress bars */}
      <div className="flex gap-1 px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
        {STORIES.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width: i < current ? "100%" : i === current ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-6"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))",
            boxShadow: "0 0 60px rgba(255,255,255,0.08)",
          }}
        >
          {slide.emoji}
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">{slide.title}</h1>
        <p className="text-sm text-white/50 text-center mb-6 max-w-xs">{slide.subtitle}</p>

        {slide.bullets && (
          <div className="w-full max-w-sm space-y-2.5">
            {slide.bullets.map((b, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08]"
              >
                <span className="text-lg shrink-0">{b.emoji}</span>
                <span className="text-sm text-white/80 leading-snug">{b.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Last slide: subscribe + start buttons */}
        {isLast && (
          <div className="w-full max-w-sm mt-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleSubscribe}
              className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                boxShadow: "0 0 30px rgba(16,185,129,0.3)",
              }}
            >
              <ExternalLink size={18} />
              Присоединиться
            </button>

            <button
              onClick={onComplete}
              className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all bg-white/10 border border-white/20"
            >
              <Sparkles size={18} />
              Начать пользоваться IMAN
            </button>
          </div>
        )}

        {/* Skip + hint on non-last slides */}
        {!isLast && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-1 text-white/30 text-xs">
              <span>Нажмите, чтобы продолжить</span>
              <ChevronRight size={14} />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              className="px-6 py-3 rounded-2xl text-sm font-medium text-white/70 active:scale-[0.97] transition-all"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              Пропустить и начать →
            </button>
          </div>
        )}
      </div>

      {/* Bottom note */}
      <div className="pb-[calc(env(safe-area-inset-bottom)+12px)] px-6 text-center">
        <p className="text-[10px] text-white/20 max-w-xs mx-auto">
          Сделано с намерением помогать мусульманам в укреплении веры
        </p>
        <p className="text-[10px] text-emerald-400/30 mt-1">by Aziz Atavaliev</p>
      </div>
    </div>
  );
}

// Welcome shows EVERY time — no localStorage persistence
export function isWelcomeSeen(): boolean {
  // Shown per session only — use sessionStorage
  return sessionStorage.getItem("iman_welcome_dismissed") === "true";
}

export function dismissWelcome(): void {
  sessionStorage.setItem("iman_welcome_dismissed", "true");
}
