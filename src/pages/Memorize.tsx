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
  Repeat,
  Gauge,
  Smile,
  Meh,
  Frown,
  Zap,
  ScrollText,
  ChevronDown,
} from "lucide-react";
import { storage, POINTS } from "../lib/storage";
import { useAudio } from "../components/AudioPlayer";
import { getSurah, getSurahTranslation, hapticImpact } from "../lib/api";
import type { Ayah } from "../lib/api";
import type { MemorizationSurah } from "../lib/storage";
import { getTransliteration } from "../data/quran-transliteration";
import { getTafsir, TAFSIR_SOURCE } from "../data/tafsir";
import { SURAH_TRANSLIT, getSurahTranslit } from "../data/surah-translit";

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

// Essential surahs for prayer (namaz) — sorted easiest → harder by ayah count.
const PRAYER_SURAHS = [
  108, // Аль-Каусар — 3 аята
  110, // Ан-Наср — 3 аята
  103, // Аль-Аср — 3 аята
  112, // Аль-Ихлас — 4 аята
  106, // Курайш — 4 аята
  113, // Аль-Фалак — 5 аятов
  111, // Аль-Масад — 5 аятов
  105, // Аль-Филь — 5 аятов
  114, // Ан-Нас — 6 аятов
  109, // Аль-Кафирун — 6 аятов
  1,   // Аль-Фатиха — 7 аятов (обязательна в каждом ракаате)
  107, // Аль-Маун — 7 аятов
];

// Group prayer surahs by ayah count for visual difficulty progression
const PRAYER_SURAH_GROUPS = (() => {
  const map = new Map<number, number[]>();
  for (const num of PRAYER_SURAHS) {
    const ayahs = SURAH_NAMES[num]?.ayahs;
    if (!ayahs) continue;
    if (!map.has(ayahs)) map.set(ayahs, []);
    map.get(ayahs)!.push(num);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([size, surahs]) => ({ size, surahs }));
})();

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

// Russian plural for "аят" — handles 1/2-4/5+ cases
function ayahWord(n: number): string {
  const last = n % 100;
  if (last >= 11 && last <= 14) return "аятов";
  const tail = n % 10;
  if (tail === 1) return "аят";
  if (tail >= 2 && tail <= 4) return "аята";
  return "аятов";
}

// Returns a curated description if available, otherwise a clean fallback
function getSurahDescription(num: number): string {
  if (SURAH_DESCRIPTIONS[num]) return SURAH_DESCRIPTIONS[num];
  const info = SURAH_NAMES[num];
  if (!info) return "";
  return `Сура «${info.ru}» (${info.ar}) — ${num}-я сура Корана, содержит ${info.ayahs} ${ayahWord(info.ayahs)}. Изучай аят за аятом: слушай чтение, повторяй вслух и сверяйся с переводом.`;
}

// ============================================================
// Confidence levels for the review selector
// ============================================================

// Anki-style review options: "how did it feel?" instead of "what % do you know"
// — easier mental model, drives the adaptive interval better.
type ConfidenceOption = {
  value: number;
  label: string;
  hint: string;
  color: string;
  bg: string;
  ring: string;
  icon: typeof Smile;
};

const CONFIDENCE_OPTIONS: ConfidenceOption[] = [
  {
    value: 25,
    label: "Забыл",
    hint: "Снова с начала",
    color: "text-red-300",
    bg: "bg-red-500/15",
    ring: "ring-red-500/30",
    icon: Frown,
  },
  {
    value: 50,
    label: "Тяжело",
    hint: "Вспомнил с трудом",
    color: "text-amber-300",
    bg: "bg-amber-500/15",
    ring: "ring-amber-500/30",
    icon: Meh,
  },
  {
    value: 75,
    label: "Хорошо",
    hint: "Уверенно знаю",
    color: "text-emerald-300",
    bg: "bg-emerald-500/15",
    ring: "ring-emerald-500/30",
    icon: Smile,
  },
  {
    value: 100,
    label: "Легко",
    hint: "Знаю наизусть",
    color: "text-emerald-200",
    bg: "bg-emerald-500/25",
    ring: "ring-emerald-400/40",
    icon: Zap,
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

// Adaptive review interval: the better you know it, the longer until next review.
// Loosely inspired by SM-2/Anki — confidence drives the gap.
function getReviewIntervalHours(confidence: number): number {
  if (confidence < 30) return 4;     // shaky → review same day
  if (confidence < 50) return 12;    // learning → twice a day
  if (confidence < 75) return 24;    // decent → daily
  if (confidence < 100) return 72;   // strong → every 3 days
  return 168;                         // mastered → weekly refresh
}

function needsReview(surah: MemorizationSurah): boolean {
  if (!surah.lastReviewedAt) return true;
  const diffMs = Date.now() - new Date(surah.lastReviewedAt).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours >= getReviewIntervalHours(surah.confidence);
}

// "Через 4 ч" / "Завтра" / "Через 3 дня" — human-readable next review hint
function formatNextReview(surah: MemorizationSurah): string {
  if (!surah.lastReviewedAt) return "Готова к повторению";
  const intervalH = getReviewIntervalHours(surah.confidence);
  const elapsed =
    (Date.now() - new Date(surah.lastReviewedAt).getTime()) / 3600000;
  const remaining = intervalH - elapsed;
  if (remaining <= 0) return "Пора повторить";
  if (remaining < 1) return `Через ${Math.round(remaining * 60)} мин`;
  if (remaining < 24) return `Через ${Math.round(remaining)} ч`;
  const days = Math.round(remaining / 24);
  return days === 1 ? "Через 1 день" : `Через ${days} дн.`;
}

// ============================================================
// Component
// ============================================================

export default function Memorize() {
  const globalAudio = useAudio();
  const ayahAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [ayahLoading, setAyahLoading] = useState(false);
  // Loop settings for memorization audio: 1 = once, 3/5 = N replays, 0 = infinite
  const [loopCount, setLoopCount] = useState<number>(1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const loopRemainingRef = useRef<number>(0);
  const currentLoopAyahRef = useRef<number | null>(null);
  // Sequential playback (play whole surah ayah-by-ayah, highlighting the current one)
  const sequentialModeRef = useRef<boolean>(false);
  const currentAyahIndexRef = useRef<number>(0);
  const totalAyahsRef = useRef<number>(0);
  const ayahOffsetRef = useRef<number>(0);
  const loopCountRef = useRef<number>(1);
  const playbackRateRefForAudio = useRef<number>(1);
  // Loop the whole surah N times (1, 3, 5, or 0 = infinite)
  const [surahLoopCount, setSurahLoopCount] = useState<number>(1);
  const surahLoopCountRef = useRef<number>(1);
  const surahLoopRemainingRef = useRef<number>(0);
  // Mirror loopCount + playbackSpeed + surahLoopCount into refs so onended reads fresh values
  useEffect(() => {
    loopCountRef.current = loopCount;
  }, [loopCount]);
  useEffect(() => {
    playbackRateRefForAudio.current = playbackSpeed;
  }, [playbackSpeed]);
  useEffect(() => {
    surahLoopCountRef.current = surahLoopCount;
  }, [surahLoopCount]);

  // Auto-scroll to the currently playing ayah card during sequential playback
  useEffect(() => {
    if (playingAyah === null) return;
    const el = document.querySelector(
      `[data-ayah="${playingAyah}"]`,
    ) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [playingAyah]);

  // Create a single reusable audio element (no crossOrigin — breaks iOS WKWebView/Telegram)
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.onended = () => {
      // Loop: 0 = infinite, >0 = replays left
      const remaining = loopRemainingRef.current;
      if (remaining === 0 || remaining > 1) {
        if (remaining > 1) loopRemainingRef.current = remaining - 1;
        audio.currentTime = 0;
        audio.play().catch(() => {
          setPlayingAyah(null);
          setAyahLoading(false);
        });
        return;
      }

      // Sequential mode — auto-advance to the next ayah of the surah
      if (sequentialModeRef.current) {
        const next = currentAyahIndexRef.current + 1;
        if (next <= totalAyahsRef.current) {
          currentAyahIndexRef.current = next;
          const nextGlobal = ayahOffsetRef.current + next;
          // Reset per-ayah loop counter based on current user setting
          loopRemainingRef.current = loopCountRef.current;
          audio.src = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${nextGlobal}.mp3`;
          audio.playbackRate = playbackRateRefForAudio.current;
          setPlayingAyah(nextGlobal);
          setAyahLoading(true);
          audio.play().catch(() => {
            sequentialModeRef.current = false;
            setPlayingAyah(null);
            setAyahLoading(false);
          });
          return;
        }

        // Whole surah finished — check if we should loop the surah
        const surahRemaining = surahLoopRemainingRef.current;
        if (surahRemaining === 0 || surahRemaining > 1) {
          if (surahRemaining > 1)
            surahLoopRemainingRef.current = surahRemaining - 1;
          // Restart from ayah 1 of the same surah
          currentAyahIndexRef.current = 1;
          loopRemainingRef.current = loopCountRef.current;
          const firstGlobal = ayahOffsetRef.current + 1;
          audio.src = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${firstGlobal}.mp3`;
          audio.playbackRate = playbackRateRefForAudio.current;
          setPlayingAyah(firstGlobal);
          setAyahLoading(true);
          audio.play().catch(() => {
            sequentialModeRef.current = false;
            setPlayingAyah(null);
            setAyahLoading(false);
          });
          return;
        }
        sequentialModeRef.current = false;
      }

      loopRemainingRef.current = 0;
      currentLoopAyahRef.current = null;
      setPlayingAyah(null);
      setAyahLoading(false);
    };
    audio.onerror = () => {
      loopRemainingRef.current = 0;
      currentLoopAyahRef.current = null;
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

  // Sync playbackRate to both audio engines:
  // - local ayah audio element (per-ayah listening)
  // - global surah player (whole-surah playback)
  const setGlobalPlaybackRate = globalAudio.setPlaybackRate;
  useEffect(() => {
    if (ayahAudioRef.current) {
      ayahAudioRef.current.playbackRate = playbackSpeed;
    }
    setGlobalPlaybackRate(playbackSpeed);
  }, [playbackSpeed, setGlobalPlaybackRate]);

  const playAyahAudio = useCallback(
    (globalAyahNumber: number, sequential: boolean = false) => {
      const audio = ayahAudioRef.current;
      if (!audio) return;
      audio.pause();
      audio.src = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyahNumber}.mp3`;
      audio.playbackRate = playbackSpeed;
      // Reset loop counter: 0 (infinite) stays 0, otherwise N total plays
      loopRemainingRef.current = loopCount;
      currentLoopAyahRef.current = globalAyahNumber;
      sequentialModeRef.current = sequential;
      setPlayingAyah(globalAyahNumber);
      setAyahLoading(true);
      audio.play().catch(() => {
        loopRemainingRef.current = 0;
        currentLoopAyahRef.current = null;
        sequentialModeRef.current = false;
        setPlayingAyah(null);
        setAyahLoading(false);
      });
    },
    [loopCount, playbackSpeed],
  );

  // Play whole surah ayah-by-ayah so each card highlights as it's read
  const playSurahSequentially = useCallback(
    (totalAyahs: number, ayahOffset: number) => {
      hapticImpact("medium");
      currentAyahIndexRef.current = 1;
      totalAyahsRef.current = totalAyahs;
      ayahOffsetRef.current = ayahOffset;
      surahLoopRemainingRef.current = surahLoopCountRef.current;
      playAyahAudio(ayahOffset + 1, true);
    },
    [playAyahAudio],
  );

  const stopSurahSequentially = useCallback(() => {
    sequentialModeRef.current = false;
    loopRemainingRef.current = 0;
    surahLoopRemainingRef.current = 0;
    if (ayahAudioRef.current) {
      ayahAudioRef.current.pause();
    }
    setPlayingAyah(null);
    setAyahLoading(false);
  }, []);

  const [list, setList] = useState<MemorizationSurah[]>([]);
  const [search, setSearch] = useState("");
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [confidenceSelector, setConfidenceSelector] = useState<number | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  // Onboarding: show "How it works" expanded once, then remember dismissal
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return !localStorage.getItem("iman_memorize_onboarded");
  });
  const dismissHowItWorks = () => {
    setShowHowItWorks(false);
    try {
      localStorage.setItem("iman_memorize_onboarded", "1");
    } catch {
      // ignore quota errors
    }
  };

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
  const [showTafsir, setShowTafsir] = useState(false);
  // Per-ayah collapse state for long tafsirs (key: globalAyahNumber)
  const [expandedTafsirs, setExpandedTafsirs] = useState<Set<number>>(
    () => new Set(),
  );

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
  // Always sorted by ayah count ascending (easiest → hardest).
  // Search filters but keeps the same order.
  const searchLower = search.toLowerCase().trim();
  const allSurahsSortedByAyahs = Object.entries(SURAH_NAMES)
    .map(([num, info]) => ({ num: parseInt(num), info }))
    .sort((a, b) => a.info.ayahs - b.info.ayahs);
  const filteredSurahs = (
    searchLower
      ? allSurahsSortedByAyahs.filter(({ num, info }) => {
          const translit = (SURAH_TRANSLIT[num] || "").toLowerCase();
          return (
            num.toString().includes(searchLower) ||
            info.ru.toLowerCase().includes(searchLower) ||
            info.ar.includes(searchLower) ||
            translit.includes(searchLower)
          );
        })
      : allSurahsSortedByAyahs
  ).map(({ num }) => num);

  // ---- Handlers ----

  const handleAdd = (surahNumber: number) => {
    storage.addMemorizationSurah(surahNumber);
    reload();
  };

  const handleAddAllPrayer = () => {
    hapticImpact("medium");
    PRAYER_SURAHS.forEach((num) => storage.addMemorizationSurah(num));
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
    setShowTafsir(false);
    setExpandedTafsirs(new Set());

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
    const description = getSurahDescription(studySurah);

    // Calculate the global ayah number offset for audio URLs
    // (sum of ayahs in all preceding surahs)
    const ayahOffset = Object.entries(SURAH_NAMES)
      .filter(([num]) => parseInt(num) < studySurah)
      .reduce((sum, [, info]) => sum + info.ayahs, 0);

    return (
      <div className="min-h-screen pb-24">
        {/* ---- Sticky compact header (visible on scroll) ---- */}
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
              <h1 className="text-white text-base font-semibold truncate">
                {getSurahTranslit(studySurah)}
              </h1>
              <p className="text-slate-500 text-[11px]">
                {info?.ru} • {info?.ayahs ?? "?"}{" "}
                {info ? ayahWord(info.ayahs) : "аятов"}
              </p>
            </div>
            <p className="font-['Amiri'] text-amber-200/70 text-xl shrink-0" dir="rtl">
              {info?.ar || ""}
            </p>
          </div>
        </div>

        {/* ---- Hero block: decorative surah name ---- */}
        <div className="max-w-lg mx-auto px-4 pt-6 pb-2 text-center">
          <p
            className="font-['Amiri'] text-amber-200 text-5xl sm:text-6xl leading-tight mb-2"
            dir="rtl"
          >
            {info?.ar || ""}
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-500/40" />
            <span className="text-amber-400/60 text-xs">✦</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-500/40" />
          </div>
          <h1 className="text-white text-2xl font-semibold mt-3">
            {getSurahTranslit(studySurah)}
          </h1>
          <p className="text-amber-300/60 text-sm mt-0.5 italic">
            {info?.ru}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Сура {studySurah} • {info?.ayahs ?? "?"}{" "}
            {info ? ayahWord(info.ayahs) : "аятов"}
          </p>
          {/* Bismillah — skip Al-Fatiha (1) where it's already aya 1, and At-Tawbah (9) which has no Bismillah */}
          {studySurah !== 1 && studySurah !== 9 && (
            <p
              className="font-['Amiri'] text-amber-300/60 text-lg mt-4"
              dir="rtl"
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </p>
          )}
        </div>

        <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
          {/* ---- Description Card ---- */}
          {description && (
            <div className="bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent backdrop-blur-sm border border-violet-500/20 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/20 ring-1 ring-violet-400/20 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4 text-violet-300" />
                </div>
                <div>
                  <p className="text-violet-300 text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5">
                    О суре
                  </p>
                  <p className="text-slate-200 text-[13px] leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ---- Play Full Surah (sequentially, ayah-by-ayah with highlight) ---- */}
          {(() => {
            const isPlayingSurah =
              playingAyah !== null && sequentialModeRef.current;
            const currentAyah = isPlayingSurah
              ? Math.max(1, (playingAyah || 0) - ayahOffset)
              : 0;
            const progressPct = isPlayingSurah && info
              ? (currentAyah / info.ayahs) * 100
              : 0;
            return (
              <button
                onClick={() => {
                  if (isPlayingSurah) {
                    stopSurahSequentially();
                  } else if (info) {
                    playSurahSequentially(info.ayahs, ayahOffset);
                  }
                }}
                className={`relative w-full overflow-hidden rounded-2xl
                            text-white font-semibold transition-all duration-300
                            active:scale-[0.99] shadow-lg
                            ${
                              isPlayingSurah
                                ? "bg-gradient-to-r from-amber-600 to-orange-600 shadow-amber-500/30"
                                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/20 hover:shadow-amber-500/40"
                            }`}
              >
                {/* Progress bar overlay when playing */}
                {isPlayingSurah && (
                  <div
                    className="absolute inset-y-0 left-0 bg-white/15 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-center gap-2.5 px-4 py-3.5 text-sm">
                  {isPlayingSurah ? (
                    <>
                      <Pause className="w-5 h-5" />
                      <span>
                        Аят {currentAyah}/{info?.ayahs}
                        {surahLoopCount !== 1 && (
                          <span className="opacity-80 ml-1">
                            •{" "}
                            {surahLoopCount === 0
                              ? "∞"
                              : `повтор ${surahLoopCount - surahLoopRemainingRef.current + 1}/${surahLoopCount}`}
                          </span>
                        )}
                      </span>
                      <span className="ml-1 inline-flex items-end gap-0.5 h-3">
                        <span className="w-0.5 bg-white/80 animate-pulse h-2" />
                        <span
                          className="w-0.5 bg-white/80 animate-pulse h-3"
                          style={{ animationDelay: "120ms" }}
                        />
                        <span
                          className="w-0.5 bg-white/80 animate-pulse h-1.5"
                          style={{ animationDelay: "240ms" }}
                        />
                      </span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-5 h-5" />
                      Слушать аят-за-аятом
                      {surahLoopCount !== 1 && (
                        <span className="text-white/80 text-xs ml-1">
                          ({surahLoopCount === 0 ? "∞" : `${surahLoopCount}×`})
                        </span>
                      )}
                    </>
                  )}
                </div>
              </button>
            );
          })()}

          {/* ---- Audio Controls (Loop ayah + Loop surah + Speed) ---- */}
          <div className="t-bg backdrop-blur-sm border t-border-s rounded-xl p-3 space-y-2.5">
            {/* Loop ayah */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Repeat className="w-3 h-3 text-emerald-400" />
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                  Повтор аята
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { value: 1, label: "1×" },
                  { value: 3, label: "3×" },
                  { value: 5, label: "5×" },
                  { value: 0, label: "∞" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setLoopCount(opt.value);
                      hapticImpact("light");
                    }}
                    className={`py-1.5 rounded-md text-[11px] font-bold transition-all
                                ${
                                  loopCount === opt.value
                                    ? "bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/50"
                                    : "bg-white/5 text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loop surah */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Repeat className="w-3 h-3 text-orange-400" />
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                  Повтор всей суры
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { value: 1, label: "1×" },
                  { value: 3, label: "3×" },
                  { value: 5, label: "5×" },
                  { value: 0, label: "∞" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSurahLoopCount(opt.value);
                      hapticImpact("light");
                    }}
                    className={`py-1.5 rounded-md text-[11px] font-bold transition-all
                                ${
                                  surahLoopCount === opt.value
                                    ? "bg-orange-500/25 text-orange-200 ring-1 ring-orange-400/50"
                                    : "bg-white/5 text-slate-400 hover:text-orange-300 hover:bg-orange-500/10"
                                }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Gauge className="w-3 h-3 text-violet-400" />
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                  Скорость
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 0.75, label: "0.75×" },
                  { value: 1, label: "1×" },
                  { value: 1.25, label: "1.25×" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setPlaybackSpeed(opt.value);
                      hapticImpact("light");
                    }}
                    className={`py-1.5 rounded-md text-[11px] font-bold transition-all
                                ${
                                  playbackSpeed === opt.value
                                    ? "bg-violet-500/25 text-violet-200 ring-1 ring-violet-400/50"
                                    : "bg-white/5 text-slate-400 hover:text-violet-300 hover:bg-violet-500/10"
                                }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ---- Visibility Toggles (2×2 on mobile, 4×1 on desktop) ---- */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setShowArabic((v) => !v)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-full
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
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-full
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
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-full
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
            <button
              onClick={() => setShowTafsir((v) => !v)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-full
                          text-xs font-medium transition-all duration-200 border
                          ${
                            showTafsir
                              ? "bg-orange-500/15 text-orange-300 border-orange-500/25"
                              : "t-bg text-slate-500 t-border-s"
                          }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              Тафсир
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
                    data-ayah={globalAyahNumber}
                    className={`relative backdrop-blur-sm border rounded-2xl p-5 transition-all duration-500
                                ${
                                  isAyahPlaying
                                    ? "bg-gradient-to-br from-emerald-500/15 via-emerald-500/8 to-amber-500/10 border-emerald-400/50 ring-2 ring-emerald-400/40 shadow-2xl shadow-emerald-500/20 scale-[1.02]"
                                    : "t-bg t-border-s hover:border-white/10"
                                }`}
                  >
                    {/* Glow accent for active ayah */}
                    {isAyahPlaying && (
                      <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-emerald-400/0 via-emerald-400/20 to-emerald-400/0 animate-pulse pointer-events-none" />
                    )}

                    {/* Ayah medallion + play button row */}
                    <div className="relative flex items-center justify-between mb-3">
                      <div
                        className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all
                                    ${
                                      isAyahPlaying
                                        ? "bg-emerald-500/30 ring-2 ring-emerald-400/60"
                                        : "bg-emerald-500/15 ring-1 ring-emerald-500/20"
                                    }`}
                      >
                        {/* Decorative ring */}
                        <div className="absolute inset-0 rounded-full border border-emerald-400/20" />
                        <span
                          className={`text-xs font-bold tabular-nums ${isAyahPlaying ? "text-emerald-200" : "text-emerald-400"}`}
                        >
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all
                                   ${
                                     isAyahPlaying
                                       ? "bg-amber-500/25 ring-1 ring-amber-400/50 shadow-md shadow-amber-500/20"
                                       : isAyahLoading
                                         ? "bg-amber-500/15 animate-pulse"
                                         : "bg-amber-500/10 hover:bg-amber-500/20 hover:scale-105"
                                   }`}
                      >
                        {isAyahLoading ? (
                          <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                        ) : isAyahPlaying ? (
                          <Pause className="w-3 h-3 text-amber-300" />
                        ) : (
                          <Play className="w-3 h-3 text-amber-400 ml-0.5" />
                        )}
                        <span
                          className={`text-[10px] font-semibold ${isAyahPlaying ? "text-amber-200" : "text-amber-400"}`}
                        >
                          {isAyahLoading
                            ? "..."
                            : isAyahPlaying && loopCount !== 1
                              ? loopCount === 0
                                ? "∞"
                                : `×${loopCount}`
                              : "Аят"}
                        </span>
                      </button>
                    </div>

                    {/* Arabic text — large, decorative */}
                    {showArabic && (
                      <p
                        className={`font-['Amiri'] text-right mb-3 transition-all duration-300
                                    ${
                                      isAyahPlaying
                                        ? "text-amber-50 text-[1.65rem] leading-[2.3]"
                                        : "text-amber-100 text-[1.4rem] leading-[2.2]"
                                    }`}
                        dir="rtl"
                      >
                        {ayah.text}
                      </p>
                    )}

                    {/* Subtle divider between arabic and latin layers */}
                    {showArabic && (showTranslit || showTranslation) && (
                      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent mb-3" />
                    )}

                    {/* Transliteration (Cyrillic) */}
                    {showTranslit && translitText && (
                      <p className="text-violet-300/75 text-[13px] italic leading-relaxed mb-2.5">
                        {translitText}
                      </p>
                    )}

                    {/* Russian translation */}
                    {showTranslation && translationAyah && (
                      <p className="text-slate-200 text-[14px] leading-relaxed">
                        {translationAyah.text}
                      </p>
                    )}

                    {/* Tafsir (Saadi) — only when toggle on and entry exists */}
                    {showTafsir &&
                      studySurah !== null &&
                      (() => {
                        const tafsir = getTafsir(studySurah, ayah.numberInSurah);
                        if (!tafsir) return null;
                        const isLong = tafsir.text.length > 320;
                        const isExpanded = expandedTafsirs.has(globalAyahNumber);
                        const displayText =
                          isLong && !isExpanded
                            ? tafsir.text.slice(0, 320).trimEnd() + "…"
                            : tafsir.text;
                        return (
                          <div className="mt-3 bg-orange-500/[0.06] border border-orange-500/15 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <ScrollText className="w-3.5 h-3.5 text-orange-400" />
                              <span className="text-orange-300/80 text-[10px] font-semibold uppercase tracking-wider">
                                {TAFSIR_SOURCE}
                              </span>
                            </div>
                            <p className="text-orange-100/80 text-[13px] leading-relaxed whitespace-pre-wrap">
                              {displayText}
                            </p>
                            {isLong && (
                              <button
                                onClick={() => {
                                  hapticImpact("light");
                                  setExpandedTafsirs((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(globalAyahNumber)) {
                                      next.delete(globalAyahNumber);
                                    } else {
                                      next.add(globalAyahNumber);
                                    }
                                    return next;
                                  });
                                }}
                                className="mt-2 flex items-center gap-1 text-orange-400 hover:text-orange-300
                                           text-[11px] font-medium transition-colors"
                              >
                                <ChevronDown
                                  className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                />
                                {isExpanded ? "Свернуть" : "Развернуть"}
                              </button>
                            )}
                          </div>
                        );
                      })()}

                    {/* Divider if nothing shown */}
                    {!showArabic &&
                      !showTranslit &&
                      !showTranslation &&
                      !showTafsir && (
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
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
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

      {/* ---- How It Works Onboarding ---- */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        {showHowItWorks ? (
          <div className="relative bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-amber-500/5 border border-emerald-500/20 rounded-2xl p-4 overflow-hidden">
            <button
              onClick={dismissHowItWorks}
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/20 flex items-center justify-center shrink-0">
                <BookOpen className="w-4.5 h-4.5 text-emerald-300" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">
                  Хифз — заучивание Корана наизусть
                </p>
                <p className="text-emerald-300/70 text-[11px]">
                  Учи Священный Коран постепенно, аят за аятом
                </p>
              </div>
            </div>
            <ul className="space-y-2 text-[12.5px] leading-relaxed text-slate-300">
              <li className="flex items-start gap-2">
                <Volume2 className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <span>
                  <span className="text-white font-medium">Слушай аят-за-аятом</span> —
                  карточка играющего аята подсвечивается, можно зациклить (3×, 5×, ∞) и замедлить
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span>
                  <span className="text-white font-medium">Отмечай прогресс</span> —
                  «Забыл / Тяжело / Хорошо / Легко». Чем лучше знаешь — тем реже напоминание
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ScrollText className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                <span>
                  <span className="text-white font-medium">Включай тафсир Ас-Саади</span> —
                  понимая смысл, заучиваешь быстрее
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Star className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <span>
                  <span className="text-white font-medium">Начни с коротких</span> — сур
                  для намаза или из 3-аятных. Постепенно переходи к длинным
                </span>
              </li>
            </ul>
            <button
              onClick={dismissHowItWorks}
              className="mt-3 w-full py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold transition-colors"
            >
              Понятно, начнём!
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowHowItWorks(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 text-[11px] transition-colors"
          >
            <BookOpen className="w-3 h-3" />
            Как это работает?
          </button>
        )}
      </div>

      {/* ---- Stats Bar ---- */}
      {totalSurahs > 0 && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
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
                Уровень знаний
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
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-amber-400" />
          <h2 className="text-white text-sm font-semibold">Мои суры</h2>
          {totalSurahs > 0 && (
            <span className="text-slate-500 text-xs ml-auto">
              {sortedList.filter(needsReview).length} к повторению
            </span>
          )}
        </div>

        {/* Empty state — compact, one-line hint pointing down */}
        {totalSurahs === 0 && (
          <div className="t-bg backdrop-blur-sm border t-border-s rounded-xl px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-slate-300 text-xs leading-tight">
              Выбери суру ниже — и начнёшь заучивать
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

                    {/* Names and info — translit as primary, translation secondary */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-semibold truncate">
                          {getSurahTranslit(surah.surahNumber)}
                        </span>
                        <span className="text-slate-600 text-xs">
                          {info.ayahs} {ayahWord(info.ayahs)}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] truncate">
                        {info.ru}
                      </p>
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
                        {needs ? (
                          <span className="text-amber-400 text-[10px] font-medium bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                            Повторить
                          </span>
                        ) : (
                          <span className="text-emerald-500/70 text-[10px]">
                            {formatNextReview(surah)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remove button (two-step: tap → confirm, tap again → delete) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirmDelete === surah.surahNumber) {
                          handleRemove(surah.surahNumber);
                          setConfirmDelete(null);
                        } else {
                          setConfirmDelete(surah.surahNumber);
                          // auto-cancel after 3s
                          setTimeout(() => {
                            setConfirmDelete((cur) =>
                              cur === surah.surahNumber ? null : cur,
                            );
                          }, 3000);
                        }
                      }}
                      className={`flex items-center justify-center shrink-0 mt-0.5 transition-all
                                 ${
                                   confirmDelete === surah.surahNumber
                                     ? "px-2 h-7 rounded-full bg-red-500/15 ring-1 ring-red-500/30"
                                     : "w-7 h-7 rounded-full hover:bg-red-500/10"
                                 }`}
                    >
                      {confirmDelete === surah.surahNumber ? (
                        <span className="text-red-400 text-[10px] font-bold whitespace-nowrap">
                          Удалить?
                        </span>
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-600 hover:text-red-400" />
                      )}
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

                    {/* Confidence selector (inline) — Anki-style, 2x2 grid */}
                    {showConfidence && (
                      <div className="mt-3 t-bg rounded-xl p-3">
                        <p className="text-slate-400 text-xs mb-2.5 text-center">
                          Как было? (+{POINTS.MEMORIZE_REPEAT} саваб)
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {CONFIDENCE_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  hapticImpact("medium");
                                  handleReview(surah.surahNumber, opt.value);
                                }}
                                className={`flex items-center gap-2.5 px-3 py-3 rounded-xl
                                           ${opt.bg} ring-1 ${opt.ring}
                                           active:scale-[0.97] transition-all duration-150`}
                              >
                                <Icon className={`w-5 h-5 ${opt.color} shrink-0`} />
                                <div className="flex-1 text-left min-w-0">
                                  <p className={`text-sm font-semibold ${opt.color}`}>
                                    {opt.label}
                                  </p>
                                  <p className="text-slate-400 text-[10px] leading-tight truncate">
                                    {opt.hint}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Points earned */}
                    {surah.pointsEarned > 0 && (
                      <div className="mt-2 flex items-center justify-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500/50" />
                        <span className="text-emerald-500/50 text-[10px]">
                          +{surah.pointsEarned} саваб заработано
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
      <div className="max-w-2xl mx-auto px-4 mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Moon className="w-4 h-4 text-amber-400" />
          <h2 className="text-white text-sm font-semibold">Для намаза</h2>
          <span className="text-slate-500 text-xs ml-auto">
            от лёгкой к длинной
          </span>
        </div>

        {/* Add-all CTA — appears only if at least one prayer surah is not added yet */}
        {PRAYER_SURAHS.some((n) => !addedSet.has(n)) && (
          <button
            onClick={handleAddAllPrayer}
            className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2.5
                       rounded-xl bg-amber-500/10 hover:bg-amber-500/15
                       border border-amber-500/20 hover:border-amber-500/30
                       text-amber-300 text-sm font-medium transition-all duration-200
                       active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Добавить все ({PRAYER_SURAHS.filter((n) => !addedSet.has(n)).length})
          </button>
        )}

        {/* Grouped by ayah count — visual difficulty steps */}
        <div className="space-y-3 mb-4">
          {PRAYER_SURAH_GROUPS.map(({ size, surahs }) => (
            <div key={`group-${size}`}>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-amber-400/70 text-[10px] font-bold tabular-nums">
                  {size} {ayahWord(size)}
                </span>
                <div className="flex-1 h-px bg-amber-500/10" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {surahs.map((num) => {
                  const info = SURAH_NAMES[num];
                  if (!info) return null;
                  const isAdded = addedSet.has(num);

                  return (
                    <button
                      key={`prayer-${num}`}
                      onClick={() => !isAdded && handleAdd(num)}
                      disabled={isAdded}
                      className={`relative flex flex-col gap-1 p-3 rounded-xl text-left
                                  transition-all duration-200 border min-h-[92px]
                                  ${
                                    isAdded
                                      ? "bg-emerald-500/5 border-emerald-500/15 opacity-70 cursor-default"
                                      : "bg-amber-500/5 border-amber-500/15 hover:bg-amber-500/10 hover:border-amber-500/25 active:scale-[0.98]"
                                  }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm font-semibold truncate ${isAdded ? "text-emerald-400/80" : "text-white"}`}
                        >
                          {getSurahTranslit(num)}
                        </p>
                        {isAdded ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <p
                        className="font-['Amiri'] text-amber-200/70 text-base leading-snug truncate"
                        dir="rtl"
                      >
                        {info.ar}
                      </p>
                      <p className="text-slate-400 text-[11px] truncate">
                        {info.ru}
                      </p>
                      <p className="text-slate-500 text-[10px] tabular-nums">
                        {info.ayahs} {ayahWord(info.ayahs)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Add Surah Section ---- */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
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

        {/* Surah grid — grouped by ayah count when not searching, flat when searching */}
        {(() => {
          const renderCard = (num: number) => {
            const info = SURAH_NAMES[num];
            if (!info) return null;
            const isAdded = addedSet.has(num);
            return (
              <button
                key={num}
                onClick={() => !isAdded && handleAdd(num)}
                disabled={isAdded}
                className={`relative flex flex-col gap-1 p-3 rounded-xl text-left
                            transition-all duration-200 border min-h-[92px]
                            ${
                              isAdded
                                ? "bg-emerald-500/5 border-emerald-500/15 opacity-70 cursor-default"
                                : "t-bg t-border-s hover:bg-emerald-500/5 hover:border-emerald-500/20 active:scale-[0.98]"
                            }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-sm font-semibold truncate ${isAdded ? "text-emerald-400/80" : "text-white"}`}
                  >
                    {getSurahTranslit(num)}
                  </p>
                  {isAdded ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                </div>
                <p
                  className="font-['Amiri'] text-amber-200/70 text-base leading-snug truncate"
                  dir="rtl"
                >
                  {info.ar}
                </p>
                <p className="text-slate-400 text-[11px] truncate">
                  {info.ru}
                </p>
                <p className="text-slate-500 text-[10px] tabular-nums">
                  {info.ayahs} {ayahWord(info.ayahs)}
                </p>
              </button>
            );
          };

          // While searching → flat grid
          if (searchLower) {
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredSurahs.map(renderCard)}
              </div>
            );
          }

          // Otherwise → grouped by ayah count with subtle dividers
          const groups = new Map<number, number[]>();
          for (const num of filteredSurahs) {
            const ayahs = SURAH_NAMES[num]?.ayahs;
            if (!ayahs) continue;
            if (!groups.has(ayahs)) groups.set(ayahs, []);
            groups.get(ayahs)!.push(num);
          }
          const sortedGroups = Array.from(groups.entries()).sort(
            ([a], [b]) => a - b,
          );

          return (
            <div className="space-y-4">
              {sortedGroups.map(([size, surahs]) => (
                <div key={`group-all-${size}`}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-emerald-400/70 text-[10px] font-bold tabular-nums">
                      {size} {ayahWord(size)}
                    </span>
                    <div className="flex-1 h-px bg-emerald-500/10" />
                    <span className="text-slate-600 text-[10px]">
                      {surahs.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {surahs.map(renderCard)}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

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
