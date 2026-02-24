import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Check,
  Star,
} from "lucide-react";
import { storage } from "../lib/storage";
import { scheduleSyncPush } from "../lib/sync";
import { PROPHETS, type ProphetStory } from "../data/prophets";

const STORAGE_KEY = "iman_prophets_read";

function getReadProphets(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

function saveReadProphets(ids: number[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  scheduleSyncPush();
}

export default function Prophets() {
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const stored = getReadProphets();
    setReadIds(new Set(stored));
  }, []);

  const readCount = readIds.size;
  const totalCount = PROPHETS.length;
  const progressPct = Math.round((readCount / totalCount) * 100);

  const handleToggle = (storyId: number) => {
    const isClosing = expandedId === storyId;
    setExpandedId(isClosing ? null : storyId);

    if (!isClosing && !readIds.has(storyId)) {
      const story = PROPHETS.find((s) => s.id === storyId);
      if (story) {
        const newReadIds = new Set(readIds);
        newReadIds.add(storyId);
        setReadIds(newReadIds);
        saveReadProphets(Array.from(newReadIds));
        storage.addExtraPoints(story.xp);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">
              Истории пророков
            </h1>
            <p className="text-xs text-gray-500">
              Прочитано {readCount} из {totalCount}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-emerald-400">
              {progressPct}%
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Prophets List */}
      <div className="px-4 pt-4 space-y-3">
        {PROPHETS.map((prophet) => (
          <ProphetCard
            key={prophet.id}
            prophet={prophet}
            isRead={readIds.has(prophet.id)}
            isExpanded={expandedId === prophet.id}
            onToggle={() => handleToggle(prophet.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ProphetCard({
  prophet,
  isRead,
  isExpanded,
  onToggle,
}: {
  prophet: ProphetStory;
  isRead: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        isExpanded
          ? "border-emerald-500/20 bg-slate-800/60"
          : "border-white/5 bg-white/[0.02]"
      }`}
    >
      {/* Card header */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
            isRead ? "bg-emerald-500/10" : "bg-white/5"
          }`}
        >
          {isRead ? (
            <Check className="w-5 h-5 text-emerald-400" />
          ) : (
            prophet.icon
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/20">
              {prophet.arabicName}
            </span>
            <span className="text-[10px] text-gray-500">
              {prophet.readTime} мин &bull; +{prophet.xp} XP
            </span>
          </div>
          <h3 className="font-semibold text-white text-sm">
            {prophet.name}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {prophet.title}
          </p>
        </div>
        <div className="shrink-0 pt-1">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 animate-fade-in space-y-3">
          {/* Summary */}
          <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10">
            <p className="text-sm text-emerald-300/90 leading-relaxed">
              {prophet.summary}
            </p>
          </div>

          {/* Full content */}
          <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
            <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {prophet.content}
            </div>
          </div>

          {/* Lessons */}
          <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-amber-400">
                Уроки и мудрость
              </h4>
            </div>
            <ul className="space-y-2">
              {prophet.lessons.map((lesson, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-amber-200/70 leading-relaxed"
                >
                  <span className="text-amber-400 mt-0.5 shrink-0">
                    {i + 1}.
                  </span>
                  <span>{lesson}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quranic reference */}
          <div className="flex items-center gap-2 px-1">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400/60" />
            <span className="text-xs text-emerald-400/60 font-medium">
              {prophet.quranicRef}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
