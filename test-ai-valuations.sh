#!/bin/bash
# Test AI valuations for all books

echo "🧪 Test du système d'évaluation IA avec prompt avancé"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for id in 2 3 4 5 6 7; do
  echo "📚 Livre #$id..."
  result=$(curl -s -X POST "http://localhost:3000/api/items/$id/evaluate")

  if [ $? -eq 0 ]; then
    # Extract values using python
    rarity_level=$(echo "$result" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('evaluation',{}).get('rarity',{}).get('rarityLevel','N/A'))" 2>/dev/null)
    rarity_score=$(echo "$result" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('evaluation',{}).get('rarity',{}).get('rarityScore','N/A'))" 2>/dev/null)
    value=$(echo "$result" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('evaluation',{}).get('rarity',{}).get('estimatedValue','N/A'))" 2>/dev/null)
    notes=$(echo "$result" | python3 -c "import sys, json; d=json.load(sys.stdin); note=d.get('evaluation',{}).get('rarity',{}).get('notes','N/A'); print(note[:100] + '...' if len(note) > 100 else note)" 2>/dev/null)

    echo "   💎 Rareté: $rarity_level ($rarity_score/10)"
    echo "   💰 Valeur: $value CAD"
    echo "   📝 Notes: $notes"
  else
    echo "   ❌ Erreur API"
  fi

  echo ""
  sleep 2
done

echo "✅ Test terminé!"
