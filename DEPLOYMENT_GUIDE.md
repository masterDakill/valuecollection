# 🚀 Guide de Déploiement - Évaluateur de Collection Pro

## 📋 Pré-requis

### 1. Comptes Requis
- **Compte Cloudflare** avec Pages et Workers activés
- **Comptes API** :
  - eBay Developers (https://developer.ebay.com/)
  - OpenAI API (https://platform.openai.com/api-keys)
  - Google Books API (https://developers.google.com/books)
  - WorthPoint API (partenariat requis)

### 2. Outils Locaux
```bash
npm install -g wrangler@latest
git --version
```

## 🔧 Configuration Étape par Étape

### Étape 1: Configuration Cloudflare
```bash
# Authentification Cloudflare
npx wrangler auth login

# Vérifier l'authentification
npx wrangler whoami
```

### Étape 2: Création Base de Données D1
```bash
# Créer la base de données
npx wrangler d1 create webapp-collections-db

# Copier l'ID retourné dans wrangler.jsonc
# Remplacer "your-database-id-here" par l'ID généré
```

### Étape 3: Configuration wrangler.jsonc
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "evaluateur-collection-pro",
  "main": "dist/_worker.js",
  "compatibility_date": "2024-10-01",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": "./dist",

  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "webapp-collections-db", 
      "database_id": "VOTRE_DATABASE_ID_ICI"
    }
  ]
}
```

### Étape 4: Migration Base de Données
```bash
# Appliquer les migrations en production
npx wrangler d1 migrations apply webapp-collections-db

# Optionnel: Insérer données de test
npx wrangler d1 execute webapp-collections-db --file=./seed.sql
```

### Étape 5: Configuration des Secrets
```bash
# API Keys (remplacer par vos vraies clés)
npx wrangler pages secret put EBAY_CLIENT_ID --project-name evaluateur-collection-pro
npx wrangler pages secret put EBAY_CLIENT_SECRET --project-name evaluateur-collection-pro
npx wrangler pages secret put OPENAI_API_KEY --project-name evaluateur-collection-pro
npx wrangler pages secret put GOOGLE_BOOKS_API_KEY --project-name evaluateur-collection-pro
```

### Étape 6: Build et Déploiement
```bash
# Build de production
npm run build

# Copier assets statiques
cp -r public/* dist/

# Créer projet Cloudflare Pages (première fois seulement)
npx wrangler pages project create evaluateur-collection-pro \\
  --production-branch main \\
  --compatibility-date 2024-10-01

# Déploiement
npx wrangler pages deploy dist --project-name evaluateur-collection-pro
```

## 🔍 Vérification du Déploiement

### URLs de Production
- **Application** : `https://evaluateur-collection-pro.pages.dev`
- **API Test** : `https://evaluateur-collection-pro.pages.dev/api/stats`

### Tests Post-Déploiement
```bash
# Test de l'API
curl https://evaluateur-collection-pro.pages.dev/api/stats

# Test de l'interface
curl -I https://evaluateur-collection-pro.pages.dev/
```

### Vérification Base de Données
```bash
# Test requête DB
npx wrangler d1 execute webapp-collections-db \\
  --command="SELECT COUNT(*) as total FROM collections"
```

## ⚙️ Configuration des APIs Externes

### eBay API
1. Aller sur https://developer.ebay.com/
2. Créer une application
3. Obtenir `Client ID` et `Client Secret`
4. Configurer pour le marché canadien (EBAY_CA)

### OpenAI API  
1. Créer compte sur https://platform.openai.com/
2. Générer une API key
3. Configurer facturation pour GPT-4 Vision

### Google Books API
1. Aller sur Google Cloud Console
2. Activer Books API
3. Créer une clé d'API
4. Aucune facturation requise (usage gratuit)

## 🚨 Dépannage Commun

### Erreur: Database not found
```bash
# Vérifier que l'ID est correct dans wrangler.jsonc
npx wrangler d1 list
```

### Erreur: API rate limiting
```bash
# Vérifier les quotas API
# eBay: 5000 calls/jour (sandbox), 100k+ (production)
# OpenAI: Selon votre plan
# Google Books: 1000 calls/jour (gratuit)
```

### Erreur: Build failures
```bash
# Nettoyer et rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Performance en Production
```bash
# Monitoring avec Cloudflare Analytics
# Vérifier dans dashboard Cloudflare Pages > Analytics

# Logs en temps réel
npx wrangler pages deployment tail --project-name evaluateur-collection-pro
```

## 📊 Métriques de Performance Attendues

### Base de Données D1
- **Lecture** : <50ms pour requêtes simples
- **Écriture** : <100ms pour insertions
- **Requêtes complexes** : <200ms

### API Externe (temps de réponse)
- **eBay API** : 1-3 secondes
- **OpenAI Vision** : 2-5 secondes  
- **Google Books** : 0.5-2 secondes

### Interface Utilisateur
- **First Contentful Paint** : <1.5s
- **Time to Interactive** : <3s
- **Upload 100 images** : 5-10 minutes (selon taille)

## 🔄 Maintenance et Mises à Jour

### Mises à Jour Code
```bash
# Workflow recommandé
git add .
git commit -m "Description des changements"
npm run build
npx wrangler pages deploy dist --project-name evaluateur-collection-pro
```

### Sauvegarde Base de Données
```bash
# Export manuel (développement)
npx wrangler d1 execute webapp-collections-db \\
  --command="SELECT * FROM collection_items" \\
  --output=backup_items.json

# En production: utiliser Cloudflare backup automatique
```

### Monitoring Continu
- **Cloudflare Analytics** : Trafic et performance
- **Wrangler Logs** : Erreurs et debugging  
- **API Quotas** : Surveillance usage externe

## 📞 Support

### Contact Technique
**Mathieu Chamberland**
- 📧 Math55_50@hotmail.com
- 🏢 Forza Construction Inc.

### Ressources Cloudflare
- Documentation: https://developers.cloudflare.com/pages/
- Support: https://dash.cloudflare.com/support
- Community: https://community.cloudflare.com/

---
**Version**: 1.0.0  
**Dernière mise à jour**: 12 octobre 2025  
**Statut**: ✅ Prêt pour déploiement production