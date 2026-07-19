// ============================================================
// Методы расчёта времён намаза (для API api.aladhan.com)
// Разные методы дают разные времена для Фаджра и Иши (углы солнца).
// Аср различается по мазхабу (Hanafi vs остальные).
// ============================================================

export interface PrayerMethod {
  id: number;
  name: string;
  region: string;
  description: string;
}

export const PRAYER_METHODS: PrayerMethod[] = [
  {
    id: 3,
    name: "Лига исламского мира (MWL)",
    region: "Универсальный",
    description: "Используется по умолчанию во многих странах. Фаджр 18°, Иша 17°.",
  },
  {
    id: 14,
    name: "ДУМ России (САДУМ)",
    region: "Россия, СНГ, Кыргызстан, Казахстан",
    description: "Метод, применяемый ДУМ России и Центр. Азии. Подходит для Бишкека, Алматы.",
  },
  {
    id: 1,
    name: "Карачи",
    region: "Узбекистан, Пакистан, Индия",
    description: "Институт исламских наук Карачи. Фаджр 18°, Иша 18°.",
  },
  {
    id: 4,
    name: "Умм аль-Кура (Мекка)",
    region: "Саудовская Аравия",
    description: "Официальный метод КСА. Фаджр 18.5°. Иша: 90 минут после Магриба (120 в Рамадан).",
  },
  {
    id: 5,
    name: "Египет",
    region: "Африка, арабский мир",
    description: "Египетская служба геодезии. Фаджр 19.5°, Иша 17.5°.",
  },
  {
    id: 2,
    name: "ISNA (Сев. Америка)",
    region: "США, Канада",
    description: "Исламское общество Сев. Америки. Фаджр 15°, Иша 15°.",
  },
  {
    id: 8,
    name: "Залив (Кувейт, ОАЭ)",
    region: "Кувейт, Катар, ОАЭ, Бахрейн",
    description: "Метод стран Залива. Фаджр 19.5°, Иша 90 мин после Магриба.",
  },
  {
    id: 7,
    name: "Тегеран",
    region: "Иран, шиитский метод",
    description: "Институт геофизики Тегерана. Подходит для Ирана.",
  },
];

export type MadhhabKey = 0 | 1;

export interface Madhhab {
  id: MadhhabKey;
  name: string;
  description: string;
}

/** School для расчёта Аср: 0 = Shafi/Maliki/Hanbali (раньше), 1 = Hanafi (позже) */
export const MADHHABS: Madhhab[] = [
  {
    id: 0,
    name: "Шафии / Малики / Ханбали",
    description: "Аср наступает раньше — когда тень предмета равна его высоте.",
  },
  {
    id: 1,
    name: "Ханафи",
    description: "Аср наступает позже — когда тень в 2 раза длиннее предмета.",
  },
];

const STORAGE_METHOD = "iman_prayer_method";
const STORAGE_MADHHAB = "iman_prayer_madhhab";

export function getSavedMethod(): number {
  try {
    const raw = localStorage.getItem(STORAGE_METHOD);
    const n = raw ? parseInt(raw, 10) : 3;
    return PRAYER_METHODS.find((m) => m.id === n) ? n : 3;
  } catch {
    return 3;
  }
}

/** Явно ли пользователь выбирал метод (иначе можно применить автоподбор). */
export function hasSavedMethod(): boolean {
  try {
    return localStorage.getItem(STORAGE_METHOD) !== null;
  } catch {
    return false;
  }
}

/** id метода САДУМ (ДУМ России) — дефолт для СНГ */
export const SADUM_METHOD_ID = 14;

export function saveMethod(id: number): void {
  try {
    localStorage.setItem(STORAGE_METHOD, String(id));
  } catch {
    // ignore
  }
}

export function getSavedMadhhab(): MadhhabKey {
  try {
    const raw = localStorage.getItem(STORAGE_MADHHAB);
    const n = raw ? parseInt(raw, 10) : 1;
    return n === 0 ? 0 : 1;
  } catch {
    return 1;
  }
}

export function saveMadhhab(id: MadhhabKey): void {
  try {
    localStorage.setItem(STORAGE_MADHHAB, String(id));
  } catch {
    // ignore
  }
}
