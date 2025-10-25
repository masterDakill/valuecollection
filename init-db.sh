#!/bin/bash
# Script pour initialiser la base de données locale
# À exécuter APRÈS avoir démarré le serveur

echo "🗄️  Initialisation de la base de données..."
echo ""

# Appliquer les migrations (en sautant 0002 qui échoue)
echo "📥 Application des migrations..."

# Migration 0001 - Base schema
wrangler d1 execute DB --local --file=migrations/0001_initial_schema.sql 2>&1 | grep -q "success" && echo "   ✅ Migration 0001 (base)" || echo "   ⏭️  Migration 0001 déjà appliquée"

# Skip migration 0002 (duplicate columns error)

# Migration 0003 - Cache and enrichments
wrangler d1 execute DB --local --file=migrations/0003_add_cache_and_enrichments.sql 2>&1 | grep -q "success" && echo "   ✅ Migration 0003 (cache)" || echo "   ⏭️  Migration 0003 déjà appliquée"

# Migration 0004 - Photo storage (CRITICAL)
wrangler d1 execute DB --local --file=migrations/0004_add_photo_storage.sql 2>&1 | grep -q "success" && echo "   ✅ Migration 0004 (photos)" || echo "   ⏭️  Migration 0004 déjà appliquée"

echo ""
echo "📦 Création de la collection par défaut..."
wrangler d1 execute DB --local --command="INSERT INTO collections (id, name, description, owner_email, created_at, updated_at) VALUES (1, 'Collection Principale', 'Collection par défaut', 'Math55_50@hotmail.com', datetime('now'), datetime('now')) ON CONFLICT(id) DO NOTHING;" 2>&1 | grep -q "success" && echo "   ✅ Collection créée" || echo "   ⏭️  Collection déjà existante"

echo ""
echo "✅ Base de données initialisée!"
echo ""
echo "Vérification des tables:"
npm run db:ls
