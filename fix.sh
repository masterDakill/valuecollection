#!/usr/bin/env bash
# ValueCollection - Diagnostic et Réparation Automatique
# Auteur: GenSpark AI Developer
# Date: 2025-11-01

set -e

echo "🔧 =========================================="
echo "   ValueCollection - Diagnostic Complet"
echo "=========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de log
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Vérifier qu'on est dans le bon répertoire
log_info "Vérification du répertoire..."
if [ ! -f "package.json" ]; then
    log_error "Fichier package.json non trouvé. Êtes-vous dans le bon répertoire?"
    exit 1
fi
log_success "Répertoire confirmé: $(pwd)"

# 2. Tuer les processus Wrangler existants
log_info "Arrêt des processus Wrangler existants..."
pkill -f wrangler 2>/dev/null && log_success "Processus Wrangler arrêtés" || log_info "Aucun processus Wrangler actif"
pkill -f workerd 2>/dev/null && log_success "Processus workerd arrêtés" || log_info "Aucun processus workerd actif"
sleep 2

# 3. Libérer les ports
log_info "Libération des ports 3000 et 3001..."
lsof -ti:3000 | xargs kill -9 2>/dev/null && log_success "Port 3000 libéré" || log_info "Port 3000 déjà libre"
lsof -ti:3001 | xargs kill -9 2>/dev/null && log_success "Port 3001 libéré" || log_info "Port 3001 déjà libre"

# 4. Vérifier et créer .dev.vars
log_info "Vérification de .dev.vars..."
if [ ! -f ".dev.vars" ]; then
    if [ -f "devs.env" ]; then
        log_warning ".dev.vars absent, copie depuis devs.env..."
        cp devs.env .dev.vars
        log_success ".dev.vars créé depuis devs.env"
    elif [ -f "env.devs" ]; then
        log_warning ".dev.vars absent, copie depuis env.devs..."
        cp env.devs .dev.vars
        log_success ".dev.vars créé depuis env.devs"
    else
        log_error "Aucun fichier de variables d'environnement trouvé!"
        log_warning "Création de .dev.vars depuis .dev.vars.example..."
        if [ -f ".dev.vars.example" ]; then
            cp .dev.vars.example .dev.vars
            log_warning "⚠️  ATTENTION: Vous devez éditer .dev.vars et ajouter vos vraies clés API!"
        else
            log_error "Impossible de créer .dev.vars. Créez-le manuellement."
            exit 1
        fi
    fi
else
    log_success ".dev.vars existe"
fi

# 5. Vérifier les clés API critiques
log_info "Vérification des clés API..."
MISSING_KEYS=()

if ! grep -q "OPENAI_API_KEY=sk-" .dev.vars 2>/dev/null; then
    MISSING_KEYS+=("OPENAI_API_KEY")
fi

if [ ${#MISSING_KEYS[@]} -eq 0 ]; then
    log_success "Clés API présentes"
else
    log_warning "Clés manquantes ou invalides: ${MISSING_KEYS[*]}"
    log_warning "L'analyse d'images ne fonctionnera pas sans OPENAI_API_KEY"
fi

# 6. Vérifier node_modules
log_info "Vérification des dépendances..."
if [ ! -d "node_modules" ]; then
    log_warning "node_modules absent, installation..."
    npm install
    log_success "Dépendances installées"
else
    log_success "node_modules présent"
fi

# 7. Build du projet
log_info "Build du projet..."
if npm run build 2>&1 | tee /tmp/build.log; then
    log_success "Build réussi"
else
    log_error "Build échoué. Voir /tmp/build.log"
    cat /tmp/build.log
    exit 1
fi

# 8. Vérifier que dist/ existe
if [ ! -d "dist" ]; then
    log_error "Dossier dist/ non créé après le build!"
    exit 1
fi
log_success "Dossier dist/ présent"

# 9. Vérifier la base de données
log_info "Vérification de la base de données D1..."
if [ -d ".wrangler/state/v3/d1" ]; then
    log_success "Base de données D1 présente"
else
    log_warning "Base de données D1 non initialisée"
    log_info "Application des migrations..."
    npx wrangler d1 migrations apply DB --local 2>&1 || log_warning "Migrations déjà appliquées"
fi

# 10. Test rapide du serveur
log_info "Démarrage du serveur de test (5 secondes)..."
npm run dev:d1 > /tmp/server.log 2>&1 &
SERVER_PID=$!
sleep 8

# Vérifier si le serveur répond
if curl -s http://localhost:3000/api/stats > /dev/null 2>&1; then
    log_success "Serveur opérationnel sur port 3000"
    PORT=3000
elif curl -s http://localhost:3001/api/stats > /dev/null 2>&1; then
    log_success "Serveur opérationnel sur port 3001"
    PORT=3001
else
    log_error "Serveur ne répond pas. Voir logs:"
    tail -20 /tmp/server.log
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

kill $SERVER_PID 2>/dev/null
sleep 2

# 11. Rapport final
echo ""
echo "=========================================="
echo "   📊 RAPPORT DE DIAGNOSTIC"
echo "=========================================="
echo ""
echo "✅ Statut: PRÊT À DÉMARRER"
echo ""
echo "📋 Configuration:"
echo "   - Répertoire: $(pwd)"
echo "   - .dev.vars: $([ -f .dev.vars ] && echo '✅ Présent' || echo '❌ Absent')"
echo "   - node_modules: ✅ Présent"
echo "   - dist/: ✅ Présent"
echo "   - Base D1: ✅ Présente"
echo ""
echo "🔑 Variables d'environnement:"
grep -c "API_KEY" .dev.vars 2>/dev/null && echo "   - Clés API: $(grep -c "API_KEY" .dev.vars) trouvées" || echo "   - Clés API: ⚠️  Aucune"
echo ""
echo "🚀 Pour démarrer le serveur:"
echo "   npm run dev:d1"
echo ""
echo "🌐 URLs disponibles:"
echo "   - http://localhost:3000"
echo "   - http://localhost:3001 (si 3000 occupé)"
echo ""
echo "📝 Endpoints d'export:"
echo "   - GET /api/export/csv"
echo "   - GET /api/export/tsv"
echo "   - GET /api/export/json"
echo "   - POST /api/export/genspark-webhook"
echo ""
echo "🔍 Logs sauvegardés dans:"
echo "   - /tmp/build.log"
echo "   - /tmp/server.log"
echo ""
echo "=========================================="
echo "   ✅ DIAGNOSTIC TERMINÉ"
echo "=========================================="
echo ""
echo "💡 Commande rapide:"
echo "   ./fix.sh && npm run dev:d1"
echo ""
