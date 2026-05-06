import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  BookOpen, Sparkles, X, BookMarked, Share2, Loader2, CheckCircle2, Heart
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onClose: () => void;
}

// Theme → gradient map for visual variety
const THEME_STYLES: Record<string, { from: string; to: string; badge: string }> = {
  Strength:      { from: "#1a1230", to: "#3b1f6e", badge: "bg-violet-700" },
  Purpose:       { from: "#0f2027", to: "#203a43", badge: "bg-teal-700" },
  Renewal:       { from: "#134e4a", to: "#0f766e", badge: "bg-emerald-700" },
  Confidence:    { from: "#431407", to: "#9a3412", badge: "bg-orange-700" },
  Faith:         { from: "#1e1b4b", to: "#3730a3", badge: "bg-indigo-700" },
  Resilience:    { from: "#14532d", to: "#15803d", badge: "bg-green-700" },
  Courage:       { from: "#450a0a", to: "#991b1b", badge: "bg-red-700" },
  Priority:      { from: "#1c1917", to: "#44403c", badge: "bg-stone-600" },
  Trust:         { from: "#0c4a6e", to: "#0369a1", badge: "bg-sky-700" },
  Abundance:     { from: "#422006", to: "#92400e", badge: "bg-amber-800" },
  Transformation:{ from: "#2e1065", to: "#6d28d9", badge: "bg-purple-700" },
  Perseverance:  { from: "#1a2e05", to: "#365314", badge: "bg-lime-800" },
  Desires:       { from: "#500724", to: "#9f1239", badge: "bg-rose-800" },
  Excellence:    { from: "#1c1917", to: "#78350f", badge: "bg-yellow-800" },
  Peace:         { from: "#0c4a6e", to: "#164e63", badge: "bg-cyan-800" },
  Joy:           { from: "#713f12", to: "#ca8a04", badge: "bg-yellow-700" },
  Vision:        { from: "#1e1b4b", to: "#4c1d95", badge: "bg-violet-800" },
  Wellness:      { from: "#052e16", to: "#166534", badge: "bg-green-800" },
  Hope:          { from: "#0f172a", to: "#1e3a5f", badge: "bg-blue-800" },
  Words:         { from: "#2d1b69", to: "#5b21b6", badge: "bg-purple-800" },
  Presence:      { from: "#1f2937", to: "#374151", badge: "bg-gray-700" },
  Prosperity:    { from: "#064e3b", to: "#047857", badge: "bg-emerald-800" },
  Character:     { from: "#1c1917", to: "#57534e", badge: "bg-stone-700" },
  Rest:          { from: "#0f172a", to: "#1e293b", badge: "bg-slate-700" },
  Surrender:     { from: "#2d1b69", to: "#4c1d95", badge: "bg-violet-900" },
  Promise:       { from: "#1e3a5f", to: "#1d4ed8", badge: "bg-blue-700" },
  Healing:       { from: "#14532d", to: "#166534", badge: "bg-green-700" },
  Victory:       { from: "#450a0a", to: "#b91c1c", badge: "bg-red-800" },
  Identity:      { from: "#1e1b4b", to: "#312e81", badge: "bg-indigo-800" },
  Growth:        { from: "#052e16", to: "#15803d", badge: "bg-emerald-700" },
  Protection:    { from: "#1c1917", to: "#292524", badge: "bg-stone-800" },
  Generosity:    { from: "#422006", to: "#b45309", badge: "bg-amber-700" },
  Beloved:       { from: "#500724", to: "#be185d", badge: "bg-pink-800" },
  Guidance:      { from: "#0c4a6e", to: "#075985", badge: "bg-sky-800" },
  Diligence:     { from: "#1c1917", to: "#44403c", badge: "bg-stone-600" },
  Wisdom:        { from: "#1e1b4b", to: "#4338ca", badge: "bg-indigo-700" },
  Planning:      { from: "#0f172a", to: "#1e3a5f", badge: "bg-blue-900" },
  Impact:        { from: "#431407", to: "#c2410c", badge: "bg-orange-800" },
  Power:         { from: "#2d1b69", to: "#7c3aed", badge: "bg-violet-700" },
  Grace:         { from: "#500724", to: "#9f1239", badge: "bg-rose-900" },
  "New Beginnings": { from: "#064e3b", to: "#0f766e", badge: "bg-teal-800" },
};

const DEFAULT_STYLE = { from: "#1a1230", to: "#2d1f4e", badge: "bg-violet-700" };

export default function DailyDevotionModal({ open, onClose }: Props) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: devotion, isLoading } = trpc.devotion.getToday.useQuery(undefined, {
    enabled: open,
    staleTime: 1000 * 60 * 60, // cache for 1 hour
  });

  const dismissMutation = trpc.devotion.dismiss.useMutation();
  const saveMutation = trpc.devotion.saveToPlanner.useMutation();
  const utils = trpc.useUtils();

  const style = THEME_STYLES[devotion?.theme ?? ""] ?? DEFAULT_STYLE;

  const handleDismiss = async () => {
    try {
      await dismissMutation.mutateAsync();
    } catch {
      // Dismissal failure is non-critical; proceed to close regardless
      console.error("Failed to dismiss devotion modal:", "mutation error");
    } finally {
      utils.devotion.getToday.invalidate();
      onClose();
    }
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync();
      setSaved(true);
      utils.devotion.getToday.invalidate();
      toast.success("Devotion saved to your Notes → Daily Devotions folder");
    } catch {
      toast.error("Couldn't save. Please try again.");
    }
  };

  const handleShare = async () => {
    if (!devotion) return;
    const text = `"${devotion.verse}" — ${devotion.verseRef}\n\nAffirmation: ${devotion.affirmation}\n\n#BeDoBecome #BDBPlanner`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard — ready to share!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">

        {/* Hero header with dynamic gradient */}
        <div
          className="relative px-7 pt-8 pb-10 text-white overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${style.from} 0%, ${style.to} 100%)` }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10 bg-white" />
          <div className="absolute -bottom-12 -left-6 w-32 h-32 rounded-full opacity-10 bg-white" />

          {/* Close */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={16} className="text-white/80" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
              <BookOpen size={16} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-white/60">Daily Word</p>
              <p className="text-xs text-white/80">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-white/60" />
            </div>
          ) : devotion ? (
            <>
              {/* Theme badge */}
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full text-white/90 mb-4 ${style.badge}`}>
                <Heart size={9} /> {devotion.theme}
              </span>

              {/* Verse */}
              <blockquote className="text-lg font-semibold leading-relaxed text-white mb-3 relative">
                <span className="text-5xl text-white/20 font-serif absolute -top-3 -left-1">"</span>
                <span className="relative z-10 pl-4">{devotion.verse}</span>
              </blockquote>
              <p className="text-sm font-bold text-white/70 pl-4">— {devotion.verseRef}</p>
            </>
          ) : null}
        </div>

        {/* Affirmation section */}
        {devotion && !isLoading && (
          <div className="bg-[#faf8f5] px-7 py-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Sparkles size={15} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Today's Affirmation · from Zion</p>
                <p className="text-[15px] text-[#2d2520] font-medium leading-relaxed italic">
                  {devotion.affirmation}
                </p>
              </div>
            </div>

            {/* Speak it prompt */}
            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-amber-700 font-medium">
                🗣 Speak this affirmation out loud 3 times before you begin your day.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        {devotion && !isLoading && (
          <div className="bg-white border-t border-[#e8e0d5] px-6 py-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex-1 gap-1.5 border-[#e8e0d5] text-[#8a7a6a] hover:text-[#3d3730]"
            >
              {copied ? <CheckCircle2 size={14} className="text-green-600" /> : <Share2 size={14} />}
              {copied ? "Copied!" : "Share"}
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saved || saveMutation.isPending}
              className="flex-1 gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 hover:opacity-90"
            >
              {saveMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saved || devotion.savedToPlanner ? (
                <><CheckCircle2 size={14} /> Saved!</>
              ) : (
                <><BookMarked size={14} /> Save to Notes</>
              )}
            </Button>

            <Button
              size="sm"
              onClick={handleDismiss}
              className="flex-1 gap-1.5 bg-[#1a1230] text-white border-0 hover:bg-[#2d1f4e]"
            >
              Begin My Day
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
