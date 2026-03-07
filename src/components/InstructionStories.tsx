import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Story categories (кружки как в Instagram)
// ---------------------------------------------------------------------------

interface StoryCategory {
  id: string;
  emoji: string;
  label: string;
  stories: InstructionSlide[];
}

interface InstructionSlide {
  bgStyle: string; // CSS gradient
  emoji: string;
  title: string;
  text: string;
  bullets?: string[];
}

const STORY_CATEGORIES: StoryCategory[] = [
  {
    id: "beginners",
    emoji: "🌱",
    label: "Новичкам",
    stories: [
      {
        bgStyle: "linear-gradient(to bottom, #064e3b, #022c22, #0f172a)",
        emoji: "🕌",
        title: "Начните с намазов",
        text: "Отмечайте каждый намаз на главной странице. Нажмите «Прочитал» после каждого намаза.",
        bullets: [
          "Фаджр, Зухр, Аср, Магриб, Иша — 5 намазов",
          "Время рассчитывается для вашего города",
          "За намаз вовремя: +10 саваб",
        ],
      },
      {
        bgStyle: "linear-gradient(to bottom, #1e3a5f, #172554, #0f172a)",
        emoji: "📖",
        title: "Читайте Коран",
        text: "Откройте раздел «Коран» — выберите суру, слушайте аудио, читайте перевод.",
        bullets: [
          "114 сур с арабским текстом",
          "Аудио от известных чтецов",
          "Перевод на русский язык",
        ],
      },
      {
        bgStyle: "linear-gradient(to bottom, #78350f, #451a03, #0f172a)",
        emoji: "🤲",
        title: "Дуа и азкары",
        text: "Не забывайте утренние и вечерние азкары. Отмечайте их в привычках на главной.",
        bullets: [
          "Утренние азкары: +2 саваб",
          "Вечерние азкары: +2 саваб",
          "Дуа на все случаи жизни в разделе «Дуа»",
        ],
      },
    ],
  },
  {
    id: "features",
    emoji: "📋",
    label: "Функции",
    stories: [
      {
        bgStyle: "linear-gradient(to bottom, #312e81, #1e1b4b, #0f172a)",
        emoji: "🗺️",
        title: "Карта приложения",
        text: "В IMAN 15+ функций для вашего духовного роста. Все доступны из главного меню.",
        bullets: [
          "🕌 Намаз: время, гид, трекер",
          "📖 Коран: чтение, заучивание, аудио",
          "📿 Дуа, азкары, зикры, чётки",
          "🧠 Викторина, хадисы, истории пророков",
          "🏆 Лидерборд и статистика",
        ],
      },
      {
        bgStyle: "linear-gradient(to bottom, #4c1d95, #2e1065, #0f172a)",
        emoji: "📖",
        title: "Заучивание сур",
        text: "Запоминайте аяты Корана с помощью подсказок и повторений. Доступно через кнопку «Заучивание» внизу.",
        bullets: [
          "Выберите суру для заучивания",
          "Слушайте аудио, повторяйте за чтецом",
          "Система скрывает слова для проверки памяти",
        ],
      },
      {
        bgStyle: "linear-gradient(to bottom, #164e63, #083344, #0f172a)",
        emoji: "🧭",
        title: "Кибла и другие функции",
        text: "Компас киблы, калькулятор закята, трекер Рамадана и многое другое.",
        bullets: [
          "Направление киблы в реальном времени",
          "Расчёт закята по ханафитскому мазхабу",
          "Трекер поста в Рамадан с аятами дня",
        ],
      },
    ],
  },
  {
    id: "levels",
    emoji: "🏆",
    label: "Уровни",
    stories: [
      {
        bgStyle: "linear-gradient(to bottom, #78350f, #451a03, #0f172a)",
        emoji: "⭐",
        title: "Система уровней",
        text: "Зарабатывайте саваб-коины за действия. Чем больше саваб — тем выше уровень!",
        bullets: [
          "🌱 Талиб (начинающий) — 0 очков",
          "☪️ Муслим (практикующий) — 200 очков",
          "📿 Му'мин (верующий) — 750 очков",
          "⭐ Мухсин (старательный) — 2 000 очков",
          "🌙 Муттакий (осознанный) — 5 000 очков",
          "... и ещё 5 уровней до Имама!",
        ],
      },
      {
        bgStyle: "linear-gradient(to bottom, #7c2d12, #431407, #0f172a)",
        emoji: "📈",
        title: "Серии (streak)",
        text: "Заходите каждый день и выполняйте хотя бы одно действие, чтобы сохранить серию дней подряд.",
        bullets: [
          "Серия дней отображается на главной",
          "Мотивирует на постоянство в практике",
          "Ваш рекорд серии сохраняется навсегда",
        ],
      },
      {
        bgStyle: "linear-gradient(to bottom, #713f12, #422006, #0f172a)",
        emoji: "🏅",
        title: "Лидерборд",
        text: "Соревнуйтесь в благом с другими мусульманами. Топ-лидеры видны всем!",
        bullets: [
          "Глобальный рейтинг пользователей",
          "Ваша позиция среди всех мусульман",
          "Выполняйте действия — поднимайтесь в рейтинге",
        ],
      },
    ],
  },
  {
    id: "sawab",
    emoji: "⭐",
    label: "Саваб",
    stories: [
      {
        bgStyle: "linear-gradient(to bottom, #78350f, #451a03, #0f172a)",
        emoji: "⭐",
        title: "Что такое саваб-коины?",
        text: "Саваб-коины — это внутренняя система мотивации в IMAN. Они НЕ заменяют настоящий саваб перед Аллахом, а помогают вам отслеживать свою активность.",
        bullets: [
          "Это НЕ религиозный саваб, а система трекинга",
          "Помогает видеть свой прогресс и не забывать о ежедневных действиях",
          "Мотивирует выполнять больше благих дел каждый день",
        ],
      },
      {
        bgStyle: "linear-gradient(to bottom, #713f12, #422006, #0f172a)",
        emoji: "💰",
        title: "Как заработать саваб?",
        text: "За каждое действие в приложении вы получаете саваб-коины:",
        bullets: [
          "🕌 Намаз вовремя: +10 очков",
          "🕐 Намаз с опозданием: +3 очка",
          "📖 Чтение Корана: +5 очков",
          "📿 Дуа: +3 очка",
          "🤲 Азкары (утро/вечер): +3 очка",
          "🧠 Викторина (за ответ): +2 очка",
        ],
      },
      {
        bgStyle: "linear-gradient(to bottom, #7c2d12, #431407, #0f172a)",
        emoji: "📈",
        title: "Уровни за саваб",
        text: "Чем больше саваб-коинов — тем выше ваш уровень. Это показывает насколько активно вы пользуетесь приложением.",
        bullets: [
          "🌱 Талиб (начинающий) — 0 очков",
          "☪️ Муслим (практикующий) — 200 очков",
          "📿 Му'мин (верующий) — 750 очков",
          "⭐ Мухсин (старательный) — 2 000 очков",
          "👑 ... до Имама (мастер) — 150 000 очков",
        ],
      },
    ],
  },
  {
    id: "about",
    emoji: "💚",
    label: "О нас",
    stories: [
      {
        bgStyle: "linear-gradient(to bottom, #064e3b, #022c22, #0f172a)",
        emoji: "🕌",
        title: "Миссия IMAN",
        text: "Наша цель — не учить вас исламу, а помочь каждому мусульманину укрепить свою веру через ежедневную практику.",
        bullets: [
          "Это не только про время намазов",
          "Это про ваш ежедневный духовный рост",
          "Про привычки, знания и постоянство",
          "Про стремление быть ближе к Аллаху",
        ],
      },
      {
        bgStyle: "linear-gradient(to bottom, #134e4a, #042f2e, #0f172a)",
        emoji: "👨‍💻",
        title: "Автор — Азиз Атавалиев",
        text: "Ас-саляму алейкум! Меня зовут Азиз Атавалиев. Я разработчик из Кыргызстана. Создал IMAN с намерением помочь мусульманам не забывать о ежедневных действиях и расти духовно каждый день.",
        bullets: [
          "Приложение бесплатное и без рекламы",
          "Все данные по ханафитскому мазхабу",
          "Обновления и улучшения — постоянно",
        ],
      },
      {
        bgStyle: "linear-gradient(to bottom, #14532d, #052e16, #0f172a)",
        emoji: "🎯",
        title: "Наша цель — 1 000 000",
        text: "__USERS_COUNT__",
        bullets: [
          "Поделитесь приложением с друзьями и семьёй",
          "Оставьте отзыв — это помогает развитию",
          "Если хотите поддержать — донат приветствуется 🤲",
        ],
      },
      {
        bgStyle: "linear-gradient(to bottom, #064e3b, #022c22, #0f172a)",
        emoji: "🤲",
        title: "Сделайте дуа за нас",
        text: "Если приложение помогло вам — сделайте дуа за всю команду. Это лучшая награда для нас.\n\nБаракаллаху фикум! 🌙",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Story Viewer (полноэкранный просмотр)
// ---------------------------------------------------------------------------

interface StoryViewerProps {
  category: StoryCategory;
  onClose: () => void;
  totalUsers?: number;
}

function StoryViewer({ category, onClose, totalUsers = 0 }: StoryViewerProps) {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const isPaused = useRef(false);

  const DURATION = 7000;
  const TICK = 50;
  const stories = category.stories;
  const slide = stories[current];

  useEffect(() => {
    setProgress(0);
    isPaused.current = false;

    timerRef.current = setInterval(() => {
      if (isPaused.current) return;
      setProgress((prev) => {
        const next = prev + (TICK / DURATION) * 100;
        if (next >= 100) {
          if (current < stories.length - 1) {
            setCurrent((c) => c + 1);
            return 0;
          } else {
            clearInterval(timerRef.current!);
            onClose();
            return 100;
          }
        }
        return next;
      });
    }, TICK);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [current]);

  const goNext = useCallback(() => {
    if (current < stories.length - 1) setCurrent((c) => c + 1);
    else onClose();
  }, [current, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (current > 0) setCurrent((c) => c - 1);
  }, [current]);

  function handleTap(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (e.clientX < rect.left + rect.width / 2) goPrev();
    else goNext();
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[300] flex flex-col select-none"
      style={{ background: slide.bgStyle }}
      onClick={handleTap}
      onPointerDown={() => { isPaused.current = true; }}
      onPointerUp={() => { isPaused.current = false; }}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; isPaused.current = true; }}
      onTouchEnd={(e) => {
        isPaused.current = false;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) goNext();
          else goPrev();
        }
      }}
    >
      {/* Progress bars */}
      <div className="flex gap-1 px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
        {stories.map((_, i) => (
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

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{category.emoji}</span>
          <span className="text-sm font-semibold text-white">{category.label}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
        >
          <X size={18} className="text-white/70" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-5"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))",
          }}
        >
          {slide.emoji}
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-2">{slide.title}</h2>
        <p className="text-sm text-white/60 text-center mb-5 max-w-xs leading-relaxed whitespace-pre-line">
          {slide.text === "__USERS_COUNT__"
            ? `Мы мечтаем, чтобы IMAN помог миллиону мусульман. Сейчас нас уже ${totalUsers > 0 ? totalUsers.toLocaleString() : "..."} — присоединяйтесь и расскажите друзьям!`
            : slide.text}
        </p>

        {slide.bullets && (
          <div className="w-full max-w-sm space-y-2">
            {slide.bullets.map((b, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="text-sm text-white/80 leading-snug">{b}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-1 text-white/25 text-xs">
          <span>{current + 1}/{stories.length}</span>
          <ChevronRight size={12} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Story Circles (кружки, размещаются на Dashboard)
// ---------------------------------------------------------------------------

export default function InstructionStories({ totalUsers = 0 }: { totalUsers?: number }) {
  const [activeCategory, setActiveCategory] = useState<StoryCategory | null>(null);
  const [viewed, setViewed] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("iman_instruction_viewed");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  function openCategory(cat: StoryCategory) {
    setActiveCategory(cat);
  }

  function closeViewer() {
    if (activeCategory) {
      const newViewed = new Set(viewed);
      newViewed.add(activeCategory.id);
      setViewed(newViewed);
      localStorage.setItem("iman_instruction_viewed", JSON.stringify([...newViewed]));
    }
    setActiveCategory(null);
  }

  return (
    <>
      {/* Story circles row */}
      <div className="flex gap-3 overflow-x-auto scrollbar-none px-1 py-1 -mx-1">
        {STORY_CATEGORIES.map((cat) => {
          const isViewed = viewed.has(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => openCategory(cat)}
              className="flex flex-col items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                style={
                  isViewed
                    ? { background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)" }
                    : {
                        background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(20,184,166,0.2))",
                        border: "2px solid rgba(16,185,129,0.5)",
                        boxShadow: "0 0 12px rgba(16,185,129,0.2)",
                      }
                }
              >
                {cat.emoji}
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ color: isViewed ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.7)" }}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Fullscreen viewer — Portal to body to escape transform containing block */}
      {activeCategory && createPortal(
        <StoryViewer category={activeCategory} onClose={closeViewer} totalUsers={totalUsers} />,
        document.body
      )}
    </>
  );
}
