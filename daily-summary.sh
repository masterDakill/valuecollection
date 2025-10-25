#!/bin/bash
#
# Daily Summary - Résumé quotidien de progression
# Usage: ./daily-summary.sh
#
set -euo pipefail

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              📊 RÉSUMÉ QUOTIDIEN - $(date +%Y-%m-%d)            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

TODAY=$(date +%Y-%m-%d)

# Stats du jour
STATS=$(curl -s http://localhost:3000/api/photos | jq --arg today "$TODAY" '{
  photos_aujourdhui: (.photos | map(select(.uploaded_at | startswith($today))) | length),
  livres_aujourdhui: (.photos | map(select(.uploaded_at | startswith($today))) | map(.total_items_detected) | add // 0),
  total_photos: (.photos | length),
  total_livres: (.photos | map(.total_items_detected) | add // 0)
}')

PHOTOS_TODAY=$(echo "$STATS" | jq '.photos_aujourdhui')
LIVRES_TODAY=$(echo "$STATS" | jq '.livres_aujourdhui')
TOTAL_PHOTOS=$(echo "$STATS" | jq '.total_photos')
TOTAL_LIVRES=$(echo "$STATS" | jq '.total_livres')

echo "🗓️  Aujourd'hui:"
echo "   Photos: $PHOTOS_TODAY"
echo "   Livres: $LIVRES_TODAY"
echo ""

echo "📈 Progression Totale:"
echo "   Photos: $TOTAL_PHOTOS"
echo "   Livres: $TOTAL_LIVRES / 1500"

if [ "$TOTAL_LIVRES" -gt 0 ]; then
  PERCENT=$(echo "scale=1; ($TOTAL_LIVRES * 100) / 1500" | bc)
  REMAINING=$((1500 - TOTAL_LIVRES))

  echo "   Complété: ${PERCENT}%"
  echo "   Restant: $REMAINING livres"
  echo ""

  # Barre de progression
  BARS=$((TOTAL_LIVRES * 50 / 1500))
  SPACES=$((50 - BARS))
  printf "   ["
  printf "%${BARS}s" | tr ' ' '█'
  printf "%${SPACES}s" | tr ' ' '░'
  printf "] ${PERCENT}%%\n"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Top 5 dernières photos
echo "🔖 5 Dernières Photos:"
curl -s http://localhost:3000/api/photos | jq -r '.photos[-5:] | reverse | .[] | "   #\(.id) - \(.total_items_detected) livres - \(.uploaded_at)"'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Estimation temps restant
if [ "$LIVRES_TODAY" -gt 0 ] && [ "$TOTAL_LIVRES" -lt 1500 ]; then
  REMAINING=$((1500 - TOTAL_LIVRES))
  DAYS_TO_GO=$(echo "scale=0; $REMAINING / $LIVRES_TODAY" | bc)

  echo "⏱️  Estimation:"
  echo "   Rythme actuel: $LIVRES_TODAY livres/jour"
  echo "   Jours restants: ~$DAYS_TO_GO jours"
  echo "   Fin estimée: $(date -v+${DAYS_TO_GO}d +%Y-%m-%d 2>/dev/null || date -d "+${DAYS_TO_GO} days" +%Y-%m-%d 2>/dev/null)"
  echo ""
fi

# Milestones
echo "🎯 Milestones:"
if [ "$TOTAL_LIVRES" -ge 1500 ]; then
  echo "   🎉 1500 livres - OBJECTIF ATTEINT!"
elif [ "$TOTAL_LIVRES" -ge 1000 ]; then
  echo "   ✅ 1000 livres - Plus que la moitié!"
  echo "   ⬜ 1500 livres - Objectif final"
elif [ "$TOTAL_LIVRES" -ge 500 ]; then
  echo "   ✅ 500 livres - 1/3 complété!"
  echo "   ⬜ 1000 livres"
  echo "   ⬜ 1500 livres"
elif [ "$TOTAL_LIVRES" -ge 100 ]; then
  echo "   ✅ 100 livres - Bon départ!"
  echo "   ⬜ 500 livres"
  echo "   ⬜ 1500 livres"
elif [ "$TOTAL_LIVRES" -ge 50 ]; then
  echo "   ✅ 50 livres - Système maîtrisé!"
  echo "   ⬜ 100 livres"
  echo "   ⬜ 500 livres"
else
  echo "   ⬜ 50 livres - Système maîtrisé"
  echo "   ⬜ 100 livres - Bon départ"
  echo "   ⬜ 500 livres - 1/3 complété"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Conseils
if [ "$PHOTOS_TODAY" -eq 0 ]; then
  echo "💡 Conseil: Commencez votre journée avec 5-10 photos!"
  echo "   ./quick-add.sh pour ajouter rapidement"
elif [ "$PHOTOS_TODAY" -ge 20 ]; then
  echo "🔥 Excellente productivité aujourd'hui! Continuez ainsi!"
elif [ "$PHOTOS_TODAY" -ge 10 ]; then
  echo "👍 Bon rythme! Encore quelques photos pour une super journée!"
else
  echo "💪 Bon début! Objectif: 10-20 photos/jour"
fi

echo ""
