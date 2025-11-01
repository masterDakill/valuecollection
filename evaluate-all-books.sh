#!/bin/bash
# Évalue tous les livres pour obtenir les prix

echo "🚀 Évaluation de tous les livres..."
echo ""

for id in 2 3 4 5 6 7 1; do
    echo "📊 Livre #$id..."
    curl -s -X POST "http://localhost:3000/api/items/$id/evaluate" > /tmp/eval_$id.json

    if [ $? -eq 0 ]; then
        value=$(cat /tmp/eval_$id.json | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('evaluation',{}).get('rarity',{}).get('estimatedValue','N/A'))" 2>/dev/null)
        if [ ! -z "$value" ] && [ "$value" != "N/A" ]; then
            echo "   ✅ Valeur: $value CAD"
        else
            echo "   ⚠️  Évaluation incomplète"
        fi
    else
        echo "   ❌ Erreur API"
    fi

    sleep 1
    echo ""
done

echo "✅ Toutes les évaluations terminées!"
echo ""
echo "📊 Rafraîchissez l'interface pour voir les prix: http://localhost:3000"
