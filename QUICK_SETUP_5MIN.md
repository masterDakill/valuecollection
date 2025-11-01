# ⚡ Quick Setup - 5 Minutes

**Version:** Minimal | **Date:** 2025-11-01 | **Goal:** Webhook → Google Sheets

---

## 🎯 Ce Que Tu Obtiens

```
Photo livre → GenSpark AI → Webhook Make.com → Google Sheets
```

**Temps:** 5 minutes ⚡  
**Modules Make:** 3 (Webhook → Sheets → Response)  
**Colonnes:** 29 (A→AC)

---

## 📋 Prérequis (2 min)

1. **Compte Make.com** (gratuit OK)
   - https://www.make.com/en/register

2. **Google Sheet créé:**
   - Nom: `CollectorValue_Apps`
   - Méthode A: Import CSV
   - Méthode B: Copier-coller colonnes

---

## 🚀 Méthode A: Import CSV (Le Plus Rapide)

### Étape 1: Créer Google Sheet (1 min)

1. **Upload le CSV**
   - Aller sur https://sheets.google.com
   - File → Import → Upload
   - Sélectionner: `google-sheets-template.csv`
   - Import location: "Create new spreadsheet"
   - Separator type: "Comma"
   - Click "Import data"

2. **Renommer**
   - Nom: `CollectorValue_Apps`

3. **Supprimer ligne 2** (exemple)
   - Garder seulement les en-têtes (ligne 1)

✅ **Résultat:** 29 colonnes prêtes (A→AC)

---

### Étape 2: Import Scénario Make.com (3 min)

1. **Créer scénario**
   - Make.com → Scenarios → "+ Create a new scenario"

2. **Importer Blueprint**
   - Click ⋮ (3 dots) → "Import Blueprint"
   - Upload: `make-scenario-minimal.json`
   - Click "Import"

3. **Configurer Webhook**
   - Module 1 (Custom Webhook):
     - Click "Create a webhook"
     - Name: `ValueCollection`
     - API Key Header:
       - Name: `x-make-apikey`
       - Expected value: `mk-value-collector-2025`
     - Click "Save"
   - **COPIER L'URL DU WEBHOOK** (important!)

4. **Connecter Google Sheets**
   - Module 2 (Add a Row):
     - Click "Add" connection
     - Authorize Google account
     - Select spreadsheet: `CollectorValue_Apps`
     - Select sheet: `Sheet1`
     - Colonnes A→AC déjà mappées ✅

5. **Activer**
   - Click "Save"
   - Toggle "ON"

✅ **Résultat:** Webhook actif!

---

### Étape 3: Test (1 min)

```bash
cd valuecollection
./test-make-webhook.sh 1
```

**Résultat Attendu:**
```
✅ Succès (HTTP 200)
✅ 1 ligne ajoutée dans Google Sheets
```

---

## 🚀 Méthode B: Colonnes Manuelles (Si CSV Échoue)

### Étape 1: Créer Google Sheet

1. **Nouvelle feuille**
   - https://sheets.google.com
   - Blank spreadsheet
   - Nom: `CollectorValue_Apps`

2. **Copier-coller ces en-têtes (ligne 1):**

```
Run ID	Timestamp	Source	Photo URL	Titre	Auteur	Éditeur	Année	ISBN-10	ISBN-13	État	Notes	Prix Estimé CAD	Prix Min CAD	Prix Max CAD	Devise Source	Prix Confiance	Nombre Comparables	Prix Source	eBay URL Top	Coût Acquisition CAD	Date Acquisition	Emplacement	Propriétaire	Plateforme Vente	Prix Affichage CAD	Statut Vente	Hash Fichier	Agent
```

**Note:** Colonnes séparées par TAB (pas espaces)

3. **Formater:**
   - Colonne H (Année): Format → Number → 0 decimals
   - Colonnes M-O, U, Z (Prix): Format → Number → 2 decimals

---

## 🔗 URLs et Clés

**Webhook URL:** (copier depuis Make.com module 1)  
Format: `https://hook.us2.make.com/xxxxxxxxxxxxx`

**API Key:** `mk-value-collector-2025`

**Header:** `x-make-apikey`

---

## 🧪 Tests Rapides

### Test 1: Webhook Direct
```bash
curl -X POST https://hook.us2.make.com/YOUR_WEBHOOK_ID \
  -H "Content-Type: application/json" \
  -H "x-make-apikey: mk-value-collector-2025" \
  -d '{
    "titre": "Test Book",
    "auteur": "Test Author",
    "annee": 2024,
    "ISBN_13": "9781234567890",
    "etat": "New",
    "prix_estime_cad": 50,
    "proprietaire": "Mathieu",
    "statut_vente": "À lister",
    "agent": "ValueCollection Collector"
  }'
```

**Attendu:** HTTP 200 + ligne dans Sheets

### Test 2: Script Automatisé
```bash
cd valuecollection
./test-make-webhook.sh 1
```

**Attendu:** 1 ligne (livre "1984")

### Test 3: Tous les Tests
```bash
./test-make-webhook.sh
```

**Attendu:** 3 lignes (1984, D&D, Minimal)

---

## ✅ Checklist Finale

- [ ] Google Sheet créé (`CollectorValue_Apps`)
- [ ] 29 colonnes présentes (A→AC)
- [ ] Make.com scénario importé
- [ ] Webhook URL copiée
- [ ] API key configurée (`mk-value-collector-2025`)
- [ ] Google Sheets connecté
- [ ] Scénario activé (ON)
- [ ] Test 1 réussi (curl)
- [ ] Test 2 réussi (script)
- [ ] Ligne visible dans Google Sheets

---

## 🆘 Problèmes Courants

### "Unauthorized (401)"

**Solution:**
```
1. Vérifier header: x-make-apikey
2. Vérifier value: mk-value-collector-2025
3. Vérifier API key validation activée dans Make
```

### "Spreadsheet not found"

**Solution:**
```
1. Reconnect Google account dans Make
2. Reselect le spreadsheet
3. Verify sharing permissions
```

### "Invalid JSON"

**Solution:**
```
1. Validate avec jsonlint.com
2. Vérifier guillemets (strings = "text", numbers = 123)
3. Vérifier virgules (pas de trailing comma)
```

---

## 🎯 Résultat Final

Après 5 minutes:

```
✅ Google Sheet avec 29 colonnes
✅ Make.com webhook actif
✅ API key sécurisée
✅ Tests passés (3/3)
✅ Prêt à recevoir données GenSpark
```

---

## 📚 Prochaines Étapes

1. **Copier prompt GenSpark**
   - Fichier: `GENSPARK_COLLECTOR_PROMPT_SHORT.md`
   - Durée: 2 min

2. **Tester avec livre réel**
   - Upload photo ou texte
   - GenSpark extrait métadonnées
   - Webhook envoie à Make.com
   - Ligne ajoutée dans Sheets

3. **Personnaliser**
   - Ajouter formules Google Sheets
   - Créer vues filtrées
   - Ajouter dashboard

---

## 🔗 Ressources

**Fichiers:**
- `google-sheets-template.csv` - Template colonnes
- `make-scenario-minimal.json` - Blueprint Make (3 modules)
- `test-make-webhook.sh` - Tests automatisés
- `GENSPARK_COLLECTOR_PROMPT_SHORT.md` - Prompt AI

**Guides Complets:**
- `MAKE_SETUP_GUIDE.md` - Installation détaillée (18 pages)
- `MAKE_INTEGRATION_COMPLETE.md` - Guide système (20 pages)

---

**🎊 SETUP TERMINÉ EN 5 MINUTES! 🎊**

---

**Créé:** 2025-11-01  
**Version:** Minimal  
**Cible:** Démarrage ultra-rapide  
**Maintenance:** Automatique via Make.com
