# 🚀 Guide de Démarrage Rapide - Évaluateur de Collection Pro

## ✅ État du Système

### Environnement Local
- **URL**: http://localhost:3000
- **Statut**: ✅ Opérationnel
- **Base de données**: D1 Local (6 migrations appliquées)
- **Collection par défaut**: ✅ Créée (ID: 1)

### Environnement Production
- **URL**: https://evaluateur-collection-pro-3z0.pages.dev
- **Statut**: ✅ Opérationnel
- **Base de données**: D1 Cloudflare Remote (synchronisée)
- **Collection par défaut**: ✅ Créée (ID: 1)

---

## 📸 Comment Ajouter des Livres via Photos

### Méthode 1: Interface Web (Onglet Photos)

1. **Accéder à l'onglet Photos**
   - Ouvrez http://localhost:3000 (ou l'URL de production)
   - Cliquez sur l'onglet "Photos" dans la navigation

2. **Uploader une photo de livres**
   - Cliquez sur "Choisir une photo" ou glissez-déposez
   - Formats acceptés: JPG, PNG, WebP
   - La photo peut contenir **5-10 livres** (détection multi-spine)

3. **Analyse automatique**
   - L'IA GPT-4o Vision analyse la photo
   - Détecte automatiquement chaque livre visible
   - Extrait: titre, auteur, éditeur, ISBN

4. **Résultats**
   - Les livres détectés apparaissent dans l'onglet "Base de Données"
   - Chaque livre peut ensuite être enrichi et évalué

---

### Méthode 2: API REST (Pour Scripts)

#### A. Analyser une photo
```bash
curl -X POST http://localhost:3000/api/photos/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/photo-livres.jpg"
  }'
```

#### B. Enrichir un livre avec Google Books
```bash
curl -X POST http://localhost:3000/api/items/1/enrich
```

#### C. Évaluer un livre (prix + rareté)
```bash
curl -X POST http://localhost:3000/api/items/1/evaluate
```

---

## 📚 Workflow Complet Recommandé

### Étape 1: Analyser Photos
```bash
# Utiliser le script d'analyse rapide
./quick-add.sh /path/to/photo.jpg
```

### Étape 2: Enrichir les Livres
Dans l'interface web, onglet "Base de Données":
- Cliquez sur **"Enrichir Tout"** pour enrichir les 20 premiers livres
- OU cliquez sur "Enrichir" pour un livre spécifique

### Étape 3: Évaluer les Livres
- Cliquez sur **"Évaluer"** pour obtenir:
  - Prix multi-sources (eBay, AbeBooks, Amazon)
  - Analyse de rareté IA
  - Comparaison des éditions

---

## 🔄 Scripts d'Automation Disponibles

### 1. Ajout Rapide d'une Photo
```bash
./quick-add.sh /Users/Mathieu/Downloads/photo-livres.jpg
```

### 2. Traitement Batch
```bash
./process-books-batch.sh /Users/Mathieu/Pictures/livres/
```

### 3. Résumé Quotidien
```bash
./daily-summary.sh
```

### 4. Analyse Unitaire
```bash
./analyze-single-photo.sh photo-id-123
```

---

## 🔍 Routes API Disponibles

### Photos
| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/photos` | GET | Liste des photos analysées |
| `/api/photos/analyze` | POST | Analyser une nouvelle photo |
| `/api/photos/:id` | GET | Détails d'une photo |
| `/api/photos/:id` | DELETE | Supprimer une photo |

### Livres (Items)
| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/items` | GET | Liste des livres avec pagination |
| `/api/items/:id/enrich` | POST | Enrichir via Google Books |
| `/api/items/enrich-all` | POST | Enrichir batch (max 20) |
| `/api/items/:id/evaluate` | POST | Évaluation complète IA |

---

## 🛠 Commandes de Maintenance

### Démarrer le serveur local
```bash
npm run dev:d1
```

### Construire pour production
```bash
npm run build
```

### Déployer en production
```bash
npm run deploy:prod
```

### Appliquer les migrations
```bash
# Local
npm run db:migrate:local

# Production
wrangler d1 migrations apply DB --remote
```

### Réinitialiser la base locale
```bash
npm run db:reset
```

---

## 📊 Statistiques et Dashboard

L'interface affiche en temps réel:
- **Total Livres**: Nombre total dans la collection
- **Enrichis**: Livres avec métadonnées complètes
- **Photos**: Nombre de photos analysées
- **Évalués**: Livres avec évaluation de prix

---

## 💰 Coûts Estimés

### Analyse de Photos (GPT-4o Vision)
- **Coût par photo**: ~$0.001 - $0.002
- **Traitement 1500 livres** (150 photos): ~$1.50 - $2.00

### Enrichissement Google Books
- **Gratuit** (quota: 1000 requêtes/jour)

### Évaluation IA (Rotation LLM)
- **OpenAI GPT-4**: $0.03 par évaluation
- **Claude Sonnet**: $0.015 par évaluation
- **Gemini Pro**: $0.001 par évaluation
- **Rotation automatique** pour optimiser les coûts

---

## ⚠️ Problèmes Connus & Solutions

### "Rien ne s'affiche dans l'interface"
**Cause**: Base de données vide
**Solution**: Ajoutez des photos via l'onglet Photos

### "Le serveur local ne démarre pas"
**Solution**:
```bash
# Arrêter tous les process
pkill -f wrangler

# Reconstruire
npm run build

# Relancer
npm run dev:d1
```

### "Erreur de migration en production"
**Solution**:
```bash
# Marquer les migrations comme appliquées
wrangler d1 execute DB --remote --command="
  INSERT INTO d1_migrations (name, applied_at)
  VALUES ('0004_add_photo_storage.sql', datetime('now'));
"
```

---

## 📝 Prochaines Étapes

1. **Ajoutez vos premières photos** via l'interface
2. **Testez l'enrichissement** automatique
3. **Évaluez quelques livres** pour voir les prix
4. **Consultez les guides détaillés**:
   - `WORKFLOW_INCREMENTAL.md` - Workflow photo par photo
   - `DEMARRAGE_RAPIDE_1500_LIVRES.md` - Traitement batch
   - `SYSTEME_EVALUATION_COMPLETE.md` - Système d'évaluation IA

---

## 🆘 Support

Pour toute question ou problème:
1. Consultez les logs: `.wrangler/logs/`
2. Vérifiez les variables d'environnement dans `.dev.vars`
3. Testez les routes API manuellement avec `curl`

---

## ✅ Checklist de Validation

- [x] Serveur local démarré
- [x] Serveur production déployé
- [x] Migrations appliquées (6/6)
- [x] Collection par défaut créée
- [x] Routes API testées (200 OK)
- [ ] Première photo uploadée
- [ ] Premier livre enrichi
- [ ] Premier livre évalué

**L'application est prête à l'emploi!** 🎉
