#!/bin/bash

# 🧪 Script de Test Automatique v2.1
# Tests tous les nouveaux endpoints sans authentication

set -e  # Arrêter si une commande échoue

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🧪 Tests Automatiques ImageToValue v2.1                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
BASE_URL="${1:-http://localhost:3000}"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de test
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local expected_status=$4
    local extra_args=${5:-""}

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -n "🔍 Test $TOTAL_TESTS: $name ... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" $extra_args "${BASE_URL}${endpoint}")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method $extra_args "${BASE_URL}${endpoint}")
    fi

    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $status_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))

        # Afficher un extrait de la réponse si c'est du JSON
        if echo "$body" | jq -e . >/dev/null 2>&1; then
            echo "   📄 Response: $(echo "$body" | jq -c . | cut -c1-80)..."
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (Expected $expected_status, got $status_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "   📄 Response: $body"
    fi
    echo ""
}

# Vérifier que le serveur est démarré
echo "🔌 Vérification de la connexion au serveur..."
if ! curl -s -f "${BASE_URL}/healthz" > /dev/null 2>&1; then
    echo -e "${RED}❌ ERREUR: Serveur non accessible à ${BASE_URL}${NC}"
    echo ""
    echo "💡 Démarrez le serveur d'abord:"
    echo "   npm run dev:d1"
    echo ""
    exit 1
fi
echo -e "${GREEN}✅ Serveur accessible${NC}"
echo ""

# ============================================================================
# TESTS DES ENDPOINTS V2.1
# ============================================================================

echo -e "${BLUE}📚 Tests Endpoints Documentation${NC}"
echo "────────────────────────────────────────────────────────────────"

test_endpoint "Swagger UI (HTML)" "GET" "/docs" "200" "-H 'Accept: text/html'"
test_endpoint "OpenAPI Spec (JSON)" "GET" "/openapi.json" "200"
test_endpoint "Curl Examples" "GET" "/examples" "200"

echo -e "${BLUE}🏥 Tests Endpoints Santé${NC}"
echo "────────────────────────────────────────────────────────────────"

test_endpoint "Health Check" "GET" "/healthz" "200"
test_endpoint "Readiness Check" "GET" "/readyz" "200"
test_endpoint "System Info" "GET" "/info" "200"

echo -e "${BLUE}📊 Tests Endpoints Métriques${NC}"
echo "────────────────────────────────────────────────────────────────"

test_endpoint "Prometheus Metrics" "GET" "/metrics" "200"
test_endpoint "JSON Metrics" "GET" "/metrics/json" "200"

echo -e "${BLUE}💾 Tests Endpoints Cache${NC}"
echo "────────────────────────────────────────────────────────────────"

test_endpoint "Cache Stats" "GET" "/api/cache/stats" "200"
test_endpoint "Cache Cleanup" "POST" "/api/cache/cleanup" "200"

# ============================================================================
# TESTS FONCTIONNELS AVANCÉS
# ============================================================================

echo -e "${BLUE}🧪 Tests Fonctionnels${NC}"
echo "────────────────────────────────────────────────────────────────"

# Test: Health check retourne version correcte
echo -n "🔍 Test: Health check contient version 2.1.0 ... "
health_response=$(curl -s "${BASE_URL}/healthz")
if echo "$health_response" | jq -e '.version == "2.1.0"' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Test: Cache stats retourne structure correcte
echo -n "🔍 Test: Cache stats structure valide ... "
cache_response=$(curl -s "${BASE_URL}/api/cache/stats")
if echo "$cache_response" | jq -e '.success == true and .cache_stats.total_entries != null' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))

    # Afficher les stats réelles
    hit_rate=$(echo "$cache_response" | jq -r '.cache_stats.hit_rate')
    total_entries=$(echo "$cache_response" | jq -r '.cache_stats.total_entries')
    echo "   📊 Cache: $total_entries entrées, ${hit_rate}% hit rate"
else
    echo -e "${RED}❌ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Test: OpenAPI spec valide
echo -n "🔍 Test: OpenAPI spec est valide ... "
openapi_response=$(curl -s "${BASE_URL}/openapi.json")
if echo "$openapi_response" | jq -e '.openapi == "3.1.0" and .info.version == "2.1.0"' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Test: Readiness vérifie database
echo -n "🔍 Test: Readiness vérifie la base de données ... "
ready_response=$(curl -s "${BASE_URL}/readyz")
if echo "$ready_response" | jq -e '.checks.database != null' > /dev/null 2>&1; then
    db_status=$(echo "$ready_response" | jq -r '.checks.database')
    if [ "$db_status" = "true" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Database: OK)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${YELLOW}⚠️  WARN${NC} (Database: Not Ready)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
else
    echo -e "${RED}❌ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# ============================================================================
# RÉSUMÉ
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                     📊 RÉSUMÉ DES TESTS                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

pass_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo "Total:  $TOTAL_TESTS tests"
echo -e "${GREEN}Passed: $PASSED_TESTS tests${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED_TESTS tests${NC}"
fi
echo ""
echo "Success Rate: ${pass_rate}%"
echo ""

if [ $pass_rate -eq 100 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           🎉 TOUS LES TESTS SONT PASSÉS ! 🎉                  ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "✅ Votre application v2.1 est prête à être déployée !"
    echo ""
    echo "📝 Prochaines étapes:"
    echo "   1. npm run build"
    echo "   2. npm run deploy:prod"
    echo "   3. Profiter ! 🚀"
    echo ""
    exit 0
elif [ $pass_rate -ge 80 ]; then
    echo -e "${YELLOW}⚠️  La plupart des tests passent, mais attention aux erreurs${NC}"
    exit 1
else
    echo -e "${RED}❌ Trop d'erreurs détectées. Vérifiez votre configuration.${NC}"
    exit 1
fi
