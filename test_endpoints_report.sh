#!/bin/bash
echo "========================================="
echo "RAPPORT DE TEST - ValueCollection API"
echo "========================================="
echo "Date: $(date)"
echo "URL de base: http://127.0.0.1:3000"
echo ""

echo "1️⃣  TEST: GET /api/monitoring/health"
curl -s http://127.0.0.1:3000/api/monitoring/health | jq '.' || echo "❌ FAILED"
echo ""

echo "2️⃣  TEST: GET /api/items (Liste des livres)"
curl -s http://127.0.0.1:3000/api/items | jq '. | {success, count}' || echo "❌ FAILED"
echo ""

echo "3️⃣  TEST: GET /api/photos (Liste des photos)"
curl -s http://127.0.0.1:3000/api/photos | jq '. | {success, count: (.photos | length)}' 2>/dev/null || echo "❌ FAILED"
echo ""

echo "4️⃣  TEST: GET /api/monitoring/stats"
curl -s http://127.0.0.1:3000/api/monitoring/stats | jq '.' || echo "❌ FAILED"
echo ""

echo "5️⃣  TEST: GET / (Page d'accueil)"
curl -s http://127.0.0.1:3000/ | head -5
echo ""

echo "========================================="
echo "FIN DU RAPPORT"
echo "========================================="
