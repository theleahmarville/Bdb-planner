# BDB Digital Planner 2026

A full-featured interactive digital planner web application built with React 19, TypeScript, tRPC, and MySQL. Users can click and type directly into every field, with real-time auto-save, Google Calendar integration, Notion sync, Slack notifications, and an Apple Notes-style notes section.

---

## Features

| Section | Description |
|---|---|
| **Annual Planning** | 8 life categories (Becoming 2026), Big Goals with 5-step action plans, Needs & Budget, Who Am I? Venn diagram, Vision Board, Elevator Pitch, Personal Contract, 12-month Timeline |
| **Monthly View** | Calendar grid, budget tracker (6 categories), monthly goals, social media management, content map with campaigns and pillars |
| **Weekly View** | 30-minute time slots (6am–7pm), intentions, habit tracker, finances, social posts grid, wins & notes |
| **Daily Entries** | Top priorities, gratitude journal (5 slots), water intake tracker, time slot scheduling |
| **Notes** | Apple Notes-style three-panel layout with folders, search, pin, rich-text markdown editor, auto-save |
| **Integrations** | Google Calendar (one-click event export), Notion (goals sync), Slack (reminders and summaries) |
| **Reminders** | Browser notifications and Slack alerts for any scheduled event |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Wouter (routing) |
| Backend | Express 4, tRPC 11, Drizzle ORM |
| Database | MySQL / TiDB |
| Auth | Manus OAuth (replaceable with email/password — see SETUP.md) |
| Testing | Vitest (32 tests passing) |
| Build | Vite 7, esbuild |

---

## Project Structure

```
client/
  src/
    pages/          ← AnnualPage, MonthlyPage, WeeklyPage, NotesPage, IntegrationsPage, Home
    components/     ← PlannerLayout (sidebar + mobile nav), EditableField, SaveIndicator
    hooks/          ← useAutoSave
    lib/            ← planner.ts (utilities), trpc.ts (client binding)
drizzle/
  schema.ts         ← All 8 database tables
server/
  db.ts             ← All query helpers
  routers.ts        ← All tRPC procedures (annual, monthly, weekly, daily, notes, reminders)
  *.test.ts         ← Vitest test files
```

---

## Database Tables

| Table | Purpose |
|---|---|
| `users` | User accounts (auth) |
| `annual_plans` | Annual planning data per user per year |
| `big_goals` | 6 big goals per user per year with 5-step action plans |
| `monthly_plans` | Monthly data including budget, goals, social media |
| `weekly_plans` | Weekly intentions, habits, finances, social posts |
| `daily_entries` | Daily time slots, priorities, gratitude, water intake |
| `content_calendar_entries` | Monthly social media content calendar |
| `notes` | Apple Notes-style notes with folders and pinning |
| `reminders` | Scheduled reminders with browser and Slack notification flags |
| `user_integrations` | Per-user OAuth tokens for Google Calendar, Notion, Slack |

---

## Mobile Support

The app is fully responsive with:

- Bottom tab bar navigation on mobile (Annual, Monthly, Weekly, Notes, More)
- Slide-out drawer for full sidebar navigation
- Mobile headers with hamburger menu
- Horizontally scrollable tab rows on all pages
- Full-screen Notes panels with back-navigation (folders → list → editor)
- iOS safe-area insets and 44px minimum touch targets

---

## Running Locally (Development)

```bash
pnpm install
pnpm dev
```

The dev server starts at `http://localhost:3000`.

---

## Running Tests

```bash
pnpm test
```

32 tests across 3 test files covering auth, planner routers, and notes routers.

---

## Transfer & Setup on a New Account

See **SETUP.md** for complete step-by-step instructions to deploy this project on a new Manus account.
