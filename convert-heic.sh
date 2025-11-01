#!/bin/bash
# Script de conversion HEIC vers JPEG (macOS uniquement)
# Usage: ./convert-heic.sh input.heic [output.jpg]

if [ $# -lt 1 ]; then
    echo "Usage: $0 input.heic [output.jpg]"
    echo "Convertit un fichier HEIC en JPEG"
    exit 1
fi

INPUT="$1"
OUTPUT="${2:-${INPUT%.heic}.jpg}"

if [ ! -f "$INPUT" ]; then
    echo "❌ Fichier introuvable: $INPUT"
    exit 1
fi

echo "🔄 Conversion HEIC → JPEG..."
echo "   Input:  $INPUT"
echo "   Output: $OUTPUT"

# Utilise sips (macOS) pour convertir
sips -s format jpeg -s formatOptions 80 "$INPUT" --out "$OUTPUT" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Conversion réussie!"
    echo "📁 Fichier créé: $OUTPUT"

    # Afficher les tailles
    INPUT_SIZE=$(du -h "$INPUT" | cut -f1)
    OUTPUT_SIZE=$(du -h "$OUTPUT" | cut -f1)
    echo "📊 Taille HEIC: $INPUT_SIZE → JPEG: $OUTPUT_SIZE"
else
    echo "❌ Erreur de conversion"
    echo "💡 Assurez-vous d'être sur macOS avec sips installé"
    exit 1
fi
