# Бекап: блок функций главной с цветным свечением (2026-07-20)

Версия дизайна плиток на главной **до** упрощения по фидбеку «не очень дизайн, сделай минималистичнее, не нужны эти свечения». Сохранена для возврата, если понадобится этот вариант обратно.

Затрагивает файл `src/pages/Dashboard.tsx`.

## Что было (свечение + глянцевый блик)

### 1. Константа `GLOW_COLOR` — добавить после `SECTION_ICONS` (перед `POPULAR_SURAHS`)

```tsx
// RGB-цвета свечения плиток (под tailwind text-*-300, для box-shadow/акцентов)
const GLOW_COLOR: Record<string, string> = {
  "text-amber-300": "252,211,77",
  "text-cyan-300": "103,232,249",
  "text-emerald-300": "110,231,183",
  "text-green-300": "134,239,172",
  "text-indigo-300": "165,180,252",
  "text-lime-300": "190,242,100",
  "text-orange-300": "253,186,116",
  "text-pink-300": "249,168,212",
  "text-purple-300": "216,180,254",
  "text-rose-300": "253,164,175",
  "text-sky-300": "125,211,252",
  "text-slate-300": "203,213,225",
  "text-teal-300": "94,234,212",
  "text-violet-300": "196,181,253",
  "text-yellow-300": "253,224,71",
};
```

### 2. Блок рендера секций/плиток — заменить текущий (плоский) на этот

```tsx
        const SectionIcon =
          SECTION_ICONS[section.title] || Sparkles;
        // Цвет свечения секции — берём из первого элемента для акцента заголовка
        const accentGlow = GLOW_COLOR[section.items[0]?.color] || "16,185,129";
        return (
        <div
          key={section.title}
          className="glass-card p-3.5 rounded-3xl"
          style={{ animation: "card-enter 0.4s ease-out both" }}
        >
          <div className="flex items-center gap-2.5 mb-3.5 px-0.5">
            <div
              className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0"
              style={{ boxShadow: `0 0 0 1px rgba(${accentGlow},0.15), 0 2px 8px rgba(${accentGlow},0.15)` }}
            >
              <SectionIcon size={16} style={{ color: `rgba(${accentGlow},1)` }} />
            </div>
            <h3 className="text-[11px] font-semibold text-white/55 uppercase tracking-wider">
              {section.title}
            </h3>
            <div
              className="flex-1 h-px ml-1"
              style={{ background: `linear-gradient(90deg, rgba(${accentGlow},0.25), transparent)` }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {section.items.map(({ icon: Icon, label, path, color, grad }, i) => {
              const glow = GLOW_COLOR[color] || "255,255,255";
              return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  animation: "tileIn 0.4s ease-out both",
                  animationDelay: `${Math.min(i * 0.04, 0.32)}s`,
                }}
                className="group relative rounded-2xl p-3 flex flex-col items-center gap-2
                           bg-white/[0.03] border border-white/[0.07]
                           hover:bg-white/[0.07] hover:border-white/15
                           hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
              >
                <div
                  className={`icon-fx-${i % 6} relative overflow-hidden bg-gradient-to-br ${grad} w-12 h-12 rounded-2xl flex items-center justify-center
                              ring-1 ring-white/10 group-hover:ring-white/25 transition-shadow`}
                  style={{
                    boxShadow: `0 4px 14px -4px rgba(${glow},0.45), inset 0 1px 0 rgba(255,255,255,0.15)`,
                  }}
                >
                  {/* Глянцевый блик сверху */}
                  <div
                    className="absolute inset-x-0 top-0 h-1/2 rounded-t-2xl pointer-events-none"
                    style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.14), transparent)" }}
                  />
                  <Icon size={22} className={`relative ${color}`} strokeWidth={2} />
                </div>
                <span className="text-[10px] text-white/80 font-medium text-center leading-tight line-clamp-2 px-0.5">
                  {label}
                </span>
              </button>
              );
            })}
          </div>
        </div>
        );
      })}
```

## Что стало (текущая, минималистичная версия — flat, без свечений/бликов)

```tsx
        const SectionIcon =
          SECTION_ICONS[section.title] || Sparkles;
        return (
        <div
          key={section.title}
          className="glass-card p-3.5 rounded-3xl"
          style={{ animation: "card-enter 0.4s ease-out both" }}
        >
          <div className="flex items-center gap-2.5 mb-3.5 px-0.5">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
              <SectionIcon size={16} className="text-white/50" />
            </div>
            <h3 className="text-[11px] font-semibold text-white/55 uppercase tracking-wider">
              {section.title}
            </h3>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {section.items.map(({ icon: Icon, label, path, color }, i) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  animation: "tileIn 0.4s ease-out both",
                  animationDelay: `${Math.min(i * 0.04, 0.32)}s`,
                }}
                className="group relative rounded-2xl p-3 flex flex-col items-center gap-2
                           bg-white/[0.03] border border-white/[0.07]
                           hover:bg-white/[0.06] hover:border-white/12
                           active:scale-95 transition-all duration-200"
              >
                <div className="icon-fx-none w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                  <Icon size={20} className={color} strokeWidth={1.75} />
                </div>
                <span className="text-[10px] text-white/70 font-medium text-center leading-tight line-clamp-2 px-0.5">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
        );
      })}
```

## Как вернуть версию со свечением

1. Открыть `src/pages/Dashboard.tsx`.
2. Добавить константу `GLOW_COLOR` (см. выше) сразу после `SECTION_ICONS`.
3. Найти текущий (плоский) блок рендера секций/плиток — заменить на код «Что было» из этого файла.
4. Проверить `npx tsc -p tsconfig.app.json --noEmit` — должно быть чисто.
