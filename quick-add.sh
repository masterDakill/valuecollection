#!/bin/bash
#
# Quick Add - Ajouter rapidement la dernière photo AirDrop
# Usage: ./quick-add.sh
#
set -euo pipefail

echo "🔍 Recherche de la dernière photo..."

# Trouver la dernière photo dans Downloads
LATEST=$(ls -t ~/Downloads/IMG_*.{jpg,jpeg,heic,HEIC,JPG,JPEG} 2>/dev/null | head -1 || echo "")

if [ -z "$LATEST" ]; then
  echo "❌ Aucune photo trouvée dans ~/Downloads"
  echo ""
  echo "Procédure:"
  echo "  1. Sur iPhone: Sélectionner photo → Partager → AirDrop"
  echo "  2. Choisir votre Mac"
  echo "  3. Relancer: ./quick-add.sh"
  exit 1
fi

echo "✅ Photo trouvée: $(basename "$LATEST")"
echo ""

# Copier dans dossier de travail
FILENAME=$(basename "$LATEST")
cp "$LATEST" ~/test_livre/

# Vérifier taille
SIZE=$(stat -f%z "$LATEST" 2>/dev/null || stat -c%s "$LATEST" 2>/dev/null)
SIZE_MB=$(echo "scale=1; $SIZE / 1048576" | bc)

echo "📏 Taille: ${SIZE_MB}MB"

# Si > 1MB, compresser
if [ "$SIZE" -gt 1048576 ]; then
  echo "🔄 Compression en cours (photo > 1MB)..."

  # Convertir HEIC en JPG si nécessaire
  if [[ "$FILENAME" == *.heic ]] || [[ "$FILENAME" == *.HEIC ]]; then
    FILENAME_JPG="${FILENAME%.*}.jpg"
    sips -s format jpeg ~/test_livre/"$FILENAME" --out ~/test_livre/"$FILENAME_JPG" >/dev/null 2>&1
    FILENAME="$FILENAME_JPG"
  fi

  # Compresser
  COMPRESSED="compressed_${FILENAME}"
  sips -s format jpeg -Z 1920 ~/test_livre/"$FILENAME" --out ~/test_livre/"$COMPRESSED" >/dev/null 2>&1

  NEW_SIZE=$(stat -f%z ~/test_livre/"$COMPRESSED" 2>/dev/null || stat -c%s ~/test_livre/"$COMPRESSED" 2>/dev/null)
  NEW_SIZE_KB=$(echo "scale=0; $NEW_SIZE / 1024" | bc)

  echo "✅ Compressée à ${NEW_SIZE_KB}KB"
  FILENAME="$COMPRESSED"
fi

echo ""
echo "🚀 Analyse en cours..."
echo ""

# Analyser
./analyze-single-photo.sh ~/test_livre/"$FILENAME"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Afficher résultats
echo "📊 Résultats:"
curl -s http://localhost:3000/api/photos | jq '.photos[-1] | {
  photo_id: .id,
  livres_detectes: .total_items_detected,
  status: .analysis_status,
  date: .uploaded_at
}'

echo ""
echo "📚 Livres détectés:"
PHOTO_ID=$(curl -s http://localhost:3000/api/photos | jq '.photos[-1].id')
curl -s http://localhost:3000/api/items | jq --argjson pid "$PHOTO_ID" '.items | map(select(.photo_id == $pid)) | .[] | {
  titre: .title,
  auteur: .artist_author
}'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Progression totale
TOTAL_PHOTOS=$(curl -s http://localhost:3000/api/photos | jq '.photos | length')
TOTAL_LIVRES=$(curl -s http://localhost:3000/api/photos | jq '.photos | map(.total_items_detected) | add // 0')

echo "📈 Progression Totale:"
echo "  Photos analysées: $TOTAL_PHOTOS"
echo "  Livres détectés: $TOTAL_LIVRES"

if [ "$TOTAL_LIVRES" -gt 0 ]; then
  PERCENT=$(echo "scale=1; ($TOTAL_LIVRES * 100) / 1500" | bc)
  echo "  Objectif 1500: ${PERCENT}%"
fi

echo ""
echo "✅ Prêt pour la prochaine photo!"
echo "   AirDrop → ./quick-add.sh"
