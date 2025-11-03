# 🚨 Erreur Déploiement Wrangler

**Problème:** Le workflow échoue à l'étape "Deploy to Cloudflare Pages"
```
Error: The process '/opt/hostedtoolcache/node/20.19.5/x64/bin/npx' failed with exit code 1
Error: 🚨 Action failed
```

---

## 🔍 **CAUSES POSSIBLES**

### **1. Secrets GitHub Manquants** ⚠️ (PLUS PROBABLE)

Le workflow nécessite ces secrets GitHub:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

**Vérification:**
👉 https://github.com/masterDakill/valuecollection/settings/secrets/actions

**Si ces secrets n'existent pas, le déploiement échoue!**

---

### **2. Nom de Projet Incorrect**

Le workflow tente de déployer sur:
```yaml
command: pages deploy dist --project-name valuecollection
```

**Vérifiez que le projet existe:**
👉 https://dash.cloudflare.com/ → Workers & Pages

**Le projet doit s'appeler exactement:** `valuecollection`

---

### **3. Permissions du Token**

Le token doit avoir les permissions:
- **Cloudflare Pages: Edit**

---

## ✅ **SOLUTION: Configurer les Secrets GitHub**

### **Étape 1: Obtenir CLOUDFLARE_API_TOKEN**

1. **Allez sur:** https://dash.cloudflare.com/profile/api-tokens

2. **Cliquez:** "Create Token"

3. **Sélectionnez:** "Cloudflare Pages" template
   - Ou créez un custom token avec permissions:
   - **Account** → **Cloudflare Pages** → **Edit**

4. **Copiez le token** (commence par quelque chose comme `xxx-xxxxxx`)

### **Étape 2: Obtenir CLOUDFLARE_ACCOUNT_ID**

1. **Allez sur:** https://dash.cloudflare.com/

2. **Dans la barre latérale droite**, vous verrez:
   ```
   Account ID: abc123def456...
   ```

3. **Copiez ce ID** (format: chaine alphanumétrique)

### **Étape 3: Ajouter les Secrets GitHub**

1. **Allez sur:** https://github.com/masterDakill/valuecollection/settings/secrets/actions

2. **Cliquez:** "New repository secret"

3. **Ajoutez le premier secret:**
   - **Name:** `CLOUDFLARE_API_TOKEN`
   - **Value:** [Collez votre token Cloudflare]
   - Cliquez "Add secret"

4. **Ajoutez le deuxième secret:**
   - **Name:** `CLOUDFLARE_ACCOUNT_ID`
   - **Value:** [Collez votre Account ID]
   - Cliquez "Add secret"

---

## 🔄 **RELANCER LE WORKFLOW**

Une fois les secrets ajoutés:

**Option 1: Re-run automatique (recommandé)**
1. Allez sur: https://github.com/masterDakill/valuecollection/actions
2. Cliquez sur le workflow qui a échoué
3. Cliquez "Re-run all jobs"
4. Le workflow redémarre avec les secrets configurés

**Option 2: Push un nouveau commit**
```bash
# Petit changement pour déclencher le workflow
git commit --allow-empty -m "chore: trigger workflow with secrets configured"
git push origin main
```

---

## 🆘 **ALTERNATIVE: Créer le Projet Cloudflare d'Abord**

Si le projet n'existe pas encore:

### **Méthode 1: Via Dashboard (recommandé)**

1. **Allez sur:** https://dash.cloudflare.com/

2. **Workers & Pages** → **Create application**

3. **Sélectionnez:** "Pages"

4. **Connectez votre repo GitHub:** `masterDakill/valuecollection`

5. **Configuration du build:**
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/`

6. **Deploy**

**Avantage:** Le projet est créé automatiquement et les déploiements futurs via GitHub Actions fonctionneront.

### **Méthode 2: Via Wrangler CLI (local)**

```bash
cd /home/user/webapp

# Build le projet
npm run build

# Déployer manuellement (première fois)
npx wrangler pages deploy dist --project-name valuecollection

# Wrangler demandera de se connecter
# Suivez les instructions dans le terminal
```

---

## 📋 **CHECKLIST DE VÉRIFICATION**

**Avant de relancer le workflow:**

- [ ] ✅ `CLOUDFLARE_API_TOKEN` configuré dans GitHub Secrets
- [ ] ✅ `CLOUDFLARE_ACCOUNT_ID` configuré dans GitHub Secrets
- [ ] ✅ Token a les permissions "Cloudflare Pages: Edit"
- [ ] ✅ Projet "valuecollection" existe sur Cloudflare (ou sera créé)
- [ ] ✅ Account ID est correct (format: chaine alphanumétrique)

---

## 🧪 **TESTER LES SECRETS**

Pour vérifier que les secrets fonctionnent:

**1. Voir les logs du workflow échoué:**
- https://github.com/masterDakill/valuecollection/actions
- Cliquez sur le workflow #78 (ou dernier)
- Regardez l'étape "Deploy to Cloudflare Pages"
- Les logs montreront le vrai problème

**Erreurs communes:**
```
Error: Missing required parameter: apiToken
→ Secret CLOUDFLARE_API_TOKEN pas configuré

Error: Invalid API token
→ Token incorrect ou expiré

Error: Project not found
→ Projet n'existe pas sur Cloudflare

Error: Insufficient permissions
→ Token manque de permissions
```

---

## 🎯 **RÉSUMÉ RAPIDE**

**Pour déployer avec succès:**

1. **Configurez 2 secrets GitHub:**
   - `CLOUDFLARE_API_TOKEN` (depuis Cloudflare Dashboard)
   - `CLOUDFLARE_ACCOUNT_ID` (depuis Cloudflare Dashboard)

2. **Relancez le workflow:**
   - Re-run depuis GitHub Actions
   - Ou push un nouveau commit

3. **Le déploiement devrait réussir!**

---

## 🔗 **LIENS UTILES**

| Ressource | URL |
|-----------|-----|
| **GitHub Secrets** | https://github.com/masterDakill/valuecollection/settings/secrets/actions |
| **Cloudflare Tokens** | https://dash.cloudflare.com/profile/api-tokens |
| **Cloudflare Dashboard** | https://dash.cloudflare.com/ |
| **GitHub Actions** | https://github.com/masterDakill/valuecollection/actions |
| **Wrangler Docs** | https://developers.cloudflare.com/workers/wrangler/ |

---

## 📖 **DOCUMENTATION WRANGLER**

**Pour plus d'informations:**
- Guide GitHub Actions: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/
- Wrangler Action: https://github.com/cloudflare/wrangler-action

---

**🔧 Configurez les secrets GitHub et relancez le workflow!**

**Le déploiement devrait réussir une fois les secrets en place!** ✅
