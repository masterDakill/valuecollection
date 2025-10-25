#!/usr/bin/env bash
#
# Analyse une seule photo en utilisant un fichier temporaire pour éviter "argument list too long"
# Usage: ./analyze-single-photo.sh <chemin-photo>
#
set -euo pipefail

PHOTO_PATH="$1"
API_URL="http://localhost:3000"

if [ ! -f "$PHOTO_PATH" ]; then
    echo "❌ Fichier '$PHOTO_PATH' introuvable"
    exit 1
fi

echo "📸 Analyse de: $PHOTO_PATH"
echo ""

# Convertir en base64
echo "🔄 Conversion en base64..."
BASE64_IMG=$(base64 -i "$PHOTO_PATH" | tr -d '\n')

# Créer fichier JSON temporaire
TEMP_JSON=$(mktemp)
cat > "$TEMP_JSON" <<EOF
{
  "imageBase64": "data:image/jpeg;base64,$BASE64_IMG",
  "options": {
    "maxItems": 10,
    "collectionId": 1,
    "useCache": false
  }
}
EOF

echo "🚀 Envoi à l'API..."
echo ""

# Envoyer avec fichier
curl -s -X POST "$API_URL/api/photos/analyze" \
  -H 'Content-Type: application/json' \
  --data-binary "@$TEMP_JSON" | jq '.'

# Nettoyer
rm -f "$TEMP_JSON"

echo ""
echo "✅ Terminé!"
