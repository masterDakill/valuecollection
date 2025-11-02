# 🚀 Guide de démarrage automatique

## Démarrage rapide

### Option 1 : Script automatique (Recommandé)

```bash
cd /home/user/webapp
chmod +x start.sh
./start.sh
```

Le script va automatiquement :
- ✅ Nettoyer les processus existants
- ✅ Compiler l'application
- ✅ Démarrer le serveur Wrangler
- ✅ Injecter le token eBay automatiquement
- ✅ Vérifier que tout fonctionne
- ✅ Afficher l'URL et les informations

### Option 2 : Démarrage manuel

```bash
cd /home/user/webapp

# 1. Build
npm run build

# 2. Démarrer le serveur
npx wrangler pages dev dist --local --ip 0.0.0.0 --port 8790 --persist-to .wrangler/state

# 3. Dans un autre terminal, injecter le token eBay
curl -X POST "http://localhost:8790/api/ads-publish/ebay/set-user-token" \
  -H "Content-Type: application/json" \
  -d '{"token": "VOTRE_TOKEN_ICI", "expiresIn": 157680000}'
```

## Configuration

### Variables d'environnement

Copiez `.env.example` vers `.dev.vars` et configurez vos clés :

```bash
cp .env.example .dev.vars
# Éditez .dev.vars avec vos vraies clés API
```

### Token eBay

Le token est automatiquement injecté au démarrage. Pour le changer :

1. **Obtenez un nouveau token** :
   - Allez sur https://developer.ebay.com/my/keys
   - Cliquez "User Tokens" à côté de votre App ID
   - Cliquez "Sign in to Sandbox"
   - Copiez le token généré

2. **Modifiez le script** :
   - Éditez `start.sh`
   - Ligne 25 : `EBAY_TOKEN="VOTRE_NOUVEAU_TOKEN"`

3. **Ou injectez manuellement** :
   ```bash
   curl -X POST "http://localhost:8790/api/ads-publish/ebay/set-user-token" \
     -H "Content-Type: application/json" \
     -d '{"token": "VOTRE_TOKEN", "expiresIn": 157680000}'
   ```

## Commandes utiles

### Vérifier le statut

```bash
# Vérifier que le serveur fonctionne
curl http://localhost:8790/api/stats

# Vérifier le token eBay
curl http://localhost:8790/api/ads-publish/ebay/token-status

# Voir les logs du serveur
tail -f /tmp/wrangler.log
```

### Arrêter le serveur

```bash
# Ctrl+C dans le terminal du script

# Ou forcer l'arrêt
fuser -k 8790/tcp
```

### Redémarrer

```bash
./start.sh
```

## Dépannage

### Le port est déjà utilisé

```bash
# Voir quel processus utilise le port
lsof -i:8790

# Tuer le processus
fuser -k 8790/tcp

# Redémarrer
./start.sh
```

### Le serveur ne démarre pas

```bash
# Voir les logs
cat /tmp/wrangler.log

# Vérifier les dépendances
npm install

# Rebuild
npm run build
```

### Le token eBay n'est pas injecté

```bash
# Injecter manuellement
curl -X POST "http://localhost:8790/api/ads-publish/ebay/set-user-token" \
  -H "Content-Type: application/json" \
  -d '{"token": "v^1.1#...", "expiresIn": 157680000}'
```

## Démarrage au boot du système

### Avec systemd (Linux)

Créez `/etc/systemd/system/valuecollection.service` :

```ini
[Unit]
Description=Évaluateur Collection Pro
After=network.target

[Service]
Type=simple
User=user
WorkingDirectory=/home/user/webapp
ExecStart=/home/user/webapp/start.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Activez :
```bash
sudo systemctl enable valuecollection
sudo systemctl start valuecollection
sudo systemctl status valuecollection
```

### Avec PM2 (Node.js process manager)

```bash
# Installer PM2
npm install -g pm2

# Démarrer avec PM2
pm2 start start.sh --name valuecollection

# Sauvegarder la configuration
pm2 save

# Démarrage automatique
pm2 startup
```

## Variables personnalisables

Dans `start.sh`, vous pouvez modifier :

```bash
PORT=8790              # Port du serveur
MAX_RETRIES=30         # Nombre de tentatives de démarrage
RETRY_DELAY=2          # Délai entre chaque tentative (secondes)
EBAY_TOKEN="..."       # Token eBay
```

## Prochaines améliorations

- [ ] Stocker le token eBay dans D1 au lieu de la mémoire
- [ ] Ajouter un healthcheck automatique
- [ ] Notifications en cas d'erreur
- [ ] Rotation automatique des logs
- [ ] Support Docker pour déploiement facile

## Support

En cas de problème :
1. Vérifiez les logs : `cat /tmp/wrangler.log`
2. Vérifiez le statut : `curl http://localhost:8790/api/stats`
3. Vérifiez les variables : `cat .dev.vars`
4. Redémarrez : `./start.sh`
