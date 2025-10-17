# 💎 Évaluateur de Collection Pro - Mathieu Chamberland

## Project Overview
- **Name**: Évaluateur de Collection Pro
- **Goal**: Système intelligent d'évaluation et de gestion d'objets de collection avec IA et multi-API
- **Features**: Import/Export avancé, Évaluation IA par image/vidéo/texte, Base de données persistante, Interface intuitive

## 🌐 URLs
- **Production**: https://ab90ed93.evaluateur-collection-pro.pages.dev
- **Développement Local**: http://localhost:3000
- **GitHub**: *À configurer*

## 🎯 Fonctionnalités Principales

### ✅ **Évaluation Intelligente Multi-Input**
- **Analyse par image/vidéo** : Upload de photos ou vidéos pour reconnaissance automatique
- **Évaluation par texte** : Saisie libre "Abbey Road The Beatles" pour analyse contextuelle
- **IA GPT-4 Vision** : Détection automatique de catégorie, rareté, et données extraites
- **APIs multi-sources** : eBay, Discogs, Google Books, AbeBooks pour pricing

### ✅ **Import/Export Avancé - NOUVEAU !**
- **Import CSV Simple** : Colonnes flexibles avec mapping automatique
- **Import ZIP + Images** : Package CSV + images associées automatiquement 
- **Import Incrémental** : Détection intelligente des doublons avec algorithme de similarité
- **Templates CSV** : 5 templates prédéfinis (Livres, Cartes, Musique, BD/Comics, Général)
- **Export CSV Complet** : Export de toute la collection avec métadonnées

### ✅ **Détection Avancée des Doublons**
- **Algorithme de Levenshtein** pour similarité des titres
- **Comparaison multi-critères** : titre + année + fabricant
- **Interface de résolution** : Choix d'import (nouveaux seulement vs tous)
- **Suggestions intelligentes** lors de la validation

### ✅ **Interface Utilisateur Raffinée**
- **Dashboard avec statistiques temps-réel**
- **Filtres avancés** : catégorie, état, statut, valeur, recherche textuelle
- **Vue grille/liste** avec pagination optimisée
- **Notifications UX** pour feedback utilisateur
- **Responsive design** TailwindCSS

## 🏗️ Data Architecture

### **Modèles de Données Principaux**
- **collection_items** : Items de collection (titre, catégorie, état, images)
- **price_evaluations** : Évaluations de prix avec historique et confiance
- **ai_analysis** : Analyses IA détaillées (catégorie détectée, rareté, insights)
- **activity_logs** : Logs d'activité pour traçabilité et audit
- **recent_sales** : Ventes récentes pour tendances de marché

### **Services de Stockage**
- **Cloudflare D1 (SQLite)** : Base de données distribuée globalement
- **Cloudflare Pages** : Hosting statique avec edge functions
- **Mode Local** : Développement avec `--local` pour tests rapides

### **Flux de Données**
```
Input (Image/Vidéo/Texte) → Smart Analyzer → Multi-API Evaluator → D1 Database → Dashboard UI
                          ↓
                    Cache + Activity Logs
```

## 🛠️ Tech Stack
- **Backend** : Hono Framework + TypeScript + Cloudflare Workers
- **Frontend** : HTML5 + TailwindCSS + Vanilla JavaScript optimisé  
- **Base de données** : Cloudflare D1 (SQLite distribuée)
- **IA/ML** : OpenAI GPT-4 Vision API
- **APIs** : eBay, Discogs, Google Books, AbeBooks
- **Déploiement** : Cloudflare Pages avec CI/CD
- **Développement** : Vite + PM2 + Wrangler CLI

## 📋 Guide Utilisateur

### **1. Évaluation Rapide**
1. **Par Texte** : Tapez "Abbey Road The Beatles" → Cliquez "Évaluer"
2. **Par Image** : Uploadez une photo → Cliquez "Analyser"  
3. **Mode Démo** : Cliquez "Test Démo" pour exemples automatiques

### **2. Import en Lot**
1. **CSV Simple** : Import Avancé → Import CSV → Sélectionner fichier
2. **ZIP + Images** : Import Avancé → Import ZIP → Package CSV + images
3. **Templates** : Import Avancé → Télécharger Template → Choisir catégorie

### **3. Gestion des Collections**  
- **Filtrage** : Utilisez les filtres par catégorie, état, valeur
- **Recherche** : Tapez dans la barre de recherche pour titre/description
- **Export** : Bouton "Export CSV" pour sauvegarde complète

## 🚀 Déploiement

### **Platform** : Cloudflare Pages
### **Status** : ✅ Active et Fonctionnel
### **Last Updated** : 17 octobre 2025

### **Configuration de Déploiement**
```bash
# Build et déploiement
npm run build
npx wrangler pages deploy dist --project-name evaluateur-collection-pro

# Variables d'environnement (optionnel pour mode démo)
npx wrangler pages secret put OPENAI_API_KEY
npx wrangler pages secret put EBAY_CLIENT_ID 
npx wrangler pages secret put GOOGLE_BOOKS_API_KEY
```

### **Base de Données**
- **Local** : SQLite automatique avec `--local`
- **Production** : Cloudflare D1 (à configurer avec permissions)
- **Migrations** : Schéma complet dans `/migrations/`

## 🔄 Prochaines Améliorations

### **Phase 1 - Complétée ✅**
- ✅ Import d'images en lot (ZIP avec CSV de métadonnées)
- ✅ Templates CSV prédéfinis par catégorie  
- ✅ Validation avancée avec suggestions de correction
- ✅ Import incrémental avec détection des doublons

### **Phase 2 - Suggestions Futures**
- 📊 **Analytics avancés** : Graphiques de valeur par période
- 🔍 **Recherche IA** : "Trouve mes cartes de hockey de plus de 1000$"
- 📱 **API REST** : Endpoints pour intégrations externes
- 🔐 **Multi-utilisateurs** : Gestion de collections par utilisateur
- 🎯 **Alertes intelligentes** : Notifications sur variations de prix

## 👥 Développement

### **Environnement Local**
```bash
cd /home/user/webapp
npm run build
pm2 start ecosystem.config.cjs
```

### **Tests et Debug**
```bash
curl http://localhost:3000/api/stats
curl -X POST http://localhost:3000/api/smart-evaluate -d '{"text_input":"test"}' -H "Content-Type: application/json"
```

---

**Développé pour Mathieu Chamberland** - Investisseur Immobilier & Entrepreneur  
*Spécialisé en gestion de propriétés locatives et collections d'objets de valeur*

🔗 **Accès Direct** : https://ab90ed93.evaluateur-collection-pro.pages.dev