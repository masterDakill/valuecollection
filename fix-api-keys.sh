#!/bin/bash

echo "=================================================="
echo "   Diagnostic et Correction des Clés API"
echo "=================================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Vérification des clés actuelles:${NC}"
echo ""

# Vérifier OpenAI
if grep -q "^OPENAI_API_KEY=sk-" .dev.vars 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} OpenAI: Clé valide (commence par sk-)"
else
    echo -e "  ${RED}✗${NC} OpenAI: Clé invalide ou manquante"
fi

# Vérifier Anthropic
if grep -q "^ANTHROPIC_API_KEY=sk-ant-" .dev.vars 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Anthropic: Clé valide (commence par sk-ant-)"
else
    echo -e "  ${RED}✗${NC} Anthropic: Clé invalide ou manquante"
fi

# Vérifier Gemini
if grep -q "^GEMINI_API_KEY=AIza" .dev.vars 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Gemini: Clé valide (commence par AIza)"
elif grep -q "^GEMINI_API_KEY=GOCSPX-" .dev.vars 2>/dev/null; then
    echo -e "  ${RED}✗${NC} Gemini: Clé OAuth détectée - DOIT être une clé API (AIza...)"
else
    echo -e "  ${YELLOW}⚠${NC} Gemini: Clé manquante"
fi

# Vérifier Google Books
if grep -q "^GOOGLE_BOOKS_API_KEY=AIza" .dev.vars 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Google Books: Clé valide (commence par AIza)"
elif grep -q "^GOOGLE_BOOKS_API_KEY=GOCSPX-" .dev.vars 2>/dev/null; then
    echo -e "  ${RED}✗${NC} Google Books: Clé OAuth détectée - DOIT être une clé API (AIza...)"
else
    echo -e "  ${YELLOW}⚠${NC} Google Books: Clé manquante"
fi

echo ""
echo "=================================================="
echo -e "${YELLOW}2. Instructions pour corriger:${NC}"
echo "=================================================="
echo ""

echo "Pour Gemini:"
echo "  1. Aller sur: https://makersuite.google.com/app/apikey"
echo "  2. Créer une nouvelle clé API"
echo "  3. Copier la clé (commence par AIza)"
echo "  4. Modifier .dev.vars:"
echo "     nano .dev.vars"
echo "  5. Remplacer GEMINI_API_KEY=... par votre nouvelle clé"
echo ""

echo "Pour Google Books:"
echo "  1. Aller sur: https://console.cloud.google.com/apis/credentials"
echo "  2. Activer 'Books API'"
echo "  3. Créer une clé API"
echo "  4. Copier la clé (commence par AIza)"
echo "  5. Remplacer GOOGLE_BOOKS_API_KEY=... dans .dev.vars"
echo ""

echo "Pour Anthropic (si erreur):"
echo "  1. Vérifier sur: https://console.anthropic.com/settings/keys"
echo "  2. Créer une nouvelle clé si nécessaire"
echo "  3. Remplacer ANTHROPIC_API_KEY=... dans .dev.vars"
echo ""

echo "=================================================="
echo -e "${YELLOW}3. Test rapide après correction:${NC}"
echo "=================================================="
echo ""
echo "  ./start.sh"
echo "  curl -X POST http://localhost:8790/api/items/23/evaluate"
echo ""

echo "=================================================="
echo -e "${GREEN}Bon à savoir:${NC}"
echo "=================================================="
echo ""
echo "  • OpenAI fonctionne déjà! L'analyse IA est opérationnelle"
echo "  • Anthropic et Gemini sont des fallbacks optionnels"
echo "  • Sans Gemini/Google Books, l'app utilise d'autres sources"
echo "  • Mode SIMULATED eBay est OK pour tester"
echo ""
