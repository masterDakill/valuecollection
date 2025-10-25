# 🚀 Utilisation Immédiate - Système Lancé!

## ✅ Serveur Actif

Votre serveur est **opérationnel** sur `http://localhost:3000`

Status: ✅ **HEALTHY**
Version: **2.1.0**

---

## 🎯 Accès Rapides

### Interface Web Principale
```bash
open http://localhost:3000
```

**Onglets disponibles:**
- 📊 Base de Données - Voir tous vos items
- 📸 Photos & Livres - Galerie de photos analysées
- ⭐ Recommandations - Suggestions IA
- 📢 Créer Annonce - Générer annonces automatiques
- ⚖️ Comparables - Trouver prix de marché

### Documentation Interactive
```bash
open http://localhost:3000/docs
```
Interface Swagger pour tester tous les endpoints

---

## 📸 Analyser Vos Photos de Livres

### Option 1: Via Interface Web

1. Ouvrir http://localhost:3000
2. Onglet "Photos & Livres"
3. (Interface d'upload à venir - pour l'instant utiliser API)

### Option 2: Via Script Batch (Recommandé)

```bash
# Créer un dossier pour vos photos
mkdir ~/Photos_Livres

# Y mettre vos photos iPhone (AirDrop)

# Lancer le traitement automatique
./process-books-batch.sh ~/Photos_Livres
```

### Option 3: Via API Directe (Test)

**Avec URL d'image:**
```bash
curl -X POST http://localhost:3000/api/photos/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/books.jpg",
    "options": {
      "maxItems": 10,
      "collectionId": 1
    }
  }' | jq '.'
```

**Avec photo locale (base64):**
```bash
# Convertir photo en base64
BASE64_IMG=$(base64 -i ~/Photos/livre.jpg)

# Envoyer pour analyse
curl -X POST http://localhost:3000/api/photos/analyze \
  -H "Content-Type: application/json" \
  -d "{
    \"imageBase64\": \"data:image/jpeg;base64,$BASE64_IMG\",
    \"options\": {
      \"maxItems\": 10,
      \"collectionId\": 1
    }
  }" | jq '.'
```

---

## 📊 Consulter Vos Données

### Voir Toutes les Photos Analysées
```bash
curl -s http://localhost:3000/api/photos | jq '.photos'
```

### Voir une Photo Spécifique (avec livres détectés)
```bash
curl -s http://localhost:3000/api/photos/1 | jq '.'
```

### Voir Tous les Items de Collection
```bash
curl -s http://localhost:3000/api/items | jq '.items[] | {title, artist_author, photo_id}'
```

### Statistiques
```bash
# Nombre de photos
curl -s http://localhost:3000/api/photos | jq '.photos | length'

# Nombre total de livres détectés
curl -s http://localhost:3000/api/items | jq '.items | length'

# Livres avec photos
curl -s http://localhost:3000/api/items | jq '.items | map(select(.photo_id != null)) | length'
```

---

## 🎯 Workflows Typiques

### Workflow 1: Analyser une Photo Test

```bash
# 1. Créer dossier test
mkdir ~/test_livre

# 2. AirDrop UNE photo depuis iPhone

# 3. Analyser
./process-books-batch.sh ~/test_livre

# 4. Voir le résultat
curl -s http://localhost:3000/api/photos | jq '.photos[-1]'
```

### Workflow 2: Traiter 100 Livres

```bash
# 1. Organiser vos photos (10 livres/photo = 10 photos)
mkdir ~/Photos_Batch1

# 2. Transférer 10 photos

# 3. Lancer le batch
./process-books-batch.sh ~/Photos_Batch1

# 4. Voir les résultats
curl -s http://localhost:3000/api/photos | jq '.photos | length'
curl -s http://localhost:3000/api/items | jq '.items | length'
```

### Workflow 3: Traiter 1500 Livres (Production)

```bash
# 1. Organiser par lots de 150 photos
mkdir -p ~/Livres_Collection/{lot_1,lot_2,lot_3}

# 2. Répartir vos photos dans les lots

# 3. Traiter lot par lot
./process-books-batch.sh ~/Livres_Collection/lot_1
# Pause, vérifier
./process-books-batch.sh ~/Livres_Collection/lot_2
# etc.
```

---

## 🔍 Endpoints API Disponibles

### Photos
- `GET /api/photos` - Liste toutes les photos
- `GET /api/photos/:id` - Détails d'une photo
- `POST /api/photos/analyze` - Analyser une nouvelle photo
- `DELETE /api/photos/:id` - Supprimer une photo

### Items
- `GET /api/items` - Liste tous les items
- `GET /api/items/:id` - Détails d'un item
- `POST /api/items` - Créer un item
- `PUT /api/items/:id` - Modifier un item
- `DELETE /api/items/:id` - Supprimer un item

### Collections
- `GET /api/collections` - Liste des collections
- `POST /api/collections` - Créer une collection

### Système
- `GET /healthz` - Health check
- `GET /readyz` - Readiness check
- `GET /info` - Info système
- `GET /metrics` - Métriques Prometheus
- `GET /examples` - Exemples d'utilisation
- `GET /docs` - Documentation Swagger

### Cache
- `GET /api/cache/stats` - Statistiques du cache
- `POST /api/cache/cleanup` - Nettoyer le cache

---

## 📈 Monitoring en Temps Réel

### Surveiller les Uploads
```bash
# Terminal dédié
watch -n 2 "curl -s http://localhost:3000/api/photos | jq '{photos: (.photos | length), total_books: (.photos | map(.total_items_detected) | add // 0)}'"
```

### Voir les Logs Serveur
```bash
tail -f /tmp/server.log
```

### Stats Cache
```bash
curl -s http://localhost:3000/api/cache/stats | jq '.cache_stats'
```

---

## 💡 Conseils Pratiques

### Photos iPhone
- **Format**: HEIC/JPG acceptés
- **Taille max**: 1MB pour base64 (ou utiliser URL)
- **Qualité**: Photos nettes, bonne lumière
- **Disposition**: 5-10 livres par photo optimal

### Performance
- **Temps/photo**: ~2-4 secondes
- **Coût OpenAI**: ~$0.01/photo
- **Cache**: Photos identiques = gratuit
- **Délai recommandé**: 3-5s entre photos

### Batch Processing
- **Petit test**: 5-10 photos d'abord
- **Lots**: 100-200 photos/lot
- **Vérification**: Entre chaque lot
- **Logs**: Gardés dans `./logs/batch-*`

---

## 🐛 Dépannage Rapide

### Serveur ne répond pas
```bash
curl http://localhost:3000/healthz
# Si erreur:
pkill -f wrangler
npm run dev:d1
```

### Erreur OpenAI
```bash
# Vérifier la clé
grep OPENAI_API_KEY .dev.vars

# Tester l'API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $(grep OPENAI_API_KEY .dev.vars | cut -d= -f2)"
```

### Photo trop grosse
```bash
# Compresser avec ImageMagick
brew install imagemagick
convert input.jpg -quality 85 -resize 1920x1920\> output.jpg
```

---

## 🎯 Prochaines Actions

### Maintenant (Test Rapide)
```bash
# 1. AirDrop 1 photo de test
# 2. Mettre dans ~/test
# 3. Analyser
./process-books-batch.sh ~/test
```

### Ensuite (Production)
```bash
# 1. Organiser vos 1500 livres en photos
# 2. Créer lots de 150 photos
# 3. Traiter lot par lot
# 4. Vérifier résultats
# 5. Générer annonces (à venir)
```

---

## 📞 Commandes de Référence Rapide

```bash
# Démarrer serveur
npm run dev:d1

# Tester système
./test-photo-system.sh

# Traiter photos
./process-books-batch.sh <dossier>

# Voir photos
curl http://localhost:3000/api/photos | jq

# Voir items
curl http://localhost:3000/api/items | jq

# Interface web
open http://localhost:3000

# Documentation
open http://localhost:3000/docs
```

---

## ✅ État Actuel

- 🟢 Serveur: **RUNNING** (http://localhost:3000)
- 🟢 Base de données: **READY** (7 tables)
- 🟢 API Photos: **AVAILABLE**
- 🟢 Multi-Expert IA: **ENABLED**
- 🟢 Cache: **ACTIVE**
- 🟢 OpenAI: **CONFIGURED**

**Photos actuelles**: 3
**Items actuels**: Variable (consultez l'API)

---

**🚀 Votre système est prêt à traiter vos 1500 livres!**

Commencez par un test avec 1-2 photos, puis lancez le traitement batch complet.
