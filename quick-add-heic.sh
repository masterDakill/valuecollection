#!/bin/bash

# Script tout-en-un: Convertit HEIC → JPEG et analyse automatiquement
# Usage: ./quick-add-heic.sh fichier.heic
# Ou: ./quick-add-heic.sh *.heic (pour plusieurs fichiers)

if [ $# -lt 1 ]; then
    echo "Usage: $0 fichier.heic [fichier2.heic ...]"
    echo ""
    echo "Ce script:"
    echo "  1. Convertit HEIC → JPEG"
    echo "  2. Analyse la photo avec l'API"
    echo "  3. Ajoute les livres détectés à la base de données"
    echo ""
    echo "Exemples:"
    echo "  $0 photo.heic"
    echo "  $0 *.heic"
    echo "  $0 /Users/Mathieu/Downloads/*.heic"
    exit 1
fi

SERVER_URL="http://127.0.0.1:3000"
TOTAL=$#
SUCCESS=0
FAILED=0

echo "📚 Quick Add HEIC - Conversion et Analyse Automatique"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Vérifier que le serveur est accessible
if ! curl -s "$SERVER_URL/api/items" > /dev/null 2>&1; then
    echo "❌ Erreur: Le serveur n'est pas accessible sur $SERVER_URL"
    echo "💡 Démarrez le serveur avec: npm run dev:d1"
    exit 1
fi

for HEIC_FILE in "$@"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📁 Fichier: $(basename "$HEIC_FILE")"

    # Vérifier que le fichier existe
    if [ ! -f "$HEIC_FILE" ]; then
        echo "❌ Fichier introuvable: $HEIC_FILE"
        ((FAILED++))
        echo ""
        continue
    fi

    # Vérifier que le fichier n'est pas vide
    if [ ! -s "$HEIC_FILE" ]; then
        echo "❌ Fichier vide: $HEIC_FILE"
        ((FAILED++))
        echo ""
        continue
    fi

    # Générer le nom du fichier JPEG
    JPEG_FILE="${HEIC_FILE%.heic}.jpg"
    JPEG_FILE="${JPEG_FILE%.HEIC}.jpg"
    JPEG_FILE="${JPEG_FILE%.heif}.jpg"
    JPEG_FILE="${JPEG_FILE%.HEIF}.jpg"

    # Étape 1: Conversion HEIC → JPEG
    echo "🔄 Étape 1/3: Conversion HEIC → JPEG..."

    if sips -s format jpeg -s formatOptions 90 "$HEIC_FILE" --out "$JPEG_FILE" >/dev/null 2>&1; then
        INPUT_SIZE=$(du -h "$HEIC_FILE" | cut -f1)
        OUTPUT_SIZE=$(du -h "$JPEG_FILE" | cut -f1)
        echo "   ✅ Converti: $INPUT_SIZE → $OUTPUT_SIZE"
    else
        echo "   ❌ Erreur de conversion"
        ((FAILED++))
        echo ""
        continue
    fi

    # Étape 2: Upload de l'image
    echo "📤 Étape 2/3: Upload de l'image..."

    # Encoder l'image en base64
    IMAGE_BASE64=$(base64 -i "$JPEG_FILE")

    # Créer le payload JSON
    PAYLOAD=$(cat <<EOF
{
    "image": "data:image/jpeg;base64,$IMAGE_BASE64",
    "collection_id": 1
}
EOF
)

    # Envoyer à l'API
    echo "   🔍 Analyse en cours avec GPT-4o Vision..."
    RESPONSE=$(curl -s -X POST "$SERVER_URL/api/photos/analyze" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD")

    # Vérifier la réponse
    if echo "$RESPONSE" | grep -q '"success":true'; then
        BOOKS_COUNT=$(echo "$RESPONSE" | grep -o '"books":\[[^]]*\]' | grep -o '{' | wc -l | tr -d ' ')
        echo "   ✅ Analyse réussie!"
        echo "   📚 Livres détectés: $BOOKS_COUNT"

        # Afficher les titres détectés
        echo "   📖 Titres:"
        echo "$RESPONSE" | jq -r '.books[]? | "      - \(.title // "Sans titre") par \(.artist_author // "Auteur inconnu")"' 2>/dev/null || echo "      (Détails non disponibles)"

        ((SUCCESS++))
    else
        echo "   ❌ Erreur d'analyse"
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error // .message // "Erreur inconnue"' 2>/dev/null || echo "Erreur inconnue")
        echo "   💬 Message: $ERROR_MSG"
        ((FAILED++))
    fi

    # Étape 3: Nettoyage (optionnel)
    echo "🧹 Étape 3/3: Nettoyage..."
    # Garder le JPEG pour référence, mais vous pouvez décommenter la ligne suivante pour le supprimer
    # rm -f "$JPEG_FILE"
    echo "   ℹ️  Fichier JPEG conservé: $(basename "$JPEG_FILE")"

    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Résumé Final:"
echo "   Total:     $TOTAL fichiers"
echo "   ✅ Succès:  $SUCCESS"
echo "   ❌ Échecs:   $FAILED"
echo ""

if [ $SUCCESS -gt 0 ]; then
    echo "🎉 $SUCCESS photo(s) traitée(s) avec succès!"
    echo ""
    echo "💡 Vérifiez vos livres:"
    echo "   • Interface web: $SERVER_URL"
    echo "   • Export Excel:  npm run db:export"
    echo "   • API:           curl $SERVER_URL/api/items"
fi

if [ $FAILED -gt 0 ]; then
    echo ""
    echo "⚠️  $FAILED photo(s) ont échoué"
    echo "💡 Vérifiez que le serveur est démarré: npm run dev:d1"
fi
