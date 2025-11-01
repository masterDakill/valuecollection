# Instructions: Créer .dev.vars avec vos Clés

**Date:** 2025-11-01  
**Problème:** `.dev.vars` n'existe pas dans le projet  
**Solution:** Le créer avec vos clés API

---

## 📝 Étape 1: Créer le Fichier

Vous avez mentionné que "tout est dans env.devs". Si vous avez déjà les clés API quelque part, voici comment créer le fichier `.dev.vars`:

### Option A: Via l'Interface (Si vous avez accès au projet)

1. **Ouvrir le projet** dans votre éditeur (VS Code, etc.)

2. **Créer un nouveau fichier** `.dev.vars` à la racine du projet

3. **Copier ce template:**

```bash
# ValueCollection - Variables d'Environnement
ENVIRONMENT=development

# OpenAI GPT-4o Vision (REQUIS pour analyse de photos)
OPENAI_API_KEY=sk-proj-votre-cle-ici

# Anthropic Claude (Optionnel - NER avancé)
ANTHROPIC_API_KEY=sk-ant-votre-cle-ici

# Google Gemini (Optionnel - recherche de prix)
GEMINI_API_KEY=votre-cle-ici

# eBay API (Optionnel - prix de marché)
EBAY_CLIENT_ID=votre-client-id-ici
EBAY_CLIENT_SECRET=votre-client-secret-ici

# Google Books API (Optionnel - métadonnées)
GOOGLE_BOOKS_API_KEY=votre-cle-ici

# Discogs API (Optionnel - prix musique/livres)
DISCOGS_API_KEY=votre-cle-ici
```

4. **Remplacer** les valeurs par vos vraies clés

5. **Sauvegarder** le fichier

---

### Option B: Via Ligne de Commande

```bash
cd valuecollection

# Créer le fichier
cat > .dev.vars << 'EOF'
# ValueCollection - Variables d'Environnement
ENVIRONMENT=development

# OpenAI - REQUIS
OPENAI_API_KEY=sk-proj-VOTRE-VRAIE-CLE-ICI

# Autres clés (remplacer si vous les avez)
ANTHROPIC_API_KEY=sk-ant-votre-cle-ici
GEMINI_API_KEY=votre-cle-ici
EBAY_CLIENT_ID=votre-client-id-ici
EBAY_CLIENT_SECRET=votre-client-secret-ici
GOOGLE_BOOKS_API_KEY=votre-cle-ici
DISCOGS_API_KEY=votre-cle-ici
EOF

# Éditer pour ajouter vos vraies clés
nano .dev.vars
```

---

## 🔑 Format des Clés API

Voici à quoi ressemblent les différentes clés:

### OpenAI (CRITIQUE - Sans ça, rien ne marche)
```
OPENAI_API_KEY=sk-proj-abc123def456ghi789...
```
- Commence par `sk-proj-`
- ~200-300 caractères
- Obtenir sur: https://platform.openai.com/api-keys

### Anthropic Claude
```
ANTHROPIC_API_KEY=sk-ant-api03-xyz789...
```
- Commence par `sk-ant-`
- Obtenir sur: https://console.anthropic.com/

### Google Gemini
```
GEMINI_API_KEY=AIzaSyAbc123Def456...
```
- Commence par `AIza`
- Obtenir sur: https://makersuite.google.com/app/apikey

### eBay
```
EBAY_CLIENT_ID=YourAppN-YourApp-PRD-1234567890
EBAY_CLIENT_SECRET=PRD-1234567890abc-def-ghi
```
- Deux clés séparées
- Obtenir sur: https://developer.ebay.com/

---

## 🚨 Si Vous Avez un Fichier "env.devs"

Si vous avez déjà un fichier nommé différemment (comme `env.devs`), vous pouvez:

### Option 1: Le Renommer
```bash
cd valuecollection
mv env.devs .dev.vars
```

### Option 2: Copier le Contenu
```bash
cd valuecollection
cp env.devs .dev.vars
```

### Option 3: Créer un Lien Symbolique
```bash
cd valuecollection
ln -s env.devs .dev.vars
```

---

## ✅ Vérification

Après avoir créé le fichier, vérifiez:

```bash
# 1. Le fichier existe
ls -la .dev.vars
# Devrait afficher: -rw-r--r-- 1 user user XXX .dev.vars

# 2. Les clés sont présentes (masquées pour sécurité)
grep OPENAI_API_KEY .dev.vars | head -c 40
# Devrait afficher: OPENAI_API_KEY=sk-proj-...

# 3. Le format est correct
cat .dev.vars
# Devrait montrer vos clés (ATTENTION: ne pas partager!)
```

---

## 🔄 Après Création du Fichier

1. **Redémarrer le serveur:**
   ```bash
   # Arrêter le serveur actuel (Ctrl+C dans le terminal où il tourne)
   # Puis relancer:
   npm run dev:d1
   ```

2. **Vérifier que les clés sont chargées:**
   Les logs devraient montrer:
   ```
   Your Worker has access to the following bindings:
   env.OPENAI_API_KEY (from .dev.vars)  ← Devrait apparaître
   ```

3. **Tester l'upload:**
   - Uploader une photo de livre
   - Vérifier les logs
   - Devrait maintenant détecter les livres ✅

---

## 🔒 Sécurité

**IMPORTANT:**

1. ✅ **Ne JAMAIS commiter .dev.vars dans Git**
   - Déjà dans `.gitignore`
   - Vérifier: `git status` ne doit PAS montrer `.dev.vars`

2. ✅ **Ne pas partager les clés**
   - Pas de screenshot avec clés visibles
   - Pas de copier-coller dans chat/email
   - Pas de partage de fichier

3. ✅ **Fichier local uniquement**
   - `.dev.vars` reste sur votre machine
   - Pour production: utiliser Cloudflare Secrets

---

## 📊 Configuration Minimale vs. Complète

### Minimum (Pour Tester)
```bash
ENVIRONMENT=development
OPENAI_API_KEY=sk-proj-votre-cle-ici
```
**Permet:** Analyse de photos de base

### Complet (Toutes Fonctionnalités)
```bash
ENVIRONMENT=development
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
EBAY_CLIENT_ID=...
EBAY_CLIENT_SECRET=...
GOOGLE_BOOKS_API_KEY=...
DISCOGS_API_KEY=...
```
**Permet:** Analyse + évaluation de prix + métadonnées complètes

---

## 🐛 Si Ça Ne Marche Toujours Pas

### 1. Vérifier le Nom du Fichier
```bash
ls -la | grep dev
# Doit afficher exactement: .dev.vars
# PAS: dev.vars ou env.devs ou autre
```

### 2. Vérifier le Format
```bash
# Pas d'espaces autour du =
❌ OPENAI_API_KEY = sk-proj-...
✅ OPENAI_API_KEY=sk-proj-...

# Pas de guillemets (sauf si dans la clé elle-même)
❌ OPENAI_API_KEY="sk-proj-..."
✅ OPENAI_API_KEY=sk-proj-...
```

### 3. Vérifier les Permissions
```bash
chmod 600 .dev.vars
# Rend le fichier lisible uniquement par vous
```

### 4. Redémarrer Complètement
```bash
# Tuer tous les processus
pkill -f wrangler
pkill -f node

# Relancer proprement
npm run dev:d1
```

---

## 📞 Aide Rapide

### "J'ai les clés dans un autre fichier"
→ Copier le contenu dans `.dev.vars`

### "Je ne trouve pas mes clés"
→ Les régénérer sur les plateformes respectives

### "Le fichier existe mais ça ne marche pas"
→ Vérifier le format (pas d'espaces, pas de guillemets)

### "Les logs montrent toujours 'undefined'"
→ Redémarrer le serveur après création du fichier

---

## ✅ Résumé

**Pour que ça fonctionne:**

1. Créer `.dev.vars` (exactement ce nom, avec le point devant)
2. Ajouter au minimum `OPENAI_API_KEY=sk-proj-...`
3. Redémarrer le serveur
4. Tester l'upload

**Le fichier `.dev.vars` DOIT être à la racine du projet, au même niveau que `package.json`.**

---

**Si vous avez déjà les clés quelque part, partagez-moi le nom du fichier et je vous aiderai à le configurer correctement!**
