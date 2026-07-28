import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { format } from "date-fns";
import { X, BookOpen, Download, Sparkles, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Matches the gradient map in DailyDevotionModal
const THEME_COLORS: Record<string, [string, string]> = {
  Strength: ["#1a1230", "#3b1f6e"], Purpose: ["#0f2027", "#203a43"],
  Renewal: ["#134e4a", "#0f766e"], Confidence: ["#431407", "#9a3412"],
  Faith: ["#1e1b4b", "#3730a3"], Resilience: ["#14532d", "#15803d"],
  Courage: ["#450a0a", "#991b1b"], Priority: ["#1c1917", "#44403c"],
  Trust: ["#0c4a6e", "#0369a1"], Abundance: ["#422006", "#92400e"],
  Transformation: ["#2e1065", "#6d28d9"], Perseverance: ["#1a2e05", "#365314"],
  Desires: ["#500724", "#9f1239"], Excellence: ["#1c1917", "#78350f"],
  Peace: ["#0c4a6e", "#164e63"], Joy: ["#713f12", "#ca8a04"],
  Vision: ["#1e1b4b", "#4c1d95"], Wellness: ["#052e16", "#166534"],
  Hope: ["#0f172a", "#1e3a5f"], Words: ["#2d1b69", "#5b21b6"],
  Presence: ["#1f2937", "#374151"], Prosperity: ["#064e3b", "#047857"],
  Character: ["#1c1917", "#57534e"], Rest: ["#0f172a", "#1e293b"],
  Surrender: ["#2d1b69", "#4c1d95"], Promise: ["#1e3a5f", "#1d4ed8"],
  Healing: ["#14532d", "#166534"], Victory: ["#450a0a", "#b91c1c"],
  Identity: ["#1e1b4b", "#312e81"], Growth: ["#052e16", "#15803d"],
  Protection: ["#1c1917", "#292524"], Generosity: ["#422006", "#b45309"],
  Beloved: ["#500724", "#be185d"], Guidance: ["#0c4a6e", "#075985"],
  Diligence: ["#1c1917", "#44403c"], Wisdom: ["#1e1b4b", "#4338ca"],
  Planning: ["#0f172a", "#1e3a5f"], Impact: ["#431407", "#c2410c"],
  Power: ["#2d1b69", "#7c3aed"], Grace: ["#500724", "#9f1239"],
  "New Beginnings": ["#064e3b", "#0f766e"],
};
const DEFAULT_COLORS: [string, string] = ["#1a1230", "#2d1f4e"];

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) { ctx.fillText(line, x, currentY); currentY += lineHeight; }
  return currentY;
}

function downloadDevotionAsImage(devotion: {
  verse: string; verseRef: string; affirmation: string; theme: string | null; date: string;
}) {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const [from, to] = THEME_COLORS[devotion.theme ?? ""] ?? DEFAULT_COLORS;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, from);
  grad.addColorStop(1, to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Decorative circle top-right
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(size, 0, 320, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, size, 200, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  const pad = 80;
  const contentW = size - pad * 2;

  // BDB brand tag
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.letterSpacing = "6px";
  ctx.fillText("BE · DO · BECOME", pad, 88);
  ctx.letterSpacing = "0px";

  // Theme badge pill
  if (devotion.theme) {
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    const badgeW = ctx.measureText(devotion.theme).width + 48;
    ctx.beginPath();
    ctx.roundRect(pad, 116, badgeW, 44, 22);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(devotion.theme, pad + 24, 144);
  }

  // Opening quote mark
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "bold 220px Georgia, serif";
  ctx.fillText("“", pad - 18, 320);

  // Verse text
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 44px -apple-system, BlinkMacSystemFont, Georgia, serif`;
  ctx.textBaseline = "top";
  const verseEndY = wrapText(ctx, devotion.verse, pad + 32, 260, contentW - 32, 62);

  // Verse ref
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(`— ${devotion.verseRef}`, pad + 32, verseEndY + 16);

  // Divider
  const dividerY = verseEndY + 80;
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, dividerY); ctx.lineTo(size - pad, dividerY); ctx.stroke();

  // "Today's Affirmation" label
  ctx.fillStyle = "rgba(134,239,172,0.9)"; // emerald
  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.letterSpacing = "3px";
  ctx.fillText("TODAY’S AFFIRMATION", pad, dividerY + 40);
  ctx.letterSpacing = "0px";

  // Affirmation text
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `italic 38px -apple-system, BlinkMacSystemFont, Georgia, serif`;
  wrapText(ctx, `"${devotion.affirmation}"`, pad, dividerY + 80, contentW, 54);

  // Date at bottom
  const dateLabel = (() => {
    try { return format(new Date(devotion.date + "T12:00:00"), "MMMM d, yyyy"); }
    catch { return devotion.date; }
  })();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "28px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(dateLabel, pad, size - 60);

  // Trigger download
  canvas.toBlob(blob => {
    if (!blob) { toast.error("Could not generate image."); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devotion-${devotion.date}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Image saved! On mobile, open your Downloads folder or Photos app.");
  }, "image/png");
}

interface Props { onClose: () => void }

export default function DevotionHistoryPanel({ onClose }: Props) {
  const { isAuthenticated } = useAuth();
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: history = [], isLoading } = trpc.devotion.getHistory.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md h-full bg-background shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-indigo-950 to-violet-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Daily Word Archive</p>
              <p className="text-[10px] text-white/60">Your bible verses &amp; affirmations</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          )}
          {!isLoading && history.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No devotions yet.</p>
              <p className="text-xs mt-1">Open the Daily Word each day to build your archive.</p>
            </div>
          )}
          {history.map((d) => {
            const [from, to] = THEME_COLORS[d.theme ?? ""] ?? DEFAULT_COLORS;
            const isOpen = expanded === d.id;
            const dateLabel = (() => {
              try { return format(new Date(d.date + "T12:00:00"), "EEE, MMM d, yyyy"); }
              catch { return d.date; }
            })();

            return (
              <div key={d.id} className="rounded-2xl overflow-hidden border border-border shadow-sm">
                {/* Card header — always visible */}
                <button
                  className="w-full text-left"
                  onClick={() => setExpanded(isOpen ? null : d.id)}
                >
                  <div
                    className="px-4 py-3 flex items-start gap-3"
                    style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {d.theme && (
                          <span className="text-[10px] font-bold text-white/70 bg-white/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
                            {d.theme}
                          </span>
                        )}
                        <span className="text-[10px] text-white/50">{dateLabel}</span>
                      </div>
                      <p className="text-xs font-semibold text-white leading-relaxed line-clamp-2">
                        "{d.verse}"
                      </p>
                      <p className="text-[10px] text-white/60 mt-0.5">— {d.verseRef}</p>
                    </div>
                    <div className="shrink-0 text-white/50 mt-1">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {/* Expanded body */}
                {isOpen && (
                  <div className="bg-background px-4 py-3 space-y-3">
                    {/* Full verse */}
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Scripture</p>
                      <p className="text-sm text-foreground leading-relaxed italic">"{d.verse}"</p>
                      <p className="text-xs text-muted-foreground mt-0.5">— {d.verseRef}</p>
                    </div>

                    {/* Affirmation */}
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-3 py-2.5 border border-emerald-100 dark:border-emerald-900">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Affirmation</p>
                      </div>
                      <p className="text-sm text-foreground italic leading-relaxed">{d.affirmation}</p>
                    </div>

                    {/* Download button */}
                    <button
                      onClick={() => downloadDevotionAsImage(d)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Save as Image
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer count */}
        {history.length > 0 && (
          <div className="px-5 py-3 border-t border-border text-center">
            <p className="text-[11px] text-muted-foreground">
              {history.length} {history.length === 1 ? "entry" : "entries"} · tap any card to expand &amp; download
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
