# 🔍 Comment Vérifier que Vous Avez la Dernière Version

## ⚡ Méthode Rapide (Recommandée)

Utilisez le script de rechargement automatique:

```bash
./reload.sh
```

Ce script:
- ✅ Arrête l'ancien serveur
- ✅ Recompile avec les derniers changements
- ✅ Affiche l'heure du nouveau build
- ✅ Redémarre le serveur
- ✅ Ouvre votre navigateur

---

## 🔎 Méthode Manuelle

### 1. Vérifier l'heure du build

```bash
ls -lh dist/_worker.js
```

**Exemple de sortie:**
```
-rw-r--r--  1 Mathieu  staff   168K oct. 20 06:24 dist/_worker.js
                                            ↑↑↑↑↑↑↑↑
                                       Date du build
```

**Important:** La date doit être **récente** (quelques secondes/minutes)

❌ **Ancien build:**
```
oct. 20 04:43  ← Il y a 2 heures = PAS la dernière version!
```

✅ **Nouveau build:**
```
oct. 20 06:24  ← Juste maintenant = Dernière version!
```

### 2. Recompiler si nécessaire

Si le build est vieux:

```bash
npm run build
```

### 3. Vérifier la nouvelle heure

```bash
ls -lh dist/_worker.js && date
```

Devrait afficher **la même heure** pour les deux.

### 4. Redémarrer le serveur

```bash
# Arrêter
killall -9 node wrangler

# Redémarrer
npm run dev:d1
```

### 5. Rafraîchir le navigateur

**IMPORTANT:** Vider le cache du navigateur!

- **Mac:** `Cmd + Shift + R`
- **Windows:** `Ctrl + Shift + F5`
- **Linux:** `Ctrl + F5`

---

## 🎯 Checklist Visuelle dans le Navigateur

### Ce que vous DEVRIEZ voir maintenant:

✅ **5 boutons de navigation** en haut:
```
[Base de Données] [Photos & Livres] [Recommandations] [Créer Annonce] [Comparables]
```

✅ **Le premier bouton est BLEU** (actif par défaut)

✅ **Cliquer sur "Photos & Livres"** affiche une galerie de photos

✅ **Pas d'onglets** Collection/Photos (ancienne version)

### Ce que vous NE DEVRIEZ PAS voir:

❌ Onglets "Collection" et "Photos" (c'était l'ancienne version)

❌ Seulement 3 boutons dans le header

❌ Erreurs JavaScript dans la console

---

## 🐛 Dépannage

### Problème: "Je ne vois aucun changement"

**Solutions:**

1. **Vider complètement le cache:**
   - Chrome: DevTools (F12) → Network → "Disable cache" (cocher)
   - Safari: Développement → Vider les caches
   - Firefox: Ctrl+Shift+Delete → Cocher "Cache"

2. **Mode navigation privée:**
   - Ouvrir http://localhost:3000 en navigation privée
   - Pas de cache = version fraîche garantie

3. **Hard reload complet:**
   ```bash
   ./reload.sh
   ```
   Puis dans le navigateur: Cmd+Shift+R (Mac) ou Ctrl+Shift+F5 (Windows)

### Problème: "Le serveur ne démarre pas"

**Vérifier si le port 3000 est déjà utilisé:**

```bash
lsof -i :3000
```

**Si oui, tuer le processus:**

```bash
killall -9 node wrangler
```

Puis relancer:
```bash
./reload.sh
```

### Problème: "J'ai une erreur de build"

**Voir les détails:**
```bash
npm run build
```

**Vérifier les erreurs TypeScript:**
```bash
npx tsc --noEmit
```

---

## 📊 Commandes Utiles

### Vérifier que le serveur tourne

```bash
curl http://localhost:3000/healthz
```

**Réponse attendue:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T10:25:19.232Z",
  "version": "2.1.0"
}
```

### Voir les logs du serveur

```bash
# Dans un nouveau terminal
tail -f ~/.wrangler/logs/*.log
```

### Tester les endpoints API

```bash
# Stats
curl -s http://localhost:3000/api/stats | jq '.'

# Photos
curl -s http://localhost:3000/api/photos | jq '.'

# Items
curl -s http://localhost:3000/api/items | jq '.'
```

---

## ✅ Workflow Recommandé

**À chaque fois qu'un changement est fait au code:**

1. Lancer `./reload.sh`
2. Attendre le message "Serveur prêt!"
3. Rafraîchir le navigateur avec Cmd+Shift+R
4. Vérifier que les changements apparaissent

**C'est tout!** 🎉

---

## 📝 Notes

- Le script `reload.sh` fait TOUT automatiquement
- Toujours vérifier l'heure du build si vous avez un doute
- En cas de doute: navigation privée = version fraîche garantie
- Le cache du navigateur est la cause #1 des "changements invisibles"

---

**Dernière mise à jour:** 20 octobre 2025, 06:25 EDT
