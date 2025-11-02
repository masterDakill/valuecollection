#!/bin/bash

###############################################################################
# Script de démarrage automatique - Évaluateur Collection Pro
###############################################################################

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Évaluateur Collection Pro - Démarrage automatique        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: package.json non trouvé${NC}"
    echo -e "${YELLOW}   Veuillez exécuter ce script depuis /home/user/webapp${NC}"
    exit 1
fi

# Configuration
PORT=${PORT:-8790}
EBAY_TOKEN="v^1.1#i^1#f^0#p^3#r^1#I^3#t^Ul4xMF84OkRGOEJDNkNBMDU5RjNDMDRGMjdGMDU3QjIwNDBDMjczXzFfMSNFXjEyODQ="
MAX_RETRIES=30
RETRY_DELAY=2

echo -e "${YELLOW}📋 Configuration:${NC}"
echo -e "   Port: ${GREEN}${PORT}${NC}"
echo -e "   Répertoire: ${GREEN}$(pwd)${NC}"
echo ""

# Fonction pour tuer les processus existants
cleanup() {
    echo -e "${YELLOW}🧹 Nettoyage des processus existants...${NC}"
    
    # Tuer workerd sur le port
    if lsof -ti:${PORT} > /dev/null 2>&1; then
        echo -e "   Arrêt du serveur sur le port ${PORT}..."
        fuser -k ${PORT}/tcp 2>/dev/null || true
        sleep 2
    fi
    
    # Tuer tous les workerd en cours
    if pgrep -x workerd > /dev/null 2>&1; then
        echo -e "   Arrêt des processus workerd..."
        pkill -9 workerd 2>/dev/null || true
        sleep 1
    fi
    
    echo -e "${GREEN}✅ Nettoyage terminé${NC}"
    echo ""
}

# Fonction pour vérifier si le serveur est prêt
check_server() {
    local url=$1
    local max_attempts=$2
    local attempt=1
    
    echo -e "${YELLOW}⏳ Attente du démarrage du serveur...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "${url}/api/stats" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Serveur prêt !${NC}"
            return 0
        fi
        
        echo -e "   Tentative ${attempt}/${max_attempts}..."
        sleep ${RETRY_DELAY}
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ Timeout: Le serveur n'a pas démarré${NC}"
    return 1
}

# Fonction pour injecter le token eBay
inject_ebay_token() {
    local url=$1
    
    echo -e "${YELLOW}🔑 Injection du User Token eBay...${NC}"
    
    local response=$(curl -s -X POST "${url}/api/ads-publish/ebay/set-user-token" \
        -H "Content-Type: application/json" \
        -d "{\"token\": \"${EBAY_TOKEN}\", \"expiresIn\": 157680000}")
    
    if echo "$response" | grep -q '"success":true'; then
        local expires=$(echo "$response" | grep -o '"expiresAt":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}✅ Token eBay configuré !${NC}"
        echo -e "   Expire: ${expires}"
        return 0
    else
        echo -e "${RED}❌ Erreur lors de l'injection du token${NC}"
        echo -e "   Réponse: $response"
        return 1
    fi
}

# Fonction pour afficher le statut
show_status() {
    local url=$1
    
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    🎉 Système prêt !                         ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}📍 URL locale:${NC}      http://localhost:${PORT}"
    echo -e "${GREEN}📍 URL publique:${NC}    Utilisez GetServiceUrl avec le port ${PORT}"
    echo ""
    echo -e "${YELLOW}📊 Endpoints disponibles:${NC}"
    echo -e "   • ${url}/api/stats              (Statistiques)"
    echo -e "   • ${url}/api/items              (Liste des livres)"
    echo -e "   • ${url}/api/ads-publish/list   (Annonces créées)"
    echo -e "   • ${url}/                       (Interface web)"
    echo ""
    echo -e "${YELLOW}🔧 Fonctionnalités activées:${NC}"
    echo -e "   ✅ Base de données D1"
    echo -e "   ✅ Analyse IA (OpenAI, Anthropic, Gemini)"
    echo -e "   ✅ Génération d'annonces"
    echo -e "   ✅ Publication eBay (Sandbox)"
    echo -e "   ✅ Token eBay injecté automatiquement"
    echo ""
    echo -e "${YELLOW}📝 Pour arrêter:${NC}"
    echo -e "   • Ctrl+C dans ce terminal"
    echo -e "   • Ou: ${BLUE}fuser -k ${PORT}/tcp${NC}"
    echo ""
    echo -e "${GREEN}🚀 Prêt à tester !${NC}"
    echo ""
}

# Nettoyer les processus existants
cleanup

# Construire l'application
echo -e "${YELLOW}🔨 Construction de l'application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de la construction${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build réussi${NC}"
echo ""

# Démarrer le serveur en arrière-plan
echo -e "${YELLOW}🚀 Démarrage du serveur Wrangler sur le port ${PORT}...${NC}"
npx wrangler pages dev dist --local --ip 0.0.0.0 --port ${PORT} --persist-to .wrangler/state > /tmp/wrangler.log 2>&1 &
WRANGLER_PID=$!

echo -e "   PID: ${WRANGLER_PID}"
echo ""

# Attendre que le serveur soit prêt
if ! check_server "http://localhost:${PORT}" ${MAX_RETRIES}; then
    echo -e "${RED}❌ Le serveur n'a pas démarré correctement${NC}"
    echo -e "${YELLOW}📋 Logs:${NC}"
    tail -20 /tmp/wrangler.log
    exit 1
fi

# Petite pause pour s'assurer que tout est stable
sleep 2

# Injecter le token eBay
if ! inject_ebay_token "http://localhost:${PORT}"; then
    echo -e "${YELLOW}⚠️  Attention: Token eBay non configuré${NC}"
    echo -e "   Vous pouvez le configurer manuellement plus tard"
fi

# Afficher le statut
show_status "http://localhost:${PORT}"

# Garder le script actif et surveiller le serveur
echo -e "${BLUE}📡 Surveillance du serveur (Ctrl+C pour arrêter)...${NC}"
echo ""

# Fonction pour gérer l'arrêt propre
trap "echo ''; echo -e '${YELLOW}🛑 Arrêt du serveur...${NC}'; kill $WRANGLER_PID 2>/dev/null; cleanup; exit 0" INT TERM

# Surveiller le processus
while kill -0 $WRANGLER_PID 2>/dev/null; do
    sleep 5
done

echo -e "${RED}❌ Le serveur s'est arrêté de manière inattendue${NC}"
echo -e "${YELLOW}📋 Derniers logs:${NC}"
tail -50 /tmp/wrangler.log
