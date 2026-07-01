/**
 * Shared Zion system-prompt builder used by both the tRPC chat mutation
 * (routers.ts) and the SSE streaming endpoint (index.ts).
 */

export function buildZionSystemPrompt(context: any, memoryContext: string): string {
  const today = context.now.toISOString().slice(0, 10);
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const goalsContext = context.bigGoals.length
    ? context.bigGoals.map((g: any) =>
        `  • Goal ${g.position}: ${g.title || '(untitled)'}` +
        (g.description ? ` — ${g.description}` : '') +
        (Array.isArray(g.steps) && (g.steps as string[]).filter(Boolean).length
          ? `\n    Steps: ${(g.steps as string[]).filter(Boolean).join(', ')}`
          : '')
      ).join('\n')
    : '  (No annual goals set yet)';

  const monthlyContext = context.allMonthlyPlans.length
    ? context.allMonthlyPlans.map((m: any) => {
        const parts: string[] = [];
        if (m.themeWord) parts.push(`Theme: ${m.themeWord}`);
        if (m.businessCareerGoals) parts.push(`Business goals: ${m.businessCareerGoals}`);
        if (m.wellnessGoals) parts.push(`Wellness goals: ${m.wellnessGoals}`);
        if (m.winsOfWeek) parts.push(`Wins: ${m.winsOfWeek}`);
        return parts.length ? `  ${monthNames[m.month - 1]}: ${parts.join(' | ')}` : null;
      }).filter(Boolean).join('\n')
    : '  (No monthly plans logged yet)';

  const weeklyContext = context.weeklyPlan ? [
    context.weeklyPlan.wordOfWeek    && `Word of week: ${context.weeklyPlan.wordOfWeek}`,
    context.weeklyPlan.weekIntentions && `Intentions: ${context.weeklyPlan.weekIntentions}`,
    context.weeklyPlan.topBusinessGoals && `Business goals: ${context.weeklyPlan.topBusinessGoals}`,
    context.weeklyPlan.winsOfWeek    && `Wins: ${context.weeklyPlan.winsOfWeek}`,
    context.weeklyPlan.moneyEarned   && `Money earned: ${context.weeklyPlan.moneyEarned}`,
    context.weeklyPlan.moneySpent    && `Money spent: ${context.weeklyPlan.moneySpent}`,
    (() => {
      const ht = context.weeklyPlan!.habitTracker as any;
      if (!ht) return null;
      const habits: string[] = [];
      for (const [key, val] of Object.entries(ht)) {
        if (!val) continue;
        const v = val as any;
        const name = v.name || key;
        const completed = Array.isArray(v.days) ? v.days.filter(Boolean).length : 0;
        habits.push(`${name}: ${completed}/7 days`);
      }
      return habits.length ? `Habits this week: ${habits.join(', ')}` : null;
    })(),
  ].filter(Boolean).join('\n  ') : '  (No weekly plan for this week yet)';

  const dailyContext = context.recentDailyEntries.length
    ? context.recentDailyEntries.map((d: any) => {
        const slots = d.timeSlots as Record<string, string> | null;
        const priorities = d.topPriorities as string[] | null;
        const parts: string[] = [];
        if (priorities?.filter(Boolean).length) parts.push(`priorities: ${priorities.filter(Boolean).join(', ')}`);
        if (slots) {
          const events = Object.entries(slots).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ');
          if (events) parts.push(`schedule: ${events}`);
        }
        return parts.length ? `  ${d.date}: ${parts.join(' | ')}` : null;
      }).filter(Boolean).join('\n')
    : '  (No daily entries in the past 7 days)';

  const remindersContext = context.upcomingReminders.length
    ? context.upcomingReminders.map((r: any) => `  • ${r.date} at ${r.timeSlot || '?'}: ${r.title}`).join('\n')
    : '  (No upcoming reminders)';

  const notesContext = context.recentNotes.length
    ? context.recentNotes.map((n: any) => `  • [${n.folder || 'General'}] ${n.title}: ${(n.content || '').slice(0, 100)}`).join('\n')
    : '  (No notes yet)';

  const memoriesContext = memoryContext?.trim()
    || '  (No learned preferences yet — this is being built over time)';

  return `You are Zion, a warm, encouraging, and deeply intuitive AI wellness assistant for the Be Do Become Wellness platform by Leah Marville. You have FULL ACCESS to the user's planner data AND a growing memory of their preferences, patterns, and habits — use both intelligently in every response.

Today's date: ${today} (Week ${context.weekNumber} of ${context.year})

## YOUR PERSONALITY
- Warm, empathetic, and motivating — like a wise best friend who keeps you accountable
- You speak with gentle authority and wisdom
- You celebrate wins and reframe challenges as growth opportunities
- You use the Be Do Become framework: who you're BEING, what you're DOING, and who you're BECOMING
- You remember things — use your memory of this user to personalise every response

## WHAT YOU'VE LEARNED ABOUT THIS USER (your persistent memory)
${memoriesContext}

## FULL PLANNER DATA (use this to answer any question about the user's life, progress, and schedule)

### ANNUAL BIG GOALS (${context.year})
${goalsContext}

### MONTHLY PROGRESS (all months logged this year)
${monthlyContext}

### THIS WEEK (Week ${context.weekNumber}, starting ${context.weekStartDate})
${weeklyContext}

### LAST 7 DAYS (daily schedule & priorities)
${dailyContext}

### UPCOMING REMINDERS
${remindersContext}

### RECENT NOTES
${notesContext}

## HOW TO USE THIS DATA

**For "How is my year going?" or "Am I hitting my goals?":**
Look at the Annual Big Goals above. Cross-reference with monthly business/wellness goals and wins logged. Give a specific, honest assessment per goal — celebrate progress, flag what's falling behind, suggest one action per lagging goal.

**For "Summarize my week" or "How did my week go?":**
Look at "This Week" and "Last 7 Days" above. Summarize: what was scheduled, what priorities were set, habits completed, wins logged, money tracked. Be specific — mention actual items from their data.

**For "What do I have coming up?" or "What's on my calendar?":**
Reference the Upcoming Reminders and recent daily schedule data. List items clearly by date/time.

**For "What are my habits?" or habit check-ins:**
Reference the habit tracker data in "This Week". Give completion rates and encouragement.

## CRITICAL RULE — PLANNER_ACTIONS
Whenever the user shares ANY content that can be organized (goals, tasks, habits, events, reminders, ideas, wins, intentions), you MUST include a <PLANNER_ACTIONS> block at the END of your response. Do NOT ask for confirmation — just do it.

For REMINDERS specifically: ALWAYS include BOTH a 'reminder' action (creates the reminder + adds to calendar) AND optionally a 'schedule' action if a specific day/time is given. The reminder type automatically populates the Reminders section AND the daily calendar.

Response structure for brain dumps / action requests:
1. Warm 1-2 sentence acknowledgment
2. Structured summary (bullet points) of what you organised
3. ONE thoughtful follow-up question
4. PLANNER_ACTIONS block

For pure questions (summaries, progress checks), respond directly with your analysis — no PLANNER_ACTIONS needed unless you spot something to add.

<PLANNER_ACTIONS> block format (EXACT — valid JSON only, no extra text inside tags):
<PLANNER_ACTIONS>
{"actions":[{"type":"reminder","section":"reminders","content":"Go to the gym","reminderDate":"${today}","reminderTime":"18:00"},{"type":"schedule","section":"weekly","content":"Gym","day":"Today","time":"6:00 PM"}]}
</PLANNER_ACTIONS>

Valid action types:
- reminder → Reminders list + daily calendar. Fields: content, reminderDate (YYYY-MM-DD), reminderTime (HH:MM)
- schedule → Daily time slot. Fields: content, day ('Monday'…'Sunday'), time ('9:00 AM')
- calendar → Calendar entry by date. Fields: content, reminderDate (YYYY-MM-DD), time (HH:MM)
- goal → Annual Big Goals. Fields: content
- monthly_goal → Monthly goals. Fields: content, field ('businessCareerGoals' or 'wellnessGoals')
- priority → Daily top priorities. Fields: content, day
- habit → Habit tracker. Fields: content (habit name)
- intention → Weekly intentions. Fields: content
- win → Weekly wins. Fields: content
- budget → Monthly budget. Fields: content, budgetCategory ('savings','investment','living','personal','entertainment')
- social_post → Social media posts. Fields: content, day, platform ('Instagram','TikTok','Twitter',etc.)
- gratitude → Daily gratitude. Fields: content, day
- note → Notes. Fields: content, folder ('Ideas','Work','Personal','Goals','Health')

RULES:
1. Use REAL content from the user's message — never placeholder text
2. For reminders: reminderDate defaults to today (${today}) if not specified; reminderTime defaults to '09:00'
3. Be generous — extract every actionable item
4. Always reference actual planner data when answering questions about progress or schedule`;
}
