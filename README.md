# 💎 Évaluateur de Collection Pro - Mathieu Chamberland

## Project Overview
- **Name**: Évaluateur de Collection Pro
- **Goal**: Système intelligent d'évaluation et de gestion d'objets de collection avec IA et multi-API
- **Features**: Import/Export avancé, Évaluation IA par image/vidéo/texte, Base de données persistante, Interface intuitive

## 🌐 URLs
- **Production Principal**: https://e92ff36d.evaluateur-collection-pro.pages.dev
- **Production Backup**: https://89382666.evaluateur-collection-pro.pages.dev
- **Développement Local**: http://localhost:3000
- **GitHub**: https://github.com/masterDakill/ImageToValue_Analyser

## 🎯 Fonctionnalités Principales

### 🧠 **Système Multi-Expert IA - NOUVEAU !**
- **3 Experts IA Spécialisés** : OpenAI Vision, Claude Collections, Gemini Comparative
- **Consolidation Intelligente** : Analyse de consensus avec pourcentage de confiance
- **Évaluation par image/vidéo** : Upload de photos ou vidéos pour reconnaissance automatique
- **Évaluation par texte** : Saisie libre "Abbey Road The Beatles" pour analyse contextuelle
- **Analyse Avancée** : Estimation de valeur, rareté, recommandations d'action
- **APIs multi-sources** : eBay, Discogs, Google Books, AbeBooks pour pricing réel

### ✅ **Import/Export Avancé - NOUVEAU !**
- **Import CSV Simple** : Colonnes flexibles avec mapping automatique
- **Import ZIP + Images** : Package CSV + images associées automatiquement 
- **Import Incrémental** : Détection intelligente des doublons avec algorithme de similarité
- **Templates CSV** : 5 templates prédéfinis (Livres, Cartes, Musique, BD/Comics, Général)
- **Export CSV Complet** : Export de toute la collection avec métadonnées

### ✅ **Détection Avancée des Doublons**
- **Algorithme de Levenshtein** pour similarité des titres
- **Comparaison multi-critères** : titre + année + fabricant
- **Interface de résolution** : Choix d'import (nouveaux seulement vs tous)
- **Suggestions intelligentes** lors de la validation

### ✅ **Interface Utilisateur Raffinée**
- **Dashboard avec statistiques temps-réel**
- **Filtres avancés** : catégorie, état, statut, valeur, recherche textuelle
- **Vue grille/liste** avec pagination optimisée
- **Notifications UX** pour feedback utilisateur
- **Responsive design** TailwindCSS

## 🧠 Système Multi-Expert IA

### **Architecture d'Experts Spécialisés**
1. **🔍 OpenAI Vision Expert**
   - Analyse visuelle détaillée d'images de collections
   - Reconnaissance d'objets, texte, et détails fins
   - Évaluation de condition et authenticité visuelle

2. **📚 Claude Collection Expert**
   - Expertise spécialisée en objets de collection historiques
   - Connaissance culturelle et contextuelle approfondie
   - Évaluation de rareté et provenance détaillée

3. **⚖️ Gemini Comparative Expert**
   - Analyse comparative de marché en temps réel
   - Comparaisons avec ventes récentes similaires
   - Tendances et évaluations de liquidité

### **Consolidation Intelligente**
- **Calcul de consensus** : Agrégation pondérée des opinions d'experts
- **Scores de confiance** : Évaluation de la fiabilité des estimations
- **Recommandations d'action** : Suggestions personnalisées basées sur l'analyse
- **Facteurs de rareté** : Analyse multi-critères pour déterminer la rareté

## 🏗️ Data Architecture

### **Modèles de Données Principaux**
- **collection_items** : Items de collection (titre, catégorie, état, images)
- **price_evaluations** : Évaluations de prix avec historique et confiance
- **ai_analysis** : Analyses IA détaillées (catégorie détectée, rareté, insights)
- **activity_logs** : Logs d'activité pour traçabilité et audit
- **recent_sales** : Ventes récentes pour tendances de marché

### **Services de Stockage**
- **Cloudflare D1 (SQLite)** : Base de données distribuée globalement
- **Cloudflare Pages** : Hosting statique avec edge functions
- **Mode Local** : Développement avec `--local` pour tests rapides

### **Flux de Données**
```
Input (Image/Vidéo/Texte) → Smart Analyzer → Multi-API Evaluator → D1 Database → Dashboard UI
                          ↓
                    Cache + Activity Logs
```

## 🛠️ Tech Stack
- **Backend** : Hono Framework + TypeScript + Cloudflare Workers
- **Frontend** : HTML5 + TailwindCSS + Vanilla JavaScript optimisé  
- **Base de données** : Cloudflare D1 (SQLite distribuée)
- **IA/ML** : Système Multi-Expert (OpenAI GPT-4 Vision, Claude-3, Gemini Pro Vision)
- **APIs** : eBay, Discogs, Google Books, AbeBooks
- **Déploiement** : Cloudflare Pages avec CI/CD
- **Développement** : Vite + PM2 + Wrangler CLI

## 🔌 API Reference (v2.1)

### **Interactive Documentation**
Visit `/docs` for full Swagger UI with interactive testing:
- **Swagger UI**: https://imagetovalue.pages.dev/docs
- **OpenAPI Spec**: https://imagetovalue.pages.dev/openapi.json
- **Curl Examples**: https://imagetovalue.pages.dev/examples

### **Authentication**
All API endpoints require Bearer token authentication:
```bash
Authorization: Bearer YOUR_API_KEY
```

### **Core Endpoints**

#### **POST /api/smart-evaluate**
Smart AI evaluation with caching and multi-expert analysis.

**Request:**
```bash
curl -X POST https://imagetovalue.pages.dev/api/smart-evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "mode": "text",
    "text_input": "First edition Harry Potter and the Philosopher'\''s Stone",
    "category": "Books",
    "options": {
      "expertSources": ["vision", "claude"],
      "useCache": true
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "smart_analysis": {
    "category": "Books",
    "confidence": 0.95,
    "extracted_data": {
      "title": "Harry Potter and the Philosopher's Stone",
      "year": 1997
    },
    "estimated_rarity": "very_rare",
    "search_queries": ["first edition philosopher's stone"]
  },
  "cached": false,
  "processing_time_ms": 2340,
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-10-19T14:30:00.000Z"
}
```

#### **POST /api/advanced-analysis**
Advanced multi-expert consolidation with consensus scoring.

**Request:**
```bash
curl -X POST https://imagetovalue.pages.dev/api/advanced-analysis \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "mode": "mixed",
    "text_input": "Abbey Road vinyl",
    "imageUrls": ["https://example.com/vinyl.jpg"],
    "compute_mode": "sync",
    "include_expert_details": true
  }'
```

#### **GET /api/cache/stats**
Get API cache performance metrics.

```bash
curl https://imagetovalue.pages.dev/api/cache/stats \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "cache_stats": {
    "total_entries": 1250,
    "total_hits": 8340,
    "expired_entries": 45,
    "cache_size_mb": 12.5,
    "hit_rate": 85.2
  },
  "recommendations": {
    "hit_rate_target": 80,
    "current_performance": "✅ Excellent",
    "estimated_savings": "85% API cost reduction"
  }
}
```

### **System Endpoints**

- **GET /healthz** - Basic health check (no auth required)
- **GET /readyz** - Readiness check with dependency validation
- **GET /metrics** - Prometheus-compatible metrics (no auth required)
- **GET /info** - System information and feature flags

### **Rate Limits**
- Standard endpoints: **60 requests/minute**
- Heavy operations (image analysis): **10 requests/minute**
- Batch operations: **5 requests/minute**

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1729350000
```

### **Error Handling**
All errors follow standardized format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed",
    "details": {
      "issues": [
        {
          "path": "text_input",
          "message": "String must contain at least 1 character(s)"
        }
      ]
    },
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2025-10-19T14:30:00.000Z"
}
```

**Error Codes:**
- `INVALID_INPUT` - Request validation failed (400)
- `UNAUTHORIZED` - Missing or invalid authentication (401)
- `FORBIDDEN` - Insufficient permissions (403)
- `PAYLOAD_TOO_LARGE` - File/request too large (413)
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded (429)
- `INTERNAL_ERROR` - Server error (500)
- `TIMEOUT` - Request timeout (504)

### **Idempotency**
Use `X-Idempotency-Key` header for safe retries:

```bash
curl -X POST https://imagetovalue.pages.dev/api/smart-evaluate \
  -H "X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  ...
```

Idempotent responses include `X-Idempotent-Replay: true` header.

## 📋 Guide Utilisateur

### **1. Évaluation Rapide**
1. **Par Texte** : Tapez "Abbey Road The Beatles" → Cliquez "Évaluer"
2. **Par Image** : Uploadez une photo → Cliquez "Analyser"  
3. **Mode Démo** : Cliquez "Test Démo" pour exemples automatiques

### **2. Import en Lot**
1. **CSV Simple** : Import Avancé → Import CSV → Sélectionner fichier
2. **ZIP + Images** : Import Avancé → Import ZIP → Package CSV + images
3. **Templates** : Import Avancé → Télécharger Template → Choisir catégorie

### **3. Gestion des Collections**  
- **Filtrage** : Utilisez les filtres par catégorie, état, valeur
- **Recherche** : Tapez dans la barre de recherche pour titre/description
- **Export** : Bouton "Export CSV" pour sauvegarde complète

## 🔧 Corrections et Optimisations Récentes

### **Version 2.1 - 19 octobre 2025 - Hardening & DX Upgrade** ⭐
- ✅ **Validation Stricte** : Schémas Zod pour toutes les requêtes/réponses avec messages d'erreur détaillés
- ✅ **Sécurité Renforcée** : Bearer token auth, rate limiting (60 req/min), validation taille fichiers, CORS
- ✅ **Observabilité Complète** : Logs JSON structurés, métriques Prometheus (/metrics), tracing avec request IDs
- ✅ **Architecture Refactorisée** : ExpertService unifié avec consolidation pondérée et outlier trimming
- ✅ **Cache Intelligent** : Service de cache multi-niveaux avec hash, TTL, stats (80%+ hit rate cible)
- ✅ **Performance Optimisée** : Support async/SSE pour jobs longs, idempotence, middleware de timing
- ✅ **Documentation Interactive** : OpenAPI 3.1 spec + Swagger UI à /docs avec exemples curl
- ✅ **Tests Complets** : Suite unit/contract/E2E avec Vitest + coverage
- ✅ **CI/CD Pipeline** : GitHub Actions avec lint, test, build, deploy automatique vers staging/prod
- ✅ **Health Checks** : Endpoints /healthz, /readyz, /info pour monitoring Kubernetes-style
- ✅ **Middleware Stack** : Request ID, timing, error handling, security headers, file size validation
- ✅ **Code Quality** : TypeScript strict mode, dossiers refactorisés (src/routes, src/lib, tests/)

### **Version 1.1 - 19 octobre 2025**
- ✅ **Sécurité renforcée** : Protection XSS dans l'affichage des erreurs
- ✅ **Performance améliorée** : Correction fuite mémoire blob URLs
- ✅ **UX optimisée** : Correction race condition menu import
- ✅ **Fiabilité** : Timeout de 30s sur les appels API IA
- ✅ **Compatibilité** : Normalisation headers CSV (support accents, chiffres)
- ✅ **Code cleanup** : Suppression 100KB+ de code mort
- ✅ **Documentation** : Fichier .env.example avec guide complet

## 🚀 Déploiement

### **Platform** : Cloudflare Pages
### **Status** : ✅ Active et Fonctionnel
### **Last Updated** : 19 octobre 2025 - v1.1 avec correctifs sécurité

### **Configuration de Déploiement**
```bash
# Build et déploiement
npm run build
npx wrangler pages deploy dist --project-name evaluateur-collection-pro

# Variables d'environnement (optionnel pour mode démo)
npx wrangler pages secret put OPENAI_API_KEY
npx wrangler pages secret put EBAY_CLIENT_ID 
npx wrangler pages secret put GOOGLE_BOOKS_API_KEY
```

### **Base de Données**
- **Local** : SQLite automatique avec `--local`
- **Production** : Cloudflare D1 (à configurer avec permissions)
- **Migrations** : Schéma complet dans `/migrations/`

## 🔄 Prochaines Améliorations

### **Phase 1 - Complétée ✅**
- ✅ Import d'images en lot (ZIP avec CSV de métadonnées)
- ✅ Templates CSV prédéfinis par catégorie  
- ✅ Validation avancée avec suggestions de correction
- ✅ Import incrémental avec détection des doublons

### **Phase 2 - Suggestions Futures**
- 📊 **Analytics avancés** : Graphiques de valeur par période
- 🔍 **Recherche IA** : "Trouve mes cartes de hockey de plus de 1000$"
- 📱 **API REST** : Endpoints pour intégrations externes
- 🔐 **Multi-utilisateurs** : Gestion de collections par utilisateur
- 🎯 **Alertes intelligentes** : Notifications sur variations de prix

## 👥 Développement

### **Installation Rapide**
```bash
# 1. Cloner le projet
git clone https://github.com/masterDakill/ImageToValue_Analyser.git
cd ImageToValue_Analyser

# 2. Installer les dépendances
npm install

# 3. Configurer les clés API (optionnel pour mode démo)
cp .env.example .env
# Éditer .env avec vos clés API

# 4. Lancer en développement local
npm run dev
# Ou avec Wrangler : wrangler pages dev dist --local

# 5. Accéder à l'application
# http://localhost:3000
```

### **Environnement Local**
```bash
cd /home/user/webapp
npm run build
pm2 start ecosystem.config.cjs
```

### **Tests et Debug**
```bash
# Tester les stats
curl http://localhost:3000/api/stats

# Tester l'évaluation IA
curl -X POST http://localhost:3000/api/smart-evaluate \
  -d '{"text_input":"Abbey Road The Beatles"}' \
  -H "Content-Type: application/json"

# Tester l'analyse avancée
curl -X POST http://localhost:3000/api/advanced-analysis \
  -d '{"text_input":"Vinyl Beatles Abbey Road 1969"}' \
  -H "Content-Type: application/json"
```

## 🔐 Sécurité

### **Bonnes Pratiques Implémentées**
- ✅ **Protection XSS** : Échappement HTML pour tout contenu utilisateur
- ✅ **Timeouts API** : Limite de 30s pour éviter les requêtes infinies
- ✅ **Gestion mémoire** : Nettoyage automatique des blob URLs
- ✅ **Validation input** : Vérification des types et formats
- ✅ **CORS configuré** : Restrictions d'origine pour API
- ⚠️ **Clés API** : Jamais commiter .env ou .dev.vars dans git
- ⚠️ **Mode production** : Utiliser wrangler secret pour variables sensibles

### **Configuration Sécurisée**
```bash
# En production, utilisez wrangler secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put EBAY_CLIENT_ID
wrangler secret put EBAY_CLIENT_SECRET

# Pour développement local, créez .dev.vars (ignoré par git)
echo "OPENAI_API_KEY=sk-..." > .dev.vars
```

## 🐛 Troubleshooting

### **Problèmes Courants**

**1. Import CSV échoue avec "colonnes manquantes"**
- **Cause** : Headers CSV non conformes
- **Solution** : Télécharger un template depuis "Import Avancé → Télécharger Template"
- **Format requis** : Colonnes `title` et `category` obligatoires

**2. "API timeout" sur l'évaluation IA**
- **Cause** : Timeout de 30s dépassé
- **Solution** : Vérifier la connexion internet, réduire la taille des images
- **Mode démo** : Fonctionne sans clés API pour tester l'interface

**3. Images ZIP ne s'associent pas aux items**
- **Cause** : Noms de fichiers ne correspondent pas aux titres CSV
- **Solution** : Nommer les images `titre_exact.jpg` ou `item_1.jpg`, `item_2.jpg`
- **Format accepté** : .jpg, .jpeg, .png, .webp, .gif

**4. "Blob URL révoquée" après rechargement**
- **Cause** : Les blob URLs sont temporaires
- **Solution** : Réimporter les images ou utiliser URLs permanentes
- **Note** : Comportement normal, optimisé pour la mémoire

**5. Console affiche "CORS error"**
- **Cause** : Requête depuis une origine non autorisée
- **Solution** : En local, utiliser http://localhost:3000 (pas 127.0.0.1)
- **Production** : CORS configuré pour domaines Cloudflare Pages

## 📚 FAQ

**Q : L'application fonctionne-t-elle sans clés API ?**
R : Oui ! Mode démo activé automatiquement si aucune clé configurée. Données aléatoires cohérentes pour tester l'interface.

**Q : Combien coûte l'utilisation des API IA ?**
R : ~$0.01-0.03 par analyse OpenAI, ~$0.003-0.015 Claude. eBay/Discogs/Books gratuits (limites quotidiennes).

**Q : Peut-on héberger sur un autre service que Cloudflare ?**
R : Oui, compatible Vercel, Netlify, ou serveur Node.js. Adapter la config DB (remplacer D1 par PostgreSQL/MySQL).

**Q : Comment ajouter des catégories personnalisées ?**
R : Éditer les templates dans `src/index.tsx` lignes 580-700. Ajouter dans l'enum TypeScript si nécessaire.

**Q : Les données sont-elles stockées en permanence ?**
R : En production : Oui (Cloudflare D1). En local : SQLite éphémère (perdu au redémarrage avec --local).

**Q : Puis-je exporter vers Excel/Google Sheets ?**
R : Oui ! Export CSV compatible Excel. Pour Google Sheets : Fichier → Importer → Upload CSV exporté.

## 🤝 Contribution

Ce projet est actuellement en développement actif. Pour contribuer :

1. **Fork** le repository
2. **Créer une branche** : `git checkout -b feature/amelioration`
3. **Commit** vos changements : `git commit -m 'Ajout fonctionnalité X'`
4. **Push** : `git push origin feature/amelioration`
5. **Ouvrir une Pull Request**

**Standards de code** :
- TypeScript strict mode
- ESLint pour linting
- Format : Prettier avec semi-colons
- Tests : À venir (contributions bienvenues)

## 📄 License

**Propriétaire** : Mathieu Chamberland
**Usage** : Personnel et commercial autorisé pour collections privées
**Redistribution** : Contacter l'auteur pour licence commerciale

---

**Développé pour Mathieu Chamberland** - Investisseur Immobilier & Entrepreneur  
*Spécialisé en gestion de propriétés locatives et collections d'objets de valeur*

🔗 **Accès Direct** : https://e92ff36d.evaluateur-collection-pro.pages.dev
