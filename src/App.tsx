import {
  lazy,
  Suspense,
  useState,
  useCallback,
  useEffect,
  Component,
  type ReactNode,
} from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Home,
  Moon,
  BookOpen,
  Compass,
  User,
  ArrowLeft,
  Heart,
  Headphones,
} from "lucide-react";
import { AudioProvider } from "./components/AudioPlayer";
import { ThemeProvider } from "./lib/ThemeContext";
import { getTelegramUser } from "./lib/telegram";
import { initAudioUnlock } from "./lib/audioUnlock";
import { syncUserData, scheduleSyncPush, initSyncOnClose } from "./lib/sync";
import { initAnalytics, trackPageView } from "./lib/analytics";
import Onboarding from "./pages/Onboarding";
import ChannelGate from "./components/ChannelGate";
import Splash from "./components/Splash";
import { dismissWelcome } from "./components/WelcomeStories";
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

class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
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
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            background: "linear-gradient(to bottom, #0f172a, #1e293b)",
            color: "#e2e8f0",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🕌</div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            Произошла ошибка
          </h1>
          <p
            style={{
              color: "#94a3b8",
              marginBottom: "0.75rem",
              maxWidth: "300px",
            }}
          >
            Попробуйте перезапустить приложение
          </p>
          {this.state.error && (
            <details
              style={{
                marginBottom: "1.25rem",
                maxWidth: "320px",
                textAlign: "left",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              <summary style={{ color: "#64748b", fontSize: "0.75rem", userSelect: "none" }}>
                Детали ошибки
              </summary>
              <pre
                style={{
                  marginTop: "8px",
                  fontSize: "0.65rem",
                  color: "#f87171",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  maxHeight: "150px",
                  overflowY: "auto",
                }}
              >
                {this.state.error.message}
                {"\n"}
                {this.state.error.stack?.slice(0, 400)}
              </pre>
            </details>
          )}
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
const Terms = lazy(() => import("./pages/Terms"));
const Nasheeds = lazy(() => import("./pages/Nasheeds"));
const Dreams = lazy(() => import("./pages/Dreams"));
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
const Tajweed = lazy(() => import("./pages/Tajweed"));
const ZikrCounter = lazy(() => import("./pages/ZikrCounter"));
const Holidays = lazy(() => import("./pages/Holidays"));
const Facts = lazy(() => import("./pages/Facts"));
const IslamicQA = lazy(() => import("./pages/IslamicQA"));
const PrayerFlow = lazy(() => import("./pages/PrayerFlow"));
const PrayerStructure = lazy(() => import("./pages/PrayerStructure"));

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
  { path: "/memorize", icon: Headphones, label: "Заучивание" },
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

// Pages that already have their own back button in their header
const PAGES_WITH_OWN_BACK = new Set([
  "/",
  "/prayers",
  "/dua-wall",
  "/leaderboard",
  "/ibadah",
  "/dua",
  "/zakat",
  "/about-app",
  "/memorize",
  "/quiz",
  "/prayer-structure",
]);

function GlobalBackButton() {
  const location = useLocation();
  const navigate = useNavigate();

  if (PAGES_WITH_OWN_BACK.has(location.pathname)) return null;

  return (
    <div
      className="sticky top-0 z-40 glass"
      style={{ borderBottom: "1px solid var(--border-secondary)" }}
    >
      <div className="max-w-lg mx-auto flex items-center px-3 py-2.5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-2 -ml-1 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
        >
          <ArrowLeft size={20} className="text-white/70" />
          <span className="text-sm font-medium text-white/60">Назад</span>
        </button>
      </div>
    </div>
  );
}

function scrollAllToTop() {
  // 1. window.scrollTo — стандартный скролл
  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  // 2. document.documentElement — Telegram WebApp часто скроллит через него
  document.documentElement.scrollTop = 0;
  // 3. document.body — fallback для некоторых браузеров
  document.body.scrollTop = 0;
  // 4. scrollIntoView на верхний элемент — самый надёжный способ в Telegram WebApp
  const appTop = document.getElementById("app-top");
  if (appTop) {
    appTop.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
  }
  // 5. Все скроллящиеся контейнеры внутри #root
  const root = document.getElementById("root");
  if (root) {
    root.scrollTop = 0;
    root.querySelectorAll("[class*='overflow']").forEach((el) => {
      (el as HTMLElement).scrollTop = 0;
    });
  }
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Немедленный скролл
    scrollAllToTop();
    // Повторный скролл после lazy-компонента (Suspense) и после рендера
    const t1 = setTimeout(scrollAllToTop, 50);
    const t2 = setTimeout(scrollAllToTop, 150);
    const t3 = setTimeout(scrollAllToTop, 400);
    // requestAnimationFrame — гарантия после рендера
    const raf = requestAnimationFrame(scrollAllToTop);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);
  return null;
}

function AppContent() {
  const location = useLocation();

  // Track page views
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <div
      id="app-top"
      className="min-h-screen"
      style={{
        background: `linear-gradient(to bottom, var(--bg-primary), var(--bg-secondary))`,
      }}
    >
      <ScrollToTop />
      <GlobalBackButton />
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
            <Route path="/terms" element={<Terms />} />
            <Route path="/nasheeds" element={<Nasheeds />} />
            <Route path="/dreams" element={<Dreams />} />
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
            <Route path="/tajweed" element={<Tajweed />} />
            <Route path="/zikr" element={<ZikrCounter />} />
            <Route path="/holidays" element={<Holidays />} />
            <Route path="/facts" element={<Facts />} />
            <Route path="/qa" element={<IslamicQA />} />
            <Route path="/prayer-flow" element={<PrayerFlow />} />
            <Route path="/prayer-structure" element={<PrayerStructure />} />
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

// Check onboarding state from localStorage (no side effects)
function checkOnboarded(): boolean {
  if (localStorage.getItem("iman_onboarded") === "true") return true;
  const profile = localStorage.getItem("iman_profile");
  if (profile) {
    localStorage.setItem("iman_onboarded", "true");
    return true;
  }
  return false;
}

// Create profile from Telegram data (called AFTER sync attempt)
function ensureTelegramProfile(): boolean {
  if (checkOnboarded()) return true;
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
  // Splash на старте — показывается всегда при загрузке приложения
  const [showSplash, setShowSplash] = useState(true);

  // Start with localStorage check only (no profile creation yet)
  const [syncing, setSyncing] = useState(() => {
    // Only need to sync if we're in Telegram
    const tgUser = getTelegramUser();
    return !!tgUser;
  });
  const [onboarded, setOnboarded] = useState(checkOnboarded);

  // Sync user data FIRST, then check onboarding
  useEffect(() => {
    let cancelled = false;
    async function doSync() {
      try {
        // Timeout: don't block UI longer than 5 seconds
        await Promise.race([
          syncUserData(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("sync timeout")), 5000)),
        ]);
      } catch (e) {
        console.error("[App] sync failed:", e);
      }
      if (cancelled) return;
      // After sync restored server data to localStorage, re-check state
      const nowOnboarded = ensureTelegramProfile();
      setOnboarded(nowOnboarded);
      setSyncing(false);
      initAnalytics();
    }
    if (syncing) {
      doSync();
    } else {
      // Not in Telegram — just ensure profile and init
      const nowOnboarded = ensureTelegramProfile();
      setOnboarded(nowOnboarded);
      initAnalytics();
    }
    return () => { cancelled = true; };
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    dismissWelcome();
    setOnboarded(true);
  }, []);

  // Splash на старте — закрывает sync-индикатор и показывает брендированную заставку
  if (showSplash || syncing) {
    return <Splash onDone={() => setShowSplash(false)} />;
  }

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
