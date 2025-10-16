#!/bin/bash
# Script de configuration des secrets Cloudflare Pages

echo "🔐 Configuration des secrets Cloudflare Pages..."

# Vérifier l'authentification
echo "Vérification de l'authentification Cloudflare..."
npx wrangler whoami

if [ $? -ne 0 ]; then
    echo "❌ Erreur: Non authentifié sur Cloudflare"
    echo "Exécutez d'abord: npx wrangler auth login"
    exit 1
fi

PROJECT_NAME="evaluateur-collection-pro"

echo "📝 Configuration des secrets pour le projet: $PROJECT_NAME"

# eBay API
echo "🔑 eBay API..."
echo -n "Entrez votre eBay Client ID: "
read EBAY_CLIENT_ID
echo $EBAY_CLIENT_ID | npx wrangler pages secret put EBAY_CLIENT_ID --project-name $PROJECT_NAME

echo -n "Entrez votre eBay Client Secret: "
read -s EBAY_CLIENT_SECRET
echo
echo $EBAY_CLIENT_SECRET | npx wrangler pages secret put EBAY_CLIENT_SECRET --project-name $PROJECT_NAME

# OpenAI API
echo "🤖 OpenAI API..."
echo -n "Entrez votre OpenAI API Key (sk-...): "
read -s OPENAI_API_KEY
echo
echo $OPENAI_API_KEY | npx wrangler pages secret put OPENAI_API_KEY --project-name $PROJECT_NAME

# Google Books API
echo "📚 Google Books API..."
echo -n "Entrez votre Google Books API Key: "
read GOOGLE_BOOKS_API_KEY
echo $GOOGLE_BOOKS_API_KEY | npx wrangler pages secret put GOOGLE_BOOKS_API_KEY --project-name $PROJECT_NAME

# WorthPoint API (optionnel)
echo "💎 WorthPoint API (optionnel, appuyez sur Entrée pour ignorer)..."
echo -n "Entrez votre WorthPoint API Key: "
read WORTHPOINT_API_KEY
if [ ! -z "$WORTHPOINT_API_KEY" ]; then
    echo $WORTHPOINT_API_KEY | npx wrangler pages secret put WORTHPOINT_API_KEY --project-name $PROJECT_NAME
fi

echo "✅ Configuration des secrets terminée !"
echo "📋 Vérification des secrets configurés:"
npx wrangler pages secret list --project-name $PROJECT_NAME