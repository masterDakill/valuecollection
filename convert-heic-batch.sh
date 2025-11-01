#!/bin/bash
# Script de conversion HEIC vers JPEG en batch (macOS)
# Usage: ./convert-heic-batch.sh /chemin/vers/dossier/*.heic
# Ou: ./convert-heic-batch.sh fichier1.heic fichier2.heic fichier3.heic

if [ $# -lt 1 ]; then
    echo "Usage: $0 fichier1.heic [fichier2.heic ...]"
    echo "Ou: $0 /chemin/vers/dossier/*.heic"
    echo ""
    echo "Convertit plusieurs fichiers HEIC en JPEG"
    exit 1
fi

echo "🚀 Conversion HEIC Batch"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOTAL=$#
SUCCESS=0
FAILED=0
SKIPPED=0

for INPUT in "$@"; do
    # Skip if file doesn't exist
    if [ ! -f "$INPUT" ]; then
        echo "⏭️  Ignoré (introuvable): $INPUT"
        ((SKIPPED++))
        continue
    fi

    # Skip if file is empty (0 bytes)
    if [ ! -s "$INPUT" ]; then
        echo "⏭️  Ignoré (fichier vide): $INPUT"
        ((SKIPPED++))
        continue
    fi

    # Generate output filename
    OUTPUT="${INPUT%.heic}.jpg"
    OUTPUT="${OUTPUT%.HEIC}.jpg"
    OUTPUT="${OUTPUT%.heif}.jpg"
    OUTPUT="${OUTPUT%.HEIF}.jpg"

    # Skip if output already exists
    if [ -f "$OUTPUT" ]; then
        echo "⏭️  Existe déjà: $(basename "$OUTPUT")"
        ((SKIPPED++))
        continue
    fi

    echo "🔄 Conversion: $(basename "$INPUT")"

    # Convert using sips (macOS)
    sips -s format jpeg -s formatOptions 80 "$INPUT" --out "$OUTPUT" >/dev/null 2>&1

    if [ $? -eq 0 ]; then
        INPUT_SIZE=$(du -h "$INPUT" | cut -f1)
        OUTPUT_SIZE=$(du -h "$OUTPUT" | cut -f1)
        echo "   ✅ $INPUT_SIZE → $OUTPUT_SIZE"
        ((SUCCESS++))
    else
        echo "   ❌ Erreur de conversion"
        ((FAILED++))
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Résumé:"
echo "   Total:    $TOTAL fichiers"
echo "   ✅ Succès: $SUCCESS"
echo "   ❌ Échecs:  $FAILED"
echo "   ⏭️  Ignorés: $SKIPPED"
echo ""

if [ $SUCCESS -gt 0 ]; then
    echo "🎉 $SUCCESS fichiers JPEG créés avec succès!"
fi
