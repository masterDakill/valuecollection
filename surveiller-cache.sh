#!/bin/bash
# 📊 Script de Surveillance du Cache en Temps Réel
# Lance ce script pendant que tu importes tes livres !

clear

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     📊 SURVEILLANCE CACHE v2.1 - TEMPS RÉEL                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🔄 Rafraîchissement toutes les 5 secondes..."
echo "⏹️  Appuyez sur Ctrl+C pour arrêter"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

while true; do
    # Récupérer les stats
    RESPONSE=$(curl -s http://localhost:3000/api/cache/stats)

    # Vérifier si le serveur répond
    if [ $? -ne 0 ]; then
        echo "❌ Serveur non accessible sur http://localhost:3000"
        echo "   Lancez : npm run dev:d1"
        sleep 5
        continue
    fi

    # Parser le JSON
    SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

    if [ "$SUCCESS" != "true" ]; then
        echo "❌ Erreur lors de la récupération des stats"
        echo "$RESPONSE" | jq
        sleep 5
        continue
    fi

    # Extraire les données
    TOTAL_ENTRIES=$(echo "$RESPONSE" | jq -r '.cache_stats.total_entries')
    TOTAL_HITS=$(echo "$RESPONSE" | jq -r '.cache_stats.total_hits')
    HIT_RATE=$(echo "$RESPONSE" | jq -r '.cache_stats.hit_rate')
    CACHE_SIZE=$(echo "$RESPONSE" | jq -r '.cache_stats.cache_size_mb')
    PERFORMANCE=$(echo "$RESPONSE" | jq -r '.recommendations.current_performance')
    SAVINGS=$(echo "$RESPONSE" | jq -r '.recommendations.estimated_savings')

    # Calculer les économies estimées en dollars
    # Si hit_rate = 80%, on économise 80% de $72 = $57.60
    COST_WITHOUT_CACHE=72
    SAVINGS_DOLLARS=$(echo "scale=2; $COST_WITHOUT_CACHE * $HIT_RATE / 100" | bc)

    # Afficher
    clear
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║     📊 SURVEILLANCE CACHE v2.1 - TEMPS RÉEL                   ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "🕐 $(date '+%H:%M:%S')"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo ""

    # Entrées cache
    echo "💾 CACHE"
    echo "   Entrées totales      : $TOTAL_ENTRIES"
    echo "   Hits (réutilisations): $TOTAL_HITS"
    echo "   Taille               : ${CACHE_SIZE} MB"
    echo ""

    # Hit Rate avec couleur
    echo "📈 PERFORMANCE"
    if (( $(echo "$HIT_RATE >= 80" | bc -l) )); then
        echo "   Hit Rate : ${HIT_RATE}% ✅ EXCELLENT"
    elif (( $(echo "$HIT_RATE >= 60" | bc -l) )); then
        echo "   Hit Rate : ${HIT_RATE}% ⚠️  BON"
    else
        echo "   Hit Rate : ${HIT_RATE}% ❌ À AMÉLIORER"
    fi
    echo "   Status   : $PERFORMANCE"
    echo ""

    # Économies
    echo "💰 ÉCONOMIES ESTIMÉES (pour 3000 livres)"
    echo "   Sans cache : \$72.00"
    echo "   Avec cache : \$$(echo "scale=2; 72 - $SAVINGS_DOLLARS" | bc)"
    echo "   ════════════════════════════"
    echo "   ÉCONOMISÉ  : \$$SAVINGS_DOLLARS 🎉"
    echo ""

    # Progression visuelle
    echo "📊 PROGRESSION"

    # Calculer la largeur de la barre (sur 50 caractères)
    BAR_WIDTH=50
    FILLED=$(echo "scale=0; $HIT_RATE * $BAR_WIDTH / 100" | bc)
    EMPTY=$(echo "$BAR_WIDTH - $FILLED" | bc)

    # Générer la barre
    BAR=""
    for i in $(seq 1 $FILLED 2>/dev/null); do
        BAR="${BAR}█"
    done
    for i in $(seq 1 $EMPTY 2>/dev/null); do
        BAR="${BAR}░"
    done

    echo "   [$BAR] ${HIT_RATE}%"
    echo ""

    # Conseils
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    if (( $(echo "$HIT_RATE < 60" | bc -l) )); then
        echo "💡 CONSEIL : Le cache se remplit ! Continuez à importer pour"
        echo "   augmenter le hit rate et maximiser les économies."
    elif (( $(echo "$HIT_RATE < 80" | bc -l) )); then
        echo "💡 CONSEIL : Bon hit rate ! Continuez pour atteindre 80%+ et"
        echo "   maximiser les économies."
    else
        echo "🎉 BRAVO ! Hit rate optimal ! Vous économisez un maximum !"
    fi
    echo ""
    echo "🔄 Rafraîchissement toutes les 5 secondes..."
    echo "⏹️  Appuyez sur Ctrl+C pour arrêter"
    echo ""

    sleep 5
done
