#!/usr/bin/env bash
#
# Script pour traiter vos photos de livres en batch
# Usage: ./process-books-batch.sh <dossier-photos>
#
set -euo pipefail

# Configuration
PORT=${PORT:-3000}
API_URL="http://localhost:$PORT"
MAX_ITEMS=${MAX_ITEMS:-10}  # Nombre max de livres par photo
COLLECTION_ID=${COLLECTION_ID:-1}
DELAY=${DELAY:-3}  # Délai entre chaque photo (secondes)

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Vérifications préalables
echo -e "${BLUE}==> Vérifications système${NC}"

# Vérifier que le serveur tourne
if ! curl -s "$API_URL/healthz" >/dev/null 2>&1; then
    echo -e "${RED}❌ Serveur non accessible sur $API_URL${NC}"
    echo "Démarrez le serveur avec: npm run dev:d1"
    exit 1
fi
echo -e "${GREEN}✓ Serveur accessible${NC}"

# Vérifier le dossier de photos
PHOTO_DIR="${1:-.}"
# Expansion du tilde (~) en chemin absolu
PHOTO_DIR="${PHOTO_DIR/#\~/$HOME}"
if [ ! -d "$PHOTO_DIR" ]; then
    echo -e "${RED}❌ Dossier '$PHOTO_DIR' introuvable${NC}"
    echo "Usage: $0 <dossier-photos>"
    echo ""
    echo "Exemples:"
    echo "  $0 ~/test_livre"
    echo "  $0 \$HOME/test_livre"
    echo "  $0 /Users/Mathieu/test_livre"
    exit 1
fi

# Compter les photos
PHOTO_COUNT=$(find "$PHOTO_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.heic" \) | wc -l | tr -d ' ')
if [ "$PHOTO_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ Aucune photo trouvée dans '$PHOTO_DIR'${NC}"
    echo "Formats supportés: JPG, JPEG, PNG, HEIC"
    exit 1
fi

echo -e "${GREEN}✓ $PHOTO_COUNT photos trouvées${NC}"
echo ""

# Demander confirmation
echo -e "${YELLOW}Configuration:${NC}"
echo "  Dossier: $PHOTO_DIR"
echo "  Photos: $PHOTO_COUNT"
echo "  Max livres/photo: $MAX_ITEMS"
echo "  Collection ID: $COLLECTION_ID"
echo "  Délai entre photos: ${DELAY}s"
echo ""
echo -e "${YELLOW}Coût estimé OpenAI: ~\$$(echo "scale=2; $PHOTO_COUNT * 0.01" | bc)${NC}"
echo ""

read -p "Continuer? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Annulé."
    exit 0
fi

# Créer un dossier pour les logs
LOG_DIR="./logs/batch-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$LOG_DIR"
echo -e "${BLUE}Logs: $LOG_DIR${NC}"
echo ""

# Compteurs
SUCCESS_COUNT=0
ERROR_COUNT=0
TOTAL_BOOKS=0

# Fichier de résumé
SUMMARY_FILE="$LOG_DIR/summary.json"
echo '{"processed":[],"errors":[],"stats":{}}' > "$SUMMARY_FILE"

# Fonction pour uploader une photo
upload_photo() {
    local photo_path="$1"
    local photo_name=$(basename "$photo_path")
    local log_file="$LOG_DIR/${photo_name}.log"

    echo -e "${BLUE}📸 Processing: $photo_name${NC}"

    # Convertir en base64 (limité à 1MB)
    local file_size=$(stat -f%z "$photo_path" 2>/dev/null || stat -c%s "$photo_path" 2>/dev/null)

    if [ "$file_size" -gt 1048576 ]; then
        echo -e "${YELLOW}⚠️  Photo > 1MB, compression recommandée${NC}"
        # Pour l'instant, on skip (peut être amélioré avec ImageMagick)
        echo "{\"error\":\"File too large: $file_size bytes\",\"file\":\"$photo_name\"}" >> "$LOG_DIR/errors.jsonl"
        return 1
    fi

    # Upload via base64
    local base64_data=$(base64 -i "$photo_path" | tr -d '\n')

    # Appel API
    local response=$(curl -s -X POST "$API_URL/api/photos/analyze" \
        -H "Content-Type: application/json" \
        -d "{
            \"imageBase64\": \"data:image/jpeg;base64,$base64_data\",
            \"options\": {
                \"maxItems\": $MAX_ITEMS,
                \"collectionId\": $COLLECTION_ID,
                \"useCache\": true
            }
        }" 2>&1)

    # Logger la réponse
    echo "$response" > "$log_file"

    # Vérifier le succès
    if echo "$response" | jq -e '.success == true' >/dev/null 2>&1; then
        local photo_id=$(echo "$response" | jq -r '.photo_id')
        local books_count=$(echo "$response" | jq -r '.total_detected')
        local cached=$(echo "$response" | jq -r '.cached')
        local processing_time=$(echo "$response" | jq -r '.processing_time_ms')

        echo -e "${GREEN}✓ Photo ID: $photo_id | Livres: $books_count | Temps: ${processing_time}ms${NC}"

        if [ "$cached" = "true" ]; then
            echo -e "${YELLOW}  (résultat en cache)${NC}"
        fi

        # Ajouter au résumé
        echo "$response" >> "$LOG_DIR/success.jsonl"

        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        TOTAL_BOOKS=$((TOTAL_BOOKS + books_count))
        return 0
    else
        local error_msg=$(echo "$response" | jq -r '.error.message // "Unknown error"')
        echo -e "${RED}✗ Erreur: $error_msg${NC}"
        echo "$response" >> "$LOG_DIR/errors.jsonl"
        ERROR_COUNT=$((ERROR_COUNT + 1))
        return 1
    fi
}

# Traiter toutes les photos
echo -e "${BLUE}==> Traitement des photos${NC}"
echo ""

CURRENT=0
while IFS= read -r photo; do
    CURRENT=$((CURRENT + 1))
    echo -e "${BLUE}[$CURRENT/$PHOTO_COUNT]${NC}"

    if upload_photo "$photo"; then
        # Succès
        true
    else
        # Erreur (déjà loggée)
        true
    fi

    # Délai entre photos (sauf dernière)
    if [ $CURRENT -lt $PHOTO_COUNT ]; then
        echo -e "${YELLOW}⏳ Attente ${DELAY}s...${NC}"
        sleep $DELAY
    fi

    echo ""
done < <(find "$PHOTO_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.heic" \))

# Résumé final
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}          RÉSUMÉ DU TRAITEMENT${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Photos traitées: $PHOTO_COUNT"
echo -e "${GREEN}Succès: $SUCCESS_COUNT${NC}"
echo -e "${RED}Erreurs: $ERROR_COUNT${NC}"
echo -e "${BLUE}Total livres détectés: $TOTAL_BOOKS${NC}"
echo ""

# Calculer le taux de réussite
if [ $PHOTO_COUNT -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=1; ($SUCCESS_COUNT * 100) / $PHOTO_COUNT" | bc)
    echo "Taux de réussite: ${SUCCESS_RATE}%"
fi

# Moyenne de livres par photo
if [ $SUCCESS_COUNT -gt 0 ]; then
    AVG_BOOKS=$(echo "scale=1; $TOTAL_BOOKS / $SUCCESS_COUNT" | bc)
    echo "Moyenne livres/photo: $AVG_BOOKS"
fi

echo ""
echo "Logs détaillés: $LOG_DIR"
echo ""

# Sauvegarder les stats finales
cat > "$SUMMARY_FILE" <<EOF
{
  "total_photos": $PHOTO_COUNT,
  "success_count": $SUCCESS_COUNT,
  "error_count": $ERROR_COUNT,
  "total_books_detected": $TOTAL_BOOKS,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "photo_directory": "$PHOTO_DIR",
  "log_directory": "$LOG_DIR"
}
EOF

# Afficher les prochaines étapes
echo -e "${BLUE}==> Prochaines étapes${NC}"
echo ""
echo "1. Voir tous les livres détectés:"
echo "   curl http://localhost:$PORT/api/items | jq '.items[] | select(.photo_id != null)'"
echo ""
echo "2. Voir les photos analysées:"
echo "   curl http://localhost:$PORT/api/photos | jq '.photos'"
echo ""
echo "3. Générer des annonces (TODO: à implémenter)"
echo ""
echo -e "${GREEN}✅ Traitement terminé!${NC}"
