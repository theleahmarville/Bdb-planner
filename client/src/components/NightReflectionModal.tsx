import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sparkles, Moon, Star, ChevronRight, ChevronLeft, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// ── Life category suggestions ──────────────────────────────────────────────────
const CATEGORY_SUGGESTIONS = [
  "Career", "Health", "Relationships", "Finances", "Spirituality",
  "Family", "Personal Growth", "Creativity", "Community", "Adventure",
  "Love", "Wellness", "Purpose", "Freedom", "Joy",
];

interface DesireEntry {
  category: string;
  desire: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  date: string;
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div className={`w-2 h-2 rounded-full transition-all ${
      done ? "bg-amber-500" : active ? "bg-amber-400 scale-125" : "bg-[#e8e0d5]"
    }`} />
  );
}

// ── Category picker ────────────────────────────────────────────────────────────
function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {CATEGORY_SUGGESTIONS.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
            value === cat
              ? "bg-amber-500 text-white border-amber-500 font-semibold"
              : "bg-white border-[#e8e0d5] text-[#8a7a6a] hover:border-amber-300 hover:text-amber-700"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
export default function NightReflectionModal({ open, onClose, date }: Props) {
  const totalSteps = 5; // intro, desire1, desire2, desire3, negative thought, done
  const [step, setStep] = useState(0);
  const [desires, setDesires] = useState<DesireEntry[]>([
    { category: "", desire: "" },
    { category: "", desire: "" },
    { category: "", desire: "" },
  ]);
  const [negativeThought, setNegativeThought] = useState("");
  const [reframe, setReframe] = useState("");
  const [zionMessage, setZionMessage] = useState("");
  const [isGeneratingReframe, setIsGeneratingReframe] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const reframeMutation = trpc.zion.generateReframe.useMutation();
  const saveMutation = trpc.zion.saveNightReflection.useMutation();
  const utils = trpc.useUtils();

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(0);
      setDesires([
        { category: "", desire: "" },
        { category: "", desire: "" },
        { category: "", desire: "" },
      ]);
      setNegativeThought("");
      setReframe("");
      setZionMessage("");
      setIsDone(false);
    }
  }, [open]);

  const updateDesire = (idx: number, field: "category" | "desire", value: string) => {
    setDesires(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const canAdvance = () => {
    if (step === 0) return true; // intro
    if (step >= 1 && step <= 3) {
      const d = desires[step - 1];
      return d.category.trim().length > 0 && d.desire.trim().length > 0;
    }
    if (step === 4) return true; // negative thought is optional
    return false;
  };

  const handleGenerateReframe = async () => {
    if (!negativeThought.trim()) return;
    setIsGeneratingReframe(true);
    try {
      const result = await reframeMutation.mutateAsync({ negativeThought });
      setReframe(result.reframe);
    } catch {
      toast.error("Couldn't generate reframe. Please try again.");
    } finally {
      setIsGeneratingReframe(false);
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const result = await saveMutation.mutateAsync({
        date,
        category1: desires[0].category,
        desire1: desires[0].desire,
        category2: desires[1].category,
        desire2: desires[1].desire,
        category3: desires[2].category,
        desire3: desires[2].desire,
        negativeThought: negativeThought.trim() || undefined,
        reframe: reframe.trim() || undefined,
      });
      setZionMessage(result.zionMessage);
      setIsDone(true);
      utils.zion.checkNightlyPrompt.invalidate();
      toast.success("Night reflection saved! Sweet dreams. 🌙");
    } catch {
      toast.error("Couldn't save your reflection. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const stepLabels = ["Welcome", "Desire 1", "Desire 2", "Desire 3", "Release"];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1a1230] via-[#2d1f4e] to-[#1a1a3a] px-6 pt-6 pb-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Moon className="w-5 h-5 text-amber-300" />
            <span className="text-xs font-semibold text-amber-300 tracking-widest uppercase">Nightly Ritual</span>
          </div>
          <h2 className="text-xl font-bold">Evening Reflection</h2>
          <p className="text-sm text-white/60 mt-0.5">with Zion · Be Do Become</p>

          {!isDone && (
            <div className="flex items-center gap-2 mt-4">
              {stepLabels.map((label, i) => (
                <div key={label} className="flex items-center gap-1">
                  <StepDot active={step === i} done={step > i} />
                  {i < stepLabels.length - 1 && (
                    <div className={`h-px w-4 transition-all ${step > i ? "bg-amber-400" : "bg-white/20"}`} />
                  )}
                </div>
              ))}
              <span className="text-xs text-white/40 ml-1">{stepLabels[step]}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="bg-[#faf8f5] px-6 py-5">

          {/* Step 0: Intro */}
          {step === 0 && !isDone && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#3d3730] border border-[#e8e0d5] shadow-sm leading-relaxed">
                  <p className="font-semibold mb-1">Good evening! 🌙</p>
                  <p>Before you rest, let's close the day with intention. I'll guide you through writing <strong>3 desires</strong> across different areas of your life — not goals, not tasks, but what your heart truly <em>desires</em>.</p>
                  <p className="mt-2 text-[#8a7a6a] text-xs">This practice rewires your mind to focus on what you <em>want</em> rather than what you fear. Takes just 2 minutes.</p>
                </div>
              </div>
              <div className="text-xs text-[#8a7a6a] text-center">
                {format(new Date(date + "T12:00:00"), "EEEE, MMMM d, yyyy")}
              </div>
            </div>
          )}

          {/* Steps 1–3: Desire entries */}
          {step >= 1 && step <= 3 && !isDone && (() => {
            const idx = step - 1;
            const d = desires[idx];
            const stepEmojis = ["✨", "💫", "🌟"];
            return (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#3d3730] border border-[#e8e0d5] shadow-sm">
                    <p>{stepEmojis[idx]} <strong>Desire {step} of 3</strong> — Choose a life area and write what you truly desire in it.</p>
                    <p className="text-xs text-[#8a7a6a] mt-1">Write it as if it's already happening. "I desire..." or "I am..."</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#8a7a6a] uppercase tracking-wide mb-1 block">
                    Life Area
                  </label>
                  <CategoryPicker value={d.category} onChange={v => updateDesire(idx, "category", v)} />
                  {!CATEGORY_SUGGESTIONS.includes(d.category) && (
                    <input
                      className="mt-2 w-full text-sm border border-[#e8e0d5] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-amber-300"
                      placeholder="Or type your own category..."
                      value={d.category}
                      onChange={e => updateDesire(idx, "category", e.target.value)}
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#8a7a6a] uppercase tracking-wide mb-1 block">
                    My Desire
                  </label>
                  <Textarea
                    placeholder={`I desire... / I am... / I have...`}
                    value={d.desire}
                    onChange={e => updateDesire(idx, "desire", e.target.value)}
                    className="resize-none text-sm bg-white border-[#e8e0d5] focus:border-amber-300 rounded-xl"
                    rows={3}
                  />
                </div>
              </div>
            );
          })()}

          {/* Step 4: Negative thought release */}
          {step === 4 && !isDone && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#3d3730] border border-[#e8e0d5] shadow-sm">
                  <p>🌿 <strong>Release & Reframe</strong> — Is there a negative thought, worry, or fear from today you'd like to let go of before sleep?</p>
                  <p className="text-xs text-[#8a7a6a] mt-1">This step is optional. Writing it down and reframing it helps your mind rest peacefully.</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8a7a6a] uppercase tracking-wide mb-1 block">
                  Negative Thought (optional)
                </label>
                <Textarea
                  placeholder="e.g. I'm not doing enough. I'm falling behind. I'm not good enough..."
                  value={negativeThought}
                  onChange={e => { setNegativeThought(e.target.value); setReframe(""); }}
                  className="resize-none text-sm bg-white border-[#e8e0d5] focus:border-amber-300 rounded-xl"
                  rows={3}
                />
              </div>

              {negativeThought.trim() && !reframe && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateReframe}
                  disabled={isGeneratingReframe}
                  className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 gap-2"
                >
                  {isGeneratingReframe ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Zion is reframing...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Let Zion reframe this for me</>
                  )}
                </Button>
              )}

              {reframe && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <div className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                    <Star className="w-3 h-3" /> Zion's Reframe
                  </div>
                  <p className="text-sm text-[#3d3730] italic leading-relaxed">{reframe}</p>
                  <button
                    onClick={handleGenerateReframe}
                    disabled={isGeneratingReframe}
                    className="mt-2 text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Try another reframe
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Done state */}
          {isDone && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-[#1a1a1a] text-lg">Reflection Complete 🌙</h3>
                <p className="text-xs text-[#8a7a6a] mt-1">Your desires have been saved to your planner</p>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-xl border border-[#e8e0d5] divide-y divide-[#e8e0d5]">
                {desires.map((d, i) => (
                  <div key={i} className="px-4 py-2.5">
                    <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">{d.category}</span>
                    <p className="text-sm text-[#3d3730] mt-0.5">{d.desire}</p>
                  </div>
                ))}
                {reframe && (
                  <div className="px-4 py-2.5">
                    <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide">Reframe</span>
                    <p className="text-sm text-[#3d3730] italic mt-0.5">{reframe}</p>
                  </div>
                )}
              </div>

              {zionMessage && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#3d3730] border border-[#e8e0d5] shadow-sm leading-relaxed italic">
                    {zionMessage}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-[#e8e0d5] px-6 py-4 flex items-center justify-between">
          {!isDone ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
                className="text-[#8a7a6a] gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                {step === 0 ? "Skip tonight" : "Back"}
              </Button>

              {step < 4 ? (
                <Button
                  size="sm"
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canAdvance()}
                  className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 gap-1 hover:opacity-90"
                >
                  {step === 0 ? "Begin Ritual" : "Next"}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleFinish}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 gap-1 hover:opacity-90"
                >
                  {isSaving ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                  ) : (
                    <><Moon className="w-3.5 h-3.5" /> Complete Ritual</>
                  )}
                </Button>
              )}
            </>
          ) : (
            <Button
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 hover:opacity-90"
              onClick={onClose}
            >
              Sweet dreams 🌙
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
