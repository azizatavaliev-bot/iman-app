// ============================================================
// Генератор обоев для iPhone с аятом (арабский + транскрипция + перевод)
// ============================================================

export type WallpaperFontKey = "inter" | "montserrat" | "nunito" | "manrope";

interface WallpaperFont {
  label: string;
  family: string;
  boldWeight: string;
}

export const WALLPAPER_FONTS: Record<WallpaperFontKey, WallpaperFont> = {
  inter: { label: "Inter", family: "'Inter', sans-serif", boldWeight: "700" },
  montserrat: {
    label: "Montserrat",
    family: "'Montserrat', sans-serif",
    boldWeight: "800",
  },
  nunito: {
    label: "Nunito",
    family: "'Nunito', sans-serif",
    boldWeight: "800",
  },
  manrope: {
    label: "Manrope",
    family: "'Manrope', sans-serif",
    boldWeight: "800",
  },
};

export type WallpaperDeviceKey = "standard" | "proMax" | "plus" | "se";

interface WallpaperDevice {
  label: string;
  sublabel: string;
  width: number;
  height: number;
}

export const WALLPAPER_DEVICES: Record<WallpaperDeviceKey, WallpaperDevice> = {
  standard: {
    label: "Стандарт",
    sublabel: "iPhone 12/13/14/15",
    width: 1170,
    height: 2532,
  },
  proMax: {
    label: "Pro Max",
    sublabel: "iPhone 12–15 Pro Max",
    width: 1290,
    height: 2796,
  },
  plus: {
    label: "Plus",
    sublabel: "iPhone 11/XS Max, Plus",
    width: 1242,
    height: 2688,
  },
  se: {
    label: "SE / mini",
    sublabel: "iPhone SE, 8, mini",
    width: 1080,
    height: 1920,
  },
};

export type WallpaperThemeKey =
  | "emerald"
  | "gold"
  | "violet"
  | "rose"
  | "midnight"
  | "teal"
  | "indigo"
  | "crimson"
  | "sunset"
  | "graphite";

interface WallpaperTheme {
  label: string;
  swatch: string; // css для кружка-превью темы в UI
  bgStops: [number, string][];
  glowColor: string; // rgba с альфой в центре
  bismillah: string;
  arabic: string;
  divider: string;
  translit: string;
  translation: string;
  footer: string;
  brand: string;
}

export const WALLPAPER_THEMES: Record<WallpaperThemeKey, WallpaperTheme> = {
  emerald: {
    label: "Изумруд",
    swatch: "linear-gradient(135deg, #10b981, #0f172a)",
    bgStops: [
      [0, "#0f172a"],
      [0.55, "#0b1220"],
      [1, "#020617"],
    ],
    glowColor: "16,185,129",
    bismillah: "rgba(251,191,36,0.55)",
    arabic: "#fde9c8",
    divider: "rgba(251,191,36,0.25)",
    translit: "rgba(196,181,253,0.85)",
    translation: "rgba(226,232,240,0.92)",
    footer: "rgba(148,163,184,0.75)",
    brand: "rgba(52,211,153,0.9)",
  },
  gold: {
    label: "Золото",
    swatch: "linear-gradient(135deg, #f59e0b, #1c1408)",
    bgStops: [
      [0, "#1c1408"],
      [0.55, "#150f06"],
      [1, "#0a0703"],
    ],
    glowColor: "245,158,11",
    bismillah: "rgba(253,224,71,0.6)",
    arabic: "#fff3d6",
    divider: "rgba(245,158,11,0.3)",
    translit: "rgba(252,211,148,0.8)",
    translation: "rgba(255,247,232,0.92)",
    footer: "rgba(217,190,140,0.75)",
    brand: "rgba(245,158,11,0.95)",
  },
  violet: {
    label: "Аметист",
    swatch: "linear-gradient(135deg, #8b5cf6, #1e1033)",
    bgStops: [
      [0, "#1e1033"],
      [0.55, "#160b28"],
      [1, "#0b0616"],
    ],
    glowColor: "139,92,246",
    bismillah: "rgba(216,180,254,0.6)",
    arabic: "#f3e8ff",
    divider: "rgba(167,139,250,0.3)",
    translit: "rgba(233,213,255,0.8)",
    translation: "rgba(243,232,255,0.92)",
    footer: "rgba(196,181,253,0.75)",
    brand: "rgba(167,139,250,0.95)",
  },
  rose: {
    label: "Роза",
    swatch: "linear-gradient(135deg, #f43f5e, #2b0f16)",
    bgStops: [
      [0, "#2b0f16"],
      [0.55, "#1f0a10"],
      [1, "#0f0508"],
    ],
    glowColor: "244,63,94",
    bismillah: "rgba(253,164,175,0.6)",
    arabic: "#ffe4e8",
    divider: "rgba(251,113,133,0.3)",
    translit: "rgba(254,205,211,0.8)",
    translation: "rgba(255,241,242,0.92)",
    footer: "rgba(253,164,175,0.75)",
    brand: "rgba(251,113,133,0.95)",
  },
  midnight: {
    label: "Полночь",
    swatch: "linear-gradient(135deg, #0ea5e9, #020617)",
    bgStops: [
      [0, "#0a1224"],
      [0.55, "#050a16"],
      [1, "#000000"],
    ],
    glowColor: "14,165,233",
    bismillah: "rgba(186,230,253,0.65)",
    arabic: "#e0f2fe",
    divider: "rgba(56,189,248,0.32)",
    translit: "rgba(224,242,254,0.95)",
    translation: "rgba(226,232,240,0.95)",
    footer: "rgba(186,199,222,0.8)",
    brand: "rgba(56,189,248,0.98)",
  },
  teal: {
    label: "Бирюза",
    swatch: "linear-gradient(135deg, #14b8a6, #042f2e)",
    bgStops: [
      [0, "#042f2e"],
      [0.55, "#032220"],
      [1, "#010f0e"],
    ],
    glowColor: "20,184,166",
    bismillah: "rgba(153,246,228,0.6)",
    arabic: "#ccfbf1",
    divider: "rgba(45,212,191,0.28)",
    translit: "rgba(204,251,241,0.85)",
    translation: "rgba(240,253,250,0.92)",
    footer: "rgba(153,246,228,0.7)",
    brand: "rgba(45,212,191,0.95)",
  },
  indigo: {
    label: "Индиго",
    swatch: "linear-gradient(135deg, #6366f1, #1e1b4b)",
    bgStops: [
      [0, "#1e1b4b"],
      [0.55, "#151233"],
      [1, "#0a081a"],
    ],
    glowColor: "99,102,241",
    bismillah: "rgba(199,210,254,0.6)",
    arabic: "#e0e7ff",
    divider: "rgba(129,140,248,0.28)",
    translit: "rgba(224,231,255,0.85)",
    translation: "rgba(238,242,255,0.92)",
    footer: "rgba(199,210,254,0.7)",
    brand: "rgba(129,140,248,0.95)",
  },
  crimson: {
    label: "Багрянец",
    swatch: "linear-gradient(135deg, #dc2626, #1f0a0a)",
    bgStops: [
      [0, "#2b0e0e"],
      [0.55, "#1f0a0a"],
      [1, "#0d0404"],
    ],
    glowColor: "220,38,38",
    bismillah: "rgba(254,202,202,0.6)",
    arabic: "#fee2e2",
    divider: "rgba(248,113,113,0.28)",
    translit: "rgba(254,226,226,0.85)",
    translation: "rgba(255,241,241,0.92)",
    footer: "rgba(254,202,202,0.7)",
    brand: "rgba(248,113,113,0.95)",
  },
  sunset: {
    label: "Закат",
    swatch: "linear-gradient(135deg, #fb923c, #2b1206)",
    bgStops: [
      [0, "#2b1206"],
      [0.55, "#1f0d05"],
      [1, "#0d0602"],
    ],
    glowColor: "251,146,60",
    bismillah: "rgba(254,215,170,0.6)",
    arabic: "#ffedd5",
    divider: "rgba(251,146,60,0.3)",
    translit: "rgba(254,215,170,0.85)",
    translation: "rgba(255,247,237,0.92)",
    footer: "rgba(254,215,170,0.7)",
    brand: "rgba(251,146,60,0.95)",
  },
  graphite: {
    label: "Графит",
    swatch: "linear-gradient(135deg, #94a3b8, #0f172a)",
    bgStops: [
      [0, "#1e293b"],
      [0.55, "#0f172a"],
      [1, "#020617"],
    ],
    glowColor: "148,163,184",
    bismillah: "rgba(226,232,240,0.55)",
    arabic: "#f1f5f9",
    divider: "rgba(148,163,184,0.28)",
    translit: "rgba(226,232,240,0.85)",
    translation: "rgba(241,245,249,0.92)",
    footer: "rgba(203,213,225,0.7)",
    brand: "rgba(203,213,225,0.95)",
  },
};

export interface WallpaperAyahSegment {
  number: number;
  translitText: string | null;
  translationText?: string;
}

export interface AyahWallpaperOptions {
  surahNameRu: string;
  surahNumber: number;
  /** Подпись в подвале, напр. "Аят 255 из 286" или "Сура целиком, 7 аятов" */
  footerLabel: string;
  /** Один аят — используются эти два поля (центрированный крупный блок) */
  translitText?: string | null;
  translationText?: string | null;
  /** Несколько аятов (вся сура) — каждый рисуется отдельным пронумерованным блоком */
  segments?: WallpaperAyahSegment[];
  theme?: WallpaperThemeKey;
  device?: WallpaperDeviceKey;
  font?: WallpaperFontKey;
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function ensureFontsReady() {
  try {
    await Promise.all([
      document.fonts.load("700 48px 'Amiri'"),
      document.fonts.load("400 32px 'Inter'"),
      document.fonts.load("600 32px 'Inter'"),
      document.fonts.load("700 48px 'Inter'"),
      document.fonts.load("800 48px 'Montserrat'"),
      document.fonts.load("800 48px 'Nunito'"),
      document.fonts.load("800 48px 'Manrope'"),
    ]);
    await document.fonts.ready;
  } catch {
    // ignore — canvas will fall back to default fonts
  }
}

export async function generateAyahWallpaper(
  opts: AyahWallpaperOptions,
): Promise<{ dataUrl: string; blob: Blob | null }> {
  await ensureFontsReady();

  const theme = WALLPAPER_THEMES[opts.theme ?? "emerald"];
  const device = WALLPAPER_DEVICES[opts.device ?? "standard"];
  const font = WALLPAPER_FONTS[opts.font ?? "inter"];
  const WIDTH = device.width;
  const HEIGHT = device.height;

  // Рендерим в 2x суперсэмплинге — текст получается чётче после сжатия
  // до точного разрешения экрана устройства (без потери качества).
  const SUPERSAMPLE = 2;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SUPERSAMPLE;
  canvas.height = HEIGHT * SUPERSAMPLE;
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) throw new Error("Canvas 2D context недоступен");
  const ctx = ctx2d;
  ctx.scale(SUPERSAMPLE, SUPERSAMPLE);
  ctx.textRendering = "optimizeLegibility" as CanvasTextRendering;
  // Явно фиксируем LTR и базовые настройки текста: без этого canvas берёт
  // direction "inherit", и если корень приложения rtl — текст уезжает вправо
  // при textAlign:"center". Держим строго по центру для всех тем/шрифтов.
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const padX = Math.round(WIDTH * 0.077);
  const maxTextWidth = WIDTH - padX * 2;

  // ---- Фон: градиент темы ----
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  for (const [stop, color] of theme.bgStops) bg.addColorStop(stop, color);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Мягкое свечение
  const glow = ctx.createRadialGradient(
    WIDTH / 2,
    HEIGHT * 0.32,
    50,
    WIDTH / 2,
    HEIGHT * 0.32,
    WIDTH * 0.8,
  );
  glow.addColorStop(0, `rgba(${theme.glowColor},0.16)`);
  glow.addColorStop(1, `rgba(${theme.glowColor},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Область, доступная под контент (между шапкой и подвалом с лого) —
  // если текст длинный, масштабируем шрифты вниз, чтобы всё поместилось
  // и не наезжало на подвал; если текст короткий — центрируем блок
  // вертикально, чтобы не было пустоты только снизу.
  const topBound = HEIGHT * 0.1;
  const footerY = HEIGHT - 150;
  const bottomBound = footerY - 50;
  const availableHeight = bottomBound - topBound;

  const isMultiSegment = Boolean(opts.segments && opts.segments.length > 1);

  // Базовые (100%) размеры шрифтов/интерлиньяжа
  // Транскрипция — главный, самый заметный и красивый элемент, поэтому
  // держим её крупной даже в режиме "вся сура", без номеров-бейджей —
  // только лёгкий орнамент-разделитель между аятами.
  const BASE = {
    bismillahGap: 84,
    dividerGap: 50,
    translitFont: isMultiSegment ? 42 : 48,
    translitLine: isMultiSegment ? 56 : 64,
    gapAfterTranslit: isMultiSegment ? 18 : 34,
    translationFont: isMultiSegment ? 27 : 32,
    translationLine: isMultiSegment ? 38 : 46,
    ornamentGap: 40,
    gapBetweenSegments: 36,
  };

  function measureSegment(scale: number, seg: { translitText: string | null; translationText?: string }) {
    let h = 0;
    let translitLines: string[] = [];
    if (seg.translitText) {
      ctx.font = `${font.boldWeight} ${BASE.translitFont * scale}px ${font.family}`;
      translitLines = wrapLines(ctx, seg.translitText, maxTextWidth);
      h += translitLines.length * BASE.translitLine * scale + BASE.gapAfterTranslit * scale;
    }
    let translationLines: string[] = [];
    if (seg.translationText) {
      ctx.font = `400 ${BASE.translationFont * scale}px 'Inter', sans-serif`;
      translationLines = wrapLines(ctx, seg.translationText, maxTextWidth);
      h += translationLines.length * BASE.translationLine * scale;
    }
    return { height: h, translitLines, translationLines };
  }

  function measure(scale: number) {
    let h = BASE.bismillahGap * scale + BASE.dividerGap * scale;

    if (isMultiSegment) {
      const segs = opts.segments!;
      const measured = segs.map((seg, i) => {
        const body = measureSegment(scale, seg);
        const gap = i < segs.length - 1 ? BASE.gapBetweenSegments * scale : 0;
        return { ...body, gap };
      });
      h += measured.reduce((sum, m) => sum + m.height + m.gap, 0);
      return { height: h, segments: measured };
    }

    const single = measureSegment(scale, {
      translitText: opts.translitText ?? null,
      translationText: opts.translationText ?? undefined,
    });
    h += single.height;
    return { height: h, single };
  }

  const baseline = measure(1);
  let scale = Math.min(1, availableHeight / baseline.height);
  scale = Math.max(scale, isMultiSegment ? 0.6 : 0.4); // не даём тексту стать нечитаемо мелким
  const final = measure(scale);
  // Блок текста всегда строго по центру доступной области — сверху и снизу
  // одинаковый отступ, никакой лишней пустоты только в одну сторону
  const extraSpace = Math.max(0, availableHeight - final.height);
  let y = topBound + extraSpace / 2;

  // ---- Бисмилля-декор (единственный арабский элемент — компактный символ) ----
  ctx.fillStyle = theme.bismillah;
  ctx.font = `400 ${40 * scale}px 'Amiri', serif`;
  ctx.textAlign = "center";
  ctx.fillText("﷽", WIDTH / 2, y);
  y += BASE.bismillahGap * scale;

  // ---- Разделитель ----
  ctx.strokeStyle = theme.divider;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2 - 60, y);
  ctx.lineTo(WIDTH / 2 + 60, y);
  ctx.stroke();
  y += BASE.dividerGap * scale;

  if (isMultiSegment && final.segments) {
    const segs = opts.segments!;
    segs.forEach((seg, i) => {
      const m = final.segments![i];

      if (seg.translitText) {
        ctx.fillStyle = theme.translit;
        ctx.font = `${font.boldWeight} ${BASE.translitFont * scale}px ${font.family}`;
        ctx.textAlign = "center";
        for (const line of m.translitLines) {
          ctx.fillText(line, WIDTH / 2, y);
          y += BASE.translitLine * scale;
        }
        y += BASE.gapAfterTranslit * scale;
      }

      if (seg.translationText) {
        ctx.fillStyle = theme.translation;
        ctx.font = `400 ${BASE.translationFont * scale}px 'Inter', sans-serif`;
        ctx.textAlign = "center";
        for (const line of m.translationLines) {
          ctx.fillText(line, WIDTH / 2, y);
          y += BASE.translationLine * scale;
        }
      }

      // Лёгкий орнамент-разделитель между аятами (вместо номера)
      if (i < segs.length - 1) {
        y += (BASE.gapBetweenSegments * scale) / 2;
        ctx.fillStyle = theme.divider;
        ctx.font = `400 ${22 * scale}px 'Inter', sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("· · ·", WIDTH / 2, y);
        y += (BASE.gapBetweenSegments * scale) / 2;
      }
    });
  } else if (final.single) {
    // ---- Транскрипция кириллицей — главный, самый крупный текст ----
    // (обои прежде всего для заучивания, поэтому легко читаемая русская
    // транскрипция важнее арабской вязи — арабский блок убран по просьбе)
    if (opts.translitText) {
      ctx.fillStyle = theme.translit;
      ctx.font = `${font.boldWeight} ${BASE.translitFont * scale}px ${font.family}`;
      ctx.textAlign = "center";
      for (const line of final.single.translitLines) {
        ctx.fillText(line, WIDTH / 2, y);
        y += BASE.translitLine * scale;
      }
      y += BASE.gapAfterTranslit * scale;
    }

    // ---- Перевод (пишем полностью, без сокращений) ----
    if (opts.translationText) {
      ctx.fillStyle = theme.translation;
      ctx.font = `400 ${BASE.translationFont * scale}px 'Inter', sans-serif`;
      ctx.textAlign = "center";
      for (const line of final.single.translationLines) {
        ctx.fillText(line, WIDTH / 2, y);
        y += BASE.translationLine * scale;
      }
    }
  }

  // ---- Подвал: источник/подпись сверху (переносится на 2 строки, если длинная),
  // фирменная подпись IMAN ниже, всё строго по центру ----
  ctx.fillStyle = theme.footer;
  ctx.font = "600 26px 'Inter', sans-serif";
  ctx.textAlign = "center";
  const footerText = `${opts.surahNameRu} · ${opts.footerLabel}`;
  const footerMaxWidth = WIDTH - padX * 1.4;
  const footerLines = wrapLines(ctx, footerText, footerMaxWidth).slice(0, 2);
  let footerLineY = footerY - (footerLines.length - 1) * 30;
  for (const line of footerLines) {
    ctx.fillText(line, WIDTH / 2, footerLineY);
    footerLineY += 30;
  }

  const brandY = footerY + (footerLines.length > 1 ? 62 : 52);
  ctx.fillStyle = theme.brand;
  ctx.font = "700 32px 'Inter', sans-serif";
  ctx.fillText("IMAN", WIDTH / 2, brandY);

  ctx.fillStyle = theme.footer;
  ctx.font = "400 22px 'Inter', sans-serif";
  ctx.fillText("Путь мусульманина", WIDTH / 2, brandY + 32);

  // Сжимаем суперсэмплированный рендер до точного разрешения экрана устройства —
  // текст выходит чётче за счёт сглаживания при уменьшении с 2x.
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = WIDTH;
  outputCanvas.height = HEIGHT;
  const outputCtx = outputCanvas.getContext("2d");
  if (!outputCtx) throw new Error("Canvas 2D context недоступен");
  outputCtx.imageSmoothingEnabled = true;
  outputCtx.imageSmoothingQuality = "high";
  outputCtx.drawImage(canvas, 0, 0, WIDTH, HEIGHT);

  return new Promise<{ dataUrl: string; blob: Blob | null }>((resolve) => {
    outputCanvas.toBlob(
      (blob) => resolve({ dataUrl: outputCanvas.toDataURL("image/png"), blob }),
      "image/png",
      1,
    );
  });
}

export function downloadWallpaper(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * На iPhone (особенно внутри Telegram Mini App) обычный <a download> часто
 * просто открывает картинку вместо сохранения в Фото. Web Share API с файлом
 * даёт системный диалог "Сохранить изображение" — это надёжнее.
 * Если Share API с файлами недоступен — откатываемся на скачивание.
 */
export async function shareOrDownloadWallpaper(
  dataUrl: string,
  blob: Blob | null,
  filename: string,
): Promise<"shared" | "downloaded"> {
  if (blob && typeof navigator.share === "function") {
    const file = new File([blob], filename, { type: "image/png" });
    const canShareFiles =
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] });
    if (canShareFiles) {
      try {
        await navigator.share({
          files: [file],
          title: "Обои IMAN",
        });
        return "shared";
      } catch (err) {
        // Пользователь отменил шаринг — это не ошибка, просто ничего не делаем
        if ((err as Error)?.name === "AbortError") return "shared";
        // Иначе — откатываемся на скачивание
      }
    }
  }
  downloadWallpaper(dataUrl, filename);
  return "downloaded";
}
