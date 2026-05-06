# BDB Digital Planner — Full Build Plan & Codebase Blueprint

## Production-Grade Architecture for the Be Do Become Wellness Platform by Leah Marville

---

## TABLE OF CONTENTS

1. [Product Vision & Design Direction](#1-product-vision--design-direction)
2. [Tech Stack](#2-tech-stack)
3. [Full Codebase Structure](#3-full-codebase-structure)
4. [Database Schema](#4-database-schema)
5. [Server Architecture](#5-server-architecture)
6. [Client Architecture](#6-client-architecture)
7. [Design System & Styling](#7-design-system--styling)
8. [Feature Breakdown](#8-feature-breakdown)
9. [AI Integration (Zion)](#9-ai-integration-zion)
10. [Authentication & Security](#10-authentication--security)
11. [Integrations](#11-integrations)
12. [Production Deployment Plan](#12-production-deployment-plan)
13. [Full Build Prompt](#13-full-build-prompt)

---

## 1. PRODUCT VISION & DESIGN DIRECTION

### Brand Identity
- **Name**: BDB Digital Planner (Be Do Become)
- **Creator**: Leah Marville
- **Platform**: Be Do Become Wellness
- **Tagline**: "A visionary's toolkit for planning your best year"
- **AI Assistant**: "Zion" — warm, wise wellness coach

### Design Philosophy
- **Warm & Premium**: Cream/warm-white backgrounds, deep dark foregrounds
- **Minimal & Functional**: Click-to-edit fields, zero friction, auto-save everything
- **Faith-Integrated**: Daily NKJV scripture devotions, Bible verse tracking, spiritual categories
- **Wellness-First**: Habit tracking, water intake, gratitude journal, night reflections
- **Empowering**: Affirmations, reframes, Be/Do/Become personal contract framework

### Target User
- Faith-driven women entrepreneurs and visionaries
- Planning their year across business, wellness, finances, relationships, and spirituality
- Want a digital planner that feels personal, not corporate

### Color Palette
- **Light Mode**: Warm off-white (#FAF8F5 / oklch(0.98 0.003 90)), dark foreground
- **Dark Mode**: Deep navy (oklch(0.14 0.005 240)), light text
- **Accents**: Amber/gold gradients for Zion AI, themed gradients per devotion theme
- **UI**: Soft borders, rounded corners (10px base), subtle shadows

### Typography
- **Font**: Inter (sans-serif) — clean, modern, highly readable
- **Headings**: font-black (900 weight)
- **Body**: Regular/medium weight, relaxed line-height

---

## 2. TECH STACK

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.1 | UI framework |
| TypeScript | 5.9.3 | Type safety |
| Tailwind CSS | 4.1.14 | Utility-first styling |
| shadcn/ui + Radix | Latest | 43 accessible UI components |
| tRPC React Query | 11.6.0 | Type-safe API calls |
| TanStack React Query | 5.90.2 | Server state management |
| Wouter | 3.3.5 | Lightweight routing |
| Framer Motion | 12.23.22 | Animations |
| Lucide React | 0.453.0 | Icons |
| Recharts | 2.15.2 | Charts/visualizations |
| date-fns | 4.1.0 | Date utilities |
| react-hook-form + Zod | 7.64.0 / 4.1.12 | Form handling & validation |
| Sonner | 2.0.7 | Toast notifications |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Express | 4.21.2 | HTTP server |
| tRPC Server | 11.6.0 | Type-safe API layer |
| Drizzle ORM | 0.44.5 | Database ORM |
| MySQL2 | 3.15.0 | Database driver |
| Jose | 6.1.0 | JWT authentication |
| bcryptjs | 3.0.3 | Password hashing |
| Multer | 2.1.1 | File uploads |
| AWS S3 SDK | 3.693.0 | Cloud file storage |

### AI
| Technology | Purpose |
|---|---|
| Anthropic Claude API | claude-sonnet-4-6 for all AI features |
| Direct fetch (no SDK) | Lightweight integration via Messages API |

### Build & Dev
| Technology | Purpose |
|---|---|
| Vite | 7.1.7 | Dev server & frontend build |
| esbuild | 0.25.0 | Server bundle |
| tsx | 4.19.1 | TypeScript execution with watch mode |
| Vitest | 2.1.4 | Testing |
| Drizzle Kit | 0.31.4 | Database migrations |

---

## 3. FULL CODEBASE STRUCTURE

```
bdb-planner/
├── .env                          # Environment variables (API keys, DB, secrets)
├── .env.example                  # Template for .env
├── package.json                  # Dependencies & scripts
├── pnpm-lock.yaml                # Lock file
├── tsconfig.json                 # TypeScript config (strict, ESNext)
├── vite.config.ts                # Vite: React plugin, Tailwind, aliases
├── vitest.config.ts              # Test config
├── drizzle.config.ts             # Drizzle ORM config (MySQL)
├── components.json               # shadcn/ui component config
│
├── client/                       # ── FRONTEND ──
│   ├── index.html                # HTML entry point
│   ├── public/                   # Static assets
│   └── src/
│       ├── main.tsx              # React entry: QueryClient + tRPC provider
│       ├── App.tsx               # Routes + theme + error boundary
│       ├── index.css             # Tailwind base + design tokens + custom classes
│       ├── const.ts              # Auth URLs
│       │
│       ├── _core/hooks/
│       │   └── useAuth.ts        # Auth hook: user, login, logout, isAuthenticated
│       │
│       ├── contexts/
│       │   └── ThemeContext.tsx   # Light/dark mode with localStorage
│       │
│       ├── hooks/
│       │   ├── useAutoSave.ts    # Debounced auto-save (1200ms) with status
│       │   ├── useComposition.ts # IME input handling
│       │   ├── useMobile.tsx     # Mobile viewport detection (<768px)
│       │   └── usePersistFn.ts   # Stable callback reference
│       │
│       ├── lib/
│       │   ├── utils.ts          # cn() classname merger
│       │   ├── trpc.ts           # tRPC React client
│       │   └── planner.ts        # Date/time utils, constants, debounce
│       │
│       ├── pages/
│       │   ├── Home.tsx          # Landing page (unauthenticated)
│       │   ├── LoginPage.tsx     # Login/register form
│       │   ├── AnnualPage.tsx    # Annual planning (8 life categories, goals, vision)
│       │   ├── MonthlyPage.tsx   # Monthly view (budget, goals, content map)
│       │   ├── WeeklyPage.tsx    # Weekly schedule (time slots, habits, gratitude)
│       │   ├── YearCalendarPage.tsx # Year grid calendar
│       │   ├── NotesPage.tsx     # Apple Notes-style notes
│       │   ├── IntegrationsPage.tsx # Google/Notion/Slack settings
│       │   ├── ZionPage.tsx      # Zion AI chat interface
│       │   └── NotFound.tsx      # 404 page
│       │
│       └── components/
│           ├── PlannerLayout.tsx      # Main layout: sidebar + content + modals
│           ├── DashboardLayout.tsx    # Alternative resizable layout
│           ├── EditableField.tsx      # Click-to-edit input/textarea
│           ├── SaveIndicator.tsx      # Save status display
│           ├── ErrorBoundary.tsx      # React error boundary
│           ├── AIChatBox.tsx          # Zion chat UI
│           ├── AIDigestPanel.tsx      # Daily/weekly AI digest sidebar
│           ├── DailyDevotionModal.tsx # Morning scripture + affirmation modal
│           ├── NightReflectionModal.tsx # Evening reflection modal
│           ├── IntegrationBar.tsx     # Active integrations display
│           ├── VisionBoardTab.tsx     # Image gallery with captions
│           ├── SocialAccountsPanel.tsx # Social media accounts
│           ├── SectionAttachments.tsx # Planner section file attachments
│           ├── NoteAttachments.tsx    # Note file attachments
│           ├── DashboardLayoutSkeleton.tsx # Loading skeleton
│           │
│           └── ui/                   # 43 shadcn/ui components
│               ├── button.tsx, input.tsx, textarea.tsx, card.tsx
│               ├── dialog.tsx, drawer.tsx, sheet.tsx, popover.tsx
│               ├── tabs.tsx, accordion.tsx, sidebar.tsx
│               ├── select.tsx, checkbox.tsx, radio-group.tsx, switch.tsx
│               ├── calendar.tsx, badge.tsx, avatar.tsx, tooltip.tsx
│               ├── dropdown-menu.tsx, context-menu.tsx, menubar.tsx
│               ├── table.tsx, form.tsx, label.tsx, separator.tsx
│               ├── progress.tsx, slider.tsx, spinner.tsx, skeleton.tsx
│               ├── scroll-area.tsx, resizable.tsx, carousel.tsx
│               ├── breadcrumb.tsx, pagination.tsx, navigation-menu.tsx
│               ├── alert.tsx, alert-dialog.tsx, sonner.tsx
│               ├── hover-card.tsx, collapsible.tsx, toggle.tsx
│               ├── toggle-group.tsx, button-group.tsx, input-group.tsx
│               ├── input-otp.tsx, field.tsx, item.tsx, empty.tsx
│               ├── command.tsx, kbd.tsx, chart.tsx, aspect-ratio.tsx
│               └── ...
│
├── server/                       # ── BACKEND ──
│   ├── routers.ts                # ALL tRPC routers (~1400 lines)
│   ├── db.ts                     # Database CRUD functions
│   ├── storage.ts                # S3 file storage
│   ├── uploadRoutes.ts           # File upload endpoints
│   │
│   ├── _core/
│   │   ├── index.ts              # Express server entry point
│   │   ├── auth.ts               # Register/login routes
│   │   ├── context.ts            # tRPC context (user from JWT)
│   │   ├── trpc.ts               # tRPC init, procedures, middleware
│   │   ├── sdk.ts                # JWT creation/validation (Jose)
│   │   ├── cookies.ts            # Cookie config (secure, httpOnly)
│   │   ├── env.ts                # Environment variables
│   │   ├── llm.ts                # Anthropic Claude API integration
│   │   ├── imageGeneration.ts    # AI image generation
│   │   ├── voiceTranscription.ts # Voice-to-text
│   │   ├── notification.ts       # Push/Slack notifications
│   │   ├── map.ts                # Google Maps integration
│   │   ├── dataApi.ts            # External data APIs
│   │   ├── systemRouter.ts       # Health checks, stats
│   │   └── vite.ts               # Vite dev server integration
│   │
│   └── [test files]
│       ├── auth.logout.test.ts
│       ├── notes.test.ts
│       ├── planner.test.ts
│       └── zion.test.ts
│
├── drizzle/                      # ── DATABASE ──
│   ├── schema.ts                 # Full Drizzle ORM schema (all tables)
│   ├── relations.ts              # Table relationships
│   ├── 0000_broad_bucky.sql      # Migration: users table
│   ├── 0001_gifted_skaar.sql     # Migration: planning tables
│   ├── 0002_cuddly_rick_jones.sql # Migration: notes, reminders
│   ├── 0003_flaky_marvex.sql     # Migration: integrations
│   ├── 0004–0009_*.sql           # Additional migrations
│   └── meta/                     # Migration snapshots
│
├── shared/                       # ── SHARED (client + server) ──
│   ├── const.ts                  # COOKIE_NAME, timeouts, error messages
│   ├── types.ts                  # Re-exported Drizzle types
│   └── _core/errors.ts           # Custom error classes
│
└── scripts/
    └── check-tables.mjs          # Database table verification
```

---

## 4. DATABASE SCHEMA

### Users
```sql
users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) UNIQUE NOT NULL,    -- Session identifier
  name TEXT,
  email VARCHAR(320),
  passwordHash TEXT,
  loginMethod VARCHAR(64),               -- 'email' or 'oauth'
  role ENUM('user', 'admin') DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  lastSignedIn TIMESTAMP DEFAULT NOW()
)
```

### Annual Planning
```sql
annual_plans (
  id, userId, year,
  -- 8 Life Categories (Becoming)
  professional TEXT, finance TEXT, learning TEXT, wellness TEXT,
  relationships TEXT, community TEXT, creativity TEXT, spirit TEXT,
  -- Needs Assessment
  basicNeeds JSON,          -- { relationships, career, wellness, finance }
  nonNegotiables JSON,      -- { relationships, career, wellness, finance }
  -- Budget
  annualBudget JSON,        -- { living, personal, savings, investment, entertainment, oneTime }
  -- Who Am I Venn Diagram
  knowledgeSkills TEXT, passionsCallings TEXT, naturalGifts TEXT,
  problemsToSolve TEXT, vennOverlap TEXT,
  -- Vision & Mission
  visionBoardContent TEXT, missionStatement TEXT, elevatorPitch TEXT,
  -- Personal Contract (Be Do Become)
  contractName TEXT, contractBe TEXT, contractDo TEXT, contractBecome TEXT,
  contractGoals JSON,       -- Array of 5 goal strings
  -- Transformation Timeline
  transformationTimeline JSON,  -- { jan, feb, ..., dec }
  -- Integration IDs
  notionDatabaseId VARCHAR(128), notionToken TEXT,
  googleCalendarId VARCHAR(256)
)

big_goals (
  id, userId, year,
  position INT (1-6),       -- 6 big goals per year
  title TEXT, description TEXT,
  steps JSON                -- Array of 5 action steps
)
```

### Monthly Planning
```sql
monthly_plans (
  id, userId, year, month (1-12),
  themeWord TEXT, wellnessHabit TEXT, wellnessMinutes TEXT,
  todos TEXT, financialTargets TEXT, shoppingList TEXT,
  -- Budget (6 categories)
  livingExpenses TEXT, personalExpenses TEXT, savings TEXT,
  investment TEXT, entertainment TEXT, oneTimeExpenses TEXT,
  -- Goals
  businessCareerGoals TEXT, wellnessGoals TEXT,
  bookOfMonth TEXT, birthdays TEXT, actsOfKindness TEXT,
  -- Social Media
  socialFollowers JSON,     -- Platform follower counts
  socialCampaigns TEXT, socialCollaborations TEXT,
  -- Content Map
  contentMapMonth TEXT, contentMapPlatforms JSON,
  contentMapObjectives JSON, contentMapCampaigns JSON,
  contentMapPillars JSON, contentMapNotes TEXT
)
```

### Weekly Planning
```sql
weekly_plans (
  id, userId, year, weekNumber (ISO week),
  wordOfWeek TEXT, affirmation TEXT,
  bibleVerse TEXT, bibleReference TEXT,
  topBusinessGoals TEXT, weekIntentions TEXT, wellnessTasks TEXT,
  moneyEarned TEXT, moneySpent TEXT,
  winsOfWeek TEXT, notes TEXT,
  socialPosts JSON,         -- { mon, tue, wed, thu, fri, sat, sun }
  habitTracker JSON         -- { vitamins: [bool x7], exercise: [...], custom... }
)
```

### Daily Planning
```sql
daily_entries (
  id, userId, date (YYYY-MM-DD),
  topPriorities JSON,      -- Array of priority strings
  timeSlots JSON,           -- { "06:00": "text", "06:30": "text", ... } (26 slots)
  gratitude JSON,           -- Array of 5 gratitude strings
  waterGlasses INT DEFAULT 0
)
```

### Supporting Tables
```sql
notes (id, userId, title, content, folder, pinned, isLocked, lockPasswordHash, timestamps)
reminders (id, userId, title, reminderAt, date, timeSlot, notifyBrowser, notifySlack, sent)
user_integrations (id, userId, slack*, google*, notion*)
vision_board_images (id, userId, annualPlanId, imageUrl, caption, displayOrder)
section_attachments (id, userId, planType, section, attachmentUrl)
note_attachments (id, noteId, attachmentUrl, attachmentType)
social_accounts (id, userId, platform, username, url, followerCount)
zion_messages (id, userId, content, role, metadata, createdAt)
content_calendar_entries (id, userId, year, month, weekNum, entries JSON)
daily_devotions (id, userId, date, verse, verseRef, affirmation, theme, dismissed, savedToPlanner)
night_reflections (id, userId, date, category1-3, desire1-3, negativeThought, reframe, zionMessage)
```

---

## 5. SERVER ARCHITECTURE

### API Structure (tRPC Routers)
```
appRouter
├── system          # Health check, stats
├── auth
│   ├── me          # Get current user
│   └── logout      # Clear session
├── annual
│   ├── get         # Fetch annual plan by year
│   └── save        # Upsert annual plan
├── bigGoals
│   ├── list        # Get 6 goals for year
│   └── save        # Upsert a goal
├── monthly
│   ├── get         # Fetch monthly plan
│   └── save        # Upsert monthly plan
├── weekly
│   ├── get         # Fetch weekly plan
│   └── save        # Upsert weekly plan
├── daily
│   ├── get         # Fetch daily entry
│   └── save        # Upsert daily entry
├── contentCalendar
│   ├── get         # Fetch content calendar
│   └── save        # Upsert content calendar
├── notes
│   ├── list        # List notes (with folder filter)
│   ├── get         # Get single note
│   ├── search      # Full-text search
│   ├── create      # Create note
│   ├── update      # Update note
│   ├── delete      # Delete note
│   └── getFolders  # List folders
├── integrations
│   ├── get         # Get integration settings
│   └── save        # Save integration settings
├── visionBoard
│   ├── getImages   # List vision board images
│   ├── addImage    # Upload image
│   ├── updateCaption # Edit caption
│   └── deleteImage # Remove image
├── attachments     # Section & note attachments (get, add, delete)
├── socialAccounts  # CRUD for social accounts
├── ai
│   ├── dailyDigest   # Generate AI daily digest
│   └── weeklyDigest  # Generate AI weekly digest
├── zion
│   ├── chat              # Send message to Zion, get response + planner actions
│   ├── history           # Get chat history
│   ├── clearHistory      # Clear chat history
│   ├── transcribeVoice   # Voice-to-text
│   ├── checkNightlyPrompt # Check if nightly reflection is due
│   ├── getNightReflection # Get today's reflection
│   ├── generateReframe   # AI reframe for negative thought
│   └── saveNightReflection # Save reflection + get Zion goodnight message
└── devotion
    ├── getToday       # Get/generate today's devotion (NKJV verse + AI affirmation)
    ├── dismiss        # Dismiss devotion modal
    └── saveToPlanner  # Save devotion to Notes
```

### Authentication Flow
```
Register → bcrypt hash password → create user → sign JWT → set httpOnly cookie
Login → verify password → sign JWT → set httpOnly cookie
Every request → read cookie → verify JWT → attach user to context
Protected procedures → check ctx.user exists → proceed or throw
```

### LLM Integration (server/_core/llm.ts)
```
invokeLLM(params) →
  1. Extract system messages → Anthropic top-level system param
  2. Convert messages to Anthropic format (alternating user/assistant)
  3. Append JSON schema instructions if response_format specified
  4. POST to https://api.anthropic.com/v1/messages
  5. Convert response to InvokeResult (OpenAI-compatible shape)
  6. All callers receive same interface — no code changes needed
```

---

## 6. CLIENT ARCHITECTURE

### Routing
```
/ → Home.tsx (landing page, redirects to /annual if authenticated)
/login → LoginPage.tsx
/annual → AnnualPage.tsx (wrapped in PlannerLayout)
/monthly/:year/:month → MonthlyPage.tsx
/weekly/:year/:week → WeeklyPage.tsx
/year-calendar/:year → YearCalendarPage.tsx
/notes → NotesPage.tsx
/integrations → IntegrationsPage.tsx
/zion → ZionPage.tsx
```

### Core UI Pattern: EditableField + Auto-Save
```
User clicks field → EditableField becomes editable
User types → onChange fires → local state updates
User pauses (1200ms) → useAutoSave triggers tRPC mutation
SaveIndicator shows: idle → saving → saved → idle
```

### State Management
- **Server State**: tRPC + React Query (queries, mutations, cache)
- **UI State**: React useState/useReducer (local component state)
- **Theme**: React Context (ThemeContext)
- **Auth**: React Query (auth.me query, cached)

---

## 7. DESIGN SYSTEM & STYLING

### CSS Variables (OKLCH Color Space)
```css
/* Light Mode */
--background: oklch(0.98 0.003 90);     /* Warm off-white */
--foreground: oklch(0.12 0.01 240);     /* Deep dark blue */
--card: oklch(1 0 0);                    /* Pure white */
--primary: oklch(0.12 0.01 240);        /* Dark blue */
--muted: oklch(0.94 0.003 90);          /* Light warm gray */
--border: oklch(0.88 0.003 90);         /* Soft border */
--destructive: oklch(0.577 0.245 27.325); /* Red */

/* Dark Mode */
--background: oklch(0.14 0.005 240);    /* Deep navy */
--foreground: oklch(0.96 0.003 90);     /* Near white */
--card: oklch(0.20 0.006 240);          /* Dark card */
```

### Border Radius Scale
```
--radius: 0.625rem (10px)
--radius-sm: 6px
--radius-md: 8px
--radius-lg: 10px
--radius-xl: 14px
```

### Custom CSS Classes
```css
.planner-field    → Click-to-edit transparent input, border on hover
.planner-pill     → Pill-shaped editable field
.planner-card     → Rounded card with border and padding
.habit-check      → 5x5 checkbox for habit tracking
.sidebar-nav-item → Navigation item in sidebar
```

### Responsive Breakpoints
```
Mobile: < 768px (touch targets 44x44, safe area padding)
Tablet: 768px - 1024px
Desktop: > 1024px (max-width 1400px container)
```

---

## 8. FEATURE BREAKDOWN

### Annual Planning (AnnualPage.tsx)
- **8 Life Categories**: Professional, Finance, Learning, Wellness, Relationships, Community, Creativity, Spirit
- **Needs Assessment**: Basic needs + non-negotiables grid (4 quadrants)
- **Annual Budget**: 6 categories with amounts
- **Who Am I Venn Diagram**: Knowledge/Skills, Passions/Callings, Natural Gifts, Problems to Solve → Overlap
- **Vision Board**: Image gallery with captions (S3 upload)
- **Mission Statement & Elevator Pitch**: Text fields
- **Personal Contract**: Name, Be, Do, Become, 5 Goals
- **Transformation Timeline**: Monthly breakdown (Jan-Dec)
- **6 Big Goals**: Each with title, description, 5 action steps

### Monthly Planning (MonthlyPage.tsx)
- **Theme Word**: Monthly focus word
- **Wellness Habit**: Habit + minutes tracked
- **Budget Tracker**: 6 spending categories
- **Goals**: Business/career + wellness goals
- **Social Media**: Follower tracking, campaigns, collaborations
- **Content Map**: Platforms, objectives, campaigns, pillars, notes
- **Calendar Grid**: Monthly date view

### Weekly Planning (WeeklyPage.tsx)
- **Word of the Week**: Focus word
- **Affirmation**: Weekly personal affirmation
- **Bible Verse**: NKJV scripture + reference
- **Business Goals & Intentions**: Weekly priorities
- **Money Tracking**: Earned & spent
- **Wins of the Week**: Celebration log
- **Habit Tracker**: 3 default (vitamins, exercise, meditation) + custom, 7-day grid
- **Social Media Posts**: Daily post planning per platform
- **Daily Schedule**: 30-min time slots (6am-7pm), top priorities, gratitude (5 entries), water intake (8 glasses)

### Notes (NotesPage.tsx)
- **Folder System**: Organize notes into folders
- **Search**: Full-text search across notes
- **Pin/Lock**: Pin important notes, password-protect sensitive ones
- **Attachments**: Upload files to notes
- **Auto-Save**: Real-time saving

### Zion AI Chat (ZionPage.tsx + AIChatBox.tsx)
- **Brain Dump Organizer**: Share stream of consciousness → Zion extracts and saves to planner
- **Goal Coach**: Clarify and refine goals
- **Schedule Assistant**: Plan week, prioritize tasks
- **Wellness Guide**: Habit suggestions and accountability
- **Content Strategist**: Plan social media content
- **Voice Input**: Speech-to-text for hands-free input
- **Auto-Save to Planner**: Extracts goals, schedules, habits, reminders, gratitude, notes automatically

### Daily Devotion (DailyDevotionModal.tsx)
- **Auto-Show**: Pops up once per day
- **52 NKJV Verses**: Deterministic rotation aligned with BDB wellness pillars
- **AI Affirmation**: Claude generates personalized affirmation per verse theme
- **Themed Gradients**: Each theme (Strength, Purpose, Faith, etc.) has unique visual styling
- **Save to Notes**: One-click save to "Daily Devotions" folder
- **Share**: Copy verse + affirmation to clipboard

### Night Reflection (NightReflectionModal.tsx)
- **3 Desires**: Pick category + write desire for each
- **Negative Thought Reframe**: Share a negative thought → Zion AI reframes it positively
- **Goodnight Message**: Personalized closing message from Zion
- **Daily Tracking**: One reflection per day

### AI Digests (AIDigestPanel.tsx)
- **Daily Digest**: Greeting, top priorities, appointments, habit reminders, motivational insight, quick win
- **Weekly Digest**: Week summary, key appointments, focus areas, habit insights, financial snapshot, goal alignment

---

## 9. AI INTEGRATION (ZION)

### Model
- **Provider**: Anthropic
- **Model**: claude-sonnet-4-6
- **Endpoint**: https://api.anthropic.com/v1/messages
- **Auth**: x-api-key header with sk-ant-... key stored in OPENAI_API_KEY env var

### Zion's Personality
```
- Warm, empathetic, and motivating — like a wise best friend who keeps you accountable
- Speaks with gentle authority and wisdom
- Celebrates wins and reframes challenges as growth opportunities
- Uses the Be Do Become framework: who you're BEING, what you're DOING, who you're BECOMING
- Asks 1 thoughtful follow-up question after organizing a brain dump
```

### Planner Action Types
Zion automatically extracts and saves these from conversations:
```
goal           → Annual Big Goals
monthly_goal   → Monthly Goals (business or wellness)
schedule       → Daily time slot
calendar       → Calendar event on specific date
reminder       → Reminder + calendar entry
priority       → Daily top priority
habit          → Weekly habit tracker
intention      → Weekly intention
win            → Weekly win
budget         → Monthly budget category
social_post    → Weekly social media post
gratitude      → Daily gratitude entry
note           → Save to Notes (with folder)
```

### AI-Powered Features
1. **Zion Chat**: Full conversational AI with planner context
2. **Daily Affirmation**: Generated from NKJV verse theme
3. **Night Reframe**: Transforms negative thoughts into empowering beliefs
4. **Goodnight Message**: Personalized based on evening reflection
5. **Daily Digest**: Morning productivity summary
6. **Weekly Digest**: Weekly review and planning insights

---

## 10. AUTHENTICATION & SECURITY

### Auth System
- **Method**: Email + password (bcrypt hashed)
- **Session**: JWT stored in httpOnly, secure, sameSite cookie (1-year expiry)
- **Library**: Jose (JWT), bcryptjs (hashing)
- **Middleware**: tRPC protectedProcedure checks user exists on every request
- **Admin**: First user with ADMIN_EMAIL gets admin role

### Security Measures
- All database queries filtered by userId (row-level security)
- Password hashing with bcrypt (salt rounds auto)
- httpOnly cookies prevent XSS token theft
- Secure flag on cookies in production
- Input validation via Zod schemas on all endpoints
- Note locking with separate password hash

---

## 11. INTEGRATIONS

### Google Calendar
- OAuth tokens stored in user_integrations
- One-click "Add to Calendar" from any time slot
- Calendar ID configuration

### Notion
- API token + database ID
- Sync planner data to Notion

### Slack
- Webhook URL configuration
- Reminder notifications to Slack channels
- Channel name customization

---

## 12. PRODUCTION DEPLOYMENT PLAN

### Environment Variables Required
```bash
DATABASE_URL=mysql://user:pass@host:3306/bdb_planner  # MySQL connection
JWT_SECRET=<random-64-char-string>                      # JWT signing secret
ADMIN_EMAIL=leah@example.com                            # Admin user email
OPENAI_API_KEY=sk-ant-...                               # Anthropic API key
PORT=3000                                                # Server port
NODE_ENV=production                                      # Production mode
```

### Build Commands
```bash
pnpm install                    # Install dependencies
pnpm db:push                    # Run database migrations
pnpm build                      # Build frontend (Vite) + backend (esbuild)
pnpm start                      # Start production server
```

### Build Output
```
dist/
├── index.js          # Bundled Express server
└── public/           # Static frontend assets
    ├── index.html
    └── assets/       # JS/CSS chunks
```

### Hosting Recommendations
- **Server**: Railway, Render, Fly.io, or AWS EC2
- **Database**: PlanetScale (MySQL), AWS RDS, or Railway MySQL
- **File Storage**: AWS S3 (already configured)
- **Domain**: Custom domain with SSL
- **CDN**: Cloudflare for static assets

### Production Checklist
- [ ] Set strong JWT_SECRET (64+ random characters)
- [ ] Configure MySQL database with SSL
- [ ] Set OPENAI_API_KEY with Anthropic key
- [ ] Configure S3 bucket for file uploads
- [ ] Set up HTTPS/SSL certificate
- [ ] Configure CORS if using separate domains
- [ ] Set up database backups
- [ ] Configure error monitoring (Sentry)
- [ ] Set up health check monitoring
- [ ] Test all AI features with production API key

---

## 13. FULL BUILD PROMPT

Below is the complete prompt that describes how to build this application from scratch:

---

### BUILD PROMPT: BDB Digital Planner

```
Build a production-grade digital wellness planner web application called "BDB Digital Planner"
(Be Do Become) by Leah Marville. This is a faith-integrated personal planning platform for
women entrepreneurs.

TECH STACK:
- Frontend: React 19, TypeScript, Tailwind CSS 4, shadcn/ui components (Radix), tRPC React Query,
  Wouter routing, Framer Motion, Lucide icons, Recharts, date-fns, react-hook-form + Zod
- Backend: Express, tRPC Server, Drizzle ORM with MySQL, Jose (JWT), bcryptjs
- AI: Anthropic Claude API (claude-sonnet-4-6) via direct fetch
- Build: Vite, esbuild, tsx watch

DESIGN DIRECTION:
- Warm, premium feel with cream/off-white backgrounds and deep dark foregrounds
- OKLCH color space for perceptually uniform colors
- Inter font family, font-black for headings
- 10px base border radius, soft borders, subtle shadows
- Mobile-first responsive design with 44px touch targets
- Light/dark mode support via CSS variables

CORE UX PATTERN:
- Click-to-edit fields (EditableField component) — no forms, just click and type
- Auto-save with 1200ms debounce — visual indicator shows idle/saving/saved/error
- Everything saves automatically, no submit buttons needed

AUTH SYSTEM:
- Email + password registration/login
- bcrypt password hashing, JWT in httpOnly secure cookies (1-year expiry)
- Protected tRPC procedures check user from JWT

DATABASE (MySQL via Drizzle ORM):
- users, annual_plans, big_goals (6 per year with 5 steps each)
- monthly_plans (budget, goals, content map, social tracking)
- weekly_plans (habit tracker, social posts, Bible verse, affirmation)
- daily_entries (26 time slots 6am-7pm, priorities, gratitude x5, water intake)
- notes (folders, pinning, password locking, attachments)
- reminders, user_integrations, vision_board_images
- social_accounts, zion_messages, content_calendar_entries
- daily_devotions, night_reflections

PAGES & FEATURES:

1. LANDING PAGE: Hero with "Start Planning 2026", feature grid, CTA

2. ANNUAL PLANNING:
   - 8 life categories (professional, finance, learning, wellness, relationships,
     community, creativity, spirit)
   - Basic needs & non-negotiables grid
   - Annual budget (6 categories)
   - "Who Am I" Venn diagram (knowledge, passions, gifts, problems → overlap)
   - Vision board (image gallery with S3 upload)
   - Mission statement & elevator pitch
   - Personal contract: I [name] commit to BEING [be], DOING [do], BECOMING [become]
   - 5 contract goals
   - Transformation timeline (monthly breakdown Jan-Dec)
   - 6 Big Goals with title, description, 5 action steps each

3. MONTHLY PLANNING:
   - Theme word, wellness habit + minutes
   - Budget tracker (6 categories)
   - Business/career goals, wellness goals
   - Book of month, birthdays, acts of kindness
   - Social media: follower tracking, campaigns, collaborations
   - Content map: platforms, objectives, campaigns, pillars, notes

4. WEEKLY PLANNING:
   - Word of week, affirmation, NKJV Bible verse + reference
   - Business goals, intentions, wellness tasks
   - Money earned/spent, wins of the week
   - 7-day habit tracker (vitamins, exercise, meditation + custom habits)
   - Daily social media post planning by platform
   - Per-day: 30-min time slots (6am-7pm), top priorities, gratitude (5), water (8 glasses)

5. NOTES:
   - Apple Notes-style with folders, search, pin, lock (password-protected)
   - Note attachments, auto-save

6. INTEGRATIONS: Google Calendar (OAuth), Notion (API), Slack (webhooks)

7. YEAR CALENDAR: Grid view of all 12 months

AI ASSISTANT ("ZION"):
- Personality: Warm, empathetic wellness coach using Be Do Become framework
- Brain dump organizer: User shares stream of consciousness → Zion extracts goals, tasks,
  habits, reminders, gratitude, notes and auto-saves to planner via PLANNER_ACTIONS XML blocks
- Action types: goal, monthly_goal, schedule, calendar, reminder, priority, habit,
  intention, win, budget, social_post, gratitude, note
- System prompt includes user's current goals, monthly theme, weekly word for context
- Chat history (last 16 messages) for continuity
- Voice input support (speech-to-text)

DAILY DEVOTION MODAL:
- Auto-shows once per day on login
- 52 NKJV Bible verses in pool, rotated deterministically by day-of-year
- Each verse has a theme (Strength, Purpose, Faith, Courage, etc.)
- Claude generates personalized 1-2 sentence affirmation per theme
- Dynamic gradient backgrounds per theme
- Save to Notes ("Daily Devotions" folder), share to clipboard, "Begin My Day" dismiss

NIGHT REFLECTION MODAL:
- 3 desires: pick category + write desire
- Negative thought → Claude generates empowering reframe
- Claude generates personalized goodnight message referencing their desires
- One reflection per day

AI DIGESTS:
- Daily: greeting, priorities, appointments, habit reminders, motivational insight, quick win
- Weekly: summary, key appointments, focus areas, habit insights, financial snapshot,
  goal alignment, motivational message
- Both return structured JSON via response_format

ANTHROPIC API INTEGRATION (server/_core/llm.ts):
- POST to https://api.anthropic.com/v1/messages
- Headers: x-api-key (from OPENAI_API_KEY env var), anthropic-version: 2023-06-01
- Model: claude-sonnet-4-6
- Extract system messages to top-level system param
- Convert response to OpenAI-compatible InvokeResult shape for all callers
- Handle JSON response format by appending schema instructions to system prompt

FILE STRUCTURE:
- client/ (React app with pages/, components/, hooks/, lib/, contexts/)
- server/ (Express + tRPC with _core/ for infrastructure)
- drizzle/ (schema + SQL migrations)
- shared/ (types + constants used by both)
- Single package.json, monorepo-style with path aliases

PRODUCTION BUILD:
- `vite build` for frontend → dist/public/
- `esbuild` for server → dist/index.js
- `pnpm start` runs production server serving static files + API
```

---

*This document represents the complete architecture of the BDB Digital Planner as of April 2026.*
