import { useState, useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import EditableField from "@/components/EditableField";
import SaveIndicator from "@/components/SaveIndicator";
import { useAutoSave } from "@/hooks/useAutoSave";
import { LIFE_CATEGORIES, BUDGET_CATEGORIES } from "@/lib/planner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import VisionBoardTab from "@/components/VisionBoardTab";
import SectionToolbar from "@/components/SectionToolbar";

const YEAR = new Date().getFullYear();
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AnnualPage() {
  const { isAuthenticated } = useAuth();
  const { data: annualData, refetch } = trpc.annual.get.useQuery({ year: YEAR });
  const { data: goalsData, refetch: refetchGoals } = trpc.bigGoals.list.useQuery({ year: YEAR });

  const saveMutation = trpc.annual.save.useMutation();
  const saveGoalMutation = trpc.bigGoals.save.useMutation();

  const [localData, setLocalData] = useState<Record<string, any>>({});
  const [goals, setGoals] = useState<Array<{ title: string; description: string; steps: string[] }>>([]);
  const [goalsInitialized, setGoalsInitialized] = useState(false);
  const [annualInitialized, setAnnualInitialized] = useState(false);

  // Initialize local state from server data
  if (annualData && !annualInitialized) {
    const init: Record<string, any> = {};
    LIFE_CATEGORIES.forEach(({ key }) => { init[key] = (annualData as any)[key] || ""; });
    BUDGET_CATEGORIES.forEach(({ key }) => { init[key] = (annualData as any)[key] || ""; });
    init.knowledgeSkills = annualData.knowledgeSkills || "";
    init.passionsCallings = annualData.passionsCallings || "";
    init.naturalGifts = annualData.naturalGifts || "";
    init.problemsToSolve = annualData.problemsToSolve || "";
    init.vennOverlap = annualData.vennOverlap || "";
    init.visionBoardContent = annualData.visionBoardContent || "";
    init.missionStatement = annualData.missionStatement || "";
    init.elevatorPitch = annualData.elevatorPitch || "";
    init.contractName = annualData.contractName || "";
    init.contractBe = annualData.contractBe || "";
    init.contractDo = annualData.contractDo || "";
    init.contractBecome = annualData.contractBecome || "";
    init.contractGoals = (annualData.contractGoals as string[]) || ["", "", "", "", ""];
    init.transformationTimeline = (annualData.transformationTimeline as Record<string, string>) || {};
    setLocalData(init);
    setAnnualInitialized(true);
  }

  if (goalsData && !goalsInitialized) {
    const sorted = [...goalsData].sort((a, b) => a.position - b.position);
    const filled = Array.from({ length: 6 }, (_, i) => {
      const found = sorted.find((g) => g.position === i + 1);
      return {
        title: found?.title || "",
        description: found?.description || "",
        steps: (found?.steps as string[]) || ["", "", "", "", ""],
      };
    });
    setGoals(filled);
    setGoalsInitialized(true);
  }

  const saveAnnual = useCallback(
    async (data: Record<string, any>) => {
      await saveMutation.mutateAsync({ year: YEAR, data });
    },
    [saveMutation]
  );

  const { save: autoSave, status: saveStatus } = useAutoSave(saveAnnual, 1200);

  const update = (key: string, value: any) => {
    const updated = { ...localData, [key]: value };
    setLocalData(updated);
    autoSave(updated);
  };

  const updateGoal = async (idx: number, field: string, value: any) => {
    const updated = goals.map((g, i) => (i === idx ? { ...g, [field]: value } : g));
    setGoals(updated);
    const goal = updated[idx];
    try {
      await saveGoalMutation.mutateAsync({
        year: YEAR,
        position: idx + 1,
        title: goal.title,
        description: goal.description,
        steps: goal.steps,
      });
    } catch {
      toast.error("Failed to save goal. Please try again.");
    }
  };

  const updateGoalStep = (goalIdx: number, stepIdx: number, value: string) => {
    const updated = goals.map((g, i) => {
      if (i !== goalIdx) return g;
      const steps = [...g.steps];
      steps[stepIdx] = value;
      return { ...g, steps };
    });
    setGoals(updated);
    const goal = updated[goalIdx];
    saveGoalMutation.mutate({
      year: YEAR,
      position: goalIdx + 1,
      title: goal.title,
      description: goal.description,
      steps: goal.steps,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Sign in to access your planner</h2>
          <p className="text-muted-foreground mb-6">Your data is saved securely and synced across devices.</p>
          <a href={getLoginUrl()}>
            <Button size="lg">Sign In</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Annual Planning {YEAR}</h1>
          <p className="text-muted-foreground text-sm mt-1">A Yearly Planner For Visionaries</p>
        </div>
        <SaveIndicator status={saveStatus} />
      </div>

      <Tabs defaultValue="becoming">
        <div className="tabs-scroll mb-4 md:mb-6">
        <TabsList className="flex flex-nowrap md:flex-wrap gap-1 h-auto bg-muted p-1 rounded-xl w-max md:w-full">
          {[
            { value: "becoming", label: `Becoming ${YEAR}` },
            { value: "goals", label: "Big Goals" },
            { value: "needs", label: "Needs & Budget" },
            { value: "whoami", label: "Who Am I?" },
            { value: "vision", label: "Vision Board" },
            { value: "present", label: "Presentation" },
            { value: "contract", label: "My Contract" },
            { value: "timeline", label: "Timeline" },
          ].map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-3 py-1.5">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        </div>

        {/* ── Becoming ── */}
        <TabsContent value="becoming">
          <div className="mb-4">
            <h2 className="text-2xl font-black mb-1">Becoming: {YEAR}</h2>
            <p className="text-sm text-muted-foreground">List what is important for you to achieve this year by the categories below.</p>
          </div>
          <SectionToolbar sectionKey={`annual-${YEAR}-becoming`} section="annual" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LIFE_CATEGORIES.map(({ key, label }) => (
              <div key={key} className="planner-card">
                <div className="planner-pill mb-3">{label}</div>
                <EditableField
                  value={localData[key] || ""}
                  onChange={(v) => update(key, v)}
                  placeholder={`Your ${label.toLowerCase()} goals for ${YEAR}...`}
                  multiline
                  rows={5}
                  autoResize
                />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Big Goals ── */}
        <TabsContent value="goals">
          <div className="mb-4">
            <h2 className="text-2xl font-black mb-1">2026 in Detail</h2>
            <p className="text-sm text-muted-foreground">Define your 6 big goals and the steps to achieve them.</p>
          </div>
          <SectionToolbar sectionKey={`annual-${YEAR}-biggoals`} section="annual" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((goal, idx) => (
              <div key={idx} className="planner-card">
                <div className="planner-pill mb-3">Big Goal {idx + 1}</div>
                <EditableField
                  value={goal.title}
                  onChange={(v) => updateGoal(idx, "title", v)}
                  placeholder="Name your big goal..."
                  className="font-semibold text-base mb-2"
                />
                <EditableField
                  value={goal.description}
                  onChange={(v) => updateGoal(idx, "description", v)}
                  placeholder="Describe this goal..."
                  multiline
                  rows={3}
                />
                <div className="mt-3">
                  <div className="planner-pill mb-2" style={{ fontSize: "0.7rem" }}>Steps to take:</div>
                  {goal.steps.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-start gap-2 mb-1">
                      <span className="text-sm font-bold text-muted-foreground mt-1.5 w-4 flex-shrink-0">{sIdx + 1}.</span>
                      <EditableField
                        value={step}
                        onChange={(v) => updateGoalStep(idx, sIdx, v)}
                        placeholder={`Step ${sIdx + 1}...`}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        {/* ── Needs & Budget ── */}
        <TabsContent value="needs">
          <div className="space-y-8">
            {/* Basic Needs */}
            <div>
              <h2 className="text-2xl font-black mb-1">What do I need?</h2>
              <p className="text-sm text-muted-foreground mb-4">Know your basic needs to set the foundation upon which you can make sound decisions.</p>
              <SectionToolbar sectionKey={`annual-${YEAR}-needs`} section="annual" />
              <h3 className="font-bold mb-3">Basic Needs</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["Relationships", "Career", "Wellness", "Finance"].map((cat) => (
                  <div key={cat} className="planner-card">
                    <div className="planner-pill mb-2" style={{ fontSize: "0.7rem" }}>{cat}</div>
                    <EditableField
                      value={(localData.basicNeeds as any)?.[cat.toLowerCase()] || ""}
                      onChange={(v) => update("basicNeeds", { ...(localData.basicNeeds || {}), [cat.toLowerCase()]: v })}
                      placeholder="Your needs..."
                      multiline rows={4}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Non-Negotiables */}
            <div>
              <h3 className="font-bold mb-3">Non-Negotiables</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["Relationships", "Career", "Wellness", "Finance"].map((cat) => (
                  <div key={cat} className="planner-card">
                    <div className="planner-pill mb-2" style={{ fontSize: "0.7rem" }}>{cat}</div>
                    <EditableField
                      value={(localData.nonNegotiables as any)?.[cat.toLowerCase()] || ""}
                      onChange={(v) => update("nonNegotiables", { ...(localData.nonNegotiables || {}), [cat.toLowerCase()]: v })}
                      placeholder="Your boundaries..."
                      multiline rows={4}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Annual Budget */}
            <div>
              <h3 className="font-bold mb-3">Monthly Budget Setup</h3>
              <p className="text-sm text-muted-foreground mb-4">Set up your year with financial planning to ensure you stay on track.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {BUDGET_CATEGORIES.map(({ key, label }) => (
                  <div key={key} className="planner-card">
                    <div className="planner-pill mb-2" style={{ fontSize: "0.7rem" }}>{label}</div>
                    <EditableField
                      value={localData[key] || ""}
                      onChange={(v) => update(key, v)}
                      placeholder="Amount / notes..."
                      multiline rows={4}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Who Am I? ── */}
        <TabsContent value="whoami">
          <div className="mb-4">
            <h2 className="text-2xl font-black mb-1">Who am I?</h2>
            <p className="text-sm text-muted-foreground">Diagram your life — find your purpose by assessing where it all intersects.</p>
          </div>
          <SectionToolbar sectionKey={`annual-${YEAR}-whoami`} section="annual" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="planner-card">
              <div className="planner-pill mb-3">Knowledge / Skills</div>
              <p className="text-xs text-muted-foreground mb-2">Educational / Vocational</p>
              <EditableField value={localData.knowledgeSkills || ""} onChange={(v) => update("knowledgeSkills", v)} placeholder="What do you know and do well?" multiline rows={5} />
            </div>
            <div className="planner-card">
              <div className="planner-pill mb-3">Natural Gifts / Talents</div>
              <p className="text-xs text-muted-foreground mb-2">What comes naturally to you?</p>
              <EditableField value={localData.naturalGifts || ""} onChange={(v) => update("naturalGifts", v)} placeholder="Your innate gifts and talents..." multiline rows={5} />
            </div>
            <div className="planner-card">
              <div className="planner-pill mb-3">Passions / Callings</div>
              <p className="text-xs text-muted-foreground mb-2">What sets your soul on fire?</p>
              <EditableField value={localData.passionsCallings || ""} onChange={(v) => update("passionsCallings", v)} placeholder="Your passions and callings..." multiline rows={5} />
            </div>
            <div className="planner-card">
              <div className="planner-pill mb-3">Problems You Can Solve</div>
              <p className="text-xs text-muted-foreground mb-2">What needs in the world can you meet?</p>
              <EditableField value={localData.problemsToSolve || ""} onChange={(v) => update("problemsToSolve", v)} placeholder="Problems you're uniquely positioned to solve..." multiline rows={5} />
            </div>
            <div className="planner-card md:col-span-2">
              <div className="planner-pill mb-3">Where Do They All Overlap?</div>
              <p className="text-xs text-muted-foreground mb-2">This is your PURPOSE — where all four circles intersect.</p>
              <EditableField value={localData.vennOverlap || ""} onChange={(v) => update("vennOverlap", v)} placeholder="Your unique purpose at the intersection..." multiline rows={4} />
            </div>
          </div>
        </TabsContent>

        {/* ── Vision Board ── */}
        <TabsContent value="vision">
          <div className="mb-4">
            <h2 className="text-2xl font-black mb-1">2026 Vision Board</h2>
            <p className="text-sm text-muted-foreground">Dream without limitations. Write your desired goals, the life you wish to create, and words of affirmation.</p>
          </div>
          <SectionToolbar sectionKey={`annual-${YEAR}-vision`} section="annual" />
          <VisionBoardTab
            year={YEAR}
            pinterestUrl=""
            onPinterestUrlChange={(url) => update("visionBoardPinterest", url)}
          />
          <div className="mt-4 planner-card">
            <h3 className="font-bold mb-2 text-sm">Vision Notes</h3>
            <EditableField
              value={localData.visionBoardContent || ""}
              onChange={(v) => update("visionBoardContent", v)}
              placeholder={`Write your vision here... What does your ideal ${YEAR} look like? What do you see, feel, and experience?`}
              multiline
              rows={8}
            />
          </div>
        </TabsContent>

        {/* ── Presentation ── */}
        <TabsContent value="present">
          <div className="mb-4">
            <h2 className="text-2xl font-black mb-1">How do I present myself?</h2>
          </div>
          <SectionToolbar sectionKey={`annual-${YEAR}-presentation`} section="annual" />
          <div className="space-y-4">
            <div className="planner-card">
              <h3 className="font-bold mb-1">Personal Mission Statement</h3>
              <p className="text-xs text-muted-foreground mb-3">Your personal mission statement describes your purpose, values, and how you show up for yourself, your family, and your community.</p>
              <EditableField
                value={localData.missionStatement || ""}
                onChange={(v) => update("missionStatement", v)}
                placeholder="My mission is to..."
                multiline rows={6}
              />
            </div>
            <div className="planner-card">
              <h3 className="font-bold mb-1">Elevator Pitch</h3>
              <p className="text-xs text-muted-foreground mb-3">A concise description of who you are and what you do — practice it so you're always prepared for your next opportunity.</p>
              <EditableField
                value={localData.elevatorPitch || ""}
                onChange={(v) => update("elevatorPitch", v)}
                placeholder="Hi, I'm... I help... by..."
                multiline rows={6}
              />
            </div>
          </div>
        </TabsContent>

        {/* ── Personal Contract ── */}
        <TabsContent value="contract">
          <div className="mb-4">
            <h2 className="text-2xl font-black mb-1">My Personal Contract</h2>
            <p className="text-sm text-muted-foreground">Seal your commitment to yourself for {YEAR}.</p>
          </div>
          <SectionToolbar sectionKey={`annual-${YEAR}-contract`} section="annual" />
          <div className="planner-card max-w-2xl mx-auto bg-foreground text-background p-8 rounded-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-background/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📜</span>
              </div>
              <h3 className="text-xl font-black">My Personal Contract</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-background/70 whitespace-nowrap">I,</span>
                <input
                  type="text"
                  value={localData.contractName || ""}
                  onChange={(e) => update("contractName", e.target.value)}
                  placeholder="Your name"
                  className="flex-1 bg-transparent border-b border-background/40 focus:border-background focus:outline-none text-background placeholder:text-background/40 pb-1"
                />
                <span className="text-background/70 whitespace-nowrap">affirm that I will</span>
              </div>

              {[
                { key: "contractBe", label: "BE" },
                { key: "contractDo", label: "DO" },
                { key: "contractBecome", label: "BECOME" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="font-bold text-background w-20">{label}</span>
                  <input
                    type="text"
                    value={localData[key] || ""}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder={`I will ${label.toLowerCase()}...`}
                    className="flex-1 bg-transparent border-b border-background/40 focus:border-background focus:outline-none text-background placeholder:text-background/40 pb-1"
                  />
                </div>
              ))}

              <div className="mt-4">
                <p className="text-sm text-background/70 mb-3">I commit to achieving these goals:</p>
                {(localData.contractGoals as string[] || ["", "", "", "", ""]).map((goal: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <span className="text-background/70 w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      value={goal}
                      onChange={(e) => {
                        const updated = [...(localData.contractGoals as string[] || ["", "", "", "", ""])];
                        updated[idx] = e.target.value;
                        update("contractGoals", updated);
                      }}
                      placeholder={`Goal ${idx + 1}...`}
                      className="flex-1 bg-transparent border-b border-background/40 focus:border-background focus:outline-none text-background placeholder:text-background/40 pb-1 text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="text-center mt-6 pt-4 border-t border-background/20">
                <p className="text-sm text-background/70 italic">With the utmost intention and self love,</p>
                <p className="font-bold mt-2">Signed Me:</p>
                <div className="border-b border-background/40 mt-4 w-48 mx-auto" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Transformation Timeline ── */}
        <TabsContent value="timeline">
          <div className="mb-4">
            <h2 className="text-2xl font-black mb-1">Transformation Timeline</h2>
            <p className="text-sm text-muted-foreground">Create a snapshot of your 12-month plan for success.</p>
          </div>
          <SectionToolbar sectionKey={`annual-${YEAR}-timeline`} section="annual" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {["Q1", "Q2", "Q3", "Q4"].map((quarter, qi) => (
              <div key={quarter}>
                <h3 className="font-bold text-lg mb-3">{quarter} — {["Jan–Mar", "Apr–Jun", "Jul–Sep", "Oct–Dec"][qi]}</h3>
                <div className="space-y-3">
                  {MONTHS_SHORT.slice(qi * 3, qi * 3 + 3).map((month, mi) => {
                    const monthKey = month.toLowerCase();
                    return (
                      <div key={month} className="planner-card">
                        <div className="planner-pill mb-2" style={{ fontSize: "0.7rem" }}>{month}</div>
                        <EditableField
                          value={(localData.transformationTimeline as any)?.[monthKey] || ""}
                          onChange={(v) => update("transformationTimeline", {
                            ...(localData.transformationTimeline || {}),
                            [monthKey]: v,
                          })}
                          placeholder={`${month} focus...`}
                          multiline rows={3}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
