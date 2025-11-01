# 📘 Guide de Développement - ValueCollection

## 📂 Répertoire du Projet
```
/Users/Mathieu/Documents/1-Developer/GitHub/valuecollection/valuecollection
```

## 🌐 Repository GitHub
```
https://github.com/masterDakill/valuecollection
```

---

## 🚀 Démarrage Rapide

### 1. Installation des dépendances
```bash
cd /Users/Mathieu/Documents/1-Developer/GitHub/valuecollection/valuecollection
npm install
```

### 2. Démarrer le serveur de développement
```bash
npm run dev:d1
```
**URL:** http://127.0.0.1:3000

### 3. Vérifier la base de données
```bash
npm run db:ls
```

---

## 📊 État Actuel du Projet

### ✅ Fonctionnalités Opérationnelles

| Fonctionnalité | Statut | Commande/Script |
|----------------|--------|-----------------|
| **Serveur Dev** | ✅ Fonctionnel | `npm run dev:d1` |
| **Base de données D1** | ✅ Configurée | `.wrangler/state/v3/d1/` |
| **Analyse Photo HEIC** | ✅ Automatique | `./add-photo.sh` |
| **GPT-4o Vision** | ✅ 5-10 livres/photo | API configurée |
| **Export Excel** | ✅ CSV | `npm run db:export` |
| **Migrations DB** | ✅ 6 migrations | `npm run db:migrate:local` |

### 📚 Livres Actuels
- **7 livres** dans la base de données
- Collection ID: 1 ("Ma Collection de Livres")
- Dernière analyse: 2025-11-01

---

## 🔧 Configuration

### Variables d'environnement (.dev.vars)
```bash
ENVIRONMENT=development
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
EBAY_CLIENT_ID=...
EBAY_CLIENT_SECRET=...
DISCOGS_API_KEY=...
GOOGLE_BOOKS_API_KEY=...
```

### Base de données
- **Type:** Cloudflare D1 (SQLite)
- **Location locale:** `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`
- **Migrations:** `migrations/0001-0006`

---

## 📝 Scripts Disponibles

### Développement
```bash
npm run dev          # Vite dev server (sans D1)
npm run dev:d1       # Wrangler dev avec D1 (RECOMMANDÉ)
npm run build        # Build pour production
npm run deploy:prod  # Deploy sur Cloudflare Pages
```

### Base de Données
```bash
npm run db:ls              # Lister les tables
npm run db:migrate:local   # Appliquer les migrations
npm run db:reset           # Reset complet de la DB
npm run db:export          # Exporter vers CSV/Excel
```

### Scripts d'Automation
```bash
./add-photo.sh photo.heic           # Ajouter une photo (HEIC/JPG)
./quick-add-heic.sh *.heic          # Workflow complet HEIC
./export-to-excel.sh                # Export CSV
./convert-heic.sh input.heic        # Conversion simple
```

---

## 🏗️ Architecture du Projet

### Structure des dossiers
```
valuecollection/
├── src/
│   ├── index.tsx                 # Point d'entrée
│   ├── routes/
│   │   ├── items.ts             # CRUD livres
│   │   ├── monitoring.ts        # Monitoring système
│   │   └── photos.ts            # Analyse photos
│   └── services/
│       ├── vision-multi-spine.service.ts  # GPT-4o Vision
│       ├── claude-ner.service.ts          # Claude NER
│       ├── gemini-price-search.service.ts # Gemini Search
│       └── photo-storage.service.ts       # Storage photos
├── migrations/                   # Migrations DB
├── dist/                        # Build output
├── .wrangler/                   # État local Wrangler
└── *.sh                         # Scripts automation
```

### Technologies
- **Framework:** Hono (API)
- **Database:** Cloudflare D1 (SQLite)
- **AI Services:**
  - OpenAI GPT-4o Vision (analyse photos)
  - Anthropic Claude (NER)
  - Google Gemini (recherche prix)
- **Build:** Vite
- **Deployment:** Cloudflare Pages
- **Dev Server:** Wrangler

---

## 🔍 APIs Principales

### Gestion des Livres
```bash
GET    /api/items              # Liste tous les livres
POST   /api/items              # Ajouter un livre
GET    /api/items/:id          # Détails d'un livre
PUT    /api/items/:id          # Modifier
DELETE /api/items/:id          # Supprimer
```

### Analyse Photos
```bash
POST   /api/photos/analyze     # Analyser une photo
GET    /api/photos             # Liste des photos
GET    /api/photos/:id         # Détails photo
```

### Monitoring
```bash
GET    /api/monitoring/stats   # Stats système
GET    /api/monitoring/health  # Health check
```

---

## 🐛 Problèmes Connus & Solutions

### 1. Erreur EPIPE avec Wrangler
**Solution:** Le script `dev:d1` inclut `--inspector-port 0`
```json
"dev:d1": "wrangler pages dev dist --local --ip 0.0.0.0 --port 3000 --inspector-port 0"
```

### 2. Image trop grande (> 1MB)
**Solution:** Les scripts `add-photo.sh` et `quick-add-heic.sh` compressent automatiquement à qualité 40

### 3. Fichiers HEIC non supportés
**Solution:** Conversion automatique avec `sips` (macOS)

---

## 📖 Documentation Disponible

| Document | Description |
|----------|-------------|
| `GUIDE_HEIC.md` | Guide complet gestion photos iPhone |
| `EXPORT_GUIDE.md` | Export vers Excel/CSV |
| `GUIDE_DEMARRAGE_RAPIDE.md` | Quick start |
| `MONITORING_GUIDE.md` | Guide monitoring |
| `EBAY_PRODUCTION_SETUP.md` | Configuration eBay API |
| `DEMARRAGE.md` | Guide général |

---

## 🔄 Workflow de Développement Typique

### Pour continuer le développement:

1. **Cloner ou mettre à jour:**
```bash
cd /Users/Mathieu/Documents/1-Developer/GitHub/valuecollection/valuecollection
git pull origin main
```

2. **Installer les dépendances:**
```bash
npm install
```

3. **Démarrer le serveur:**
```bash
npm run dev:d1
```

4. **Faire vos modifications**

5. **Tester:**
```bash
# Tester l'ajout de photo
./add-photo.sh ~/Downloads/test.heic

# Tester l'export
npm run db:export
```

6. **Commiter et pousser:**
```bash
git add .
git commit -m "Description des changements"
git push origin main
```

---

## 🎯 Prochaines Étapes Suggérées

### Fonctionnalités à Développer

1. **Interface Web Améliorée**
   - Upload drag & drop
   - Prévisualisation photos
   - Édition inline des livres

2. **Enrichissement Automatique**
   - ISBN lookup automatique
   - Récupération couvertures
   - Prix temps réel eBay

3. **Évaluation IA**
   - Estimation valeur automatique
   - Analyse de rareté
   - Tendances marché

4. **Export Avancé**
   - Format PDF
   - Import/Export JSON
   - Synchronisation cloud

5. **Statistiques**
   - Dashboard analytics
   - Graphiques valeur collection
   - Historique évolution

---

## 🔐 Sécurité

### Secrets à NE PAS commiter:
- `.dev.vars` (déjà dans .gitignore)
- `.wrangler/` (déjà dans .gitignore)
- `export_*.csv` (exports temporaires)
- Toute clé API réelle

### Fichiers sensibles protégés:
- ✅ `.dev.vars` ignoré
- ✅ `.wrangler/` ignoré
- ✅ Secrets remplacés par placeholders dans docs

---

## 📞 Contact & Support

**Propriétaire:** Mathieu Chamberland
**Email:** Math55_50@hotmail.com
**Entreprise:** Forza Construction Inc.

---

## 🏁 Commandes de Référence Rapide

```bash
# Démarrer dev
npm run dev:d1

# Ajouter des livres
./add-photo.sh ~/Downloads/*.HEIC

# Exporter
npm run db:export

# Voir les livres
curl http://127.0.0.1:3000/api/items | jq

# Reset DB
npm run db:reset

# Deploy production
npm run deploy:prod
```

---

## 📊 Métriques du Projet

- **Lignes de code:** ~4,500+ lignes
- **Fichiers:** 32 nouveaux fichiers
- **Scripts:** 11 scripts d'automation
- **Documentation:** 10+ guides
- **Migrations DB:** 6 migrations
- **Services IA:** 3 (OpenAI, Claude, Gemini)

---

## 🎉 État du Commit Actuel

**Commit:** `21ea299`
**Message:** ✨ Système complet d'inventaire de livres avec analyse photo HEIC
**Date:** 2025-11-01
**Fichiers modifiés:** 32 files changed, 4473 insertions(+), 171 deletions(-)

**Fonctionnalités ajoutées:**
- Support HEIC complet
- Analyse multi-livres GPT-4o
- Export Excel
- Scripts automation
- Documentation complète

---

Bon développement! 🚀📚
