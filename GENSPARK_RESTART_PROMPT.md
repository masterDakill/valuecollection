# GenSpark AI Developer - Prompt de Redémarrage Complet

**Titre:** 🔧 Full Diagnostic & Restart — ValueCollection  
**Version:** 1.0  
**Date:** 2025-11-01

---

## 🎯 Objectif

Analyser et réparer automatiquement le projet ValueCollection, corriger les erreurs de serveur (Wrangler Pages / D1 / Vite), valider la configuration `.dev.vars`, et redémarrer un environnement propre prêt à interagir avec Make.com.

---

## 🧠 Prompt pour GenSpark AI Developer Agent

```
Tu es un agent développeur expert chargé d'exécuter un diagnostic et une remise à niveau complète du projet "ValueCollection".

Ton but est de rendre le serveur local pleinement fonctionnel pour l'analyse d'images de livres et l'envoi des données à Make.com via webhook.

📋 TÂCHES À EXÉCUTER:

1. DIAGNOSTIC ENVIRONNEMENT
   ✓ Vérifier présence de package.json
   ✓ Vérifier présence de .dev.vars
   ✓ Si .dev.vars absent:
     - Chercher devs.env ou env.devs
     - Copier vers .dev.vars
     - Vérifier clés: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY
   ✓ Afficher les clés détectées (masquées)

2. NETTOYAGE PROCESSUS
   ✓ Exécuter: pkill -f wrangler 2>/dev/null
   ✓ Exécuter: pkill -f workerd 2>/dev/null
   ✓ Libérer ports 3000 et 3001
   ✓ Attendre 2 secondes

3. DÉPENDANCES
   ✓ Vérifier node_modules existe
   ✓ Si absent: npm install
   ✓ Vérifier versions: node --version, npm --version

4. BUILD
   ✓ Exécuter: npm run build
   ✓ Capturer stdout et stderr
   ✓ Si erreur TypeScript:
     - Noter les erreurs mais continuer (non-bloquant)
   ✓ Vérifier que dist/ est créé
   ✓ Lister les fichiers dans dist/

5. BASE DE DONNÉES
   ✓ Vérifier .wrangler/state/v3/d1 existe
   ✓ Si absent:
     - Exécuter: npx wrangler d1 migrations apply DB --local
   ✓ Compter le nombre de migrations appliquées

6. DÉMARRAGE SERVEUR
   ✓ Exécuter: npm run dev:d1
   ✓ Capturer les 20 premières lignes de log
   ✓ Attendre 8 secondes
   ✓ Vérifier si serveur répond:
     - Tester: curl http://localhost:3000/api/stats
     - Tester: curl http://localhost:3001/api/stats
   ✓ Si erreur:
     - Analyser le log complet
     - Identifier la cause (port bloqué, clé manquante, etc.)
     - Proposer solution

7. VALIDATION FONCTIONNELLE
   ✓ Tester endpoint: GET /api/stats
   ✓ Tester endpoint: GET /api/items
   ✓ Tester endpoint: GET /api/export/csv
   ✓ Vérifier que les réponses sont valides (JSON)

8. WEBHOOK MAKE.COM
   ✓ Préparer payload test:
     {
       "Titre": "Test Book",
       "Auteur": "Test Author",
       "Estimation_CAD": 50,
       "Confiance": 0.9
     }
   ✓ Tester endpoint: POST /api/export/genspark-webhook
   ✓ Afficher la réponse

9. RAPPORT FINAL
   Générer un rapport structuré avec:
   
   📊 STATUT DU SERVEUR
   - État: ON/OFF
   - Port: 3000 ou 3001
   - URL: http://localhost:XXXX
   
   🔑 VARIABLES D'ENVIRONNEMENT
   - OPENAI_API_KEY: [présent/absent]
   - ANTHROPIC_API_KEY: [présent/absent]
   - GEMINI_API_KEY: [présent/absent]
   
   🗄️ BASE DE DONNÉES
   - Migrations appliquées: X
   - Collections présentes: X
   - Items présents: X
   
   🔧 PROBLÈMES CORRIGÉS
   - Liste des actions prises
   
   ✅ ENDPOINTS TESTÉS
   - /api/stats: [OK/ERREUR]
   - /api/items: [OK/ERREUR]
   - /api/export/csv: [OK/ERREUR]
   - /api/export/genspark-webhook: [OK/ERREUR]
   
   💡 RECOMMANDATIONS
   - Actions à prendre si problèmes persistent
   - Liens vers documentation

10. MONITORING CONTINU
    ✓ Afficher les 5 dernières lignes de log toutes les 30s
    ✓ Alerter si le serveur s'arrête
    ✓ Proposer redémarrage automatique

RÈGLES:
- Toujours capturer stdout ET stderr
- Ne jamais interrompre sur erreur TypeScript (non-bloquant)
- Attendre suffisamment longtemps après démarrage (8s minimum)
- Masquer les clés API dans les logs (afficher sk-proj-***...)
- Être verbeux: expliquer chaque étape
- En cas d'échec: proposer 3 solutions alternatives

FORMAT DE SORTIE:
Utiliser emojis pour la lisibilité:
✅ Succès
❌ Erreur
⚠️ Warning
ℹ️ Info
🔍 Diagnostic
🔧 Réparation
📊 Statistiques
```

---

## 📝 Script de Secours Automatique

Le fichier `fix.sh` est disponible dans le projet. Il exécute toutes les étapes ci-dessus automatiquement.

### Utilisation:

```bash
# Rendre exécutable
chmod +x fix.sh

# Lancer le diagnostic et réparation
./fix.sh

# Si succès, démarrer le serveur
npm run dev:d1
```

---

## 🔄 Scénarios de Récupération

### Scénario 1: Port Déjà Utilisé
```bash
# Diagnostic
lsof -ti:3000
# Correction
lsof -ti:3000 | xargs kill -9
# Redémarrage
npm run dev:d1
```

### Scénario 2: Clés API Manquantes
```bash
# Diagnostic
grep "OPENAI_API_KEY" .dev.vars
# Correction
cp devs.env .dev.vars
# Édition manuelle
nano .dev.vars
```

### Scénario 3: Base de Données Corrompue
```bash
# Diagnostic
ls -la .wrangler/state/v3/d1/
# Correction
rm -rf .wrangler/state/v3/d1/
npx wrangler d1 migrations apply DB --local
# Redémarrage
npm run dev:d1
```

### Scénario 4: Build Échoue
```bash
# Diagnostic
npm run build 2>&1 | tee build.log
# Correction
rm -rf dist node_modules
npm install
npm run build
```

### Scénario 5: Serveur Démarre mais Ne Répond Pas
```bash
# Diagnostic
curl -v http://localhost:3000/api/stats
# Correction
pkill -f wrangler
sleep 2
npm run dev:d1
# Attendre 10 secondes
curl http://localhost:3000/api/stats
```

---

## 🧪 Tests de Validation

### Test 1: Serveur Répond
```bash
curl http://localhost:3000/api/stats
# Attendu: {"success":true,"stats":{...}}
```

### Test 2: Export CSV Fonctionne
```bash
curl http://localhost:3000/api/export/csv -o test.csv
# Attendu: Fichier CSV créé
wc -l test.csv
# Attendu: > 0 lignes
```

### Test 3: Upload Photo (avec clés API)
```bash
curl -X POST http://localhost:3000/api/photos/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"..."}'
# Attendu: {"success":true,"detected_items":[...]}
```

### Test 4: Webhook GenSpark
```bash
curl -X POST http://localhost:3000/api/export/genspark-webhook \
  -H "Content-Type: application/json" \
  -d '{"Titre":"Test","Auteur":"Author","Estimation_CAD":100}'
# Attendu: {"success":true,"message":"✅ Données prêtes pour GenSpark"}
```

---

## 🔗 Intégration Make.com

### Configuration Webhook Make

1. **Créer un scénario Make.com**
2. **Ajouter module Webhook** - "Custom webhook"
3. **Copier l'URL du webhook**
4. **Configurer dans ValueCollection:**

```bash
# Ajouter dans .dev.vars
GENSPARK_WEBHOOK_URL=https://hook.eu1.make.com/xxxxx
```

5. **Tester:**

```bash
curl -X POST http://localhost:3000/api/export/genspark-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "Titre": "Art of D&D",
    "Auteur": "Jeff Easley",
    "Estimation_CAD": 120,
    "Confiance": 0.95
  }'
```

6. **Vérifier dans Make.com** que les données sont reçues

---

## 📊 Monitoring et Logs

### Logs en Temps Réel
```bash
# Logs du serveur
tail -f /tmp/server.log

# Logs Wrangler
tail -f ~/.config/.wrangler/logs/*.log

# Logs de build
tail -f /tmp/build.log
```

### Dashboard de Status
```bash
# Status complet
curl http://localhost:3000/api/stats | jq '.'

# Health check
curl http://localhost:3000/api/monitoring/health | jq '.'

# Stats d'export
curl http://localhost:3000/api/export/stats | jq '.'
```

---

## 🆘 Support et Dépannage

### Documentation Disponible
- `SESSION_COMPLETE_SUMMARY.md` - Résumé complet de la session
- `EXCEL_EXPORT_AUTOMATION.md` - Guide export
- `FIX_NO_DETECTION_API_KEYS.md` - Config clés API
- `QUICK_FIX_SUMMARY.md` - Solutions rapides

### Commandes de Debug
```bash
# Version de tout
node --version
npm --version
npx wrangler --version

# État des processus
ps aux | grep wrangler
ps aux | grep node

# Ports utilisés
lsof -i :3000
lsof -i :3001

# Espace disque
df -h

# Mémoire
free -h
```

---

## ✅ Checklist de Vérification

- [ ] `.dev.vars` existe avec clés API
- [ ] `node_modules/` présent
- [ ] `dist/` présent après build
- [ ] Base de données D1 initialisée
- [ ] Migrations appliquées (8 migrations)
- [ ] Serveur démarre sans erreur
- [ ] Port 3000 ou 3001 accessible
- [ ] `/api/stats` répond avec JSON
- [ ] `/api/export/csv` télécharge un fichier
- [ ] Webhook Make.com configuré (optionnel)

---

## 🎯 Résultat Attendu

Après exécution du script ou du prompt:

```
✅ Serveur opérationnel sur http://localhost:3000
✅ Base de données: 8 migrations appliquées
✅ API endpoints: 20+ fonctionnels
✅ Export CSV/TSV/JSON: actifs
✅ Webhook GenSpark: prêt
✅ Clés API: détectées
✅ Performance: ~140ms avg response

🎉 APPLICATION PRÊTE!
```

---

**Créé:** 2025-11-01  
**Version:** 1.0  
**Maintenance:** Automatique via fix.sh
