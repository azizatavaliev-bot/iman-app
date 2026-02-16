import { useState, useRef, useCallback, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  Check,
  Sparkles,
} from "lucide-react";
import { storage } from "../lib/storage";
import { COMMON_CITIES } from "../data/cities";
import type { CityOption } from "../data/cities";
import { getTelegramUser } from "../lib/telegram";

// ---------------------------------------------------------------------------
// Steps — if Telegram user exists, skip name step (3 steps instead of 4)
// ---------------------------------------------------------------------------

const tgUser = getTelegramUser();
const SKIP_NAME = !!tgUser;
const TOTAL_STEPS = SKIP_NAME ? 3 : 4;

// ---------------------------------------------------------------------------
// Islamic decorative SVG patterns
// ---------------------------------------------------------------------------

function IslamicPattern({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Star pattern */}
      <circle
        cx="100"
        cy="100"
        r="80"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.15"
      />
      <circle
        cx="100"
        cy="100"
        r="60"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.12"
      />
      <circle
        cx="100"
        cy="100"
        r="40"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.1"
      />
      {/* 8-pointed star */}
      {[0, 45, 90, 135].map((angle) => (
        <line
          key={angle}
          x1={100 + 80 * Math.cos((angle * Math.PI) / 180)}
          y1={100 + 80 * Math.sin((angle * Math.PI) / 180)}
          x2={100 + 80 * Math.cos(((angle + 180) * Math.PI) / 180)}
          y2={100 + 80 * Math.sin(((angle + 180) * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.1"
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Onboarding Component
// ---------------------------------------------------------------------------

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(tgUser?.firstName || "");
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [animDir, setAnimDir] = useState<"next" | "prev">("next");
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch swipe support
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 60;
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && step < TOTAL_STEPS - 1) {
        goNext();
      } else if (diff < 0 && step > 0) {
        goPrev();
      }
    }
  }, [step]);

  function goNext() {
    if (isAnimating || step >= TOTAL_STEPS - 1) return;
    setAnimDir("next");
    setIsAnimating(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setIsAnimating(false);
    }, 250);
  }

  function goPrev() {
    if (isAnimating || step <= 0) return;
    setAnimDir("prev");
    setIsAnimating(true);
    setTimeout(() => {
      setStep((s) => s - 1);
      setIsAnimating(false);
    }, 250);
  }

  function handleFinish() {
    // Save profile
    const profileData: Record<string, unknown> = {};
    if (name.trim()) profileData.name = name.trim();
    if (selectedCity) {
      profileData.city = selectedCity.name;
      profileData.lat = selectedCity.lat;
      profileData.lng = selectedCity.lng;
    }
    if (Object.keys(profileData).length > 0) {
      storage.setProfile(
        profileData as Parameters<typeof storage.setProfile>[0],
      );
    }
    // Mark onboarded
    localStorage.setItem("iman_onboarded", "true");
    onComplete();
  }

  // Filter cities
  const filteredCities = cityQuery
    ? COMMON_CITIES.filter((c) =>
        c.name.toLowerCase().includes(cityQuery.toLowerCase()),
      )
    : COMMON_CITIES;

  // Animation classes
  const slideClass = isAnimating
    ? animDir === "next"
      ? "opacity-0 translate-x-8"
      : "opacity-0 -translate-x-8"
    : "opacity-100 translate-x-0";

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-between px-5 py-8 relative overflow-hidden select-none"
    >
      {/* Background decorative patterns */}
      <IslamicPattern className="absolute top-[-40px] right-[-40px] w-60 h-60 text-emerald-500 pointer-events-none" />
      <IslamicPattern className="absolute bottom-[-60px] left-[-50px] w-72 h-72 text-amber-500 pointer-events-none" />

      {/* Dot indicators */}
      <div className="flex items-center gap-2 mt-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === step
                ? "w-8 h-2 bg-emerald-400"
                : i < step
                  ? "w-2 h-2 bg-emerald-400/40"
                  : "w-2 h-2 bg-white/15"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div
        className={`flex-1 flex flex-col items-center justify-center w-full max-w-sm transition-all duration-250 ease-out ${slideClass}`}
      >
        {step === 0 && <StepWelcome />}
        {!SKIP_NAME && step === 1 && <StepName name={name} setName={setName} />}
        {((SKIP_NAME && step === 1) || (!SKIP_NAME && step === 2)) && (
          <StepCity
            cityQuery={cityQuery}
            setCityQuery={setCityQuery}
            selectedCity={selectedCity}
            setSelectedCity={setSelectedCity}
            filteredCities={filteredCities}
          />
        )}
        {((SKIP_NAME && step === 2) || (!SKIP_NAME && step === 3)) && (
          <StepReady name={name} city={selectedCity?.name} />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="w-full max-w-sm flex items-center justify-between gap-4 pb-4">
        {step > 0 ? (
          <button
            onClick={goPrev}
            className="flex items-center gap-1 px-5 py-3 rounded-2xl t-bg t-text-m text-sm font-medium hover:t-bg active:scale-95 transition-all"
          >
            <ChevronLeft size={16} />
            Назад
          </button>
        ) : (
          <div />
        )}

        {step < TOTAL_STEPS - 1 ? (
          <button
            onClick={goNext}
            className="flex items-center gap-1 px-6 py-3 rounded-2xl text-sm font-semibold active:scale-95 transition-all"
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              boxShadow: "0 0 20px rgba(16,185,129,0.3)",
              color: "#fff",
            }}
          >
            Далее
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            className="flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-bold active:scale-95 transition-all"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              boxShadow: "0 0 24px rgba(245,158,11,0.4)",
              color: "#fff",
            }}
          >
            <Sparkles size={16} />
            Начать
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 0: Welcome
// ---------------------------------------------------------------------------

function StepWelcome() {
  return (
    <div className="flex flex-col items-center text-center space-y-6">
      {/* Mosque / crescent icon */}
      <div
        className="w-28 h-28 rounded-full flex items-center justify-center text-6xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(245,158,11,0.15))",
          boxShadow:
            "0 0 40px rgba(16,185,129,0.15), 0 0 80px rgba(245,158,11,0.08)",
        }}
      >
        🕌
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-white">Ас-саляму алейкум!</h1>
        <p className="text-lg text-emerald-400 font-semibold">
          Добро пожаловать в IMAN
        </p>
      </div>

      <p className="text-sm t-text-m leading-relaxed max-w-xs">
        Ваш персональный помощник для укрепления веры. Намазы, Коран, хадисы,
        дуа и многое другое — всё в одном приложении.
      </p>

      {/* Feature highlights */}
      <div className="grid grid-cols-2 gap-3 w-full mt-4">
        {[
          { emoji: "🕐", label: "Время намазов" },
          { emoji: "📖", label: "Коран с аудио" },
          { emoji: "📿", label: "Дуа и азкары" },
          { emoji: "🏆", label: "Геймификация" },
        ].map((item) => (
          <div
            key={item.label}
            className="glass-card p-3 flex items-center gap-2"
          >
            <span className="text-xl">{item.emoji}</span>
            <span className="text-xs text-white/70 font-medium">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Name
// ---------------------------------------------------------------------------

function StepName({
  name,
  setName,
}: {
  name: string;
  setName: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus with small delay for animation
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center text-center space-y-6 w-full">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(16,185,129,0.15))",
          boxShadow: "0 0 30px rgba(139,92,246,0.12)",
        }}
      >
        {name ? name.charAt(0).toUpperCase() : "👤"}
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Как вас зовут?</h2>
        <p className="text-sm text-white/40">
          Мы будем обращаться к вам по имени
        </p>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Введите ваше имя..."
        className="w-full t-bg border t-border-s rounded-2xl px-5 py-4 text-white text-center text-lg font-semibold placeholder-white/20 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
      />

      <p className="text-xs text-white/25">
        Можно пропустить — укажете позже в профиле
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: City
// ---------------------------------------------------------------------------

function StepCity({
  cityQuery,
  setCityQuery,
  selectedCity,
  setSelectedCity,
  filteredCities,
}: {
  cityQuery: string;
  setCityQuery: (v: string) => void;
  selectedCity: CityOption | null;
  setSelectedCity: (c: CityOption | null) => void;
  filteredCities: CityOption[];
}) {
  return (
    <div className="flex flex-col items-center text-center space-y-5 w-full">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(16,185,129,0.15))",
          boxShadow: "0 0 30px rgba(59,130,246,0.12)",
        }}
      >
        <MapPin size={36} className="text-blue-400" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Ваш город</h2>
        <p className="text-sm text-white/40">
          Для точного расчёта времени намазов
        </p>
      </div>

      {/* Selected city badge */}
      {selectedCity && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30">
          <Check size={14} className="text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-400">
            {selectedCity.name}
          </span>
          <button
            onClick={() => {
              setSelectedCity(null);
              setCityQuery("");
            }}
            className="ml-1 text-emerald-400/50 hover:text-emerald-400 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search input */}
      <div className="w-full relative">
        <input
          type="text"
          value={cityQuery}
          onChange={(e) => {
            setCityQuery(e.target.value);
            setSelectedCity(null);
          }}
          placeholder="Поиск города..."
          className="w-full t-bg border t-border-s rounded-2xl px-5 py-3.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
      </div>

      {/* Cities grid */}
      <div className="w-full max-h-52 overflow-y-auto rounded-2xl bg-white/[0.02] border t-border p-1.5 space-y-0.5">
        {filteredCities.slice(0, 20).map((city) => (
          <button
            key={city.name}
            onClick={() => {
              setSelectedCity(city);
              setCityQuery(city.name);
            }}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
              selectedCity?.name === city.name
                ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                : "t-text-s hover:t-bg hover:t-text"
            }`}
          >
            {city.name}
          </button>
        ))}
        {filteredCities.length === 0 && (
          <p className="text-center text-xs text-white/25 py-4">
            Город не найден
          </p>
        )}
      </div>

      <p className="text-xs text-white/25">
        Можно пропустить — настроите позже
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Ready!
// ---------------------------------------------------------------------------

function StepReady({ name, city }: { name?: string; city?: string }) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      {/* Celebration icon */}
      <div className="relative">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center text-5xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(16,185,129,0.2))",
            boxShadow:
              "0 0 50px rgba(245,158,11,0.2), 0 0 100px rgba(16,185,129,0.1)",
          }}
        >
          ✨
        </div>

        {/* Confetti dots */}
        {showConfetti &&
          Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const r = 60 + Math.random() * 20;
            const colors = [
              "#10b981",
              "#f59e0b",
              "#8b5cf6",
              "#3b82f6",
              "#ef4444",
              "#ec4899",
            ];
            return (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-ping"
                style={{
                  left: `calc(50% + ${Math.cos(angle) * r}px - 4px)`,
                  top: `calc(50% + ${Math.sin(angle) * r}px - 4px)`,
                  backgroundColor: colors[i % colors.length],
                  animationDuration: `${1 + Math.random()}s`,
                  animationDelay: `${i * 0.08}s`,
                  opacity: 0.7,
                }}
              />
            );
          })}
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-white">
          {name ? `${name}, всё готово!` : "Всё готово!"}
        </h2>
        <p className="text-emerald-400 font-semibold">Баракаллаху фикум!</p>
      </div>

      <p className="text-sm t-text-m leading-relaxed max-w-xs">
        Теперь у вас есть всё для укрепления вашей веры. Начните свой путь с
        отслеживания намазов и чтения Корана.
      </p>

      {/* Summary of choices */}
      {(name || city) && (
        <div className="glass-card p-4 w-full space-y-2">
          {name && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">Имя</span>
              <span className="text-white font-semibold">{name}</span>
            </div>
          )}
          {city && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">Город</span>
              <span className="text-white font-semibold">{city}</span>
            </div>
          )}
        </div>
      )}

      {/* Motivational tips */}
      <div className="space-y-2 w-full mt-2">
        {[
          { emoji: "🕐", text: "Отмечайте намазы каждый день" },
          { emoji: "📖", text: "Читайте хотя бы 1 аят в день" },
          { emoji: "🤲", text: "Читайте утренние и вечерние дуа" },
        ].map((tip) => (
          <div
            key={tip.text}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03]"
          >
            <span>{tip.emoji}</span>
            <span className="text-xs t-text-m">{tip.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
