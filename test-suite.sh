#!/bin/bash

# AlphaSeek Comprehensive Test Suite
# Tests all features systematically

BASE_URL="http://localhost:5000/api"
PASSED=0
FAILED=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

section() {
    echo ""
    echo "============================================"
    echo "$1"
    echo "============================================"
}

# Start tests
echo "🧪 AlphaSeek Comprehensive Test Suite"
echo "Testing against: $BASE_URL"
echo ""

# SECTION 1: AUTHENTICATION
section "PHASE 1: Authentication & Authorization"

# Test 1.1: Valid login
info "Test 1.1: Login with valid credentials"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    pass "Valid login successful, token received"
else
    fail "Valid login failed"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

# Test 1.2: Invalid login
info "Test 1.2: Login with invalid credentials"
INVALID_LOGIN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrongpass"}')

if echo "$INVALID_LOGIN" | grep -q "error"; then
    pass "Invalid credentials properly rejected"
else
    fail "Invalid login should be rejected"
fi

# Test 1.3: Unauthenticated request
info "Test 1.3: Unauthenticated API request"
UNAUTH=$(curl -s $BASE_URL/ideas)

if echo "$UNAUTH" | grep -q "token"; then
    pass "Unauthenticated request properly rejected"
else
    fail "Should require authentication"
fi

# Test 1.4: Get current user
info "Test 1.4: Get current user info"
USER_INFO=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/auth/me)

if echo "$USER_INFO" | grep -q "admin"; then
    pass "Current user info retrieved"
else
    fail "Failed to get user info"
fi

# SECTION 2: STOCK IDEAS
section "PHASE 2: Stock Ideas CRUD Operations"

# Test 2.1: Get all ideas (empty initially)
info "Test 2.1: Get all stock ideas"
IDEAS=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/ideas)

if [ "$IDEAS" = "[]" ] || echo "$IDEAS" | grep -q "\["; then
    pass "Successfully retrieved ideas list"
else
    fail "Failed to get ideas"
    echo "Response: $IDEAS"
fi

# Test 2.2: Create a new idea
info "Test 2.2: Create new stock idea"
CREATE_IDEA=$(curl -s -X POST $BASE_URL/ideas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "NVDA",
    "companyName": "NVIDIA Corporation",
    "source": "Test Suite",
    "sourceType": "Other",
    "originalLink": "https://test.com",
    "entryDate": "2025-12-03",
    "entryPrice": 500.00,
    "currentPrice": 520.00,
    "conviction": "High",
    "summary": "AI chip leader with strong growth potential",
    "thesis": "NVIDIA dominates the AI/GPU market with 80%+ market share",
    "tags": ["AI", "Semiconductors", "Growth"]
  }')

if echo "$CREATE_IDEA" | grep -q "NVDA"; then
    IDEA_ID=$(echo "$CREATE_IDEA" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    pass "Stock idea created successfully (ID: $IDEA_ID)"
else
    fail "Failed to create stock idea"
    echo "Response: $CREATE_IDEA"
fi

# Test 2.3: Get single idea
info "Test 2.3: Get single stock idea"
SINGLE_IDEA=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/ideas/$IDEA_ID)

if echo "$SINGLE_IDEA" | grep -q "NVDA"; then
    pass "Retrieved single idea"
else
    fail "Failed to retrieve single idea"
fi

# Test 2.4: Update idea status
info "Test 2.4: Update idea status"
UPDATE_STATUS=$(curl -s -X PATCH $BASE_URL/ideas/$IDEA_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "Active"}')

if echo "$UPDATE_STATUS" | grep -q "Active" || echo "$UPDATE_STATUS" | grep -q "success"; then
    pass "Idea status updated"
else
    fail "Failed to update status"
fi

# SECTION 3: FUNDAMENTAL DATA
section "PHASE 3: Fundamental Data Integration"

# Test 3.1: Get fundamentals for NVDA
info "Test 3.1: Fetch NVDA fundamentals"
FUNDAMENTALS=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/fundamentals/NVDA)

if echo "$FUNDAMENTALS" | grep -q "NVDA" && echo "$FUNDAMENTALS" | grep -q "marketCap"; then
    pass "Fundamental data retrieved successfully"
else
    fail "Failed to get fundamental data"
    echo "Response: $FUNDAMENTALS"
fi

# Test 3.2: Cache test (second request should be faster)
info "Test 3.2: Test caching (retrieve again)"
FUNDAMENTALS2=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/fundamentals/NVDA)

if echo "$FUNDAMENTALS2" | grep -q "NVDA"; then
    pass "Cached fundamental data retrieved"
else
    fail "Cache retrieval failed"
fi

# Test 3.3: Different ticker
info "Test 3.3: Fetch AAPL fundamentals"
AAPL_FUND=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/fundamentals/AAPL)

if echo "$AAPL_FUND" | grep -q "AAPL"; then
    pass "AAPL fundamentals retrieved"
else
    fail "Failed to get AAPL fundamentals"
fi

# SECTION 4: COMMENTS & REACTIONS
section "PHASE 4: Comments & Discussion System"

# Test 4.1: Create a comment
info "Test 4.1: Create comment on idea"
CREATE_COMMENT=$(curl -s -X POST $BASE_URL/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ideaId\": \"$IDEA_ID\",
    \"content\": \"Great analysis! I agree with the bullish thesis.\"
  }")

if echo "$CREATE_COMMENT" | grep -q "Great analysis"; then
    COMMENT_ID=$(echo "$CREATE_COMMENT" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    pass "Comment created (ID: $COMMENT_ID)"
else
    fail "Failed to create comment"
    echo "Response: $CREATE_COMMENT"
fi

# Test 4.2: Get comments for idea
info "Test 4.2: Get all comments for idea"
GET_COMMENTS=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/comments/idea/$IDEA_ID)

if echo "$GET_COMMENTS" | grep -q "Great analysis"; then
    pass "Retrieved comments for idea"
else
    fail "Failed to get comments"
fi

# Test 4.3: Create nested reply
info "Test 4.3: Create nested reply"
CREATE_REPLY=$(curl -s -X POST $BASE_URL/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ideaId\": \"$IDEA_ID\",
    \"content\": \"Thanks! What do you think about valuation?\",
    \"parentId\": $COMMENT_ID
  }")

if echo "$CREATE_REPLY" | grep -q "valuation"; then
    pass "Nested reply created"
else
    fail "Failed to create reply"
fi

# Test 4.4: Add bullish reaction
info "Test 4.4: Add bullish reaction"
ADD_REACTION=$(curl -s -X POST $BASE_URL/comments/reactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ideaId\": \"$IDEA_ID\",
    \"reactionType\": \"bullish\"
  }")

if echo "$ADD_REACTION" | grep -q "bullish" || echo "$ADD_REACTION" | grep -q "success"; then
    pass "Bullish reaction added"
else
    fail "Failed to add reaction"
fi

# Test 4.5: Get reactions
info "Test 4.5: Get reaction summary"
GET_REACTIONS=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/comments/reactions/idea/$IDEA_ID)

if echo "$GET_REACTIONS" | grep -q "bullish" || echo "$GET_REACTIONS" | grep -q "summary"; then
    pass "Retrieved reaction summary"
else
    fail "Failed to get reactions"
fi

# SECTION 5: PRICE ALERTS
section "PHASE 5: Price Alerts System"

# Test 5.1: Create price target alert
info "Test 5.1: Create price target alert"
CREATE_ALERT=$(curl -s -X POST $BASE_URL/alerts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ideaId\": \"$IDEA_ID\",
    \"alertType\": \"price_target\",
    \"threshold\": 600.00
  }")

if echo "$CREATE_ALERT" | grep -q "alert" || echo "$CREATE_ALERT" | grep -q "600"; then
    ALERT_ID=$(echo "$CREATE_ALERT" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    pass "Price alert created (ID: $ALERT_ID)"
else
    fail "Failed to create alert"
    echo "Response: $CREATE_ALERT"
fi

# Test 5.2: Get user's alerts
info "Test 5.2: Get all alerts"
GET_ALERTS=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/alerts)

if echo "$GET_ALERTS" | grep -q "price_target" || echo "$GET_ALERTS" | grep -q "600"; then
    pass "Retrieved user alerts"
else
    fail "Failed to get alerts"
fi

# SECTION 6: DATA EXPORT
section "PHASE 6: Data Export Functionality"

# Test 6.1: Export to CSV
info "Test 6.1: Export ideas to CSV"
EXPORT_CSV=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/export/csv)

if echo "$EXPORT_CSV" | grep -q "Ticker" && echo "$EXPORT_CSV" | grep -q "NVDA"; then
    pass "CSV export successful"
else
    fail "CSV export failed"
fi

# Test 6.2: Export to JSON
info "Test 6.2: Export ideas to JSON"
EXPORT_JSON=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/export/json)

if echo "$EXPORT_JSON" | grep -q "NVDA" && echo "$EXPORT_JSON" | grep -q "ticker"; then
    pass "JSON export successful"
else
    fail "JSON export failed"
fi

# SECTION 7: HEALTH & STATUS
section "PHASE 7: System Health & Status"

# Test 7.1: Health check
info "Test 7.1: API health check"
HEALTH=$(curl -s $BASE_URL/health)

if echo "$HEALTH" | grep -q "ok"; then
    pass "Health check passed"
else
    fail "Health check failed"
fi

# Test 7.2: Batch operations endpoint
info "Test 7.2: Get batch update status"
BATCH_STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/batch/update-status)

if echo "$BATCH_STATUS" | grep -q "lastUpdate" || echo "$BATCH_STATUS" | grep -q "status"; then
    pass "Batch status retrieved"
else
    fail "Failed to get batch status"
fi

# SECTION 8: DATABASE INTEGRITY
section "PHASE 8: Database Verification"

info "Test 8.1: Check database tables"
TABLES=$(sqlite3 backend/database.db ".tables" 2>&1)

EXPECTED_TABLES=(
    "users"
    "stock_ideas"
    "tags"
    "idea_tags"
    "comments"
    "reactions"
    "mentions"
    "price_alerts"
    "fundamentals_cache"
    "scraped_ideas"
)

for table in "${EXPECTED_TABLES[@]}"; do
    if echo "$TABLES" | grep -q "$table"; then
        pass "Table exists: $table"
    else
        fail "Table missing: $table"
    fi
done

info "Test 8.2: Verify admin user exists"
USER_COUNT=$(sqlite3 backend/database.db "SELECT COUNT(*) FROM users WHERE username='admin'" 2>&1)

if [ "$USER_COUNT" = "1" ]; then
    pass "Admin user exists in database"
else
    fail "Admin user not found"
fi

info "Test 8.3: Verify idea was saved"
IDEA_COUNT=$(sqlite3 backend/database.db "SELECT COUNT(*) FROM stock_ideas WHERE ticker='NVDA'" 2>&1)

if [ "$IDEA_COUNT" -ge "1" ]; then
    pass "Stock idea saved in database"
else
    fail "Stock idea not in database"
fi

info "Test 8.4: Verify comment was saved"
COMMENT_COUNT=$(sqlite3 backend/database.db "SELECT COUNT(*) FROM comments" 2>&1)

if [ "$COMMENT_COUNT" -ge "1" ]; then
    pass "Comments saved in database"
else
    fail "Comments not in database"
fi

# FINAL SUMMARY
section "📊 TEST SUMMARY"

TOTAL=$((PASSED + FAILED))
SUCCESS_RATE=$((PASSED * 100 / TOTAL))

echo ""
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Success Rate: $SUCCESS_RATE%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! AlphaSeek is fully operational.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Review the output above.${NC}"
    exit 1
fi
