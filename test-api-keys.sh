#!/bin/bash
# Script de test des clés API

echo "==================================="
echo "Test des clés API"
echo "==================================="
echo ""

# Charger les variables d'environnement
source .dev.vars 2>/dev/null || true

# Test OpenAI
echo "1. Test OpenAI API..."
if [ -n "$OPENAI_API_KEY" ]; then
    echo "   ✓ Clé OpenAI trouvée: ${OPENAI_API_KEY:0:20}..."
    
    # Test rapide de la clé
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://api.openai.com/v1/chat/completions" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $OPENAI_API_KEY" \
        -d '{
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": "Hi"}],
            "max_tokens": 5
        }' 2>&1)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✓ OpenAI API fonctionne correctement!"
    else
        echo "   ✗ Erreur OpenAI (HTTP $HTTP_CODE)"
        echo "   Réponse: $BODY" | head -n 3
    fi
else
    echo "   ✗ Clé OpenAI manquante"
fi
echo ""

# Test Anthropic
echo "2. Test Anthropic Claude API..."
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "   ✓ Clé Anthropic trouvée: ${ANTHROPIC_API_KEY:0:20}..."
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://api.anthropic.com/v1/messages" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $ANTHROPIC_API_KEY" \
        -H "anthropic-version: 2023-06-01" \
        -d '{
            "model": "claude-3-haiku-20240307",
            "max_tokens": 5,
            "messages": [{"role": "user", "content": "Hi"}]
        }' 2>&1)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✓ Anthropic Claude API fonctionne correctement!"
    else
        echo "   ✗ Erreur Anthropic (HTTP $HTTP_CODE)"
        echo "   Réponse: $BODY" | head -n 3
    fi
else
    echo "   ✗ Clé Anthropic manquante"
fi
echo ""

# Test Google (Gemini)
echo "3. Test Google Gemini API..."
if [ -n "$GEMINI_API_KEY" ]; then
    echo "   ✓ Clé Gemini trouvée: ${GEMINI_API_KEY:0:20}..."
    echo "   ⚠ Test Gemini non implémenté (format de clé différent)"
else
    echo "   ✗ Clé Gemini manquante"
fi
echo ""

# Test eBay
echo "4. Test eBay API..."
if [ -n "$EBAY_CLIENT_ID" ] && [ -n "$EBAY_CLIENT_SECRET" ]; then
    echo "   ✓ Identifiants eBay trouvés"
    echo "   Mode: $EBAY_ENVIRONMENT"
else
    echo "   ✗ Identifiants eBay manquants"
fi
echo ""

# Test Discogs
echo "5. Test Discogs API..."
if [ -n "$DISCOGS_API_KEY" ]; then
    echo "   ✓ Clé Discogs trouvée: ${DISCOGS_API_KEY:0:20}..."
else
    echo "   ✗ Clé Discogs manquante"
fi
echo ""

# Test Google Books
echo "6. Test Google Books API..."
if [ -n "$GOOGLE_BOOKS_API_KEY" ]; then
    echo "   ✓ Clé Google Books trouvée: ${GOOGLE_BOOKS_API_KEY:0:20}..."
else
    echo "   ✗ Clé Google Books manquante"
fi
echo ""

# Test Make.com
echo "7. Test Make.com Webhook..."
if [ -n "$MAKE_WEBHOOK_URL" ]; then
    echo "   ✓ Webhook URL trouvée"
    echo "   URL: $MAKE_WEBHOOK_URL"
else
    echo "   ✗ Webhook URL manquante"
fi
echo ""

echo "==================================="
echo "Test terminé"
echo "==================================="
