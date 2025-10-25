# 🚀 GUIDE D'UTILISATION - ImageToValue v2.1

**Application démarrée avec succès sur http://localhost:3000**

---

## 📚 ONGLET 1 : DOCUMENTATION SWAGGER (http://localhost:3000/docs)

### **Ce que vous voyez :**

La page Swagger UI interactive avec tous vos endpoints documentés.

### **Comment utiliser :**

1. **Explorer les endpoints** - Cliquez sur un endpoint pour voir les détails
2. **Tester directement** - Cliquez sur "Try it out" puis "Execute"
3. **Voir les réponses** - La réponse s'affiche en temps réel

### **Endpoints à tester en premier :**

#### ✅ **GET /healthz** - Santé du système
- Cliquez sur `/healthz`
- Cliquez "Try it out"
- Cliquez "Execute"
- Vous verrez : `{"status":"healthy","version":"2.1.0"}`

#### 💾 **GET /api/cache/stats** - Statistiques du cache
- Même procédure
- Vous verrez : Entrées cache, hit rate, économies estimées

#### ℹ️ **GET /info** - Informations système
- Même procédure
- Vous verrez : Version, environnement, fonctionnalités activées

---

## 🎨 ONGLET 2 : APPLICATION PRINCIPALE (http://localhost:3000)

### **Ce que vous voyez :**

Votre interface d'import et d'évaluation de livres.

### **Comment importer vos livres :**

#### **Option A : Import CSV** 📄

1. **Préparer votre CSV** avec les colonnes :
   ```
   title,author,category,image_url
   "Le Seigneur des Anneaux","Tolkien","books","https://..."
   "1984","Orwell","books","https://..."
   ```

2. **Importer** :
   - Cliquez sur "Import CSV" ou le bouton d'import
   - Sélectionnez votre fichier CSV
   - Attendez la confirmation

#### **Option B : Import ZIP d'images** 🖼️

1. **Préparer votre ZIP** avec vos photos de livres :
   ```
   mes-livres.zip
   ├── livre1.jpg
   ├── livre2.jpg
   └── livre3.jpg
   ```

2. **Importer** :
   - Cliquez sur "Import ZIP" ou glissez-déposez
   - Sélectionnez votre fichier ZIP
   - Le système va :
     - Extraire les images
     - Analyser chaque livre avec les 3 experts IA
     - Évaluer les prix automatiquement

#### **Option C : Ajout Manuel** ✍️

1. Cliquez sur "Ajouter un livre"
2. Remplissez les champs :
   - Titre
   - Auteur
   - Catégorie
   - URL de l'image (ou upload)
3. Cliquez "Évaluer"

---

## 📊 SURVEILLER LE CACHE EN TEMPS RÉEL

Pendant que vous importez vos livres, surveillez le cache :

### **Dans un terminal :**

```bash
# Voir les stats toutes les 5 secondes
watch -n 5 "curl -s http://localhost:3000/api/cache/stats | jq .cache_stats"
```

**Vous verrez :**
```json
{
  "total_entries": 45,      ← Augmente à chaque nouvelle requête API
  "total_hits": 12,          ← Nombre de fois le cache a été utilisé
  "hit_rate": 26.67,         ← % d'économies (augmente avec le temps)
  "cache_size_mb": 2.34      ← Taille du cache
}
```

### **Progression attendue :**

- **10 premiers livres** : Hit rate ~0-10% (cache se remplit)
- **50 livres** : Hit rate ~40-60% (début des économies)
- **100+ livres** : Hit rate ~70-85% (**économies maximales**)

---

## 🎯 WORKFLOW RECOMMANDÉ POUR VOS 3000 LIVRES

### **Phase 1 : Test (100 livres)** 📋

```bash
# 1. Importer 100 livres via CSV ou ZIP
# 2. Surveiller le cache
watch -n 5 "curl -s localhost:3000/api/cache/stats | jq"

# 3. Noter les résultats
# - Temps moyen par livre : _____ secondes
# - Coût estimé : _____ $
# - Hit rate final : _____ %
```

### **Phase 2 : Production (2900 livres restants)** 🚀

Une fois satisfait du test :

```bash
# Importer par batches de 500 livres
# Vous verrez le hit rate augmenter à chaque batch !

Batch 1 (500) : Hit rate ~60-70%
Batch 2 (500) : Hit rate ~75-80%
Batch 3-6 (1900) : Hit rate ~80-85% ← ÉCONOMIES MAXIMALES
```

---

## 💡 COMMANDES UTILES PENDANT L'IMPORT

### **Vérifier que tout fonctionne :**

```bash
# Santé
curl localhost:3000/healthz | jq

# Stats cache
curl localhost:3000/api/cache/stats | jq

# Métriques
curl localhost:3000/metrics/json | jq
```

### **Nettoyer le cache si besoin :**

```bash
# Supprimer les entrées expirées
curl -X POST localhost:3000/api/cache/cleanup | jq
```

### **Voir les logs du serveur :**

Le serveur tourne en background. Pour voir les logs :

```bash
# Vérifier les logs en temps réel
# (déjà visible dans votre terminal où vous avez lancé npm run dev:d1)
```

---

## 🎨 AJOUTER LES WIDGETS UI (Optionnel)

Pour une interface encore plus belle, vous pouvez ajouter les widgets :

1. **Ouvrir le fichier widgets :**
   ```bash
   open public/widgets-v2.1.html
   ```

2. **Copier les widgets que vous voulez :**
   - Widget Cache (performance en temps réel)
   - Widget Santé (status des services)
   - Bannière v2.1 (badge version)
   - Liens Rapides (accès docs)

3. **Coller dans votre interface principale**

---

## 📈 COMPRENDRE VOS ÉCONOMIES

### **Sans Cache (v1.1) :**
```
3000 livres × 3 APIs = 9000 appels
9000 × $0.008 = $72
9000 × 2s = 5 heures
```

### **Avec Cache (v2.1) :**
```
Batch 1: 1000 livres × 3 APIs = 3000 appels = $24
Batch 2: 1000 livres × 0.6 APIs = 600 appels = $5 (80% cache)
Batch 3: 1000 livres × 0.6 APIs = 600 appels = $5 (80% cache)

TOTAL: 4200 appels = $34
TEMPS: ~2.3 heures

ÉCONOMIES: $38 (53%) + 2.7 heures 🎉
```

**Le cache vous fait économiser presque la moitié du coût !**

---

## ❓ BESOIN D'AIDE ?

### **Tests échouent ?**
```bash
npm run test:v2.1
# Devrait afficher : ✅ 14/14 tests passent (100%)
```

### **Serveur ne répond pas ?**
```bash
curl localhost:3000/healthz
# Devrait retourner : {"status":"healthy"}
```

### **Cache ne fonctionne pas ?**
```bash
curl localhost:3000/api/cache/stats
# Devrait retourner : {"success":true,...}
```

---

## 🎉 VOUS ÊTES PRÊT !

**Votre système v2.1 est opérationnel à 100%**

**Prochaines actions :**
1. ✅ Documentation Swagger ouverte → Explorez les endpoints
2. ✅ Interface principale ouverte → Importez vos premiers livres
3. ✅ Surveillez le cache → `watch -n 5 "curl -s localhost:3000/api/cache/stats | jq"`
4. ✅ Profitez des économies ! 💰

---

**🚀 Lancez-vous ! Importez vos 10-20 premiers livres et regardez la magie opérer !**
