# Collection de Livres Intégrée - Documentation

## Vue d'ensemble

La collection de livres est maintenant entièrement intégrée dans l'application principale sous l'onglet **"Photos & Livres"**.

## Fonctionnalités

### 1. Interface Unifiée
- La collection complète de livres est visible dans l'onglet "Photos & Livres"
- Plus besoin d'une page séparée `/books`
- Toutes les données de la base de données sont visibles

### 2. Statistiques en Temps Réel

Quatre cartes de statistiques affichent:
- **Total Livres**: Nombre total de livres détectés
- **Enrichis**: Livres avec métadonnées complètes (auteur, éditeur, ISBN)
- **À Enrichir**: Livres manquant de métadonnées
- **Valeur Totale**: Somme des valeurs estimées (en €)

### 3. Affichage Détaillé des Livres

Chaque livre affiche:
- **Numéro d'ordre** dans la collection
- **Couverture** (si disponible)
- **Titre**
- **Auteur** (ou "non renseigné")
- **Éditeur** (ou "non renseigné")
- **Année de publication**
- **ISBN-13** (ou "non renseigné")
- **Valeur estimée** (en €, ou N/A)
- **Confiance de détection** (pourcentage)
- **Photo source** (#ID)
- **Date de création**

### 4. Enrichissement des Données

#### Enrichissement Individuel
- Bouton **"Enrichir"** sur chaque livre incomplet
- Recherche automatique sur:
  - Google Books API
  - Open Library API (fallback)
- Remplissage automatique: auteur, éditeur, ISBN, année, couverture

#### Enrichissement en Lot
- Bouton **"Enrichir Tout"** en haut de la page
- Traite jusqu'à 20 livres à la fois
- Délai de 200ms entre chaque requête (rate limiting)
- Notification du résultat: X enrichis, Y échecs

### 5. Notifications

Le système affiche des toasts pour:
- Chargement des données
- Succès d'enrichissement (avec source)
- Erreurs d'enrichissement
- Progression des opérations en lot

## Architecture Technique

### Frontend (src/index.tsx)

#### Composants HTML Ajoutés (lignes 290-371)
```html
<!-- Section Collection Complète -->
- Stats de la collection (4 cartes)
- Liste des livres (booksCollectionList)
- Message vide (booksCollectionEmpty)
```

#### JavaScript Ajouté

**Event Listeners** (lignes 851-860)
```javascript
refreshBooksBtn.addEventListener('click', () => this.loadBooks())
enrichAllBooksBtn.addEventListener('click', () => this.enrichAllBooks())
```

**Méthodes Principales** (lignes 2391-2594)
- `loadBooks()`: Charge les livres depuis /api/items
- `displayBooks(books)`: Rend la liste HTML avec toutes les métadonnées
- `updateBookStats(books)`: Met à jour les 4 cartes de statistiques
- `enrichBook(bookId)`: Enrichit un livre individuel
- `enrichAllBooks()`: Enrichit tous les livres en attente
- `escapeHtml(text)`: Sécurité XSS

### Backend

#### Routes API (src/routes/items.ts)

**GET /api/items**
- Retourne tous les livres avec photos associées
- Tri par photo_id DESC, detection_index ASC
- Jointure avec analyzed_photos

**POST /api/items/:id/enrich**
- Enrichit un livre spécifique
- Recherche Google Books + Open Library
- Mise à jour non-destructive (COALESCE)
- Fix: Conversion undefined → null pour D1

**POST /api/items/enrich-all**
- Enrichit jusqu'à 20 livres manquants
- Rate limiting: 200ms entre requêtes
- Retourne: {processed, failed, total}

#### Service d'Enrichissement (src/services/book-enrichment.service.ts)

**BookEnrichmentService**
- `searchGoogleBooks(query)`: Recherche via Google Books API
- `searchOpenLibrary(query)`: Recherche via Open Library API
- `searchAllSources(title)`: Essaie les deux sources
- `enrichBook(title, author?)`: Retourne les meilleures données

**Données Enrichies**
- authors: string[]
- publisher: string
- publishedDate: string (YYYY-MM-DD)
- isbn10: string
- isbn13: string
- imageUrl: string (couverture)
- description: string
- pageCount: number
- categories: string[]
- source: 'google_books' | 'open_library'
- confidence: number (0-1)

## Utilisation

### Voir la Collection
1. Ouvrir l'application: http://localhost:3000
2. Cliquer sur l'onglet **"Photos & Livres"**
3. Faire défiler après la galerie de photos
4. Section **"Collection Complète de Livres"**

### Enrichir un Livre
1. Trouver un livre avec métadonnées manquantes
2. Cliquer sur le bouton vert **"Enrichir"**
3. Attendre la notification de succès
4. Les données sont mises à jour automatiquement

### Enrichir Tous les Livres
1. Cliquer sur **"Enrichir Tout"** en haut
2. Confirmer l'opération dans le dialogue
3. Attendre la fin du traitement (peut prendre plusieurs minutes)
4. Voir le résumé: X enrichis, Y échecs

### Actualiser les Données
- Cliquer sur le bouton bleu **"Actualiser"**
- Recharge les livres depuis la base de données

## État Actuel

### Collection Actuelle (25 Oct 2025)
- **17 livres** détectés depuis les photos
- **0 enrichis** (métadonnées manquantes)
- Prêts pour l'enrichissement automatique

### Exemples de Livres Détectés
1. THE ART OF VAMPIRELLA
2. THE ART OF JOE JUSKO
3. THE ART OF SPACE
4. ENCYCLOPEDIA OF SCIENCE FICTION
5. CRYSTAL LAKE MEMORIES
6. FRIDAY THE 13TH
7. H. P. LOVECRAFT LE ROMAN DE SA VIE
... (17 total)

## Corrections Appliquées

### Fix D1 Database (src/routes/items.ts)
**Problème**: D1 n'accepte pas `undefined`, seulement `null`
```typescript
// Avant (erreur)
enrichedData.authors?.join(', ')

// Après (fix)
enrichedData.authors?.join(', ') || null
```

Appliqué sur tous les champs:
- artist_author
- publisher_label
- year
- isbn
- isbn_13
- primary_image_url

## APIs Externes

### Google Books API
- **Endpoint**: https://www.googleapis.com/books/v1/volumes
- **Clé API**: Requis dans .dev.vars (GOOGLE_BOOKS_API_KEY)
- **Limite**: 1000 requêtes/jour (gratuit)
- **Source principale** pour les métadonnées

### Open Library API
- **Endpoint**: https://openlibrary.org/search.json
- **Clé API**: Non requis
- **Limite**: Aucune limite stricte
- **Source de secours** si Google Books échoue

## Sécurité

### Protection XSS
```javascript
escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

Appliqué sur:
- Titres de livres
- Noms d'auteurs
- Noms d'éditeurs

### Mise à Jour Non-Destructive
```sql
SET field = COALESCE(field, ?)
```
Ne remplace jamais une valeur existante.

## Tests

### Tester l'API /api/items
```bash
curl http://localhost:3000/api/items | jq '.items | length'
# Output: 17
```

### Tester l'Enrichissement
```bash
curl -X POST http://localhost:3000/api/items/2/enrich | jq
# Output: {"success": true, "enrichment": {...}}
```

### Tester l'Enrichissement Batch
```bash
curl -X POST http://localhost:3000/api/items/enrich-all | jq
# Output: {"success": true, "processed": 10, "failed": 7}
```

## Améliorations Futures

1. **Évaluation des Prix**
   - Intégrer eBay API pour les prix de marché
   - Calculer valeur moyenne/min/max
   - Historique des prix

2. **Filtres et Tri**
   - Filtrer par auteur, éditeur, année
   - Trier par titre, date, valeur
   - Recherche textuelle

3. **Export/Import**
   - Export CSV de la collection complète
   - Import CSV avec enrichissement auto
   - Export PDF avec couvertures

4. **Visualisations**
   - Graphique de la valeur totale
   - Distribution par éditeur
   - Timeline des acquisitions

## Support

- **Documentation**: Voir README.md principal
- **API Docs**: http://localhost:3000/api-docs
- **Issues**: https://github.com/votre-repo/issues
