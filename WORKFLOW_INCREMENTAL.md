# 📸 Workflow Incrémental - Une Photo à la Fois

## 🎯 Principe

Au lieu de traiter 1500 livres d'un coup, vous ajoutez vos livres progressivement:
1. Prendre une photo (iPhone)
2. Analyser immédiatement
3. Vérifier les résultats
4. Ajuster si nécessaire
5. Répéter

**Avantages:**
- ✅ Contrôle qualité en temps réel
- ✅ Ajuster angle/lumière si problème
- ✅ Voir progression jour après jour
- ✅ Pas de risque de tout rater
- ✅ Base de données se construit progressivement

---

## 🔄 Cycle de Travail Simple

### Workflow Ultra-Simple (3 Commandes)

```bash
# 1. Prendre photo sur iPhone → AirDrop vers Mac

# 2. Analyser (adaptez le nom IMG_*)
cp ~/Downloads/IMG_*.jpg ~/test_livre/derniere_photo.jpg
./analyze-single-photo.sh ~/test_livre/derniere_photo.jpg

# 3. Voir résultat
curl -s http://localhost:3000/api/photos | jq '.photos[-1] | {
  photo_id: .id,
  livres_detectes: .total_items_detected,
  status: .analysis_status,
  date: .uploaded_at
}'

# 4. Voir les livres détectés
curl -s http://localhost:3000/api/items | jq '.items[-5:] | .[] | {
  titre: .title,
  auteur: .artist_author,
  photo_id: .photo_id
}'

# 5. Répéter avec nouvelle photo
```

---

## 📊 Suivi de Progression

### Voir le Total Actuel

```bash
# Stats globales
curl -s http://localhost:3000/api/photos | jq '{
  total_photos: (.photos | length),
  total_livres: (.photos | map(.total_items_detected) | add // 0),
  photos_aujourd_hui: (.photos | map(select(.uploaded_at | startswith("2025-10-25"))) | length)
}'

# Liste des 10 dernières photos
curl -s http://localhost:3000/api/photos | jq '.photos[-10:] | .[] | {
  id: .id,
  livres: .total_items_detected,
  date: .uploaded_at
}'
```

---

## 🎯 Routines Suggérées

### Routine Quotidienne (10-20 photos/jour)

**Matin (15 minutes):**
1. Prendre 5 photos d'étagères
2. AirDrop vers Mac
3. Analyser les 5 photos

```bash
# Script matin
for i in {1..5}; do
  echo "Photo $i/5"
  cp ~/Downloads/IMG_*.jpg ~/test_livre/photo_$i.jpg
  ./analyze-single-photo.sh ~/test_livre/photo_$i.jpg
  sleep 2
done
```

**Soir (Vérification):**
```bash
# Voir ce qui a été fait aujourd'hui
curl -s http://localhost:3000/api/photos | jq '.photos | map(select(.uploaded_at | startswith("2025-10-25"))) | length'
# → "5 photos aujourd'hui"
```

### Routine Par Étagère

**Pour chaque étagère:**
1. Photo vue d'ensemble (tous les livres)
2. Photo section gauche (détail)
3. Photo section droite (détail)
4. Analyser les 3 photos
5. Vérifier qu'on a bien tous les livres

```bash
# Étagère 1
./analyze-single-photo.sh ~/test_livre/etagere_1_full.jpg
./analyze-single-photo.sh ~/test_livre/etagere_1_gauche.jpg
./analyze-single-photo.sh ~/test_livre/etagere_1_droite.jpg

# Voir résultats étagère 1
curl -s http://localhost:3000/api/photos | jq '.photos[-3:]'
```

---

## 🔍 Vérification Qualité

### Après Chaque Photo

```bash
# Dernière photo analysée
curl -s http://localhost:3000/api/photos | jq '.photos[-1] | {
  livres: .total_items_detected,
  status: .analysis_status
}'

# Si 0 livres → Problème photo
# Si 1-3 livres → Normal si peu de livres
# Si 5-10 livres → Parfait!
# Si 0 et vous avez 10 livres → Reprendre photo
```

### Reprendre une Photo si Besoin

```bash
# Si résultat mauvais, supprimer et refaire
curl -X DELETE http://localhost:3000/api/photos/ID

# Reprendre photo avec:
# - Meilleure lumière
# - Plus près
# - Angle droit
```

---

## 📈 Objectifs Progressifs

### Semaine 1 (Découverte)
- Objectif: 50 livres
- 10 photos de 5 livres
- Tester différents angles/lumières
- Trouver la meilleure méthode

### Semaine 2-3 (Rythme)
- Objectif: 500 livres
- 20-30 photos/semaine
- Routine établie

### Semaine 4-6 (Complétion)
- Objectif: 1500 livres complets
- Finir toutes les étagères
- Vérification finale

---

## 🛠️ Scripts Utiles

### Script "Quick Add" (Ajouter rapidement)

Créez `quick-add.sh`:
```bash
#!/bin/bash
# Usage: ./quick-add.sh

LATEST=$(ls -t ~/Downloads/IMG_*.jpg 2>/dev/null | head -1)

if [ -z "$LATEST" ]; then
  echo "❌ Aucune photo dans Downloads"
  exit 1
fi

echo "📸 Dernière photo: $(basename $LATEST)"
cp "$LATEST" ~/test_livre/
./analyze-single-photo.sh ~/test_livre/$(basename "$LATEST")
```

**Utilisation:**
```bash
# 1. AirDrop photo
# 2. Lancer
chmod +x quick-add.sh
./quick-add.sh
# → Analyse automatique de la dernière photo
```

### Script "Daily Summary" (Résumé quotidien)

```bash
#!/bin/bash
# Usage: ./daily-summary.sh

echo "📊 Résumé du jour"
echo ""

TODAY=$(date +%Y-%m-%d)

curl -s http://localhost:3000/api/photos | jq --arg today "$TODAY" '{
  photos_aujourdhui: (.photos | map(select(.uploaded_at | startswith($today))) | length),
  livres_aujourdhui: (.photos | map(select(.uploaded_at | startswith($today))) | map(.total_items_detected) | add // 0),
  total_photos: (.photos | length),
  total_livres: (.photos | map(.total_items_detected) | add // 0)
}'
```

---

## 📱 Conseils iPhone

### Prendre de Bonnes Photos

**Réglages recommandés:**
- ✅ Mode Photo (pas Portrait)
- ✅ Zoom 1x ou 2x
- ✅ Toucher pour focus sur les livres
- ✅ HDR Auto
- ✅ Flash OFF (utiliser lumière naturelle)

**Technique:**
1. Se placer à 50-70cm des livres
2. Caméra perpendiculaire aux dos
3. Cadrer 5-10 livres max
4. Vérifier que texte est net
5. Prendre 2-3 photos si doute

**Organisation:**
- Créer album iPhone "Livres à Analyser"
- Marquer photos analysées (cœur)
- Supprimer après analyse réussie

---

## 🎯 Exemple Session Complète

### Session de 30 Minutes

```bash
# Démarrer serveur (si pas déjà fait)
npm run dev:d1

# Session de photos
# 1. Prendre 10 photos iPhone étagère du salon
# 2. AirDrop toutes vers Mac
# 3. Analyser une par une

for file in ~/Downloads/IMG_*.jpg; do
  echo "📸 Analyse: $(basename $file)"
  ./analyze-single-photo.sh "$file"
  echo ""
  sleep 2
done

# Voir résultats
curl -s http://localhost:3000/api/photos | jq '.photos[-10:] | map({
  id: .id,
  livres: .total_items_detected
})'

# Total session
echo "Total livres ajoutés cette session:"
curl -s http://localhost:3000/api/photos | jq '.photos[-10:] | map(.total_items_detected) | add'
```

---

## 📊 Dashboard Temps Réel (Optionnel)

### Surveiller en Direct

Terminal 1 (Serveur):
```bash
npm run dev:d1
```

Terminal 2 (Analyse):
```bash
./analyze-single-photo.sh photo.jpg
```

Terminal 3 (Monitoring):
```bash
watch -n 5 'curl -s http://localhost:3000/api/photos | jq "{photos: (.photos | length), livres: (.photos | map(.total_items_detected) | add // 0)}"'
```

---

## ✅ Checklist Quotidienne

- [ ] Serveur démarré (`npm run dev:d1`)
- [ ] Prendre photos iPhone
- [ ] AirDrop vers Mac
- [ ] Analyser chaque photo
- [ ] Vérifier résultats
- [ ] Ajuster si besoin
- [ ] Voir résumé du jour
- [ ] Nettoyer dossier test

---

## 🎉 Milestones

### Célébrer les Étapes

- 🎯 **50 livres**: Système maîtrisé!
- 🎯 **100 livres**: 1/15 du chemin
- 🎯 **500 livres**: 1/3 complété!
- 🎯 **1000 livres**: Plus que la moitié!
- 🎯 **1500 livres**: Mission accomplie! 🚀

```bash
# Voir progression
TOTAL=$(curl -s http://localhost:3000/api/photos | jq '.photos | map(.total_items_detected) | add // 0')
PERCENT=$(echo "scale=1; ($TOTAL * 100) / 1500" | bc)
echo "Progression: $TOTAL/1500 livres ($PERCENT%)"
```

---

**Commencez maintenant avec votre première vraie photo de DOS de livres!** 📚📸
