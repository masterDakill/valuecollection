#!/bin/bash

# Script d'export de la base de données D1 vers CSV (compatible Excel)
# Usage: ./export-to-excel.sh [nom-du-fichier]

EXPORT_FILE="${1:-export_collection_$(date +%Y%m%d_%H%M%S).csv}"

echo "📊 Export de la base de données D1 vers CSV..."
echo "📁 Fichier de sortie: $EXPORT_FILE"

# Utilise sqlite3 directement sur le fichier de base de données
DB_FILE=".wrangler/state/v3/d1/miniflare-D1DatabaseObject/7a794b549404a0ffda840c37e287f72dc177917ef8fe249a01e3f128a1c153f0.sqlite"

if [ ! -f "$DB_FILE" ]; then
    echo "❌ Erreur: Fichier de base de données introuvable"
    echo "   Chemin recherché: $DB_FILE"
    exit 1
fi

# Export en CSV avec en-têtes
sqlite3 "$DB_FILE" <<EOF
.headers on
.mode csv
.output $EXPORT_FILE
SELECT
    id,
    collection_id,
    title AS 'Titre',
    artist_author AS 'Auteur',
    publisher_label AS 'Éditeur',
    isbn,
    isbn_13,
    year AS 'Année',
    page_count AS 'Pages',
    language AS 'Langue',
    genres AS 'Genres',
    condition_grade AS 'État',
    estimated_value AS 'Valeur estimée',
    category AS 'Catégorie',
    description AS 'Description',
    primary_image_url AS 'Photo',
    created_at AS 'Date ajout',
    updated_at AS 'Dernière mise à jour'
FROM collection_items
ORDER BY created_at DESC;
.output stdout
EOF

if [ $? -eq 0 ]; then
    COUNT=$(wc -l < "$EXPORT_FILE")
    echo "✅ Export réussi!"
    echo "📊 Nombre de lignes exportées: $((COUNT - 1))" # -1 pour l'en-tête
    echo "📁 Fichier: $EXPORT_FILE"
    echo ""
    echo "💡 Pour ouvrir dans Excel:"
    echo "   - Double-cliquez sur $EXPORT_FILE"
    echo "   - Ou ouvrez Excel > Fichier > Ouvrir > Sélectionnez $EXPORT_FILE"
    echo ""
    echo "💡 Le fichier CSV peut aussi être ouvert avec:"
    echo "   - Numbers (Mac)"
    echo "   - Google Sheets (upload)"
    echo "   - LibreOffice Calc"
else
    echo "❌ Erreur lors de l'export"
    exit 1
fi
