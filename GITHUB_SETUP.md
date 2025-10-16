# 🚀 Configuration GitHub - Guide Rapide

## 🔑 **Étape 1: Créer le Token GitHub**

1. **Aller sur GitHub** : https://github.com/settings/tokens
2. **Cliquer** "Generate new token (classic)"
3. **Sélectionner les permissions** :
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
   - ✅ `write:packages` (Upload packages)
4. **Copier le token** (commence par `ghp_...`)

## 📤 **Étape 2: Configuration Automatique**

```bash
# Rendre le script exécutable
chmod +x scripts/setup-github.sh

# Lancer la configuration
./scripts/setup-github.sh
```

Le script va :
- ✅ Configurer git avec vos credentials
- ✅ Créer le repository distant
- ✅ Push le code vers GitHub
- ✅ Configurer le déploiement automatique

## 🔐 **Étape 3: Secrets Cloudflare (dans GitHub)**

1. **Aller sur votre repo GitHub** : `https://github.com/USERNAME/evaluateur-collection-pro`
2. **Settings** → **Secrets and variables** → **Actions**
3. **Ajouter ces secrets** :

### Secrets Requis :
```
CLOUDFLARE_API_TOKEN = your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID = your_cloudflare_account_id
```

### Comment obtenir ces valeurs :
- **API Token** : https://dash.cloudflare.com/profile/api-tokens
- **Account ID** : Dashboard Cloudflare → Right sidebar

## 🤖 **Étape 4: Déploiement Automatique**

Une fois configuré, **chaque push sur `main`** déclenchera :

1. ✅ **Build** de l'application
2. ✅ **Tests** (si configurés)
3. ✅ **Déploiement** sur Cloudflare Pages
4. ✅ **Migration DB** automatique
5. ✅ **Notification** de succès

## 🌐 **URLs Importantes**

| Service | URL |
|---------|-----|
| **Repository GitHub** | `https://github.com/USERNAME/evaluateur-collection-pro` |
| **GitHub Actions** | `https://github.com/USERNAME/evaluateur-collection-pro/actions` |
| **Production App** | `https://evaluateur-collection-pro.pages.dev` |
| **Cloudflare Dashboard** | `https://dash.cloudflare.com/pages` |

## 🔧 **Commands Utiles**

```bash
# Push avec déploiement automatique
git add .
git commit -m "Nouvelle fonctionnalité"
git push origin main

# Vérifier le statut du déploiement
# → Aller sur GitHub Actions tab

# Push sans déploiement (branche feature)
git checkout -b feature/nouvelle-fonction
git push origin feature/nouvelle-fonction
```

## 🚨 **Sécurité Importante**

### ✅ **À FAIRE** :
- Utiliser des **secrets GitHub** pour tokens sensibles
- Garder les tokens dans `.env.github` (jamais commit)
- Utiliser des **branches feature** pour développement

### ❌ **NE JAMAIS** :
- Committer les tokens dans le code
- Partager les tokens en plain text
- Pusher directement sur `main` sans tests

## 🆘 **Dépannage**

### **Erreur: Repository not found**
```bash
# Vérifier le remote
git remote -v

# Reconfigurer si nécessaire
git remote set-url origin https://TOKEN@github.com/USERNAME/REPO.git
```

### **Erreur: GitHub Actions fails**
1. Vérifier les **secrets** dans Settings → Actions
2. Vérifier les **permissions** du token GitHub
3. Consulter les **logs** dans l'onglet Actions

### **Erreur: Cloudflare deployment fails**
1. Vérifier `CLOUDFLARE_API_TOKEN` dans secrets
2. Vérifier `CLOUDFLARE_ACCOUNT_ID`
3. Vérifier que le projet Cloudflare Pages existe

---

**🎯 Une fois configuré, vous aurez un workflow professionnel avec déploiement automatique à chaque modification !**