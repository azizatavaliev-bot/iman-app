import { useState, useMemo } from "react";
import { ChevronLeft, BookOpen, Heart, Star, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { storage } from "../lib/storage";
import type { FavoriteHadith, QuranBookmark } from "../lib/storage";
import { DUA_DATA, DUA_CATEGORIES } from "../data/dua";
import type { Dua } from "../data/dua";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type Tab = "quran" | "hadiths" | "duas";

const SURAH_NAMES: Record<number, string> = {
  1: "Аль-Фатиха", 2: "Аль-Бакара", 3: "Аль Имран", 4: "Ан-Ниса", 5: "Аль-Маида",
  6: "Аль-Анам", 7: "Аль-Араф", 8: "Аль-Анфаль", 9: "Ат-Тауба", 10: "Юнус",
  11: "Худ", 12: "Юсуф", 13: "Ар-Раад", 14: "Ибрахим", 15: "Аль-Хиджр",
  16: "Ан-Нахль", 17: "Аль-Исра", 18: "Аль-Кахф", 19: "Марьям", 20: "Та Ха",
  21: "Аль-Анбия", 22: "Аль-Хадж", 23: "Аль-Муминун", 24: "Ан-Нур", 25: "Аль-Фуркан",
  26: "Аш-Шуара", 27: "Ан-Намль", 28: "Аль-Касас", 29: "Аль-Анкабут", 30: "Ар-Рум",
  31: "Лукман", 32: "Ас-Саджда", 33: "Аль-Ахзаб", 34: "Саба", 35: "Фатир",
  36: "Ясин", 37: "Ас-Саффат", 38: "Сад", 39: "Аз-Зумар", 40: "Гафир",
  41: "Фуссилат", 42: "Аш-Шура", 43: "Аз-Зухруф", 44: "Ад-Духан", 45: "Аль-Джасия",
  46: "Аль-Ахкаф", 47: "Мухаммад", 48: "Аль-Фатх", 49: "Аль-Худжурат", 50: "Каф",
  51: "Аз-Зарият", 52: "Ат-Тур", 53: "Ан-Наджм", 54: "Аль-Камар", 55: "Ар-Рахман",
  56: "Аль-Вакиа", 57: "Аль-Хадид", 58: "Аль-Муджадила", 59: "Аль-Хашр", 60: "Аль-Мумтахана",
  61: "Ас-Сафф", 62: "Аль-Джумуа", 63: "Аль-Мунафикун", 64: "Ат-Тагабун", 65: "Ат-Талак",
  66: "Ат-Тахрим", 67: "Аль-Мульк", 68: "Аль-Калям", 69: "Аль-Хакка", 70: "Аль-Маариж",
  71: "Нух", 72: "Аль-Джинн", 73: "Аль-Муззаммиль", 74: "Аль-Муддассир", 75: "Аль-Кияма",
  76: "Аль-Инсан", 77: "Аль-Мурсалят", 78: "Ан-Наба", 79: "Ан-Назиат", 80: "Абаса",
  81: "Ат-Таквир", 82: "Аль-Инфитар", 83: "Аль-Мутаффифин", 84: "Аль-Иншикак", 85: "Аль-Бурудж",
  86: "Ат-Тарик", 87: "Аль-Аля", 88: "Аль-Гашия", 89: "Аль-Фаджр", 90: "Аль-Балад",
  91: "Аш-Шамс", 92: "Аль-Лейль", 93: "Ад-Духа", 94: "Аш-Шарх", 95: "Ат-Тин",
  96: "Аль-Алак", 97: "Аль-Кадр", 98: "Аль-Баййина", 99: "Аз-Зальзаля", 100: "Аль-Адият",
  101: "Аль-Кариа", 102: "Ат-Такасур", 103: "Аль-Аср", 104: "Аль-Хумаза", 105: "Аль-Филь",
  106: "Курайш", 107: "Аль-Маун", 108: "Аль-Каусар", 109: "Аль-Кафирун", 110: "Ан-Наср",
  111: "Аль-Масад", 112: "Аль-Ихлас", 113: "Аль-Фалак", 114: "Ан-Нас",
};

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export default function Favorites() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("quran");

  const bookmarks = useMemo(() => storage.getQuranBookmarks(), []);
  const hadiths = useMemo(() => storage.getFavoriteHadiths(), []);
  const duaIds = useMemo(() => {
    try {
      const raw = localStorage.getItem("iman_favorite_duas");
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  }, []);

  const favDuas = useMemo(() => {
    return DUA_DATA.filter((d) => duaIds.includes(d.id));
  }, [duaIds]);

  const counts = {
    quran: bookmarks.length,
    hadiths: hadiths.length,
    duas: favDuas.length,
  };

  const totalCount = counts.quran + counts.hadiths + counts.duas;

  const tabs: { key: Tab; label: string; icon: typeof BookOpen; count: number }[] = [
    { key: "quran", label: "Коран", icon: BookOpen, count: counts.quran },
    { key: "hadiths", label: "Хадисы", icon: Star, count: counts.hadiths },
    { key: "duas", label: "Дуа", icon: Heart, count: counts.duas },
  ];

  function removeBookmark(b: QuranBookmark) {
    storage.removeQuranBookmark(b.surahNumber, b.ayahNumber);
    window.location.reload();
  }

  function removeHadith(h: FavoriteHadith) {
    storage.toggleFavoriteHadith(h);
    window.location.reload();
  }

  function removeDua(id: number) {
    const newIds = duaIds.filter((d) => d !== id);
    localStorage.setItem("iman_favorite_duas", JSON.stringify(newIds));
    window.location.reload();
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="glass-card w-9 h-9 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <ChevronLeft size={18} className="t-text-s" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Избранное</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {totalCount} сохранённых элементов
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 t-bg rounded-2xl p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
              tab === t.key
                ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "quran" && (
        <div className="space-y-2">
          {bookmarks.length === 0 ? (
            <EmptyState text="Нет сохранённых аятов. Откройте Коран и нажмите на закладку." />
          ) : (
            bookmarks.map((b, i) => (
              <div key={i} className="glass-card p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {SURAH_NAMES[b.surahNumber] || `Сура ${b.surahNumber}`}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Аят {b.ayahNumber}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/quran?surah=${b.surahNumber}&ayah=${b.ayahNumber}`)}
                  className="text-xs text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10"
                >
                  Открыть
                </button>
                <button
                  onClick={() => removeBookmark(b)}
                  className="text-red-400/50 hover:text-red-400 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "hadiths" && (
        <div className="space-y-2">
          {hadiths.length === 0 ? (
            <EmptyState text="Нет сохранённых хадисов. Откройте хадисы и добавьте в избранное." />
          ) : (
            hadiths.map((h) => (
              <div key={h.id} className="glass-card p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white leading-relaxed line-clamp-3">
                      {h.text}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                        {h.collection}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                        {h.narrator}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeHadith(h)}
                    className="text-red-400/50 hover:text-red-400 p-1 flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "duas" && (
        <div className="space-y-2">
          {favDuas.length === 0 ? (
            <EmptyState text="Нет сохранённых дуа. Откройте раздел Дуа и добавьте в избранное." />
          ) : (
            favDuas.map((d) => (
              <div key={d.id} className="glass-card p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {d.arabic && (
                      <p className="text-base text-right font-arabic text-emerald-300 leading-loose mb-2">
                        {d.arabic}
                      </p>
                    )}
                    <p className="text-sm text-white leading-relaxed">
                      {d.translation}
                    </p>
                    <span className="text-[10px] mt-2 inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                      {d.category}
                    </span>
                  </div>
                  <button
                    onClick={() => removeDua(d.id)}
                    className="text-red-400/50 hover:text-red-400 p-1 flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12">
      <Heart className="w-12 h-12 mx-auto mb-3 text-slate-600" />
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {text}
      </p>
    </div>
  );
}
