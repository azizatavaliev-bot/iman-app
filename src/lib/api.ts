// =============================================================================
// IMAN App - API Client
// Connects to free external APIs: Aladhan (Prayer Times, Qibla), Al-Quran Cloud
// Includes hardcoded 40 Nawawi hadiths collection
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export interface QiblaDirection {
  latitude: number;
  longitude: number;
  direction: number; // bearing in degrees
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
  hizbQuarter: number;
}

export interface SurahDetail {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  ayahs: Ayah[];
}

export interface AyahWithTranslation {
  number: number;
  arabic: string;
  translation: string;
  numberInSurah: number;
  surahNumber: number;
  surahName: string;
  surahEnglishName: string;
}

export interface Hadith {
  id: number;
  number: number;
  arabic: string;
  russian: string;
  narrator: string;
  source: string;
}

// -----------------------------------------------------------------------------
// Cache Utility (localStorage, tiered TTL for scalability)
// -----------------------------------------------------------------------------

// Tiered TTL: immutable data cached longer to reduce API load
const CACHE_TTL_SHORT = 6 * 60 * 60 * 1000; // 6 hours (reciters list)
const CACHE_TTL_MEDIUM = 24 * 60 * 60 * 1000; // 24 hours (prayer times — same date+city)
const CACHE_TTL_LONG = 7 * 24 * 60 * 60 * 1000; // 7 days (Quran text, hadiths — immutable)

// Default TTL for getCached without explicit ttl
const CACHE_TTL = CACHE_TTL_MEDIUM;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCached<T>(key: string, ttl: number = CACHE_TTL): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`iman_cache_${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttl) {
      localStorage.removeItem(`iman_cache_${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(`iman_cache_${key}`, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable - silently ignore
  }
}

// -----------------------------------------------------------------------------
// Generic Fetch Helper
// -----------------------------------------------------------------------------

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}

// -----------------------------------------------------------------------------
// 1. Prayer Times - Aladhan API
// -----------------------------------------------------------------------------

interface AladhanTimingsResponse {
  code: number;
  status: string;
  data: {
    timings: Record<string, string>;
    date: {
      readable: string;
      timestamp: string;
      hijri: {
        date: string;
        day: string;
        month: { number: number; en: string; ar: string };
        year: string;
        designation: { abbreviated: string; expanded: string };
      };
      gregorian: {
        date: string;
        day: string;
        month: { number: number; en: string };
        year: string;
      };
    };
  };
}

export async function getPrayerTimes(
  lat: number,
  lng: number,
  date?: Date,
): Promise<PrayerTimes> {
  const d = date || new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const dateStr = `${dd}-${mm}-${yyyy}`;

  const cacheKey = `prayer_${lat}_${lng}_${dateStr}`;
  const cached = getCached<PrayerTimes>(cacheKey, CACHE_TTL_LONG);
  if (cached) return cached;

  const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=2`;
  const response = await fetchJSON<AladhanTimingsResponse>(url);

  const timings = response.data.timings;
  const result: PrayerTimes = {
    Fajr: timings.Fajr,
    Sunrise: timings.Sunrise,
    Dhuhr: timings.Dhuhr,
    Asr: timings.Asr,
    Maghrib: timings.Maghrib,
    Isha: timings.Isha,
  };

  setCache(cacheKey, result);
  return result;
}

// -----------------------------------------------------------------------------
// 2. Qibla Direction - Aladhan API
// -----------------------------------------------------------------------------

interface AladhanQiblaResponse {
  code: number;
  status: string;
  data: {
    latitude: number;
    longitude: number;
    direction: number;
  };
}

export async function getQiblaDirection(
  lat: number,
  lng: number,
): Promise<QiblaDirection> {
  const cacheKey = `qibla_${lat}_${lng}`;
  const cached = getCached<QiblaDirection>(cacheKey, CACHE_TTL_LONG);
  if (cached) return cached;

  const url = `https://api.aladhan.com/v1/qibla/${lat}/${lng}`;
  const response = await fetchJSON<AladhanQiblaResponse>(url);

  const result: QiblaDirection = {
    latitude: response.data.latitude,
    longitude: response.data.longitude,
    direction: response.data.direction,
  };

  setCache(cacheKey, result);
  return result;
}

// -----------------------------------------------------------------------------
// 3. Quran - Al-Quran Cloud API
// -----------------------------------------------------------------------------

interface AlQuranSurahListResponse {
  code: number;
  status: string;
  data: Surah[];
}

interface AlQuranSurahDetailResponse {
  code: number;
  status: string;
  data: SurahDetail;
}

export async function getSurahList(): Promise<Surah[]> {
  const cacheKey = "surah_list";
  const cached = getCached<Surah[]>(cacheKey, CACHE_TTL_LONG);
  if (cached) return cached;

  const url = "https://api.alquran.cloud/v1/surah";
  const response = await fetchJSON<AlQuranSurahListResponse>(url);

  const result = response.data.map((s) => ({
    number: s.number,
    name: s.name,
    englishName: s.englishName,
    englishNameTranslation: s.englishNameTranslation,
    numberOfAyahs: s.numberOfAyahs,
    revelationType: s.revelationType,
  }));

  setCache(cacheKey, result);
  return result;
}

export async function getSurah(number: number): Promise<SurahDetail> {
  if (number < 1 || number > 114) {
    throw new Error("Surah number must be between 1 and 114");
  }

  const cacheKey = `surah_${number}`;
  const cached = getCached<SurahDetail>(cacheKey, CACHE_TTL_LONG);
  if (cached) return cached;

  const url = `https://api.alquran.cloud/v1/surah/${number}`;
  const response = await fetchJSON<AlQuranSurahDetailResponse>(url);

  setCache(cacheKey, response.data);
  return response.data;
}

export async function getSurahTranslation(
  number: number,
): Promise<SurahDetail> {
  if (number < 1 || number > 114) {
    throw new Error("Surah number must be between 1 and 114");
  }

  const cacheKey = `surah_translation_ru_${number}`;
  const cached = getCached<SurahDetail>(cacheKey, CACHE_TTL_LONG);
  if (cached) return cached;

  const url = `https://api.alquran.cloud/v1/surah/${number}/ru.kuliev`;
  const response = await fetchJSON<AlQuranSurahDetailResponse>(url);

  setCache(cacheKey, response.data);
  return response.data;
}

export async function getSurahTransliteration(
  number: number,
): Promise<SurahDetail> {
  if (number < 1 || number > 114) {
    throw new Error("Surah number must be between 1 and 114");
  }

  const cacheKey = `surah_translit_${number}`;
  const cached = getCached<SurahDetail>(cacheKey, CACHE_TTL_LONG);
  if (cached) return cached;

  const url = `https://api.alquran.cloud/v1/surah/${number}/en.transliteration`;
  const response = await fetchJSON<AlQuranSurahDetailResponse>(url);

  setCache(cacheKey, response.data);
  return response.data;
}

export async function getRandomAyah(): Promise<AyahWithTranslation> {
  // Pick a random surah and ayah
  const surahNumber = Math.floor(Math.random() * 114) + 1;

  // Fetch both Arabic and Russian in parallel
  const [arabic, russian] = await Promise.all([
    getSurah(surahNumber),
    getSurahTranslation(surahNumber),
  ]);

  const ayahIndex = Math.floor(Math.random() * arabic.ayahs.length);
  const arabicAyah = arabic.ayahs[ayahIndex];
  const russianAyah = russian.ayahs[ayahIndex];

  return {
    number: arabicAyah.number,
    arabic: arabicAyah.text,
    translation: russianAyah.text,
    numberInSurah: arabicAyah.numberInSurah,
    surahNumber: arabic.number,
    surahName: arabic.name,
    surahEnglishName: arabic.englishName,
  };
}

// -----------------------------------------------------------------------------
// 4. Hadiths - 40 Nawawi Collection (hardcoded)
// -----------------------------------------------------------------------------

const NAWAWI_HADITHS: Hadith[] = [
  {
    id: 1,
    number: 1,
    arabic:
      "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى، فَمَنْ كَانَتْ هِجْرَتُهُ إلَى اللَّهِ وَرَسُولِهِ فَهِجْرَتُهُ إلَى اللَّهِ وَرَسُولِهِ، وَمَنْ كَانَتْ هِجْرَتُهُ لِدُنْيَا يُصِيبُهَا أَوْ امْرَأَةٍ يَنْكِحُهَا فَهِجْرَتُهُ إلَى مَا هَاجَرَ إلَيْهِ",
    russian:
      "Поистине, дела оцениваются только по намерениям, и, поистине, каждому человеку достанется лишь то, что он намеревался обрести. Тот, чья хиджра была ради Аллаха и Его Посланника, совершил хиджру ради Аллаха и Его Посланника, а тот, чья хиджра была ради мирской выгоды или ради женщины, на которой он хотел жениться, совершил хиджру лишь к тому, к чему он стремился.",
    narrator: "Умар ибн аль-Хаттаб (да будет доволен им Аллах)",
    source: "Аль-Бухари, Муслим",
  },
  {
    id: 2,
    number: 2,
    arabic:
      "بَيْنَمَا نَحْنُ جُلُوسٌ عِنْدَ رَسُولِ اللَّهِ صلى الله عليه وسلم ذَاتَ يَوْمٍ إذْ طَلَعَ عَلَيْنَا رَجُلٌ شَدِيدُ بَيَاضِ الثِّيَابِ شَدِيدُ سَوَادِ الشَّعْرِ",
    russian:
      "Однажды, когда мы сидели у Посланника Аллаха (мир ему и благословение Аллаха), к нам подошёл человек в ослепительно белой одежде и с иссиня-чёрными волосами. Он спросил о столпах Ислама, Имана и Ихсана, а также о признаках Судного дня. Пророк ответил на все вопросы, а затем сказал: «Это был Джибриль, который пришёл обучить вас вашей религии».",
    narrator: "Умар ибн аль-Хаттаб (да будет доволен им Аллах)",
    source: "Муслим",
  },
  {
    id: 3,
    number: 3,
    arabic:
      "بُنِيَ الإسْلامُ عَلَى خَمْسٍ: شَهَادَةِ أَنْ لَا إلَهَ إلَّا اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ، وَإِقَامِ الصَّلَاةِ، وَإِيتَاءِ الزَّكَاةِ، وَحَجِّ الْبَيْتِ، وَصَوْمِ رَمَضَانَ",
    russian:
      "Ислам воздвигнут на пяти столпах: свидетельстве о том, что нет бога, кроме Аллаха, и что Мухаммад -- Посланник Аллаха, совершении молитвы, выплате закята, совершении хаджа к Дому и соблюдении поста в Рамадан.",
    narrator: "Абдулла ибн Умар (да будет доволен ими обоими Аллах)",
    source: "Аль-Бухари, Муслим",
  },
  {
    id: 4,
    number: 5,
    arabic: "مَنْ أَحْدَثَ فِي أَمْرِنَا هَذَا مَا لَيْسَ مِنْهُ فَهُوَ رَدٌّ",
    russian:
      "Тот, кто привнесёт в наше дело (религию) то, что не имеет к нему отношения, это будет отвергнуто.",
    narrator: "Аиша (да будет доволен ею Аллах)",
    source: "Аль-Бухари, Муслим",
  },
  {
    id: 5,
    number: 6,
    arabic:
      "إنَّ الْحَلالَ بَيِّنٌ وَإِنَّ الْحَرَامَ بَيِّنٌ، وَبَيْنَهُمَا أُمُورٌ مُشْتَبِهَاتٌ لَا يَعْلَمُهُنَّ كَثِيرٌ مِنْ النَّاسِ، فَمَنْ اتَّقَى الشُّبُهَاتِ فَقَدْ اسْتَبْرَأَ لِدِينِهِ وَعِرْضِهِ، وَمَنْ وَقَعَ فِي الشُّبُهَاتِ وَقَعَ فِي الْحَرَامِ",
    russian:
      "Поистине, дозволенное очевидно и запретное очевидно, а между ними находятся сомнительные вещи, которые многие люди не знают. Тот, кто остерегается сомнительного, оберегает свою религию и свою честь. А тот, кто впадает в сомнительное, впадает в запретное.",
    narrator: "Ан-Нуман ибн Башир (да будет доволен ими обоими Аллах)",
    source: "Аль-Бухари, Муслим",
  },
  {
    id: 6,
    number: 7,
    arabic: "الدِّينُ النَّصِيحَةُ",
    russian:
      "Религия -- это искренность (доброе отношение). Мы спросили: По отношению к кому? Он ответил: По отношению к Аллаху, Его Книге, Его Посланнику, предводителям мусульман и их простому народу.",
    narrator: "Тамим ад-Дари (да будет доволен им Аллах)",
    source: "Муслим",
  },
  {
    id: 7,
    number: 9,
    arabic:
      "مَا نَهَيْتُكُمْ عَنْهُ فَاجْتَنِبُوهُ، وَمَا أَمَرْتُكُمْ بِهِ فَأْتُوا مِنْهُ مَا اسْتَطَعْتُمْ",
    russian:
      "То, что я вам запретил, избегайте этого. А то, что я вам повелел, выполняйте из этого столько, сколько сможете.",
    narrator: "Абу Хурайра (да будет доволен им Аллах)",
    source: "Аль-Бухари, Муслим",
  },
  {
    id: 8,
    number: 10,
    arabic:
      "إنَّ اللَّهَ طَيِّبٌ لَا يَقْبَلُ إلَّا طَيِّبًا، وَإِنَّ اللَّهَ أَمَرَ الْمُؤْمِنِينَ بِمَا أَمَرَ بِهِ الْمُرْسَلِينَ",
    russian:
      "Поистине, Аллах -- Благой и принимает только благое. И, поистине, Аллах повелел верующим то же, что повелел посланникам.",
    narrator: "Абу Хурайра (да будет доволен им Аллах)",
    source: "Муслим",
  },
  {
    id: 9,
    number: 12,
    arabic: "مِنْ حُسْنِ إسْلَامِ الْمَرْءِ تَرْكُهُ مَا لَا يَعْنِيهِ",
    russian:
      "Из совершенства ислама человека -- оставление им того, что его не касается.",
    narrator: "Абу Хурайра (да будет доволен им Аллах)",
    source: "Ат-Тирмизи, Ибн Маджа",
  },
  {
    id: 10,
    number: 13,
    arabic:
      "لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ",
    russian:
      "Никто из вас не уверует по-настоящему, пока не пожелает своему брату того же, чего желает самому себе.",
    narrator: "Анас ибн Малик (да будет доволен им Аллах)",
    source: "Аль-Бухари, Муслим",
  },
  {
    id: 11,
    number: 15,
    arabic:
      "مَنْ كَانَ يُؤْمِنُ بِاَللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ، وَمَنْ كَانَ يُؤْمِنُ بِاَللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيُكْرِمْ جَارَهُ، وَمَنْ كَانَ يُؤْمِنُ بِاَللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيُكْرِمْ ضَيْفَهُ",
    russian:
      "Пусть тот, кто верует в Аллаха и в Последний день, говорит благое или молчит. Пусть тот, кто верует в Аллаха и в Последний день, оказывает почёт своему соседу. И пусть тот, кто верует в Аллаха и в Последний день, оказывает почёт своему гостю.",
    narrator: "Абу Хурайра (да будет доволен им Аллах)",
    source: "Аль-Бухари, Муслим",
  },
  {
    id: 12,
    number: 16,
    arabic: "لَا تَغْضَبْ، فَرَدَّدَ مِرَارًا، قَالَ: لَا تَغْضَبْ",
    russian:
      "Не гневайся! Человек повторил свою просьбу несколько раз, и каждый раз Пророк (мир ему и благословение Аллаха) говорил: Не гневайся!",
    narrator: "Абу Хурайра (да будет доволен им Аллах)",
    source: "Аль-Бухари",
  },
  {
    id: 13,
    number: 17,
    arabic:
      "إنَّ اللَّهَ كَتَبَ الْإِحْسَانَ عَلَى كُلِّ شَيْءٍ، فَإِذَا قَتَلْتُمْ فَأَحْسِنُوا الْقِتْلَةَ، وَإِذَا ذَبَحْتُمْ فَأَحْسِنُوا الذِّبْحَةَ",
    russian:
      "Поистине, Аллах предписал совершенство (ихсан) во всякой вещи. Если вы убиваете, то убивайте наилучшим образом, и если вы совершаете заклание, то совершайте его наилучшим образом.",
    narrator: "Шаддад ибн Аус (да будет доволен им Аллах)",
    source: "Муслим",
  },
  {
    id: 14,
    number: 18,
    arabic:
      "اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ، وَأَتْبِعْ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا، وَخَالِقْ النَّاسَ بِخُلُقٍ حَسَنٍ",
    russian:
      "Бойся Аллаха, где бы ты ни был, и пусть за каждым плохим поступком следует хороший, который сотрёт его, и относись к людям с хорошим нравом.",
    narrator: "Абу Зарр и Муаз ибн Джабаль (да будет доволен ими Аллах)",
    source: "Ат-Тирмизи",
  },
  {
    id: 15,
    number: 19,
    arabic:
      "يَا غُلَامُ، إنِّي أُعَلِّمُكَ كَلِمَاتٍ: احْفَظْ اللَّهَ يَحْفَظْكَ، احْفَظْ اللَّهَ تَجِدْهُ تُجَاهَكَ، إذَا سَأَلْتَ فَاسْأَلْ اللَّهَ، وَإِذَا اسْتَعَنْتَ فَاسْتَعِنْ بِاَللَّهِ",
    russian:
      "О мальчик! Я научу тебя нескольким словам: помни об Аллахе -- и Он будет хранить тебя. Помни об Аллахе -- и ты обнаружишь Его перед собой. Если просишь -- проси у Аллаха. Если ищешь помощи -- ищи помощи у Аллаха.",
    narrator: "Абдулла ибн Аббас (да будет доволен ими обоими Аллах)",
    source: "Ат-Тирмизи",
  },
  {
    id: 16,
    number: 20,
    arabic:
      "إنَّ مِمَّا أَدْرَكَ النَّاسُ مِنْ كَلَامِ النُّبُوَّةِ الْأُولَى: إذَا لَمْ تَسْتَحِ فَاصْنَعْ مَا شِئْتَ",
    russian:
      "Из того, что люди усвоили из слов прежних пророков: если ты не стыдишься, делай что хочешь.",
    narrator: "Абу Масуд Укба ибн Амр аль-Ансари (да будет доволен им Аллах)",
    source: "Аль-Бухари",
  },
  {
    id: 17,
    number: 21,
    arabic: "قُلْ آمَنْتُ بِاَللَّهِ ثُمَّ اسْتَقِمْ",
    russian:
      "Скажи: «Я верую в Аллаха», — а затем будь стоек (на прямом пути).",
    narrator: "Суфьян ибн Абдулла (да будет доволен им Аллах)",
    source: "Муслим",
  },
  {
    id: 18,
    number: 22,
    arabic:
      "أَرَأَيْتَ إذَا صَلَّيْتُ الْمَكْتُوبَاتِ، وَصُمْتُ رَمَضَانَ، وَأَحْلَلْتُ الْحَلَالَ، وَحَرَّمْتُ الْحَرَامَ، وَلَمْ أَزِدْ عَلَى ذَلِكَ شَيْئًا، أَأَدْخُلُ الْجَنَّةَ؟ قَالَ: نَعَمْ",
    russian:
      "Скажи мне, если я буду совершать обязательные молитвы, поститься в Рамадан, считать дозволенным дозволенное и запретным запретное и не буду прибавлять к этому ничего, войду ли я в Рай? Он ответил: Да.",
    narrator:
      "Абу Абдулла Джабир ибн Абдулла аль-Ансари (да будет доволен ими обоими Аллах)",
    source: "Муслим",
  },
  {
    id: 19,
    number: 23,
    arabic:
      "الطُّهُورُ شَطْرُ الْإِيمَانِ، وَالْحَمْدُ لِلَّهِ تَمْلَأُ الْمِيزَانَ",
    russian:
      "Чистота — половина веры. Слова «Хвала Аллаху» заполняют Весы, а слова «Пречист Аллах и хвала Аллаху» заполняют пространство между небесами и землёй.",
    narrator:
      "Абу Малик аль-Харис ибн Асим аль-Ашари (да будет доволен им Аллах)",
    source: "Муслим",
  },
  {
    id: 20,
    number: 24,
    arabic:
      "يَا عِبَادِي إنِّي حَرَّمْتُ الظُّلْمَ عَلَى نَفْسِي وَجَعَلْتُهُ بَيْنَكُمْ مُحَرَّمًا فَلَا تَظَالَمُوا",
    russian:
      "О рабы Мои! Поистине, Я запретил несправедливость Себе и сделал её запретной между вами, так не притесняйте же друг друга.",
    narrator: "Абу Зарр аль-Гифари (да будет доволен им Аллах) — хадис кудси",
    source: "Муслим",
  },
  {
    id: 21,
    number: 25,
    arabic:
      "إنَّ بِكُلِّ تَسْبِيحَةٍ صَدَقَةً، وَكُلِّ تَكْبِيرَةٍ صَدَقَةً، وَكُلِّ تَحْمِيدَةٍ صَدَقَةً",
    russian:
      "Каждое произнесение «Субхан Аллах» — садака, каждое произнесение «Аллаху Акбар» — садака, каждое произнесение «Альхамдулиллях» — садака, каждое побуждение к одобряемому — садака, и каждое удержание от порицаемого — садака.",
    narrator: "Абу Зарр (да будет доволен им Аллах)",
    source: "Муслим",
  },
  {
    id: 22,
    number: 26,
    arabic: "كُلُّ سُلَامَى مِنْ النَّاسِ عَلَيْهِ صَدَقَةٌ",
    russian:
      "Каждый сустав человека обязан давать садаку каждый день, когда встаёт солнце: рассудить двоих — садака, помочь человеку сесть на верховое животное или поднять поклажу — садака, доброе слово — садака, каждый шаг к молитве — садака, убрать с дороги то, что причиняет вред, — садака.",
    narrator: "Абу Хурайра (да будет доволен им Аллах)",
    source: "Аль-Бухари, Муслим",
  },
  {
    id: 23,
    number: 27,
    arabic:
      "الْبِرُّ حُسْنُ الْخُلُقِ، وَالْإِثْمُ مَا حَاكَ فِي نَفْسِكَ وَكَرِهْتَ أَنْ يَطَّلِعَ عَلَيْهِ النَّاسُ",
    russian:
      "Благочестие — это хороший нрав, а грех — это то, что шевелится в твоей душе, и ты не хочешь, чтобы люди узнали об этом.",
    narrator: "Ан-Наввас ибн Сам'ан (да будет доволен им Аллах)",
    source: "Муслим",
  },
  {
    id: 24,
    number: 28,
    arabic:
      "أُوصِيكُمْ بِتَقْوَى اللَّهِ عَزَّ وَجَلَّ وَالسَّمْعِ وَالطَّاعَةِ",
    russian:
      "Завещаю вам богобоязненность перед Аллахом, слушание и повиновение, даже если над вами поставят раба. Тот из вас, кто доживёт, увидит много разногласий. Придерживайтесь моей Сунны и Сунны праведных халифов. Держитесь за неё коренными зубами.",
    narrator: "Абу Наджих аль-Ирбад ибн Сария (да будет доволен им Аллах)",
    source: "Абу Дауд, Ат-Тирмизи",
  },
  {
    id: 25,
    number: 29,
    arabic:
      "يَا رَسُولَ اللَّهِ، أَخْبِرْنِي بِعَمَلٍ يُدْخِلُنِي الْجَنَّةَ وَيُبَاعِدُنِي عَنْ النَّارِ",
    russian:
      "О Посланник Аллаха, расскажи мне о деле, которое введёт меня в Рай и отдалит от Огня. Он ответил: Поклоняйся Аллаху и не придавай Ему сотоварищей, совершай молитву, выплачивай закят, постись в Рамадан и соверши хадж к Дому.",
    narrator: "Муаз ибн Джабаль (да будет доволен им Аллах)",
    source: "Ат-Тирмизи",
  },
  {
    id: 26,
    number: 30,
    arabic:
      "إنَّ اللَّهَ تَعَالَى فَرَضَ فَرَائِضَ فَلَا تُضَيِّعُوهَا، وَحَدَّ حُدُودًا فَلَا تَعْتَدُوهَا",
    russian:
      "Поистине, Аллах предписал обязанности — не пренебрегайте ими. Он установил пределы — не преступайте их. Он запретил некоторые вещи — не нарушайте запретов. И умолчал о некоторых вещах по милости к вам, а не по забывчивости — не доискивайтесь о них.",
    narrator: "Абу Саалиба аль-Хушани (да будет доволен им Аллах)",
    source: "Ад-Даракутни",
  },
  {
    id: 27,
    number: 31,
    arabic:
      "ازْهَدْ فِي الدُّنْيَا يُحِبَّكَ اللَّهُ، وَازْهَدْ فِيمَا عِنْدَ النَّاسِ يُحِبَّكَ النَّاسُ",
    russian:
      "Отрекись от мирского — и Аллах полюбит тебя. Отрекись от того, что у людей, — и люди полюбят тебя.",
    narrator: "Сахль ибн Са'д ас-Саиди (да будет доволен им Аллах)",
    source: "Ибн Маджа",
  },
  {
    id: 28,
    number: 32,
    arabic: "لَا ضَرَرَ وَلَا ضِرَارَ",
    russian: "Нельзя причинять вред ни себе, ни другим.",
    narrator: "Абу Саид аль-Худри (да будет доволен им Аллах)",
    source: "Ибн Маджа, Ад-Даракутни",
  },
  {
    id: 29,
    number: 33,
    arabic:
      "لَوْ يُعْطَى النَّاسُ بِدَعْوَاهُمْ لَادَّعَى رِجَالٌ أَمْوَالَ قَوْمٍ وَدِمَاءَهُمْ",
    russian:
      "Если бы людям давали всё, на что они притязают, то некоторые стали бы претендовать на имущество и кровь других. Однако бремя доказательства лежит на истце, а клятва — на ответчике.",
    narrator: "Ибн Аббас (да будет доволен ими обоими Аллах)",
    source: "Аль-Байхаки",
  },
  {
    id: 30,
    number: 34,
    arabic:
      "مَنْ رَأَى مِنْكُمْ مُنْكَرًا فَلْيُغَيِّرْهُ بِيَدِهِ، فَإِنْ لَمْ يَسْتَطِعْ فَبِلِسَانِهِ، فَإِنْ لَمْ يَسْتَطِعْ فَبِقَلْبِهِ",
    russian:
      "Кто из вас увидит порицаемое, пусть изменит это своей рукой. Если не может — то языком. Если не может — то сердцем, и это самая слабая степень веры.",
    narrator: "Абу Саид аль-Худри (да будет доволен им Аллах)",
    source: "Муслим",
  },
  {
    id: 31,
    number: 35,
    arabic:
      "لَا تَحَاسَدُوا وَلَا تَنَاجَشُوا وَلَا تَبَاغَضُوا وَلَا تَدَابَرُوا",
    russian:
      "Не завидуйте друг другу, не взвинчивайте цены, не ненавидьте друг друга, не отворачивайтесь друг от друга. Не перебивайте торговлю друг друга. Будьте братьями, рабы Аллаха. Мусульманин мусульманину брат: он не притесняет его, не оставляет без помощи и не презирает его.",
    narrator: "Абу Хурайра (да будет доволен им Аллах)",
    source: "Муслим",
  },
  {
    id: 32,
    number: 36,
    arabic:
      "مَنْ نَفَّسَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا نَفَّسَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ",
    russian:
      "Кто облегчит верующему одну из тягот мирской жизни, тому Аллах облегчит одну из тягот Судного дня. Кто облегчит положение нуждающегося, тому Аллах облегчит и в этом мире, и в мире ином. Аллах помогает рабу до тех пор, пока раб помогает своему брату.",
    narrator: "Абу Хурайра (да будет доволен им Аллах)",
    source: "Муслим",
  },
  {
    id: 33,
    number: 37,
    arabic:
      "إنَّ اللَّهَ كَتَبَ الْحَسَنَاتِ وَالسَّيِّئَاتِ ثُمَّ بَيَّنَ ذَلِكَ",
    russian:
      "Поистине, Аллах записал добрые и дурные дела, а затем разъяснил это: кто задумает доброе дело и не совершит его, Аллах запишет за ним одно полное благодеяние. А если задумает и совершит — Аллах запишет от десяти до семисот и многим более благодеяний.",
    narrator: "Ибн Аббас (да будет доволен ими обоими Аллах)",
    source: "Аль-Бухари, Муслим",
  },
  {
    id: 34,
    number: 38,
    arabic: "مَنْ عَادَى لِي وَلِيًّا فَقَدْ آذَنْتُهُ بِالْحَرْبِ",
    russian:
      "Кто враждует с Моим приближённым (вали), тому Я объявляю войну. Мой раб не приблизится ко Мне ничем более любимым для Меня, чем то, что Я вменил ему в обязанность. И раб Мой будет приближаться ко Мне через дополнительные дела поклонения, пока Я не полюблю его.",
    narrator: "Абу Хурайра (да будет доволен им Аллах)",
    source: "Аль-Бухари",
  },
  {
    id: 35,
    number: 39,
    arabic:
      "إنَّ اللَّهَ تَجَاوَزَ لِي عَنْ أُمَّتِي الْخَطَأَ وَالنِّسْيَانَ وَمَا اسْتُكْرِهُوا عَلَيْهِ",
    russian:
      "Поистине, Аллах простил моей общине ошибку, забывчивость и то, к чему их принудили.",
    narrator: "Ибн Аббас (да будет доволен ими обоими Аллах)",
    source: "Ибн Маджа, Аль-Байхаки",
  },
  {
    id: 36,
    number: 40,
    arabic: "كُنْ فِي الدُّنْيَا كَأَنَّكَ غَرِيبٌ أَوْ عَابِرُ سَبِيلٍ",
    russian: "Будь в этом мире как чужестранец или путник.",
    narrator: "Абдулла ибн Умар (да будет доволен ими обоими Аллах)",
    source: "Аль-Бухари",
  },
  {
    id: 37,
    number: 41,
    arabic:
      "لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يَكُونَ هَوَاهُ تَبَعًا لِمَا جِئْتُ بِهِ",
    russian:
      "Никто из вас не уверует по-настоящему, пока его страсти не будут подчинены тому, с чем я пришёл.",
    narrator:
      "Абу Мухаммад Абдулла ибн Амр (да будет доволен ими обоими Аллах)",
    source: "Ан-Навави в «аль-Арбаин»",
  },
  {
    id: 38,
    number: 42,
    arabic:
      "يَا ابْنَ آدَمَ، إنَّكَ مَا دَعَوْتَنِي وَرَجَوْتَنِي غَفَرْتُ لَكَ عَلَى مَا كَانَ مِنْكَ وَلَا أُبَالِي",
    russian:
      "О сын Адама! Пока ты взываешь ко Мне и надеешься на Меня, Я буду прощать тебе то, что ты совершил, и это для Меня не составит ничего. О сын Адама! Если бы грехи твои достигли облаков, а затем ты попросил прощения, Я простил бы тебе.",
    narrator: "Анас ибн Малик (да будет доволен им Аллах) — хадис кудси",
    source: "Ат-Тирмизи",
  },
];

export function getHadithOfDay(): Hadith {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = dayOfYear % NAWAWI_HADITHS.length;
  return NAWAWI_HADITHS[index];
}

export function getAllHadiths(): Hadith[] {
  return [...NAWAWI_HADITHS];
}

export function getHadithById(id: number): Hadith | undefined {
  return NAWAWI_HADITHS.find((h) => h.id === id);
}

// -----------------------------------------------------------------------------
// 5. Extended Hadiths — fawazahmed0/hadith-api (Bukhari, Muslim)
// CDN: https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/
// -----------------------------------------------------------------------------

export type HadithCollection = "bukhari" | "muslim";

export interface ExtendedHadith {
  hadithnumber: number;
  arabicnumber: number;
  text: string; // Russian text
  arabicText: string;
  collection: HadithCollection;
  book: number;
}

interface HadithApiSection {
  metadata: {
    name: string;
    section: string;
    section_detail: Record<
      string,
      {
        hadithnumber_first: string;
        hadithnumber_last: string;
        arabicnumber_first: string;
        arabicnumber_last: string;
      }
    >;
  };
  hadiths: {
    hadithnumber: number;
    arabicnumber: number;
    text: string;
    grades: unknown[];
    reference: { book: number; hadith: number };
  }[];
}

const HADITH_API_BASE =
  "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";

/**
 * Fetch a section (book/chapter) of hadiths with both Russian + Arabic
 */
export async function getHadithSection(
  collection: HadithCollection,
  section: number,
): Promise<ExtendedHadith[]> {
  const cacheKey = `hadith_${collection}_${section}`;
  const cached = getCached<ExtendedHadith[]>(cacheKey, CACHE_TTL_LONG);
  if (cached) return cached;

  const [rusResponse, araResponse] = await Promise.all([
    fetchJSON<HadithApiSection>(
      `${HADITH_API_BASE}/rus-${collection}/${section}.json`,
    ),
    fetchJSON<HadithApiSection>(
      `${HADITH_API_BASE}/ara-${collection}/${section}.json`,
    ),
  ]);

  const araMap = new Map(
    araResponse.hadiths.map((h) => [h.hadithnumber, h.text]),
  );

  const result: ExtendedHadith[] = rusResponse.hadiths.map((h) => ({
    hadithnumber: h.hadithnumber,
    arabicnumber: h.arabicnumber,
    text: h.text,
    arabicText: araMap.get(h.hadithnumber) || "",
    collection,
    book: h.reference.book,
  }));

  setCache(cacheKey, result);
  return result;
}

/**
 * Get a random hadith from Bukhari or Muslim
 */
export async function getRandomExtendedHadith(
  collection: HadithCollection = "bukhari",
): Promise<ExtendedHadith> {
  // Bukhari has ~97 sections, Muslim has ~56
  const maxSection = collection === "bukhari" ? 97 : 56;
  const section = Math.floor(Math.random() * maxSection) + 1;

  try {
    const hadiths = await getHadithSection(collection, section);
    if (hadiths.length === 0) {
      // Fallback to section 1
      const fallback = await getHadithSection(collection, 1);
      return fallback[0];
    }
    const idx = Math.floor(Math.random() * hadiths.length);
    return hadiths[idx];
  } catch {
    // Fallback to section 1
    const fallback = await getHadithSection(collection, 1);
    return fallback[0];
  }
}

// -----------------------------------------------------------------------------
// 6. Quran Reciters — MP3Quran.net API
// -----------------------------------------------------------------------------

export interface Reciter {
  id: number;
  name: string;
  letter: string;
  server: string; // base URL for audio files
  moshafId: number;
  surahTotal: number;
  surahList: number[]; // available surah numbers
}

interface MP3QuranReciterRaw {
  id: number;
  name: string;
  letter: string;
  moshaf: {
    id: number;
    name: string;
    server: string;
    surah_total: number;
    moshaf_type: number;
    surah_list: string; // comma-separated
  }[];
}

interface MP3QuranRecitersResponse {
  reciters: MP3QuranReciterRaw[];
}

export async function getReciters(): Promise<Reciter[]> {
  const cacheKey = "reciters_list";
  const cached = getCached<Reciter[]>(cacheKey, CACHE_TTL_SHORT);
  if (cached) return cached;

  const response = await fetchJSON<MP3QuranRecitersResponse>(
    "https://www.mp3quran.net/api/v3/reciters?language=ar",
  );

  const result: Reciter[] = [];

  for (const r of response.reciters) {
    // Take the first moshaf (standard recitation)
    const moshaf = r.moshaf[0];
    if (!moshaf) continue;

    result.push({
      id: r.id,
      name: r.name,
      letter: r.letter,
      server: moshaf.server,
      moshafId: moshaf.id,
      surahTotal: moshaf.surah_total,
      surahList: moshaf.surah_list
        .split(",")
        .map(Number)
        .filter((n) => !isNaN(n)),
    });
  }

  // Sort by surah_total descending (most complete first)
  result.sort((a, b) => b.surahTotal - a.surahTotal);

  setCache(cacheKey, result);
  return result;
}

/**
 * Get audio URL for a specific surah from a reciter
 * Format: {server}/{surahNumber padded to 3 digits}.mp3
 */
export function getReciterAudioUrl(
  reciter: Reciter,
  surahNumber: number,
): string {
  const paddedSurah = String(surahNumber).padStart(3, "0");
  return `${reciter.server}${paddedSurah}.mp3`;
}

// Popular reciters (hardcoded IDs for quick access)
export const POPULAR_RECITERS = [
  { id: 7, name: "مشاري العفاسي" }, // Mishary Alafasy
  { id: 35, name: "عبدالرحمن السديس" }, // Sudais
  { id: 6, name: "ماهر المعيقلي" }, // Maher Al Muaiqly
  { id: 5, name: "سعود الشريم" }, // Shuraim
  { id: 128, name: "أحمد العجمي" }, // Ahmed Al Ajmi
  { id: 24, name: "عبدالباسط عبدالصمد" }, // Abdul Basit
  { id: 9, name: "خالد الجليل" }, // Khalid Al Jaleel
  { id: 48, name: "هزاع البلوشي" }, // Hazza Al Balushi
] as const;

// -----------------------------------------------------------------------------
// 7. Telegram WebApp Haptic Feedback
// -----------------------------------------------------------------------------

interface TelegramWebApp {
  HapticFeedback: {
    impactOccurred: (
      style: "light" | "medium" | "heavy" | "rigid" | "soft",
    ) => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

/** Vibrate on success (prayer marked, habit toggled) */
export function hapticSuccess(): void {
  try {
    window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("success");
  } catch {
    // Not in Telegram or not supported — silent
  }
}

/** Vibrate on impact (button press) */
export function hapticImpact(
  style: "light" | "medium" | "heavy" = "medium",
): void {
  try {
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred(style);
  } catch {
    // Not in Telegram or not supported — silent
  }
}

/** Vibrate on selection change */
export function hapticSelection(): void {
  try {
    window.Telegram?.WebApp?.HapticFeedback.selectionChanged();
  } catch {
    // Not in Telegram or not supported — silent
  }
}
