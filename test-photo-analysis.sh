#!/bin/bash

echo "════════════════════════════════════════════════════════════════"
echo "🧪 Testing Photo Analysis Endpoints (v2.2)"
echo "════════════════════════════════════════════════════════════════"
echo ""

BASE_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}1️⃣  Testing Health Check...${NC}"
curl -s "$BASE_URL/healthz" | jq '.'
echo ""

echo "────────────────────────────────────────────────────────────────"
echo -e "${BLUE}2️⃣  Testing GET /api/photos (should be empty initially)${NC}"
curl -s "$BASE_URL/api/photos" | jq '.'
echo ""

echo "────────────────────────────────────────────────────────────────"
echo -e "${BLUE}3️⃣  Testing Photo Analysis Endpoint${NC}"
echo -e "${YELLOW}Note: This requires OPENAI_API_KEY to be set${NC}"
echo ""

# Create a test request (you'll need to replace with a real image URL)
TEST_IMAGE_URL="https://images.unsplash.com/photo-1507842217343-583bb7270b66"

echo -e "${GREEN}Analyzing photo: $TEST_IMAGE_URL${NC}"
echo ""

curl -s -X POST "$BASE_URL/api/photos/analyze" \
  -H "Content-Type: application/json" \
  -d "{
    \"imageUrl\": \"$TEST_IMAGE_URL\",
    \"options\": {
      \"maxItems\": 10,
      \"useCache\": true
    }
  }" | jq '.'

echo ""
echo "────────────────────────────────────────────────────────────────"
echo -e "${BLUE}4️⃣  Testing GET /api/photos again (should show analyzed photo)${NC}"
curl -s "$BASE_URL/api/photos?limit=5" | jq '.'
echo ""

echo "────────────────────────────────────────────────────────────────"
echo -e "${BLUE}5️⃣  Testing GET /api/photos/:id (get first photo details)${NC}"
curl -s "$BASE_URL/api/photos/1" | jq '.'
echo ""

echo "════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Tests completed!${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📌 New Endpoints Available:"
echo "  POST   /api/photos/analyze  - Analyze photo and detect books"
echo "  GET    /api/photos          - Get all analyzed photos"
echo "  GET    /api/photos/:id      - Get photo details with all books"
echo "  DELETE /api/photos/:id      - Delete photo and associated books"
echo ""
