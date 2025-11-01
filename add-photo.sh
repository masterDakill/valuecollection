#!/bin/bash
# Script ultra-simplifié: Ajoute une photo (HEIC/JPG) à votre collection
# Gère automatiquement la conversion et compression
# Usage: ./add-photo.sh photo.heic

if [ $# -lt 1 ]; then
    echo "Usage: $0 photo.heic [photo2.heic ...]"
    exit 1
fi

SERVER_URL="http://127.0.0.1:3000"

for INPUT_FILE in "$@"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📸 Traitement: $(basename "$INPUT_FILE")"

    if [ ! -f "$INPUT_FILE" ]; then
        echo "❌ Fichier introuvable"
        continue
    fi

    # Nom de fichier temporaire
    TEMP_JPG="/tmp/book_photo_$(date +%s).jpg"

    # Détecter le format et convertir si nécessaire
    if [[ "$INPUT_FILE" =~ \.(heic|HEIC|heif|HEIF)$ ]]; then
        echo "🔄 Conversion HEIC → JPEG..."
        sips -s format jpeg -s formatOptions 40 "$INPUT_FILE" --out "$TEMP_JPG" >/dev/null 2>&1
    else
        # Déjà JPEG, mais compresser quand même pour être sous 1MB
        echo "🔄 Compression JPEG..."
        sips -s format jpeg -s formatOptions 40 "$INPUT_FILE" --out "$TEMP_JPG" >/dev/null 2>&1
    fi

    FILE_SIZE=$(du -h "$TEMP_JPG" | cut -f1)
    echo "   ✅ Photo prête ($FILE_SIZE)"

    # Analyser
    echo "🔍 Analyse avec GPT-4o Vision..."
    ./analyze-single-photo.sh "$TEMP_JPG" | grep -E '(success|total_detected|title)' | head -20

    # Nettoyage
    rm -f "$TEMP_JPG"
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Traitement terminé!"
echo "📊 Voir vos livres: http://127.0.0.1:3000"
echo "📥 Exporter Excel: npm run db:export"
