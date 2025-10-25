#!/bin/bash
# 📚 Script d'import direct via API (contournement des boutons)
# Utilise l'API backend directement

clear

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║     📚 IMPORT DIRECT VIA API - Contournement Boutons          ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🎯 Ce script importe les livres directement via l'API backend"
echo "   (contourne les boutons de l'interface qui ne fonctionnent pas)"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

# Vérifier que le serveur tourne
echo "🔍 Vérification du serveur..."
if ! curl -s http://localhost:3000/healthz > /dev/null; then
    echo "❌ Serveur non accessible sur http://localhost:3000"
    echo "   Lancez : npm run dev:d1"
    exit 1
fi
echo "✅ Serveur accessible"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📖 IMPORT DES 5 LIVRES DE TEST..."
echo ""

# Livre 1
echo "📕 Import 1/5 : 1984..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/import-item \
  -H 'Content-Type: application/json' \
  -d '{"title":"1984","author":"George Orwell","category":"books"}')
echo "   $RESPONSE"

sleep 1

# Livre 2
echo "📗 Import 2/5 : Le Petit Prince..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/import-item \
  -H 'Content-Type: application/json' \
  -d '{"title":"Le Petit Prince","author":"Antoine de Saint-Exupéry","category":"books"}')
echo "   $RESPONSE"

sleep 1

# Livre 3
echo "📘 Import 3/5 : Harry Potter..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/import-item \
  -H 'Content-Type: application/json' \
  -d '{"title":"Harry Potter à l'\''école des sorciers","author":"J.K. Rowling","category":"books"}')
echo "   $RESPONSE"

sleep 1

# Livre 4
echo "📙 Import 4/5 : Le Seigneur des Anneaux..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/import-item \
  -H 'Content-Type: application/json' \
  -d '{"title":"Le Seigneur des Anneaux","author":"J.R.R. Tolkien","category":"books"}')
echo "   $RESPONSE"

sleep 1

# Livre 5
echo "📓 Import 5/5 : Fondation..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/import-item \
  -H 'Content-Type: application/json' \
  -d '{"title":"Fondation","author":"Isaac Asimov","category":"books"}')
echo "   $RESPONSE"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "✅ IMPORT TERMINÉ !"
echo ""
echo "📊 Vérification des items importés..."
echo ""

# Lister les items
ITEMS=$(curl -s http://localhost:3000/api/items)
echo "$ITEMS" | jq '.'

echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "💾 Vérification du cache..."
echo ""

CACHE=$(curl -s http://localhost:3000/api/cache/stats)
echo "$CACHE" | jq '.cache_stats'

echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🎉 TERMINÉ !"
echo ""
echo "📱 Maintenant, rafraîchissez votre navigateur (F5) sur :"
echo "   http://localhost:3000"
echo ""
echo "   Les livres devraient apparaître dans la liste !"
echo ""
echo "════════════════════════════════════════════════════════════════"
