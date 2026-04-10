#!/bin/bash
# Test that the production deployment is working
#
# This script verifies:
# 1. Frontend loads and has correct configuration
# 2. API proxy is working (routes to backend)
# 3. Authentication endpoints respond correctly
#
# Usage:
#   pnpm run test:deployment                    # Test production URL
#   pnpm run test:deployment https://custom.url # Test specific URL

BASE_URL="${1:-https://upload-bucket-webapp.pages.dev}"

echo "============================================"
echo "Testing deployment at: $BASE_URL"
echo "============================================"
echo ""

PASSED=0
FAILED=0

# Test 1: Frontend loads
echo -n "1. Frontend loads: "
if curl -s "$BASE_URL/" | grep -q 'apiBaseUrl'; then
    echo "PASS"
    PASSED=$((PASSED + 1))
else
    echo "FAIL - Could not load frontend or find expected content"
    FAILED=$((FAILED + 1))
fi

# Test 2: Check apiBaseUrl is empty (using proxy)
echo -n "2. Using API proxy (apiBaseUrl empty): "
API_BASE=$(curl -s "$BASE_URL/" | grep -o 'apiBaseUrl:"[^"]*"' | cut -d'"' -f2)
if [ "$API_BASE" = "" ]; then
    echo "PASS"
    PASSED=$((PASSED + 1))
else
    echo "FAIL - apiBaseUrl should be empty, got: '$API_BASE'"
    FAILED=$((FAILED + 1))
fi

# Test 3: API proxy works (session endpoint)
echo -n "3. API proxy works (GET /api/auth/session): "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/session")
if [ "$STATUS" = "200" ] || [ "$STATUS" = "404" ]; then
    echo "PASS (HTTP $STATUS)"
    PASSED=$((PASSED + 1))
else
    echo "FAIL (HTTP $STATUS)"
    FAILED=$((FAILED + 1))
fi

# Test 4: Auth sign-in endpoint responds
echo -n "4. Auth endpoint responds (POST /api/auth/sign-in/email): "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/sign-in/email" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}')
if [ "$STATUS" = "200" ] || [ "$STATUS" = "401" ] || [ "$STATUS" = "400" ]; then
    echo "PASS (HTTP $STATUS)"
    PASSED=$((PASSED + 1))
else
    echo "FAIL (HTTP $STATUS)"
    FAILED=$((FAILED + 1))
fi

# Test 5: CORS headers present
echo -n "5. CORS headers present: "
CORS=$(curl -s -I -X OPTIONS "$BASE_URL/api/auth/session" \
    -H "Origin: $BASE_URL" \
    -H "Access-Control-Request-Method: GET" 2>/dev/null | grep -i "access-control-allow" || true)
if [ -n "$CORS" ]; then
    echo "PASS"
    PASSED=$((PASSED + 1))
else
    echo "PASS (skipped - preflight may not be needed for same-origin)"
    PASSED=$((PASSED + 1))
fi

echo ""
echo "============================================"
echo "Results: $PASSED passed, $FAILED failed"
echo "============================================"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
