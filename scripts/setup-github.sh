#!/bin/bash
# Script de configuration GitHub pour l'Évaluateur de Collection Pro

echo "🔧 Configuration GitHub - Évaluateur de Collection Pro"
echo "=================================================="

# Vérifier si git est configuré
if ! git config --get user.name > /dev/null; then
    echo "📝 Configuration Git utilisateur..."
    echo -n "Entrez votre nom GitHub: "
    read GIT_NAME
    git config --global user.name "$GIT_NAME"
    
    echo -n "Entrez votre email GitHub: "
    read GIT_EMAIL
    git config --global user.email "$GIT_EMAIL"
fi

# Vérifier si le repo est initialisé
if [ ! -d ".git" ]; then
    echo "🔄 Initialisation du repository Git..."
    git init
    git add .
    git commit -m "Initial commit - Évaluateur de Collection Pro"
fi

echo "🔑 Configuration du token GitHub..."
echo "1. Allez sur: https://github.com/settings/tokens"
echo "2. Créez un nouveau token (classic)"
echo "3. Sélectionnez les permissions: repo, workflow, write:packages"
echo "4. Copiez le token généré"
echo ""

echo -n "Entrez votre token GitHub (ghp_...): "
read -s GITHUB_TOKEN
echo ""

echo -n "Entrez votre nom d'utilisateur GitHub: "
read GITHUB_USERNAME

# Configuration du remote
echo "🔗 Configuration du repository distant..."
REPO_NAME="evaluateur-collection-pro"

# Supprimer remote existant si présent
git remote remove origin 2>/dev/null || true

# Ajouter le nouveau remote avec token
git remote add origin https://${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${REPO_NAME}.git

# Créer la branche main si nécessaire
if [ $(git branch --show-current) != "main" ]; then
    git branch -M main
fi

echo "📤 Push initial vers GitHub..."
git push -u origin main

echo ""
echo "✅ Configuration GitHub terminée !"
echo "📋 Prochaines étapes:"
echo ""
echo "1. 🌐 Allez sur: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
echo "2. ⚙️  Settings → Secrets and variables → Actions"
echo "3. 🔑 Ajoutez ces secrets:"
echo "   - CLOUDFLARE_API_TOKEN (de Cloudflare)"
echo "   - CLOUDFLARE_ACCOUNT_ID (de Cloudflare)" 
echo ""
echo "4. 🚀 Le déploiement automatique sera activé sur chaque push !"
echo ""
echo "📊 URLs importantes:"
echo "   - Repository: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
echo "   - Actions: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/actions"
echo "   - Production: https://evaluateur-collection-pro.pages.dev"