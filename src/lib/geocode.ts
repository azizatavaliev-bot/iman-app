// ============================================================
// Обратный геокодинг (координаты → город/страна) через бесплатный
// Nominatim (OpenStreetMap). С кэшем в localStorage, чтобы не дёргать
// сервис на каждый рендер и уважать его лимиты.
// ============================================================

export interface GeoPlace {
  city: string;
  countryCode: string; // ISO alpha-2, верхний регистр
}

// Страны СНГ + соседние с ханафитской традицией — дефолт САДУМ
const CIS_COUNTRIES = new Set([
  "KG", // Кыргызстан
  "KZ", // Казахстан
  "RU", // Россия
  "UZ", // Узбекистан
  "TJ", // Таджикистан
  "TM", // Туркменистан
  "AZ", // Азербайджан
  "BY", // Беларусь
  "AM", // Армения
  "MD", // Молдова
  "UA", // Украина
  "GE", // Грузия
]);

export function isCISCountry(code: string | undefined): boolean {
  return !!code && CIS_COUNTRIES.has(code.toUpperCase());
}

function cacheKey(lat: number, lng: number): string {
  // Округляем до ~1 км, чтобы кэш переиспользовался
  return `iman_geo_${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

/** Координаты → {город, код страны}. Кэшируется; при ошибке возвращает null. */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeoPlace | null> {
  const key = cacheKey(lat, lng);
  try {
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached) as GeoPlace;
  } catch {
    /* ignore */
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}` +
      `&format=json&accept-language=ru&zoom=10`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      name?: string;
      address?: Record<string, string>;
    };
    const a = d.address || {};
    const city =
      a.city || a.town || a.village || a.municipality || a.state || d.name || "";
    const countryCode = (a.country_code || "").toUpperCase();
    if (!city && !countryCode) return null;
    const place: GeoPlace = { city, countryCode };
    try {
      localStorage.setItem(key, JSON.stringify(place));
    } catch {
      /* ignore */
    }
    return place;
  } catch {
    return null;
  }
}
