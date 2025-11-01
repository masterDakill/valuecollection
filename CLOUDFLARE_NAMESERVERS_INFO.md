# Cloudflare Nameservers - aidyn.ai

**Date:** 2025-11-01  
**Domaine:** aidyn.ai  
**Status:** Domaine ajouté mais pas actif sur Cloudflare  
**Action requise:** Mise à jour des nameservers

---

## 📧 Message Reçu

Cloudflare indique que `aidyn.ai` a été ajouté à votre compte mais **n'utilise pas encore les nameservers Cloudflare**.

### Conséquences Actuelles
- ❌ Pas de protection DDoS de Cloudflare
- ❌ Pas de cache CDN global
- ❌ Pas d'optimisation de vitesse
- ❌ Pas de certificat SSL automatique de Cloudflare
- ❌ Pas de règles de pare-feu Cloudflare

---

## 🎯 Nameservers à Configurer

Vous devez pointer votre domaine vers ces nameservers Cloudflare:

```
ganz.ns.cloudflare.com
magali.ns.cloudflare.com
```

---

## 📋 Instructions Pas-à-Pas

### Étape 1: Identifier Votre Registrar

Le registrar est l'endroit où vous avez acheté le domaine `aidyn.ai`.

**Registrars courants pour .ai:**
- Namecheap
- GoDaddy
- Google Domains
- Cloudflare Registrar
- Gandi
- 101domain

**Pour vérifier:** https://lookup.icann.org/en/lookup (cherchez "aidyn.ai")

---

### Étape 2: Accéder aux Paramètres DNS

**Exemple pour Namecheap:**
1. Connectez-vous à https://namecheap.com
2. Allez dans "Domain List"
3. Cliquez sur "Manage" pour aidyn.ai
4. Section "Nameservers"
5. Sélectionnez "Custom DNS"

**Exemple pour GoDaddy:**
1. Connectez-vous à https://godaddy.com
2. "My Products" → Domains
3. Cliquez sur aidyn.ai
4. DNS Management
5. Section "Nameservers" → Change

**Exemple pour Google Domains:**
1. Connectez-vous à https://domains.google.com
2. Cliquez sur aidyn.ai
3. DNS → "Use custom name servers"

---

### Étape 3: Remplacer les Nameservers

**⚠️ IMPORTANT:** Vous devez **remplacer complètement** les nameservers existants, pas les ajouter.

**AVANT (exemple):**
```
ns1.example.com
ns2.example.com
```

**APRÈS (obligatoire):**
```
ganz.ns.cloudflare.com
magali.ns.cloudflare.com
```

**Notes:**
- ✅ Utilisez UNIQUEMENT ces deux nameservers
- ✅ Retirez tous les autres
- ✅ Respectez l'orthographe exacte
- ✅ Pas de "www" devant
- ✅ Sauvegarder les changements

---

### Étape 4: Attendre la Propagation DNS

**Délai normal:** 24-48 heures (souvent plus rapide, 1-4 heures)

Pendant ce temps:
- ⏳ Le domaine continue de fonctionner normalement
- ⏳ La propagation se fait progressivement
- ⏳ Certains utilisateurs verront les nouveaux serveurs avant d'autres

---

### Étape 5: Vérifier l'Activation

**Dans Cloudflare Dashboard:**
1. Connectez-vous à https://dash.cloudflare.com
2. Cliquez sur `aidyn.ai`
3. Vérifiez le statut en haut de la page

**Status attendu:**
- Avant: "Pending Nameserver Update" (orange)
- Après: "Active" (vert) ✅

---

## 🔍 Vérification en Ligne de Commande

Pour vérifier si les nameservers sont mis à jour:

```bash
# Linux/Mac
dig NS aidyn.ai +short

# Ou
nslookup -type=NS aidyn.ai

# Résultat attendu après propagation:
# ganz.ns.cloudflare.com
# magali.ns.cloudflare.com
```

**Windows (PowerShell):**
```powershell
nslookup -type=NS aidyn.ai
```

---

## ⚠️ Points d'Attention

### Avant de Changer les Nameservers

**1. Vérifier les enregistrements DNS existants**

Avant de changer, notez tous vos enregistrements DNS actuels:
- Records A (adresses IP)
- Records CNAME (alias)
- Records MX (email)
- Records TXT (SPF, DKIM, vérifications)

**2. Recréer les enregistrements dans Cloudflare**

Cloudflare devrait les importer automatiquement, mais vérifiez:
1. Dans Cloudflare Dashboard
2. Allez dans DNS pour aidyn.ai
3. Vérifiez que tous les records sont présents
4. Ajoutez ceux qui manquent

**3. Configuration Email**

Si vous avez des emails sur ce domaine:
- ✅ Vérifiez que les records MX sont dans Cloudflare
- ✅ Vérifiez les records SPF/DKIM/DMARC
- ⚠️ Les emails peuvent être interrompus si mal configuré

---

## 🚀 Bénéfices Après Activation

### Performance
- ⚡ CDN global (plus de 300 datacenters)
- ⚡ Cache automatique des contenus statiques
- ⚡ Compression Brotli/Gzip
- ⚡ HTTP/3 et QUIC

### Sécurité
- 🛡️ Protection DDoS (unlimited et gratuit)
- 🛡️ Web Application Firewall (WAF)
- 🛡️ SSL/TLS automatique et gratuit
- 🛡️ Règles de pare-feu personnalisables

### Fonctionnalités
- 📊 Analytics détaillés
- 🔄 Load balancing
- 🌍 Géolocalisation
- 🤖 Bot protection

---

## 📊 Timeline Typique

```
T+0      : Changement nameservers dans registrar
T+15min  : Premiers serveurs DNS voient le changement
T+1h     : 30-50% de propagation mondiale
T+4h     : 80-90% de propagation mondiale
T+24h    : 99% de propagation mondiale
T+48h    : 100% de propagation garantie
```

**Cloudflare détectera automatiquement** quand les nameservers sont actifs et changera le status à "Active".

---

## 🔧 Troubleshooting

### "Les nameservers ne se mettent pas à jour"

**Causes possibles:**
1. Délai de propagation normal (attendre 24-48h)
2. Erreur de saisie (vérifier l'orthographe exacte)
3. Registrar nécessite une confirmation par email
4. Domaine verrouillé (clientHold status)

**Solutions:**
- Vérifier dans les paramètres du registrar
- Chercher des emails de confirmation
- Contacter le support du registrar

### "Le site ne fonctionne plus après le changement"

**Causes possibles:**
1. Records DNS manquants dans Cloudflare
2. Proxy Cloudflare activé mais mauvaise config
3. SSL/TLS mode incorrect

**Solutions:**
1. Vérifier tous les DNS records dans Cloudflare
2. Mettre les records en "DNS only" (cloud gris) temporairement
3. SSL/TLS mode: "Full (strict)" si vous avez SSL sur origine

### "Emails ne fonctionnent plus"

**Cause:** Records MX manquants ou incorrects

**Solution:**
1. Cloudflare Dashboard → DNS
2. Vérifier records MX
3. Les recréer si manquants
4. MX records doivent être "DNS only" (cloud gris)

---

## 🎯 Checklist Post-Migration

Après que le status soit "Active" dans Cloudflare:

- [ ] Site web accessible (www et sans www)
- [ ] Certificat SSL actif (cadenas vert)
- [ ] Emails fonctionnent (envoi et réception)
- [ ] Sous-domaines accessibles
- [ ] APIs/services fonctionnent
- [ ] Analytics Cloudflare affiche du trafic

---

## 📞 Support

### Si Problème avec le Registrar
- Contacter le support de votre registrar
- Avoir ces infos prêtes:
  - Nom de domaine: aidyn.ai
  - Nameservers à configurer: ganz.ns.cloudflare.com, magali.ns.cloudflare.com

### Si Problème avec Cloudflare
- Support Cloudflare: https://dash.cloudflare.com/?to=/:account/support
- Ou via le chat dans le dashboard

### Ressources Cloudflare
- Guide nameservers: https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/
- Vérification status: https://www.cloudflare.com/dns/
- Community: https://community.cloudflare.com/

---

## 📝 Différence avec valuecollection

**valuecollection** (votre autre projet):
- Utilise Cloudflare **Pages** (hébergement)
- Pas besoin de changer nameservers
- Fonctionne via GitHub integration

**aidyn.ai**:
- Utilise Cloudflare **DNS + Proxy**
- Nécessite changement de nameservers
- Pour bénéficier du CDN et protection

**Ce sont deux configurations différentes!**

---

## ✅ Résumé des Actions

1. **Identifier registrar** où aidyn.ai est enregistré
2. **Se connecter** au compte registrar
3. **Remplacer nameservers** par:
   - ganz.ns.cloudflare.com
   - magali.ns.cloudflare.com
4. **Sauvegarder** les changements
5. **Attendre** 24-48h pour propagation
6. **Vérifier** status "Active" dans Cloudflare

---

**Créé:** 2025-11-01  
**Domaine:** aidyn.ai  
**Action:** Mise à jour nameservers requise  
**Urgence:** Non urgent (le domaine continue de fonctionner), mais recommandé pour activer Cloudflare
