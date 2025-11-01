#!/bin/bash

echo "🚀 Démarrage du serveur ValueCollection..."
echo ""

# Tuer tous les processus wrangler
echo "🧹 Nettoyage des processus..."
pkill -9 -f wrangler 2>/dev/null
pkill -9 -f miniflare 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

sleep 2

echo "✅ Processus nettoyés"
echo ""

# Démarrer le serveur
echo "🎬 Démarrage du serveur sur http://localhost:3000"
echo ""

npm run dev:d1
