# ✅ CHECKLIST v2.1 - Installation & Déploiement

```
╔══════════════════════════════════════════════════════════════════╗
║  📋 SUIVEZ CETTE CHECKLIST ÉTAPE PAR ÉTAPE                      ║
║  ✅ Cochez chaque élément complété                              ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 🎯 PHASE 1 : VÉRIFICATION (2 minutes)

- [ ] **1.1** Code v2.1 est dans `src/index.tsx`
  ```bash
  grep -c "V2.1 - NOUVEAUX ENDPOINTS" src/index.tsx
  # Résultat attendu : 2
  ```

- [ ] **1.2** Dependencies installées
  ```bash
  npm list zod
  # Résultat attendu : zod@3.23.8
  ```

- [ ] **1.3** Script de test exécutable
  ```bash
  [ -x test-v2.1.sh ] && echo "✅ OK" || echo "❌ FAIL"
  ```

- [ ] **1.4** Migration cache appliquée
  ```bash
  wrangler d1 execute evaluateur-db --local \
    --command="SELECT COUNT(*) FROM sqlite_master WHERE name='api_cache'"
  # Résultat attendu : 1
  ```

**✅ Si tout est coché, passez à Phase 2**

---

## 🧪 PHASE 2 : TESTS LOCAUX (5 minutes)

- [ ] **2.1** Démarrer le serveur
  ```bash
  npm run dev:d1
  # Attendre : "Ready on http://localhost:3000"
  ```

- [ ] **2.2** Test health check (nouveau terminal)
  ```bash
  curl http://localhost:3000/healthz
  # Résultat attendu : {"status":"healthy",...}
  ```

- [ ] **2.3** Test documentation
  ```bash
  open http://localhost:3000/docs
  # Résultat attendu : Page Swagger UI s'ouvre
  ```

- [ ] **2.4** Test cache stats
  ```bash
  curl http://localhost:3000/api/cache/stats | jq .success
  # Résultat attendu : true
  ```

- [ ] **2.5** Lancer tous les tests automatiques
  ```bash
  npm run test:v2.1
  # Résultat attendu : 100% success rate
  ```

**✅ Si tout est coché, passez à Phase 3**

---

## 🎨 PHASE 3 : WIDGETS UI (10 minutes - OPTIONNEL)

- [ ] **3.1** Ouvrir le fichier widgets
  ```bash
  open public/widgets-v2.1.html
  ```

- [ ] **3.2** Copier Bannière v2.1 (lignes 7-28)
  - Coller dans votre HTML principal en haut de page

- [ ] **3.3** Copier Widget Cache (lignes 28-94)
  - Coller dans sidebar ou dashboard

- [ ] **3.4** Copier Widget Santé (lignes 95-154)
  - Coller dans dashboard

- [ ] **3.5** Copier JavaScript (lignes 200-fin)
  - Coller avant `</body>`

- [ ] **3.6** Tester widgets en local
  ```bash
  open http://localhost:3000
  # Vérifier que les widgets fonctionnent
  ```

**✅ Si widgets désirés, passez à Phase 4**
**⏭️  Si non, passer directement à Phase 4**

---

## 📊 PHASE 4 : TEST FONCTIONNEL (15 minutes)

- [ ] **4.1** Importer 10 livres test (CSV ou manuel)
  - Via interface web à `http://localhost:3000`

- [ ] **4.2** Vérifier cache se remplit
  ```bash
  curl http://localhost:3000/api/cache/stats | jq .cache_stats.total_entries
  # Devrait être > 0
  ```

- [ ] **4.3** Ré-analyser un même livre
  - Temps devrait être 10-20x plus rapide

- [ ] **4.4** Vérifier hit rate augmente
  ```bash
  curl http://localhost:3000/api/cache/stats | jq .cache_stats.hit_rate
  # Devrait augmenter après plusieurs analyses
  ```

- [ ] **4.5** Tester nettoyage cache
  ```bash
  curl -X POST http://localhost:3000/api/cache/cleanup
  # Résultat attendu : {"success":true,...}
  ```

**✅ Si tout fonctionne, passez à Phase 5**

---

## 🚀 PHASE 5 : BUILD & DÉPLOIEMENT (5 minutes)

- [ ] **5.1** Arrêter serveur local
  ```bash
  # Ctrl+C dans terminal du serveur
  ```

- [ ] **5.2** Build production
  ```bash
  npm run build
  # Attendre : "✓ built in XXXms"
  ```

- [ ] **5.3** Appliquer migration cache (production)
  ```bash
  wrangler d1 execute evaluateur-db --remote \
    --file=migrations/0003_add_cache_and_enrichments.sql
  ```

- [ ] **5.4** Déployer
  ```bash
  npm run deploy:prod
  # Attendre : "✨ Deployment complete!"
  ```

- [ ] **5.5** Vérifier URL déployée
  - Note l'URL affichée (ex: https://xxx.pages.dev)

**✅ Si déployé, passez à Phase 6**

---

## ✅ PHASE 6 : VALIDATION PRODUCTION (5 minutes)

- [ ] **6.1** Test health check production
  ```bash
  curl https://VOTRE-APP.pages.dev/healthz
  # Résultat attendu : {"status":"healthy",...}
  ```

- [ ] **6.2** Ouvrir documentation production
  ```bash
  open https://VOTRE-APP.pages.dev/docs
  # Résultat attendu : Swagger UI s'affiche
  ```

- [ ] **6.3** Lancer tests production
  ```bash
  npm run test:v2.1:prod
  # ou
  ./test-v2.1.sh https://VOTRE-APP.pages.dev
  ```

- [ ] **6.4** Vérifier cache stats production
  ```bash
  curl https://VOTRE-APP.pages.dev/api/cache/stats | jq
  ```

- [ ] **6.5** Tester avec vraie analyse
  - Importer quelques livres via interface web
  - Vérifier que tout fonctionne

**✅ Si tout fonctionne, passez à Phase 7**

---

## 🎯 PHASE 7 : PRODUCTION RÉELLE (Variable)

### **Batch 1 : 100-500 livres (Test)**

- [ ] **7.1** Préparer CSV/ZIP avec 100-500 livres

- [ ] **7.2** Importer via interface web

- [ ] **7.3** Surveiller cache pendant import
  ```bash
  watch -n 10 "curl -s https://VOTRE-APP.pages.dev/api/cache/stats | jq .cache_stats"
  ```

- [ ] **7.4** Noter temps d'exécution et coût

- [ ] **7.5** Vérifier qualité des résultats

**✅ Si satisfait, continuer avec Batch 2-6**

### **Batch 2-6 : Reste des livres (Production)**

- [ ] **7.6** Batch 2 (500 livres) - Devrait voir hit rate ~60-70%

- [ ] **7.7** Batch 3 (500 livres) - Hit rate ~75-80%

- [ ] **7.8** Batch 4-6 (1500 livres) - Hit rate ~80-85%

- [ ] **7.9** Comparer économies réelles vs prévisions
  ```
  Prévu : $38 économisés
  Réel  : $____ économisés
  ```

- [ ] **7.10** Documenter résultats pour référence future

**✅ MISSION ACCOMPLIE ! 🎉**

---

## 📊 MÉTRIQUES DE SUCCÈS

| Métrique | Cible | Actuel | Statut |
|----------|-------|--------|--------|
| Tests passés | 100% | __% | ⬜ |
| Hit rate cache | 80%+ | __% | ⬜ |
| Économies API | $38+ | $__ | ⬜ |
| Temps gagné | 2.7h+ | __h | ⬜ |
| Livres traités | 3000 | __ | ⬜ |

---

## 🔧 DÉPANNAGE RAPIDE

### **❌ Tests échouent**

1. Vérifier serveur : `curl localhost:3000/healthz`
2. Redémarrer : `npm run dev:d1`
3. Vérifier migration : `wrangler d1 execute evaluateur-db --local --file=migrations/0003_add_cache_and_enrichments.sql`

### **❌ `/docs` ne fonctionne pas**

1. Vérifier code : `grep -n "Swagger UI" src/index.tsx`
2. Si vide, copier code depuis `CODE_TO_ADD.txt`
3. Redémarrer serveur

### **❌ Cache stats erreur**

1. Appliquer migration : `wrangler d1 execute evaluateur-db --local --file=migrations/0003_add_cache_and_enrichments.sql`
2. Vérifier table : `wrangler d1 execute evaluateur-db --local --command="SELECT name FROM sqlite_master WHERE name='api_cache'"`
3. Redémarrer serveur

---

## 📁 FICHIERS DE RÉFÉRENCE

- **START_HERE.md** → Guide démarrage
- **RECAP_COMPLET.md** → Vue d'ensemble
- **test-v2.1.sh** → Tests automatiques
- **widgets-v2.1.html** → Composants UI
- **V2.1_CHANGELOG.md** → Changelog détaillé

---

## 🎉 PROGRESSION GLOBALE

```
Phase 1 : Vérification        [ ] 0% ───────────── 100%
Phase 2 : Tests Locaux        [ ] 0% ───────────── 100%
Phase 3 : Widgets UI          [ ] 0% ───────────── 100%
Phase 4 : Test Fonctionnel    [ ] 0% ───────────── 100%
Phase 5 : Build & Deploy      [ ] 0% ───────────── 100%
Phase 6 : Validation Prod     [ ] 0% ───────────── 100%
Phase 7 : Production Réelle   [ ] 0% ───────────── 100%

TOTAL : [ ] 0% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100%
```

---

**🚀 COMMENCEZ MAINTENANT :**

```bash
# Étape 1
npm run dev:d1

# Étape 2
npm run test:v2.1

# Étape 3
open http://localhost:3000/docs

# GO ! 🎉
```

---

**📌 Cochez les items au fur et à mesure.**
**🎯 Objectif : Toutes les cases cochées !**
**🎊 Vous y êtes presque !**
