import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Search,
  X,
  Play,
  Pause,
  CheckCircle2,
  BookOpen,
  RotateCcw,
  TrendingUp,
  Star,
  Plus,
  Check,
  Volume2,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Moon,
} from "lucide-react";
import { storage, POINTS } from "../lib/storage";
import { useAudio } from "../components/AudioPlayer";
import { getSurah, getSurahTranslation, hapticImpact } from "../lib/api";
import type { Ayah } from "../lib/api";
import type { MemorizationSurah } from "../lib/storage";
import { getTransliteration } from "../data/quran-transliteration";

// ============================================================
// Complete Surah Names Map (all 114)
// ============================================================

const SURAH_NAMES: Record<number, { ru: string; ar: string; ayahs: number }> = {
  1: { ru: "Открывающая", ar: "الفاتحة", ayahs: 7 },
  2: { ru: "Корова", ar: "البقرة", ayahs: 286 },
  3: { ru: "Семейство Имрана", ar: "آل عمران", ayahs: 200 },
  4: { ru: "Женщины", ar: "النساء", ayahs: 176 },
  5: { ru: "Трапеза", ar: "المائدة", ayahs: 120 },
  6: { ru: "Скот", ar: "الأنعام", ayahs: 165 },
  7: { ru: "Преграды", ar: "الأعراف", ayahs: 206 },
  8: { ru: "Трофеи", ar: "الأنفال", ayahs: 75 },
  9: { ru: "Покаяние", ar: "التوبة", ayahs: 129 },
  10: { ru: "Юнус", ar: "يونس", ayahs: 109 },
  11: { ru: "Худ", ar: "هود", ayahs: 123 },
  12: { ru: "Юсуф", ar: "يوسف", ayahs: 111 },
  13: { ru: "Гром", ar: "الرعد", ayahs: 43 },
  14: { ru: "Ибрахим", ar: "إبراهيم", ayahs: 52 },
  15: { ru: "Аль-Хиджр", ar: "الحجر", ayahs: 99 },
  16: { ru: "Пчёлы", ar: "النحل", ayahs: 128 },
  17: { ru: "Ночной перенос", ar: "الإسراء", ayahs: 111 },
  18: { ru: "Пещера", ar: "الكهف", ayahs: 110 },
  19: { ru: "Марьям", ar: "مريم", ayahs: 98 },
  20: { ru: "Та Ха", ar: "طه", ayahs: 135 },
  21: { ru: "Пророки", ar: "الأنبياء", ayahs: 112 },
  22: { ru: "Хадж", ar: "الحج", ayahs: 78 },
  23: { ru: "Верующие", ar: "المؤمنون", ayahs: 118 },
  24: { ru: "Свет", ar: "النور", ayahs: 64 },
  25: { ru: "Различение", ar: "الفرقان", ayahs: 77 },
  26: { ru: "Поэты", ar: "الشعراء", ayahs: 227 },
  27: { ru: "Муравьи", ar: "النمل", ayahs: 93 },
  28: { ru: "Рассказ", ar: "القصص", ayahs: 88 },
  29: { ru: "Паук", ar: "العنكبوت", ayahs: 69 },
  30: { ru: "Римляне", ar: "الروم", ayahs: 60 },
  31: { ru: "Лукман", ar: "لقمان", ayahs: 34 },
  32: { ru: "Поклон", ar: "السجدة", ayahs: 30 },
  33: { ru: "Союзники", ar: "الأحزاب", ayahs: 73 },
  34: { ru: "Саба", ar: "سبأ", ayahs: 54 },
  35: { ru: "Творец", ar: "فاطر", ayahs: 45 },
  36: { ru: "Йа Син", ar: "يس", ayahs: 83 },
  37: { ru: "Стоящие в ряд", ar: "الصافات", ayahs: 182 },
  38: { ru: "Сад", ar: "ص", ayahs: 88 },
  39: { ru: "Толпы", ar: "الزمر", ayahs: 75 },
  40: { ru: "Прощающий", ar: "غافر", ayahs: 85 },
  41: { ru: "Разъяснены", ar: "فصلت", ayahs: 54 },
  42: { ru: "Совет", ar: "الشورى", ayahs: 53 },
  43: { ru: "Украшения", ar: "الزخرف", ayahs: 89 },
  44: { ru: "Дым", ar: "الدخان", ayahs: 59 },
  45: { ru: "Коленопреклонённая", ar: "الجاثية", ayahs: 37 },
  46: { ru: "Барханы", ar: "الأحقاف", ayahs: 35 },
  47: { ru: "Мухаммад", ar: "محمد", ayahs: 38 },
  48: { ru: "Победа", ar: "الفتح", ayahs: 29 },
  49: { ru: "Комнаты", ar: "الحجرات", ayahs: 18 },
  50: { ru: "Каф", ar: "ق", ayahs: 45 },
  51: { ru: "Рассеивающие", ar: "الذاريات", ayahs: 60 },
  52: { ru: "Гора", ar: "الطور", ayahs: 49 },
  53: { ru: "Звезда", ar: "النجم", ayahs: 62 },
  54: { ru: "Месяц", ar: "القمر", ayahs: 55 },
  55: { ru: "Милостивый", ar: "الرحمن", ayahs: 78 },
  56: { ru: "Событие", ar: "الواقعة", ayahs: 96 },
  57: { ru: "Железо", ar: "الحديد", ayahs: 29 },
  58: { ru: "Препирающаяся", ar: "المجادلة", ayahs: 22 },
  59: { ru: "Сбор", ar: "الحشر", ayahs: 24 },
  60: { ru: "Испытуемая", ar: "الممتحنة", ayahs: 13 },
  61: { ru: "Ряд", ar: "الصف", ayahs: 14 },
  62: { ru: "Пятница", ar: "الجمعة", ayahs: 11 },
  63: { ru: "Лицемеры", ar: "المنافقون", ayahs: 11 },
  64: { ru: "Взаимное обделение", ar: "التغابن", ayahs: 18 },
  65: { ru: "Развод", ar: "الطلاق", ayahs: 12 },
  66: { ru: "Запрещение", ar: "التحريم", ayahs: 12 },
  67: { ru: "Власть", ar: "الملك", ayahs: 30 },
  68: { ru: "Письменная трость", ar: "القلم", ayahs: 52 },
  69: { ru: "Неизбежное", ar: "الحاقة", ayahs: 52 },
  70: { ru: "Ступени", ar: "المعارج", ayahs: 44 },
  71: { ru: "Нух", ar: "نوح", ayahs: 28 },
  72: { ru: "Джинны", ar: "الجن", ayahs: 28 },
  73: { ru: "Закутавшийся", ar: "المزمل", ayahs: 20 },
  74: { ru: "Завернувшийся", ar: "المدثر", ayahs: 56 },
  75: { ru: "Воскресение", ar: "القيامة", ayahs: 40 },
  76: { ru: "Человек", ar: "الإنسان", ayahs: 31 },
  77: { ru: "Посылаемые", ar: "المرسلات", ayahs: 50 },
  78: { ru: "Весть", ar: "النبأ", ayahs: 40 },
  79: { ru: "Вырывающие", ar: "النازعات", ayahs: 46 },
  80: { ru: "Нахмурился", ar: "عبس", ayahs: 42 },
  81: { ru: "Скручивание", ar: "التكوير", ayahs: 29 },
  82: { ru: "Раскалывание", ar: "الإنفطار", ayahs: 19 },
  83: { ru: "Обвешивающие", ar: "المطففين", ayahs: 36 },
  84: { ru: "Разверзнётся", ar: "الإنشقاق", ayahs: 25 },
  85: { ru: "Созвездия", ar: "البروج", ayahs: 22 },
  86: { ru: "Ночной путник", ar: "الطارق", ayahs: 17 },
  87: { ru: "Высочайший", ar: "الأعلى", ayahs: 19 },
  88: { ru: "Покрывающее", ar: "الغاشية", ayahs: 26 },
  89: { ru: "Заря", ar: "الفجر", ayahs: 30 },
  90: { ru: "Город", ar: "البلد", ayahs: 20 },
  91: { ru: "Солнце", ar: "الشمس", ayahs: 15 },
  92: { ru: "Ночь", ar: "الليل", ayahs: 21 },
  93: { ru: "Утро", ar: "الضحى", ayahs: 11 },
  94: { ru: "Раскрытие", ar: "الشرح", ayahs: 8 },
  95: { ru: "Смоковница", ar: "التين", ayahs: 8 },
  96: { ru: "Сгусток", ar: "العلق", ayahs: 19 },
  97: { ru: "Предопределение", ar: "القدر", ayahs: 5 },
  98: { ru: "Ясное знамение", ar: "البينة", ayahs: 8 },
  99: { ru: "Землетрясение", ar: "الزلزلة", ayahs: 8 },
  100: { ru: "Скачущие", ar: "العاديات", ayahs: 11 },
  101: { ru: "Великое бедствие", ar: "القارعة", ayahs: 11 },
  102: { ru: "Приумножение", ar: "التكاثر", ayahs: 8 },
  103: { ru: "Время", ar: "العصر", ayahs: 3 },
  104: { ru: "Хулитель", ar: "الهمزة", ayahs: 9 },
  105: { ru: "Слон", ar: "الفيل", ayahs: 5 },
  106: { ru: "Курайш", ar: "قريش", ayahs: 4 },
  107: { ru: "Мелочь", ar: "الماعون", ayahs: 7 },
  108: { ru: "Изобилие", ar: "الكوثر", ayahs: 3 },
  109: { ru: "Неверующие", ar: "الكافرون", ayahs: 6 },
  110: { ru: "Помощь", ar: "النصر", ayahs: 3 },
  111: { ru: "Пальмовые волокна", ar: "المسد", ayahs: 5 },
  112: { ru: "Искренность", ar: "الإخلاص", ayahs: 4 },
  113: { ru: "Рассвет", ar: "الفلق", ayahs: 5 },
  114: { ru: "Люди", ar: "الناس", ayahs: 6 },
};

// ============================================================
// Popular surahs for memorization
// ============================================================

// Essential surahs for prayer (namaz) — must be memorized first
const PRAYER_SURAHS = [
  1, // Аль-Фатиха — обязательна в каждом ракаате
  112, // Аль-Ихлас — читается в намазе
  113, // Аль-Фалак — читается в намазе
  114, // Ан-Нас — читается в намазе
  108, // Аль-Каусар — короткая для намаза
  109, // Аль-Кафирун — читается в сунне фаджра
  110, // Ан-Наср — короткая для намаза
  111, // Аль-Масад — короткая для намаза
  103, // Аль-Аср — короткая для намаза
  105, // Аль-Филь — короткая для намаза
  106, // Курайш — короткая для намаза
  107, // Аль-Маун — короткая для намаза
];

// Sorted by ayah count: easiest (fewest ayahs) → hardest (most ayahs)
const POPULAR_SURAHS = [
  108, // Изобилие — 3 аята
  103, // Время — 3 аята
  110, // Помощь — 3 аята
  106, // Курайш — 4 аята
  112, // Искренность — 4 аята
  97, // Предопределение — 5 аята
  105, // Слон — 5 аятов
  111, // Пальмовые волокна — 5 аятов
  113, // Рассвет — 5 аятов
  109, // Неверующие — 6 аятов
  114, // Люди — 6 аятов
  1, // Открывающая — 7 аятов
  107, // Мелочь — 7 аятов
  94, // Раскрытие — 8 аятов
  95, // Смоковница — 8 аятов
  99, // Землетрясение — 8 аятов
  102, // Приумножение — 8 аятов
  104, // Хулитель — 9 аятов
  93, // Утро — 11 аятов
  100, // Скачущие — 11 аятов
  101, // Великое бедствие — 11 аятов
  91, // Солнце — 15 аятов
  87, // Высочайший — 19 аятов
  96, // Сгусток — 19 аятов
  90, // Город — 20 аятов
  92, // Ночь — 21 аятов
  88, // Покрывающее — 26 аятов
  89, // Заря — 30 аятов
  67, // Власть — 30 аятов
  78, // Весть — 40 аятов
  55, // Милостивый — 78 аятов
  36, // Йа Син — 83 аята
  56, // Событие — 96 аятов
];

// ============================================================
// Surah Descriptions (theme/significance in Russian)
// ============================================================

const SURAH_DESCRIPTIONS: Record<number, string> = {
  1: "Открывающая сура Корана, обязательная в каждом намазе. Содержит суть всего Корана — восхваление Аллаха, признание Его единственности и просьбу о руководстве на прямой путь.",
  2: "Самая длинная сура Корана, охватывающая основы вероучения, законодательства и истории пророков. Содержит аят аль-Курси (255) — величайший аят о величии Аллаха, а также законы о торговле, браке и посте.",
  18: "Сура о защите от смут и искушений. Рассказывает четыре истории: юноши в пещере, владелец двух садов, Муса и Хидр, Зуль-Карнайн. Пророк (мир ему) рекомендовал читать её каждую пятницу — она будет светом между двумя пятницами.",
  36: "Называется «сердцем Корана». Повествует о единобожии, пророческой миссии и воскрешении. Рекомендуется читать при посещении больных и умирающих, содержит сильные доказательства могущества Аллаха.",
  55: "«Милостивый» — сура о бесчисленных милостях Аллаха к Его творениям. Повторяющийся рефрен «Какое же из благодеяний Господа вашего вы сочтёте ложным?» напоминает о благодарности. Описывает Рай в мельчайших деталях.",
  56: "Сура о Дне Суда и трёх группах людей: приближённые к Аллаху, обитатели правой стороны (праведники) и обитатели левой стороны (грешники). Ярко описывает блаженство Рая и мучения Ада.",
  67: "«Власть» — сура, защищающая от мучений могилы. Пророк (мир ему) рекомендовал читать её каждую ночь перед сном. Размышляет о величии творения Аллаха и бессилии неверующих.",
  78: "«Весть» — сура о Дне Воскресения и его знамениях. Описывает природные явления как доказательства могущества Аллаха, а также подробности Судного Дня, наград праведникам и наказания грешникам.",
  87: "«Высочайший» — сура, прославляющая Аллаха и напоминающая о преходящности мирской жизни. Пророк (мир ему) читал её в пятничном намазе и праздничных молитвах. Призывает к очищению души.",
  93: "«Утро» — сура утешения, ниспосланная Пророку (мир ему) после перерыва в откровениях. Аллах напоминает о Своих благах и обещает, что будущее лучше прошлого. Учит благодарности и заботе о сиротах.",
  94: "«Раскрытие» — продолжение утешения Пророка (мир ему). Напоминает, что с каждой трудностью приходит облегчение (повторено дважды для усиления). Вдохновляет на терпение и упование на Аллаха.",
  95: "«Смоковница» — сура клянётся смоковницей, маслиной, горой Синай и Меккой. Утверждает, что человек создан в лучшем облике, но может пасть до низшего состояния, если не уверует и не будет совершать благие дела.",
  97: "«Предопределение» — сура о величии Ночи Предопределения (Ляйлятуль-Кадр), которая лучше тысячи месяцев. В эту ночь был ниспослан Коран, и ангелы нисходят с повелениями Аллаха. Мир царит до рассвета.",
  99: "«Землетрясение» — сура о потрясении земли в Судный День, когда она расскажет обо всём, что на ней происходило. Каждое деяние, даже весом в пылинку, будет показано человеку.",
  103: "«Время» — одна из самых коротких, но глубочайших сур. Имам аш-Шафии сказал: если бы люди размышляли только над ней, им бы этого было достаточно. Все люди в убытке, кроме верующих, творящих добро, призывающих к истине и терпению.",
  105: "«Слон» — сура о чуде уничтожения войска Абрахи, шедшего разрушить Каабу с боевыми слонами. Аллах послал птиц Абабиль с камнями из обожжённой глины, показав Свою защиту Священного Дома.",
  108: "«Изобилие» — самая короткая сура Корана (3 аята). Аллах дарует Пророку (мир ему) источник Аль-Каусар в Раю. Повелевает молиться и совершать жертвоприношение. Враги Пророка будут отрезаны от всякого блага.",
  109: "«Неверующие» — сура о чистоте вероисповедания и полном разграничении между исламом и многобожием. Завершается словами «У вас — ваша религия, а у меня — моя». Читается в сунне утреннего и вечернего намаза.",
  110: "«Помощь» — последняя по времени ниспослания сура. Предвещает победу ислама и массовое принятие веры. Учёные считают, что она намекала на скорую кончину Пророка (мир ему), повелевая ему просить прощения.",
  112: "Сура о чистом единобожии (таухиде). Равна по награде одной трети Корана. Утверждает абсолютное единство Аллаха — Он не родил и не был рождён, и нет никого, равного Ему.",
  113: "«Рассвет» — одна из двух защитных сур (аль-муаввизатайн). Просьба о защите у Господа рассвета от зла творений, от мрака ночи, от колдуний и от завистника. Пророк (мир ему) читал её каждую ночь перед сном.",
  114: "«Люди» — завершающая сура Корана и вторая из защитных сур. Просьба о защите у Господа людей от наущений шайтана, который отступает при поминании Аллаха. Читается вместе с сурой Аль-Фаляк для защиты.",
};

// ============================================================
// Confidence levels for the review selector
// ============================================================

const CONFIDENCE_OPTIONS = [
  { value: 25, label: "25%", description: "Слабо помню", color: "bg-red-500" },
  { value: 50, label: "50%", description: "Средне", color: "bg-amber-500" },
  { value: 75, label: "75%", description: "Хорошо", color: "bg-emerald-400" },
  {
    value: 100,
    label: "100%",
    description: "Отлично!",
    color: "bg-emerald-500",
  },
];

// ============================================================
// Helpers
// ============================================================

function getConfidenceColor(confidence: number): string {
  if (confidence < 30) return "bg-red-500";
  if (confidence < 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function getConfidenceTextColor(confidence: number): string {
  if (confidence < 30) return "text-red-400";
  if (confidence < 70) return "text-amber-400";
  return "text-emerald-400";
}

function formatRelativeDate(isoString: string | null): string {
  if (!isoString) return "Ещё не повторяли";

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  if (diffDays < 7) return `${diffDays} дн. назад`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} нед. назад`;
  }
  const months = Math.floor(diffDays / 30);
  return `${months} мес. назад`;
}

function needsReview(surah: MemorizationSurah): boolean {
  if (!surah.lastReviewedAt) return true;
  const diffMs = Date.now() - new Date(surah.lastReviewedAt).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours >= 12;
}

// ============================================================
// Component
// ============================================================

export default function Memorize() {
  const globalAudio = useAudio();
  const ayahAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [ayahLoading, setAyahLoading] = useState(false);

  // Create a single reusable audio element (no crossOrigin — breaks iOS WKWebView/Telegram)
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.onended = () => {
      setPlayingAyah(null);
      setAyahLoading(false);
    };
    audio.onerror = () => {
      setPlayingAyah(null);
      setAyahLoading(false);
    };
    audio.oncanplay = () => setAyahLoading(false);
    ayahAudioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const playAyahAudio = useCallback((globalAyahNumber: number) => {
    const audio = ayahAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyahNumber}.mp3`;
    setPlayingAyah(globalAyahNumber);
    setAyahLoading(true);
    audio.play().catch(() => {
      setPlayingAyah(null);
      setAyahLoading(false);
    });
  }, []);

  const [list, setList] = useState<MemorizationSurah[]>([]);
  const [search, setSearch] = useState("");
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [confidenceSelector, setConfidenceSelector] = useState<number | null>(
    null,
  );

  // ---- Study mode state ----
  const [studySurah, setStudySurah] = useState<number | null>(null);
  const [studyData, setStudyData] = useState<{
    arabic: Ayah[];
    translation: Ayah[];
  } | null>(null);
  const [studyLoading, setStudyLoading] = useState(false);
  const [studyError, setStudyError] = useState<string | null>(null);
  const [showArabic, setShowArabic] = useState(true);
  const [showTranslit, setShowTranslit] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);

  // Load memorization list
  const reload = useCallback(() => {
    setList(storage.getMemorizationList());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // ---- Sorted list: needs review first, then by confidence ascending ----
  const sortedList = [...list].sort((a, b) => {
    const aNeedsReview = needsReview(a);
    const bNeedsReview = needsReview(b);
    if (aNeedsReview && !bNeedsReview) return -1;
    if (!aNeedsReview && bNeedsReview) return 1;
    // Both need review or both don't — sort by lastReviewedAt ascending (oldest first)
    if (aNeedsReview && bNeedsReview) {
      const aTime = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0;
      const bTime = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0;
      if (aTime !== bTime) return aTime - bTime;
    }
    return a.confidence - b.confidence;
  });

  // ---- Stats ----
  const totalSurahs = list.length;
  const avgConfidence =
    totalSurahs > 0
      ? Math.round(list.reduce((sum, s) => sum + s.confidence, 0) / totalSurahs)
      : 0;
  const totalReviews = list.reduce((sum, s) => sum + s.reviewCount, 0);

  // ---- Added surah numbers set ----
  const addedSet = new Set(list.map((s) => s.surahNumber));

  // ---- Filtered surahs for "Add" section ----
  const searchLower = search.toLowerCase().trim();
  const filteredSurahs = searchLower
    ? Object.entries(SURAH_NAMES)
        .filter(([num, info]) => {
          const n = parseInt(num);
          return (
            num.includes(searchLower) ||
            info.ru.toLowerCase().includes(searchLower) ||
            info.ar.includes(searchLower) ||
            n.toString() === searchLower
          );
        })
        .map(([num]) => parseInt(num))
    : POPULAR_SURAHS;

  // ---- Handlers ----

  const handleAdd = (surahNumber: number) => {
    storage.addMemorizationSurah(surahNumber);
    reload();
  };

  const handleRemove = (surahNumber: number) => {
    storage.removeMemorizationSurah(surahNumber);
    setExpandedCard(null);
    setConfidenceSelector(null);
    reload();
  };

  const handleReview = (surahNumber: number, confidence: number) => {
    storage.reviewMemorizationSurah(surahNumber, confidence);
    setConfidenceSelector(null);
    reload();
  };

  const handlePlay = (surahNumber: number) => {
    const info = SURAH_NAMES[surahNumber];
    if (!info) return;

    if (
      globalAudio.isPlaying &&
      globalAudio.currentSurah?.number === surahNumber
    ) {
      globalAudio.pause();
    } else {
      globalAudio.play(surahNumber, info.ar, info.ru);
    }
  };

  // ---- Study mode handlers ----

  const openStudy = useCallback(async (surahNumber: number) => {
    hapticImpact("medium");
    setStudySurah(surahNumber);
    setStudyLoading(true);
    setStudyError(null);
    setStudyData(null);
    setShowArabic(true);
    setShowTranslit(true);
    setShowTranslation(true);

    try {
      const [arabic, translation] = await Promise.all([
        getSurah(surahNumber),
        getSurahTranslation(surahNumber),
      ]);
      setStudyData({
        arabic: arabic.ayahs,
        translation: translation.ayahs,
      });
    } catch (err) {
      setStudyError(
        err instanceof Error ? err.message : "Ошибка загрузки данных",
      );
    } finally {
      setStudyLoading(false);
    }
  }, []);

  const closeStudy = useCallback(() => {
    setStudySurah(null);
    setStudyData(null);
    setStudyError(null);
    setStudyLoading(false);
  }, []);

  const retryStudy = useCallback(() => {
    if (studySurah) {
      openStudy(studySurah);
    }
  }, [studySurah, openStudy]);

  // ============================================================
  // Render — Study View
  // ============================================================

  if (studySurah !== null) {
    const info = SURAH_NAMES[studySurah];
    const description = SURAH_DESCRIPTIONS[studySurah];

    // Calculate the global ayah number offset for audio URLs
    // (sum of ayahs in all preceding surahs)
    const ayahOffset = Object.entries(SURAH_NAMES)
      .filter(([num]) => parseInt(num) < studySurah)
      .reduce((sum, [, info]) => sum + info.ayahs, 0);

    return (
      <div className="min-h-screen pb-24">
        {/* ---- Study Header ---- */}
        <div className="sticky top-0 z-20 t-bg-el backdrop-blur-xl border-b t-border">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={closeStudy}
              className="flex items-center justify-center w-10 h-10 rounded-full
                         t-bg hover:t-bg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-lg font-semibold truncate">
                {info?.ru || `Сура ${studySurah}`}
              </h1>
              <p className="text-slate-500 text-xs">
                Сура {studySurah} — {info?.ayahs || "?"} аятов
              </p>
            </div>
            <p className="font-['Amiri'] text-amber-200/60 text-lg shrink-0">
              {info?.ar || ""}
            </p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
          {/* ---- Description Card ---- */}
          {description && (
            <div className="bg-violet-500/10 backdrop-blur-sm border border-violet-500/20 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-violet-300 text-xs font-semibold uppercase tracking-wider mb-1.5">
                    О суре
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ---- Play Full Surah ---- */}
          <button
            onClick={() => handlePlay(studySurah)}
            className={`w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl
                        text-sm font-medium transition-all duration-200 border
                        ${
                          globalAudio.isPlaying &&
                          globalAudio.currentSurah?.number === studySurah
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/15 hover:bg-amber-500/20"
                        }`}
          >
            {globalAudio.isPlaying &&
            globalAudio.currentSurah?.number === studySurah ? (
              <>
                <Pause className="w-5 h-5" />
                Пауза
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5" />
                Слушать всю суру
              </>
            )}
          </button>

          {/* ---- Visibility Toggles ---- */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArabic((v) => !v)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full
                          text-xs font-medium transition-all duration-200 border
                          ${
                            showArabic
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/25"
                              : "t-bg text-slate-500 t-border-s"
                          }`}
            >
              {showArabic ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              Арабский
            </button>
            <button
              onClick={() => setShowTranslit((v) => !v)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full
                          text-xs font-medium transition-all duration-200 border
                          ${
                            showTranslit
                              ? "bg-violet-500/15 text-violet-300 border-violet-500/25"
                              : "t-bg text-slate-500 t-border-s"
                          }`}
            >
              {showTranslit ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              Транслит
            </button>
            <button
              onClick={() => setShowTranslation((v) => !v)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full
                          text-xs font-medium transition-all duration-200 border
                          ${
                            showTranslation
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                              : "t-bg text-slate-500 t-border-s"
                          }`}
            >
              {showTranslation ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              Перевод
            </button>
          </div>

          {/* ---- Loading State ---- */}
          {studyLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-slate-400 text-sm">Загрузка аятов...</p>
            </div>
          )}

          {/* ---- Error State ---- */}
          {studyError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
              <p className="text-red-400 text-sm mb-3">{studyError}</p>
              <button
                onClick={retryStudy}
                className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-xl
                           bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors
                           text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Повторить
              </button>
            </div>
          )}

          {/* ---- Ayah Cards ---- */}
          {studyData && (
            <div className="space-y-3">
              {studyData.arabic.map((ayah, idx) => {
                const globalAyahNumber = ayahOffset + ayah.numberInSurah;
                const translitText = studySurah
                  ? getTransliteration(studySurah, ayah.numberInSurah)
                  : null;
                const translationAyah = studyData.translation[idx];
                const isAyahPlaying = playingAyah === globalAyahNumber;
                const isAyahLoading =
                  ayahLoading && playingAyah === globalAyahNumber;

                return (
                  <div
                    key={ayah.numberInSurah}
                    className="t-bg backdrop-blur-sm border t-border-s rounded-2xl p-4"
                  >
                    {/* Ayah number + play button row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                        <span className="text-emerald-400 text-xs font-bold">
                          {ayah.numberInSurah}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          hapticImpact("light");
                          if (isAyahPlaying) {
                            ayahAudioRef.current?.pause();
                            setPlayingAyah(null);
                            setAyahLoading(false);
                          } else {
                            playAyahAudio(globalAyahNumber);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors
                                   ${isAyahPlaying ? "bg-amber-500/25 ring-1 ring-amber-500/40" : isAyahLoading ? "bg-amber-500/15 animate-pulse" : "bg-amber-500/10 hover:bg-amber-500/20"}`}
                      >
                        {isAyahLoading ? (
                          <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                        ) : isAyahPlaying ? (
                          <Pause className="w-3 h-3 text-amber-400" />
                        ) : (
                          <Play className="w-3 h-3 text-amber-400" />
                        )}
                        <span className="text-amber-400 text-[10px] font-medium">
                          {isAyahLoading ? "..." : "Аят"}
                        </span>
                      </button>
                    </div>

                    {/* Arabic text */}
                    {showArabic && (
                      <p
                        className="font-['Amiri'] text-amber-100 text-xl leading-[2.2] text-right mb-3"
                        dir="rtl"
                      >
                        {ayah.text}
                      </p>
                    )}

                    {/* Transliteration (Cyrillic) */}
                    {showTranslit && translitText && (
                      <p className="text-violet-300/70 text-sm italic leading-relaxed mb-2">
                        {translitText}
                      </p>
                    )}

                    {/* Russian translation */}
                    {showTranslation && translationAyah && (
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {translationAyah.text}
                      </p>
                    )}

                    {/* Divider if nothing shown */}
                    {!showArabic && !showTranslit && !showTranslation && (
                      <p className="text-slate-600 text-xs text-center italic">
                        Все слои скрыты — включите видимость выше
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    );
  }

  // ============================================================
  // Render — Main List
  // ============================================================

  return (
    <div className="min-h-screen pb-24">
      {/* ---- Header ---- */}
      <div className="sticky top-0 z-20 t-bg-el backdrop-blur-xl border-b t-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center w-10 h-10 rounded-full
                       t-bg hover:t-bg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-white text-lg font-semibold">Заучивание сур</h1>
            <p className="text-slate-500 text-xs">Хифз — учи Коран наизусть</p>
          </div>
          <BookOpen className="w-5 h-5 text-emerald-400/60" />
        </div>
      </div>

      {/* ---- Stats Bar ---- */}
      {totalSurahs > 0 && (
        <div className="max-w-lg mx-auto px-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 t-bg backdrop-blur-sm border t-border-s rounded-xl px-3 py-2.5 text-center">
              <p className="text-emerald-400 text-lg font-bold">
                {totalSurahs}
              </p>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider">
                Сур
              </p>
            </div>
            <div className="flex-1 t-bg backdrop-blur-sm border t-border-s rounded-xl px-3 py-2.5 text-center">
              <p
                className={`text-lg font-bold ${getConfidenceTextColor(avgConfidence)}`}
              >
                {avgConfidence}%
              </p>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider">
                Уверенность
              </p>
            </div>
            <div className="flex-1 t-bg backdrop-blur-sm border t-border-s rounded-xl px-3 py-2.5 text-center">
              <p className="text-amber-400 text-lg font-bold">{totalReviews}</p>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider">
                Повторений
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---- My Surahs Section ---- */}
      <div className="max-w-lg mx-auto px-4 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-amber-400" />
          <h2 className="text-white text-sm font-semibold">Мои суры</h2>
          {totalSurahs > 0 && (
            <span className="text-slate-500 text-xs ml-auto">
              {sortedList.filter(needsReview).length} к повторению
            </span>
          )}
        </div>

        {/* Empty state */}
        {totalSurahs === 0 && (
          <div className="t-bg backdrop-blur-sm border t-border-s rounded-2xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-white font-medium mb-1">
              Начни учить суры Корана!
            </p>
            <p className="text-slate-400 text-sm">
              Добавь первую суру ниже и начни заучивание с помощью аудио и
              повторений
            </p>
          </div>
        )}

        {/* Surah cards */}
        <div className="space-y-3">
          {sortedList.map((surah) => {
            const info = SURAH_NAMES[surah.surahNumber];
            if (!info) return null;

            const isExpanded = expandedCard === surah.surahNumber;
            const showConfidence = confidenceSelector === surah.surahNumber;
            const isPlayingThis =
              globalAudio.isPlaying &&
              globalAudio.currentSurah?.number === surah.surahNumber;
            const needs = needsReview(surah);

            return (
              <div
                key={surah.surahNumber}
                className={`t-bg backdrop-blur-sm border rounded-2xl overflow-hidden transition-all duration-200
                  ${needs ? "border-amber-500/20" : "t-border-s"}
                  ${isExpanded ? "ring-1 ring-emerald-500/20" : ""}`}
              >
                {/* Main card content */}
                <div
                  className="px-4 py-3 cursor-pointer"
                  onClick={() =>
                    setExpandedCard(isExpanded ? null : surah.surahNumber)
                  }
                >
                  <div className="flex items-start gap-3">
                    {/* Surah number badge */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold
                        ${needs ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}
                    >
                      {surah.surahNumber}
                    </div>

                    {/* Names and info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate">
                          {info.ru}
                        </span>
                        <span className="text-slate-600 text-xs">
                          {info.ayahs} аятов
                        </span>
                      </div>
                      <p className="font-['Amiri'] text-right text-amber-200/60 text-base mt-0.5 leading-relaxed">
                        {info.ar}
                      </p>

                      {/* Confidence bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 t-bg rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getConfidenceColor(surah.confidence)}`}
                            style={{ width: `${surah.confidence}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-medium tabular-nums ${getConfidenceTextColor(surah.confidence)}`}
                        >
                          {surah.confidence}%
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                          <RotateCcw className="w-3 h-3" />
                          {surah.reviewCount} повтор.
                        </span>
                        <span className="text-slate-600 text-[11px]">
                          {formatRelativeDate(surah.lastReviewedAt)}
                        </span>
                        {needs && (
                          <span className="text-amber-400 text-[10px] font-medium bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                            Повторить
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(surah.surahNumber);
                      }}
                      className="w-7 h-7 rounded-full flex items-center justify-center
                                 hover:bg-red-500/10 transition-colors shrink-0 mt-0.5"
                    >
                      <X className="w-3.5 h-3.5 text-slate-600 hover:text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Expanded actions */}
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 border-t t-border">
                    <div className="flex items-center gap-2">
                      {/* Listen button */}
                      <button
                        onClick={() => handlePlay(surah.surahNumber)}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                                    text-sm font-medium transition-all duration-200
                                    ${
                                      isPlayingThis
                                        ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
                                        : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                    }`}
                      >
                        {isPlayingThis ? (
                          <>
                            <Pause className="w-4 h-4" />
                            Пауза
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4" />
                            Слушать
                          </>
                        )}
                      </button>

                      {/* Review button */}
                      <button
                        onClick={() =>
                          setConfidenceSelector(
                            showConfidence ? null : surah.surahNumber,
                          )
                        }
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                                    text-sm font-medium transition-all duration-200
                                    ${
                                      showConfidence
                                        ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
                                        : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                    }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Повторил
                      </button>

                      {/* Study button */}
                      <button
                        onClick={() => openStudy(surah.surahNumber)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                                   text-sm font-medium transition-all duration-200
                                   bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                      >
                        <BookOpen className="w-4 h-4" />
                        Учить
                      </button>
                    </div>

                    {/* Confidence selector (inline) */}
                    {showConfidence && (
                      <div className="mt-3 t-bg rounded-xl p-3">
                        <p className="text-slate-400 text-xs mb-2.5 text-center">
                          Как хорошо помнишь? (+{POINTS.MEMORIZE_REPEAT} баллов)
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {CONFIDENCE_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() =>
                                handleReview(surah.surahNumber, opt.value)
                              }
                              className="flex flex-col items-center gap-1 p-2 rounded-lg
                                         t-bg hover:t-bg border t-border
                                         hover:t-border-s transition-all duration-150"
                            >
                              <div
                                className={`w-6 h-6 rounded-full ${opt.color} flex items-center justify-center`}
                              >
                                <span className="text-white text-[10px] font-bold">
                                  {opt.label}
                                </span>
                              </div>
                              <span className="text-slate-400 text-[10px] leading-tight text-center">
                                {opt.description}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Points earned */}
                    {surah.pointsEarned > 0 && (
                      <div className="mt-2 flex items-center justify-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500/50" />
                        <span className="text-emerald-500/50 text-[10px]">
                          +{surah.pointsEarned} баллов заработано
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Prayer Surahs Section ---- */}
      <div className="max-w-lg mx-auto px-4 mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Moon className="w-4 h-4 text-amber-400" />
          <h2 className="text-white text-sm font-semibold">Для намаза</h2>
          <span className="text-slate-500 text-xs ml-auto">обязательные</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {PRAYER_SURAHS.map((num) => {
            const info = SURAH_NAMES[num];
            if (!info) return null;
            const isAdded = addedSet.has(num);

            return (
              <button
                key={`prayer-${num}`}
                onClick={() => !isAdded && handleAdd(num)}
                disabled={isAdded}
                className={`relative flex items-center gap-2.5 p-3 rounded-xl text-left
                            transition-all duration-200 border
                            ${
                              isAdded
                                ? "bg-emerald-500/5 border-emerald-500/15 opacity-60 cursor-default"
                                : "bg-amber-500/5 border-amber-500/15 hover:bg-amber-500/10 hover:border-amber-500/25 active:scale-[0.98]"
                            }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold
                    ${isAdded ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}
                >
                  {isAdded ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    num
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium truncate ${isAdded ? "text-emerald-400/70" : "text-white"}`}
                  >
                    {info.ru}
                  </p>
                  <p className="text-slate-600 text-[10px]">
                    {info.ayahs} аятов
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Add Surah Section ---- */}
      <div className="max-w-lg mx-auto px-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-emerald-400" />
          <h2 className="text-white text-sm font-semibold">Все суры</h2>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или номеру..."
            className="w-full t-bg border t-border-s rounded-xl pl-10 pr-9 py-2.5
                       text-white text-sm placeholder:text-slate-600 outline-none
                       focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-slate-500 hover:text-slate-300" />
            </button>
          )}
        </div>

        {/* Surah grid */}
        <div className="grid grid-cols-2 gap-2">
          {filteredSurahs.map((num) => {
            const info = SURAH_NAMES[num];
            if (!info) return null;

            const isAdded = addedSet.has(num);

            return (
              <button
                key={num}
                onClick={() => !isAdded && handleAdd(num)}
                disabled={isAdded}
                className={`relative flex items-center gap-2.5 p-3 rounded-xl text-left
                            transition-all duration-200 border
                            ${
                              isAdded
                                ? "bg-emerald-500/5 border-emerald-500/15 opacity-60 cursor-default"
                                : "t-bg t-border-s hover:t-bg hover:border-white/20 active:scale-[0.98]"
                            }`}
              >
                {/* Number */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold
                    ${isAdded ? "bg-emerald-500/15 text-emerald-400" : "t-bg text-slate-400"}`}
                >
                  {isAdded ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    num
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium truncate ${isAdded ? "text-emerald-400/70" : "text-white"}`}
                  >
                    {info.ru}
                  </p>
                  <p className="text-slate-600 text-[10px]">
                    {info.ayahs} аятов
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* No results */}
        {filteredSurahs.length === 0 && search && (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">Ничего не найдено</p>
            <p className="text-slate-600 text-xs mt-1">
              Попробуйте другой запрос
            </p>
          </div>
        )}
      </div>

      {/* Bottom spacer for nav */}
      <div className="h-8" />
    </div>
  );
}
