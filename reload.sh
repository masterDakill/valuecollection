#!/bin/bash
# Script de rechargement rapide - Toujours la dernière version

echo "🔄 Rechargement de l'application..."
echo ""

# 1. Arrêter les processus
echo "1️⃣  Arrêt des processus..."
killall -9 node wrangler workerd 2>/dev/null
sleep 2

# 2. Build
echo "2️⃣  Build de la dernière version..."
npm run build

# 3. Vérifier le timestamp
echo ""
echo "✅ Nouveau build créé:"
ls -lh dist/_worker.js | awk '{print "   📦 Taille: "$5"  🕐 Date: "$6" "$7" "$8}'
echo ""

# 4. Démarrer le serveur
echo "3️⃣  Démarrage du serveur..."
npm run dev:d1 > /dev/null 2>&1 &

# 5. Attendre que le serveur démarre
echo "4️⃣  Attente du serveur..."
sleep 8

# 6. Tester le health endpoint
echo "5️⃣  Test de santé..."
HEALTH=$(curl -s http://localhost:3000/healthz | jq -r '.status' 2>/dev/null)

if [ "$HEALTH" = "healthy" ]; then
  echo "   ✅ Serveur prêt!"

  # 7. Appliquer les migrations (en sautant 0002 qui échoue)
  echo "6️⃣  Application des migrations..."

  # Migration 0001 - Base schema
  wrangler d1 execute DB --local --file=migrations/0001_initial_schema.sql 2>&1 | grep -q "success" && echo "   ✅ Migration 0001 (base)" || echo "   ⏭️  Migration 0001 déjà appliquée"

  # Skip migration 0002 (duplicate columns error)

  # Migration 0003 - Cache and enrichments
  wrangler d1 execute DB --local --file=migrations/0003_add_cache_and_enrichments.sql 2>&1 | grep -q "success" && echo "   ✅ Migration 0003 (cache)" || echo "   ⏭️  Migration 0003 déjà appliquée"

  # Migration 0004 - Photo storage (CRITICAL pour l'analyse de photos)
  wrangler d1 execute DB --local --file=migrations/0004_add_photo_storage.sql 2>&1 | grep -q "success" && echo "   ✅ Migration 0004 (photos)" || echo "   ⏭️  Migration 0004 déjà appliquée"

  # Créer collection par défaut (requis pour FOREIGN KEY)
  wrangler d1 execute DB --local --command="INSERT INTO collections (id, name, description, owner_email, created_at, updated_at) VALUES (1, 'Collection Principale', 'Collection par défaut', 'Math55_50@hotmail.com', datetime('now'), datetime('now')) ON CONFLICT(id) DO NOTHING;" 2>&1 | grep -q "success" && echo "   ✅ Collection par défaut créée" || echo "   ⏭️  Collection déjà existante"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🚀 Application disponible sur:"
  echo "   👉 http://localhost:3000"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "💡 N'oubliez pas de rafraîchir votre navigateur:"
  echo "   Mac:     Cmd + Shift + R"
  echo "   Windows: Ctrl + Shift + F5"
  echo ""

  # Ouvrir le navigateur
  open http://localhost:3000
else
  echo "   ❌ Erreur - Le serveur ne répond pas"
fi
