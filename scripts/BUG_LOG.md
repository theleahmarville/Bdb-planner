# BDB Digital Planner — Bug Log

**Generated:** 2026-04-03 08:54:50
**Critical:** 0 | **Medium:** 1 | **Low:** 4 | **Total:** 5

---

## Medium Bugs (Should Fix)

- [ ] **Potential unhandled mutation errors (no try/catch around mutateAsync)**
  - Location: `client/src`
  - Status: Open

## Low Priority (Nice to Fix)

- [ ] **7 empty catch blocks — errors may be silently swallowed**
  - Location: `server/ & client/`
  - Status: Open

- [ ] **No explicit CORS configuration — may cause issues with separate frontend domain**
  - Location: `server/_core`
  - Status: Open

- [ ] **2 TODO/FIXME/HACK comments found — review before production**
  - Location: `codebase`
  - Status: Open

- [ ] **54 small interactive elements found — verify 44px minimum touch targets on mobile**
  - Location: `client/src/components`
  - Status: Open

---

## Manual Testing Checklist

### Authentication
- [ ] Register new account with email + password
- [ ] Login with existing account
- [ ] Logout clears session
- [ ] Protected pages redirect to login when unauthenticated
- [ ] Session persists across browser refresh

### Annual Planning
- [ ] All 8 life categories save correctly
- [ ] Basic needs & non-negotiables grid works
- [ ] Annual budget saves all 6 categories
- [ ] Venn diagram fields save
- [ ] Vision board image upload works
- [ ] Mission statement & elevator pitch save
- [ ] Personal contract (Be/Do/Become) saves
- [ ] 5 contract goals save
- [ ] Transformation timeline (12 months) saves
- [ ] All 6 big goals with 5 steps each save

### Monthly Planning
- [ ] Theme word saves
- [ ] Budget tracker (6 categories) saves
- [ ] Business and wellness goals save
- [ ] Content map saves (platforms, objectives, campaigns, pillars)
- [ ] Social follower tracking saves
- [ ] Navigate between months correctly

### Weekly Planning
- [ ] Word of week, affirmation, Bible verse save
- [ ] Business goals and intentions save
- [ ] Money earned/spent saves
- [ ] Wins of the week saves
- [ ] Habit tracker toggles work (all 7 days)
- [ ] Custom habits can be added
- [ ] Social media posts save per day/platform
- [ ] Navigate between weeks correctly

### Daily View
- [ ] Top priorities save
- [ ] All 26 time slots (6am-7pm) save
- [ ] Gratitude entries (5) save
- [ ] Water intake tracker works (0-8 glasses)
- [ ] Navigate between days correctly

### Notes
- [ ] Create new note
- [ ] Edit note content (auto-saves)
- [ ] Delete note
- [ ] Create/switch folders
- [ ] Pin/unpin notes
- [ ] Lock note with password
- [ ] Unlock note with correct password
- [ ] Search notes
- [ ] Upload attachment to note

### Zion AI Chat
- [ ] Send message and receive response
- [ ] Brain dump extracts planner actions
- [ ] Planner actions save to correct sections
- [ ] Chat history loads on page visit
- [ ] Clear history works
- [ ] Voice input works (if microphone available)

### Daily Devotion Modal
- [ ] Modal auto-shows on first login of the day
- [ ] Displays NKJV Bible verse with reference
- [ ] Shows AI-generated affirmation
- [ ] Theme badge and gradient display correctly
- [ ] 'Save to Notes' saves to Daily Devotions folder
- [ ] 'Share' copies verse + affirmation to clipboard
- [ ] 'Begin My Day' dismisses modal
- [ ] Modal doesn't show again after dismissal (same day)

### Night Reflection Modal
- [ ] 3 desire fields with category dropdowns work
- [ ] Negative thought reframe generates AI response
- [ ] Goodnight message generates after submission
- [ ] Reflection saves to database

### AI Digests
- [ ] Daily digest generates with correct sections
- [ ] Weekly digest generates with correct sections

### Integrations
- [ ] Google Calendar settings save
- [ ] Notion settings save
- [ ] Slack webhook settings save

### Mobile / Responsive
- [ ] Landing page renders correctly on mobile
- [ ] Sidebar collapses on mobile
- [ ] All planner pages are scrollable on mobile
- [ ] Touch targets are at least 44x44px
- [ ] No horizontal overflow on any page
- [ ] Inputs don't zoom on iOS (16px font-size)

### Cross-Browser
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

