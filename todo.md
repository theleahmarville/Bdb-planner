# BDB Digital Planner - TODO

## Database & Backend
- [x] Database schema for planner entries (annual, monthly, weekly)
- [x] tRPC routers for all planner sections
- [x] Auto-save procedures for all text fields

## Core Layout & Navigation
- [x] Sidebar navigation (Annual / Monthly / Weekly)
- [x] Date picker for jumping to specific dates
- [x] Responsive layout with PlannerLayout sidebar
- [x] Global theme (clean black & white, BDB brand)

## Annual Planning Section
- [x] Vision board (text canvas)
- [x] Life categories (Professional, Finance, Learning, Wellness, Relationships, Community, Creativity, Spirit)
- [x] Big Goals with steps (6 goals x 5 steps)
- [x] Values assessment (Basic Needs, Non-Negotiables)
- [x] Annual budget setup
- [x] Who am I? Venn diagram (interactive text areas)
- [x] Personal Mission Statement + Elevator Pitch
- [x] Personal Contract (BE/DO/BECOME + 5 goals)
- [x] Transformation Timeline (12-month quarterly overview)

## Monthly View
- [x] Monthly calendar grid (Mon-Sun)
- [x] Monthly intro (theme word, wellness habit)
- [x] To Do's, Financial Targets, Shopping List
- [x] Monthly Budget categories (Living, Personal, Savings, Investment, Entertainment, One-time)
- [x] Business/Career Goals, Wellness Goals
- [x] Social Media Management (follower counts per platform)
- [x] Monthly Social Media Calendar + Content Map
- [x] Content Calendar & Posting Schedule (campaigns, pillars, objectives)

## Weekly View
- [x] 7-day spread with date headers
- [x] Time slots 6:00am - 7:00pm in 30-min increments (click-to-edit)
- [x] Top Priorities per day
- [x] Gratitude journal (5 items per day)
- [x] Water intake tracker per day
- [x] Word of the Week
- [x] Weekly Affirmation + Bible verse
- [x] Top Business Goals
- [x] This Week's Intentions
- [x] Wellness / Personal tasks
- [x] Daily Habit Tracker (Vitamins, Exercise, Meditation + custom)
- [x] Money Earned / Money Spent
- [x] Social Media Posts tracker
- [x] Wins of the Week
- [x] Notes

## Integrations
- [x] Google Calendar integration (add time slot events to Google Calendar)
- [x] Notion integration (sync goals and monthly objectives)

## Data & Persistence
- [x] All fields auto-save to database
- [x] Data persistence per user account

## Tests
- [x] Vitest tests for planner routers (20 tests, all passing)

## New Features (Phase 2)
- [ ] Google Calendar OAuth connection in Integrations page
- [ ] Push events directly to Google Calendar from time slots (no new tab)
- [ ] Slack webhook integration in Integrations page
- [ ] Slack daily summary sender (send today's priorities + schedule to Slack)
- [ ] Reminder prompt system: set reminders on any time slot event
- [ ] Reminder storage in database (date, time, message, channels)
- [ ] Browser notification delivery for reminders
- [ ] Slack notification delivery for reminders
- [ ] Reminders management panel (view/delete upcoming reminders)

## Notes Section (Apple Notes Style)
- [x] Notes database table (id, userId, title, content, folder, pinned, createdAt, updatedAt)
- [x] tRPC router for notes (list, get, create, update, delete, search)
- [x] Two-panel layout: notes list sidebar + full editor panel
- [x] Folders/categories (All Notes, Personal, Work, Goals, Ideas + custom)
- [x] Search bar to filter notes by title/content
- [x] Pin notes to top
- [x] Rich text editor (bold, italic, bullet lists, headings, checkboxes)
- [x] Auto-save with debounce
- [x] Empty state when no notes exist
- [x] Note preview snippet in sidebar list
- [x] Sidebar navigation entry for Notes
- [x] Vitest tests for notes router

## Mobile Responsiveness
- [x] PlannerLayout: bottom tab bar on mobile, slide-out drawer overlay
- [x] PlannerLayout: mobile header with hamburger menu and page title
- [x] Annual page: single-column stacked cards on mobile, scrollable tabs
- [x] Monthly page: responsive calendar grid, stacked budget/social tables
- [x] Weekly page: horizontal scroll time slots or day-by-day view on mobile
- [x] Notes page: full-screen list → full-screen editor navigation on mobile
- [x] Integrations page: single-column stacked cards on mobile
- [x] Touch-friendly tap targets (min 44px) throughout
- [x] Global CSS: mobile-first breakpoints and safe-area insets

## Export & Transfer Preparation
- [x] Write comprehensive README.md with project overview and feature list
- [x] Write SETUP.md with step-by-step new account setup instructions
- [x] Write database migration reference in SETUP.md
- [x] Document all environment variables required
- [x] Document integration setup (Google Calendar, Notion, Slack)
- [x] Save final clean checkpoint for export

## Customization Phase 3
- [x] Persistent Google Calendar & Notion integration toolbar on every page
- [x] Integration toolbar shows connection status (connected/disconnected)
- [x] Quick "Sync to Notion" button in toolbar
- [x] Quick "Add to Google Calendar" button in toolbar
- [x] Full Year Calendar page (all 12 months grid view)
- [x] Year Calendar sidebar nav entry under Annual Planning
- [x] Year Calendar shows events/appointments from daily entries
- [x] "Be Do Become Wellness by Leah Marville" branding on every page
- [x] Branding in sidebar footer and page headers

## Journal Lock Feature
- [x] Add `isLocked` and `lockPasswordHash` columns to notes table
- [x] Add `setNoteLock`, `verifyNoteLock`, `removeNoteLock` tRPC procedures
- [x] Journal folder pre-seeded as a default folder in Notes sidebar
- [x] Lock icon on locked notes in the notes list
- [x] "Lock Note" button in note editor toolbar
- [x] Set password modal (first time locking a note in Journal)
- [x] Unlock modal with password prompt (blur/hide content when locked)
- [x] "Remove Lock" option in note settings
- [x] Session-based unlock memory (stays unlocked for the session)
- [x] Vitest tests for lock/unlock procedures

## Vision Board, PDF Uploads & Social Linking (Phase 4)
- [x] vision_board_images table (id, userId, year, imageUrl, fileKey, caption, position, createdAt)
- [x] section_attachments table (id, userId, section, sectionKey, fileUrl, fileKey, fileName, fileType, createdAt)
- [x] social_accounts table (id, userId, platform, handle, profileUrl, accessToken, connected, createdAt)
- [x] tRPC procedures: visionBoard.listImages, addImage, deleteImage, reorder
- [x] tRPC procedures: attachments.list, upload, delete
- [x] tRPC procedures: socialAccounts.list, upsert, disconnect
- [x] S3 upload route for images and PDFs (server-side storagePut)
- [x] Vision Board photo grid with drag-and-drop upload
- [x] Vision Board image captions (click-to-edit)
- [x] Vision Board Pinterest board URL linking + open board button
- [x] Vision Board image delete with confirmation
- [x] PDF/file attachment component reusable across all sections
- [x] PDF attachment in Annual Planning (all 8 tabs)
- [x] PDF attachment in Monthly View (all 6 tabs)
- [x] PDF attachment in Weekly View (schedule, intentions, habits tabs)
- [x] PDF viewer inline (embed in page) or download link
- [x] Social media account connect panel in Monthly Content Map tab
- [x] Platform icons with connected/disconnected status per account
- [x] Direct link to each connected social media profile
- [x] Social account handle display in content calendar rows

## AI Daily/Weekly Digest (Phase 5)
- [ ] Server-side tRPC procedure: ai.digest — reads user's weekly schedule, daily priorities, habits, goals, and monthly objectives
- [ ] LLM prompt that synthesizes planner data into a structured daily/weekly digest
- [ ] Digest includes: upcoming appointments, top priorities, habit reminders, goal check-ins
- [ ] Daily mode: today's schedule + top 3 priorities + habit nudges
- [ ] Weekly mode: week overview + key appointments + goal progress + motivational insight
- [ ] AI Digest sidebar panel component (slide-in from right)
- [ ] Toggle between Daily and Weekly digest view
- [ ] "Regenerate" button to refresh the digest
- [ ] Loading skeleton while AI generates
- [ ] Digest panel accessible from every page via sidebar icon
- [ ] Digest panel shows last-generated timestamp
- [ ] Vitest test for digest procedure

## Note Attachments (Photos & PDFs)
- [ ] note_attachments table (id, userId, noteId, fileUrl, fileKey, fileName, fileType, fileSize, createdAt)
- [ ] tRPC procedures: notes.listAttachments, notes.deleteAttachment
- [ ] Upload route for note attachments (POST /api/upload/note-attachment)
- [ ] NoteAttachments component with image grid and PDF list
- [ ] Inline image previews in note editor
- [ ] PDF attachment links with file name and size
- [ ] Delete attachment with confirmation
- [ ] Attach button in note editor toolbar
- [ ] Locked notes hide attachments until unlocked

## Zion AI Chat Assistant
- [x] zion_messages DB table (id, userId, role, content, metadata, createdAt)
- [x] tRPC procedures: zion.chat, zion.history, zion.clearHistory, zion.transcribeVoice
- [x] Brain dump parser: AI extracts goals, events, habits, notes, budget items, social posts
- [x] Auto-populate planner sections from parsed brain dump
- [x] Zion chat full-page UI with streaming markdown responses
- [x] Voice input (browser MediaRecorder → S3 upload → Whisper transcription)
- [x] Message history with timestamps and role indicators
- [x] Clarifying questions flow (Zion asks follow-ups before saving)
- [x] "Saved to planner" confirmation cards after organizing content
- [x] Zion sidebar nav entry with sparkle/chat icon
- [x] Zion personality: warm, encouraging, wellness-focused (Be Do Become brand)
- [x] Vitest tests for brain dump parser (6 tests, 38 total passing)

## Zion Auto-Populate Fix
- [x] Add saveParsedItem tRPC procedure that writes parsed brain dump items to correct DB tables
- [x] Wire "Save" button on Zion action cards to call saveParsedItem
- [x] Show success toast + mark card as saved after DB write
- [x] Test: goal saves to annual_planning big_goals, event saves to weekly schedule, habit saves to weekly habit tracker, note saves to notes table

## Zion Fully Actionable Actions
- [x] reminder action type → creates reminder in reminders table + adds to daily schedule
- [x] calendar action type → writes to dailyEntries timeSlots with explicit date
- [x] budget action type → appends to monthlyPlans financialTargets or livingExpenses
- [x] social_post action type → appends to weeklyPlans socialPosts for the given day
- [x] gratitude action type → appends to dailyEntries gratitude array
- [x] Save All button on Zion chat — saves every action card in one click
- [x] Navigation link on each saved card → deep-links to the correct planner section
- [x] Update Zion system prompt to include all 13 action types with examples
- [x] navPath returned from all saveParsedItem action types for deep linking

## Zion Nightly Reflection Ritual
- [x] night_reflections DB table (id, userId, date, category1/2/3 label + desire, negativeThought, reframe, createdAt)
- [x] tRPC procedures: zion.saveNightReflection, zion.getNightReflection, zion.checkNightlyPrompt, zion.generateReframe
- [x] NightReflectionModal component — 5-step guided ritual with category picker, desire input, negative thought reframe
- [x] Nightly prompt badge on Zion AI nav item (pulsing violet Moon badge when reflection is due)
- [x] "Tonight's Reflection" shortcut appears in sidebar when due
- [x] Saved desires auto-saved to daily gratitude entries in the planner
- [x] Zion generates personalised goodnight message on completion
- [x] generateReframe procedure: AI reframes negative thought into positive affirmation

## Daily Bible Verse & Affirmation Pop-up
- [x] daily_devotions DB table (id, userId, date, verse, verseRef, affirmation, theme, dismissed, savedToPlanner, createdAt)
- [x] tRPC: devotion.getToday (generates or fetches today's verse+affirmation via AI), devotion.dismiss, devotion.saveToPlanner
- [x] 52 curated Bible verses with BDB-aligned themes (Strength, Purpose, Peace, Joy, Identity, etc.)
- [x] DailyDevotionModal — beautiful pop-up with dynamic gradient per theme, verse, Zion affirmation, share/save/begin buttons
- [x] Auto-triggers once per day on first planner visit (localStorage gate, 1.2s delay)
- [x] Saved devotions appear in Notes under "Daily Devotions" folder
- [x] Share button copies verse + affirmation to clipboard for social sharing
