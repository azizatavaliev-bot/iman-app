import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Loader2,
  ImageDown,
  Search,
  X,
  Sparkles,
} from "lucide-react";
import { getSurah, getSurahTranslation, getHadithById, hapticImpact } from "../lib/api";
import { getTransliteration } from "../data/quran-transliteration";
import { DHIKR_DATA } from "../data/dhikr";
import { SURAH_NAMES, getSurahDescription } from "./Memorize";
import {
  generateAyahWallpaper,
  shareOrDownloadWallpaper,
  WALLPAPER_THEMES,
  WALLPAPER_DEVICES,
  WALLPAPER_FONTS,
  type WallpaperThemeKey,
  type WallpaperDeviceKey,
  type WallpaperFontKey,
  type WallpaperAyahSegment,
} from "../lib/wallpaper";
import { trackAction } from "../lib/analytics";

// Суры с таким или меньшим числом аятов помещаются на одни обои целиком —
// заранее заготовленное, полностью читаемое обои, а не один вырванный аят
const WHOLE_SURAH_MAX_AYAHS = 10;

type WallpaperCategory = "ayah" | "hadith" | "dhikr";

interface WallpaperData {
  key: string;
  headerLabel: string;
  footerLabel: string;
  translitText?: string | null;
  translationText?: string;
  segments?: WallpaperAyahSegment[];
}

// Хадисы имама ан-Навави (40 хадисов) — короткие поучительные, хорошо
// работают как ежедневное напоминание. Текст берётся из уже существующих
// данных приложения (getHadithById), здесь только id и краткая тема.
const RECOMMENDED_HADITHS: { id: number; label: string; why: string }[] = [
  { id: 1, label: "Хадис №1", why: "Дела оцениваются по намерениям" },
  { id: 5, label: "Хадис №6", why: "Дозволенное и запретное ясны" },
  { id: 6, label: "Хадис №7", why: "Религия — это искренность (насиха)" },
  { id: 10, label: "Хадис №13", why: "Люби для брата то, что любишь себе" },
  { id: 16, label: "Хадис №20", why: "Стыдливость (хая) — часть веры" },
  { id: 21, label: "Хадис №25", why: "Любое доброе дело — садака" },
  { id: 28, label: "Хадис №32", why: "Не причиняй вреда и не отвечай вредом" },
  { id: 30, label: "Хадис №34", why: "Меняй зло рукой, словом или сердцем" },
  { id: 34, label: "Хадис №38", why: "Приближение к Аллаху через нафиля" },
  { id: 36, label: "Хадис №40", why: "Будь в этом мире странником" },
];

// Зикры — короткие фразы поминания Аллаха, идеальны для обоев на каждый день.
// Данные берутся из уже существующей базы зикров приложения (DHIKR_DATA).
const RECOMMENDED_DHIKR_IDS = [2, 3, 4, 9, 19, 31, 32, 38];

// Самые известные и часто читаемые аяты/суры — быстрый доступ без ручного поиска номера
const RECOMMENDED: { surah: number; ayah: number; label: string; why: string }[] = [
  { surah: 1, ayah: 1, label: "Аль-Фатиха", why: "Открывающая целиком — читается в каждом ракаате намаза" },
  { surah: 2, ayah: 255, label: "Аят аль-Курси", why: "Величайший аят Корана о могуществе Аллаха" },
  { surah: 2, ayah: 286, label: "Аль-Бакара, 286", why: "Мольба о прощении — последний аят суры" },
  { surah: 112, ayah: 1, label: "Аль-Ихляс", why: "Целиком — равна трети Корана" },
  { surah: 113, ayah: 1, label: "Аль-Фаляк", why: "Целиком — защитная сура перед сном" },
  { surah: 114, ayah: 1, label: "Ан-Нас", why: "Целиком — защита от наущений шайтана" },
  { surah: 103, ayah: 1, label: "Аль-Аср", why: "Целиком — «Достаточно одной этой суры» (имам аш-Шафии)" },
  { surah: 108, ayah: 1, label: "Аль-Кяусар", why: "Целиком — самая короткая сура Корана" },
  { surah: 36, ayah: 1, label: "Ясин", why: "«Сердце Корана»" },
  { surah: 67, ayah: 1, label: "Аль-Мульк", why: "Защита от мучений могилы" },
  { surah: 55, ayah: 1, label: "Ар-Рахман", why: "О бесчисленных милостях Аллаха" },
  { surah: 24, ayah: 35, label: "Аят ан-Нур", why: "«Аллах — Свет небес и земли»" },
];

export default function Wallpapers() {
  const navigate = useNavigate();

  const [category, setCategory] = useState<WallpaperCategory>("ayah");
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<WallpaperThemeKey>("emerald");
  const [device, setDevice] = useState<WallpaperDeviceKey>("standard");
  const [font, setFont] = useState<WallpaperFontKey>("inter");

  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WallpaperData | null>(null);
  // Несколько выбранных хадисов/зикров объединяются в одни обои
  const [selectedHadithIds, setSelectedHadithIds] = useState<number[]>([]);
  const [selectedDhikrIds, setSelectedDhikrIds] = useState<number[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [sharing, setSharing] = useState(false);

  const requestId = useRef(0);
  const previewRef = useRef<HTMLDivElement>(null);

  const allSurahs = useMemo(() => {
    const entries = Object.entries(SURAH_NAMES) as unknown as [
      string,
      { ru: string; ar: string; ayahs: number },
    ][];
    const q = search.trim().toLowerCase();
    return entries
      .map(([num, data]) => ({ num: Number(num), ...data }))
      .filter(
        (s) =>
          !q || s.ru.toLowerCase().includes(q) || String(s.num).includes(q),
      );
  }, [search]);

  useEffect(() => {
    trackAction("wallpapers_opened");
  }, []);

  // Перерисовываем картинку при смене темы/устройства — без повторной загрузки текста
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    setRendering(true);
    generateAyahWallpaper({
      surahNameRu: data.headerLabel,
      surahNumber: 0,
      footerLabel: data.footerLabel,
      translitText: data.translitText,
      translationText: data.translationText,
      segments: data.segments,
      theme,
      device,
      font,
    })
      .then(({ dataUrl, blob }) => {
        if (cancelled) return;
        setPreviewUrl(dataUrl);
        setPreviewBlob(blob);
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, theme, device, font]);

  async function pickAyah(surahNumber: number, preferredAyah: number) {
    const key = `ayah:${surahNumber}:${preferredAyah}`;
    const myRequest = ++requestId.current;
    hapticImpact("light");
    setLoadingKey(key);
    setError(null);
    try {
      const info = SURAH_NAMES[surahNumber];
      const [arabic, translation] = await Promise.all([
        getSurah(surahNumber),
        getSurahTranslation(surahNumber),
      ]);
      if (myRequest !== requestId.current) return;

      const wholeSurah = (info?.ayahs ?? arabic.ayahs.length) <= WHOLE_SURAH_MAX_AYAHS;

      if (wholeSurah) {
        const segments: WallpaperAyahSegment[] = arabic.ayahs.map((a) => {
          const translationAyah = translation.ayahs.find(
            (t) => t.numberInSurah === a.numberInSurah,
          );
          return {
            number: a.numberInSurah,
            translitText: getTransliteration(surahNumber, a.numberInSurah),
            translationText: translationAyah?.text,
          };
        });

        setData({
          key,
          headerLabel: info?.ru ?? "Коран",
          footerLabel: `Сура целиком, ${arabic.ayahs.length} ${ayahWord(arabic.ayahs.length)}`,
          segments,
        });
      } else {
        const translationAyah = translation.ayahs.find(
          (a) => a.numberInSurah === preferredAyah,
        );
        if (!translationAyah) {
          setError("Аят не найден");
          return;
        }
        const translitText = getTransliteration(surahNumber, preferredAyah);

        setData({
          key,
          headerLabel: info?.ru ?? "Коран",
          footerLabel: `Аят ${preferredAyah} из ${info?.ayahs ?? arabic.ayahs.length}`,
          translitText,
          translationText: translationAyah.text,
        });
      }

      scrollToPreview();
    } catch {
      if (myRequest === requestId.current) {
        setError("Не удалось загрузить текст. Проверь интернет и попробуй ещё раз.");
      }
    } finally {
      if (myRequest === requestId.current) setLoadingKey(null);
    }
  }

  // Тап по карточке добавляет/убирает хадис из набора — можно объединить
  // сразу несколько хадисов в одни обои (не только один за раз)
  function toggleHadith(id: number) {
    hapticImpact("light");
    setError(null);
    setSelectedHadithIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleDhikr(id: number) {
    hapticImpact("light");
    setError(null);
    setSelectedDhikrIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  // Пересобираем превью при изменении набора выбранных хадисов
  useEffect(() => {
    if (selectedHadithIds.length === 0) {
      if (category === "hadith") setData(null);
      return;
    }
    const hadiths = selectedHadithIds
      .map((id) => getHadithById(id))
      .filter((h): h is NonNullable<typeof h> => Boolean(h));
    if (hadiths.length === 0) return;

    if (hadiths.length === 1) {
      const h = hadiths[0];
      setData({
        key: `hadith:${selectedHadithIds.join(",")}`,
        headerLabel: "Хадис ан-Навави",
        footerLabel: `${h.narrator} · ${h.source}`,
        translitText: h.russian,
      });
    } else {
      const segments: WallpaperAyahSegment[] = hadiths.map((h, i) => ({
        number: i + 1,
        translitText: h.russian,
        translationText: h.source,
      }));
      setData({
        key: `hadith:${selectedHadithIds.join(",")}`,
        headerLabel: "Хадисы ан-Навави",
        footerLabel: `${hadiths.length} хадиса подборка`,
        segments,
      });
    }
    scrollToPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHadithIds]);

  // Пересобираем превью при изменении набора выбранных зикров
  useEffect(() => {
    if (selectedDhikrIds.length === 0) {
      if (category === "dhikr") setData(null);
      return;
    }
    const items = selectedDhikrIds
      .map((id) => DHIKR_DATA.find((d) => d.id === id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d));
    if (items.length === 0) return;

    if (items.length === 1) {
      const d = items[0];
      setData({
        key: `dhikr:${selectedDhikrIds.join(",")}`,
        headerLabel: "Зикр",
        footerLabel: d.count > 1 ? `Повторить ${d.count} раз · ${d.source}` : d.source,
        translitText: d.transcription,
        translationText: d.russian,
      });
    } else {
      const segments: WallpaperAyahSegment[] = items.map((d, i) => ({
        number: i + 1,
        translitText: d.transcription,
        translationText: d.russian,
      }));
      setData({
        key: `dhikr:${selectedDhikrIds.join(",")}`,
        headerLabel: "Зикры",
        footerLabel: `Подборка из ${items.length}`,
        segments,
      });
    }
    scrollToPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDhikrIds]);

  function scrollToPreview() {
    requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function handleShare() {
    if (!previewUrl || !data) return;
    hapticImpact("light");
    setSharing(true);
    try {
      await shareOrDownloadWallpaper(
        previewUrl,
        previewBlob,
        `iman-${data.key.replace(/:/g, "-")}.png`,
      );
      trackAction("wallpaper_downloaded", { key: data.key });
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="min-h-screen pb-28 max-w-lg mx-auto animate-fade-in">
      {/* Hero header */}
      <div className="relative px-4 pt-4 pb-6 overflow-hidden bg-gradient-to-br from-emerald-500/20 to-emerald-800/10">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-orb-float" />

        <div className="relative flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <ChevronLeft size={18} className="text-slate-300" />
          </button>
        </div>

        <div className="relative text-center">
          <div className="text-4xl mb-2">🖼️</div>
          <h1 className="text-2xl font-bold text-white mb-1">Обои для души</h1>
          <p className="text-slate-400 text-xs">
            Аяты, хадисы и зикры — с транскрипцией кириллицей и переводом
          </p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* ---- Категория контента ---- */}
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { key: "ayah" as const, label: "Аяты", emoji: "📖" },
              { key: "hadith" as const, label: "Хадисы", emoji: "📜" },
              { key: "dhikr" as const, label: "Зикры", emoji: "📿" },
            ]
          ).map((c) => (
            <button
              key={c.key}
              onClick={() => {
                setCategory(c.key);
                setData(null);
                setSelectedHadithIds([]);
                setSelectedDhikrIds([]);
                hapticImpact("light");
              }}
              className={`rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all ${
                category === c.key
                  ? "bg-emerald-500/20 ring-1 ring-emerald-400/50 text-emerald-300"
                  : "bg-white/[0.03] ring-1 ring-white/5 text-slate-400 hover:bg-white/[0.06]"
              }`}
            >
              <span>{c.emoji}</span>
              <span className="text-xs font-bold">{c.label}</span>
            </button>
          ))}
        </div>

        {/* ---- Превью (появляется наверху после выбора) ---- */}
        {data && (
          <div ref={previewRef} className="space-y-3 scroll-mt-4">
            <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/10 mx-auto max-w-[240px] min-h-[200px] flex items-center justify-center bg-black/20">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Превью обоев"
                  className="w-full h-auto block"
                />
              ) : (
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin my-16" />
              )}
              {rendering && previewUrl && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Оформление */}
            <div className="grid grid-cols-5 gap-2">
              {(
                Object.entries(WALLPAPER_THEMES) as [
                  WallpaperThemeKey,
                  (typeof WALLPAPER_THEMES)[WallpaperThemeKey],
                ][]
              ).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => {
                    setTheme(key);
                    hapticImpact("light");
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <span
                    className={`w-9 h-9 rounded-full transition-all ${
                      theme === key
                        ? "ring-2 ring-white/70 scale-110"
                        : "ring-1 ring-white/10"
                    }`}
                    style={{ background: t.swatch }}
                  />
                  <span
                    className={`text-[9px] font-medium ${
                      theme === key ? "text-white" : "text-slate-500"
                    }`}
                  >
                    {t.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Размер под модель iPhone */}
            <div className="grid grid-cols-4 gap-2">
              {(
                Object.entries(WALLPAPER_DEVICES) as [
                  WallpaperDeviceKey,
                  (typeof WALLPAPER_DEVICES)[WallpaperDeviceKey],
                ][]
              ).map(([key, d]) => (
                <button
                  key={key}
                  onClick={() => {
                    setDevice(key);
                    hapticImpact("light");
                  }}
                  className={`rounded-xl py-2 px-1.5 text-center transition-all ${
                    device === key
                      ? "bg-emerald-500/20 ring-1 ring-emerald-400/50"
                      : "bg-white/[0.03] ring-1 ring-white/5 hover:bg-white/[0.06]"
                  }`}
                >
                  <p
                    className={`text-[11px] font-bold ${
                      device === key ? "text-emerald-300" : "text-slate-300"
                    }`}
                  >
                    {d.label}
                  </p>
                  <p className="text-[9px] text-slate-500 leading-tight mt-0.5">
                    {d.sublabel}
                  </p>
                </button>
              ))}
            </div>

            {/* Шрифт транскрипции — сравни, какой читается лучше */}
            <div className="grid grid-cols-4 gap-2">
              {(
                Object.entries(WALLPAPER_FONTS) as [
                  WallpaperFontKey,
                  (typeof WALLPAPER_FONTS)[WallpaperFontKey],
                ][]
              ).map(([key, f]) => (
                <button
                  key={key}
                  onClick={() => {
                    setFont(key);
                    hapticImpact("light");
                  }}
                  style={{ fontFamily: f.family }}
                  className={`rounded-xl py-2.5 text-center transition-all ${
                    font === key
                      ? "bg-emerald-500/20 ring-1 ring-emerald-400/50"
                      : "bg-white/[0.03] ring-1 ring-white/5 hover:bg-white/[0.06]"
                  }`}
                >
                  <p
                    className={`text-sm font-bold ${
                      font === key ? "text-emerald-300" : "text-slate-300"
                    }`}
                  >
                    Aa
                  </p>
                  <p className="text-[9px] text-slate-500 leading-tight mt-0.5">
                    {f.label}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={handleShare}
              disabled={sharing || rendering || !previewUrl}
              className="w-full py-3.5 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 active:scale-[0.98] text-white font-bold ring-1 ring-emerald-400/40 shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {sharing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageDown className="w-4 h-4" />
              )}
              Скачать / Поделиться
            </button>
          </div>
        )}

        {error && (
          <div className="glass-card p-3 border border-rose-500/30 bg-rose-500/5 text-rose-300 text-xs text-center">
            {error}
          </div>
        )}

        {/* ---- Рекомендуем: аяты ---- */}
        {category === "ayah" && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Рекомендуем
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {RECOMMENDED.map((r) => {
                const key = `ayah:${r.surah}:${r.ayah}`;
                const isActive = data?.key === key;
                return (
                  <button
                    key={key}
                    onClick={() => pickAyah(r.surah, r.ayah)}
                    disabled={loadingKey === key}
                    className={`text-left rounded-2xl p-3 h-[92px] flex flex-col transition-all bg-gradient-to-br from-emerald-500/10 to-transparent ring-1 ${
                      isActive
                        ? "ring-emerald-400/60 bg-emerald-500/10"
                        : "ring-white/5 hover:ring-white/15"
                    } disabled:opacity-60`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white text-sm font-bold">{r.label}</p>
                      {loadingKey === key ? (
                        <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
                      ) : (
                        <ImageDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] leading-snug line-clamp-2">
                      {r.why}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ---- Рекомендуем: хадисы ---- */}
        {category === "hadith" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  40 хадисов ан-Навави · выбери один или несколько
                </span>
              </div>
              {selectedHadithIds.length > 0 && (
                <button
                  onClick={() => setSelectedHadithIds([])}
                  className="text-[10px] text-amber-400 font-semibold shrink-0"
                >
                  Очистить ({selectedHadithIds.length})
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {RECOMMENDED_HADITHS.map((h) => {
                const isActive = selectedHadithIds.includes(h.id);
                return (
                  <button
                    key={h.id}
                    onClick={() => toggleHadith(h.id)}
                    className={`text-left rounded-2xl p-3 h-[92px] flex flex-col transition-all bg-gradient-to-br from-amber-500/10 to-transparent ring-1 ${
                      isActive
                        ? "ring-amber-400/60 bg-amber-500/10"
                        : "ring-white/5 hover:ring-white/15"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white text-sm font-bold">{h.label}</p>
                      {isActive ? (
                        <span className="w-4 h-4 rounded-full bg-amber-500/40 flex items-center justify-center shrink-0 text-[10px] text-amber-100 font-bold">
                          ✓
                        </span>
                      ) : (
                        <ImageDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] leading-snug line-clamp-2">
                      {h.why}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ---- Рекомендуем: зикры ---- */}
        {category === "dhikr" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  Зикры · выбери один или несколько
                </span>
              </div>
              {selectedDhikrIds.length > 0 && (
                <button
                  onClick={() => setSelectedDhikrIds([])}
                  className="text-[10px] text-violet-400 font-semibold shrink-0"
                >
                  Очистить ({selectedDhikrIds.length})
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {RECOMMENDED_DHIKR_IDS.map((id) => {
                const dhikr = DHIKR_DATA.find((d) => d.id === id);
                if (!dhikr) return null;
                const isActive = selectedDhikrIds.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleDhikr(id)}
                    className={`text-left rounded-2xl p-3 h-[92px] flex flex-col transition-all bg-gradient-to-br from-violet-500/10 to-transparent ring-1 ${
                      isActive
                        ? "ring-violet-400/60 bg-violet-500/10"
                        : "ring-white/5 hover:ring-white/15"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white text-sm font-bold truncate">
                        {dhikr.transcription}
                      </p>
                      {isActive ? (
                        <span className="w-4 h-4 rounded-full bg-violet-500/40 flex items-center justify-center shrink-0 text-[10px] text-violet-100 font-bold">
                          ✓
                        </span>
                      ) : (
                        <ImageDown className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] leading-snug line-clamp-2">
                      {dhikr.russian}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ---- Все суры (только для категории "Аяты") ---- */}
        {category === "ayah" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Все суры
            </span>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию или номеру..."
              className="w-full bg-white/[0.04] rounded-lg pl-8 pr-8 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {allSurahs.map((s) => {
              const key = `ayah:${s.num}:1`;
              const isActive = data?.key === key;
              const isShort = s.ayahs <= WHOLE_SURAH_MAX_AYAHS;
              return (
                <button
                  key={s.num}
                  onClick={() => pickAyah(s.num, 1)}
                  disabled={loadingKey === key}
                  className={`w-full text-left glass-card px-3.5 py-2.5 flex items-center justify-between transition-all disabled:opacity-60 ${
                    isActive ? "ring-1 ring-emerald-400/50" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">
                      {s.num}. {s.ru}
                    </p>
                    <p className="text-slate-500 text-[11px] truncate">
                      {getSurahDescription(s.num).slice(0, 60)}…
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-slate-600 text-[10px]">
                      {isShort ? "целиком" : `${s.ayahs} аятов`}
                    </span>
                    {loadingKey === key ? (
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    ) : (
                      <ImageDown className="w-4 h-4 text-emerald-400/70" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function ayahWord(n: number): string {
  const last = n % 100;
  if (last >= 11 && last <= 14) return "аятов";
  const tail = n % 10;
  if (tail === 1) return "аят";
  if (tail >= 2 && tail <= 4) return "аята";
  return "аятов";
}
