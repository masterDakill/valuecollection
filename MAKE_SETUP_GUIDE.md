# 🔧 Guide d'Installation Make.com - ValueCollection

**Version:** 1.0  
**Date:** 2025-11-01  
**Durée Estimée:** 15 minutes

---

## 📋 Table des Matières

1. [Prérequis](#prérequis)
2. [Méthode 1: Import Automatique (Recommandé)](#méthode-1-import-automatique)
3. [Méthode 2: Configuration Manuelle](#méthode-2-configuration-manuelle)
4. [Configuration Google Sheets](#configuration-google-sheets)
5. [Tests et Validation](#tests-et-validation)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Prérequis

Avant de commencer, assure-toi d'avoir:

- [ ] Compte Make.com (gratuit ou payant)
- [ ] Compte Google avec accès à Google Sheets
- [ ] Google Sheet "CollectorValue_Apps" créé avec les colonnes suivantes:

### Structure Google Sheets Requise

| Colonne | Nom du Champ | Type |
|---------|--------------|------|
| A | Run ID | Texte |
| B | Timestamp | Texte |
| C | Source | Texte |
| D | Photo URL | Texte |
| E | Titre | Texte |
| F | Auteur | Texte |
| G | Éditeur | Texte |
| H | Année | Nombre |
| I | ISBN-10 | Texte |
| J | ISBN-13 | Texte |
| K | État | Texte |
| L | Notes | Texte |
| M | Prix Estimé CAD | Nombre |
| N | Prix Min CAD | Nombre |
| O | Prix Max CAD | Nombre |
| P | Devise Source | Texte |
| Q | Prix Confiance | Nombre |
| R | Nombre Comparables | Nombre |
| S | Prix Source | Texte |
| T | eBay URL Top | Texte |
| U | Coût Acquisition CAD | Nombre |
| V | Date Acquisition | Texte |
| W | Emplacement | Texte |
| X | Propriétaire | Texte |
| Y | Plateforme Vente | Texte |
| Z | Prix Affichage CAD | Nombre |
| AA | Statut Vente | Texte |
| AB | Hash Fichier | Texte |
| AC | Agent | Texte |

---

## 🚀 Méthode 1: Import Automatique (Recommandé)

### Étape 1: Importer le Scénario

1. **Se connecter à Make.com**
   - Aller sur https://www.make.com/
   - Se connecter avec ton compte

2. **Créer un nouveau scénario**
   - Cliquer sur "Scenarios" dans le menu gauche
   - Cliquer sur "+ Create a new scenario"

3. **Importer le fichier JSON**
   - Cliquer sur les 3 points (...) en haut à droite
   - Sélectionner "Import Blueprint"
   - Uploader le fichier `make-scenario-valuecollection.json`
   - Cliquer sur "Import"

### Étape 2: Configurer le Webhook

1. **Ouvrir le module Webhook (premier module)**
   - Cliquer sur le module "Custom Webhook"
   - Cliquer sur "Create a webhook"
   - Nom: `ValueCollection Webhook`
   - Restrictions IP: (laisser vide)
   - **API Key Header:** Activer et configurer:
     - Header name: `x-make-apikey`
     - Expected value: `mk-value-collector-2025`

2. **Copier l'URL du webhook**
   - Format: `https://hook.us2.make.com/xxxxxxxxxxxxx`
   - **IMPORTANT:** Sauvegarder cette URL (tu en auras besoin plus tard)

### Étape 3: Connecter Google Sheets

1. **Ouvrir le module "Add a Row" (3ème module)**
   - Cliquer sur le module Google Sheets
   - Cliquer sur "Add" pour créer une connexion
   - Autoriser Make à accéder à ton compte Google
   - Nom de la connexion: `ValueCollection Sheets`

2. **Configurer la feuille**
   - **Spreadsheet:** Sélectionner ton Google Sheet "CollectorValue_Apps"
   - **Sheet:** Sélectionner la feuille (généralement "Sheet1" ou "Feuille 1")
   - Les mappings des colonnes sont déjà configurés (A → AC)

### Étape 4: Activer le Scénario

1. **Sauvegarder**
   - Cliquer sur "Save" (en bas à gauche)

2. **Activer**
   - Basculer le switch "ON" en haut à droite
   - Le scénario est maintenant actif et prêt à recevoir des données

---

## 🔧 Méthode 2: Configuration Manuelle

Si l'import automatique ne fonctionne pas, suis ces étapes:

### Étape 1: Créer le Webhook

1. **Ajouter un module Webhook**
   - Cliquer sur "+" dans le canvas
   - Chercher "Webhook"
   - Sélectionner "Webhooks" → "Custom webhook"
   - Créer un nouveau webhook (voir Méthode 1, Étape 2)

2. **Définir la structure des données**
   - Cliquer sur "Show advanced settings"
   - Ajouter tous les champs du schéma (voir `GENSPARK_COLLECTOR_PROMPT.md`)

### Étape 2: Ajouter un Module "Set Variables"

1. **Ajouter le module**
   - Cliquer sur "+" après le webhook
   - Chercher "Tools"
   - Sélectionner "Set variables"

2. **Configurer les variables**
   ```
   run_id_final = {{if(1.run_id; 1.run_id; "vc-" + formatDate(now; "YYYYMMDD") + "-" + substring(now; 14; 5))}}
   
   timestamp_final = {{if(1.timestamp; 1.timestamp; formatDate(now; "YYYY-MM-DDTHH:mm:ssZ"))}}
   
   prix_affichage_calculated = {{if(1.prix_affichage_cad = 0 and 1.prix_estime_cad > 0; round(1.prix_estime_cad * 1.1; 2); 1.prix_affichage_cad)}}
   
   annee_final = {{if(1.annee = 0; ""; 1.annee)}}
   ```

### Étape 3: Ajouter le Module Google Sheets

1. **Ajouter le module**
   - Cliquer sur "+" après "Set variables"
   - Chercher "Google Sheets"
   - Sélectionner "Add a row"

2. **Mapper les colonnes** (voir tableau dans Prérequis)
   - Colonne A → `{{2.run_id_final}}`
   - Colonne B → `{{2.timestamp_final}}`
   - Colonne E → `{{1.titre}}`
   - Colonne F → `{{1.auteur}}`
   - ... (continuer pour toutes les colonnes)

### Étape 4: Ajouter le Module Response

1. **Ajouter le module**
   - Cliquer sur "+" après Google Sheets
   - Chercher "Webhook"
   - Sélectionner "Webhook Response"

2. **Configurer la réponse**
   - Status: `200`
   - Body:
     ```json
     {
       "success": true,
       "message": "✅ Données ajoutées à Google Sheets",
       "run_id": "{{2.run_id_final}}",
       "titre": "{{1.titre}}",
       "timestamp": "{{2.timestamp_final}}"
     }
     ```
   - Headers:
     - `Content-Type`: `application/json`

---

## 🎯 Configuration Google Sheets

### Créer le Google Sheet

1. **Aller sur Google Sheets**
   - https://sheets.google.com

2. **Créer une nouvelle feuille**
   - Nom: `CollectorValue_Apps`

3. **Ajouter les en-têtes** (ligne 1)
   ```
   Run ID | Timestamp | Source | Photo URL | Titre | Auteur | Éditeur | Année | ISBN-10 | ISBN-13 | État | Notes | Prix Estimé CAD | Prix Min CAD | Prix Max CAD | Devise Source | Prix Confiance | Nombre Comparables | Prix Source | eBay URL Top | Coût Acquisition CAD | Date Acquisition | Emplacement | Propriétaire | Plateforme Vente | Prix Affichage CAD | Statut Vente | Hash Fichier | Agent
   ```

4. **Formater les colonnes**
   - Colonne H (Année): Format → Nombre → 0 décimales
   - Colonnes M-O, U, Z (Prix): Format → Nombre → 2 décimales
   - Colonne Q (Confiance): Format → Nombre → 2 décimales
   - Colonne R (Comparables): Format → Nombre → 0 décimales

### Formules Optionnelles

Tu peux ajouter des colonnes calculées:

**Colonne AD - Marge (%)**
```
=(Z2-U2)/U2*100
```

**Colonne AE - Profit Estimé**
```
=Z2-U2
```

**Colonne AF - Status Couleur**
```
=IF(AA2="À lister";"🟡";IF(AA2="Listé";"🔵";IF(AA2="Vendu";"🟢";"⚪")))
```

---

## 🧪 Tests et Validation

### Test 1: Test Manuel depuis Make.com

1. **Ouvrir le scénario**
2. **Cliquer sur "Run once"**
3. **Envoyer un payload test** via le script fourni:

```bash
cd /home/user/webapp
./test-make-webhook.sh 1
```

4. **Vérifier dans Make.com**
   - Tu devrais voir une exécution réussie (pastille verte)
   - Cliquer sur l'exécution pour voir les détails

5. **Vérifier dans Google Sheets**
   - Une nouvelle ligne devrait apparaître avec les données de "1984"

### Test 2: Test Complet (3 Livres)

```bash
cd /home/user/webapp
./test-make-webhook.sh
```

Ce script envoie 3 payloads différents:
1. Livre complet avec prix (1984)
2. Livre sans prix (D&D)
3. Livre minimal (données incomplètes)

**Résultat attendu:** 3 nouvelles lignes dans Google Sheets

### Test 3: Test depuis ValueCollection API

```bash
curl -X POST http://localhost:3000/api/export/genspark-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "titre": "Test Book",
    "auteur": "Test Author",
    "prix_estime_cad": 50,
    "proprietaire": "Mathieu"
  }'
```

**Note:** ValueCollection complète automatiquement les champs manquants.

---

## 🔍 Troubleshooting

### Problème: "Webhook not responding"

**Causes possibles:**
- Webhook non activé dans Make.com
- URL incorrecte
- API key invalide

**Solutions:**
1. Vérifier que le scénario est **activé** (switch ON)
2. Vérifier l'URL du webhook (copier-coller sans espaces)
3. Vérifier l'API key dans le header: `x-make-apikey: mk-value-collector-2025`

**Test rapide:**
```bash
curl -X POST https://hook.us2.make.com/xxxxx \
  -H "Content-Type: application/json" \
  -H "x-make-apikey: mk-value-collector-2025" \
  -d '{"titre":"Test"}'
```

### Problème: "Google Sheets permission denied"

**Solutions:**
1. Reconnecter le compte Google dans Make.com
2. Vérifier que tu as les droits d'écriture sur le Sheet
3. Partager le Sheet avec ton email Make.com si nécessaire

### Problème: "Data not appearing in correct columns"

**Solutions:**
1. Vérifier que les en-têtes du Sheet correspondent exactement
2. Vérifier le mapping des colonnes dans le module "Add a row"
3. Réimporter le scénario si nécessaire

### Problème: "Run ID or Timestamp missing"

**Solution:**
Le module "Set Variables" génère automatiquement ces valeurs si absentes. Vérifier qu'il est bien configuré.

### Problème: "Prix_affichage_cad always 0"

**Solution:**
Vérifier la formule dans "Set Variables":
```
{{if(1.prix_affichage_cad = 0 and 1.prix_estime_cad > 0; round(1.prix_estime_cad * 1.1; 2); 1.prix_affichage_cad)}}
```

---

## 📊 Monitoring et Maintenance

### Logs Make.com

1. **Voir l'historique des exécutions**
   - Scenarios → Ton scénario → "History"
   - Tu peux voir toutes les exécutions réussies/échouées

2. **Notifications d'erreur**
   - Settings → Notifications
   - Activer les emails en cas d'erreur

### Dashboard Google Sheets

Crée une feuille "Dashboard" avec:

**Statistiques:**
```
Total Items: =COUNTA(Sheet1!E:E)-1
Total Estimé: =SUM(Sheet1!M:M)
Moyenne Prix: =AVERAGE(Sheet1!M:M)
À Lister: =COUNTIF(Sheet1!AA:AA;"À lister")
```

**Graphiques:**
- Prix par année
- État des livres (pie chart)
- Évolution du stock (line chart)

---

## 🔗 Intégrations Avancées

### Enrichissement Google Books

Ajouter un module après le webhook:

1. **Ajouter "HTTP - Make a request"**
   - URL: `https://www.googleapis.com/books/v1/volumes?q=isbn:{{1.ISBN_13}}`
   - Method: GET

2. **Parser la réponse** et extraire:
   - Éditeur (si manquant)
   - Année (si manquante)
   - Description
   - Catégories

### Notification Slack/Discord

Ajouter un module de notification:

1. **Slack:**
   - Ajouter "Slack - Create a message"
   - Message: `Nouveau livre ajouté: {{1.titre}} par {{1.auteur}} ({{1.prix_estime_cad}} CAD)`

2. **Discord:**
   - Ajouter "Webhooks - Custom webhook"
   - URL: ton webhook Discord
   - Body: format Discord embed

---

## ✅ Checklist Finale

Avant de considérer l'installation complète:

- [ ] Webhook créé et URL sauvegardée
- [ ] API key configurée (`mk-value-collector-2025`)
- [ ] Google Sheets connecté et autorisé
- [ ] Mapping des colonnes vérifié (A → AC)
- [ ] Module "Set Variables" configuré
- [ ] Module "Webhook Response" ajouté
- [ ] Scénario activé (switch ON)
- [ ] Test 1 réussi (payload manuel)
- [ ] Test 2 réussi (3 payloads via script)
- [ ] Test 3 réussi (via ValueCollection API)
- [ ] Données visibles dans Google Sheets
- [ ] Notifications activées (optionnel)

---

## 🆘 Support

**Documentation:**
- `GENSPARK_COLLECTOR_PROMPT.md` - Prompt GenSpark complet
- `EXCEL_EXPORT_AUTOMATION.md` - Guide export ValueCollection
- `SESSION_COMPLETE_SUMMARY.md` - Résumé complet du projet

**Scripts:**
- `test-make-webhook.sh` - Tests automatisés
- `fix.sh` - Diagnostic et réparation ValueCollection

**Liens Utiles:**
- Make.com Documentation: https://www.make.com/en/help
- Google Sheets API: https://developers.google.com/sheets/api
- ValueCollection API: http://localhost:3000/api

---

## 🎯 Résultat Attendu

Après installation complète:

```
✅ Webhook Make.com opérationnel
✅ Google Sheets connecté et configuré
✅ Données synchronisées automatiquement
✅ Enrichissements actifs (run_id, timestamp, prix_affichage)
✅ Tests validés (3/3 payloads reçus)
✅ Dashboard fonctionnel
✅ Notifications activées

🎉 SYSTÈME PRÊT À COLLECTER!
```

---

**Créé:** 2025-11-01  
**Version:** 1.0  
**Maintenance:** Automatique via Make.com  
**Prochaine Étape:** Utiliser GenSpark AI Collector avec le prompt fourni
