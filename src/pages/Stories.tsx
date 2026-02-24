import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Check,
  Star,
  Heart,
  Sparkles,
} from "lucide-react";
import { storage } from "../lib/storage";
import { scheduleSyncPush } from "../lib/sync";
import { STORIES, STORY_CATEGORIES, type Story } from "../data/stories";

const STORAGE_KEY = "iman_stories_read";

function getReadStories(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

function saveReadStories(ids: number[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  scheduleSyncPush();
}

const categoryIcons: Record<string, React.ReactNode> = {
  sahabi: <Star className="w-4 h-4" />,
  tawbah: <Heart className="w-4 h-4" />,
  miracle: <Sparkles className="w-4 h-4" />,
  lesson: <BookOpen className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  sahabi: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  tawbah: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  miracle: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  lesson: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

export default function Stories() {
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const stored = getReadStories();
    setReadIds(new Set(stored));
  }, []);

  const readCount = readIds.size;
  const totalCount = STORIES.length;
  const progressPct = Math.round((readCount / totalCount) * 100);

  const handleToggle = (storyId: number) => {
    const isClosing = expandedId === storyId;
    setExpandedId(isClosing ? null : storyId);

    if (!isClosing && !readIds.has(storyId)) {
      const story = STORIES.find((s) => s.id === storyId);
      if (story) {
        const newReadIds = new Set(readIds);
        newReadIds.add(storyId);
        setReadIds(newReadIds);
        saveReadStories(Array.from(newReadIds));
        storage.addExtraPoints(story.xp);
      }
    }
  };

  const filteredStories = activeCategory
    ? STORIES.filter((s) => s.category === activeCategory)
    : STORIES;

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
              Истории Ислама
            </h1>
            <p className="text-xs text-gray-500">
              Прочитано {readCount} из {totalCount}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-amber-400">
              {progressPct}%
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
              activeCategory === null
                ? "bg-white/10 text-white border-white/20"
                : "text-gray-400 border-white/5 hover:border-white/10"
            }`}
          >
            Все ({STORIES.length})
          </button>
          {STORY_CATEGORIES.map((cat) => {
            const count = STORIES.filter(
              (s) => s.category === cat.key,
            ).length;
            return (
              <button
                key={cat.key}
                onClick={() =>
                  setActiveCategory(
                    activeCategory === cat.key ? null : cat.key,
                  )
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                  activeCategory === cat.key
                    ? categoryColors[cat.key]
                    : "text-gray-400 border-white/5 hover:border-white/10"
                }`}
              >
                {cat.icon} {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Stories List */}
      <div className="px-4 pt-4 space-y-3">
        {filteredStories.map((story) => {
          const isRead = readIds.has(story.id);
          const isExpanded = expandedId === story.id;

          return (
            <div
              key={story.id}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                isExpanded
                  ? "border-amber-500/20 bg-slate-800/60"
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              {/* Story header */}
              <button
                onClick={() => handleToggle(story.id)}
                className="w-full text-left p-4 flex items-start gap-3"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
                    isRead
                      ? "bg-emerald-500/10"
                      : "bg-white/5"
                  }`}
                >
                  {isRead ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : (
                    story.icon
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${categoryColors[story.category]}`}
                    >
                      {STORY_CATEGORIES.find(
                        (c) => c.key === story.category,
                      )?.label}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {story.readTime} мин • +{story.xp} XP
                    </span>
                  </div>
                  <h3 className="font-semibold text-white text-sm">
                    {story.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {story.subtitle}
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
                <div className="px-4 pb-4 animate-fade-in">
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                      {story.content}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
