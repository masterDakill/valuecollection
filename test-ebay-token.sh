#!/bin/bash
# Test eBay API avec User Token OAuth

echo "=========================================="
echo "Test eBay API avec User Token"
echo "=========================================="
echo ""

# Load environment variables
source .dev.vars 2>/dev/null || true

if [ -z "$EBAY_USER_TOKEN" ]; then
    echo "❌ EBAY_USER_TOKEN not found in .dev.vars"
    exit 1
fi

echo "✓ User Token trouvé: ${EBAY_USER_TOKEN:0:30}..."
echo ""

# Test 1: Simple search (should work with any token)
echo "Test 1: Recherche simple Beatles vinyl..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X GET "https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search?q=beatles+vinyl&limit=3" \
    -H "Authorization: Bearer $EBAY_USER_TOKEN" \
    -H "X-EBAY-C-MARKETPLACE-ID: EBAY_CA" \
    2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Recherche basique fonctionne (HTTP 200)"
    ITEM_COUNT=$(echo "$BODY" | grep -o '"itemSummaries"' | wc -l)
    if [ "$ITEM_COUNT" -gt 0 ]; then
        echo "✓ Items trouvés dans la réponse"
    fi
else
    echo "✗ Erreur recherche basique (HTTP $HTTP_CODE)"
    echo "$BODY" | head -n 5
fi
echo ""

# Test 2: Search with sold items only filter (requires User Token)
echo "Test 2: Recherche avec filtre sold items only..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X GET "https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search?q=beatles&limit=3&filter=soldItemsOnly:true" \
    -H "Authorization: Bearer $EBAY_USER_TOKEN" \
    -H "X-EBAY-C-MARKETPLACE-ID: EBAY_CA" \
    2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Recherche sold items fonctionne (HTTP 200)"
    echo "✓ User Token a les bonnes permissions!"
elif [ "$HTTP_CODE" = "403" ]; then
    echo "⚠ Sold items nécessite permissions additionnelles (HTTP 403)"
    echo "   L'application utilisera les listings actifs à la place"
else
    echo "✗ Erreur (HTTP $HTTP_CODE)"
    echo "$BODY" | head -n 5
fi
echo ""

# Test 3: Check token expiry (User tokens expire after 2 hours)
echo "Test 3: Vérification expiration token..."
echo "⚠ Les User Tokens expirent après 2 heures"
echo "   Si vous obtenez 'Invalid access token', rafraîchissez le token:"
echo "   https://developer.ebay.com/my/keys -> Sign in to Sandbox for OAuth"
echo ""

echo "=========================================="
echo "Test terminé"
echo "=========================================="
