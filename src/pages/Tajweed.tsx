import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  Search,
  Loader2,
  Volume2,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  ArrowLeft,
  Star,
  Layers,
  GraduationCap,
  Play,
  Pause,
  Lock,
  Trophy,
  Sparkles,
  CircleDot,
} from "lucide-react";
import { getSurahList, getSurah, getSurahTranslation, hapticSelection } from "../lib/api";
import { storage, POINTS } from "../lib/storage";
import { scheduleSyncPush } from "../lib/sync";
import type { Surah, SurahDetail } from "../lib/api";

// ============================================================
// DATA: Arabic Alphabet (28 letters)
// ============================================================

interface ArabicLetter {
  id: number;
  letter: string;
  name: string;
  nameRu: string;
  transliteration: string;
  pronunciation: string;
  forms: { isolated: string; initial: string; medial: string; final: string };
  makhraj: string;
  makhrajRu: string;
  withFatha: string;
  withKasra: string;
  withDamma: string;
  withSukun: string;
  withShadda: string;
}

const ARABIC_ALPHABET: ArabicLetter[] = [
  { id: 1, letter: "ا", name: "Alif", nameRu: "Алиф", transliteration: "a/ā", pronunciation: "Гласный звук «а» или подставка для хамзы", forms: { isolated: "ا", initial: "ا", medial: "ـا", final: "ـا" }, makhraj: "Empty space in mouth/throat", makhrajRu: "Пустое пространство рта", withFatha: "اَ", withKasra: "اِ", withDamma: "اُ", withSukun: "اْ", withShadda: "اّ" },
  { id: 2, letter: "ب", name: "Ba", nameRu: "Ба", transliteration: "b", pronunciation: "Как русское «б»", forms: { isolated: "ب", initial: "بـ", medial: "ـبـ", final: "ـب" }, makhraj: "Both lips together", makhrajRu: "Обе губы вместе", withFatha: "بَ", withKasra: "بِ", withDamma: "بُ", withSukun: "بْ", withShadda: "بَّ" },
  { id: 3, letter: "ت", name: "Ta", nameRu: "Та", transliteration: "t", pronunciation: "Как русское «т»", forms: { isolated: "ت", initial: "تـ", medial: "ـتـ", final: "ـت" }, makhraj: "Tip of tongue and upper teeth", makhrajRu: "Кончик языка и верхние зубы", withFatha: "تَ", withKasra: "تِ", withDamma: "تُ", withSukun: "تْ", withShadda: "تَّ" },
  { id: 4, letter: "ث", name: "Tha", nameRu: "Са", transliteration: "th", pronunciation: "Как английское «th» в «think»", forms: { isolated: "ث", initial: "ثـ", medial: "ـثـ", final: "ـث" }, makhraj: "Tip of tongue between teeth", makhrajRu: "Кончик языка между зубами", withFatha: "ثَ", withKasra: "ثِ", withDamma: "ثُ", withSukun: "ثْ", withShadda: "ثَّ" },
  { id: 5, letter: "ج", name: "Jim", nameRu: "Джим", transliteration: "j", pronunciation: "Как «дж» в «джем»", forms: { isolated: "ج", initial: "جـ", medial: "ـجـ", final: "ـج" }, makhraj: "Middle of tongue and palate", makhrajRu: "Середина языка и нёбо", withFatha: "جَ", withKasra: "جِ", withDamma: "جُ", withSukun: "جْ", withShadda: "جَّ" },
  { id: 6, letter: "ح", name: "Ha", nameRu: "Ха", transliteration: "ḥ", pronunciation: "Глубокий горловой выдох, нет аналога в русском", forms: { isolated: "ح", initial: "حـ", medial: "ـحـ", final: "ـح" }, makhraj: "Middle of throat", makhrajRu: "Середина горла", withFatha: "حَ", withKasra: "حِ", withDamma: "حُ", withSukun: "حْ", withShadda: "حَّ" },
  { id: 7, letter: "خ", name: "Kha", nameRu: "Хо", transliteration: "kh", pronunciation: "Как «х» в «хорошо», но глубже", forms: { isolated: "خ", initial: "خـ", medial: "ـخـ", final: "ـخ" }, makhraj: "Back of mouth near throat", makhrajRu: "Задняя часть рта у горла", withFatha: "خَ", withKasra: "خِ", withDamma: "خُ", withSukun: "خْ", withShadda: "خَّ" },
  { id: 8, letter: "د", name: "Dal", nameRu: "Даль", transliteration: "d", pronunciation: "Как русское «д»", forms: { isolated: "د", initial: "د", medial: "ـد", final: "ـد" }, makhraj: "Tip of tongue and upper teeth ridge", makhrajRu: "Кончик языка и бугорок верхних зубов", withFatha: "دَ", withKasra: "دِ", withDamma: "دُ", withSukun: "دْ", withShadda: "دَّ" },
  { id: 9, letter: "ذ", name: "Dhal", nameRu: "Заль", transliteration: "dh", pronunciation: "Как английское «th» в «that»", forms: { isolated: "ذ", initial: "ذ", medial: "ـذ", final: "ـذ" }, makhraj: "Tip of tongue between teeth", makhrajRu: "Кончик языка между зубами", withFatha: "ذَ", withKasra: "ذِ", withDamma: "ذُ", withSukun: "ذْ", withShadda: "ذَّ" },
  { id: 10, letter: "ر", name: "Ra", nameRu: "Ра", transliteration: "r", pronunciation: "Как русское «р», раскатистое", forms: { isolated: "ر", initial: "ر", medial: "ـر", final: "ـر" }, makhraj: "Tip of tongue near teeth ridge", makhrajRu: "Кончик языка у бугорков", withFatha: "رَ", withKasra: "رِ", withDamma: "رُ", withSukun: "رْ", withShadda: "رَّ" },
  { id: 11, letter: "ز", name: "Zayn", nameRu: "Зайн", transliteration: "z", pronunciation: "Как русское «з»", forms: { isolated: "ز", initial: "ز", medial: "ـز", final: "ـز" }, makhraj: "Tip of tongue near lower teeth", makhrajRu: "Кончик языка у нижних зубов", withFatha: "زَ", withKasra: "زِ", withDamma: "زُ", withSukun: "زْ", withShadda: "زَّ" },
  { id: 12, letter: "س", name: "Sin", nameRu: "Син", transliteration: "s", pronunciation: "Как русское «с»", forms: { isolated: "س", initial: "سـ", medial: "ـسـ", final: "ـس" }, makhraj: "Tip of tongue near lower teeth", makhrajRu: "Кончик языка у нижних зубов", withFatha: "سَ", withKasra: "سِ", withDamma: "سُ", withSukun: "سْ", withShadda: "سَّ" },
  { id: 13, letter: "ش", name: "Shin", nameRu: "Шин", transliteration: "sh", pronunciation: "Как русское «ш»", forms: { isolated: "ش", initial: "شـ", medial: "ـشـ", final: "ـش" }, makhraj: "Middle of tongue and palate", makhrajRu: "Середина языка и нёбо", withFatha: "شَ", withKasra: "شِ", withDamma: "شُ", withSukun: "شْ", withShadda: "شَّ" },
  { id: 14, letter: "ص", name: "Sad", nameRu: "Сод", transliteration: "ṣ", pronunciation: "Эмфатическое «с» — язык толще, звук тяжелее", forms: { isolated: "ص", initial: "صـ", medial: "ـصـ", final: "ـص" }, makhraj: "Tip of tongue near lower teeth (emphatic)", makhrajRu: "Кончик языка (эмфатический)", withFatha: "صَ", withKasra: "صِ", withDamma: "صُ", withSukun: "صْ", withShadda: "صَّ" },
  { id: 15, letter: "ض", name: "Dad", nameRu: "Дод", transliteration: "ḍ", pronunciation: "Эмфатическое «д» — уникальный арабский звук", forms: { isolated: "ض", initial: "ضـ", medial: "ـضـ", final: "ـض" }, makhraj: "Side of tongue and molars", makhrajRu: "Бок языка и коренные зубы", withFatha: "ضَ", withKasra: "ضِ", withDamma: "ضُ", withSukun: "ضْ", withShadda: "ضَّ" },
  { id: 16, letter: "ط", name: "Ta (emphatic)", nameRu: "То", transliteration: "ṭ", pronunciation: "Эмфатическое «т» — тяжёлый звук", forms: { isolated: "ط", initial: "طـ", medial: "ـطـ", final: "ـط" }, makhraj: "Tip of tongue and upper teeth ridge (emphatic)", makhrajRu: "Кончик языка (эмфатический)", withFatha: "طَ", withKasra: "طِ", withDamma: "طُ", withSukun: "طْ", withShadda: "طَّ" },
  { id: 17, letter: "ظ", name: "Dha (emphatic)", nameRu: "Зо", transliteration: "ẓ", pronunciation: "Эмфатическое «з» между зубами", forms: { isolated: "ظ", initial: "ظـ", medial: "ـظـ", final: "ـظ" }, makhraj: "Tip of tongue between teeth (emphatic)", makhrajRu: "Кончик языка между зубами (эмфатический)", withFatha: "ظَ", withKasra: "ظِ", withDamma: "ظُ", withSukun: "ظْ", withShadda: "ظَّ" },
  { id: 18, letter: "ع", name: "Ayn", nameRu: "Айн", transliteration: "'", pronunciation: "Гортанный звук, нет аналога в русском. Сжатие горла", forms: { isolated: "ع", initial: "عـ", medial: "ـعـ", final: "ـع" }, makhraj: "Middle of throat", makhrajRu: "Середина горла", withFatha: "عَ", withKasra: "عِ", withDamma: "عُ", withSukun: "عْ", withShadda: "عَّ" },
  { id: 19, letter: "غ", name: "Ghayn", nameRu: "Гайн", transliteration: "gh", pronunciation: "Как французское «r» — горловое «г»", forms: { isolated: "غ", initial: "غـ", medial: "ـغـ", final: "ـغ" }, makhraj: "Upper throat near mouth", makhrajRu: "Верхняя часть горла", withFatha: "غَ", withKasra: "غِ", withDamma: "غُ", withSukun: "غْ", withShadda: "غَّ" },
  { id: 20, letter: "ف", name: "Fa", nameRu: "Фа", transliteration: "f", pronunciation: "Как русское «ф»", forms: { isolated: "ف", initial: "فـ", medial: "ـفـ", final: "ـف" }, makhraj: "Lower lip and upper teeth", makhrajRu: "Нижняя губа и верхние зубы", withFatha: "فَ", withKasra: "فِ", withDamma: "فُ", withSukun: "فْ", withShadda: "فَّ" },
  { id: 21, letter: "ق", name: "Qaf", nameRu: "Коф", transliteration: "q", pronunciation: "Глубокое «к» из горла", forms: { isolated: "ق", initial: "قـ", medial: "ـقـ", final: "ـق" }, makhraj: "Back of tongue and soft palate", makhrajRu: "Корень языка и мягкое нёбо", withFatha: "قَ", withKasra: "قِ", withDamma: "قُ", withSukun: "قْ", withShadda: "قَّ" },
  { id: 22, letter: "ك", name: "Kaf", nameRu: "Каф", transliteration: "k", pronunciation: "Как русское «к»", forms: { isolated: "ك", initial: "كـ", medial: "ـكـ", final: "ـك" }, makhraj: "Back of tongue and hard palate", makhrajRu: "Задняя часть языка и твёрдое нёбо", withFatha: "كَ", withKasra: "كِ", withDamma: "كُ", withSukun: "كْ", withShadda: "كَّ" },
  { id: 23, letter: "ل", name: "Lam", nameRu: "Лям", transliteration: "l", pronunciation: "Как русское «л»", forms: { isolated: "ل", initial: "لـ", medial: "ـلـ", final: "ـل" }, makhraj: "Tip and sides of tongue", makhrajRu: "Кончик и бока языка", withFatha: "لَ", withKasra: "لِ", withDamma: "لُ", withSukun: "لْ", withShadda: "لَّ" },
  { id: 24, letter: "م", name: "Mim", nameRu: "Мим", transliteration: "m", pronunciation: "Как русское «м»", forms: { isolated: "م", initial: "مـ", medial: "ـمـ", final: "ـم" }, makhraj: "Both lips together", makhrajRu: "Обе губы вместе", withFatha: "مَ", withKasra: "مِ", withDamma: "مُ", withSukun: "مْ", withShadda: "مَّ" },
  { id: 25, letter: "ن", name: "Nun", nameRu: "Нун", transliteration: "n", pronunciation: "Как русское «н»", forms: { isolated: "ن", initial: "نـ", medial: "ـنـ", final: "ـن" }, makhraj: "Tip of tongue and teeth ridge", makhrajRu: "Кончик языка и бугорок зубов", withFatha: "نَ", withKasra: "نِ", withDamma: "نُ", withSukun: "نْ", withShadda: "نَّ" },
  { id: 26, letter: "ه", name: "Ha", nameRu: "Ха", transliteration: "h", pronunciation: "Лёгкий выдох, как в «ha» (не русское «х»)", forms: { isolated: "ه", initial: "هـ", medial: "ـهـ", final: "ـه" }, makhraj: "Deepest part of throat", makhrajRu: "Самая глубокая часть горла", withFatha: "هَ", withKasra: "هِ", withDamma: "هُ", withSukun: "هْ", withShadda: "هَّ" },
  { id: 27, letter: "و", name: "Waw", nameRu: "Уау", transliteration: "w/ū", pronunciation: "Как английское «w» или долгое «у»", forms: { isolated: "و", initial: "و", medial: "ـو", final: "ـو" }, makhraj: "Both lips rounded", makhrajRu: "Округлённые губы", withFatha: "وَ", withKasra: "وِ", withDamma: "وُ", withSukun: "وْ", withShadda: "وَّ" },
  { id: 28, letter: "ي", name: "Ya", nameRu: "Йа", transliteration: "y/ī", pronunciation: "Как русское «й» или долгое «и»", forms: { isolated: "ي", initial: "يـ", medial: "ـيـ", final: "ـي" }, makhraj: "Middle of tongue and palate", makhrajRu: "Середина языка и нёбо", withFatha: "يَ", withKasra: "يِ", withDamma: "يُ", withSukun: "يْ", withShadda: "يَّ" },
];

// ============================================================
// DATA: Harakat (diacritical marks)
// ============================================================

interface Haraka {
  id: string;
  symbol: string;
  name: string;
  nameAr: string;
  sound: string;
  description: string;
  example: string;
  exampleTranslit: string;
}

const HARAKAT: Haraka[] = [
  { id: "fatha", symbol: "  َ", name: "Фатха", nameAr: "فَتْحَة", sound: "а", description: "Чёрточка сверху буквы. Даёт звук «а»", example: "بَ", exampleTranslit: "ба" },
  { id: "kasra", symbol: "  ِ", name: "Касра", nameAr: "كَسْرَة", sound: "и", description: "Чёрточка снизу буквы. Даёт звук «и»", example: "بِ", exampleTranslit: "би" },
  { id: "damma", symbol: "  ُ", name: "Дамма", nameAr: "ضَمَّة", sound: "у", description: "Запятая (واو) сверху буквы. Даёт звук «у»", example: "بُ", exampleTranslit: "бу" },
  { id: "sukun", symbol: "  ْ", name: "Сукун", nameAr: "سُكُون", sound: "—", description: "Кружочек сверху. Буква без гласного звука (согласная)", example: "بْ", exampleTranslit: "б (без гласной)" },
  { id: "shadda", symbol: "  ّ", name: "Шадда", nameAr: "شَدَّة", sound: "удвоение", description: "Знак удвоения буквы. Буква произносится дважды", example: "بَّ", exampleTranslit: "бб" },
  { id: "tanwin_fath", symbol: "  ً", name: "Танвин фатха", nameAr: "تَنْوِين فَتْح", sound: "ан", description: "Две фатхи. Звук «ан» в конце слова", example: "بًا", exampleTranslit: "бан" },
  { id: "tanwin_kasr", symbol: "  ٍ", name: "Танвин касра", nameAr: "تَنْوِين كَسْر", sound: "ин", description: "Две касры. Звук «ин» в конце слова", example: "بٍ", exampleTranslit: "бин" },
  { id: "tanwin_damm", symbol: "  ٌ", name: "Танвин дамма", nameAr: "تَنْوِين ضَمّ", sound: "ун", description: "Две даммы. Звук «ун» в конце слова", example: "بٌ", exampleTranslit: "бун" },
];

// ============================================================
// DATA: Tajweed Rules
// ============================================================

interface TajweedRule {
  id: string;
  name: string;
  nameAr: string;
  color: string;
  bgClass: string;
  description: string;
  details: string;
  letters: string;
  example: string;
  exampleTranslit: string;
}

const TAJWEED_RULES: TajweedRule[] = [
  { id: "izhar", name: "Изхар", nameAr: "إظهار", color: "#a78bfa", bgClass: "bg-violet-500/20 border-violet-500/40", description: "Чёткое произношение", details: "Нун-сукун (نْ) или танвин перед горловыми буквами произносятся чётко и ясно, без назализации", letters: "ء ه ع ح غ خ", example: "مَنْ آمَنَ", exampleTranslit: "man āmana" },
  { id: "idgham_ghunnah", name: "Идгам с гунной", nameAr: "إدغام بغنّة", color: "#4ade80", bgClass: "bg-green-500/20 border-green-500/40", description: "Слияние с носовым звуком", details: "Нун-сукун или танвин сливается с одной из 4 букв (ي ن م و) с носовым звуком (гунна) длительностью 2 счёта", letters: "ي ن م و", example: "مَن يَعْمَلُ", exampleTranslit: "man ya'malu → may-ya'malu" },
  { id: "idgham_no_ghunnah", name: "Идгам без гунны", nameAr: "إدغام بلا غنّة", color: "#60a5fa", bgClass: "bg-blue-500/20 border-blue-500/40", description: "Полное слияние", details: "Нун-сукун или танвин полностью сливается с ل или ر без назального звука", letters: "ل ر", example: "مِن رَّبِّهِم", exampleTranslit: "min rabbihim → mir-rabbihim" },
  { id: "ikhfa", name: "Ихфа", nameAr: "إخفاء", color: "#f59e0b", bgClass: "bg-amber-500/20 border-amber-500/40", description: "Сокрытие (между изхар и идгам)", details: "Нун-сукун или танвин перед 15 оставшимися буквами — звук сокрыт: лёгкий носовой призвук 2 счёта", letters: "ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك", example: "مِن قَبْلُ", exampleTranslit: "min qablu" },
  { id: "iqlab", name: "Иклаб", nameAr: "إقلاب", color: "#f472b6", bgClass: "bg-pink-500/20 border-pink-500/40", description: "Превращение", details: "Нун-сукун или танвин перед ب превращается в звук «м» (مْ) с гунной 2 счёта", letters: "ب", example: "مِن بَعْدِ", exampleTranslit: "min ba'di → mim-ba'di" },
  { id: "qalqalah", name: "Калькаля", nameAr: "قلقلة", color: "#fb923c", bgClass: "bg-orange-500/20 border-orange-500/40", description: "Подпрыгивание (эхо-звук)", details: "При сукуне на одной из 5 букв (ق ط ب ج د) звук «подпрыгивает» — слышен лёгкий гласный призвук. Малая — в середине слова, большая — в конце", letters: "ق ط ب ج د", example: "يَخْلُقْ", exampleTranslit: "yakhlūq" },
  { id: "madd", name: "Мадд", nameAr: "مدّ", color: "#2dd4bf", bgClass: "bg-teal-500/20 border-teal-500/40", description: "Удлинение гласного", details: "Естественный мадд (табиий) = 2 счёта. Присоединённый (муттасиль) = 4-5 счётов. Разделённый (мунфасиль) = 4-5 счётов. Буквы мадда: ا و ي", letters: "ا و ي", example: "قَالَ · قِيلَ · يَقُولُ", exampleTranslit: "qāla · qīla · yaqūlu" },
  { id: "ghunnah", name: "Гунна", nameAr: "غنّة", color: "#818cf8", bgClass: "bg-indigo-500/20 border-indigo-500/40", description: "Носовой звук", details: "Назальный звук длительностью 2 счёта при ташдиде на نّ и مّ. Произносится через нос", letters: "نّ مّ", example: "إِنَّ · ثُمَّ", exampleTranslit: "inna · thumma" },
];

// ============================================================
// DATA: Makhraj groups
// ============================================================

interface MakhrajGroup {
  id: string;
  name: string;
  nameAr: string;
  area: string;
  letters: string[];
  description: string;
  color: string;
}

const MAKHRAJ_GROUPS: MakhrajGroup[] = [
  { id: "throat_deep", name: "Горло (глубина)", nameAr: "أقصى الحلق", area: "Самая глубокая часть горла", letters: ["ء", "ه"], description: "Хамза и Ха — из самой глубины горла", color: "#ef4444" },
  { id: "throat_mid", name: "Горло (середина)", nameAr: "وسط الحلق", area: "Середина горла", letters: ["ع", "ح"], description: "Айн и Ха — из середины горла", color: "#f97316" },
  { id: "throat_upper", name: "Горло (верх)", nameAr: "أدنى الحلق", area: "Верхняя часть горла", letters: ["غ", "خ"], description: "Гайн и Хо — из верхней части горла", color: "#eab308" },
  { id: "tongue_back", name: "Корень языка", nameAr: "أقصى اللسان", area: "Задняя часть языка", letters: ["ق", "ك"], description: "Коф — от корня к мягкому нёбу, Каф — чуть ближе к твёрдому нёбу", color: "#22c55e" },
  { id: "tongue_mid", name: "Середина языка", nameAr: "وسط اللسان", area: "Середина языка к нёбу", letters: ["ج", "ش", "ي"], description: "Джим, Шин, Йа — середина языка поднимается к нёбу", color: "#06b6d4" },
  { id: "tongue_side", name: "Бок языка", nameAr: "حافة اللسان", area: "Боковые стороны языка", letters: ["ض", "ل"], description: "Дод — единственная буква от бока, Лям — от края к зубам", color: "#8b5cf6" },
  { id: "tongue_tip", name: "Кончик языка", nameAr: "طرف اللسان", area: "Кончик языка", letters: ["ن", "ر", "ت", "د", "ط", "ث", "ذ", "ظ", "ز", "س", "ص"], description: "11 букв от кончика языка к зубам и бугоркам", color: "#3b82f6" },
  { id: "lips", name: "Губы", nameAr: "الشفتان", area: "Обе губы / губа и зубы", letters: ["ب", "م", "و", "ف"], description: "Ба и Мим — обе губы. Уау — округлённые губы. Фа — нижняя губа к верхним зубам", color: "#ec4899" },
  { id: "nasal", name: "Носовая полость", nameAr: "الخيشوم", area: "Гунна (носовой звук)", letters: ["نّ", "مّ"], description: "Назальный резонанс при ташдиде или гунне", color: "#14b8a6" },
];

// ============================================================
// API: Word-by-word
// ============================================================

interface WordInfo {
  arabic: string;
  transliteration: string;
  translation: string;
  position: number;
  audioUrl?: string;
}

async function fetchWordByWord(surahNum: number, ayahNum: number): Promise<WordInfo[]> {
  const cacheKey = `iman_wbw_${surahNum}_${ayahNum}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* ignore */ }
  }
  const url = `https://api.quran.com/api/v4/verses/by_key/${surahNum}:${ayahNum}?language=ru&words=true&word_fields=text_uthmani,transliteration,translation&translation_fields=text`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Failed to fetch word-by-word");
  const data = await resp.json();
  const words: WordInfo[] = (data.verse?.words || [])
    .filter((w: any) => w.char_type_name === "word")
    .map((w: any, i: number) => ({
      arabic: w.text_uthmani || w.text || "",
      transliteration: w.transliteration?.text || "",
      translation: w.translation?.text || "",
      position: i + 1,
      audioUrl: w.audio?.url ? `https://audio.qurancdn.com/${w.audio.url}` : undefined,
    }));
  try { localStorage.setItem(cacheKey, JSON.stringify(words)); } catch { /* quota */ }
  return words;
}

// ============================================================
// Storage
// ============================================================

const SK = {
  LEARNED_RULES: "iman_tajweed_learned",
  LEARNED_LETTERS: "iman_tajweed_letters",
  WORD_PROGRESS: "iman_tajweed_word_progress",
  QUIZ_BEST: "iman_tajweed_quiz_best",
  LEVEL: "iman_tajweed_level",
};

function getSet(key: string): Set<string> {
  try { const v = localStorage.getItem(key); return v ? new Set(JSON.parse(v)) : new Set(); } catch { return new Set(); }
}
function saveSet(key: string, s: Set<string>) { localStorage.setItem(key, JSON.stringify([...s])); }
function getObj<T>(key: string, def: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function saveObj(key: string, v: any) { localStorage.setItem(key, JSON.stringify(v)); }

// Surah names
const SURAH_NAMES_RU: Record<number, string> = {
  1: "Открывающая", 2: "Корова", 3: "Семейство Имрана", 4: "Женщины", 5: "Трапеза", 6: "Скот", 7: "Преграды", 8: "Трофеи", 9: "Покаяние", 10: "Юнус", 11: "Худ", 12: "Юсуф", 13: "Гром", 14: "Ибрахим", 15: "Аль-Хиджр", 16: "Пчёлы", 17: "Ночной перенос", 18: "Пещера", 19: "Марьям", 20: "Та Ха", 21: "Пророки", 22: "Хадж", 23: "Верующие", 24: "Свет", 25: "Различение", 26: "Поэты", 27: "Муравьи", 28: "Рассказ", 29: "Паук", 30: "Римляне", 31: "Лукман", 32: "Поклон", 33: "Союзники", 34: "Саба", 35: "Творец", 36: "Йа Син", 37: "Стоящие в ряд", 38: "Сад", 39: "Толпы", 40: "Прощающий", 41: "Разъяснены", 42: "Совет", 43: "Украшения", 44: "Дым", 45: "Коленопреклонённая", 46: "Барханы", 47: "Мухаммад", 48: "Победа", 49: "Комнаты", 50: "Каф", 51: "Рассеивающие", 52: "Гора", 53: "Звезда", 54: "Месяц", 55: "Милостивый", 56: "Событие", 57: "Железо", 58: "Препирающаяся", 59: "Сбор", 60: "Испытуемая", 61: "Ряд", 62: "Пятница", 63: "Лицемеры", 64: "Взаимное обделение", 65: "Развод", 66: "Запрещение", 67: "Власть", 68: "Письменная трость", 69: "Неизбежное", 70: "Ступени", 71: "Нух", 72: "Джинны", 73: "Закутавшийся", 74: "Завернувшийся", 75: "Воскресение", 76: "Человек", 77: "Посылаемые", 78: "Весть", 79: "Вырывающие", 80: "Нахмурился", 81: "Скручивание", 82: "Раскалывание", 83: "Обвешивающие", 84: "Разверзнётся", 85: "Созвездия", 86: "Ночной путник", 87: "Высочайший", 88: "Покрывающее", 89: "Заря", 90: "Город", 91: "Солнце", 92: "Ночь", 93: "Утро", 94: "Раскрытие", 95: "Смоковница", 96: "Сгусток", 97: "Предопределение", 98: "Ясное знамение", 99: "Землетрясение", 100: "Скачущие", 101: "Великое бедствие", 102: "Приумножение", 103: "Время", 104: "Хулитель", 105: "Слон", 106: "Курайш", 107: "Мелочь", 108: "Изобилие", 109: "Неверующие", 110: "Помощь", 111: "Пальмовые волокна", 112: "Искренность", 113: "Рассвет", 114: "Люди",
};

// ============================================================
// LEVELS for structured learning
// ============================================================

interface LearningLevel {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  letterRange: [number, number]; // indices in ARABIC_ALPHABET
}

const LEARNING_LEVELS: LearningLevel[] = [
  { id: 1, title: "Урок 1", subtitle: "ا ب ت ث", icon: "1️⃣", letterRange: [0, 3] },
  { id: 2, title: "Урок 2", subtitle: "ج ح خ د", icon: "2️⃣", letterRange: [4, 7] },
  { id: 3, title: "Урок 3", subtitle: "ذ ر ز س", icon: "3️⃣", letterRange: [8, 11] },
  { id: 4, title: "Урок 4", subtitle: "ش ص ض ط", icon: "4️⃣", letterRange: [12, 15] },
  { id: 5, title: "Урок 5", subtitle: "ظ ع غ ف", icon: "5️⃣", letterRange: [16, 19] },
  { id: 6, title: "Урок 6", subtitle: "ق ك ل م", icon: "6️⃣", letterRange: [20, 23] },
  { id: 7, title: "Урок 7", subtitle: "ن ه و ي", icon: "7️⃣", letterRange: [24, 27] },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

type Tab = "alphabet" | "harakat" | "makhraj" | "rules" | "practice";
type SubView = "main" | "level" | "letter-detail" | "quiz" | "haraka-detail" | "makhraj-detail" | "rule-detail" | "surah-list" | "surah-read" | "words" | "flashcards";

export default function Tajweed() {
  const [tab, setTab] = useState<Tab>("alphabet");
  const [subView, setSubView] = useState<SubView>("main");

  // Alphabet state
  const [selectedLevel, setSelectedLevel] = useState<LearningLevel | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<ArabicLetter | null>(null);
  const [learnedLetters, setLearnedLetters] = useState<Set<string>>(getSet(SK.LEARNED_LETTERS));

  // Harakat state
  const [selectedHaraka, setSelectedHaraka] = useState<Haraka | null>(null);

  // Makhraj state
  const [selectedMakhraj, setSelectedMakhraj] = useState<MakhrajGroup | null>(null);

  // Rules state
  const [learnedRules, setLearnedRules] = useState<Set<string>>(getSet(SK.LEARNED_RULES));
  const [selectedRule, setSelectedRule] = useState<TajweedRule | null>(null);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizBest, setQuizBest] = useState<number>(getObj(SK.QUIZ_BEST, 0));

  // Practice state
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [arabicAyahs, setArabicAyahs] = useState<SurahDetail | null>(null);
  const [translationAyahs, setTranslationAyahs] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedAyah, setSelectedAyah] = useState<number | null>(null);
  const [words, setWords] = useState<WordInfo[]>([]);
  const [wordsLoading, setWordsLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showTransliteration, setShowTransliteration] = useState(true);
  const [playingWord, setPlayingWord] = useState<number | null>(null);

  // Flashcards
  const [flashcardWords, setFlashcardWords] = useState<WordInfo[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [flashcardScore, setFlashcardScore] = useState(0);
  const [wordProgress, setWordProgress] = useState<Record<string, number>>(getObj(SK.WORD_PROGRESS, {}));

  // Audio ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    getSurahList().then(setSurahs).catch(console.error);
  }, []);

  // --- Navigation ---
  const goBack = useCallback(() => {
    if (subView === "letter-detail") { setSubView("level"); setSelectedLetter(null); }
    else if (subView === "level") { setSubView("main"); setSelectedLevel(null); }
    else if (subView === "quiz") { setSubView("main"); }
    else if (subView === "haraka-detail") { setSubView("main"); setSelectedHaraka(null); }
    else if (subView === "makhraj-detail") { setSubView("main"); setSelectedMakhraj(null); }
    else if (subView === "rule-detail") { setSubView("main"); setSelectedRule(null); }
    else if (subView === "flashcards") { setSubView("words"); }
    else if (subView === "words") { setSubView("surah-read"); }
    else if (subView === "surah-read") { setSubView("surah-list"); }
    else if (subView === "surah-list") { setSubView("main"); }
    else { setSubView("main"); }
    hapticSelection();
  }, [subView]);

  // --- Audio ---
  const playLetterSound = useCallback((letter: ArabicLetter, variant?: string) => {
    // Use speech synthesis as fallback for letter pronunciation
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(variant || letter.letter);
      u.lang = "ar";
      u.rate = 0.7;
      window.speechSynthesis.speak(u);
    }
    hapticSelection();
  }, []);

  const playWordAudio = useCallback(async (word: WordInfo) => {
    if (!selectedSurah || !selectedAyah) return;
    setPlayingWord(word.position);
    try {
      if (word.audioUrl) {
        const audio = new Audio(word.audioUrl);
        audioRef.current = audio;
        audio.onended = () => setPlayingWord(null);
        audio.onerror = () => setPlayingWord(null);
        await audio.play();
      } else {
        // Fallback: speech synthesis
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(word.arabic);
          u.lang = "ar";
          u.rate = 0.6;
          u.onend = () => setPlayingWord(null);
          window.speechSynthesis.speak(u);
        } else {
          setPlayingWord(null);
        }
      }
    } catch { setPlayingWord(null); }
  }, [selectedSurah, selectedAyah]);

  // --- Learn letter ---
  const toggleLearnedLetter = useCallback((id: string) => {
    setLearnedLetters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else {
        next.add(id);
        storage.addExtraPoints(POINTS.QURAN);
        scheduleSyncPush();
      }
      saveSet(SK.LEARNED_LETTERS, next);
      return next;
    });
    hapticSelection();
  }, []);

  const toggleLearnedRule = useCallback((id: string) => {
    setLearnedRules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else {
        next.add(id);
        storage.addExtraPoints(POINTS.QURAN);
        scheduleSyncPush();
      }
      saveSet(SK.LEARNED_RULES, next);
      return next;
    });
    hapticSelection();
  }, []);

  // --- Quiz ---
  const generateQuiz = useCallback(() => {
    const questions: any[] = [];
    // Letter identification
    const shuffled = [...ARABIC_ALPHABET].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(5, shuffled.length); i++) {
      const correct = shuffled[i];
      const others = ARABIC_ALPHABET.filter(l => l.id !== correct.id).sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [correct, ...others].sort(() => Math.random() - 0.5);
      questions.push({
        type: "letter_name",
        question: `Как называется буква ${correct.letter} ?`,
        options: options.map(o => o.nameRu),
        correct: correct.nameRu,
      });
    }
    // Harakat
    for (let i = 0; i < 3; i++) {
      const h = HARAKAT[Math.floor(Math.random() * 5)]; // main 5
      const letter = ARABIC_ALPHABET[Math.floor(Math.random() * 28)];
      const variants = [
        { label: `${letter.withFatha}  — ${letter.nameRu}а`, correct: h.id === "fatha" },
        { label: `${letter.withKasra}  — ${letter.nameRu}и`, correct: h.id === "kasra" },
        { label: `${letter.withDamma}  — ${letter.nameRu}у`, correct: h.id === "damma" },
        { label: `${letter.withSukun}  — ${letter.nameRu}(сукун)`, correct: h.id === "sukun" },
      ];
      const correctVar = variants.find(v => v.correct)!;
      questions.push({
        type: "haraka",
        question: `Какой звук даёт ${h.name} (${h.nameAr}) на букве ${letter.letter} ?`,
        options: variants.map(v => v.label),
        correct: correctVar.label,
      });
    }
    // Rule identification
    for (let i = 0; i < 2; i++) {
      const rule = TAJWEED_RULES[Math.floor(Math.random() * TAJWEED_RULES.length)];
      const others = TAJWEED_RULES.filter(r => r.id !== rule.id).sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [rule, ...others].sort(() => Math.random() - 0.5);
      questions.push({
        type: "rule",
        question: `Какое правило: «${rule.description}»?`,
        options: options.map(o => o.name),
        correct: rule.name,
      });
    }
    setQuizQuestions(questions.sort(() => Math.random() - 0.5));
    setQuizIndex(0);
    setQuizScore(0);
    setQuizAnswer(null);
    setSubView("quiz");
    hapticSelection();
  }, []);

  const handleQuizAnswer = useCallback((answer: string) => {
    if (quizAnswer) return;
    setQuizAnswer(answer);
    if (answer === quizQuestions[quizIndex]?.correct) {
      setQuizScore(s => s + 1);
    }
    hapticSelection();
  }, [quizAnswer, quizQuestions, quizIndex]);

  const nextQuizQuestion = useCallback(() => {
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex(i => i + 1);
      setQuizAnswer(null);
    } else {
      const finalScore = quizScore + (quizAnswer === quizQuestions[quizIndex]?.correct ? 0 : 0); // already counted
      if (quizScore > quizBest) {
        setQuizBest(quizScore);
        saveObj(SK.QUIZ_BEST, quizScore);
      }
      storage.addExtraPoints(quizScore * POINTS.QUIZ_CORRECT);
      scheduleSyncPush();
    }
    hapticSelection();
  }, [quizIndex, quizQuestions, quizScore, quizAnswer, quizBest]);

  // --- Practice ---
  const loadSurah = useCallback(async (num: number) => {
    setLoading(true);
    setSelectedSurah(num);
    setSelectedAyah(null);
    setWords([]);
    try {
      const [ar, tr] = await Promise.all([getSurah(num), getSurahTranslation(num)]);
      setArabicAyahs(ar);
      setTranslationAyahs(tr);
      setSubView("surah-read");
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadWords = useCallback(async (surahNum: number, ayahNum: number) => {
    setWordsLoading(true);
    setSelectedAyah(ayahNum);
    try {
      const w = await fetchWordByWord(surahNum, ayahNum);
      setWords(w);
      setSubView("words");
    } catch (e) { console.error(e); }
    finally { setWordsLoading(false); }
  }, []);

  const startFlashcards = useCallback(() => {
    if (!words.length) return;
    setFlashcardWords([...words].sort(() => Math.random() - 0.5));
    setFlashcardIndex(0);
    setFlashcardFlipped(false);
    setFlashcardScore(0);
    setSubView("flashcards");
    hapticSelection();
  }, [words]);

  const filteredSurahs = useMemo(() => {
    if (!search.trim()) return surahs;
    const q = search.toLowerCase();
    return surahs.filter(s =>
      s.englishName.toLowerCase().includes(q) ||
      s.name.includes(q) ||
      (SURAH_NAMES_RU[s.number] || "").toLowerCase().includes(q) ||
      String(s.number) === q
    );
  }, [surahs, search]);

  // Progress calcs
  const totalLetters = ARABIC_ALPHABET.length;
  const learnedLettersCount = learnedLetters.size;
  const learnedRulesCount = learnedRules.size;
  const totalRules = TAJWEED_RULES.length;

  // ============================================================
  // TABS
  // ============================================================

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "alphabet", label: "Алфавит", icon: BookOpen },
    { id: "harakat", label: "Харакат", icon: Sparkles },
    { id: "makhraj", label: "Махарідж", icon: CircleDot },
    { id: "rules", label: "Правила", icon: GraduationCap },
    { id: "practice", label: "Практика", icon: Layers },
  ];

  // ============================================================
  // RENDER FUNCTIONS
  // ============================================================

  const renderHeader = () => (
    <div className="sticky top-0 z-10 glass" style={{ borderBottom: "1px solid var(--border-secondary)" }}>
      <div className="px-4 py-3 flex items-center justify-between">
        {subView !== "main" ? (
          <button onClick={goBack} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 active:scale-95 transition-all">
            <ArrowLeft size={20} className="t-text-s" />
            <span className="text-sm t-text-m">Назад</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 flex items-center justify-center">
              <GraduationCap size={18} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-bold t-text">Таджвид</h1>
              <p className="text-[10px] t-text-m">Учимся читать Коран правильно</p>
            </div>
          </div>
        )}
        <div className="text-[10px] t-text-m px-2 py-1 rounded-full" style={{ background: "var(--bg-card)" }}>
          {learnedLettersCount}/{totalLetters} букв · {learnedRulesCount}/{totalRules} правил
        </div>
      </div>

      {/* Tabs — only show on main view */}
      {subView === "main" && (
        <div className="flex overflow-x-auto px-2 pb-2 gap-1 no-scrollbar">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); hapticSelection(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  active ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "t-text-m hover:bg-white/5"
                }`}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ---- ALPHABET TAB ----
  const renderAlphabetMain = () => (
    <div className="px-4 py-4 space-y-4 animate-fade-in">
      {/* Progress */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold t-text">Изучено букв</span>
          <span className="text-xs text-emerald-400 font-medium">{learnedLettersCount}/{totalLetters}</span>
        </div>
        <div className="w-full h-2 rounded-full" style={{ background: "var(--progress-bg)" }}>
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" style={{ width: `${(learnedLettersCount / totalLetters) * 100}%` }} />
        </div>
      </div>

      {/* Levels (lessons) */}
      <div className="space-y-2">
        {LEARNING_LEVELS.map(level => {
          const letters = ARABIC_ALPHABET.slice(level.letterRange[0], level.letterRange[1] + 1);
          const learned = letters.filter(l => learnedLetters.has(String(l.id))).length;
          const total = letters.length;
          const complete = learned === total;
          return (
            <button
              key={level.id}
              onClick={() => { setSelectedLevel(level); setSubView("level"); hapticSelection(); }}
              className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 active:scale-[0.99] transition-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${complete ? "bg-emerald-500/20" : "bg-white/5"}`}>
                {complete ? <CheckCircle2 size={20} className="text-emerald-400" /> : <span>{level.icon}</span>}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold t-text">{level.title}</div>
                <div className="arabic-text text-base t-text-s">{level.subtitle}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs t-text-m">{learned}/{total}</span>
                <div className="w-16 h-1.5 rounded-full" style={{ background: "var(--progress-bg)" }}>
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(learned / total) * 100}%` }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quiz button */}
      <button
        onClick={generateQuiz}
        className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 active:scale-[0.97] transition-all border border-amber-500/20"
      >
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Trophy size={20} className="text-amber-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold t-text">Тест на знание</div>
          <div className="text-xs t-text-m">Буквы, харакат и правила</div>
        </div>
        {quizBest > 0 && <span className="text-xs text-amber-400">Лучший: {quizBest}</span>}
      </button>

      {/* Full alphabet grid */}
      <div>
        <h3 className="text-sm font-bold t-text mb-3">Все 28 букв</h3>
        <div className="grid grid-cols-4 gap-2">
          {ARABIC_ALPHABET.map(l => (
            <button
              key={l.id}
              onClick={() => { setSelectedLetter(l); setSubView("letter-detail"); hapticSelection(); }}
              className={`glass-card rounded-xl p-3 text-center active:scale-95 transition-all ${learnedLetters.has(String(l.id)) ? "border border-emerald-500/30" : ""}`}
            >
              <div className="arabic-text text-2xl t-text">{l.letter}</div>
              <div className="text-[10px] t-text-m mt-1">{l.nameRu}</div>
              {learnedLetters.has(String(l.id)) && <CheckCircle2 size={12} className="text-emerald-400 mx-auto mt-1" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLevel = () => {
    if (!selectedLevel) return null;
    const letters = ARABIC_ALPHABET.slice(selectedLevel.letterRange[0], selectedLevel.letterRange[1] + 1);
    return (
      <div className="px-4 py-4 space-y-4 animate-fade-in">
        <div className="text-center">
          <h2 className="text-lg font-bold t-text">{selectedLevel.title}</h2>
          <div className="arabic-text text-2xl text-emerald-400 mt-1">{selectedLevel.subtitle}</div>
        </div>
        <div className="space-y-3">
          {letters.map(l => (
            <button
              key={l.id}
              onClick={() => { setSelectedLetter(l); setSubView("letter-detail"); hapticSelection(); }}
              className="w-full glass-card rounded-2xl p-4 flex items-center gap-4 active:scale-[0.99] transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center">
                <span className="arabic-text text-3xl t-text">{l.letter}</span>
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold t-text">{l.nameRu} ({l.name})</div>
                <div className="text-xs t-text-m mt-0.5">{l.pronunciation}</div>
                <div className="flex gap-3 mt-1.5">
                  <span className="arabic-text text-sm text-amber-400">{l.withFatha}</span>
                  <span className="arabic-text text-sm text-sky-400">{l.withKasra}</span>
                  <span className="arabic-text text-sm text-rose-400">{l.withDamma}</span>
                </div>
              </div>
              {learnedLetters.has(String(l.id)) ? (
                <CheckCircle2 size={20} className="text-emerald-400" />
              ) : (
                <ChevronRight size={18} className="t-text-m" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderLetterDetail = () => {
    if (!selectedLetter) return null;
    const l = selectedLetter;
    return (
      <div className="px-4 py-4 space-y-4 animate-fade-in">
        {/* Main letter */}
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="arabic-text text-6xl t-text mb-2">{l.letter}</div>
          <div className="text-lg font-bold t-text">{l.nameRu}</div>
          <div className="text-sm t-text-s">{l.name} — [{l.transliteration}]</div>
          <button
            onClick={() => playLetterSound(l)}
            className="mt-3 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium inline-flex items-center gap-2 active:scale-95 transition-all"
          >
            <Volume2 size={16} /> Прослушать
          </button>
        </div>

        {/* Pronunciation */}
        <div className="glass-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold t-text mb-2">Произношение</h3>
          <p className="text-xs t-text-s leading-relaxed">{l.pronunciation}</p>
          <div className="mt-2 text-xs t-text-m">
            <span className="font-medium">Махрадж:</span> {l.makhrajRu}
          </div>
        </div>

        {/* Forms */}
        <div className="glass-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold t-text mb-3">Формы написания</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Отдельная", form: l.forms.isolated },
              { label: "Начальная", form: l.forms.initial },
              { label: "Средняя", form: l.forms.medial },
              { label: "Конечная", form: l.forms.final },
            ].map(f => (
              <div key={f.label} className="text-center p-2 rounded-xl" style={{ background: "var(--bg-card)" }}>
                <div className="arabic-text text-2xl t-text">{f.form}</div>
                <div className="text-[9px] t-text-m mt-1">{f.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Harakat on this letter */}
        <div className="glass-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold t-text mb-3">С огласовками</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Фатха", ar: l.withFatha, sound: `${l.nameRu.toLowerCase()}а`, color: "text-amber-400", bg: "bg-amber-500/15" },
              { label: "Касра", ar: l.withKasra, sound: `${l.nameRu.toLowerCase()}и`, color: "text-sky-400", bg: "bg-sky-500/15" },
              { label: "Дамма", ar: l.withDamma, sound: `${l.nameRu.toLowerCase()}у`, color: "text-rose-400", bg: "bg-rose-500/15" },
              { label: "Сукун", ar: l.withSukun, sound: `${l.nameRu.toLowerCase()}(·)`, color: "text-slate-400", bg: "bg-slate-500/15" },
              { label: "Шадда", ar: l.withShadda, sound: `${l.nameRu.toLowerCase()}${l.nameRu.toLowerCase()}`, color: "text-violet-400", bg: "bg-violet-500/15" },
            ].map(h => (
              <button
                key={h.label}
                onClick={() => playLetterSound(l, h.ar)}
                className={`${h.bg} rounded-xl p-3 text-center active:scale-95 transition-all`}
              >
                <div className={`arabic-text text-2xl ${h.color}`}>{h.ar}</div>
                <div className="text-[10px] t-text-m mt-1">{h.label}</div>
                <div className="text-[10px] t-text-s">{h.sound}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Mark as learned */}
        <button
          onClick={() => toggleLearnedLetter(String(l.id))}
          className={`w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] ${
            learnedLetters.has(String(l.id))
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
          }`}
        >
          {learnedLetters.has(String(l.id)) ? "Изучено ✓ (нажми чтобы убрать)" : "Отметить как изученное"}
        </button>
      </div>
    );
  };

  // ---- HARAKAT TAB ----
  const renderHarakatMain = () => (
    <div className="px-4 py-4 space-y-4 animate-fade-in">
      <div className="glass-card rounded-2xl p-4">
        <h3 className="text-sm font-semibold t-text mb-1">Огласовки (харакат)</h3>
        <p className="text-xs t-text-s">Диакритические знаки, определяющие произношение гласных звуков</p>
      </div>

      <div className="space-y-2.5">
        {HARAKAT.map(h => (
          <button
            key={h.id}
            onClick={() => { setSelectedHaraka(h); setSubView("haraka-detail"); hapticSelection(); }}
            className="w-full glass-card rounded-2xl p-4 flex items-center gap-4 active:scale-[0.99] transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center">
              <span className="arabic-text text-3xl t-text">{h.example}</span>
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold t-text">{h.name}</span>
                <span className="text-xs arabic-text text-amber-400">{h.nameAr}</span>
              </div>
              <div className="text-xs t-text-m mt-0.5">{h.description}</div>
              <div className="text-xs text-emerald-400 mt-0.5">Звук: «{h.sound}»</div>
            </div>
            <ChevronRight size={18} className="t-text-m" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderHarakaDetail = () => {
    if (!selectedHaraka) return null;
    const h = selectedHaraka;
    return (
      <div className="px-4 py-4 space-y-4 animate-fade-in">
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="arabic-text text-5xl text-amber-400 mb-2">{h.example}</div>
          <div className="text-lg font-bold t-text">{h.name}</div>
          <div className="text-sm arabic-text text-amber-400/70">{h.nameAr}</div>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <p className="text-sm t-text-s leading-relaxed">{h.description}</p>
          <div className="mt-2 text-sm">
            <span className="t-text-m">Звук:</span> <span className="text-emerald-400 font-bold">«{h.sound}»</span>
          </div>
          <div className="mt-1 text-xs t-text-m">
            Пример: <span className="arabic-text text-base t-text">{h.example}</span> = {h.exampleTranslit}
          </div>
        </div>

        {/* Show haraka on all letters */}
        <div className="glass-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold t-text mb-3">На всех буквах</h3>
          <div className="grid grid-cols-4 gap-2">
            {ARABIC_ALPHABET.map(l => {
              let withH = l.withFatha;
              if (h.id === "kasra" || h.id === "tanwin_kasr") withH = l.withKasra;
              else if (h.id === "damma" || h.id === "tanwin_damm") withH = l.withDamma;
              else if (h.id === "sukun") withH = l.withSukun;
              else if (h.id === "shadda") withH = l.withShadda;
              return (
                <button
                  key={l.id}
                  onClick={() => playLetterSound(l, withH)}
                  className="p-2 rounded-xl text-center active:scale-90 transition-all" style={{ background: "var(--bg-card)" }}
                >
                  <div className="arabic-text text-xl t-text">{withH}</div>
                  <div className="text-[9px] t-text-m">{l.nameRu}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ---- MAKHRAJ TAB ----
  const renderMakhrajMain = () => (
    <div className="px-4 py-4 space-y-4 animate-fade-in">
      <div className="glass-card rounded-2xl p-4">
        <h3 className="text-sm font-semibold t-text mb-1">Махариджы (точки артикуляции)</h3>
        <p className="text-xs t-text-s">Откуда произносится каждая буква — горло, язык или губы</p>
      </div>

      <div className="space-y-2.5">
        {MAKHRAJ_GROUPS.map(g => (
          <button
            key={g.id}
            onClick={() => { setSelectedMakhraj(g); setSubView("makhraj-detail"); hapticSelection(); }}
            className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 active:scale-[0.99] transition-all"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${g.color}20`, border: `1px solid ${g.color}40` }}>
              <CircleDot size={18} style={{ color: g.color }} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold t-text">{g.name}</div>
              <div className="text-xs arabic-text" style={{ color: g.color }}>{g.nameAr}</div>
              <div className="flex gap-2 mt-1 flex-wrap">
                {g.letters.map(l => (
                  <span key={l} className="arabic-text text-base t-text-s">{l}</span>
                ))}
              </div>
            </div>
            <ChevronRight size={18} className="t-text-m" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderMakhrajDetail = () => {
    if (!selectedMakhraj) return null;
    const g = selectedMakhraj;
    return (
      <div className="px-4 py-4 space-y-4 animate-fade-in">
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: `${g.color}20`, border: `2px solid ${g.color}40` }}>
            <CircleDot size={28} style={{ color: g.color }} />
          </div>
          <div className="text-lg font-bold t-text">{g.name}</div>
          <div className="text-sm arabic-text mt-1" style={{ color: g.color }}>{g.nameAr}</div>
          <div className="text-xs t-text-m mt-2">{g.area}</div>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <p className="text-sm t-text-s leading-relaxed">{g.description}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {g.letters.map(letter => {
            const full = ARABIC_ALPHABET.find(a => a.letter === letter);
            return (
              <button
                key={letter}
                onClick={() => { if (full) { setSelectedLetter(full); setSubView("letter-detail"); } hapticSelection(); }}
                className="glass-card rounded-xl p-4 text-center active:scale-95 transition-all"
              >
                <div className="arabic-text text-3xl t-text">{letter}</div>
                {full && <div className="text-[10px] t-text-m mt-1">{full.nameRu}</div>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ---- RULES TAB ----
  const renderRulesMain = () => (
    <div className="px-4 py-4 space-y-4 animate-fade-in">
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold t-text">Правила таджвида</span>
          <span className="text-xs text-emerald-400">{learnedRulesCount}/{totalRules}</span>
        </div>
        <div className="w-full h-2 rounded-full" style={{ background: "var(--progress-bg)" }}>
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" style={{ width: `${(learnedRulesCount / totalRules) * 100}%` }} />
        </div>
      </div>

      <div className="space-y-2.5">
        {TAJWEED_RULES.map((rule, idx) => (
          <button
            key={rule.id}
            onClick={() => { setSelectedRule(rule); setSubView("rule-detail"); hapticSelection(); }}
            className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 active:scale-[0.99] transition-all"
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: rule.color }} />
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold t-text">{rule.name}</span>
                <span className="text-xs arabic-text" style={{ color: rule.color }}>{rule.nameAr}</span>
              </div>
              <div className="text-xs t-text-m mt-0.5">{rule.description}</div>
            </div>
            {learnedRules.has(rule.id) && <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />}
            <ChevronRight size={16} className="t-text-m" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderRuleDetail = () => {
    if (!selectedRule) return null;
    const r = selectedRule;
    return (
      <div className="px-4 py-4 space-y-4 animate-fade-in">
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="w-6 h-6 rounded-full mx-auto mb-3" style={{ backgroundColor: r.color }} />
          <div className="text-lg font-bold t-text">{r.name}</div>
          <div className="text-sm arabic-text mt-1" style={{ color: r.color }}>{r.nameAr}</div>
          <div className="text-xs t-text-m mt-2">{r.description}</div>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold t-text mb-2">Подробно</h3>
          <p className="text-xs t-text-s leading-relaxed">{r.details}</p>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold t-text mb-2">Буквы</h3>
          <div className="arabic-text text-2xl text-center t-text" style={{ letterSpacing: "0.3em" }}>{r.letters}</div>
        </div>

        <div className={`rounded-2xl p-4 border ${r.bgClass}`}>
          <h3 className="text-sm font-semibold t-text mb-2">Пример</h3>
          <div className="arabic-text text-2xl text-center mb-1" style={{ color: r.color }}>{r.example}</div>
          <div className="text-center text-xs t-text-m">{r.exampleTranslit}</div>
        </div>

        <button
          onClick={() => toggleLearnedRule(r.id)}
          className={`w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] ${
            learnedRules.has(r.id)
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
          }`}
        >
          {learnedRules.has(r.id) ? "Изучено ✓" : "Отметить как изученное"}
        </button>
      </div>
    );
  };

  // ---- QUIZ ----
  const renderQuiz = () => {
    if (!quizQuestions.length) return null;
    const isFinished = quizIndex >= quizQuestions.length - 1 && quizAnswer !== null;
    const q = quizQuestions[quizIndex];

    if (isFinished && quizIndex === quizQuestions.length - 1) {
      const pct = Math.round((quizScore / quizQuestions.length) * 100);
      return (
        <div className="px-4 py-8 animate-fade-in">
          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">{pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "📚"}</div>
            <h2 className="text-lg font-bold t-text mb-1">Результат</h2>
            <p className="text-2xl font-bold text-emerald-400 mb-1">{quizScore}/{quizQuestions.length}</p>
            <p className="text-xs t-text-m mb-4">{pct >= 80 ? "Отлично!" : pct >= 50 ? "Хорошо, но можно лучше!" : "Продолжайте учиться!"}</p>
            <div className="flex gap-2">
              <button onClick={() => { generateQuiz(); }} className="flex-1 py-2.5 rounded-xl text-sm font-medium border t-border t-text-s active:scale-[0.97]">
                <RotateCcw size={14} className="inline mr-1" /> Ещё раз
              </button>
              <button onClick={goBack} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-600 to-teal-600 text-white active:scale-[0.97]">
                Готово
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 py-4 space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--progress-bg)" }}>
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all" style={{ width: `${((quizIndex + 1) / quizQuestions.length) * 100}%` }} />
          </div>
          <span className="text-xs t-text-m">{quizIndex + 1}/{quizQuestions.length}</span>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm font-semibold t-text leading-relaxed">{q.question}</p>
        </div>

        <div className="space-y-2">
          {q.options.map((opt: string) => {
            let cls = "border t-border";
            if (quizAnswer) {
              if (opt === q.correct) cls = "border-emerald-500 bg-emerald-500/15 text-emerald-400";
              else if (opt === quizAnswer && opt !== q.correct) cls = "border-red-500 bg-red-500/15 text-red-400";
            }
            return (
              <button
                key={opt}
                onClick={() => handleQuizAnswer(opt)}
                disabled={!!quizAnswer}
                className={`w-full p-3.5 rounded-xl text-sm text-left transition-all active:scale-[0.99] ${cls}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {quizAnswer && (
          <button
            onClick={nextQuizQuestion}
            className="w-full py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-600 to-teal-600 text-white active:scale-[0.97] transition-all"
          >
            {quizIndex < quizQuestions.length - 1 ? "Следующий вопрос" : "Результат"}
          </button>
        )}
      </div>
    );
  };

  // ---- PRACTICE TAB ----
  const renderPracticeMain = () => (
    <div className="px-4 py-4 space-y-4 animate-fade-in">
      <div className="glass-card rounded-2xl p-4">
        <h3 className="text-sm font-semibold t-text mb-1">Практика на аятах</h3>
        <p className="text-xs t-text-s">Выберите суру, нажмите на аят — пословный разбор с переводом и карточками</p>
      </div>

      <button
        onClick={() => { setSubView("surah-list"); hapticSelection(); }}
        className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 active:scale-[0.97] transition-all"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/30 to-blue-500/20 flex items-center justify-center">
          <BookOpen size={20} className="text-sky-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold t-text">Пословный разбор</div>
          <div className="text-xs t-text-m">114 сур · каждое слово с переводом</div>
        </div>
        <ChevronRight size={18} className="t-text-m" />
      </button>
    </div>
  );

  const renderSurahList = () => (
    <div className="px-4 py-4 space-y-3 animate-fade-in">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 t-text-m" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск суры..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm t-text" style={{ background: "var(--bg-input)", border: "1px solid var(--border-input)" }} />
      </div>
      <div className="space-y-1.5">
        {filteredSurahs.map(s => (
          <button key={s.number} onClick={() => loadSurah(s.number)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 active:scale-[0.99] transition-all" style={{ borderBottom: "1px solid var(--border-primary)" }}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center text-xs font-bold text-emerald-400">{s.number}</div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium t-text">{SURAH_NAMES_RU[s.number] || s.englishName}</div>
              <div className="text-[11px] t-text-m">{s.englishName} · {s.numberOfAyahs} аятов</div>
            </div>
            <div className="arabic-text text-base t-text-s">{s.name}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderSurahRead = () => {
    if (!arabicAyahs || !translationAyahs) return null;
    return (
      <div className="px-4 py-4 space-y-4 animate-fade-in">
        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="arabic-text text-2xl text-emerald-400 mb-1">{arabicAyahs.name}</div>
          <div className="text-sm font-semibold t-text">{SURAH_NAMES_RU[arabicAyahs.number] || arabicAyahs.englishName}</div>
          <div className="text-xs t-text-m mt-0.5">{arabicAyahs.numberOfAyahs} аятов</div>
        </div>
        <p className="text-xs t-text-m">Нажмите на аят для пословного разбора</p>
        <div className="space-y-3">
          {arabicAyahs.ayahs.map((ayah, idx) => (
            <button key={ayah.numberInSurah} onClick={() => loadWords(arabicAyahs.number, ayah.numberInSurah)} className="w-full glass-card rounded-2xl p-4 text-left active:scale-[0.99] transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0">{ayah.numberInSurah}</div>
                <ChevronRight size={16} className="t-text-m flex-shrink-0 mt-1" />
              </div>
              <div className="arabic-text text-lg t-text leading-loose mb-2">{ayah.text}</div>
              {translationAyahs.ayahs[idx] && <div className="text-xs t-text-s leading-relaxed">{translationAyahs.ayahs[idx].text}</div>}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderWords = () => {
    if (wordsLoading) return <div className="flex items-center justify-center py-32"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>;
    return (
      <div className="px-4 py-4 space-y-4 animate-fade-in">
        <div className="glass-card rounded-2xl p-4">
          <div className="text-sm font-semibold t-text mb-1">{SURAH_NAMES_RU[selectedSurah || 0]} · Аят {selectedAyah}</div>
          <div className="text-xs t-text-m">{words.length} слов</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowTransliteration(!showTransliteration); hapticSelection(); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${showTransliteration ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "border t-border t-text-m"}`}>
            {showTransliteration ? <Eye size={14} /> : <EyeOff size={14} />} Транслит
          </button>
          <button onClick={() => { setShowTranslation(!showTranslation); hapticSelection(); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${showTranslation ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "border t-border t-text-m"}`}>
            {showTranslation ? <Eye size={14} /> : <EyeOff size={14} />} Перевод
          </button>
          <button onClick={startFlashcards} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-300 border border-violet-500/30 active:scale-[0.97] transition-all">
            <GraduationCap size={14} /> Карточки
          </button>
        </div>
        <div className="space-y-2">
          {words.map(w => {
            const key = `${selectedSurah}:${selectedAyah}:${w.position}`;
            const reps = wordProgress[key] || 0;
            return (
              <div key={w.position} className="glass-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400">{w.position}</span>
                    {reps > 0 && <div className="flex items-center gap-0.5 text-amber-400"><Star size={10} fill="currentColor" /><span className="text-[10px]">{reps}</span></div>}
                  </div>
                  <button onClick={() => playWordAudio(w)} className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center active:scale-90 transition-all">
                    {playingWord === w.position ? <Pause size={12} className="text-emerald-400" /> : <Play size={12} className="text-emerald-400 ml-0.5" />}
                  </button>
                </div>
                <div className="arabic-text text-2xl text-center t-text mb-2">{w.arabic}</div>
                {showTransliteration && w.transliteration && <div className="text-center text-sm text-emerald-400/80 mb-1">{w.transliteration}</div>}
                {showTranslation && w.translation && <div className="text-center text-xs t-text-s">{w.translation}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFlashcards = () => {
    if (!flashcardWords.length) return null;
    const current = flashcardWords[flashcardIndex];
    const isLast = flashcardIndex >= flashcardWords.length - 1;
    const finished = isLast && flashcardFlipped;

    if (finished) {
      return (
        <div className="px-4 py-8 animate-fade-in">
          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-lg font-bold t-text mb-2">Отлично!</h2>
            <p className="text-sm text-emerald-400 font-semibold mb-4">{flashcardScore}/{flashcardWords.length} слов</p>
            <div className="flex gap-2">
              <button onClick={() => { setFlashcardIndex(0); setFlashcardFlipped(false); setFlashcardScore(0); }} className="flex-1 py-2.5 rounded-xl text-sm border t-border t-text-s"><RotateCcw size={14} className="inline mr-1" />Ещё раз</button>
              <button onClick={goBack} className="flex-1 py-2.5 rounded-xl text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white">Готово</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 py-4 space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--progress-bg)" }}>
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all" style={{ width: `${((flashcardIndex + 1) / flashcardWords.length) * 100}%` }} />
          </div>
          <span className="text-xs t-text-m">{flashcardIndex + 1}/{flashcardWords.length}</span>
        </div>
        <button onClick={() => { setFlashcardFlipped(!flashcardFlipped); hapticSelection(); }} className="w-full min-h-[260px] glass-card rounded-2xl p-6 flex flex-col items-center justify-center active:scale-[0.99] transition-all">
          <div className="arabic-text text-4xl t-text mb-4">{current.arabic}</div>
          {flashcardFlipped ? (
            <div className="space-y-2 animate-fade-in">
              {current.transliteration && <div className="text-base text-emerald-400">{current.transliteration}</div>}
              {current.translation && <div className="text-sm t-text-s">{current.translation}</div>}
            </div>
          ) : (
            <div className="text-xs t-text-m">Нажмите, чтобы увидеть перевод</div>
          )}
        </button>
        {flashcardFlipped && (
          <div className="flex gap-2 animate-fade-in">
            <button onClick={() => { if (!isLast) { setFlashcardIndex(i => i + 1); setFlashcardFlipped(false); } hapticSelection(); }} className="flex-1 py-3 rounded-xl text-sm border border-red-500/30 text-red-400 bg-red-500/10 active:scale-[0.97]">Не знаю</button>
            <button onClick={() => {
              setFlashcardScore(s => s + 1);
              const key = `${selectedSurah}:${selectedAyah}:${current.position}`;
              const next = { ...wordProgress, [key]: (wordProgress[key] || 0) + 1 };
              setWordProgress(next);
              saveObj(SK.WORD_PROGRESS, next);
              if (!isLast) { setFlashcardIndex(i => i + 1); setFlashcardFlipped(false); }
              else { storage.addExtraPoints(POINTS.QURAN); scheduleSyncPush(); setFlashcardFlipped(true); }
              hapticSelection();
            }} className="flex-1 py-3 rounded-xl text-sm border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 active:scale-[0.97]">Знаю ✓</button>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================

  const renderContent = () => {
    // Sub-views that override tabs
    if (subView === "letter-detail") return renderLetterDetail();
    if (subView === "level") return renderLevel();
    if (subView === "quiz") return renderQuiz();
    if (subView === "haraka-detail") return renderHarakaDetail();
    if (subView === "makhraj-detail") return renderMakhrajDetail();
    if (subView === "rule-detail") return renderRuleDetail();
    if (subView === "surah-list") return renderSurahList();
    if (subView === "surah-read") return renderSurahRead();
    if (subView === "words") return renderWords();
    if (subView === "flashcards") return renderFlashcards();

    // Tab main views
    if (tab === "alphabet") return renderAlphabetMain();
    if (tab === "harakat") return renderHarakatMain();
    if (tab === "makhraj") return renderMakhrajMain();
    if (tab === "rules") return renderRulesMain();
    if (tab === "practice") return renderPracticeMain();
    return null;
  };

  return (
    <div className="pb-24">
      {renderHeader()}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={24} className="animate-spin text-emerald-400" />
        </div>
      ) : renderContent()}
    </div>
  );
}
