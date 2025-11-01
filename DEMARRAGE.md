# 🚀 Guide de Démarrage Rapide

## Pourquoi ce guide?

Claude Code rencontre des conflits avec les processus wrangler en arrière-plan. Pour éviter les erreurs EPIPE, suivez ces étapes dans un **nouveau terminal** (en dehors de Claude Code).

## Étapes de Démarrage

### 1. Ouvrir un Nouveau Terminal

Ouvrez Terminal.app (ou iTerm2) et naviguez vers le projet:

```bash
cd /Users/Mathieu/Documents/1-Developer/GitHub/valuecollection/valuecollection
```

### 2. Nettoyer les Processus

```bash
pkill -9 -f wrangler 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
```

### 3. Appliquer la Migration Monitoring (première fois seulement)

```bash
chmod +x apply-monitoring-migration.sh
./apply-monitoring-migration.sh
```

**Note**: Si vous obtenez une erreur indiquant que la table existe déjà, c'est normal. Passez à l'étape suivante.

### 4. Démarrer le Serveur

```bash
npm run dev:d1
```

Vous devriez voir:

```
✨ Compiled Worker successfully
⎔ Starting local server...
[wrangler:info] Ready on http://0.0.0.0:3000
```

### 5. Ouvrir dans le Navigateur

Ouvrez votre navigateur et allez à:

```
http://localhost:3000
```

## 📊 Tester le Monitoring

### Dans le navigateur:

- **Dashboard principal**: http://localhost:3000
- **Stats monitoring**: http://localhost:3000/api/monitoring/stats/summary

### Avec curl (dans un autre terminal):

```bash
# Résumé rapide
curl http://localhost:3000/api/monitoring/stats/summary | python3 -m json.tool

# Snapshot complet
curl http://localhost:3000/api/monitoring | python3 -m json.tool

# Historique d'un service
curl "http://localhost:3000/api/monitoring/OpenAI%20GPT-4?hours=24" | python3 -m json.tool
```

## 🧪 Tester avec une Évaluation

```bash
# Évaluer un livre (générera des données de monitoring)
curl -X POST http://localhost:3000/api/items/2/evaluate

# Voir les stats après
curl http://localhost:3000/api/monitoring/stats/summary | python3 -m json.tool
```

## 📚 Documentation Complète

- **MONITORING_GUIDE.md** - Guide complet du système de monitoring
- **MONITORING_RESUME.md** - Résumé de l'implémentation

## ⚙️ Script de Démarrage Automatique

Si vous préférez, utilisez le script START.sh:

```bash
chmod +x START.sh
./START.sh
```

Ce script:
1. Tue tous les processus wrangler
2. Libère le port 3000
3. Build l'application
4. Démarre le serveur

## 🐛 Dépannage

### Erreur: "Address already in use"

```bash
lsof -ti:3000 | xargs kill -9
```

### Erreur: "write EPIPE"

Fermez Claude Code et tous les autres processus wrangler:

```bash
pkill -9 -f wrangler
```

Puis redémarrez le serveur.

### Erreur: Migration déjà appliquée

C'est normal! La migration ne doit être appliquée qu'une seule fois. Si vous voyez ce message, passez directement au démarrage du serveur.

## ✅ Vérifier que Tout Fonctionne

Une fois le serveur démarré, vous devriez pouvoir:

1. ✅ Accéder à http://localhost:3000
2. ✅ Voir vos livres dans l'interface
3. ✅ Consulter les stats: http://localhost:3000/api/monitoring/stats/summary
4. ✅ Évaluer un livre et voir les coûts en temps réel

---

**Note**: Le système de monitoring est maintenant complètement intégré. Chaque appel à un service (OpenAI, Gemini, APIs externes) sera automatiquement tracké avec son temps de réponse et son coût.

🎉 **Le serveur est prêt à utiliser!**
