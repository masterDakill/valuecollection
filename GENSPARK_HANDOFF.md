# 🚀 Guide de Continuation - ValueCollection
## Pour GenSpark AI Developer et Futurs Développeurs

**Date de création:** 2025-11-01  
**Dernière mise à jour:** 2025-11-01  
**État du projet:** ✅ Fonctionnel - En phase d'optimisation  
**Commit actuel:** `5f9056e`

---

## 📋 Table des Matières

1. [État Actuel du Projet](#état-actuel-du-projet)
2. [Architecture Technique](#architecture-technique)
3. [Ce Qui Fonctionne](#ce-qui-fonctionne)
4. [Problèmes à Résoudre](#problèmes-à-résoudre)
5. [Plan d'Action Prioritaire](#plan-daction-prioritaire)
6. [Guide de Démarrage Rapide](#guide-de-démarrage-rapide)
7. [Structure du Code](#structure-du-code)
8. [APIs et Services](#apis-et-services)
9. [Base de Données](#base-de-données)
10. [Commandes Utiles](#commandes-utiles)
11. [Conventions de Code](#conventions-de-code)
12. [Ressources Importantes](#ressources-importantes)

---

## 📊 État Actuel du Projet

### Résumé Exécutif

ValueCollection est une application web d'inventaire de livres utilisant l'IA pour analyser des photos et extraire automatiquement les métadonnées (titres, auteurs, valeurs estimées).

**Objectif Final:** Gérer une collection de 1500+ livres avec analyse automatique à coûts IA maîtrisés (~$2 pour 1500 livres).

### Métriques Actuelles

| Métrique | Valeur |
|----------|--------|
| **Livres en DB** | 7 livres |
| **Photos analysées** | 2 photos |
| **Taux de détection** | 5-10 livres/photo |
| **Coût moyen/photo** | ~$0.02-0.05 |
| **Temps analyse** | ~2-5 secondes |
| **Qualité extraction** | ⭐⭐⭐⭐☆ (4/5) |

### Stack Technique

```
Frontend:     React/TypeScript (minimal actuel)
Backend:      Hono + Cloudflare Workers
Database:     Cloudflare D1 (SQLite)
AI Services:  OpenAI GPT-4o Vision, Claude, Gemini
Build:        Vite
Deployment:   Cloudflare Pages
Dev Server:   Wrangler 4.45.3
```

---

## 🏗️ Architecture Technique

### Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Upload     │  │  Dashboard   │  │  Liste       │     │
│  │   Photos     │  │  Stats       │  │  Livres      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP REST
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (Hono)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Routes: /api/items | /api/photos | /api/monitoring │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Services IA & Enrichissement              │  │
│  │  • vision-multi-spine.service.ts (GPT-4o Vision)    │  │
│  │  • claude-ner.service.ts (Claude NER)               │  │
│  │  • gemini-price-search.service.ts (Gemini)          │  │
│  │  • price-aggregator.service.ts (eBay/Discogs)       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (Cloudflare D1)                   │
│  Tables: collection_items, analyzed_photos, ai_analysis... │
└─────────────────────────────────────────────────────────────┘
```

### Points d'Attention

- **Limite 1MB:** Les images base64 sont limitées à 1MB actuellement
- **Compression:** Qualité JPEG réduite à 40% pour respecter la limite
- **Séquentiel:** Analyse une photo à la fois (pas de parallélisation)
- **Sans Cache:** Aucun cache pour éviter requêtes API redondantes

---

## ✅ Ce Qui Fonctionne

### 1. 📸 Analyse de Photos HEIC/JPEG

**Status:** ✅ Pleinement opérationnel

**Capacités:**
- Conversion automatique HEIC → JPEG (macOS `sips`)
- Compression intelligente < 1MB
- Détection multi-livres: 5-10 livres par photo
- Extraction titres + auteurs via GPT-4o Vision

**Scripts:**
```bash
./add-photo.sh photo.heic           # Workflow complet
./quick-add-heic.sh *.heic          # Batch HEIC processing
./convert-heic.sh input.heic        # Conversion seule
```

**Exemple de résultat:**
```json
{
  "title": "The Art of Advanced Dungeons & Dragons",
  "author": "Various",
  "detected_from": "photo-abc123",
  "confidence": 0.92
}
```

### 2. 🗄️ Base de Données D1

**Status:** ✅ Configuration complète

**Tables actuelles:**
- `collections` - Collections de livres (1 collection active)
- `collection_items` - Livres détectés (7 entrées)
- `analyzed_photos` - Photos analysées (2 photos)
- `ai_analysis` - Résultats analyse IA
- `price_evaluations` - Évaluations prix
- `external_identifiers` - ISBN, codes barres
- `api_cache` - Cache requêtes API
- `activity_logs` - Logs activité
- `service_monitoring` - Monitoring services

**Migrations appliquées:** 6 migrations (0001-0006)

**Localisation:** `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`

### 3. 🔌 API REST

**Status:** ✅ Endpoints fonctionnels

**Routes disponibles:**

| Endpoint | Méthode | Description | Status |
|----------|---------|-------------|--------|
| `/api/items` | GET | Liste tous les livres | ✅ |
| `/api/items` | POST | Ajouter un livre | ✅ |
| `/api/items/:id` | GET | Détails d'un livre | ✅ |
| `/api/items/:id` | PUT | Modifier un livre | ✅ |
| `/api/items/:id` | DELETE | Supprimer un livre | ✅ |
| `/api/photos/analyze` | POST | Analyser photo | ✅ |
| `/api/photos` | GET | Liste photos | ✅ |
| `/api/monitoring/stats` | GET | Stats système | ✅ |
| `/api/monitoring/health` | GET | Health check | ✅ |

**Serveur dev:** `http://127.0.0.1:3000`

### 4. 📊 Export Excel/CSV

**Status:** ✅ Opérationnel

**Commandes:**
```bash
npm run db:export                    # Export automatique
./export-to-excel.sh                 # Script direct
```

**Format de sortie:** CSV compatible Excel/Numbers avec en-têtes français

### 5. 🤖 Scripts d'Automation

**Status:** ✅ 11 scripts shell fonctionnels

**Liste complète:**
- `START.sh` - Démarrage rapide du serveur
- `add-photo.sh` - Ajout photo (HEIC/JPEG)
- `quick-add-heic.sh` - Workflow HEIC complet
- `convert-heic.sh` - Conversion HEIC → JPEG
- `export-to-excel.sh` - Export CSV
- `init-db.sh` - Initialisation DB
- `evaluate-all-books.sh` - Évaluation batch
- `demarrage-rapide.sh` - Setup initial
- `daily-summary.sh` - Rapport quotidien
- `reload.sh` - Rechargement serveur
- `test-*.sh` - Scripts de test

---

## ⚠️ Problèmes à Résoudre

### 1. 🖼️ Limite de Taille Image (1MB)

**Symptômes:**
- Photos iPhone (3-5MB typiques) rejetées
- Compression à 40% de qualité nécessaire
- Perte de détails sur certains livres
- Erreur: `"Image too large: 3.2MB > 1MB limit"`

**Impact:** Qualité d'extraction réduite, frustration utilisateur

**Solutions possibles:**
1. **Upload direct Cloudflare R2** (storage objet)
2. **Chunked upload** (découpe en morceaux)
3. **URL publique temporaire** (bypass base64)
4. **Compression serveur intelligente** (préserver zones de texte)

**Priorité:** 🥈 HAUTE - Bloquant pour utilisation iPhone directe

### 2. 🎨 Interface Web Basique

**Symptômes:**
- Pas de vraie UI React
- HTML statique minimal dans `dist/`
- Aucun drag & drop
- Pas de prévisualisation
- Pas d'édition inline

**Impact:** Expérience utilisateur pauvre, workflow manuel fastidieux

**Fonctionnalités manquantes:**
- Dashboard avec statistiques visuelles
- Upload drag & drop photos
- Liste livres avec pagination/recherche/tri
- Fiche livre détaillée éditable
- Indicateur de progression analyse
- Design moderne et responsive

**Priorité:** 🥇 TRÈS HAUTE - Critique pour utilisation quotidienne

### 3. 📚 Pas d'Enrichissement Automatique

**Symptômes:**
- Titres bruts extraits sans nettoyage
- Pas de lookup ISBN automatique
- Pas de récupération cover images
- Valeur estimée toujours à $0
- Pas de données de rareté

**Impact:** Base de données incomplète, valeurs non fiables

**Pipeline souhaité:**
```
1. Extraction GPT-4o  →  Titre/Auteur brut
2. Nettoyage         →  Normalisation texte
3. ISBN Lookup       →  Google Books API
4. Cover Fetch       →  URL cover image
5. Price Evaluation  →  eBay + Discogs + AbeBooks
6. Rarity Scoring    →  Calcul score rareté
7. Save Enriched     →  Update DB
```

**Priorité:** 🥈 HAUTE - Nécessaire pour valeur réelle

### 4. ⚡ Performance

**Symptômes:**
- Analyse séquentielle (1 photo à la fois)
- Pas de cache pour images analysées
- Requêtes API non optimisées
- Pas de batch processing

**Impact:** Lent pour analyser 1500 livres

**Optimisations nécessaires:**
- Traitement parallèle (Worker queue)
- Cache intelligent (Redis/KV)
- Batch inserts DB
- Connection pooling
- Rate limiting intelligent

**Priorité:** 🥉 MOYENNE - Important pour scalabilité

### 5. 📊 Monitoring Limité

**Symptômes:**
- Pas de dashboard analytics
- Logs basiques uniquement
- Pas de métriques temps réel
- Pas de tracking coûts API

**Impact:** Difficile de suivre progression et coûts

**Dashboard souhaité:**
- Nombre total livres / valeur collection
- Photos analysées (succès/échecs)
- Coûts API cumulés (GPT-4o, etc.)
- Performance (temps moyen analyse)
- Graphiques évolution collection

**Priorité:** 🥉 MOYENNE - Nice to have

---

## 🎯 Plan d'Action Prioritaire

### Phase 1: Interface Utilisateur (Semaine 1) 🥇

**Objectif:** Créer une interface React moderne et fonctionnelle

**Tâches:**
- [ ] Setup React + TypeScript + Tailwind CSS
- [ ] Layout de base (header/sidebar/main)
- [ ] Page Dashboard avec stats (nombre livres, valeur totale, graphiques)
- [ ] Page Liste Livres (tableau avec pagination, recherche, tri)
- [ ] Composants réutilisables (BookCard, StatCard, Modal)
- [ ] Design moderne et responsive (mobile-first)

**Livrables:**
- Interface navigable et intuitive
- Dashboard affichant stats en temps réel
- Liste livres avec recherche/filtrage
- Composants UI documentés

**Prérequis:**
```bash
npm install react react-dom @types/react @types/react-dom
npm install tailwindcss postcss autoprefixer
npm install lucide-react  # Icons
```

### Phase 2: Upload & Interactions (Semaine 2) 🥇

**Objectif:** Permettre upload de photos et édition des livres

**Tâches:**
- [ ] Upload drag & drop photos (react-dropzone)
- [ ] Prévisualisation photos avant analyse
- [ ] Indicateur progression analyse (spinner + pourcentage)
- [ ] Modal détails livre (édition inline)
- [ ] Formulaire d'édition (titre, auteur, état, notes)
- [ ] Bouton export Excel visible et fonctionnel

**Livrables:**
- Upload photos intuitif (drag & drop ou bouton)
- Prévisualisation instantanée
- Édition livres sans quitter la page
- Export CSV en un clic

**Prérequis:**
```bash
npm install react-dropzone
npm install react-hook-form zod
```

### Phase 3: Enrichissement Automatique (Semaine 3) 🥈

**Objectif:** Compléter automatiquement les métadonnées manquantes

**Tâches:**
- [ ] Service de nettoyage titres/auteurs (normalisation)
- [ ] Intégration Google Books API (lookup ISBN)
- [ ] Service de récupération cover images
- [ ] Intégration eBay API (prix marché)
- [ ] Intégration Discogs API (prix musique/livres)
- [ ] Calcul score de rareté (algorithme multi-critères)
- [ ] Pipeline orchestration (queue + retry)

**Livrables:**
- 80%+ des livres avec ISBN
- 90%+ avec cover image
- Estimation valeur fiable (prix marché réel)
- Score de rareté automatique

**Services à créer:**
```
src/services/
├── title-cleaner.service.ts      # Nettoyage titres
├── isbn-lookup.service.ts        # Google Books
├── cover-fetch.service.ts        # Récupération covers
├── ebay-pricing.service.ts       # Prix eBay
├── discogs-pricing.service.ts    # Prix Discogs
└── enrichment-queue.service.ts   # Orchestration
```

### Phase 4: Résolution Limite Upload (Semaine 3-4) 🥈

**Objectif:** Permettre upload photos > 1MB sans compression agressive

**Solutions proposées:**

**Option A: Cloudflare R2 (Recommandé)**
```typescript
// src/services/r2-storage.service.ts
export async function uploadToR2(file: File, env: Env): Promise<string> {
  const key = `photos/${Date.now()}-${file.name}`;
  await env.PHOTO_BUCKET.put(key, file.stream());
  return `https://r2.example.com/${key}`;
}
```

**Option B: Chunked Upload**
```typescript
// src/services/chunked-upload.service.ts
export async function uploadChunked(file: File, chunkSize = 512KB) {
  const chunks = splitFile(file, chunkSize);
  const uploadedChunks = await Promise.all(
    chunks.map((chunk, i) => uploadChunk(chunk, i))
  );
  return assembleChunks(uploadedChunks);
}
```

**Option C: Compression Intelligente**
```typescript
// src/services/smart-compression.service.ts
export async function compressIntelligently(image: ImageData) {
  const textRegions = detectTextRegions(image);
  return compressWithRegionQuality(image, {
    textQuality: 90,      // High quality for text
    backgroundQuality: 40 // Low quality for background
  });
}
```

**Livrables:**
- Photos jusqu'à 5MB acceptées
- Qualité d'extraction améliorée
- Temps d'upload < 3 secondes
- Expérience utilisateur fluide

### Phase 5: Performance & Monitoring (Semaine 4) 🥉

**Objectif:** Optimiser pour 1500+ livres et ajouter dashboard analytics

**Tâches Performance:**
- [ ] Traitement parallèle photos (Worker queue)
- [ ] Cache intelligent (Cloudflare KV)
- [ ] Batch inserts DB (20+ items à la fois)
- [ ] Indexes DB optimisés
- [ ] Pagination cursor-based

**Tâches Monitoring:**
- [ ] Dashboard analytics (valeur totale, graphiques)
- [ ] Tracking coûts API (OpenAI, Claude, Gemini)
- [ ] Métriques temps réel (latence, erreurs)
- [ ] Alertes anomalies
- [ ] Logs structurés JSON

**Livrables:**
- Analyse 100+ photos en < 10 minutes
- Cache hit rate > 80%
- Dashboard admin complet
- Coûts API visibles et prévisibles

---

## 🚀 Guide de Démarrage Rapide

### Prérequis

- **Node.js:** 18.x ou supérieur
- **npm:** 10.x ou supérieur
- **Git:** Version récente
- **macOS:** Pour scripts HEIC (ou adapter pour Linux/Windows)

### Installation Initiale

```bash
# 1. Cloner le repository
cd /home/user/webapp
git pull origin main

# 2. Installer les dépendances
npm install

# 3. Vérifier la base de données
npm run db:ls

# 4. Démarrer le serveur de développement
npm run dev:d1

# 5. Accéder à l'application
# Naviguer vers: http://127.0.0.1:3000
```

### Vérification de l'Installation

```bash
# Vérifier que le serveur répond
curl http://127.0.0.1:3000/api/monitoring/health

# Vérifier les livres en DB
curl http://127.0.0.1:3000/api/items | jq

# Vérifier les photos analysées
curl http://127.0.0.1:3000/api/photos | jq
```

**Résultat attendu:** Réponses JSON avec données actuelles (7 livres, 2 photos)

### Workflow de Développement

```bash
# 1. Créer une branche pour la fonctionnalité
git checkout -b feature/interface-react

# 2. Faire vos modifications
# ... éditer fichiers ...

# 3. Tester localement
npm run dev:d1

# 4. Vérifier que tout compile
npm run build

# 5. Commiter les changements
git add .
git commit -m "feat: Ajout interface React avec dashboard"

# 6. Pousser sur GitHub
git push origin feature/interface-react

# 7. Créer une Pull Request sur GitHub
```

---

## 📁 Structure du Code

### Vue d'Ensemble

```
valuecollection/
├── src/
│   ├── index.tsx                          # Point d'entrée Hono
│   ├── routes/                            # Routes API
│   │   ├── items.ts                       # CRUD livres ✅
│   │   ├── photos.ts                      # Analyse photos ✅
│   │   ├── monitoring.ts                  # Monitoring système ✅
│   │   └── evaluate.ts                    # Évaluations IA
│   ├── services/                          # Services métier
│   │   ├── vision-multi-spine.service.ts  # GPT-4o Vision ✅
│   │   ├── claude-ner.service.ts          # Claude NER
│   │   ├── gemini-price-search.service.ts # Gemini Search
│   │   ├── photo-storage.service.ts       # Storage photos ✅
│   │   ├── price-aggregator.service.ts    # Agrégation prix
│   │   └── rarity-analyzer.service.ts     # Analyse rareté
│   ├── lib/                               # Utilitaires
│   │   ├── validation.ts                  # Schémas Zod
│   │   ├── logger.ts                      # Logging
│   │   └── metrics.ts                     # Métriques
│   └── renderer.tsx                       # SSR (si utilisé)
├── migrations/                            # Migrations DB
│   ├── 0001_initial_schema.sql           # Schéma initial ✅
│   ├── 0002_photo_analysis.sql           # Photos ✅
│   ├── 0003_enrichment.sql               # Enrichissement ✅
│   ├── 0004_monitoring.sql               # Monitoring ✅
│   ├── 0005_indexes.sql                  # Indexes ✅
│   └── 0006_cache.sql                    # Cache ✅
├── dist/                                  # Build output (généré)
├── .wrangler/                             # État local Wrangler
│   └── state/v3/d1/                      # DB locale
├── public/                                # Assets statiques
├── tests/                                 # Tests (à créer)
├── scripts/                               # Scripts automation
├── *.sh                                   # Scripts shell (11 fichiers)
├── package.json                           # Dépendances npm
├── wrangler.jsonc                        # Config Cloudflare
├── vite.config.ts                        # Config Vite
├── tsconfig.json                         # Config TypeScript
└── README*.md                            # Documentation

✅ = Fichier fonctionnel et testé
```

### Fichiers Clés à Connaître

#### 1. `src/index.tsx` - Point d'Entrée

**Rôle:** Configuration Hono, routes, middlewares

```typescript
import { Hono } from 'hono';
import itemsRoutes from './routes/items';
import photosRoutes from './routes/photos';
import monitoringRoutes from './routes/monitoring';

const app = new Hono();

// Middlewares
app.use('*', logger());
app.use('*', cors());

// Routes
app.route('/api/items', itemsRoutes);
app.route('/api/photos', photosRoutes);
app.route('/api/monitoring', monitoringRoutes);

export default app;
```

**Note:** Point d'entrée principal pour ajouter de nouvelles routes ou middlewares.

#### 2. `src/routes/items.ts` - CRUD Livres

**Rôle:** Gestion des livres (liste, ajout, modification, suppression)

**Endpoints:**
- `GET /api/items` - Liste tous les livres
- `POST /api/items` - Ajouter un livre
- `GET /api/items/:id` - Détails d'un livre
- `PUT /api/items/:id` - Modifier un livre
- `DELETE /api/items/:id` - Supprimer un livre

**Exemple requête:**
```bash
curl http://127.0.0.1:3000/api/items
```

#### 3. `src/routes/photos.ts` - Analyse Photos

**Rôle:** Analyse de photos avec GPT-4o Vision

**Endpoints:**
- `POST /api/photos/analyze` - Analyser une photo
- `GET /api/photos` - Liste des photos analysées
- `GET /api/photos/:id` - Détails d'une photo

**Exemple requête:**
```bash
curl -X POST http://127.0.0.1:3000/api/photos/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/library.jpg",
    "collectionId": 1
  }'
```

#### 4. `src/services/vision-multi-spine.service.ts` - GPT-4o Vision

**Rôle:** Service d'analyse d'images avec GPT-4o Vision

**Fonctions principales:**
- `analyzePhotoForBooks(imageData, options)` - Analyse photo
- `extractTitlesAndAuthors(visionResult)` - Extraction métadonnées

**Prompt utilisé:**
```
Analyze this photo of books. For each visible book spine, extract:
1. Title (exact text visible)
2. Author (if visible)
3. Approximate position (top/middle/bottom)

Return JSON array of books detected.
```

#### 5. `migrations/` - Schéma Base de Données

**Rôle:** Définition et évolution du schéma DB

**Tables principales:**
```sql
-- Collection de livres
CREATE TABLE collections (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Livres détectés
CREATE TABLE collection_items (
  id INTEGER PRIMARY KEY,
  collection_id INTEGER REFERENCES collections(id),
  title TEXT NOT NULL,
  author TEXT,
  estimated_value REAL,
  detected_from TEXT,  -- ID de la photo
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Photos analysées
CREATE TABLE analyzed_photos (
  id TEXT PRIMARY KEY,
  file_name TEXT,
  captured_at DATETIME,
  detected_items INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 APIs et Services

### Services IA Configurés

#### 1. OpenAI GPT-4o Vision

**Usage:** Analyse visuelle de photos de livres

**Configuration:**
```bash
# Dans .dev.vars
OPENAI_API_KEY=sk-proj-...
```

**Coût:** ~$0.02-0.05 par photo (5-10 livres détectés)

**Limitations:**
- 1MB max en base64
- ~2-5 secondes par analyse
- Rate limit: 60 req/min

#### 2. Anthropic Claude

**Usage:** NER (Named Entity Recognition) pour extraction entités

**Configuration:**
```bash
# Dans .dev.vars
ANTHROPIC_API_KEY=sk-ant-...
```

**Coût:** ~$0.003-0.015 par requête

**Status:** ⚠️ Intégré mais peu utilisé actuellement

#### 3. Google Gemini

**Usage:** Recherche de prix et informations complémentaires

**Configuration:**
```bash
# Dans .dev.vars
GEMINI_API_KEY=...
```

**Status:** ⚠️ Intégré mais peu utilisé actuellement

### APIs Externes

#### 1. eBay API

**Usage:** Prix de marché, ventes récentes

**Endpoints utilisés:**
- `findCompletedItems` - Ventes terminées
- `getItemDetails` - Détails d'un item

**Configuration:**
```bash
EBAY_CLIENT_ID=...
EBAY_CLIENT_SECRET=...
```

**Status:** ⚠️ Configuré mais non utilisé activement

#### 2. Google Books API

**Usage:** Lookup ISBN, métadonnées livres, covers

**Endpoints:**
- `GET /volumes?q={query}` - Recherche livres
- `GET /volumes/{id}` - Détails livre

**Configuration:**
```bash
GOOGLE_BOOKS_API_KEY=...
```

**Status:** ⚠️ À intégrer dans pipeline enrichissement

#### 3. Discogs API

**Usage:** Prix musique, livres spécialisés

**Configuration:**
```bash
DISCOGS_API_KEY=...
```

**Status:** ⚠️ Configuré mais non utilisé

---

## 🗄️ Base de Données

### Configuration Cloudflare D1

**Type:** SQLite distribué
**Provider:** Cloudflare D1
**Localisation locale:** `.wrangler/state/v3/d1/`

### Schéma Actuel

#### Table: `collections`

```sql
CREATE TABLE collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Données actuelles:**
- ID 1: "Ma Collection de Livres"

#### Table: `collection_items`

```sql
CREATE TABLE collection_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER NOT NULL REFERENCES collections(id),
  title TEXT NOT NULL,
  author TEXT,
  category TEXT,
  condition TEXT,
  estimated_value REAL DEFAULT 0,
  detected_from TEXT,  -- ID photo source
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Données actuelles:** 7 livres
- The Art of Advanced Dungeons & Dragons
- The Space Art Poster Book
- Lunaria: The Art of Yuri Shwedoff
- etc.

#### Table: `analyzed_photos`

```sql
CREATE TABLE analyzed_photos (
  id TEXT PRIMARY KEY,
  file_name TEXT,
  captured_at DATETIME,
  detected_items INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Données actuelles:** 2 photos analysées

#### Autres Tables

- `ai_analysis` - Résultats analyse IA
- `price_evaluations` - Évaluations prix
- `external_identifiers` - ISBN, codes barres
- `api_cache` - Cache requêtes API
- `activity_logs` - Logs activité
- `service_monitoring` - Monitoring services

### Commandes DB Utiles

```bash
# Lister les tables
npm run db:ls

# Appliquer migrations
npm run db:migrate:local

# Reset complet de la DB
npm run db:reset

# Exécuter du SQL custom
wrangler d1 execute DB --local --command "SELECT * FROM collection_items"

# Exporter vers CSV
npm run db:export
```

---

## 🛠️ Commandes Utiles

### Développement

```bash
# Démarrer serveur dev avec D1
npm run dev:d1

# Build pour production
npm run build

# Prévisualiser build
npm run preview

# Deploy production
npm run deploy:prod
```

### Base de Données

```bash
# Lister tables
npm run db:ls

# Migrations
npm run db:migrate:local
npm run db:migrate:remote

# Console SQL
npm run db:console:local
npm run db:console:remote

# Export
npm run db:export
```

### Scripts Shell

```bash
# Ajouter une photo
./add-photo.sh ~/Downloads/library.heic

# Workflow HEIC complet
./quick-add-heic.sh ~/Photos/*.heic

# Conversion HEIC
./convert-heic.sh input.heic output.jpg

# Export Excel
./export-to-excel.sh

# Démarrage rapide
./demarrage-rapide.sh

# Résumé quotidien
./daily-summary.sh
```

### Tests

```bash
# Tester l'API
curl http://127.0.0.1:3000/api/items
curl http://127.0.0.1:3000/api/photos
curl http://127.0.0.1:3000/api/monitoring/health

# Tester l'analyse d'une photo
curl -X POST http://127.0.0.1:3000/api/photos/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/library.jpg"}'
```

---

## 📝 Conventions de Code

### TypeScript

```typescript
// Noms de fichiers: kebab-case
vision-multi-spine.service.ts
price-aggregator.service.ts

// Noms de classes: PascalCase
export class VisionMultiSpineService { }

// Noms de fonctions: camelCase
export async function analyzePhotoForBooks() { }

// Noms de constantes: UPPER_SNAKE_CASE
const MAX_IMAGE_SIZE_MB = 1;

// Interfaces: PascalCase avec 'I' optionnel
interface BookAnalysisResult { }
```

### Commentaires

```typescript
/**
 * Analyse une photo de livres avec GPT-4o Vision
 * 
 * @param imageData - Image en base64 ou URL
 * @param options - Options d'analyse (maxBooks, confidence, etc.)
 * @returns Tableau de livres détectés avec métadonnées
 * 
 * @example
 * const books = await analyzePhotoForBooks(
 *   "data:image/jpeg;base64,...",
 *   { maxBooks: 10 }
 * );
 */
export async function analyzePhotoForBooks(
  imageData: string,
  options: AnalysisOptions
): Promise<Book[]> { }
```

### Structure des Fichiers

```typescript
// 1. Imports externes
import { Hono } from 'hono';
import { z } from 'zod';

// 2. Imports internes (types)
import type { Env, BookItem } from './types';

// 3. Imports internes (services)
import { VisionService } from './services/vision.service';

// 4. Types et interfaces
interface AnalysisOptions { }

// 5. Constantes
const MAX_IMAGE_SIZE_MB = 1;

// 6. Fonctions principales
export async function analyzePhoto() { }

// 7. Fonctions utilitaires
function validateImageSize() { }
```

---

## 📚 Ressources Importantes

### Documentation Projet

1. **README_DEVELOPPEMENT.md** - ⭐ LIRE EN PREMIER
2. **PROMPT_GENSPARK.md** - Guide détaillé pour GenSpark (ce document)
3. **PROMPT_GENSPARK_SHORT.txt** - Version courte
4. **GUIDE_HEIC.md** - Gestion photos iPhone
5. **EXPORT_GUIDE.md** - Export Excel/CSV
6. **MONITORING_GUIDE.md** - Monitoring système
7. **EBAY_PRODUCTION_SETUP.md** - Configuration eBay API

### Documentation Externe

1. **Cloudflare D1:** https://developers.cloudflare.com/d1/
2. **Hono Framework:** https://hono.dev/
3. **OpenAI Vision API:** https://platform.openai.com/docs/guides/vision
4. **Vite:** https://vitejs.dev/
5. **TypeScript:** https://www.typescriptlang.org/docs/

### GitHub Repository

**URL:** https://github.com/masterDakill/valuecollection

**Branches:**
- `main` - Branche principale (production)
- `feature/*` - Branches de fonctionnalités

**Dernière Mise à Jour:** 2025-11-01

---

## 🤝 Contact

**Propriétaire:** Mathieu Chamberland  
**Email:** Math55_50@hotmail.com  
**Entreprise:** Forza Construction Inc.

**Questions bienvenues!** N'hésitez pas à demander des précisions sur:
- Architecture actuelle
- Choix techniques
- Priorités
- Contraintes spécifiques

---

## 🎯 Checklist de Démarrage

Avant de commencer le développement, assurez-vous d'avoir:

- [ ] ✅ Lu ce document en entier
- [ ] ✅ Lu `README_DEVELOPPEMENT.md`
- [ ] ✅ Cloné le repository GitHub
- [ ] ✅ Installé les dépendances (`npm install`)
- [ ] ✅ Démarré le serveur local (`npm run dev:d1`)
- [ ] ✅ Testé les endpoints API existants
- [ ] ✅ Exploré la structure du code
- [ ] ✅ Compris le schéma de base de données
- [ ] ✅ Testé l'ajout d'une photo (`./add-photo.sh`)
- [ ] ✅ Compris les limitations actuelles

---

## 🚀 Bon Développement!

Ce projet est à un stade fonctionnel mais nécessite des optimisations majeures. Le code existant est propre et bien structuré, ce qui facilite l'ajout de nouvelles fonctionnalités.

**Philosophie du projet:**
- ✅ Code maintenable et documenté
- ✅ Coûts IA maîtrisés
- ✅ Hébergement gratuit (Cloudflare Pages)
- ✅ Performance optimale
- ✅ Expérience utilisateur fluide

**Prochaines étapes suggérées:**
1. 🥇 Créer l'interface React moderne
2. 🥈 Résoudre la limite upload 1MB
3. 🥈 Implémenter le pipeline d'enrichissement
4. 🥉 Optimiser les performances
5. 🥉 Ajouter le dashboard monitoring

Bonne chance et amusez-vous bien! 🎉📚

---

**Document créé par:** Claude AI Assistant  
**Date:** 2025-11-01  
**Version:** 1.0
