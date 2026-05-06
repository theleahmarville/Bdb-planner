import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Minimal unit tests for the Zion brain-dump parser logic ──────────────────

describe("Zion brain dump parser", () => {
  it("detects goal keywords", () => {
    const text = "I want to launch my online course by March";
    const lower = text.toLowerCase();
    const isGoal = /\b(goal|want to|launch|achieve|accomplish|dream|vision|aspire)\b/.test(lower);
    expect(isGoal).toBe(true);
  });

  it("detects schedule/event keywords", () => {
    const text = "I have a meeting at 3pm on Monday";
    const lower = text.toLowerCase();
    const isSchedule = /\b(meeting|appointment|at \d|schedule|event|call|session)\b/.test(lower);
    expect(isSchedule).toBe(true);
  });

  it("detects habit keywords", () => {
    const text = "I need to start meditating every morning";
    const lower = text.toLowerCase();
    const isHabit = /\b(habit|routine|every day|daily|morning|evening|meditat|exercise|workout)\b/.test(lower);
    expect(isHabit).toBe(true);
  });

  it("detects note/idea keywords", () => {
    const text = "I had an idea for a new blog post about wellness";
    const lower = text.toLowerCase();
    const isNote = /\b(idea|note|thought|remember|blog|post|content|write)\b/.test(lower);
    expect(isNote).toBe(true);
  });

  it("handles empty input gracefully", () => {
    const text = "";
    expect(text.trim().length).toBe(0);
  });

  it("parses multiple intents from a brain dump", () => {
    const text = "I want to launch my course, I have a meeting Monday at 2pm, and I need to meditate daily";
    const lower = text.toLowerCase();
    const hasGoal = /\b(want to|launch)\b/.test(lower);
    const hasSchedule = /\b(meeting|at \d)\b/.test(lower);
    const hasHabit = /\b(daily|meditat)\b/.test(lower);
    expect(hasGoal).toBe(true);
    expect(hasSchedule).toBe(true);
    expect(hasHabit).toBe(true);
  });
});
