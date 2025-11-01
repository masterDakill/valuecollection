# 🔧 Configuration eBay Production - Guide Complet

## 📋 Prérequis
- Compte eBay Developer créé ✅
- Application créée ✅
- Clés Sandbox actuelles ✅

## 🚀 Activation Production

### Étape 1: Obtenir les Clés Production

1. **Aller sur:** https://developer.ebay.com/my/keys
2. **Trouver votre application:** "Collecto" ou nom similaire
3. **Cliquer sur:** "Production" ou "Get Production Keys"

### Étape 2: Informations Requises (si demandé)

eBay peut demander:

**1. Informations Business:**
```
Business Name: Forza Construction Inc.
Contact: Mathieu Chamberland
Email: Math55_50@hotmail.com
```

**2. Description de l'application:**
```
Application Name: Évaluateur de Collection Pro
Purpose: Personal book collection valuation tool
- Analyzes book photos using AI
- Fetches market prices from eBay listings
- Provides price estimates for collectible books
- For personal collection management (non-commercial)
```

**3. URL Callback (si demandé):**
```
https://valuecollection.pages.dev/auth/callback
ou
http://localhost:3000/auth/callback (pour dev)
```

### Étape 3: Copier les Nouvelles Clés

Une fois approuvé, vous obtiendrez:

```
Production App ID (Client ID): PRD-xxxxxxxxxxxxx
Production Cert ID (Client Secret): PRD-yyyyyyyyyyy
```

### Étape 4: Mettre à Jour .dev.vars

Remplacer dans `.dev.vars`:

**AVANT (Sandbox):**
```bash
EBAY_CLIENT_ID=VotreSandboxAppID
EBAY_CLIENT_SECRET=VotreSandboxCertID
```

**APRÈS (Production):**
```bash
EBAY_CLIENT_ID=VotreProdAppID
EBAY_CLIENT_SECRET=VotreProdCertID
```

### Étape 5: Mettre à Jour le Code

Le code utilise automatiquement la clé de `.dev.vars`.

**Fichier à vérifier:** `src/services/price-aggregator.service.ts`

Ligne 200:
```typescript
url.searchParams.set('SECURITY-APPNAME', 'VotreProdAppID');
```

Devrait être:
```typescript
// Utiliser la variable d'environnement
const ebayAppId = process.env.EBAY_CLIENT_ID || 'MathieuC-Collecto-SBX-fc5825f8b';
url.searchParams.set('SECURITY-APPNAME', ebayAppId);
```

## 🧪 Test des Clés Production

Une fois configuré:

```bash
# 1. Rebuild
npm run build

# 2. Redémarrer le serveur
npm run dev:d1

# 3. Tester une évaluation
curl -X POST http://localhost:3000/api/items/4/evaluate | python3 -m json.tool
```

**Résultat attendu:**
```json
{
  "prices": {
    "average": 45.50,
    "sources": [
      {"source": "eBay", "price": 42.00, ...},
      {"source": "eBay", "price": 49.00, ...}
    ]
  }
}
```

## 📊 Limites Production

| Limite | Valeur |
|--------|--------|
| Appels/jour | 5000 |
| Appels/seconde | 5 |
| Coût | **GRATUIT** |

## ❓ Problèmes Courants

### Erreur: "Application not approved"

**Solution:**
- Attendre l'approbation eBay (24-48h)
- Vérifier email de confirmation
- Contacter support: devrelations@ebay.com

### Erreur: "Invalid credentials"

**Solution:**
- Vérifier que vous utilisez les clés PRODUCTION
- Pas de clés SANDBOX
- Vérifier copier-coller sans espaces

### Aucun résultat retourné

**Solution:**
- Livre trop rare/récent
- Essayer avec ISBN-13
- Essayer avec titre complet

## 🎯 Avantages Production

✅ **5000 appels gratuits/jour**
✅ **Vraies données de marché eBay**
✅ **Prix actuels de ventes réelles**
✅ **Mise à jour quotidienne**
✅ **Données canadiennes disponibles**

---

**Besoin d'aide?** Voir: https://developer.ebay.com/support
