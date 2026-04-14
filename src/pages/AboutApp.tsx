import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Target,
  Users,
  Zap,
  Heart,
  BookOpen,
  Trophy,
  MessageCircle,
  Mail,
  Globe,
  CheckCircle2,
  X,
  ChevronRight,
  Play,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Stories data
// ---------------------------------------------------------------------------

const APP_STORIES = [
  {
    bg: "from-emerald-600 to-teal-700",
    emoji: "☪️",
    title: "IMAN",
    subtitle: "by Aziz Atavaliev",
    text: "Приложение для укрепления веры и духовного роста",
    cta: null,
  },
  {
    bg: "from-sky-600 to-blue-700",
    emoji: "🕌",
    title: "Трекер намазов",
    subtitle: "Отмечай все 5 намазов",
    text: "Получай саваб за каждый намаз вовремя. Система напоминаний и статистика.",
    cta: "/prayers",
  },
  {
    bg: "from-violet-600 to-purple-700",
    emoji: "📖",
    title: "Коран",
    subtitle: "Читай, слушай, заучивай",
    text: "114 сур с переводом, транслитерацией, аудио и тафсиром. Режим заучивания сур.",
    cta: "/quran",
  },
  {
    bg: "from-amber-600 to-orange-700",
    emoji: "📿",
    title: "Зикры и дуа",
    subtitle: "200+ молитв на все случаи жизни",
    text: "Утренние и вечерние азкары, дуа по категориям, цифровые чётки с вибрацией.",
    cta: "/dhikr",
  },
  {
    bg: "from-rose-600 to-pink-700",
    emoji: "🤲",
    title: "Стена дуа",
    subtitle: "Анонимные мольбы мусульман",
    text: "Попросите братьев и сестёр сделать за вас дуа. Ангел скажет: «Амин, и тебе того же».",
    cta: "/dua-wall",
  },
  {
    bg: "from-teal-600 to-cyan-700",
    emoji: "🧠",
    title: "Викторина",
    subtitle: "Проверь свои знания",
    text: "200+ вопросов по исламу: основы, Коран, история, пророки, сподвижники.",
    cta: "/quiz",
  },
  {
    bg: "from-indigo-600 to-blue-700",
    emoji: "📚",
    title: "30 историй",
    subtitle: "Достоверные рассказы",
    text: "Истории сподвижников, покаяния и чудес. Каждая с источником из Бухари, Муслима или Корана.",
    cta: "/stories",
  },
  {
    bg: "from-violet-600 to-purple-700",
    emoji: "📚",
    title: "Словарь и нашиды",
    subtitle: "Знания и вдохновение",
    text: "65 исламских терминов с арабским текстом. 32 нашида без инструментов. Толкование снов по Ибн Сирину.",
    cta: "/terms",
  },
  {
    bg: "from-fuchsia-600 to-purple-700",
    emoji: "✨",
    title: "99 имён Аллаха",
    subtitle: "Изучай и играй",
    text: "Все 99 имён с историями применения, дуа и викториной на запоминание.",
    cta: "/names",
  },
  {
    bg: "from-orange-600 to-red-700",
    emoji: "🕌",
    title: "Гид по намазу",
    subtitle: "По ханафитскому мазхабу",
    text: "Полное пошаговое руководство: вуду, кыям, руку', суджуд. С арабским текстом и переводом.",
    cta: "/namaz-guide",
  },
  {
    bg: "from-cyan-600 to-teal-700",
    emoji: "🧭",
    title: "Компас Киблы",
    subtitle: "Направление на Мекку",
    text: "Определение направления Киблы в реальном времени. Расстояние до Каабы.",
    cta: "/qibla",
  },
  {
    bg: "from-yellow-600 to-amber-700",
    emoji: "🏆",
    title: "Саваб-коины",
    subtitle: "Система духовной мотивации",
    text: "Зарабатывай саваб за намазы, чтение Корана, зикры и хадисы. Повышай уровень имана!",
    cta: "/stats",
  },
];

// ---------------------------------------------------------------------------
// Stories Component (Instagram-style)
// ---------------------------------------------------------------------------

function StoriesViewer({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const touchStartX = useRef(0);

  const SLIDE_DURATION = 4000; // 4 seconds per slide
  const TICK = 50;

  const goNext = useCallback(() => {
    if (current < APP_STORIES.length - 1) {
      setCurrent((p) => p + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [current, onClose]);

  const goPrev = useCallback(() => {
    if (current > 0) {
      setCurrent((p) => p - 1);
      setProgress(0);
    }
  }, [current]);

  useEffect(() => {
    setProgress(0);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + (TICK / SLIDE_DURATION) * 100;
        if (next >= 100) {
          goNext();
          return 0;
        }
        return next;
      });
    }, TICK);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [current, goNext]);

  const story = APP_STORIES[current];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (deltaX > 50) goPrev();
    else if (deltaX < -50) goNext();
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) goPrev();
    else goNext();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black animate-fade-in">
      {/* Progress bars */}
      <div className="absolute top-[env(safe-area-inset-top)] left-0 right-0 z-50 flex gap-1 px-3 pt-3">
        {APP_STORIES.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden"
          >
            <div
              className="h-full rounded-full bg-white transition-all duration-75"
              style={{
                width:
                  i < current ? "100%" : i === current ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-[calc(env(safe-area-inset-top)+24px)] right-4 z-50 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/50 transition-colors"
      >
        <X size={18} className="text-white" />
      </button>

      {/* Story content */}
      <div
        className={`h-full flex flex-col items-center justify-center px-8 bg-gradient-to-b ${story.bg} transition-all duration-300`}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="text-center max-w-sm animate-fade-in" key={current}>
          <div className="text-7xl mb-6">{story.emoji}</div>
          <h2 className="text-3xl font-black text-white mb-2">{story.title}</h2>
          <p className="text-lg text-white/80 font-medium mb-4">
            {story.subtitle}
          </p>
          <p className="text-sm text-white/60 leading-relaxed mb-8">
            {story.text}
          </p>

          {story.cta && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                navigate(story.cta!);
              }}
              className="px-6 py-3 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold flex items-center gap-2 mx-auto hover:bg-white/30 active:scale-95 transition-all"
            >
              Открыть
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Slide counter */}
        <p className="absolute bottom-[calc(env(safe-area-inset-bottom)+16px)] text-xs text-white/30">
          {current + 1} / {APP_STORIES.length}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AboutApp() {
  const navigate = useNavigate();
  const [showStories, setShowStories] = useState(false);

  return (
    <>
      {showStories && <StoriesViewer onClose={() => setShowStories(false)} />}
      <div className="min-h-screen pb-8 px-4 pt-6 max-w-lg mx-auto animate-fade-in">
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-xl t-bg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} className="text-white/70" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-white">
              О приложении IMAN
            </h1>
            <p className="text-sm t-text-m mt-0.5">
              Ваш спутник на пути к Аллаху
            </p>
          </div>
        </header>

        {/* Hero Section */}
        <div className="glass-card p-6 relative overflow-hidden mb-5">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">IMAN App</h2>
            <p className="text-base t-text-s leading-relaxed">
              Приложение для мусульман, которое помогает укрепить веру, развить
              полезные исламские привычки и достичь духовного роста через
              геймификацию и систему мотивации.
            </p>

            {/* Кнопка обзора в формате сторис */}
            <button
              onClick={() => setShowStories(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 hover:border-emerald-400/50 active:scale-95 transition-all group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                <Play size={14} className="text-white ml-0.5" fill="white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">
                  Смотреть обзор
                </p>
                <p className="text-[10px] t-text-m">12 сторис о возможностях</p>
              </div>
            </button>
          </div>
        </div>

        {/* Для кого */}
        <div className="glass-card p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-semibold text-white">
              Для кого это приложение?
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm t-text-s">
                <span className="font-medium text-white">Новичков</span> —
                которые только начинают изучать ислам
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm t-text-s">
                <span className="font-medium text-white">Практикующих</span> —
                кто хочет улучшить свои ибадаты
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm t-text-s">
                <span className="font-medium text-white">Всех мусульман</span> —
                кто стремится к духовному росту
              </p>
            </div>
          </div>
        </div>

        {/* Возможности */}
        <div className="glass-card p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold text-white">
              Основные возможности
            </h3>
          </div>
          <div className="space-y-3">
            {[
              {
                icon: BookOpen,
                title: "Намазы и Коран",
                desc: "Отслеживайте намазы, слушайте и читайте Коран",
                color: "text-emerald-400",
              },
              {
                icon: Target,
                title: "Привычки и цели",
                desc: "Развивайте исламские привычки с системой мотивации",
                color: "text-rose-400",
              },
              {
                icon: Trophy,
                title: "Уровни и достижения",
                desc: "Зарабатывайте саваб и повышайте духовный уровень",
                color: "text-amber-400",
              },
              {
                icon: Heart,
                title: "Дуа и хадисы",
                desc: "Ежедневные хадисы, коллекция дуа и 99 имен Аллаха",
                color: "text-pink-400",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl t-bg"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${feature.color.replace("text-", "bg-")}/10`}
                >
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white mb-0.5">
                    {feature.title}
                  </p>
                  <p className="text-xs t-text-m">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Как начать */}
        <div className="glass-card p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-semibold text-white">Как начать?</h3>
          </div>
          <div className="space-y-3">
            {[
              {
                step: "1",
                title: "Настройте профиль",
                desc: "Укажите ваше имя и местоположение для точного времени намазов",
              },
              {
                step: "2",
                title: "Отмечайте намазы",
                desc: "Зарабатывайте саваб за каждый совершённый намаз вовремя",
              },
              {
                step: "3",
                title: "Развивайте привычки",
                desc: "Читайте Коран, делайте азкары, слушайте хадисы",
              },
              {
                step: "4",
                title: "Растите духовно",
                desc: "Повышайте уровни и поддерживайте серию дней подряд",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shrink-0 text-xs font-bold text-white">
                  {item.step}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white mb-0.5">
                    {item.title}
                  </p>
                  <p className="text-xs t-text-m">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Система мотивации */}
        <div className="glass-card p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold text-white">
              Система мотивации
            </h3>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm font-medium text-emerald-400 mb-1">
                Саваб и уровни
              </p>
              <p className="text-xs t-text-m">
                Выполняйте ибадаты и зарабатывайте саваб. Повышайте уровень от
                "Начинающий" до "Мутакки"
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm font-medium text-amber-400 mb-1">
                Серия дней подряд
              </p>
              <p className="text-xs t-text-m">
                Поддерживайте ежедневную практику и растите вашу серию. Побейте
                свой рекорд!
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-sm font-medium text-purple-400 mb-1">
                Статистика и прогресс
              </p>
              <p className="text-xs t-text-m">
                Отслеживайте ваш прогресс в намазах, чтении Корана и других
                привычках
              </p>
            </div>
          </div>
        </div>

        {/* Контакты */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-semibold text-white">
              Контакты и поддержка
            </h3>
          </div>
          <div className="space-y-3">
            <a
              href="https://t.me/ATAVALIEV"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl t-bg hover:bg-white/[0.08] transition-colors active:scale-[0.98]"
            >
              <Mail className="w-5 h-5 text-sky-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Telegram</p>
                <p className="text-xs t-text-m">@ATAVALIEV</p>
              </div>
            </a>
            <a
              href="https://t.me/ATAVALIEV"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl t-bg hover:bg-white/[0.08] transition-colors active:scale-[0.98]"
            >
              <Globe className="w-5 h-5 text-emerald-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  По всем вопросам
                </p>
                <p className="text-xs t-text-m">Пишите @ATAVALIEV</p>
              </div>
            </a>
          </div>

          <div className="mt-5 pt-4 border-t t-border text-center">
            <p className="text-xs t-text-f">
              Версия 1.0.0 • Сделано с ❤️ для уммы
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/beginners")}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-transform"
          >
            Начать путешествие
          </button>
        </div>
      </div>
    </>
  );
}
