# 🚀 Guide de Déploiement - Cloudflare Workers

**Date:** 2025-11-03  
**Derniers commits déployés:** `ffc7cd1`, `fa07b00`, `6709b76`  
**Status:** ✅ Prêt pour déploiement automatique

---

## ✅ **LE DÉPLOIEMENT EST AUTOMATIQUE!**

Vos commits sont déjà poussés sur `main`. Le déploiement Cloudflare se fait **automatiquement** via GitHub Actions.

---

## 📊 **SURVEILLER LE DÉPLOIEMENT**

### **1. GitHub Actions (CI/CD)**

🔗 **Vérifiez l'état ici:**  
https://github.com/masterDakill/valuecollection/actions

### **Ce que vous devriez voir:**

#### ✅ **Workflow: "Cloudflare Workers and Pages / Workers Builds: valuecollection"**

**Étapes du workflow:**
1. ✅ **Checkout code** - Récupère le code
2. ✅ **Setup Node.js** - Configure Node.js 20
3. ✅ **Install dependencies** - `npm ci`
4. ✅ **Run linter** - TypeScript check
5. ✅ **Build** - `npm run build` (vite build)
6. ✅ **Deploy to Cloudflare** - `wrangler pages deploy`

**Durée attendue:** 2-3 minutes

---

### **2. Cloudflare Dashboard**

🔗 **Tableau de bord Cloudflare:**  
https://dash.cloudflare.com/

**Navigation:**
1. Cliquez sur votre compte
2. Allez dans **"Workers & Pages"**
3. Cherchez **"valuecollection"**
4. Vérifiez les **"Deployments"** récents

**Ce que vous verrez:**
- 🟢 **Latest deployment:** `main` branch, commit `ffc7cd1`
- ✅ **Status:** Active
- 🌐 **Production URL:** `https://valuecollection.pages.dev` (ou votre domaine custom)

---

## 🔍 **VÉRIFIER QUE LE DÉPLOIEMENT A RÉUSSI**

### **Étape 1: Vérifier GitHub Actions**

```bash
# Ouvrez ce lien dans votre navigateur
https://github.com/masterDakill/valuecollection/actions
```

**Indicateurs de succès:**
- ✅ Badge vert sur le dernier workflow
- ✅ Toutes les étapes passées
- ✅ "Deploy to Cloudflare Pages" complété

**Si échec:**
- ❌ Badge rouge
- 🔍 Cliquez dessus pour voir les logs d'erreur

---

### **Étape 2: Tester l'API en Production**

Une fois le déploiement terminé, testez votre API:

#### **Test 1: Sanity Check (Health)**
```bash
curl https://valuecollection.pages.dev/api/cache/stats
```

**Réponse attendue:**
```json
{
  "success": true,
  "cache_stats": {
    "hit_rate": 0,
    "total_requests": 0
  }
}
```

#### **Test 2: Smart Evaluate**
```bash
curl -X POST https://valuecollection.pages.dev/api/smart-evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "text",
    "text_input": "1989 Topps Ken Griffey Jr Rookie Card",
    "category": "Trading Cards"
  }'
```

**Réponse attendue:**
```json
{
  "success": true,
  "smart_analysis": {
    "category": "Collectibles",
    "confidence": 0.71,
    "extracted_data": { ... }
  },
  "evaluations": [ ... ],
  "market_insights": { ... }
}
```

---

## 🔐 **VARIABLES D'ENVIRONNEMENT EN PRODUCTION**

### **IMPORTANT: `.dev.vars` n'est PAS déployé!**

Le fichier `.dev.vars` est uniquement pour le développement local. En production, vous devez configurer les variables dans Cloudflare.

### **Configurer les secrets Cloudflare:**

#### **Méthode 1: Via Dashboard** (Recommandé)

1. Allez sur: https://dash.cloudflare.com/
2. Sélectionnez **"Workers & Pages"** → **"valuecollection"**
3. Cliquez sur **"Settings"** → **"Environment variables"**
4. Ajoutez ces variables (Production):

```bash
# OpenAI
OPENAI_API_KEY=sk-... [VOTRE CLÉ]

# Anthropic
ANTHROPIC_API_KEY=sk-ant-... [VOTRE CLÉ]

# Google Gemini
GOOGLE_AI_API_KEY=AIza... [VOTRE CLÉ]

# eBay (PRODUCTION - pas sandbox!)
EBAY_CLIENT_ID=[PRODUCTION KEY]
EBAY_CLIENT_SECRET=[PRODUCTION SECRET]
EBAY_USER_TOKEN=[PRODUCTION TOKEN]

# Discogs
DISCOGS_API_KEY=UfRnprrCZKzzHbdqTSpkxbAdORYglPZvfeWzsVty

# Google Books
GOOGLE_BOOKS_API_KEY=AIza... [VOTRE CLÉ]
```

#### **Méthode 2: Via Wrangler CLI**

```bash
# Se connecter à Cloudflare
npx wrangler login

# Ajouter un secret
npx wrangler pages secret put OPENAI_API_KEY
# Collez votre clé quand demandé

# Répétez pour chaque variable
```

---

## ⚠️ **DIFFÉRENCES SANDBOX vs PRODUCTION**

| Aspect | Sandbox (Local) | Production (Cloudflare) |
|--------|-----------------|-------------------------|
| **eBay Endpoint** | `api.sandbox.ebay.com` | `api.ebay.com` |
| **eBay Keys** | Sandbox keys | Production keys |
| **eBay Data** | Données de test limitées | Vraies données eBay |
| **Variables** | `.dev.vars` | Cloudflare Secrets |
| **Database** | `.wrangler/state` local | Cloudflare D1 (production) |
| **Tokens expiration** | 2 heures | 2 heures (refresh tokens: 18 mois) |

---

## 🔄 **PASSER À LA PRODUCTION EBAY**

Pour utiliser les **vraies données eBay** en production:

### **1. Créer des clés Production**

1. Allez sur: https://developer.ebay.com/my/keys
2. Sélectionnez **"Production"** (pas Sandbox)
3. Créez un nouveau keyset ou utilisez l'existant
4. Copiez:
   - Client ID (Production)
   - Client Secret (Production)

### **2. Obtenir un token Production**

```bash
# OAuth URL pour production
https://auth.ebay.com/oauth2/authorize?client_id=YOUR_PRODUCTION_CLIENT_ID&response_type=code&redirect_uri=YOUR_RUNAME&scope=https://api.ebay.com/oauth/api_scope
```

Ou utilisez l'API Explorer en mode **Production**.

### **3. Configurer dans Cloudflare**

Ajoutez les variables de production dans Cloudflare Dashboard:
- `EBAY_CLIENT_ID` → Production Client ID
- `EBAY_CLIENT_SECRET` → Production Client Secret  
- `EBAY_USER_TOKEN` → Production User Token

### **4. Mettre à jour le code**

Le code détecte automatiquement l'environnement. Assurez-vous que `sandbox = false` en production:

```typescript
// src/services/ebay-service.ts détecte automatiquement
const sandbox = env.ENVIRONMENT === 'development';
```

---

## 📊 **MONITORING DU DÉPLOIEMENT**

### **Logs Cloudflare**

**Voir les logs en temps réel:**
```bash
npx wrangler pages deployment tail
```

**Ou dans le Dashboard:**
1. https://dash.cloudflare.com/
2. Workers & Pages → valuecollection
3. Onglet **"Logs"**

### **Métriques**

**Vérifier les performances:**
1. Dashboard Cloudflare
2. Workers & Pages → valuecollection
3. Onglet **"Analytics"**

**Métriques importantes:**
- 📈 **Requests** - Nombre de requêtes
- ⏱️ **Duration** - Temps de réponse
- ❌ **Errors** - Taux d'erreurs
- 💾 **Data Transfer** - Bande passante

---

## 🚨 **TROUBLESHOOTING**

### **Problème 1: Build échoue**

**Erreur:** `Build failed with 1 error`

**Solution:**
```bash
# Vérifier localement
npm run build

# Si erreurs TypeScript
npx tsc --noEmit
```

### **Problème 2: "Module not found"**

**Erreur:** `Cannot find module 'X'`

**Solution:**
```bash
# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
npm run build
```

### **Problème 3: Variables d'environnement manquantes**

**Erreur:** `OPENAI_API_KEY is not defined`

**Solution:**
1. Vérifier que les secrets sont configurés dans Cloudflare
2. Dashboard → Settings → Environment variables
3. Ajouter les variables manquantes

### **Problème 4: D1 Database erreur**

**Erreur:** `D1_ERROR: database not found`

**Solution:**
```bash
# Créer la database D1 en production
npx wrangler d1 create collections-database

# Lier dans wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "collections-database"
database_id = "xxx-xxx-xxx"
```

### **Problème 5: eBay API 403 en production**

**Erreur:** `403 Forbidden` sur eBay API

**Solution:**
1. Vérifier que vous utilisez les **clés Production** (pas Sandbox)
2. Vérifier que le token est valide (pas expiré)
3. Vérifier les scopes du token
4. Le fallback Finding API devrait quand même fonctionner

---

## ✅ **CHECKLIST DE DÉPLOIEMENT**

### **Avant déploiement:**
- [x] Code compilé sans erreurs (`npm run build`)
- [x] Tests locaux passent
- [x] Commits poussés sur `main`
- [x] `.dev.vars` configuré (local seulement)

### **Pendant déploiement:**
- [ ] GitHub Actions workflow démarre
- [ ] Build réussit
- [ ] Déploiement Cloudflare complète
- [ ] Badge vert sur GitHub Actions

### **Après déploiement:**
- [ ] API répond (test health check)
- [ ] Smart evaluate fonctionne
- [ ] Variables d'environnement configurées dans Cloudflare
- [ ] Logs ne montrent pas d'erreurs
- [ ] Métriques montrent trafic normal

---

## 🎯 **COMMANDES UTILES**

### **Déploiement manuel (si besoin)**
```bash
# Build local
npm run build

# Déployer manuellement
npx wrangler pages deploy dist
```

### **Voir les déploiements**
```bash
npx wrangler pages deployment list
```

### **Rollback vers déploiement précédent**
```bash
# Via Dashboard Cloudflare
# 1. Workers & Pages → valuecollection
# 2. Deployments → Sélectionner déploiement précédent
# 3. "Rollback to this deployment"
```

### **Logs en temps réel**
```bash
npx wrangler pages deployment tail
```

---

## 📝 **RÉSUMÉ**

### **Déploiement Automatique:**
✅ Chaque push sur `main` déclenche automatiquement:
1. GitHub Actions CI/CD
2. Build du projet (`npm run build`)
3. Déploiement sur Cloudflare Pages
4. Mise en ligne automatique

### **Vérification:**
1. **GitHub Actions:** https://github.com/masterDakill/valuecollection/actions
2. **Cloudflare:** https://dash.cloudflare.com/
3. **API Production:** https://valuecollection.pages.dev/api/smart-evaluate

### **Variables Production:**
⚠️ **N'oubliez pas de configurer les secrets dans Cloudflare Dashboard!**

---

## 🔗 **LIENS IMPORTANTS**

- **GitHub Repo:** https://github.com/masterDakill/valuecollection
- **GitHub Actions:** https://github.com/masterDakill/valuecollection/actions
- **Cloudflare Dashboard:** https://dash.cloudflare.com/
- **eBay Developer:** https://developer.ebay.com/my/keys
- **Wrangler Docs:** https://developers.cloudflare.com/workers/wrangler/

---

## 🎉 **C'EST DÉPLOYÉ!**

Votre application est maintenant en production sur Cloudflare Pages!

**URL de production:** https://valuecollection.pages.dev

Surveillez GitHub Actions pour confirmer que tout se déploie correctement. 🚀
