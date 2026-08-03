import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, RotateCcw, Check } from "lucide-react";
import { hapticImpact, hapticSuccess } from "../lib/api";
import { storage, POINTS } from "../lib/storage";
import { scheduleSyncPush } from "../lib/sync";
import { toDateKey } from "../lib/dateKey";

// ============================================================
// Zikr Counter — тасбих после намаза
// СубханАллах ×33 → Альхамдулиллях ×33 → Аллаху Акбар ×33
// ============================================================

interface ZikrPhase {
  arabic: string;
  transcription: string;
  russian: string;
  count: number;
  color: string;
  glowColor: string;
  bgFrom: string;
  bgTo: string;
}

const PHASES: ZikrPhase[] = [
  {
    arabic: "سُبْحَانَ اللّٰهِ",
    transcription: "Субхана-Ллах",
    russian: "Пречист Аллах",
    count: 33,
    color: "#10b981",
    glowColor: "rgba(16,185,129,0.4)",
    bgFrom: "from-emerald-900/40",
    bgTo: "to-teal-900/20",
  },
  {
    arabic: "الْحَمْدُ لِلّٰهِ",
    transcription: "Альхамду ли-Ллях",
    russian: "Хвала Аллаху",
    count: 33,
    color: "#f59e0b",
    glowColor: "rgba(245,158,11,0.4)",
    bgFrom: "from-amber-900/40",
    bgTo: "to-yellow-900/20",
  },
  {
    arabic: "اللّٰهُ أَكْبَرُ",
    transcription: "Аллаху Акбар",
    russian: "Аллах Велик",
    count: 33,
    color: "#8b5cf6",
    glowColor: "rgba(139,92,246,0.4)",
    bgFrom: "from-violet-900/40",
    bgTo: "to-purple-900/20",
  },
];

const TOTAL_COUNT = PHASES.reduce((s, p) => s + p.count, 0);

// Save zikr session to localStorage
function saveZikrSession() {
  try {
    const key = "iman_zikr_sessions";
    const raw = localStorage.getItem(key);
    const sessions = raw ? JSON.parse(raw) : [];
    sessions.push({
      date: new Date().toISOString(),
      total: TOTAL_COUNT,
    });
    // Keep last 100 sessions
    if (sessions.length > 100) sessions.splice(0, sessions.length - 100);
    localStorage.setItem(key, JSON.stringify(sessions));
  } catch { /* ignore */ }
}

function getTodayZikrCount(): number {
  try {
    const key = "iman_zikr_sessions";
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const sessions = JSON.parse(raw);
    const today = toDateKey();
    return sessions.filter((s: { date: string }) => s.date.slice(0, 10) === today).length;
  } catch { return 0; }
}

// ============================================================
// Ripple Effect Component
// ============================================================

function TapRipple({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x - 40,
        top: y - 40,
        width: 80,
        height: 80,
        background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
        animation: "zikr-ripple 0.6s ease-out forwards",
      }}
    />
  );
}

// ============================================================
// Main Component
// ============================================================

export default function ZikrCounter() {
  const navigate = useNavigate();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [tapScale, setTapScale] = useState(1);
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [startTime] = useState(Date.now());
  const [showComplete, setShowComplete] = useState(false);
  const rippleId = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  // Был ли тап уже обработан через touchstart (чтобы click его не продублировал)
  const touchHandled = useRef(false);

  const phase = PHASES[phaseIndex];
  const globalCount = PHASES.slice(0, phaseIndex).reduce((s, p) => s + p.count, 0) + count;
  const globalProgress = globalCount / TOTAL_COUNT;

  // Phase progress
  const phaseProgress = count / phase.count;
  const circumference = 2 * Math.PI * 90; // radius = 90

  // ---- Handle tap ----
  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (completed) return;

    // Get tap position relative to container
    let clientX = 0, clientY = 0;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Add ripple
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const id = ++rippleId.current;
      setRipples(prev => [...prev.slice(-4), { id, x, y }]);
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
    }

    // Tap animation
    setTapScale(0.95);
    setTimeout(() => setTapScale(1), 80);

    const newCount = count + 1;
    setCount(newCount);

    // Haptic
    if (newCount >= phase.count) {
      // Phase complete
      hapticSuccess();

      if (phaseIndex + 1 >= PHASES.length) {
        // All phases done!
        setCompleted(true);
        saveZikrSession();
        // Award points
        storage.addExtraPoints(POINTS.AZKAR);
        storage.recalculateTotalPoints();
        scheduleSyncPush();
        setTimeout(() => setShowComplete(true), 300);
      } else {
        // Transition to next phase
        setShowPhaseTransition(true);
        setTimeout(() => {
          setPhaseIndex(prev => prev + 1);
          setCount(0);
          setShowPhaseTransition(false);
        }, 800);
      }
    } else {
      // Regular tap
      hapticImpact("light");
    }
  }, [count, phase.count, phaseIndex, completed]);

  // ---- Reset ----
  const handleReset = useCallback(() => {
    setPhaseIndex(0);
    setCount(0);
    setCompleted(false);
    setShowComplete(false);
    setShowPhaseTransition(false);
    hapticImpact("medium");
  }, []);

  // ---- Completion View ----
  if (showComplete) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const todayCount = getTodayZikrCount();

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-slate-900 via-slate-950 to-black animate-fade-in">
        {/* Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />

        {/* Checkmark */}
        <div
          className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 flex items-center justify-center mb-6"
          style={{
            boxShadow: "0 0 60px rgba(16, 185, 129, 0.3), 0 0 120px rgba(16, 185, 129, 0.1)",
            animation: "zikr-complete-pop 0.6s ease-out",
          }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 flex items-center justify-center">
            <Check className="w-10 h-10 text-emerald-400" strokeWidth={3} />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-white mb-2">Машаа Аллах!</h2>
        <p className="text-emerald-400/80 text-lg mb-1">Тасбих завершён</p>
        <p className="text-white/30 text-sm mb-8">99 зикров — {minutes}:{seconds.toString().padStart(2, "0")}</p>

        {/* Stats */}
        <div className="glass-card p-6 rounded-2xl w-full max-w-sm mb-8">
          <div className="grid grid-cols-3 gap-4">
            {PHASES.map((p, i) => (
              <div key={i} className="text-center">
                <div className="text-lg mb-1" style={{ color: p.color }}>✓</div>
                <p className="text-xs text-white/70 font-medium">{p.transcription}</p>
                <p className="text-xs text-white/30">×{p.count}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-amber-400">+{POINTS.AZKAR}</p>
              <p className="text-[10px] text-white/30">саваб</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-white">{todayCount}</p>
              <p className="text-[10px] text-white/30">сегодня</p>
            </div>
          </div>
        </div>

        {/* Hadith */}
        <div className="glass-card p-4 rounded-xl w-full max-w-sm mb-8">
          <p className="text-sm text-white/60 leading-relaxed italic text-center">
            «Кто скажет после каждого намаза "Субхана-Ллах" 33 раза, "Альхамду ли-Ллях" 33 раза, "Аллаху Акбар" 33 раза — тому простятся грехи, даже если они подобны пене морской»
          </p>
          <p className="text-[11px] text-amber-400/50 text-center mt-2">Муслим</p>
        </div>

        {/* Actions */}
        <div className="w-full max-w-sm flex flex-col gap-3">
          <button
            onClick={handleReset}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-lg active:scale-[0.97] transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Повторить
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 rounded-2xl glass text-gray-400 font-medium active:scale-[0.97] transition-all"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  // ---- Main Counter View ----
  return (
    <div
      ref={containerRef}
      className={`min-h-screen flex flex-col select-none relative overflow-hidden bg-gradient-to-b ${phase.bgFrom} ${phase.bgTo} from-slate-900 via-slate-950 to-black transition-colors duration-500`}
      // На мобиле один тап порождает и touchstart, и click — раньше зикр
      // считался дважды. Гасим синтетический click после касания.
      onTouchStart={(e) => {
        touchHandled.current = true;
        handleTap(e);
      }}
      onClick={(e) => {
        if (touchHandled.current) {
          touchHandled.current = false;
          return;
        }
        handleTap(e);
      }}
    >
      {/* Ripples */}
      {ripples.map(r => (
        <TapRipple key={r.id} x={r.x} y={r.y} color={phase.color} />
      ))}

      {/* Decorative background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-colors duration-500"
        style={{ background: `${phase.color}08` }}
      />

      {/* ---- Top bar ---- */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 relative z-10" data-no-tap>
        <button
          data-no-tap
          onClick={(e) => { e.stopPropagation(); navigate(-1); }}
          className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-white/50 font-medium">Тасбих</span>
        <button
          data-no-tap
          onClick={(e) => { e.stopPropagation(); handleReset(); }}
          className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* ---- Phase indicators (3 dots) ---- */}
      <div className="flex items-center justify-center gap-3 px-4 pt-2 pb-4 relative z-10" data-no-tap>
        {PHASES.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i < phaseIndex
                  ? "w-10 bg-emerald-500"
                  : i === phaseIndex
                    ? "w-10"
                    : "w-10 bg-white/10"
              }`}
              style={i === phaseIndex ? {
                background: `linear-gradient(90deg, ${p.color} ${phaseProgress * 100}%, rgba(255,255,255,0.1) ${phaseProgress * 100}%)`,
              } : undefined}
            />
          </div>
        ))}
      </div>

      {/* ---- Global progress bar ---- */}
      <div className="px-6 mb-2 relative z-10" data-no-tap>
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${globalProgress * 100}%`,
              background: `linear-gradient(90deg, #10b981, #f59e0b, #8b5cf6)`,
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-white/20">{globalCount}/{TOTAL_COUNT}</span>
          <span className="text-[10px] text-white/20">{Math.round(globalProgress * 100)}%</span>
        </div>
      </div>

      {/* ---- Main content (centered) ---- */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Phase transition overlay */}
        {showPhaseTransition && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="text-center" style={{ animation: "zikr-phase-in 0.5s ease-out" }}>
              <div className="text-4xl mb-3">✓</div>
              <p className="text-xl font-bold text-white mb-1">
                {PHASES[phaseIndex].transcription} — готово!
              </p>
              <p className="text-sm text-white/50">
                Следующий: {PHASES[phaseIndex + 1]?.transcription}
              </p>
            </div>
          </div>
        )}

        {/* Arabic text */}
        <div
          className="arabic-text text-4xl md:text-5xl text-center mb-3 leading-relaxed"
          style={{
            color: phase.color,
            filter: `drop-shadow(0 0 20px ${phase.glowColor})`,
            transition: "color 0.5s, filter 0.5s",
          }}
        >
          {phase.arabic}
        </div>

        {/* Transcription */}
        <p className="text-lg text-white font-semibold text-center mb-1">
          {phase.transcription}
        </p>
        <p className="text-sm text-white/40 text-center mb-10">
          {phase.russian}
        </p>

        {/* ---- Big circular counter ---- */}
        <div
          className="relative mb-8"
          style={{
            transform: `scale(${tapScale})`,
            transition: "transform 0.08s ease-out",
          }}
        >
          <svg width={200} height={200} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={100}
              cy={100}
              r={90}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={6}
              fill="none"
            />
            {/* Progress arc */}
            <circle
              cx={100}
              cy={100}
              r={90}
              stroke={phase.color}
              strokeWidth={6}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - phaseProgress * circumference}
              strokeLinecap="round"
              className="transition-all duration-150 ease-out"
              style={{
                filter: `drop-shadow(0 0 12px ${phase.glowColor})`,
              }}
            />
            {/* Tick marks every 11 */}
            {[0, 1, 2].map(i => {
              const angle = ((i + 1) * 11 / phase.count) * 360 - 90;
              const rad = (angle * Math.PI) / 180;
              const x1 = 100 + 82 * Math.cos(rad);
              const y1 = 100 + 82 * Math.sin(rad);
              const x2 = 100 + 90 * Math.cos(rad);
              const y2 = 100 + 90 * Math.sin(rad);
              return (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Counter number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-5xl font-black tabular-nums transition-colors duration-500"
              style={{ color: phase.color }}
            >
              {count}
            </span>
            <span className="text-sm text-white/30 mt-1">из {phase.count}</span>
          </div>
        </div>

        {/* Tap hint */}
        {count === 0 && !showPhaseTransition && (
          <p className="text-white/20 text-sm animate-pulse">
            Тапай по экрану
          </p>
        )}
      </div>

      {/* ---- Bottom phase info ---- */}
      <div className="px-6 pb-8 pt-2 relative z-10" data-no-tap>
        <div className="flex items-center justify-between gap-2">
          {PHASES.map((p, i) => {
            const isDone = i < phaseIndex;
            const isCurrent = i === phaseIndex;
            return (
              <div
                key={i}
                className={`flex-1 py-2.5 px-2 rounded-xl text-center transition-all duration-300 ${
                  isDone
                    ? "bg-emerald-500/15 border border-emerald-500/25"
                    : isCurrent
                      ? "border"
                      : "bg-white/[0.03] border border-white/5"
                }`}
                style={isCurrent ? {
                  borderColor: `${p.color}40`,
                  background: `${p.color}10`,
                } : undefined}
              >
                {isDone ? (
                  <Check size={14} className="text-emerald-400 mx-auto mb-0.5" />
                ) : (
                  <span
                    className={`text-xs font-bold tabular-nums ${isCurrent ? "" : "text-white/20"}`}
                    style={isCurrent ? { color: p.color } : undefined}
                  >
                    {isCurrent ? count : 0}/{p.count}
                  </span>
                )}
                <p className={`text-[10px] mt-0.5 font-medium truncate ${
                  isDone ? "text-emerald-400/70" : isCurrent ? "text-white/70" : "text-white/20"
                }`}>
                  {p.transcription.split(" ")[0]}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Inline styles ---- */}
      <style>{`
        @keyframes zikr-ripple {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes zikr-complete-pop {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes zikr-phase-in {
          0% { transform: scale(0.8) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
