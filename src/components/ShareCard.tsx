import { useState, useRef, useCallback } from "react";
import { Download, Share2, X, Palette } from "lucide-react";

// Gradient themes for share cards
const THEMES = [
  { name: "Emerald", bg: "linear-gradient(135deg, #064e3b 0%, #0f766e 50%, #065f46 100%)", text: "#d1fae5", accent: "#6ee7b7" },
  { name: "Night", bg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0c0a09 100%)", text: "#e2e8f0", accent: "#a78bfa" },
  { name: "Amber", bg: "linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #78350f 100%)", text: "#fed7aa", accent: "#fdba74" },
  { name: "Ocean", bg: "linear-gradient(135deg, #0c4a6e 0%, #155e75 50%, #164e63 100%)", text: "#cffafe", accent: "#67e8f9" },
  { name: "Rose", bg: "linear-gradient(135deg, #4c0519 0%, #881337 50%, #831843 100%)", text: "#fce7f3", accent: "#f9a8d4" },
  { name: "Gold", bg: "linear-gradient(135deg, #451a03 0%, #78350f 50%, #713f12 100%)", text: "#fef3c7", accent: "#fbbf24" },
];

interface ShareCardProps {
  type: "hadith" | "ayat" | "dua" | "name" | "dhikr";
  arabic?: string;
  text: string;
  source?: string;
  surah?: string;
  onClose: () => void;
}

export default function ShareCard({ type, arabic, text, source, surah, onClose }: ShareCardProps) {
  const [themeIdx, setThemeIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = THEMES[themeIdx];

  const typeLabels: Record<string, string> = {
    hadith: "Хадис",
    ayat: "Аят Корана",
    dua: "Дуа",
    name: "Имя Аллаха",
    dhikr: "Зикр",
  };

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    // Parse gradient
    const gradMatch = theme.bg.match(/linear-gradient\((\d+)deg,\s*(#\w+)\s+\d+%,\s*(#\w+)\s+\d+%,\s*(#\w+)\s+\d+%\)/);
    const c1 = gradMatch?.[2] || "#064e3b";
    const c2 = gradMatch?.[3] || "#0f766e";
    const c3 = gradMatch?.[4] || "#065f46";

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, c1);
    grad.addColorStop(0.5, c2);
    grad.addColorStop(1, c3);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Decorative pattern (geometric Islamic pattern hint)
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const r = 30 + Math.random() * 60;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Top decorative line
    ctx.fillStyle = theme.accent;
    ctx.fillRect(W / 2 - 40, 140, 80, 3);

    // Type label
    ctx.font = "600 28px Inter, system-ui, sans-serif";
    ctx.fillStyle = theme.accent;
    ctx.textAlign = "center";
    ctx.fillText(typeLabels[type] || "Напоминание", W / 2, 200);

    // Decorative bismillah / ornament
    ctx.font = "48px serif";
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.6;
    ctx.fillText("﷽", W / 2, 290);
    ctx.globalAlpha = 1;

    // Arabic text (if provided)
    let yPos = 380;
    if (arabic) {
      ctx.font = "700 52px 'Scheherazade New', 'Amiri', serif";
      ctx.fillStyle = theme.accent;
      ctx.textAlign = "center";
      ctx.direction = "rtl";

      const arabicLines = wrapText(ctx, arabic, W - 160);
      for (const line of arabicLines) {
        ctx.fillText(line, W / 2, yPos);
        yPos += 72;
      }
      ctx.direction = "ltr";
      yPos += 30;
    }

    // Divider
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(W / 2 - 60, yPos, 120, 2);
    ctx.globalAlpha = 1;
    yPos += 50;

    // Main text (translation)
    ctx.font = "500 36px Inter, system-ui, sans-serif";
    ctx.fillStyle = theme.text;
    ctx.textAlign = "center";

    const lines = wrapText(ctx, text, W - 140);
    for (const line of lines) {
      if (yPos > H - 350) break;
      ctx.fillText(line, W / 2, yPos);
      yPos += 52;
    }

    // Source
    if (source || surah) {
      yPos += 30;
      ctx.font = "italic 400 26px Inter, system-ui, sans-serif";
      ctx.fillStyle = theme.accent;
      ctx.globalAlpha = 0.8;
      ctx.fillText(source || surah || "", W / 2, yPos);
      ctx.globalAlpha = 1;
    }

    // Bottom branding area
    const brandY = H - 160;

    // Separator line
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(80, brandY - 30, W - 160, 1);
    ctx.globalAlpha = 1;

    // App name
    ctx.font = "700 30px Inter, system-ui, sans-serif";
    ctx.fillStyle = theme.accent;
    ctx.textAlign = "center";
    ctx.fillText("IMAN App", W / 2, brandY + 20);

    // Author
    ctx.font = "400 22px Inter, system-ui, sans-serif";
    ctx.fillStyle = theme.text;
    ctx.globalAlpha = 0.6;
    ctx.fillText("by Aziz Atavaliev  •  @ImanAppBot", W / 2, brandY + 60);
    ctx.globalAlpha = 1;

    // Bottom accent line
    ctx.fillStyle = theme.accent;
    ctx.fillRect(W / 2 - 30, brandY + 90, 60, 3);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 1);
    });
  }, [theme, arabic, text, source, surah, type]);

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  async function handleDownload() {
    setGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `iman-${type}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  async function handleShare() {
    setGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) return;
      const file = new File([blob], `iman-${type}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${typeLabels[type]} — IMAN App`,
          files: [file],
        });
      } else {
        // Fallback: download
        handleDownload();
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-slate-900 rounded-t-3xl p-5 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">Поделиться</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Preview card */}
        <div
          className="rounded-2xl p-6 mb-4 min-h-[200px] flex flex-col items-center justify-center text-center"
          style={{ background: theme.bg }}
        >
          <div className="text-xs font-semibold mb-2 opacity-80" style={{ color: theme.accent }}>
            {typeLabels[type]}
          </div>
          {arabic && (
            <div className="text-xl font-bold mb-3 leading-relaxed" style={{ color: theme.accent, direction: "rtl", fontFamily: "serif" }}>
              {arabic.length > 100 ? arabic.substring(0, 100) + "..." : arabic}
            </div>
          )}
          <div className="text-sm leading-relaxed mb-3" style={{ color: theme.text }}>
            {text.length > 150 ? text.substring(0, 150) + "..." : text}
          </div>
          {(source || surah) && (
            <div className="text-xs opacity-60" style={{ color: theme.accent }}>
              {source || surah}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-white/10 w-full">
            <div className="text-xs font-bold" style={{ color: theme.accent }}>IMAN App</div>
            <div className="text-[10px] opacity-50" style={{ color: theme.text }}>by Aziz Atavaliev</div>
          </div>
        </div>

        {/* Theme picker */}
        <div className="flex items-center gap-2 mb-5">
          <Palette className="w-4 h-4 text-gray-500" />
          <div className="flex gap-2 flex-1">
            {THEMES.map((t, i) => (
              <button
                key={i}
                onClick={() => setThemeIdx(i)}
                className={`flex-1 h-8 rounded-lg transition-all ${i === themeIdx ? "ring-2 ring-white scale-105" : "opacity-60"}`}
                style={{ background: t.bg }}
              />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={generating}
            className="flex-1 py-3.5 rounded-xl bg-white/10 text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            Скачать
          </button>
          <button
            onClick={handleShare}
            disabled={generating}
            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <Share2 className="w-5 h-5" />
            Поделиться
          </button>
        </div>

        {/* Hidden canvas */}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </div>
  );
}
