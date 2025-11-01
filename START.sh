#!/bin/bash
# Script de démarrage propre de l'application

echo "🚀 Démarrage de l'Évaluateur de Collection Pro"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Nettoyer les processus existants
echo "🧹 Nettoyage des processus..."
pkill -9 -f wrangler 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

# 2. Vérifier que le build est à jour
echo "📦 Vérification du build..."
if [ ! -f "dist/_worker.js" ]; then
    echo "⚠️  Build manquant, compilation en cours..."
    npm run build
fi

echo "✅ Build trouvé ($(du -h dist/_worker.js | cut -f1))"
echo ""

# 3. Démarrer le serveur
echo "🌐 Démarrage du serveur local..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   📍 URL: http://localhost:3000"
echo "   📊 Dashboard: http://localhost:3000"
echo "   🔧 API: http://localhost:3000/api/items"
echo ""
echo "   Appuyez sur Ctrl+C pour arrêter"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Démarrer wrangler
npm run dev:d1
