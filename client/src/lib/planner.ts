import { format, getISOWeek, getISOWeekYear, startOfISOWeek, addWeeks, subWeeks } from "date-fns";

export function getWeekNumber(date: Date): number {
  return getISOWeek(date);
}

export function getWeekYear(date: Date): number {
  return getISOWeekYear(date);
}

export function getWeekStartDate(date: Date): string {
  return format(startOfISOWeek(date), "yyyy-MM-dd");
}

export function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getMonthName(month: number): string {
  return new Date(2026, month - 1, 1).toLocaleString("default", { month: "long" });
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  // Returns 0=Sun, 1=Mon, ... 6=Sat
  return new Date(year, month - 1, 1).getDay();
}

// Generate time slots from 6:00am to 7:00pm in 30-min increments
export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h <= 19; h++) {
    slots.push(`${h.toString().padStart(2, "0")}:00`);
    if (h < 19) slots.push(`${h.toString().padStart(2, "0")}:30`);
  }
  return slots;
}

export function formatTimeSlot(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_NAMES_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const SOCIAL_PLATFORMS = [
  { key: "facebook", label: "Facebook", color: "#1877F2", icon: "f" },
  { key: "instagram", label: "Instagram", color: "#E4405F", icon: "ig" },
  { key: "twitter", label: "Twitter/X", color: "#1DA1F2", icon: "x" },
  { key: "tiktok", label: "TikTok", color: "#000000", icon: "tt" },
  { key: "threads", label: "Threads", color: "#000000", icon: "th" },
  { key: "pinterest", label: "Pinterest", color: "#E60023", icon: "p" },
];

export const LIFE_CATEGORIES = [
  { key: "professional", label: "Professional" },
  { key: "finance", label: "Finance" },
  { key: "learning", label: "Learning" },
  { key: "wellness", label: "Wellness" },
  { key: "relationships", label: "Relationships" },
  { key: "community", label: "Community" },
  { key: "creativity", label: "Creativity" },
  { key: "spirit", label: "Spirit" },
];

export const BUDGET_CATEGORIES = [
  { key: "livingExpenses", label: "Living Expenses" },
  { key: "personalExpenses", label: "Personal Expenses" },
  { key: "savings", label: "Savings" },
  { key: "investment", label: "Investment/Goals" },
  { key: "entertainment", label: "Entertainment" },
  { key: "oneTimeExpenses", label: "One-time Expenses" },
];

export const DEFAULT_HABITS = ["vitamins", "exercise", "meditation"];

// Debounce utility for auto-save
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

// Google Calendar URL builder
export function buildGoogleCalendarUrl(params: {
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  description?: string;
}): string {
  const { title, date, startTime, endTime, description } = params;
  const start = `${date.replace(/-/g, "")}T${startTime.replace(":", "")}00`;
  const end = `${date.replace(/-/g, "")}T${endTime.replace(":", "")}00`;
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const parts = [
    base,
    `text=${encodeURIComponent(title)}`,
    `dates=${start}/${end}`,
    description ? `details=${encodeURIComponent(description)}` : "",
  ].filter(Boolean);
  return parts.join("&");
}

// Get next 30-min slot
export function getNextSlot(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  if (m === 0) return `${h.toString().padStart(2, "0")}:30`;
  const nextH = h + 1;
  return `${nextH.toString().padStart(2, "0")}:00`;
}
