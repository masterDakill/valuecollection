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

### 🔄 Mise à jour 2025-10-25 / Update 2025-10-25

- **FR** : Restauration complète des endpoints `/healthz`, `/readyz`, `/metrics`, `/openapi.json`, `/api/smart-evaluate`, `/api/advanced-analysis` et `/api/cache/stats` avec authentification stricte, limitation de débit, idempotence et statistiques de cache intégrées.
- **EN** : Fully restored `/healthz`, `/readyz`, `/metrics`, `/openapi.json`, `/api/smart-evaluate`, `/api/advanced-analysis`, and `/api/cache/stats` endpoints with strict auth, rate limiting, idempotency, and integrated cache statistics.
- **FR** : Génération de réponses déterministes hors-ligne pour les tests (aucun appel aux API externes requis) et exposition de métriques Prometheus prêtes pour Grafana.
- **EN** : Deterministic offline responses keep tests self-contained and export Prometheus metrics ready for Grafana dashboards.
- **FR** : Photothèque de démo pré-remplie avec deux livres détectés (valeur estimée & bounding boxes) pour valider l'UI immédiatement.
- **EN** : Demo photo library now ships with two detected books (estimated value & bounding boxes) so the dashboard renders insights on first load.

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

### ✅ **Interface Utilisateur React**

- **App React modulaire** avec onglets _Analyser / Photos / Livres / Annonces_
- **Vérification API** intégrée (healthz, photos, items, export) et alertes en temps réel
- **Upload hybride** URL ou fichier local (10MB) avec prévisualisation
- **Tableaux dynamiques** pour les items détectés et les annonces générées
- **Statistiques instantanées** (valeur totale, éléments au-dessus d'un seuil configurable)
- **Cartes Photos enrichies** affichant le nombre d'items détectés, la valeur cumulée et un top 3 des titres estimés

- **Modular React app** with tabs _Analyze / Photos / Books / Ads_
- **Integrated API verification** (healthz, photos, items, export) with real-time toasts
- **Hybrid upload** via URL or local file (10MB) with preview support
- **Dynamic tables** for detected items and generated ads
- **Instant statistics** (total value, threshold filtering)
- **Photo cards enriched** with detected item counts, aggregate value, and a top-3 list of estimated titles

## 🧪 Développement UI React / React UI Development

- \*FR\*: `npm run dev` puis ouvrez http://localhost:3000 pour tester l'interface React. Ajustez le préfixe API via \`window.**API_BASE**\` dans \`public/index.html\`.
- \*EN\*: `npm run dev` and browse to http://localhost:3000. Update the API prefix with \`window.**API_BASE**\` inside \`public/index.html\` if your backend uses a custom base path.
- Tests unitaires UI : `npm run test:unit -- tests/unit/ui-helpers.test.ts`

## 🔧 Flux Git & Contributions / Git Workflow & Contributions

- **FR** : Le développement se fait localement sur des branches `codex/<feature>-<date>` (ex. `codex/ui-refresh-2025-10-26`) avec commits [Conventional Commits](https://www.conventionalcommits.org/fr/v1.0.0/). Chaque lot de changements est testé (`npm test --silent` a minima) puis proposé via Pull Request GitHub — nous n'écrivons jamais directement sur `main`.
- **EN** : Development happens locally on `codex/<feature>-<date>` branches (for example `codex/ui-refresh-2025-10-26`) using [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Every change runs the test suite (`npm test --silent` at minimum) before opening a GitHub Pull Request — we never push directly to `main`.

## 🧪 Tests automatisés / Automated Testing

- **FR** :
  - `npm run test:unit` – Valide les helpers UI et les schémas Zod.
  - `npm run test:contract` – Vérifie les réponses REST (auth, 400/401, limitation de débit, idempotence).
  - `npm run test:e2e` – Parcourt les scénarios complets (évaluation + cache + analyse avancée).
- `npm run test:full` – Chaîne les suites unitaires/contract/e2e (utilisé par `scripts/test-latest.sh`).
- **EN** :
  - `npm run test:unit` – Validates UI helpers and Zod schemas.
  - `npm run test:contract` – Asserts REST responses (auth, 400/401, rate limiting, idempotency).
  - `npm run test:e2e` – Executes end-to-end flows (evaluation + cache + advanced analysis).
- `npm run test:full` – Runs unit + contract + e2e suites sequentially (used by `scripts/test-latest.sh`).

> ℹ️ Vitest redirige désormais toutes les requêtes `http://localhost:3000` vers l'application Hono en mémoire via `tests/setup/server.ts`, il n'est donc plus nécessaire de démarrer un serveur séparé pour les suites automatisées.

## ✅ Tester la dernière version / Test the latest app build

1. **Préparer l'environnement / Prepare the environment**
   - **FR** : Vérifiez que Node.js 20+ et npm 10+ sont installés (`node -v`, `npm -v`).
   - **EN** : Make sure Node.js 20+ and npm 10+ are available (`node -v`, `npm -v`).
2. **Récupérer la branche principale / Pull the main branch**
   - `git fetch origin && git checkout main && git pull`
3. **Installer les dépendances / Install dependencies**
   - `npm ci`
4. **Lancer la batterie de tests complète / Run the full test suite**
   - `./scripts/test-latest.sh`
   - Le script exécute `npm run test:full` (unitaires + contractuels + e2e) et installe les dépendances si `node_modules` est absent.
   - The script executes `npm run test:full` (unit + contract + e2e) and bootstraps dependencies when `node_modules` is missing.
   - ✅ Les suites échouent si la couverture tombe sous 85 % (lignes/fonctions/branches/énoncés) pour garantir la qualité.
   - ✅ The suites fail when coverage drops below 85 % (lines/functions/branches/statements) to enforce code health.
5. **Validation manuelle optionnelle / Optional manual validation**
   - `npm run dev` puis ouvrir http://localhost:3000 pour vérifier l'interface React.
   - `npm run dev` then browse to http://localhost:3000 to smoke-test the React dashboard.

> ℹ️ Les tests utilisent l'application Hono en mémoire; aucun service externe n'est requis. / Tests run fully in-memory through the Hono app; no external services are required.

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

#### **GET /api/photos**

- **FR** : Retourne la photothèque normalisée (photos, métadonnées, statut d'analyse).
- **EN** : Returns the normalized photo library (photos, metadata, analysis status).

```bash
curl https://imagetovalue.pages.dev/api/photos
```

**Response:**

```json
{
  "success": true,
  "photos": [
    {
      "id": "photo-sample-0001",
      "file_name": "IMG_2450.JPG",
      "captured_at": "2025-10-25T07:50:41.000Z",
      "detected_items": []
    }
  ],
  "stats": {
    "total_photos": 1,
    "last_photo_at": "2025-10-25T07:50:41.000Z"
  }
}
```

#### **POST /api/photos/analyze**

- **FR** : Lance une analyse IA d'une URL ou d'un upload base64 et retourne les items détectés.
- **EN** : Runs an AI analysis from an URL or base64 upload and returns detected items.

```bash
curl -X POST https://imagetovalue.pages.dev/api/photos/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/library/rare-book.jpg",
    "options": { "maxItems": 3, "collectionId": "books-demo" }
  }'
```

**Response (excerpt):**

```json
{
  "success": true,
  "photo": {
    "id": "photo-6fd0b9",
    "detected_items": [
      {
        "id": "photo-6fd0b9-item-1",
        "title": "Library 1",
        "estimated_value": 245.18,
        "rarity": "rare"
      }
    ]
  },
  "stats": {
    "detected_items": 3,
    "processing_time_ms": 224
  }
}
```

#### **GET /api/items**

- **FR** : Liste l'inventaire consolidé des items détectés (valeur, rareté, dernière détection).
- **EN** : Lists the consolidated inventory of detected items (value, rarity, last seen).

```bash
curl https://imagetovalue.pages.dev/api/items
```

#### **POST /api/ads/generate**

- **FR** : Génère des annonces marketing prêtes à publier en filtrant par valeur minimale.
- **EN** : Generates ready-to-publish marketing listings filtered by minimum value.

```bash
curl -X POST https://imagetovalue.pages.dev/api/ads/generate \
  -H "Content-Type: application/json" \
  -d '{ "min_value": 120 }'
```

**Response (excerpt):**

```json
{
  "success": true,
  "ads": [
    {
      "id": "ad-photo-6fd0b9-item-1",
      "title": "Library 1 (Excellent)",
      "price": 289.32,
      "currency": "CAD"
    }
  ]
}
```

#### **GET /api/ads/export**

- **FR** : Retourne le CSV des annonces générées (compatible Airtable/Excel).
- **EN** : Returns the generated listings as CSV (Airtable/Excel friendly).

```bash
curl -L https://imagetovalue.pages.dev/api/ads/export -o ads.csv
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
_Spécialisé en gestion de propriétés locatives et collections d'objets de valeur_

🔗 **Accès Direct** : https://e92ff36d.evaluateur-collection-pro.pages.dev
