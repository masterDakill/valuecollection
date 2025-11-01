#!/bin/bash
# Appliquer la migration de monitoring

echo "📊 Application de la migration Monitoring..."
echo ""

npx wrangler d1 execute DB --local --file=migrations/0005_monitoring_system.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration Monitoring appliquée avec succès!"
    echo ""
    echo "📋 Table créée: service_monitoring"
    echo "📊 Vue créée: v_service_stats"
    echo ""
    echo "🔍 Vérification:"
    npx wrangler d1 execute DB --local --command="SELECT name FROM sqlite_master WHERE type='table' AND name='service_monitoring';"
else
    echo "❌ Erreur lors de l'application de la migration"
    exit 1
fi
