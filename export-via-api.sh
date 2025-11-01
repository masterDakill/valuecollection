#!/bin/bash

# Script d'export via l'API (fonctionne en local et production)
# Usage: ./export-via-api.sh [url] [nom-fichier]

API_URL="${1:-http://127.0.0.1:3000}"
EXPORT_FILE="${2:-export_collection_$(date +%Y%m%d_%H%M%S).csv}"

echo "📊 Export de la collection via l'API..."
echo "🌐 URL API: $API_URL"
echo "📁 Fichier de sortie: $EXPORT_FILE"

# Récupération des données via l'API
RESPONSE=$(curl -s "$API_URL/api/items")

if [ $? -ne 0 ]; then
    echo "❌ Erreur: Impossible de se connecter à l'API"
    echo "   Vérifiez que le serveur est démarré: npm run dev:d1"
    exit 1
fi

# Conversion JSON vers CSV avec jq
echo "$RESPONSE" | jq -r '
    # En-têtes
    ["ID", "Titre", "Auteur", "Éditeur", "ISBN-13", "Année", "Pages", "Langue", "Genres", "État", "Valeur estimée", "Catégorie", "Date ajout"]
    ,
    # Données
    (.items[] | [
        .id,
        .title,
        .artist_author // "",
        .publisher_label // "",
        .isbn_13 // .isbn // "",
        .year // .year_made // "",
        .page_count // "",
        .language // "",
        .genres // "",
        .condition_grade // "",
        .estimated_value // "",
        .category,
        .created_at
    ])
    | @csv
' > "$EXPORT_FILE"

if [ $? -eq 0 ]; then
    COUNT=$(wc -l < "$EXPORT_FILE")
    echo "✅ Export réussi!"
    echo "📊 Nombre de livres exportés: $((COUNT - 1))"
    echo "📁 Fichier: $EXPORT_FILE"
    echo ""
    echo "💡 Pour ouvrir dans Excel:"
    echo "   - Double-cliquez sur $EXPORT_FILE"
    echo "   - Ou: open $EXPORT_FILE"
else
    echo "❌ Erreur lors de la conversion"
    echo "   Note: Ce script nécessite 'jq' (brew install jq)"
    exit 1
fi
