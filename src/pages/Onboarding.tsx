import { useState, useRef } from "react";
import { ChevronRight, ChevronLeft, MapPin, Check, Sparkles } from "lucide-react";
import { storage } from "../lib/storage";
import { COMMON_CITIES } from "../data/cities";
import type { CityOption } from "../data/cities";
import { getTelegramUser } from "../lib/telegram";

const tgUser = getTelegramUser();
const TOTAL_STEPS = 2;

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [animDir, setAnimDir] = useState<"next" | "prev">("next");
  const [isAnimating, setIsAnimating] = useState(false);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const slideClass = isAnimating
    ? animDir === "next"
      ? "opacity-0 translate-x-8"
      : "opacity-0 -translate-x-8"
    : "opacity-100 translate-x-0";

  function goNext() {
    if (isAnimating || step >= TOTAL_STEPS - 1) return;
    setAnimDir("next");
    setIsAnimating(true);
    setTimeout(() => { setStep((s) => s + 1); setIsAnimating(false); }, 250);
  }

  function goPrev() {
    if (isAnimating || step <= 0) return;
    setAnimDir("prev");
    setIsAnimating(true);
    setTimeout(() => { setStep((s) => s - 1); setIsAnimating(false); }, 250);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 60) {
      if (diff > 0) goNext();
      else goPrev();
    }
  }

  function handleFinish() {
    if (selectedCity) {
      storage.setProfile({ city: selectedCity.name, lat: selectedCity.lat, lng: selectedCity.lng });
    }
    if (tgUser) {
      storage.setProfile({
        name: tgUser.firstName + (tgUser.lastName ? ` ${tgUser.lastName}` : ""),
        telegramId: tgUser.id,
        telegramPhoto: tgUser.photoUrl || "",
        telegramUsername: tgUser.username || "",
      });
    }
    localStorage.setItem("iman_onboarded", "true");
    onComplete();
  }

  const filteredCities = cityQuery
    ? COMMON_CITIES.filter((c) => c.name.toLowerCase().includes(cityQuery.toLowerCase()))
    : COMMON_CITIES;

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-between px-5 py-8 relative overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress dots */}
      <div className="flex items-center gap-2 mt-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === step ? "w-8 h-2 bg-emerald-400" : i < step ? "w-2 h-2 bg-emerald-400/40" : "w-2 h-2 bg-white/15"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className={`flex-1 flex flex-col items-center justify-center w-full max-w-sm transition-all duration-[250ms] ease-out ${slideClass}`}>
        {step === 0 && <StepWelcome />}
        {step === 1 && (
          <StepCity
            cityQuery={cityQuery}
            setCityQuery={setCityQuery}
            selectedCity={selectedCity}
            setSelectedCity={setSelectedCity}
            filteredCities={filteredCities}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="w-full max-w-sm flex flex-col items-center gap-3 pb-4">
        <div className="w-full flex items-center justify-between gap-4">
          {step > 0 ? (
            <button
              onClick={goPrev}
              className="flex items-center gap-1 px-5 py-3 rounded-2xl bg-white/5 text-white/50 text-sm font-medium active:scale-95 transition-all"
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
              className="flex items-center gap-1 px-6 py-3 rounded-2xl text-sm font-semibold active:scale-95 transition-all text-white"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}
            >
              Далее
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-bold active:scale-95 transition-all text-white"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 0 24px rgba(245,158,11,0.4)" }}
            >
              <Sparkles size={16} />
              Начать
            </button>
          )}
        </div>

        {step < TOTAL_STEPS - 1 && (
          <button
            onClick={handleFinish}
            className="text-xs text-white/30 hover:text-white/50 active:scale-95 transition-all py-1"
          >
            Пропустить →
          </button>
        )}
      </div>
    </div>
  );
}

function StepWelcome() {
  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <div
        className="w-28 h-28 rounded-full flex items-center justify-center text-6xl"
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(245,158,11,0.15))",
          boxShadow: "0 0 40px rgba(16,185,129,0.15)",
        }}
      >
        🕌
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-white">Ас-саляму алейкум!</h1>
        <p className="text-lg text-emerald-400 font-semibold">Добро пожаловать в IMAN</p>
      </div>

      <p className="text-sm text-white/50 leading-relaxed max-w-xs">
        Ваш помощник для укрепления веры — намазы, Коран с тафсиром, дуа, хадисы и многое другое.
      </p>

      <div className="grid grid-cols-2 gap-3 w-full mt-2">
        {[
          { emoji: "🕐", label: "Время намазов" },
          { emoji: "📖", label: "Коран с тафсиром" },
          { emoji: "📿", label: "Дуа и азкары" },
          { emoji: "🏆", label: "Саваб-коины" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]"
          >
            <span className="text-xl">{item.emoji}</span>
            <span className="text-xs text-white/70 font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
          background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(16,185,129,0.15))",
          boxShadow: "0 0 30px rgba(59,130,246,0.12)",
        }}
      >
        <MapPin size={36} className="text-blue-400" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Ваш город</h2>
        <p className="text-sm text-white/40">Для точного расчёта времени намазов</p>
      </div>

      {selectedCity && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30">
          <Check size={14} className="text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-400">{selectedCity.name}</span>
          <button
            onClick={() => { setSelectedCity(null); setCityQuery(""); }}
            className="ml-1 text-emerald-400/50 hover:text-emerald-400 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      <input
        type="text"
        value={cityQuery}
        onChange={(e) => { setCityQuery(e.target.value); setSelectedCity(null); }}
        placeholder="Поиск города..."
        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
      />

      <div className="w-full max-h-52 overflow-y-auto rounded-2xl bg-white/[0.02] border border-white/[0.06] p-1.5 space-y-0.5">
        {filteredCities.slice(0, 20).map((city) => (
          <button
            key={city.name}
            onClick={() => { setSelectedCity(city); setCityQuery(city.name); }}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
              selectedCity?.name === city.name
                ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            {city.name}
          </button>
        ))}
        {filteredCities.length === 0 && (
          <p className="text-center text-xs text-white/25 py-4">Город не найден</p>
        )}
      </div>

      <p className="text-xs text-white/25">Можно пропустить — настроите позже</p>
    </div>
  );
}
