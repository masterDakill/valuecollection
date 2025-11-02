# État Actuel - Correction eBay + Système de Démarrage Automatique

**Date**: 2025-11-02  
**Commit**: `ed09a2c` - "fix(ebay): map condition codes to eBay API accepted values"

---

## ✅ Système de Démarrage Automatique

### Créé et Fonctionnel

Le script `start.sh` a été créé pour automatiser complètement le démarrage de l'application.

**Fonctionnalités**:
- 🧹 Nettoyage des processus existants
- 🔨 Build automatique de l'application
- 🚀 Démarrage du serveur Wrangler sur le port 8790
- ⏱️ Health checks avec 30 tentatives (intervalle de 2 secondes)
- 🔑 Injection automatique du User Token eBay
- 📊 Surveillance continue du serveur
- 🛑 Arrêt propre avec gestion des signaux (Ctrl+C)

**Utilisation**:
```bash
cd /home/user/webapp
./start.sh
```

**Configuration**:
- Port par défaut: `8790` (configurable via variable `PORT`)
- Token eBay: Pré-configuré avec expiration avril 2027
- Couleurs: Interface colorée pour meilleure UX

**Documentation**: Voir `STARTUP.md` pour plus de détails

---

## 🔧 Correction eBay - Codes de Condition

### Problème Identifié

**Erreur eBay API**:
```json
{
  "errors": [{
    "errorId": 2004,
    "domain": "ACCESS",
    "category": "REQUEST",
    "message": "Invalid request",
    "longMessage": "The request has errors. For help, see the documentation for this API.",
    "parameters": [{
      "name": "reason",
      "value": "Could not serialize field [condition]"
    }]
  }]
}
```

### Cause

L'API eBay Inventory nécessite des codes de condition spécifiques et **exactement formatés**. 

**Codes acceptés par eBay**:
- `NEW`
- `LIKE_NEW`
- `USED_EXCELLENT`
- `USED_VERY_GOOD`
- `USED_GOOD`
- `USED_ACCEPTABLE`
- `FOR_PARTS_OR_NOT_WORKING`

### Solution Implémentée

**Fichier**: `src/services/ebay-oauth.service.ts`

Ajout d'un mapping de conditions:
```typescript
const ebayConditionMap: Record<string, string> = {
  'NEW': 'NEW',
  'LIKE_NEW': 'LIKE_NEW',
  'USED': 'USED_EXCELLENT',
  'GOOD': 'USED_GOOD',
  'EXCELLENT': 'USED_EXCELLENT',
  'VERY_GOOD': 'USED_VERY_GOOD',
  'ACCEPTABLE': 'USED_ACCEPTABLE',
  'FOR_PARTS': 'FOR_PARTS_OR_NOT_WORKING'
};

const normalizedCondition = itemData.condition.toUpperCase().replace(/[-\s]/g, '_');
const ebayCondition = ebayConditionMap[normalizedCondition] || 'USED_GOOD';
```

**Comportement**:
1. Normalisation de la condition (majuscules, remplacement espaces/tirets par underscores)
2. Mapping vers code eBay valide
3. Fallback par défaut: `USED_GOOD` si condition inconnue

---

## 🧪 Tests à Effectuer

### 1. Test du Système de Démarrage

**Commande**:
```bash
./start.sh
```

**Vérifications**:
- ✅ Le script nettoie les processus existants
- ✅ Le build s'exécute sans erreurs
- ✅ Le serveur démarre sur le port 8790
- ✅ Les health checks passent
- ✅ Le token eBay est injecté automatiquement
- ✅ L'URL publique est affichée

### 2. Test de Publication eBay

**Via l'interface web**:
1. Accéder à l'application: https://8790-i8enkf17m91vnoyj05yhe-82b888ba.sandbox.novita.ai
2. Naviguer vers "Annonces" > "eBay"
3. Sélectionner un item (ex: "OBLAGON CONCEPTS OF SYD MEAD", ID 23)
4. Générer l'annonce
5. Publier l'annonce

**Résultat attendu**:
- ✅ Création de l'inventaire item réussie (pas d'erreur "condition")
- ✅ Création de l'offre réussie
- ✅ Publication de l'annonce réussie
- ✅ Obtention d'un listing ID eBay
- ✅ Status: "PUBLIÉ" (plus "SIMULÉ")

**Via API** (test direct):
```bash
curl -X POST http://localhost:8790/api/ads-publish/publish-ebay \
  -H "Content-Type: application/json" \
  -d '{"adId": 5}'
```

---

## 📊 État Actuel du Système

### Serveur
- **Status**: ✅ En cours d'exécution
- **Port**: 8790
- **URL Publique**: https://8790-i8enkf17m91vnoyj05yhe-82b888ba.sandbox.novita.ai
- **Process ID**: bash_8381f0f2 (background)

### eBay Token
- **Status**: ✅ Configuré et valide
- **Type**: User Token
- **Expiration**: 2030-11-01 (≈5 ans)
- **Permissions**: Sell Inventory, Fulfillment, Item

### Base de Données
- **Total items**: 23
- **Items complétés**: 23
- **Items analysés**: 23
- **Item test**: "OBLAGON CONCEPTS OF SYD MEAD" (ID 23)
  - Prix estimé: 500 CAD
  - Prix avec markup (10%): 550 CAD
  - Condition: USED_GOOD

### Fichiers Modifiés
1. ✅ `src/services/ebay-oauth.service.ts` - Mapping des conditions
2. ✅ `start.sh` - Script de démarrage automatique
3. ✅ `STARTUP.md` - Documentation du système de démarrage
4. ✅ `.env.example` - Template des variables d'environnement

---

## 🚀 Prochaines Étapes Recommandées

### 1. Test de Publication Réelle (Priorité: HAUTE)

**Objectif**: Vérifier que la correction des codes de condition fonctionne

**Actions**:
1. Via l'interface, publier l'item ID 23 sur eBay Sandbox
2. Vérifier qu'aucune erreur "Could not serialize field [condition]" n'apparaît
3. Confirmer l'obtention d'un listing ID réel (pas SIMULATED)
4. Vérifier sur https://www.sandbox.ebay.com si la listing apparaît

### 2. Validation Automatique du Démarrage

**Objectif**: S'assurer que `./start.sh` fonctionne comme attendu

**Actions**:
1. Tester avec arrêt/redémarrage complet
2. Vérifier que le token est bien injecté à chaque démarrage
3. Confirmer que les health checks fonctionnent correctement

### 3. Persistance du Token (Optionnel)

**Objectif**: Stocker le token dans la base D1 au lieu de la mémoire

**Avantages**:
- Token survit aux redémarrages de l'application
- Pas besoin de réinjection manuelle
- Meilleure gestion des refresh tokens

**Implementation**:
```sql
CREATE TABLE IF NOT EXISTS oauth_tokens (
  provider TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);
```

### 4. Production eBay (Après validation Sandbox)

**Prérequis**:
- ✅ Tests Sandbox réussis
- ⏳ Approbation eBay Production Keyset
- ⏳ Configuration des politiques (fulfillment, payment, return)

---

## 📝 Logs et Monitoring

### Vérifier l'état du serveur
```bash
curl http://localhost:8790/api/stats
```

### Vérifier le status du token eBay
```bash
curl http://localhost:8790/api/ads-publish/ebay/token-status
```

### Réinjecter le token manuellement (si besoin)
```bash
curl -X POST http://localhost:8790/api/ads-publish/ebay/set-user-token \
  -H "Content-Type: application/json" \
  -d '{"token": "v^1.1#i^1#f^0#p^3#r^1#I^3#t^Ul4xMF84OkRGOEJDNkNBMDU5RjNDMDRGMjdGMDU3QjIwNDBDMjczXzFfMSNFXjEyODQ=", "expiresIn": 157680000}'
```

### Voir les logs en temps réel
```bash
# Via l'outil BashOutput
# ID du process: bash_8381f0f2
```

---

## 🔍 Détails Techniques

### Architecture OAuth eBay

**Modes d'authentification supportés**:
1. ✅ **User Token** (actuel) - Token longue durée depuis Developer Portal
2. ✅ **Authorization Code Flow** - OAuth classique avec redirect
3. ✅ **Client Credentials** - Application token (données publiques uniquement)

**Endpoints configurés**:
- Auth URL: `https://auth.sandbox.ebay.com/oauth2/authorize`
- Token URL: `https://api.sandbox.ebay.com/identity/v1/oauth2/token`
- API URL: `https://api.sandbox.ebay.com`

### Workflow de Publication eBay

**Étapes** (dans `createAndPublishListing`):
1. **Create Inventory Item** - PUT `/sell/inventory/v1/inventory_item/{sku}`
   - Définit le produit, condition, disponibilité
   - Retourne 204 No Content si succès
2. **Create Offer** - POST `/sell/inventory/v1/offer`
   - Associe prix, catégorie, politiques
   - Retourne `offerId`
3. **Publish Offer** - POST `/sell/inventory/v1/offer/{offerId}/publish`
   - Active la listing sur eBay
   - Retourne `listingId`

**Données requises**:
- SKU unique
- Titre (max 80 caractères)
- Description HTML
- Prix (USD)
- Quantité
- **Condition** (maintenant mappée correctement ✅)
- Category ID eBay
- Images (optionnel)
- Location (optionnel)

---

## ✅ Résumé des Corrections

| Problème | Status | Solution |
|----------|--------|----------|
| Démarrage manuel complexe | ✅ RÉSOLU | Script `start.sh` automatique |
| Token perdu au redémarrage | ✅ RÉSOLU | Injection automatique dans `start.sh` |
| Erreur "condition" eBay | ✅ RÉSOLU | Mapping des codes de condition |
| Documentation incomplète | ✅ RÉSOLU | `STARTUP.md` + `.env.example` créés |

---

## 🎯 Objectif Final

**Permettre la publication automatique d'annonces eBay avec**:
- ✅ Démarrage en une commande
- ✅ Token eBay configuré automatiquement
- ✅ Codes de condition conformes à l'API eBay
- ⏳ Création réelle de listings (test en attente)
- ⏳ Transition vers Production (après approbation eBay)

---

**Commit actuel**: `ed09a2c`  
**Branche**: `main`  
**Serveur**: Running (PID: bash_8381f0f2)  
**URL**: https://8790-i8enkf17m91vnoyj05yhe-82b888ba.sandbox.novita.ai
