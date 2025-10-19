# 🚀 Guide de Démarrage Rapide - Analyse d'Images/Vidéos

**Temps estimé**: 10 minutes
**Coût initial**: ~$5 USD de crédit OpenAI (suffisant pour 150-500 analyses)

---

## 📸 Étape 1 : Obtenir une Clé API OpenAI (OBLIGATOIRE)

### A. Créer un compte OpenAI Platform

1. **Aller sur** : https://platform.openai.com/signup
2. **Créer un compte** avec votre email
3. **Vérifier votre email** (cliquer sur le lien reçu)

### B. Ajouter du crédit

1. **Aller dans** : https://platform.openai.com/account/billing/overview
2. **Cliquer** : "Add payment method"
3. **Entrer votre carte** de crédit
4. **Ajouter crédit** : $5-10 USD recommandé pour commencer
   - $5 = ~150-250 analyses d'images
   - $10 = ~300-500 analyses d'images

### C. Générer votre clé API

1. **Aller dans** : https://platform.openai.com/api-keys
2. **Cliquer** : "+ Create new secret key"
3. **Nommer** : "Evaluateur Collection Pro"
4. **Permissions** : All (ou au minimum "Read" et "Write")
5. **Copier la clé** : `sk-proj-XXXXXXXXXXXXXXXXXXXXXX`

   ⚠️ **IMPORTANT** : La clé ne sera affichée qu'une seule fois !
   Si vous la perdez, il faudra en créer une nouvelle.

### D. Configurer votre application

1. **Ouvrir** : `.dev.vars` (dans le dossier de votre projet)
2. **Remplacer** :
   ```bash
   OPENAI_API_KEY=REMPLACER_PAR_VOTRE_CLE
   ```

   Par :
   ```bash
   OPENAI_API_KEY=sk-proj-VOTRE_VRAIE_CLE_ICI
   ```

3. **Sauvegarder** le fichier

✅ **C'est tout !** Vous pouvez maintenant analyser vos images !

---

## 🎯 Étape 2 : Tester l'Analyse d'Images

### Méthode 1 : Interface Web (Recommandée)

```bash
# Démarrer le serveur local
npm run dev

# Ouvrir dans votre navigateur
# http://localhost:3000
```

**Dans l'interface :**

1. **Section** : "📸 Évaluation par Image/Vidéo"
2. **Cliquer** : "Sélectionner Image"
3. **Choisir** : Une photo d'un objet de collection
4. **Cliquer** : "Analyser avec IA"
5. **Attendre** : 3-5 secondes
6. **Résultats** : Affichage de l'analyse complète

### Méthode 2 : API Directe (Pour développeurs)

```bash
# Test avec une URL d'image
curl -X POST http://localhost:3000/api/smart-evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/votre-image.jpg"
  }'

# Ou avec analyse avancée multi-expert
curl -X POST http://localhost:3000/api/advanced-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "text_input": "Vinyl Beatles Abbey Road 1969",
    "imageUrl": "https://example.com/album-cover.jpg"
  }'
```

---

## 📊 Ce que le Système Analyse

### Analyse Automatique d'Image (GPT-4o Vision)

✅ **Identification** :
- Titre exact de l'objet
- Auteur/Artiste
- Année de production
- Catégorie (Livres, Musique, Art, Cartes, Comics, etc.)

✅ **OCR (Extraction de Texte)** :
- Texte visible sur l'image
- Numéros de série
- Édition/Publisher
- ISBN pour livres

✅ **Évaluation Visuelle** :
- État/Condition (Mint, Near Mint, Good, Fair, Poor)
- Score de qualité (1-10)
- Authenticité visuelle
- Détails notables

✅ **Valeur Marchande** :
- Estimation de prix (CAD $)
- Fourchette min/max
- Score de rareté (1-10)
- Niveau de confiance

### Système Multi-Expert (3 IA spécialisées)

**1. 🔍 OpenAI Vision Expert**
- Analyse visuelle détaillée
- Reconnaissance objets + texte
- Évaluation condition physique

**2. 📚 Claude Collection Expert**
- Contexte historique
- Évaluation de provenance
- Expertise culturelle

**3. ⚖️ Gemini Comparative** (Mode démo actuellement)
- Comparaisons de marché
- Tendances de prix

**Consolidation Finale** :
- Consensus entre les 3 experts
- Pourcentage d'accord
- Recommandations d'action

---

## 💰 Intégration Prix de Marché (Optionnel)

### APIs Disponibles

| Service | Type | Besoin Clé API | Coût |
|---------|------|----------------|------|
| **eBay** | Marketplace général | Oui | Gratuit (5000 appels/jour) |
| **Discogs** | Vinyles/Musique | Oui | Gratuit (60 req/min) |
| **Google Books** | Livres | Oui | Gratuit (1000 req/jour) |

### Configuration eBay (Recommandée)

1. **Créer compte** : https://developer.ebay.com/join
2. **Créer une app** : https://developer.ebay.com/my/keys
   - Type : "Production"
   - Nom : "Collection Evaluator"
3. **Obtenir** :
   - `App ID (Client ID)` → copier dans `.dev.vars`
   - `Cert ID (Client Secret)` → copier dans `.dev.vars`

### Configuration Discogs (Pour vinyles)

1. **Compte Discogs** : https://www.discogs.com/users/create
2. **Settings → Developers** : https://www.discogs.com/settings/developers
3. **Generate Token** → copier dans `.dev.vars`

### Configuration Google Books

1. **Google Cloud Console** : https://console.cloud.google.com/
2. **Créer projet** : "Collection Evaluator"
3. **APIs & Services → Library** : Activer "Books API"
4. **Credentials** : Créer "API Key" → copier dans `.dev.vars`

---

## 🧪 Exemples d'Utilisation

### Exemple 1 : Analyser un Livre Rare

**Upload d'image** : Photo de la couverture + page de titre

**Résultat attendu** :
```json
{
  "category": "Books",
  "title": "The Great Gatsby - First Edition",
  "author": "F. Scott Fitzgerald",
  "year": 1925,
  "estimated_value": 25000,
  "rarity_score": 9,
  "condition_assessment": "Near Mint - Minor foxing on endpapers",
  "key_features": [
    "First edition, first printing",
    "Dust jacket intact",
    "Original binding"
  ],
  "expertise_notes": "Extremely rare first edition with dust jacket...",
  "confidence": 0.92
}
```

### Exemple 2 : Analyser un Vinyl

**Upload d'image** : Photo de l'album + étiquette centrale

**Résultat attendu** :
```json
{
  "category": "Music",
  "title": "Abbey Road - The Beatles",
  "artist": "The Beatles",
  "year": 1969,
  "estimated_value": 45,
  "rarity_score": 6,
  "condition_assessment": "Excellent - Light surface wear",
  "market_position": "Common pressing, good condition premium",
  "comparable_sales": [
    "Same album sold $40-50 on eBay recently",
    "Discogs median price: $42 CAD"
  ]
}
```

### Exemple 3 : Carte Pokémon

**Upload d'image** : Photo recto-verso de la carte

**Résultat attendu** :
```json
{
  "category": "Trading Cards",
  "title": "Charizard - Base Set 1st Edition",
  "year": 1999,
  "estimated_value": 3500,
  "rarity_score": 10,
  "condition_assessment": "PSA 8 equivalent - Near Mint",
  "key_features": [
    "1st Edition stamp visible",
    "Holographic pattern intact",
    "Minimal edge wear"
  ],
  "action_recommendations": [
    "Consider professional grading (PSA/BGS)",
    "Store in protective case",
    "Market demand very high"
  ]
}
```

---

## 🎬 Analyser une Vidéo

### Format Supporté
- **URL YouTube** : Lien direct vers la vidéo
- **Fichier vidéo** : Upload direct (max 10MB recommandé)

### Comment ça marche ?
1. Le système extrait plusieurs frames (images) de la vidéo
2. Analyse chaque frame avec GPT-4o Vision
3. Consolide les informations de tous les frames
4. Retourne une analyse complète

### Exemple d'utilisation

**Interface Web** :
1. Section "📸 Évaluation par Image/Vidéo"
2. Cliquer "Sélectionner Vidéo"
3. Choisir une vidéo montrant l'objet sous différents angles
4. Analyser → Résultats multi-angles

**API** :
```bash
curl -X POST http://localhost:3000/api/smart-evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=XXXXX"
  }'
```

---

## 🔍 Mode Démo (Sans Clés API)

### Comment l'activer ?

**Automatique** : Si aucune clé API configurée dans `.dev.vars`, le système passe en mode démo.

### Que fait le mode démo ?

- ✅ Interface complète fonctionnelle
- ✅ Données fictives cohérentes et réalistes
- ✅ Import/Export CSV
- ✅ Détection de doublons
- ❌ Pas d'analyse d'images réelles
- ❌ Pas de prix de marché réels

### Idéal pour :
- Tester l'interface utilisateur
- Former des utilisateurs
- Développer de nouvelles fonctionnalités
- Démo clients

---

## 📈 Suivi des Coûts OpenAI

### Vérifier votre usage

1. **Dashboard** : https://platform.openai.com/usage
2. **Voir** :
   - Coût par jour
   - Nombre de requêtes
   - Tokens utilisés

### Coûts Typiques (GPT-4o Vision)

| Activité | Coût Approximatif |
|----------|-------------------|
| 1 analyse d'image simple | $0.01 - $0.02 |
| 1 analyse d'image haute résolution | $0.02 - $0.03 |
| 1 analyse vidéo (10 frames) | $0.10 - $0.30 |
| 100 analyses d'images | $1 - $3 |
| 1000 analyses | $10 - $30 |

### Optimiser les coûts

✅ **Bonnes pratiques** :
- Réduire la résolution des images (1024x1024 max recommandé)
- Utiliser le cache pour objets similaires
- Analyser uniquement les nouvelles images
- Désactiver les experts non nécessaires

---

## ❓ Troubleshooting

### "Invalid API Key"

**Cause** : Clé OpenAI incorrecte ou expirée

**Solution** :
1. Vérifier que la clé commence par `sk-proj-` ou `sk-`
2. Pas d'espaces avant/après dans `.dev.vars`
3. Régénérer une nouvelle clé si nécessaire

### "Insufficient Quota"

**Cause** : Pas assez de crédit sur votre compte OpenAI

**Solution** :
1. Aller sur https://platform.openai.com/account/billing
2. Ajouter du crédit ($5-10 recommandé)

### "Request Timeout"

**Cause** : Image trop lourde ou connexion lente

**Solution** :
1. Réduire la taille de l'image (< 2MB idéal)
2. Vérifier votre connexion internet
3. Réessayer (timeout de 30s)

### "Analysis returned demo data"

**Cause** : Mode démo activé (clé API manquante)

**Solution** :
1. Vérifier `.dev.vars` contient la vraie clé
2. Redémarrer le serveur : `npm run dev`

### "CORS Error"

**Cause** : URL d'origine non autorisée

**Solution** :
1. Utiliser `http://localhost:3000` (pas 127.0.0.1)
2. En production, configurer CORS dans `src/index.tsx`

---

## 🎯 Checklist de Démarrage

- [ ] Compte OpenAI créé
- [ ] $5-10 de crédit ajouté
- [ ] Clé API générée et copiée
- [ ] `.dev.vars` configuré avec la clé
- [ ] Serveur local démarré (`npm run dev`)
- [ ] Première image analysée avec succès
- [ ] Résultat affiché dans l'interface

**Temps total** : 10-15 minutes

---

## 📞 Support

**Questions ?** Consultez :
- `README.md` - Guide utilisateur complet
- `ARCHITECTURE.md` - Documentation technique
- `.env.example` - Liste complète des variables

**Logs utiles** :
```bash
# Voir les logs en temps réel
npm run dev

# Vérifier les appels API
# Les logs affichent : "🧠 Démarrage analyse multi-expert..."
```

---

**Prêt à analyser vos collections !** 🚀📸

Une fois configuré, vous pouvez analyser des milliers d'objets en quelques secondes.
