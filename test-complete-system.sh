#!/bin/bash

echo "╔════════════════════════════════════════════════════════╗"
echo "║   🧪 TEST COMPLET DU SYSTÈME VALUECOLLECTION         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
PASS=0
FAIL=0

# Fonction de test
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected="$3"
    
    echo -n "Testing $name... "
    response=$(curl -s "$url")
    
    if echo "$response" | grep -q "$expected"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Response: $response"
        ((FAIL++))
    fi
}

echo "📡 Testing API Endpoints"
echo "════════════════════════════════════════════════════════"

test_endpoint "Health Check" "http://127.0.0.1:3000/api/monitoring/health" "success"
test_endpoint "Items List" "http://127.0.0.1:3000/api/items" "success"
test_endpoint "Photos List" "http://127.0.0.1:3000/api/photos" "success"
test_endpoint "Stats" "http://127.0.0.1:3000/api/monitoring/stats" "success"
test_endpoint "Homepage" "http://127.0.0.1:3000/" "Évaluateur de Collection"

echo ""
echo "🔧 Testing Scripts"
echo "════════════════════════════════════════════════════════"

if [ -x "./convert-heic-linux.sh" ]; then
    echo -e "${GREEN}✅ PASS${NC} convert-heic-linux.sh is executable"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC} convert-heic-linux.sh not executable"
    ((FAIL++))
fi

if [ -x "./add-photo-linux.sh" ]; then
    echo -e "${GREEN}✅ PASS${NC} add-photo-linux.sh is executable"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC} add-photo-linux.sh not executable"
    ((FAIL++))
fi

if [ -x "./test_endpoints_report.sh" ]; then
    echo -e "${GREEN}✅ PASS${NC} test_endpoints_report.sh is executable"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC} test_endpoints_report.sh not executable"
    ((FAIL++))
fi

echo ""
echo "📄 Testing Documentation"
echo "════════════════════════════════════════════════════════"

docs=("FIX_REPORT.md" "SESSION_FIX_SUMMARY.md" "PUSH_INSTRUCTIONS.md" "README_FIX_SESSION.md" ".dev.vars.example")

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✅ PASS${NC} $doc exists"
        ((PASS++))
    else
        echo -e "${RED}❌ FAIL${NC} $doc missing"
        ((FAIL++))
    fi
done

echo ""
echo "📊 Testing Build"
echo "════════════════════════════════════════════════════════"

if [ -f "dist/_worker.js" ]; then
    size=$(du -h dist/_worker.js | cut -f1)
    echo -e "${GREEN}✅ PASS${NC} Build exists (size: $size)"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC} Build not found"
    ((FAIL++))
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                    RÉSULTATS FINAUX                    ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo -e "  ${GREEN}✅ Tests réussis: $PASS${NC}"
echo -e "  ${RED}❌ Tests échoués: $FAIL${NC}"
echo ""

TOTAL=$((PASS + FAIL))
PERCENTAGE=$((PASS * 100 / TOTAL))

if [ $FAIL -eq 0 ]; then
    echo -e "  ${GREEN}🎉 SUCCÈS: 100% des tests passent!${NC}"
    exit 0
else
    echo -e "  ${YELLOW}⚠️  ATTENTION: ${PERCENTAGE}% des tests passent${NC}"
    exit 1
fi
