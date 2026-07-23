import { useState, useEffect, useRef, useCallback } from "react";
import {
  Headphones,
  Loader2,
  AlertCircle,
  RefreshCw,
  Play,
  Pause,
  Search,
  ChevronDown,
  Music2,
  X,
} from "lucide-react";
import { hapticImpact } from "../lib/api";

// =============================================================================
// Аудио-библиотека — проверенное религиозное аудио на русском (islamhouse.com)
// Стрим MP3 напрямую (без скачивания). Данные: public/data/audio/catalog.json
// =============================================================================

interface AudioSeries {
  id: string;
  title: string;
  category: string;
  tracks: string[]; // прямые MP3-ссылки
}

const CATEGORIES: { key: string; name: string; icon: string }[] = [
  { key: "all", name: "Все", icon: "🎧" },
  { key: "quran", name: "Коран (перевод)", icon: "📖" },
  { key: "tafsir", name: "Тафсир", icon: "📚" },
  { key: "hadith", name: "Хадисы", icon: "🕌" },
  { key: "seerah", name: "Сира", icon: "🌙" },
  { key: "aqidah", name: "Вероубеждение", icon: "☝️" },
  { key: "fiqh", name: "Поклонение", icon: "🤲" },
  { key: "dua", name: "Дуа и зикр", icon: "📿" },
  { key: "lecture", name: "Лекции", icon: "🎓" },
  { key: "khutbah", name: "Проповеди", icon: "🎙️" },
  { key: "other", name: "Разное", icon: "✨" },
];

const CAT_NAME: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.name]),
);

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function trackLabel(idx: number, total: number): string {
  if (total === 1) return "Слушать";
  return `Часть ${idx + 1}`;
}

export default function AudioLibrary() {
  const [catalog, setCatalog] = useState<AudioSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Плеер ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<{
    seriesTitle: string;
    label: string;
    url: string;
  } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${import.meta.env.BASE_URL}data/audio/catalog.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: AudioSeries[]) => {
        setCatalog(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Инициализация аудио-элемента
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    const onTime = () => setProgress(audio.currentTime);
    const onDur = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setAudioLoading(true);
    const onPlaying = () => setAudioLoading(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDur);
    audio.addEventListener("durationchange", onDur);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  const playTrack = (seriesTitle: string, url: string, label: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    hapticImpact("light");
    if (current?.url === url) {
      // тот же трек — пауза/продолжить
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
      return;
    }
    setCurrent({ seriesTitle, url, label });
    setAudioLoading(true);
    setProgress(0);
    setDuration(0);
    audio.src = url;
    audio.play().catch(() => setAudioLoading(false));
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = Number(e.target.value);
    audio.currentTime = t;
    setProgress(t);
  };

  const closePlayer = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setCurrent(null);
    setPlaying(false);
  };

  // Фильтрация
  const q = query.trim().toLowerCase();
  const filtered = catalog.filter((s) => {
    if (cat !== "all" && s.category !== cat) return false;
    if (q && !s.title.toLowerCase().includes(q)) return false;
    return true;
  });

  const totalTracks = catalog.reduce((n, s) => n + s.tracks.length, 0);

  return (
    <div className="min-h-screen pb-40 px-4 pt-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 animate-fade-in">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Headphones className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Аудио</h1>
          <p className="text-xs text-slate-400">
            Проверенное аудио на русском · islamhouse.com
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3 animate-fade-in">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по названию…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl t-bg text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/40"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 mb-2 animate-fade-in">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              setCat(c.key);
              hapticImpact("light");
            }}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              cat === c.key
                ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                : "t-bg text-slate-400 hover:text-slate-200"
            }`}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
          <p className="text-sm text-slate-400">Загрузка библиотеки…</p>
        </div>
      )}
      {error && !loading && (
        <div className="glass-card p-6 text-center animate-fade-in">
          <AlertCircle className="w-10 h-10 text-red-400/60 mx-auto mb-3" />
          <p className="text-sm text-red-400 mb-1">Не удалось загрузить</p>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Повторить
          </button>
        </div>
      )}

      {/* Counter */}
      {!loading && !error && (
        <p className="text-[11px] text-slate-500 mb-3">
          {filtered.length} серий · {totalTracks} дорожек
        </p>
      )}

      {/* List */}
      {!loading && !error && (
        <div className="space-y-2.5">
          {filtered.length === 0 && (
            <div className="glass-card p-8 text-center">
              <Music2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Ничего не найдено</p>
            </div>
          )}

          {filtered.map((s, i) => {
            const isOpen = expandedId === s.id;
            return (
              <div
                key={s.id}
                className="animate-fade-in"
                style={{ animationDelay: `${Math.min(i, 12) * 0.03}s`, opacity: 0 }}
              >
                <div className="glass-card overflow-hidden">
                  <button
                    onClick={() => {
                      setExpandedId(isOpen ? null : s.id);
                      hapticImpact("light");
                    }}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Music2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium leading-snug line-clamp-2">
                        {s.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {CAT_NAME[s.category] || "Разное"} ·{" "}
                        {s.tracks.length} дорож
                        {s.tracks.length % 10 === 1 && s.tracks.length % 100 !== 11
                          ? "ка"
                          : "ек"}
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t t-border divide-y divide-white/[0.04]">
                      {s.tracks.map((url, ti) => {
                        const label = trackLabel(ti, s.tracks.length);
                        const isCurrent = current?.url === url;
                        return (
                          <button
                            key={url}
                            onClick={() => playTrack(s.title, url, label)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                              isCurrent
                                ? "bg-emerald-500/10"
                                : "hover:bg-white/[0.03]"
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                isCurrent
                                  ? "bg-emerald-500 text-white"
                                  : "t-bg text-slate-400"
                              }`}
                            >
                              {isCurrent && playing ? (
                                <Pause className="w-3.5 h-3.5" />
                              ) : (
                                <Play className="w-3.5 h-3.5 ml-0.5" />
                              )}
                            </div>
                            <span
                              className={`text-sm ${
                                isCurrent ? "text-emerald-400" : "text-slate-300"
                              }`}
                            >
                              {label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky mini-player */}
      {current && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-3 animate-fade-in">
          <div className="max-w-2xl mx-auto glass-card border border-emerald-500/20 rounded-2xl p-3 shadow-lg">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                aria-label={playing ? "Пауза" : "Играть"}
              >
                {audioLoading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : playing ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-medium truncate">
                  {current.seriesTitle}
                </p>
                <p className="text-[10px] text-emerald-400/80">{current.label}</p>
              </div>
              <button
                onClick={closePlayer}
                className="p-1.5 rounded-full hover:t-bg text-slate-400 shrink-0"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-slate-500 tabular-nums w-9 text-right">
                {fmtTime(progress)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={progress}
                onChange={seek}
                className="flex-1 h-1 accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 tabular-nums w-9">
                {fmtTime(duration)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
