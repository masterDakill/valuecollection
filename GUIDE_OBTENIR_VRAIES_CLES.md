# Guide: Obtenir les Vraies Clés API

**Votre Client ID OAuth**: `268246124083-XXXXX...apps.googleusercontent.com` (anonymisé)

⚠️ **ATTENTION**: Ce n'est PAS une clé API! C'est un Client ID OAuth (pour login Google).

---

## 🔑 Comment Obtenir les Vraies Clés API

### 1. Google Gemini API Key

**Étapes**:

1. **Aller sur Google AI Studio**:
   ```
   https://makersuite.google.com/app/apikey
   ```

2. **Se connecter** avec votre compte Google:
   - Utiliser le même compte que `268246124083-gf4m0k4s1a10kuhdv9q8euja4c2svoam`

3. **Cliquer "Create API Key"**

4. **Sélectionner votre projet Google Cloud** (ou créer un nouveau)

5. **Copier la clé** qui commence par `AIza...`

6. **Remplacer dans `.dev.vars`**:
   ```bash
   # Ligne 22
   GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

**Format attendu**: `AIza...` (27-39 caractères)

---

### 2. Google Books API Key

**Option A: Utiliser le Même Projet Google Cloud**

1. **Aller sur Google Cloud Console**:
   ```
   https://console.cloud.google.com/apis/credentials
   ```

2. **Sélectionner votre projet** (celui avec ID `268246124083`)

3. **Cliquer "Create Credentials" → "API Key"**

4. **La clé sera générée** (format `AIza...`)

5. **IMPORTANT: Activer l'API Books**:
   - Aller sur: https://console.cloud.google.com/apis/library/books.googleapis.com
   - Cliquer "Enable"

6. **Restreindre la clé** (recommandé):
   - Cliquer sur la clé nouvellement créée
   - "API restrictions" → "Restrict key"
   - Sélectionner "Books API"
   - Sauvegarder

7. **Copier la clé** et remplacer dans `.dev.vars`:
   ```bash
   # Ligne 49
   GOOGLE_BOOKS_API_KEY=AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
   ```

**Option B: Créer un Nouveau Projet** (si séparation souhaitée)

1. Aller sur: https://console.cloud.google.com/projectcreate
2. Nommer le projet: "ValueCollection APIs"
3. Créer le projet
4. Suivre les étapes de l'Option A

---

## 🔧 Différences Importantes

### OAuth Client ID vs API Key

| Type | Format | Usage | Votre cas |
|------|--------|-------|-----------|
| **OAuth Client ID** | `268246124083-...apps.googleusercontent.com` | Login/Authentication | ✅ Vous l'avez |
| **API Key** | `AIzaSy...` (27-39 chars) | API Calls directes | ❌ À obtenir |

### Pourquoi OAuth ne Fonctionne Pas

```
OAuth Client ID:
└─ Pour: "Sign in with Google", Google Drive access, etc.
└─ Ne peut PAS: Faire des appels API directs

API Key:
└─ Pour: Appels REST API (Gemini, Books, Maps, etc.)
└─ Peut: Faire des requêtes HTTPS directes
```

---

## 📝 Instructions Pas-à-Pas Détaillées

### Pour Gemini

```bash
# 1. Ouvrir dans navigateur
https://makersuite.google.com/app/apikey

# 2. Cliquer "Get API Key" ou "Create API Key"

# 3. Sélectionner projet ou créer nouveau

# 4. Copier la clé (commence par AIza)

# 5. Éditer le fichier
cd /home/user/webapp
nano .dev.vars

# 6. Modifier ligne 22:
# Avant:
GEMINI_API_KEY=GOCSPX-XXXXX... (OAuth secret - à remplacer)

# Après:
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# 7. Sauvegarder: Ctrl+O, Enter, Ctrl+X

# 8. Redémarrer
./start.sh
```

### Pour Google Books

```bash
# 1. Ouvrir dans navigateur
https://console.cloud.google.com/apis/credentials

# 2. Sélectionner votre projet (268246124083)

# 3. Cliquer "Create Credentials" → "API Key"

# 4. Activer Books API:
https://console.cloud.google.com/apis/library/books.googleapis.com
   → Cliquer "Enable"

# 5. Copier la clé générée (AIza...)

# 6. Éditer le fichier
nano .dev.vars

# 7. Modifier ligne 49:
# Avant:
GOOGLE_BOOKS_API_KEY=GOCSPX-XXXXX... (OAuth secret - à remplacer)

# Après:
GOOGLE_BOOKS_API_KEY=AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYY

# 8. Sauvegarder: Ctrl+O, Enter, Ctrl+X

# 9. Redémarrer
./start.sh
```

---

## ✅ Vérification

Après avoir mis à jour les clés, exécutez:

```bash
cd /home/user/webapp
./fix-api-keys.sh
```

**Résultat attendu**:
```
✓ OpenAI: Clé valide (commence par sk-)
✓ Anthropic: Clé valide (commence par sk-ant-)
✓ Gemini: Clé valide (commence par AIza)
✓ Google Books: Clé valide (commence par AIza)
```

---

## 🎯 Test Après Correction

```bash
# Redémarrer le serveur
./start.sh

# Tester l'évaluation (devrait utiliser Gemini ou OpenAI)
curl -X POST http://localhost:8790/api/items/23/evaluate

# Vérifier dans les logs quel LLM a été utilisé
# Vous devriez voir:
# "Using LLM" avec provider: gemini ou openai ou anthropic
```

---

## 🔐 Sécurité des Clés

### Bonnes Pratiques

1. **Ne JAMAIS commiter** `.dev.vars` dans Git
   - ✅ Déjà dans `.gitignore`

2. **Restreindre les clés API**:
   - Google Cloud Console → API Key → "Restrict key"
   - Limiter aux APIs nécessaires (Gemini, Books)
   - Limiter aux IPs si possible

3. **Créer des clés séparées** par environnement:
   - Dev: Clés avec restrictions lâches
   - Prod: Clés avec restrictions strictes

4. **Monitorer l'usage**:
   - Google Cloud Console → APIs & Services → Dashboard
   - Voir les quotas et l'utilisation

---

## 💰 Quotas et Coûts

### Google Gemini

**Gratuit**:
- 60 requêtes/minute
- 1,500 requêtes/jour
- Modèle: `gemini-pro`

**Payant** (si dépassement):
- $0.00025 / 1K characters input
- $0.0005 / 1K characters output

### Google Books API

**Gratuit**:
- 1,000 requêtes/jour
- Pas de limite de requêtes/seconde

**Payant**:
- Gratuit pour la plupart des usages
- Quotas augmentables si nécessaire

---

## 🆘 Dépannage

### Erreur: "API key not valid"

**Solutions**:
1. Vérifier que la clé commence par `AIza`
2. Vérifier que l'API est activée dans Google Cloud Console
3. Attendre 1-2 minutes après création (propagation)

### Erreur: "API not enabled"

**Solution**:
```
https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
→ Cliquer "Enable" pour Gemini

https://console.cloud.google.com/apis/library/books.googleapis.com
→ Cliquer "Enable" pour Books
```

### Erreur: "Quota exceeded"

**Solutions**:
1. Vérifier quotas: https://console.cloud.google.com/apis/dashboard
2. Augmenter quotas ou attendre le reset (minuit PST)
3. Utiliser fallback (OpenAI/Anthropic)

---

## 📊 Comparaison des Clés

Votre configuration actuelle:

| Service | Vous Avez | Type | Valide? | À Obtenir |
|---------|-----------|------|---------|-----------|
| Google OAuth | `268246124083-...` | OAuth Client ID | ✅ OK | - |
| OpenAI | `sk-proj-LaPkr4...` | API Key | ✅ OK | - |
| Anthropic | `sk-ant-api03-...` | API Key | ✅ OK | - |
| Gemini | `GOCSPX-UXzhzL...` | OAuth Secret | ❌ FAUX | `AIza...` |
| Google Books | `GOCSPX-3IbbL5...` | OAuth Secret | ❌ FAUX | `AIza...` |

---

## 🚀 Après Correction

Une fois les clés corrigées, vous aurez:

✅ **3 LLMs fonctionnels**:
- OpenAI GPT-4 (principal)
- Anthropic Claude (fallback 1)
- Google Gemini (fallback 2)

✅ **Enrichissement complet**:
- Google Books API
- Open Library
- Discogs

✅ **Rotation intelligente**:
- LLMManager bascule automatiquement
- Optimise les coûts
- Haute disponibilité

---

## 📞 Ressources Utiles

**Documentation**:
- Gemini: https://ai.google.dev/docs
- Google Books: https://developers.google.com/books
- OAuth vs API Keys: https://cloud.google.com/docs/authentication

**Consoles**:
- Google AI Studio: https://makersuite.google.com
- Google Cloud: https://console.cloud.google.com
- API Keys: https://console.cloud.google.com/apis/credentials

**Support**:
- Votre projet ID: `268246124083`
- OAuth Client: `268246124083-gf4m0k4s1a10kuhdv9q8euja4c2svoam`

---

**Prochaine étape**: Obtenir vos clés API Gemini et Google Books!

Temps estimé: 5 minutes par clé
