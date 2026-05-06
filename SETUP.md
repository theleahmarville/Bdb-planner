# BDB Digital Planner — Setup & Transfer Guide

This document covers everything needed to transfer this project to a new Manus account and get it fully running, including database setup, environment variables, and third-party integrations.

---

## Step 1: Export from the Current Account

There are two ways to get the code out of the current Manus account:

**Option A — GitHub Export (Recommended)**

1. In the Manus Management UI, go to **Settings → GitHub**
2. Connect your GitHub account
3. Export the project to a new private repository (e.g., `bdb-digital-planner`)
4. The full codebase is now in your GitHub repo and can be imported anywhere

**Option B — Download ZIP**

1. In the Manus Management UI, go to the **Code** panel
2. Click **"Download all files"**
3. You receive a ZIP of the complete project

---

## Step 2: Import on the New Manus Account

1. Log in to the new Manus account
2. Create a new project — choose the **Web App (tRPC + Database + Auth)** template
3. If using GitHub: connect the repo in **Settings → GitHub** and pull the code
4. If using ZIP: upload the files via the Code panel

---

## Step 3: Run the Database Migration

The database on the new account starts empty. You must apply the schema to create all tables. Run the following SQL in the **Database** panel of the Management UI (or via the `webdev_execute_sql` tool if using Manus AI):

```sql
-- Users table (already exists from template, skip if present)
-- Annual plans
CREATE TABLE IF NOT EXISTS annual_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  year INT NOT NULL,
  professional TEXT,
  finance TEXT,
  learning TEXT,
  wellness TEXT,
  relationships TEXT,
  community TEXT,
  creativity TEXT,
  spirit TEXT,
  basicNeeds JSON,
  nonNegotiables JSON,
  annualBudget JSON,
  knowledgeSkills TEXT,
  passionsCallings TEXT,
  naturalGifts TEXT,
  problemsToSolve TEXT,
  vennOverlap TEXT,
  visionBoardContent TEXT,
  missionStatement TEXT,
  elevatorPitch TEXT,
  contractName TEXT,
  contractBe TEXT,
  contractDo TEXT,
  contractBecome TEXT,
  contractGoals JSON,
  transformationTimeline JSON,
  notionDatabaseId VARCHAR(128),
  notionToken TEXT,
  googleCalendarId VARCHAR(256),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Big goals
CREATE TABLE IF NOT EXISTS big_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  year INT NOT NULL,
  position INT NOT NULL,
  title TEXT,
  description TEXT,
  steps JSON,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Monthly plans
CREATE TABLE IF NOT EXISTS monthly_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  themeWord TEXT,
  wellnessHabit TEXT,
  wellnessMinutes INT,
  todos TEXT,
  financialTargets TEXT,
  shoppingList TEXT,
  livingExpenses TEXT,
  personalExpenses TEXT,
  savings TEXT,
  investment TEXT,
  entertainment TEXT,
  oneTimeExpenses TEXT,
  businessCareerGoals TEXT,
  wellnessGoals TEXT,
  bookOfMonth TEXT,
  birthdays TEXT,
  actsOfKindness TEXT,
  socialFollowers JSON,
  socialCampaigns TEXT,
  socialCollaborations TEXT,
  contentMapMonth TEXT,
  contentMapPlatforms JSON,
  contentMapObjectives JSON,
  contentMapCampaigns JSON,
  contentMapPillars JSON,
  contentMapNotes TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Weekly plans
CREATE TABLE IF NOT EXISTS weekly_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  year INT NOT NULL,
  weekNumber INT NOT NULL,
  weekStartDate VARCHAR(10) NOT NULL,
  wordOfWeek TEXT,
  affirmation TEXT,
  bibleVerse TEXT,
  bibleReference TEXT,
  topBusinessGoals TEXT,
  weekIntentions TEXT,
  wellnessTasks TEXT,
  moneyEarned TEXT,
  moneySpent TEXT,
  winsOfWeek TEXT,
  notes TEXT,
  socialPosts JSON,
  habitTracker JSON,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Daily entries
CREATE TABLE IF NOT EXISTS daily_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  date VARCHAR(10) NOT NULL,
  topPriorities JSON,
  timeSlots JSON,
  gratitude JSON,
  waterGlasses INT DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Content calendar entries
CREATE TABLE IF NOT EXISTS content_calendar_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  weekNum INT NOT NULL,
  entries JSON,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  title VARCHAR(512) NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  folder VARCHAR(128) NOT NULL DEFAULT 'All Notes',
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  title VARCHAR(512) NOT NULL,
  reminderAt TIMESTAMP NOT NULL,
  date VARCHAR(10) NOT NULL,
  timeSlot VARCHAR(5),
  notifyBrowser BOOLEAN NOT NULL DEFAULT TRUE,
  notifySlack BOOLEAN NOT NULL DEFAULT FALSE,
  sent BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User integrations
CREATE TABLE IF NOT EXISTS user_integrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL UNIQUE,
  slackWebhookUrl TEXT,
  slackChannelName VARCHAR(128),
  googleAccessToken TEXT,
  googleRefreshToken TEXT,
  googleTokenExpiry TIMESTAMP NULL,
  googleCalendarId VARCHAR(256),
  notionToken TEXT,
  notionDatabaseId VARCHAR(128),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Step 4: Environment Variables

The following environment variables are automatically injected by Manus on any account — no manual setup needed:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string |
| `JWT_SECRET` | Session cookie signing secret |
| `VITE_APP_ID` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL |
| `OWNER_OPEN_ID` | Owner's Manus ID (used for admin role) |
| `BUILT_IN_FORGE_API_KEY` | Manus built-in API key (server-side) |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus built-in API key (frontend) |

These are all handled automatically — no `.env` file needed.

---

## Step 5: Optional — Rename the App

To update the app name and logo shown in the browser tab and sidebar:

1. In the Management UI, go to **Settings → General**
2. Update the **Website Name** field (e.g., "BDB Digital Planner 2026")
3. Upload a custom **favicon** if desired

---

## Step 6: Custom Domain

To connect your own domain (e.g., `app.yourbrand.com`):

1. In the Management UI, go to **Settings → Domains**
2. Add your custom domain
3. Follow the DNS instructions to point your domain to Manus
4. SSL is provisioned automatically

---

## Step 7: Third-Party Integrations (Optional)

### Google Calendar
Users connect their own Google Calendar from the **Integrations** page inside the app. No server-side Google API key is required for the current one-click export flow (it opens Google Calendar pre-filled). For full OAuth push integration, a Google Cloud project with Calendar API enabled is needed.

### Notion
Users paste their own Notion integration token and database ID in the **Integrations** page. No server-side Notion key is required.

### Slack
Users paste their own Slack Incoming Webhook URL in the **Integrations** page. No server-side Slack app is required.

---

## Step 8: Publish

Once everything is set up and tested:

1. Save a checkpoint in the Management UI
2. Click **Publish** in the top-right of the Management UI
3. Your app is live at `yourapp.manus.space` (or your custom domain)

---

## Running Tests After Transfer

```bash
pnpm install
pnpm test
```

All 32 tests should pass on any account with a valid database connection.

---

## Support

If you encounter issues during transfer, the most common causes are:

- Database tables not yet created (re-run the SQL in Step 3)
- Missing environment variables (check Settings → Secrets in the Management UI)
- Stale build cache (restart the dev server from the Management UI)
