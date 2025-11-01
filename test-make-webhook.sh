#!/usr/bin/env bash

# ═══════════════════════════════════════════════════════════════════
# 🧪 Test Make.com Webhook - ValueCollection
# ═══════════════════════════════════════════════════════════════════
# Description: Test complet du webhook Make.com avec payload réaliste
# Usage: ./test-make-webhook.sh [test_number]
# ═══════════════════════════════════════════════════════════════════

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WEBHOOK_URL="https://hook.us2.make.com/c13wdyjwsqtrcfablgyb2baiow108go1"
API_KEY="mk-value-collector-2025"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🧪 Test Make.com Webhook - ValueCollection                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Fonction pour générer un run_id unique
generate_run_id() {
    local date_part=$(date +%Y%m%d)
    local random_part=$(cat /dev/urandom | tr -dc 'A-Z0-9' | fold -w 5 | head -n 1)
    echo "vc-${date_part}-${random_part}"
}

# Fonction pour obtenir le timestamp UTC
get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Fonction pour tester un payload
test_webhook() {
    local test_name="$1"
    local payload="$2"
    
    echo -e "${YELLOW}📤 Test: ${test_name}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Afficher le payload (formaté)
    echo -e "${BLUE}Payload:${NC}"
    echo "$payload" | jq '.'
    echo ""
    
    # Envoyer la requête
    echo -e "${YELLOW}Envoi vers Make.com...${NC}"
    response=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -H "x-make-apikey: $API_KEY" \
        -d "$payload")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    # Analyser la réponse
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ] || [ "$http_code" -eq 202 ]; then
        echo -e "${GREEN}✅ Succès (HTTP $http_code)${NC}"
        if [ -n "$body" ]; then
            echo -e "${GREEN}Réponse:${NC}"
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        fi
    else
        echo -e "${RED}❌ Échec (HTTP $http_code)${NC}"
        echo -e "${RED}Réponse:${NC}"
        echo "$body"
    fi
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════
# Test 1: Livre Complet (avec prix estimés)
# ═══════════════════════════════════════════════════════════════════

test1_payload=$(cat <<EOF
{
  "run_id": "$(generate_run_id)",
  "timestamp": "$(get_timestamp)",
  "source": "GenSpark_AI_Collector",
  "photo_url": "https://example.com/photo1.jpg",

  "titre": "1984",
  "auteur": "George Orwell",
  "editeur": "Signet / Penguin",
  "annee": 1949,
  "ISBN_10": "0451524934",
  "ISBN_13": "9780451524935",
  "etat": "Very Good",
  "notes": "Édition poche propre, légères marques d'usure",

  "prix_estime_cad": 22.5,
  "prix_min_cad": 19.0,
  "prix_max_cad": 25.0,
  "devise_source": "CAD",
  "prix_confiance": 0.9,
  "comps_count": 6,
  "prix_source": "eBay sold",

  "ebay_url_top": "https://www.ebay.ca/itm/123456789",

  "cout_acquisition_cad": 15.0,
  "date_acquisition": "2025-10-28",
  "emplacement": "Étagère A-3",
  "proprietaire": "Mathieu",
  "plateforme_vente": "eBay",
  "prix_affichage_cad": 24.99,
  "statut_vente": "À lister",

  "hash_fichier": "sha256:abc123def456",
  "agent": "ValueCollection v2.1"
}
EOF
)

# ═══════════════════════════════════════════════════════════════════
# Test 2: Livre D&D (sans prix, à estimer)
# ═══════════════════════════════════════════════════════════════════

test2_payload=$(cat <<EOF
{
  "run_id": "$(generate_run_id)",
  "timestamp": "$(get_timestamp)",
  "source": "GenSpark_AI_Collector",
  "photo_url": "",

  "titre": "The Art of Advanced Dungeons & Dragons",
  "auteur": "Jeff Easley, Larry Elmore",
  "editeur": "Wizards of the Coast",
  "annee": 1989,
  "ISBN_10": "",
  "ISBN_13": "9780880386050",
  "etat": "Good",
  "notes": "Livre de collection, couverture rigide",

  "prix_estime_cad": 0.0,
  "prix_min_cad": 0.0,
  "prix_max_cad": 0.0,
  "devise_source": "CAD",
  "prix_confiance": 0.1,
  "comps_count": 0,
  "prix_source": "estimation interne",

  "ebay_url_top": "",

  "cout_acquisition_cad": 0.0,
  "date_acquisition": "",
  "emplacement": "",
  "proprietaire": "Mathieu",
  "plateforme_vente": "eBay",
  "prix_affichage_cad": 0.0,
  "statut_vente": "À lister",

  "hash_fichier": "",
  "agent": "ValueCollection v2.1"
}
EOF
)

# ═══════════════════════════════════════════════════════════════════
# Test 3: Livre Minimal (données incomplètes)
# ═══════════════════════════════════════════════════════════════════

test3_payload=$(cat <<EOF
{
  "run_id": "$(generate_run_id)",
  "timestamp": "$(get_timestamp)",
  "source": "GenSpark_AI_Collector",
  "photo_url": "",

  "titre": "Livre Sans Titre Clair",
  "auteur": "",
  "editeur": "",
  "annee": 0,
  "ISBN_10": "",
  "ISBN_13": "",
  "etat": "Good",
  "notes": "Informations insuffisantes pour identification complète",

  "prix_estime_cad": 0.0,
  "prix_min_cad": 0.0,
  "prix_max_cad": 0.0,
  "devise_source": "CAD",
  "prix_confiance": 0.05,
  "comps_count": 0,
  "prix_source": "estimation interne",

  "ebay_url_top": "",

  "cout_acquisition_cad": 0.0,
  "date_acquisition": "",
  "emplacement": "",
  "proprietaire": "Mathieu",
  "plateforme_vente": "eBay",
  "prix_affichage_cad": 0.0,
  "statut_vente": "À lister",

  "hash_fichier": "",
  "agent": "ValueCollection v2.1"
}
EOF
)

# ═══════════════════════════════════════════════════════════════════
# Exécution des Tests
# ═══════════════════════════════════════════════════════════════════

if [ $# -eq 0 ]; then
    # Exécuter tous les tests
    test_webhook "Livre Complet (1984)" "$test1_payload"
    sleep 2
    test_webhook "Livre D&D (sans prix)" "$test2_payload"
    sleep 2
    test_webhook "Livre Minimal (données incomplètes)" "$test3_payload"
else
    # Exécuter un test spécifique
    case $1 in
        1)
            test_webhook "Livre Complet (1984)" "$test1_payload"
            ;;
        2)
            test_webhook "Livre D&D (sans prix)" "$test2_payload"
            ;;
        3)
            test_webhook "Livre Minimal (données incomplètes)" "$test3_payload"
            ;;
        *)
            echo -e "${RED}❌ Test invalide. Utilisez: ./test-make-webhook.sh [1-3]${NC}"
            exit 1
            ;;
    esac
fi

# ═══════════════════════════════════════════════════════════════════
# Résumé
# ═══════════════════════════════════════════════════════════════════

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Tests terminés                                            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Vérifications à faire:${NC}"
echo "  1. Consulter Google Sheets 'CollectorValue_Apps'"
echo "  2. Vérifier que les 3 lignes sont ajoutées"
echo "  3. Valider le mapping des colonnes"
echo ""
echo -e "${BLUE}🔗 Ressources:${NC}"
echo "  - Documentation: GENSPARK_COLLECTOR_PROMPT.md"
echo "  - API: EXCEL_EXPORT_AUTOMATION.md"
echo "  - Webhook: Make.com scenario"
echo ""
