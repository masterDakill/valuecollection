# 🔐 Guide de Configuration du Token eBay OAuth

## Contexte
Votre application a besoin d'un **User Token** OAuth pour accéder aux données eBay (recherche de ventes, prix, etc.).

## 📋 Ce que vous avez déjà
- ✅ App ID (Client ID) : `MathieuC-Collecto-SBX-fc5825f8b-ecb977c2`
- ✅ Client Secret : Configuré
- ✅ RuName : `Mathieu_Chamber-MathieuC-Collec-mpbzllj`
- ✅ Toutes les permissions configurées

## 🎯 Ce qu'il faut faire maintenant

### Étape 1 : Obtenir le Token OAuth (Simple)

1. **Retournez sur la page eBay Developer** : https://developer.ebay.com/my/keys
2. **Sélectionnez votre keyset** : `CollectorValue (Sandbox)`
3. **Cliquez sur "Sign in to Sandbox for OAuth"**
4. **Acceptez les permissions** sur la page de consentement
5. **Copiez le token généré** (il commence par `v^1.1#i^1...`)

### Étape 2 : Ajouter le Token à `.dev.vars`

Ouvrez votre fichier `.dev.vars` et ajoutez :

```bash
# eBay OAuth User Token (expires après 2 heures)
EBAY_USER_TOKEN=v^1.1#i^1#f^0#p^3#I^3#r^0#t^H4sIAAAAAAAA/+Vaf2wbVx2P8...
```

### Étape 3 : Modifier le Service eBay pour Utiliser le Token

Le service `EbayService.ts` doit être mis à jour pour utiliser le User Token OAuth au lieu de juste Client Credentials.

## 🔄 Alternative : Refresh Token (Pour Production)

Pour éviter de renouveler manuellement toutes les 2 heures, implémentez le flux OAuth avec Refresh Token :

### Code à Ajouter dans `EbayService.ts`

```typescript
private refreshToken?: string;

// Obtenir un nouveau Access Token avec le Refresh Token
private async refreshAccessToken(): Promise<string> {
  if (!this.refreshToken) {
    throw new Error('No refresh token available');
  }

  const auth = btoa(`${this.clientId}:${this.clientSecret}`);
  const response = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=refresh_token&refresh_token=${this.refreshToken}&scope=https://api.ebay.com/oauth/api_scope`
  });

  if (!response.ok) {
    throw new Error(`eBay token refresh failed: ${response.statusText}`);
  }

  const data = await response.json();
  this.accessToken = data.access_token;
  this.refreshToken = data.refresh_token; // Nouveau refresh token
  this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

  return this.accessToken;
}
```

## 📝 Notes Importantes

### Durée de Vie des Tokens
- **Access Token** : 2 heures
- **Refresh Token** : 18 mois
- **Application Token** : 2 heures (pas suffisant pour les recherches)

### Scopes Nécessaires pour Votre App
Pour rechercher les ventes et prix, vous avez besoin de :
- `https://api.ebay.com/oauth/api_scope` (lecture publique)
- `https://api.ebay.com/oauth/api_scope/sell.inventory` (optionnel, pour publier)

### Mode Sandbox vs Production
- **Sandbox** : Pour tests, avec utilisateurs de test
- **Production** : Clés et tokens différents, vraies données eBay

## 🔧 Test Rapide

Une fois le token ajouté, testez avec :

```bash
curl -X GET "https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search?q=Beatles&limit=3" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-EBAY-C-MARKETPLACE-ID: EBAY_CA"
```

## 🚨 Problèmes Courants

### "Authorization header is missing"
→ Le User Token n'est pas configuré ou expiré

### "Invalid access token"
→ Le token est expiré (2 heures), obtenez-en un nouveau ou utilisez le refresh token

### "Invalid grant"
→ Le Refresh Token est expiré (18 mois), re-signin requis

## 📚 Références
- [eBay OAuth Guide](https://developer.ebay.com/api-docs/static/oauth-tokens.html)
- [Getting Tokens](https://developer.ebay.com/api-docs/static/oauth-authorization-code-grant.html)
- [Buy API Browse](https://developer.ebay.com/api-docs/buy/browse/overview.html)
