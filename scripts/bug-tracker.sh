#!/bin/bash
# ============================================================================
# BDB Digital Planner — Bug Detection & Tracking Script
# Run: bash scripts/bug-tracker.sh
#
# This script scans the codebase for common bugs, anti-patterns, missing
# error handling, and known issues. It also maintains a bug log.
# ============================================================================

PROJECT_ROOT="$(dirname "$0")/.."
BUG_LOG="$PROJECT_ROOT/scripts/BUG_LOG.md"
FOUND=0
CRITICAL=0
MEDIUM=0
LOW=0

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

bug_critical() { FOUND=$((FOUND+1)); CRITICAL=$((CRITICAL+1)); echo -e "  ${RED}[CRITICAL]${NC} $1"; BUGS+=("CRITICAL|$1|$2"); }
bug_medium()   { FOUND=$((FOUND+1)); MEDIUM=$((MEDIUM+1));   echo -e "  ${YELLOW}[MEDIUM]${NC}   $1"; BUGS+=("MEDIUM|$1|$2"); }
bug_low()      { FOUND=$((FOUND+1)); LOW=$((LOW+1));         echo -e "  ${CYAN}[LOW]${NC}      $1"; BUGS+=("LOW|$1|$2"); }
clean()        { echo -e "  ${GREEN}[CLEAN]${NC}    $1"; }
section()      { echo -e "\n${BOLD}── $1 ──${NC}"; }

declare -a BUGS=()

echo -e "${BOLD}"
echo "============================================================"
echo "  BDB Digital Planner — Bug Detection Scanner"
echo "  Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo -e "${NC}"

# ═══════════════════════════════════════════════════════════════
# CATEGORY 1: API & SERVER BUGS
# ═══════════════════════════════════════════════════════════════
section "1. API & Server Issues"

# Check for unhandled promise rejections
UNHANDLED=$(grep -rn "\.mutateAsync\|\.mutate(" "$PROJECT_ROOT/client/src" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "try\|catch\|await" | grep -v "node_modules" | head -5)
if [ -n "$UNHANDLED" ]; then
  bug_medium "Potential unhandled mutation errors (no try/catch around mutateAsync)" "client/src"
else
  clean "Mutations appear to have error handling"
fi

# Check for console.log left in production code
CONSOLE_LOGS=$(grep -rn "console\.log\|console\.debug" "$PROJECT_ROOT/server" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v "test" | wc -l | tr -d ' ')
if [ "$CONSOLE_LOGS" -gt 5 ]; then
  bug_low "$CONSOLE_LOGS console.log statements in server code — clean up for production" "server/"
else
  clean "Server code has minimal console.log usage ($CONSOLE_LOGS)"
fi

# Check for empty catch blocks
EMPTY_CATCH=$(grep -rn "catch.*{.*}" "$PROJECT_ROOT/server" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v "test" | head -5)
EMPTY_CATCH_CLIENT=$(grep -rn "catch\s*{" "$PROJECT_ROOT/client/src" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules" | head -5)
CATCH_COUNT=0
[ -n "$EMPTY_CATCH" ] && CATCH_COUNT=$((CATCH_COUNT + $(echo "$EMPTY_CATCH" | wc -l | tr -d ' ')))
[ -n "$EMPTY_CATCH_CLIENT" ] && CATCH_COUNT=$((CATCH_COUNT + $(echo "$EMPTY_CATCH_CLIENT" | wc -l | tr -d ' ')))
if [ "$CATCH_COUNT" -gt 0 ]; then
  bug_low "$CATCH_COUNT empty catch blocks — errors may be silently swallowed" "server/ & client/"
else
  clean "No empty catch blocks found"
fi

# Check for missing DB null checks
DB_NO_CHECK=$(grep -rn "getDb()" "$PROJECT_ROOT/server/routers.ts" 2>/dev/null | wc -l | tr -d ' ')
DB_WITH_CHECK=$(grep -rn "if (!db)" "$PROJECT_ROOT/server/routers.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$DB_NO_CHECK" -gt "$DB_WITH_CHECK" ]; then
  bug_medium "$((DB_NO_CHECK - DB_WITH_CHECK)) getDb() calls may be missing null checks" "server/routers.ts"
else
  clean "All getDb() calls have null checks"
fi

# ═══════════════════════════════════════════════════════════════
# CATEGORY 2: AUTHENTICATION & SECURITY BUGS
# ═══════════════════════════════════════════════════════════════
section "2. Authentication & Security"

# Check for SQL injection risks (raw queries)
RAW_SQL=$(grep -rn "db\.execute\|\.raw\|sql\`" "$PROJECT_ROOT/server" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v "drizzle/0" | head -5)
if [ -n "$RAW_SQL" ]; then
  bug_critical "Raw SQL queries found — potential SQL injection risk" "server/"
else
  clean "No raw SQL queries — using Drizzle ORM parameterized queries"
fi

# Check for missing auth on sensitive routes
PUBLIC_MUTATIONS=$(grep -rn "publicProcedure\.mutation" "$PROJECT_ROOT/server/routers.ts" 2>/dev/null | grep -v "logout" | head -5)
if [ -n "$PUBLIC_MUTATIONS" ]; then
  bug_critical "Public (unauthenticated) mutations found — should these be protected?" "server/routers.ts"
else
  clean "All mutations use protectedProcedure"
fi

# Check for XSS — dangerouslySetInnerHTML
XSS=$(grep -rn "dangerouslySetInnerHTML" "$PROJECT_ROOT/client/src" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | head -5)
if [ -n "$XSS" ]; then
  bug_critical "dangerouslySetInnerHTML used — potential XSS vulnerability" "client/src"
else
  clean "No dangerouslySetInnerHTML usage found"
fi

# Check CORS configuration
CORS=$(grep -rn "cors\|Access-Control" "$PROJECT_ROOT/server" --include="*.ts" 2>/dev/null | grep -v "node_modules" | head -3)
if [ -z "$CORS" ]; then
  bug_low "No explicit CORS configuration — may cause issues with separate frontend domain" "server/_core"
else
  clean "CORS configuration found"
fi

# Check for exposed stack traces
STACK_TRACE=$(grep -rn "stack\|stackTrace\|err\.message" "$PROJECT_ROOT/server" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v "test" | grep "res\.\|response\." | head -3)
if [ -n "$STACK_TRACE" ]; then
  bug_medium "Server may expose error stack traces to client" "server/"
else
  clean "No obvious stack trace exposure"
fi

# ═══════════════════════════════════════════════════════════════
# CATEGORY 3: AI / ZION BUGS
# ═══════════════════════════════════════════════════════════════
section "3. AI / Zion Integration"

LLM_FILE="$PROJECT_ROOT/server/_core/llm.ts"

# Check LLM is pointing to Anthropic
if [ -f "$LLM_FILE" ]; then
  if grep -q "openai\.com\|gemini" "$LLM_FILE"; then
    bug_critical "LLM still references OpenAI/Gemini — should use Anthropic API" "$LLM_FILE"
  else
    clean "LLM correctly configured for Anthropic API"
  fi

  # Check for error handling on API calls
  if grep -q "response\.ok\|response\.status" "$LLM_FILE"; then
    clean "LLM has HTTP error handling"
  else
    bug_medium "LLM may not handle HTTP errors from Anthropic API" "$LLM_FILE"
  fi

  # Check for timeout
  if grep -q "timeout\|AbortController\|signal" "$LLM_FILE"; then
    clean "LLM has request timeout configured"
  else
    bug_medium "LLM requests have no timeout — could hang indefinitely" "$LLM_FILE"
  fi
fi

# Check Zion planner actions parsing
if grep -q "JSON\.parse(actionsMatch" "$PROJECT_ROOT/server/routers.ts" 2>/dev/null; then
  # Check if JSON.parse is in a try/catch
  PARSE_SAFE=$(grep -A2 "JSON\.parse(actionsMatch" "$PROJECT_ROOT/server/routers.ts" 2>/dev/null | grep -c "catch")
  if [ "$PARSE_SAFE" -gt 0 ]; then
    clean "PLANNER_ACTIONS JSON parsing has error handling"
  else
    bug_medium "PLANNER_ACTIONS JSON.parse may throw on malformed AI output" "server/routers.ts"
  fi
fi

# Check devotion verse count
VERSE_COUNT=$(grep -c "ref:.*NKJV" "$PROJECT_ROOT/server/routers.ts" 2>/dev/null || echo "0")
if [ "$VERSE_COUNT" -ge 52 ]; then
  clean "VERSE_POOL has $VERSE_COUNT verses (full year coverage)"
elif [ "$VERSE_COUNT" -gt 0 ]; then
  bug_low "VERSE_POOL only has $VERSE_COUNT verses — need 52 for full year" "server/routers.ts"
else
  bug_medium "No NKJV verses found in VERSE_POOL" "server/routers.ts"
fi

# ═══════════════════════════════════════════════════════════════
# CATEGORY 4: CLIENT-SIDE BUGS
# ═══════════════════════════════════════════════════════════════
section "4. Client-Side Issues"

# Check for missing key props in lists
MISSING_KEYS=$(grep -rn "\.map(" "$PROJECT_ROOT/client/src" --include="*.tsx" 2>/dev/null | grep -v "key=" | grep -v "node_modules" | grep "<" | head -5)
MISSING_KEY_COUNT=$(echo "$MISSING_KEYS" | grep -c "." 2>/dev/null || echo "0")
if [ "$MISSING_KEY_COUNT" -gt 3 ]; then
  bug_low "Potential missing key props in $MISSING_KEY_COUNT .map() renders" "client/src"
else
  clean "List rendering appears to have key props"
fi

# Check for broken imports
IMPORT_ERRORS=$(grep -rn "from ['\"]@/" "$PROJECT_ROOT/client/src" --include="*.tsx" --include="*.ts" 2>/dev/null | \
  sed "s/.*from ['\"]@\///" | sed "s/['\"].*//" | sort -u | while read imp; do
    # Check if the file exists (with .ts, .tsx, or /index.ts extension)
    base="$PROJECT_ROOT/client/src/$imp"
    if [ ! -f "$base" ] && [ ! -f "$base.ts" ] && [ ! -f "$base.tsx" ] && [ ! -f "$base/index.ts" ] && [ ! -f "$base/index.tsx" ]; then
      echo "$imp"
    fi
  done)
if [ -n "$IMPORT_ERRORS" ]; then
  IMP_COUNT=$(echo "$IMPORT_ERRORS" | wc -l | tr -d ' ')
  bug_medium "$IMP_COUNT potentially broken imports" "client/src"
else
  clean "All @/ imports appear valid"
fi

# Check for TODO/FIXME/HACK comments
TODO_COUNT=$(grep -rn "TODO\|FIXME\|HACK\|XXX\|TEMP" "$PROJECT_ROOT/server" "$PROJECT_ROOT/client/src" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
if [ "$TODO_COUNT" -gt 0 ]; then
  bug_low "$TODO_COUNT TODO/FIXME/HACK comments found — review before production" "codebase"
else
  clean "No TODO/FIXME comments found"
fi

# Check for hardcoded localhost references
LOCALHOST=$(grep -rn "localhost\|127\.0\.0\.1" "$PROJECT_ROOT/client/src" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v "// " | head -5)
if [ -n "$LOCALHOST" ]; then
  bug_medium "Hardcoded localhost references in client code — will break in production" "client/src"
else
  clean "No hardcoded localhost in client code"
fi

# ═══════════════════════════════════════════════════════════════
# CATEGORY 5: DATA INTEGRITY
# ═══════════════════════════════════════════════════════════════
section "5. Data Integrity"

# Check for missing userId filters (security: data leakage)
# Check for queries missing userId by examining the query + the next 2 lines together
QUERIES_WITHOUT_USER=$(grep -rn -A2 "db\.select()\.from\|db\.update\|db\.delete" "$PROJECT_ROOT/server" --include="*.ts" 2>/dev/null | grep -v "node_modules\|test\|schema\|migration" | \
  awk 'BEGIN{RS="--"} !/userId|user\.id|openId|email|users\./' | grep "db\." | head -5)
if [ -n "$QUERIES_WITHOUT_USER" ]; then
  QC=$(echo "$QUERIES_WITHOUT_USER" | wc -l | tr -d ' ')
  bug_critical "$QC database queries may be missing userId filter — potential data leakage" "server/"
else
  clean "Database queries appear to filter by userId"
fi

# Check for race conditions in upserts
UPSERT_RACE=$(grep -rn "const existing.*=.*select\|const rows.*=.*select" "$PROJECT_ROOT/server/routers.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$UPSERT_RACE" -gt 10 ]; then
  bug_low "Check-then-insert pattern used $UPSERT_RACE times — potential race conditions under load" "server/routers.ts"
else
  clean "Upsert patterns look reasonable"
fi

# ═══════════════════════════════════════════════════════════════
# CATEGORY 6: PERFORMANCE
# ═══════════════════════════════════════════════════════════════
section "6. Performance"

# Check for N+1 queries
N_PLUS_1=$(grep -rn "for.*await.*db\.\|\.forEach.*await.*db\." "$PROJECT_ROOT/server" --include="*.ts" 2>/dev/null | grep -v "node_modules" | head -5)
if [ -n "$N_PLUS_1" ]; then
  NPC=$(echo "$N_PLUS_1" | wc -l | tr -d ' ')
  bug_medium "$NPC potential N+1 query patterns (db calls inside loops)" "server/"
else
  clean "No obvious N+1 query patterns"
fi

# Check bundle size concerns
LARGE_IMPORTS=$(grep -rn "import.*from ['\"]recharts['\"]$\|import.*from ['\"]framer-motion['\"]$" "$PROJECT_ROOT/client/src" --include="*.tsx" --include="*.ts" 2>/dev/null | head -5)
if [ -n "$LARGE_IMPORTS" ]; then
  bug_low "Large library imports (recharts/framer-motion) — consider dynamic imports for code splitting" "client/src"
else
  clean "Large libraries appear to be properly imported"
fi

# Check for missing pagination
if grep -q "\.limit(" "$PROJECT_ROOT/server/routers.ts" 2>/dev/null; then
  clean "Database queries use .limit() for pagination"
else
  bug_medium "No .limit() found on queries — may return unbounded results" "server/routers.ts"
fi

# ═══════════════════════════════════════════════════════════════
# CATEGORY 7: MOBILE & RESPONSIVE
# ═══════════════════════════════════════════════════════════════
section "7. Mobile & Responsive"

# Check for viewport meta
INDEX_HTML="$PROJECT_ROOT/client/index.html"
if [ -f "$INDEX_HTML" ]; then
  if grep -q "viewport" "$INDEX_HTML"; then
    clean "Viewport meta tag present"
  else
    bug_medium "Missing viewport meta tag — mobile rendering will break" "$INDEX_HTML"
  fi
fi

# Check for touch target sizes
SMALL_BUTTONS=$(grep -rn "size=\"sm\"\|size=\"xs\"\|p-1 \|p-0\.5\|w-4 h-4.*click\|w-5 h-5.*click" "$PROJECT_ROOT/client/src/components" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
if [ "$SMALL_BUTTONS" -gt 10 ]; then
  bug_low "$SMALL_BUTTONS small interactive elements found — verify 44px minimum touch targets on mobile" "client/src/components"
else
  clean "Interactive element sizes look reasonable"
fi

# ═══════════════════════════════════════════════════════════════
# GENERATE BUG LOG
# ═══════════════════════════════════════════════════════════════

echo -e "\n${BOLD}============================================================"
echo "  BUG SCAN RESULTS"
echo "============================================================${NC}"
echo -e "  ${RED}CRITICAL: $CRITICAL${NC}"
echo -e "  ${YELLOW}MEDIUM:   $MEDIUM${NC}"
echo -e "  ${CYAN}LOW:      $LOW${NC}"
echo -e "  Total:    $FOUND"
echo ""

if [ "$CRITICAL" -gt 0 ]; then
  echo -e "  ${RED}${BOLD}BLOCKERS FOUND — Fix critical issues before launch${NC}"
elif [ "$MEDIUM" -gt 0 ]; then
  echo -e "  ${YELLOW}${BOLD}REVIEW NEEDED — Medium issues should be addressed${NC}"
else
  echo -e "  ${GREEN}${BOLD}LOOKING GOOD — Only minor issues found${NC}"
fi

# Write bug log markdown file
{
  echo "# BDB Digital Planner — Bug Log"
  echo ""
  echo "**Generated:** $(date '+%Y-%m-%d %H:%M:%S')"
  echo "**Critical:** $CRITICAL | **Medium:** $MEDIUM | **Low:** $LOW | **Total:** $FOUND"
  echo ""
  echo "---"
  echo ""

  if [ "$CRITICAL" -gt 0 ]; then
    echo "## Critical Bugs (Must Fix Before Launch)"
    echo ""
    for bug in "${BUGS[@]}"; do
      SEVERITY=$(echo "$bug" | cut -d'|' -f1)
      DESC=$(echo "$bug" | cut -d'|' -f2)
      LOC=$(echo "$bug" | cut -d'|' -f3)
      if [ "$SEVERITY" = "CRITICAL" ]; then
        echo "- [ ] **$DESC**"
        echo "  - Location: \`$LOC\`"
        echo "  - Status: Open"
        echo ""
      fi
    done
  fi

  if [ "$MEDIUM" -gt 0 ]; then
    echo "## Medium Bugs (Should Fix)"
    echo ""
    for bug in "${BUGS[@]}"; do
      SEVERITY=$(echo "$bug" | cut -d'|' -f1)
      DESC=$(echo "$bug" | cut -d'|' -f2)
      LOC=$(echo "$bug" | cut -d'|' -f3)
      if [ "$SEVERITY" = "MEDIUM" ]; then
        echo "- [ ] **$DESC**"
        echo "  - Location: \`$LOC\`"
        echo "  - Status: Open"
        echo ""
      fi
    done
  fi

  if [ "$LOW" -gt 0 ]; then
    echo "## Low Priority (Nice to Fix)"
    echo ""
    for bug in "${BUGS[@]}"; do
      SEVERITY=$(echo "$bug" | cut -d'|' -f1)
      DESC=$(echo "$bug" | cut -d'|' -f2)
      LOC=$(echo "$bug" | cut -d'|' -f3)
      if [ "$SEVERITY" = "LOW" ]; then
        echo "- [ ] **$DESC**"
        echo "  - Location: \`$LOC\`"
        echo "  - Status: Open"
        echo ""
      fi
    done
  fi

  echo "---"
  echo ""
  echo "## Manual Testing Checklist"
  echo ""
  echo "### Authentication"
  echo "- [ ] Register new account with email + password"
  echo "- [ ] Login with existing account"
  echo "- [ ] Logout clears session"
  echo "- [ ] Protected pages redirect to login when unauthenticated"
  echo "- [ ] Session persists across browser refresh"
  echo ""
  echo "### Annual Planning"
  echo "- [ ] All 8 life categories save correctly"
  echo "- [ ] Basic needs & non-negotiables grid works"
  echo "- [ ] Annual budget saves all 6 categories"
  echo "- [ ] Venn diagram fields save"
  echo "- [ ] Vision board image upload works"
  echo "- [ ] Mission statement & elevator pitch save"
  echo "- [ ] Personal contract (Be/Do/Become) saves"
  echo "- [ ] 5 contract goals save"
  echo "- [ ] Transformation timeline (12 months) saves"
  echo "- [ ] All 6 big goals with 5 steps each save"
  echo ""
  echo "### Monthly Planning"
  echo "- [ ] Theme word saves"
  echo "- [ ] Budget tracker (6 categories) saves"
  echo "- [ ] Business and wellness goals save"
  echo "- [ ] Content map saves (platforms, objectives, campaigns, pillars)"
  echo "- [ ] Social follower tracking saves"
  echo "- [ ] Navigate between months correctly"
  echo ""
  echo "### Weekly Planning"
  echo "- [ ] Word of week, affirmation, Bible verse save"
  echo "- [ ] Business goals and intentions save"
  echo "- [ ] Money earned/spent saves"
  echo "- [ ] Wins of the week saves"
  echo "- [ ] Habit tracker toggles work (all 7 days)"
  echo "- [ ] Custom habits can be added"
  echo "- [ ] Social media posts save per day/platform"
  echo "- [ ] Navigate between weeks correctly"
  echo ""
  echo "### Daily View"
  echo "- [ ] Top priorities save"
  echo "- [ ] All 26 time slots (6am-7pm) save"
  echo "- [ ] Gratitude entries (5) save"
  echo "- [ ] Water intake tracker works (0-8 glasses)"
  echo "- [ ] Navigate between days correctly"
  echo ""
  echo "### Notes"
  echo "- [ ] Create new note"
  echo "- [ ] Edit note content (auto-saves)"
  echo "- [ ] Delete note"
  echo "- [ ] Create/switch folders"
  echo "- [ ] Pin/unpin notes"
  echo "- [ ] Lock note with password"
  echo "- [ ] Unlock note with correct password"
  echo "- [ ] Search notes"
  echo "- [ ] Upload attachment to note"
  echo ""
  echo "### Zion AI Chat"
  echo "- [ ] Send message and receive response"
  echo "- [ ] Brain dump extracts planner actions"
  echo "- [ ] Planner actions save to correct sections"
  echo "- [ ] Chat history loads on page visit"
  echo "- [ ] Clear history works"
  echo "- [ ] Voice input works (if microphone available)"
  echo ""
  echo "### Daily Devotion Modal"
  echo "- [ ] Modal auto-shows on first login of the day"
  echo "- [ ] Displays NKJV Bible verse with reference"
  echo "- [ ] Shows AI-generated affirmation"
  echo "- [ ] Theme badge and gradient display correctly"
  echo "- [ ] 'Save to Notes' saves to Daily Devotions folder"
  echo "- [ ] 'Share' copies verse + affirmation to clipboard"
  echo "- [ ] 'Begin My Day' dismisses modal"
  echo "- [ ] Modal doesn't show again after dismissal (same day)"
  echo ""
  echo "### Night Reflection Modal"
  echo "- [ ] 3 desire fields with category dropdowns work"
  echo "- [ ] Negative thought reframe generates AI response"
  echo "- [ ] Goodnight message generates after submission"
  echo "- [ ] Reflection saves to database"
  echo ""
  echo "### AI Digests"
  echo "- [ ] Daily digest generates with correct sections"
  echo "- [ ] Weekly digest generates with correct sections"
  echo ""
  echo "### Integrations"
  echo "- [ ] Google Calendar settings save"
  echo "- [ ] Notion settings save"
  echo "- [ ] Slack webhook settings save"
  echo ""
  echo "### Mobile / Responsive"
  echo "- [ ] Landing page renders correctly on mobile"
  echo "- [ ] Sidebar collapses on mobile"
  echo "- [ ] All planner pages are scrollable on mobile"
  echo "- [ ] Touch targets are at least 44x44px"
  echo "- [ ] No horizontal overflow on any page"
  echo "- [ ] Inputs don't zoom on iOS (16px font-size)"
  echo ""
  echo "### Cross-Browser"
  echo "- [ ] Chrome (latest)"
  echo "- [ ] Safari (latest)"
  echo "- [ ] Firefox (latest)"
  echo "- [ ] Mobile Safari (iOS)"
  echo "- [ ] Chrome Mobile (Android)"
  echo ""

} > "$BUG_LOG"

echo -e "\n  Bug log saved to: ${BOLD}scripts/BUG_LOG.md${NC}"
echo "============================================================"
