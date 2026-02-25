import { lazy, Suspense, useState, useCallback, useEffect, Component, type ReactNode } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Home, Moon, BookOpen, Compass, User } from "lucide-react";
import { AudioProvider } from "./components/AudioPlayer";
import { ThemeProvider } from "./lib/ThemeContext";
import { getTelegramUser } from "./lib/telegram";
import { initAudioUnlock } from "./lib/audioUnlock";
import { syncUserData, scheduleSyncPush, initSyncOnClose } from "./lib/sync";
import { initAnalytics, trackPageView } from "./lib/analytics";
import Onboarding from "./pages/Onboarding";
import ChannelGate from "./components/ChannelGate";
import "./index.css";

// ---- Telegram WebApp: signal ready to remove loading spinner ----
try {
  window.Telegram?.WebApp?.ready();
  window.Telegram?.WebApp?.expand();
} catch {
  // Not inside Telegram — ignore
}

// ---- Global Error Boundary ----
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "linear-gradient(to bottom, #0f172a, #1e293b)",
          color: "#e2e8f0",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🕌</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Произошла ошибка
          </h1>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem", maxWidth: "300px" }}>
            Попробуйте перезапустить приложение
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "12px 32px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Перезапустить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Dashboard загружается сразу (главная страница)
import Dashboard from "./pages/Dashboard";

// Все остальные страницы — lazy load (грузятся по требованию)
const Prayers = lazy(() => import("./pages/Prayers"));
const Quran = lazy(() => import("./pages/Quran"));
const Hadiths = lazy(() => import("./pages/Hadiths"));
const NamesGame = lazy(() => import("./pages/NamesGame"));
const Habits = lazy(() => import("./pages/Habits"));
const Dhikr = lazy(() => import("./pages/Dhikr"));
const Qibla = lazy(() => import("./pages/Qibla"));
const Ramadan = lazy(() => import("./pages/Ramadan"));
const Profile = lazy(() => import("./pages/Profile"));
const Stats = lazy(() => import("./pages/Stats"));
const Dua = lazy(() => import("./pages/Dua"));
const IbadahTimer = lazy(() => import("./pages/IbadahTimer"));
const Memorize = lazy(() => import("./pages/Memorize"));
const Quiz = lazy(() => import("./pages/Quiz"));
const Seerah = lazy(() => import("./pages/Seerah"));
const Stories = lazy(() => import("./pages/Stories"));
const Prophets = lazy(() => import("./pages/Prophets"));
const Beginners = lazy(() => import("./pages/Beginners"));
const Guide = lazy(() => import("./pages/Guide"));
const AboutApp = lazy(() => import("./pages/AboutApp"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Admin = lazy(() => import("./pages/AdminNew"));
const NamazGuide = lazy(() => import("./pages/NamazGuide"));
const Recommended = lazy(() => import("./pages/Recommended"));
const Favorites = lazy(() => import("./pages/Favorites"));
const DuaWall = lazy(() => import("./pages/DuaWall"));
const Zakat = lazy(() => import("./pages/Zakat"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Загрузка...
        </span>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "Главная" },
  { path: "/prayers", icon: Moon, label: "Намазы" },
  { path: "/quran", icon: BookOpen, label: "Коран" },
  { path: "/qibla", icon: Compass, label: "Кибла" },
  { path: "/profile", icon: User, label: "Профиль" },
];

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass"
      style={{ borderTop: "1px solid var(--border-secondary)" }}
    >
      {/* Брендинг */}
      <div className="text-center py-1 text-[10px] text-slate-500">
        by{" "}
        <span className="font-semibold text-emerald-400">Aziz Atavaliev</span>
      </div>

      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-emerald-400 scale-105"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[9px] font-medium leading-tight truncate max-w-[50px]">
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

function AppContent() {
  const location = useLocation();

  // Track page views
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(to bottom, var(--bg-primary), var(--bg-secondary))`,
      }}
    >
      <div className="max-w-lg mx-auto pb-20">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/prayers" element={<Prayers />} />
            <Route path="/quran" element={<Quran />} />
            <Route path="/hadiths" element={<Hadiths />} />
            <Route path="/names" element={<NamesGame />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/dhikr" element={<Dhikr />} />
            <Route path="/qibla" element={<Qibla />} />
            <Route path="/ramadan" element={<Ramadan />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/dua" element={<Dua />} />
            <Route path="/ibadah" element={<IbadahTimer />} />
            <Route path="/memorize" element={<Memorize />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/seerah" element={<Seerah />} />
            <Route path="/stories" element={<Stories />} />
            <Route path="/prophets" element={<Prophets />} />
            <Route path="/beginners" element={<Beginners />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/about-app" element={<AboutApp />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/namaz-guide" element={<NamazGuide />} />
            <Route path="/recommended" element={<Recommended />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/dua-wall" element={<DuaWall />} />
            <Route path="/zakat" element={<Zakat />} />
          </Routes>
        </Suspense>
      </div>
      <BottomNav />
    </div>
  );
}

// Initialize iOS audio unlock (must be called before any audio playback)
initAudioUnlock();

// Save data when user closes/hides the app
initSyncOnClose();

// Auto-skip onboarding for existing users or Telegram users
function isOnboarded(): boolean {
  if (localStorage.getItem("iman_onboarded") === "true") return true;
  // Existing users who already have a profile → auto-skip
  const profile = localStorage.getItem("iman_profile");
  if (profile) {
    localStorage.setItem("iman_onboarded", "true");
    return true;
  }
  // Telegram WebApp auto-login: create profile from Telegram user data
  const tgUser = getTelegramUser();
  if (tgUser) {
    const autoProfile = {
      name: tgUser.firstName + (tgUser.lastName ? ` ${tgUser.lastName}` : ""),
      telegramId: tgUser.id,
      telegramPhoto: tgUser.photoUrl || "",
      telegramUsername: tgUser.username || "",
    };
    const existing = localStorage.getItem("iman_profile");
    const merged = existing
      ? { ...JSON.parse(existing), ...autoProfile }
      : autoProfile;
    localStorage.setItem("iman_profile", JSON.stringify(merged));
    localStorage.setItem("iman_onboarded", "true");
    scheduleSyncPush();
    return true;
  }
  return false;
}

export default function App() {
  const [onboarded, setOnboarded] = useState(isOnboarded);

  // Sync user data with server on startup (Telegram only)
  useEffect(() => {
    if (onboarded) {
      syncUserData().catch(console.error);
      // Initialize analytics tracking
      initAnalytics();
    }
  }, [onboarded]);

  const handleOnboardingComplete = useCallback(() => {
    setOnboarded(true);
  }, []);

  if (!onboarded) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <Onboarding onComplete={handleOnboardingComplete} />
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ChannelGate>
          <BrowserRouter>
            <AudioProvider>
              <AppContent />
            </AudioProvider>
          </BrowserRouter>
        </ChannelGate>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
