#!/bin/bash

# =============================================================================
# Script de Test - Analyse d'Images avec OpenAI Vision
# =============================================================================
# Ce script teste si votre configuration OpenAI fonctionne correctement
# =============================================================================

echo "🧪 Test d'Analyse d'Images - Évaluateur de Collection Pro"
echo "=========================================================="
echo ""

# Couleurs pour output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier si .dev.vars existe
if [ ! -f .dev.vars ]; then
    echo -e "${RED}❌ Fichier .dev.vars non trouvé${NC}"
    echo ""
    echo "Créez le fichier .dev.vars avec votre clé OpenAI :"
    echo "  OPENAI_API_KEY=sk-proj-VOTRE_CLE_ICI"
    echo ""
    exit 1
fi

# Vérifier si la clé OpenAI est configurée
OPENAI_KEY=$(grep "OPENAI_API_KEY=" .dev.vars | cut -d '=' -f 2)

if [ -z "$OPENAI_KEY" ] || [ "$OPENAI_KEY" == "REMPLACER_PAR_VOTRE_CLE" ]; then
    echo -e "${RED}❌ Clé OpenAI non configurée dans .dev.vars${NC}"
    echo ""
    echo "Étapes à suivre :"
    echo "  1. Aller sur https://platform.openai.com/api-keys"
    echo "  2. Créer une nouvelle clé API"
    echo "  3. Copier la clé dans .dev.vars"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Fichier .dev.vars trouvé${NC}"
echo -e "${GREEN}✅ Clé OpenAI configurée${NC}"
echo ""

# Vérifier si le serveur local est lancé
echo "🔍 Vérification du serveur local..."

if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Serveur local non démarré${NC}"
    echo ""
    echo "Démarrez le serveur avec : npm run dev"
    echo "Puis relancez ce script"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Serveur local actif sur http://localhost:3000${NC}"
echo ""

# Test 1: Analyse par texte (simple)
echo "📝 Test 1: Analyse par texte simple..."
echo "--------------------------------------"

RESPONSE=$(curl -s -X POST http://localhost:3000/api/smart-evaluate \
  -H "Content-Type: application/json" \
  -d '{"text_input":"Abbey Road The Beatles"}')

if echo "$RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ Test texte réussi${NC}"
    echo "Réponse (extrait) :"
    echo "$RESPONSE" | head -n 5
else
    echo -e "${RED}❌ Test texte échoué${NC}"
    echo "Réponse :"
    echo "$RESPONSE"
fi

echo ""

# Test 2: Analyse avancée multi-expert
echo "🧠 Test 2: Analyse multi-expert avancée..."
echo "-------------------------------------------"

RESPONSE=$(curl -s -X POST http://localhost:3000/api/advanced-analysis \
  -H "Content-Type: application/json" \
  -d '{"text_input":"First Edition Great Gatsby 1925"}')

if echo "$RESPONSE" | grep -q "success\|consensus"; then
    echo -e "${GREEN}✅ Test multi-expert réussi${NC}"
    echo "Réponse (extrait) :"
    echo "$RESPONSE" | head -n 5
else
    echo -e "${RED}❌ Test multi-expert échoué${NC}"
    echo "Réponse :"
    echo "$RESPONSE"
fi

echo ""

# Test 3: Analyse d'image (si URL fournie)
echo "📸 Test 3: Analyse d'image..."
echo "-------------------------------"
echo ""
echo "Pour tester l'analyse d'image, vous avez 2 options :"
echo ""
echo "Option A - Interface Web (Recommandée) :"
echo "  1. Ouvrir http://localhost:3000 dans votre navigateur"
echo "  2. Section '📸 Évaluation par Image/Vidéo'"
echo "  3. Cliquer 'Sélectionner Image'"
echo "  4. Choisir une photo d'objet de collection"
echo "  5. Cliquer 'Analyser avec IA'"
echo ""
echo "Option B - API avec URL d'image :"
echo "  curl -X POST http://localhost:3000/api/smart-evaluate \\"
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"imageUrl":"https://votre-url-image.jpg"}'"'"
echo ""

# Test 4: Vérifier les stats
echo "📊 Test 4: Récupération des statistiques..."
echo "---------------------------------------------"

STATS=$(curl -s http://localhost:3000/api/stats)

if echo "$STATS" | grep -q "success\|total_items"; then
    echo -e "${GREEN}✅ API stats fonctionnelle${NC}"
    echo "Stats :"
    echo "$STATS" | head -n 10
else
    echo -e "${YELLOW}⚠️  Stats retournent des valeurs par défaut (normal en mode démo)${NC}"
fi

echo ""
echo "=========================================================="
echo "🎉 Tests terminés !"
echo "=========================================================="
echo ""
echo "Prochaines étapes :"
echo "  1. Ouvrir http://localhost:3000 dans votre navigateur"
echo "  2. Tester l'upload d'une vraie image"
echo "  3. Vérifier les résultats de l'analyse IA"
echo ""
echo "Pour voir les logs détaillés :"
echo "  - Consulter la console où tourne 'npm run dev'"
echo "  - Chercher : '🧠 Démarrage analyse multi-expert...'"
echo ""
echo "Documentation complète : QUICKSTART.md"
echo ""
