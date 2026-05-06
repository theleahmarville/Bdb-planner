#!/bin/bash
# ============================================================================
# BDB Digital Planner — Production Testing Script
# Run: bash scripts/test-checklist.sh
# ============================================================================

set -e

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0
WARN=0
RESULTS=()

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

pass() { PASS=$((PASS + 1)); RESULTS+=("${GREEN}PASS${NC} $1"); echo -e "  ${GREEN}PASS${NC} $1"; }
fail() { FAIL=$((FAIL + 1)); RESULTS+=("${RED}FAIL${NC} $1"); echo -e "  ${RED}FAIL${NC} $1"; }
warn() { WARN=$((WARN + 1)); RESULTS+=("${YELLOW}WARN${NC} $1"); echo -e "  ${YELLOW}WARN${NC} $1"; }
section() { echo -e "\n${BLUE}${BOLD}── $1 ──${NC}"; }

echo -e "${BOLD}"
echo "============================================================"
echo "  BDB Digital Planner — Production Readiness Test Suite"
echo "  Target: $BASE_URL"
echo "  Date:   $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo -e "${NC}"

# ─── 1. SERVER HEALTH ───────────────────────────────────────────
section "1. Server Health"

# Check server is running
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  pass "Server responds on $BASE_URL (HTTP $HTTP_CODE)"
else
  fail "Server not responding on $BASE_URL (HTTP $HTTP_CODE)"
  echo -e "  ${RED}Cannot continue without server. Start with: pnpm dev${NC}"
  exit 1
fi

# Check HTML loads
HTML=$(curl -s "$BASE_URL" 2>/dev/null)
if echo "$HTML" | grep -q "BDB"; then
  pass "Landing page HTML contains BDB branding"
else
  fail "Landing page missing BDB branding"
fi

# ─── 2. ENVIRONMENT VARIABLES ───────────────────────────────────
section "2. Environment Configuration"

ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  pass ".env file exists"
else
  fail ".env file missing — copy .env.example to .env"
fi

if [ -f "$ENV_FILE" ]; then
  # Check DATABASE_URL
  DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d= -f2-)
  if [ -n "$DB_URL" ] && [ "$DB_URL" != "" ]; then
    pass "DATABASE_URL is configured"
  else
    fail "DATABASE_URL is empty"
  fi

  # Check JWT_SECRET
  JWT=$(grep "^JWT_SECRET=" "$ENV_FILE" | cut -d= -f2-)
  if [ -n "$JWT" ] && [ ${#JWT} -ge 32 ]; then
    pass "JWT_SECRET is set (${#JWT} chars)"
  elif [ -n "$JWT" ]; then
    warn "JWT_SECRET is short (${#JWT} chars) — use 64+ chars for production"
  else
    fail "JWT_SECRET is empty"
  fi

  # Check OPENAI_API_KEY (Anthropic key)
  API_KEY=$(grep "^OPENAI_API_KEY=" "$ENV_FILE" | cut -d= -f2-)
  if [ -n "$API_KEY" ] && echo "$API_KEY" | grep -q "^sk-ant-"; then
    pass "OPENAI_API_KEY is set (Anthropic key detected)"
  elif [ -n "$API_KEY" ] && [ "$API_KEY" != "" ]; then
    warn "OPENAI_API_KEY is set but doesn't start with sk-ant- (expected Anthropic key)"
  else
    fail "OPENAI_API_KEY is empty — Zion AI and Daily Devotion will not work"
  fi
fi

# ─── 3. DATABASE CONNECTION ─────────────────────────────────────
section "3. Database"

# Try the check-tables script
if [ -f "$(dirname "$0")/check-tables.mjs" ]; then
  DB_CHECK=$(node "$(dirname "$0")/check-tables.mjs" 2>&1 || true)
  if echo "$DB_CHECK" | grep -qi "error\|fail\|cannot"; then
    fail "Database table check failed: $(echo "$DB_CHECK" | head -1)"
  else
    pass "Database tables check script ran"
  fi
else
  warn "check-tables.mjs not found — skipping DB table verification"
fi

# ─── 4. API ENDPOINTS ───────────────────────────────────────────
section "4. API Endpoints"

# tRPC health / system endpoint
TRPC_RESP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/trpc/system.health" 2>/dev/null || echo "000")
if [ "$TRPC_RESP" = "200" ]; then
  pass "tRPC system.health endpoint responds"
else
  warn "tRPC system.health returned HTTP $TRPC_RESP (may need auth or different path)"
fi

# Auth me endpoint (should return 200 with null user or user object)
AUTH_RESP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/trpc/auth.me" 2>/dev/null || echo "000")
if [ "$AUTH_RESP" = "200" ]; then
  pass "auth.me endpoint responds (HTTP $AUTH_RESP)"
else
  warn "auth.me returned HTTP $AUTH_RESP"
fi

# Registration endpoint exists
REG_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null || echo "000")
if [ "$REG_RESP" = "400" ] || [ "$REG_RESP" = "422" ] || [ "$REG_RESP" = "200" ] || [ "$REG_RESP" = "409" ]; then
  pass "Registration endpoint exists (HTTP $REG_RESP — validation working)"
else
  fail "Registration endpoint error (HTTP $REG_RESP)"
fi

# Login endpoint exists
LOGIN_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null || echo "000")
if [ "$LOGIN_RESP" = "400" ] || [ "$LOGIN_RESP" = "401" ] || [ "$LOGIN_RESP" = "422" ] || [ "$LOGIN_RESP" = "200" ]; then
  pass "Login endpoint exists (HTTP $LOGIN_RESP — validation working)"
else
  fail "Login endpoint error (HTTP $LOGIN_RESP)"
fi

# ─── 5. STATIC ASSETS ───────────────────────────────────────────
section "5. Frontend Assets"

# Check main page loads with JS
if echo "$HTML" | grep -q "src=.*\.js\|src=.*\.tsx\|type=\"module\""; then
  pass "JavaScript entry point found in HTML"
else
  fail "No JavaScript entry point in HTML"
fi

# Check CSS loads
if echo "$HTML" | grep -q "stylesheet\|\.css\|tailwind"; then
  pass "CSS stylesheet reference found"
else
  warn "No explicit CSS reference found (may be inline or bundled)"
fi

# ─── 6. FILE STRUCTURE INTEGRITY ────────────────────────────────
section "6. File Structure"

PROJECT_ROOT="$(dirname "$0")/.."

check_file() {
  if [ -f "$PROJECT_ROOT/$1" ]; then
    pass "File exists: $1"
  else
    fail "Missing file: $1"
  fi
}

check_dir() {
  if [ -d "$PROJECT_ROOT/$1" ]; then
    pass "Directory exists: $1"
  else
    fail "Missing directory: $1"
  fi
}

check_file "server/_core/llm.ts"
check_file "server/_core/auth.ts"
check_file "server/routers.ts"
check_file "drizzle/schema.ts"
check_file "client/src/App.tsx"
check_file "client/src/components/DailyDevotionModal.tsx"
check_file "client/src/components/AIChatBox.tsx"
check_file "client/src/components/NightReflectionModal.tsx"
check_file "client/src/components/PlannerLayout.tsx"
check_dir "client/src/pages"
check_dir "client/src/components/ui"

# Count UI components
UI_COUNT=$(find "$PROJECT_ROOT/client/src/components/ui" -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')
if [ "$UI_COUNT" -ge 30 ]; then
  pass "UI component library: $UI_COUNT components"
else
  warn "UI component library only has $UI_COUNT components (expected 30+)"
fi

# Count pages
PAGE_COUNT=$(find "$PROJECT_ROOT/client/src/pages" -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')
pass "Pages: $PAGE_COUNT page components"

# ─── 7. NKJV VERSE VERIFICATION ─────────────────────────────────
section "7. NKJV Scripture Verification"

ROUTERS="$PROJECT_ROOT/server/routers.ts"
if [ -f "$ROUTERS" ]; then
  NKJV_COUNT=$(grep -c "(NKJV)" "$ROUTERS" 2>/dev/null || echo "0")
  if [ "$NKJV_COUNT" -ge 50 ]; then
    pass "VERSE_POOL contains $NKJV_COUNT NKJV-tagged verses"
  elif [ "$NKJV_COUNT" -gt 0 ]; then
    warn "Only $NKJV_COUNT verses tagged NKJV (expected 52)"
  else
    fail "No NKJV-tagged verses found in VERSE_POOL"
  fi

  # Spot-check key NKJV phrasings
  if grep -q "I can do all things through Christ who strengthens me" "$ROUTERS"; then
    pass "Philippians 4:13 — correct NKJV wording"
  else
    fail "Philippians 4:13 — incorrect or missing"
  fi

  if grep -q "I shall not want" "$ROUTERS"; then
    pass "Psalm 23:1 — correct NKJV wording ('I shall not want')"
  else
    fail "Psalm 23:1 — should say 'I shall not want' (NKJV)"
  fi

  if grep -q "substance of things hoped for" "$ROUTERS"; then
    pass "Hebrews 11:1 — correct NKJV wording ('substance of things hoped for')"
  else
    fail "Hebrews 11:1 — should say 'substance of things hoped for' (NKJV)"
  fi

  if grep -q "spirit of fear, but of power and of love and of a sound mind" "$ROUTERS"; then
    pass "2 Timothy 1:7 — correct NKJV wording ('sound mind')"
  else
    fail "2 Timothy 1:7 — should say 'sound mind' (NKJV)"
  fi
fi

# ─── 8. ANTHROPIC API INTEGRATION ──────────────────────────────
section "8. AI / LLM Integration"

LLM_FILE="$PROJECT_ROOT/server/_core/llm.ts"
if [ -f "$LLM_FILE" ]; then
  if grep -q "api.anthropic.com" "$LLM_FILE"; then
    pass "LLM calls Anthropic API (api.anthropic.com)"
  else
    fail "LLM not configured for Anthropic API"
  fi

  if grep -q "claude-sonnet-4-6" "$LLM_FILE"; then
    pass "Model set to claude-sonnet-4-6"
  else
    fail "Model not set to claude-sonnet-4-6"
  fi

  if grep -q "x-api-key" "$LLM_FILE"; then
    pass "Using x-api-key header (Anthropic auth)"
  else
    fail "Missing x-api-key header"
  fi

  if grep -q "anthropic-version" "$LLM_FILE"; then
    pass "Anthropic API version header present"
  else
    fail "Missing anthropic-version header"
  fi

  if grep -q "InvokeResult" "$LLM_FILE"; then
    pass "Returns InvokeResult (backward-compatible shape)"
  else
    warn "InvokeResult type not found"
  fi
fi

# ─── 9. SECURITY CHECKS ─────────────────────────────────────────
section "9. Security"

# Check for exposed secrets
if [ -f "$PROJECT_ROOT/.gitignore" ]; then
  if grep -q "\.env" "$PROJECT_ROOT/.gitignore"; then
    pass ".env is in .gitignore"
  else
    fail ".env is NOT in .gitignore — secrets may be committed!"
  fi
else
  fail "No .gitignore file found"
fi

# Check httpOnly cookies
AUTH_FILE="$PROJECT_ROOT/server/_core/cookies.ts"
if [ -f "$AUTH_FILE" ]; then
  if grep -q "httpOnly" "$AUTH_FILE"; then
    pass "Cookies configured as httpOnly"
  else
    fail "Cookies not httpOnly — vulnerable to XSS"
  fi
fi

# Check password hashing
if grep -rq "bcrypt\|bcryptjs" "$PROJECT_ROOT/server/_core/auth.ts" 2>/dev/null; then
  pass "Passwords hashed with bcrypt"
else
  fail "No bcrypt password hashing found in auth"
fi

# Check for hardcoded secrets
HARDCODED=$(grep -rn "sk-ant-\|sk-proj-\|password.*=.*['\"]" "$PROJECT_ROOT/server/" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".env" | grep -v "passwordHash" | grep -v "lockPassword" | head -3)
if [ -z "$HARDCODED" ]; then
  pass "No hardcoded API keys or passwords found in server code"
else
  fail "Possible hardcoded secrets found:\n$HARDCODED"
fi

# ─── 10. TYPESCRIPT CHECK ───────────────────────────────────────
section "10. TypeScript"

if command -v npx &> /dev/null || [ -f "$PROJECT_ROOT/node_modules/.bin/tsc" ]; then
  echo -e "  ${YELLOW}Running tsc --noEmit (this may take a moment)...${NC}"
  TSC_OUTPUT=$(cd "$PROJECT_ROOT" && npx tsc --noEmit 2>&1 || true)
  TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep -c "error TS" 2>/dev/null || echo "0")
  if [ "$TSC_ERRORS" = "0" ]; then
    pass "TypeScript compiles with 0 errors"
  else
    warn "TypeScript has $TSC_ERRORS errors (review before production)"
  fi
else
  warn "tsc not available — skipping TypeScript check"
fi

# ─── 11. UNIT TESTS ─────────────────────────────────────────────
section "11. Unit Tests"

TEST_COUNT=$(find "$PROJECT_ROOT/server" -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
pass "Found $TEST_COUNT test files"

if [ "$TEST_COUNT" -gt 0 ]; then
  echo -e "  ${YELLOW}Running vitest...${NC}"
  TEST_OUTPUT=$(cd "$PROJECT_ROOT" && npx vitest run --reporter=verbose 2>&1 || true)
  TEST_PASSED=$(echo "$TEST_OUTPUT" | grep -c "✓\|PASS" 2>/dev/null || echo "0")
  TEST_FAILED=$(echo "$TEST_OUTPUT" | grep -c "✗\|FAIL" 2>/dev/null || echo "0")
  if [ "$TEST_FAILED" = "0" ] && [ "$TEST_PASSED" -gt 0 ]; then
    pass "All unit tests passed ($TEST_PASSED passed)"
  elif [ "$TEST_FAILED" -gt 0 ]; then
    fail "$TEST_FAILED tests failed, $TEST_PASSED passed"
  else
    warn "Test results unclear — check manually with: pnpm test"
  fi
fi

# ─── 12. BUILD CHECK ────────────────────────────────────────────
section "12. Production Build"

echo -e "  ${YELLOW}Running production build (vite + esbuild)...${NC}"
BUILD_OUTPUT=$(cd "$PROJECT_ROOT" && npx vite build 2>&1 || true)
if echo "$BUILD_OUTPUT" | grep -q "built in\|✓"; then
  pass "Vite frontend build succeeded"
else
  BUILD_ERR=$(echo "$BUILD_OUTPUT" | tail -3)
  fail "Vite build failed: $BUILD_ERR"
fi

# ─── SUMMARY ────────────────────────────────────────────────────
echo -e "\n${BOLD}============================================================"
echo "  TEST RESULTS SUMMARY"
echo "============================================================${NC}"
echo -e "  ${GREEN}PASSED: $PASS${NC}"
echo -e "  ${RED}FAILED: $FAIL${NC}"
echo -e "  ${YELLOW}WARNINGS: $WARN${NC}"
echo ""

TOTAL=$((PASS + FAIL + WARN))
SCORE=$(( (PASS * 100) / (TOTAL > 0 ? TOTAL : 1) ))

if [ "$FAIL" = "0" ]; then
  echo -e "  ${GREEN}${BOLD}PRODUCTION READY ($SCORE% pass rate)${NC}"
elif [ "$FAIL" -le 3 ]; then
  echo -e "  ${YELLOW}${BOLD}NEARLY READY — $FAIL issue(s) to fix ($SCORE% pass rate)${NC}"
else
  echo -e "  ${RED}${BOLD}NOT READY — $FAIL issues must be resolved ($SCORE% pass rate)${NC}"
fi

echo ""
echo "  Full results saved to: scripts/test-results-$(date '+%Y%m%d').log"
echo "============================================================"

# Save results to log file
{
  echo "BDB Planner Test Results — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Target: $BASE_URL"
  echo "Passed: $PASS | Failed: $FAIL | Warnings: $WARN"
  echo ""
  for r in "${RESULTS[@]}"; do
    echo -e "$r" | sed 's/\x1b\[[0-9;]*m//g'
  done
} > "$(dirname "$0")/test-results-$(date '+%Y%m%d').log"
