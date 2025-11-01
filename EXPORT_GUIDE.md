# Guide d'Export vers Excel 📊

Votre collection peut être exportée en CSV (compatible Excel) de plusieurs façons.

## Méthode 1: Export Direct de la Base de Données (Recommandé) ⚡

Cette méthode exporte directement depuis le fichier SQLite local.

### Utilisation

```bash
# Export avec nom de fichier automatique (date/heure)
npm run db:export

# OU directement:
./export-to-excel.sh

# Avec nom personnalisé
./export-to-excel.sh mes_livres.csv
```

### Avantages
✅ Très rapide
✅ Fonctionne même si le serveur n'est pas démarré
✅ Exporte TOUTES les données sans limite

### Colonnes exportées
- Titre
- Auteur
- Éditeur
- ISBN / ISBN-13
- Année
- Pages
- Langue
- Genres
- État
- Valeur estimée
- Catégorie
- Description
- Photo (URL)
- Date ajout
- Dernière mise à jour

---

## Méthode 2: Export via l'API 🌐

Cette méthode fonctionne en local ET en production.

### Utilisation

```bash
# Export depuis le serveur local
./export-via-api.sh

# Export depuis la production
./export-via-api.sh https://imagetovalue.pages.dev

# Avec nom personnalisé
./export-via-api.sh http://127.0.0.1:3000 mes_livres.csv
```

### Prérequis
Nécessite `jq` (installé avec: `brew install jq`)

### Avantages
✅ Fonctionne en local et production
✅ Format JSON → CSV automatique
✅ Peut exporter depuis n'importe quelle instance

---

## Méthode 3: Export Manuel via Ligne de Commande 🔧

Pour un contrôle total sur les colonnes exportées.

```bash
# Export personnalisé avec colonnes spécifiques
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite <<EOF
.headers on
.mode csv
.output mes_livres.csv
SELECT
    title AS 'Titre',
    artist_author AS 'Auteur',
    isbn_13 AS 'ISBN',
    year AS 'Année',
    estimated_value AS 'Prix'
FROM collection_items
ORDER BY title;
.quit
EOF
```

---

## Ouvrir le fichier CSV dans Excel 📈

### Option 1: Double-clic
Simplement double-cliquer sur le fichier `.csv` généré.

### Option 2: Depuis Excel
1. Ouvrir Excel
2. Fichier > Ouvrir
3. Sélectionner le fichier `.csv`
4. Cliquer "Ouvrir"

### Option 3: Depuis Numbers (Mac)
```bash
open -a Numbers export_collection_*.csv
```

### Option 4: Google Sheets
1. Aller sur sheets.google.com
2. Nouveau > Upload
3. Sélectionner le fichier CSV

---

## Formats Alternatifs

### Export en JSON
```bash
wrangler d1 execute DB --local --json --command "SELECT * FROM collection_items;" > export.json
```

### Export en TSV (Tab-separated)
```bash
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite <<EOF
.mode tabs
.output export.tsv
SELECT * FROM collection_items;
.quit
EOF
```

---

## Automatisation

### Export automatique quotidien (cron)
```bash
# Ajouter à votre crontab (crontab -e)
0 2 * * * cd /path/to/valuecollection && ./export-to-excel.sh backup_$(date +\%Y\%m\%d).csv
```

### Script de sauvegarde
```bash
#!/bin/bash
# Crée un backup complet avec export CSV
npm run db:export
tar -czf backup_$(date +%Y%m%d).tar.gz .wrangler/state/v3/d1/ export_collection_*.csv
```

---

## Dépannage 🔧

### "Fichier de base de données introuvable"
- Vérifiez que `.wrangler/state/v3/d1/` existe
- Lancez `npm run db:migrate:local` pour créer la base

### "Permission denied"
```bash
chmod +x export-to-excel.sh export-via-api.sh
```

### CSV mal formaté dans Excel
- Utiliser "Données > Importer depuis texte/CSV"
- Sélectionner UTF-8 comme encodage
- Choisir "," comme séparateur

### Export vide
- Vérifiez que vous avez des données: `npm run db:ls`
- Ajoutez des livres avant d'exporter!

---

## Notes importantes 📝

1. **Encodage:** Les fichiers CSV sont en UTF-8 (supporte les accents français)
2. **Séparateur:** Virgule (`,`) - standard Excel
3. **Persistance:** Les exports ne modifient PAS la base de données
4. **Taille:** Pas de limite de nombre de lignes
5. **Sécurité:** Les exports locaux ne contiennent PAS les clés API

---

## Emplacement des données

- **Base locale:** `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`
- **Exports CSV:** Dossier courant (racine du projet)
- **Backups:** Créer un dossier `backups/` pour organiser vos exports

---

Bonne organisation de votre collection! 📚
