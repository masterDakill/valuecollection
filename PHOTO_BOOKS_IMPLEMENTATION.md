# 📚 Photo Books Extract - Guide d'Implémentation

**Date**: 19 octobre 2025
**Version**: 1.0 (Initial)
**Statut**: 🚧 En cours d'implémentation

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Ce Qui A Été Créé](#ce-qui-a-été-créé)
3. [Architecture du Pipeline](#architecture-du-pipeline)
4. [Services Requis](#services-requis)
5. [Endpoint API](#endpoint-api)
6. [Exemple d'Intégration](#exemple-dintégration)
7. [Plan d'Implémentation Complet](#plan-dimplémentation-complet)
8. [Tests](#tests)
9. [Déploiement](#déploiement)

---

## 🎯 Vue d'Ensemble

### Objectif

Créer un endpoint `/api/photo-books-extract` qui :
1. **Reçoit** une photo d'une pile de livres (URL ou base64)
2. **Détecte** automatiquement N dos de livres (jusqu'à 40, recommandé 12-20)
3. **Extrait** les métadonnées (titre, auteur, éditeur, année, etc.)
4. **Enrichit** via APIs externes (Google Books, AbeBooks, eBay, Discogs)
5. **Déduplique** avec algorithme de Levenshtein
6. **Sauvegarde** dans Cloudflare D1
7. **Exporte** en CSV si demandé

### Performance Cibles

- ⏱️ **Latence** : < 30s pour 20 livres
- 💾 **Cache hit rate** : > 80% après quelques jours
- 💰 **Économies** : ~70% de coûts API via cache
- 🎯 **Précision** : > 85% de détection correcte

---

## ✅ Ce Qui A Été Créé

### 1. Schémas Zod (`src/schemas/photo-books.schema.ts`)

**Fichier complet créé** avec :
- ✅ `ImageStackInputSchema` - Validation entrée (imageUrl | imageBase64 + options)
- ✅ `DetectedBookSchema` - Structure d'un livre détecté (25+ champs)
- ✅ `ImageStackResponseSchema` - Réponse complète avec breakdown
- ✅ `PhotoBooksErrorSchema` - Gestion d'erreurs normalisée
- ✅ Helpers de validation (taille image, MIME type, etc.)

**Utilisation** :
```typescript
import { ImageStackInputSchema, ImageStackResponseSchema } from '../schemas/photo-books.schema';

// Validation entrée
const validated = ImageStackInputSchema.parse(request.body);

// Validation sortie
const response = ImageStackResponseSchema.parse(result);
```

### 2. Service Vision Multi-Spine (`src/services/vision-multi-spine.service.ts`)

**Fichier complet créé** avec :
- ✅ Détection multi-dos via GPT-4o Vision
- ✅ Prompt optimisé pour extraction JSON structurée
- ✅ Parsing robuste avec fallback
- ✅ Normalisation bbox (0-1)
- ⚠️ Prétraitement image (stub TODO)

**Utilisation** :
```typescript
import { createVisionMultiSpineService } from '../services/vision-multi-spine.service';

const visionService = createVisionMultiSpineService(OPENAI_API_KEY);
const spines = await visionService.detectMultipleSpines(
  imageUrl,
  null,
  { maxItems: 20, deskew: true, cropStrategy: 'auto' }
);

// Résultat:
// [
//   { rawText: "The Lord of the Rings J.R.R. Tolkien", bbox: [0.1, 0.2, 0.05, 0.3], confidence: 0.92 },
//   ...
// ]
```

### 3. Bibliothèque Levenshtein (`src/lib/levenshtein.ts`)

**Fichier complet créé** avec :
- ✅ `levenshteinDistance()` - Distance d'édition
- ✅ `levenshteinSimilarity()` - Ratio de similarité (0-1)
- ✅ `normalizeForComparison()` - Normalisation accents/ponctuation
- ✅ `areLikelyDuplicates()` - Détection multi-critères (titre + année + auteur)
- ✅ `findDuplicateGroups()` - Groupes de doublons
- ✅ `removeDuplicates()` - Suppression automatique

**Utilisation** :
```typescript
import { removeDuplicates } from '../lib/levenshtein';

const { unique, duplicates, duplicateGroups } = removeDuplicates(
  detectedBooks,
  0.85 // threshold
);

console.log(`${unique.length} livres uniques, ${duplicates.length} doublons`);
```

---

## 🏗️ Architecture du Pipeline

```
┌───────────────────────────────────────────────────────────────┐
│ POST /api/photo-books-extract                                │
│ Input: { imageUrl, imageBase64, options }                    │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ 1. VALIDATION & CACHE CHECK                                  │
│    - Zod schema validation                                    │
│    - Image size/MIME check (≤10MB, jpg/png/webp)             │
│    - Cache lookup (hash image + options)                     │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ 2. VISION MULTI-SPINE DETECTION                              │
│    Service: VisionMultiSpineService                          │
│    - GPT-4o Vision API call                                  │
│    - Detect N book spines (up to 40)                         │
│    - Extract rawText + bbox per spine                        │
│    Output: VisionSpineResult[]                               │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ 3. NER/NORMALIZATION (PARALLEL)                              │
│    Service: ClaudeNERService (TODO)                          │
│    - Parse rawText → structured fields                       │
│    - Extract: title, author, publisher, year, format         │
│    - Infer category (books, music, artbook, etc.)            │
│    - Detect language (en, fr, es, etc.)                      │
│    Output: PartialDetectedBook[]                             │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ 4. ENRICHMENT (PARALLEL, MULTI-API)                          │
│    Service: BooksEnrichmentService (TODO)                    │
│    APIs: Google Books, AbeBooks, eBay, Discogs               │
│    - ISBN lookup (priority)                                  │
│    - Title + author search                                   │
│    - Market pricing (min, median, max)                       │
│    - Rarity score calculation                                │
│    - All with caching (TTL 24h)                              │
│    Output: EnrichedBook[]                                    │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ 5. MULTI-EXPERT CONSOLIDATION                                │
│    Service: ExpertService (EXISTE DÉJÀ)                      │
│    - Consensus pondéré (Vision + Claude + APIs)              │
│    - Confidence scoring                                      │
│    - Outlier trimming                                        │
│    Output: ConsolidatedBook[]                                │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ 6. DEDUPLICATION                                             │
│    Lib: levenshtein.ts (CRÉÉ)                                │
│    - Multi-criteria matching (title + year + author)         │
│    - Configurable threshold (default 0.85)                   │
│    - Mark duplicates with needs_review flag                  │
│    Output: DedupedBook[]                                     │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ 7. DATABASE WRITE                                            │
│    Tables: collection_items, ai_analysis, price_evaluations  │
│    - Bulk insert/UPSERT                                      │
│    - Log sources_used, last_market_check_at                  │
│    - Activity logs pour audit                                │
│    Output: Inserted IDs                                      │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ 8. RESPONSE + EXPORT                                         │
│    - JSON response avec DetectedBook[]                       │
│    - Optional: CSV export (RFC4180, UTF-8-BOM)               │
│    - Cache write (hash image + options)                      │
│    - Metrics logging                                         │
└───────────────────────────────────────────────────────────────┘
```

---

## 🧩 Services Requis

### Services À Créer

#### 1. `ClaudeNERService` (TODO)

**Fichier** : `src/services/claude-ner.service.ts`

**Responsabilité** : Parser le `rawText` extrait par Vision en champs structurés.

**Code skeleton** :
```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { DetectedBook } from '../schemas/photo-books.schema';

export class ClaudeNERService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async parseSpineText(rawText: string): Promise<Partial<DetectedBook>> {
    const prompt = `Parse this book spine text into structured fields:

"${rawText}"

Extract:
- title
- artist_author (author name)
- publisher_label
- year (if visible)
- format (hardcover/paperback/unknown)
- language (ISO 639-1: en, fr, es, etc.)
- category (books, artbook, cinema, music, reference, biography, interviews, unknown)

Return ONLY valid JSON:
{
  "title": "...",
  "artist_author": "...",
  "publisher_label": "...",
  "year": 1984,
  "format": "hardcover",
  "language": "en",
  "category": "books"
}`;

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    return JSON.parse(jsonMatch[0]);
  }

  async parseBatch(rawTexts: string[]): Promise<Partial<DetectedBook>[]> {
    // Parallel processing with Promise.all
    return await Promise.all(
      rawTexts.map(text => this.parseSpineText(text))
    );
  }
}
```

#### 2. `BooksEnrichmentService` (TODO)

**Fichier** : `src/services/books-enrichment.service.ts`

**Responsabilité** : Enrichir avec Google Books, AbeBooks, eBay, Discogs.

**Code skeleton** :
```typescript
import type { DetectedBook } from '../schemas/photo-books.schema';
import { BooksService } from './books-service'; // EXISTE DÉJÀ
import { DiscogsService } from './discogs-service'; // EXISTE DÉJÀ
import { EbayService } from './ebay-service'; // EXISTE DÉJÀ
import { APICacheService } from './api-cache-service'; // EXISTE DÉJÀ

export class BooksEnrichmentService {
  constructor(
    private booksService: BooksService,
    private discogsService: DiscogsService,
    private ebayService: EbayService,
    private cacheService: APICacheService
  ) {}

  async enrichBook(
    book: Partial<DetectedBook>
  ): Promise<Partial<DetectedBook>> {
    const results: Partial<DetectedBook> = { ...book };
    const sources: string[] = [];

    try {
      // 1. Google Books (ISBN priority)
      if (book.isbn_13 || book.isbn_10) {
        const googleData = await this.booksService.searchByISBN(
          book.isbn_13 || book.isbn_10
        );
        if (googleData) {
          results.publisher_label = googleData.publisher;
          results.year = googleData.year;
          sources.push('google_books');
        }
      }

      // 2. AbeBooks (pricing for books)
      if (book.category === 'books') {
        const abeData = await this.searchAbeBooks(book.title, book.artist_author);
        if (abeData) {
          results.estimated_value_min = abeData.minPrice;
          results.estimated_value_median = abeData.medianPrice;
          results.estimated_value_max = abeData.maxPrice;
          results.rarity_score = abeData.rarityScore;
          sources.push('abebooks');
        }
      }

      // 3. Discogs (si musique détectée)
      if (book.category === 'music') {
        const discogsData = await this.discogsService.search(
          `${book.artist_author} ${book.title}`
        );
        if (discogsData) {
          results.publisher_label = discogsData.label;
          results.year = discogsData.year;
          sources.push('discogs');
        }
      }

      // 4. eBay (market trend)
      const ebayData = await this.ebayService.search(
        `${book.title} ${book.artist_author}`
      );
      if (ebayData && ebayData.length > 0) {
        const prices = ebayData.map(item => item.price);
        results.market_trend = this.calculateTrend(prices);
        sources.push('ebay');
      }

      results.sources_used = sources;

    } catch (error) {
      console.error('[Enrichment] Error enriching book:', error);
      results.notes = `Enrichment partially failed: ${error.message}`;
    }

    return results;
  }

  async enrichBatch(books: Partial<DetectedBook>[]): Promise<Partial<DetectedBook>[]> {
    // Parallel avec throttling (max 5 simultanés)
    const batches = [];
    for (let i = 0; i < books.length; i += 5) {
      const batch = books.slice(i, i + 5);
      batches.push(Promise.allSettled(
        batch.map(book => this.enrichBook(book))
      ));
    }

    const results = await Promise.all(batches);
    return results.flat().map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
  }

  private calculateTrend(prices: number[]): 'up' | 'stable' | 'down' {
    // TODO: Implémenter logique de tendance
    return 'stable';
  }

  private async searchAbeBooks(title: string, author: string): Promise<any> {
    // TODO: Implémenter recherche AbeBooks
    // API: https://www.abebooks.com/servlet/DevelopersAPI
    return null;
  }
}
```

#### 3. Export CSV Service (TODO)

**Fichier** : `src/lib/csv-export.ts`

**Code skeleton** :
```typescript
import type { DetectedBook } from '../schemas/photo-books.schema';

/**
 * Export détected books to RFC4180 CSV format
 * Includes UTF-8 BOM for Excel compatibility
 */
export function exportToCSV(books: DetectedBook[]): string {
  const BOM = '\uFEFF'; // UTF-8 BOM

  // Headers (stable order)
  const headers = [
    'title',
    'artist_author',
    'publisher_label',
    'year',
    'language',
    'category',
    'format',
    'isbn_10',
    'isbn_13',
    'edition_details',
    'rarity_score',
    'market_trend',
    'estimated_value_min',
    'estimated_value_median',
    'estimated_value_max',
    'sources_used',
    'confidence',
    'notes'
  ];

  // Escape CSV value (RFC4180)
  const escape = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build CSV
  const rows = [
    headers.join(','),
    ...books.map(book =>
      headers.map(h => escape(book[h])).join(',')
    )
  ];

  return BOM + rows.join('\n');
}
```

### Services Existants À Réutiliser

✅ `ExpertService` (`src/services/ExpertService.ts`) - Consolidation multi-expert
✅ `APICacheService` (`src/services/api-cache-service.ts`) - Cache API
✅ `BooksService` (`src/services/books-service.ts`) - Google Books
✅ `DiscogsService` (`src/services/discogs-service.ts`) - Discogs API
✅ `EbayService` (`src/services/ebay-service.ts`) - eBay API
✅ `Logger` (`src/lib/logger.ts`) - Logs structurés
✅ `Metrics` (`src/lib/metrics.ts`) - Prometheus metrics
✅ `Auth` (`src/lib/auth.ts`) - Bearer token auth
✅ `RateLimit` (`src/lib/rateLimit.ts`) - Rate limiting

---

## 🛣️ Endpoint API

### Route

**Fichier** : `src/routes/photo-books.ts`

**Code complet** :

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ImageStackInputSchema, ImageStackResponseSchema } from '../schemas/photo-books.schema';
import { createVisionMultiSpineService } from '../services/vision-multi-spine.service';
import { removeDuplicates } from '../lib/levenshtein';
import { exportToCSV } from '../lib/csv-export'; // TODO
import type { DetectedBook } from '../schemas/photo-books.schema';

type Bindings = {
  DB: D1Database;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  // ... autres bindings
};

export const photoBooksRouter = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/photo-books-extract
 * Extract multiple books from a single photo
 */
photoBooksRouter.post(
  '/',
  zValidator('json', ImageStackInputSchema),
  async (c) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const input = c.req.valid('json');
    const exportFormat = c.req.query('export'); // ?export=csv

    try {
      // 1. VISION: Detect multiple spines
      const visionService = createVisionMultiSpineService(c.env.OPENAI_API_KEY);
      const spines = await visionService.detectMultipleSpines(
        input.imageUrl || null,
        input.imageBase64 || null,
        input.options
      );

      console.log(`[PhotoBooks] Detected ${spines.length} spines`);

      // 2. NER: Parse spine text (TODO: utiliser ClaudeNERService)
      // Pour l'instant, stub simple
      const parsedBooks: Partial<DetectedBook>[] = spines.map(spine => ({
        title: spine.rawText.split(/\s+/).slice(0, 5).join(' '), // Approximation
        bbox: spine.bbox,
        confidence: spine.confidence,
        category: 'unknown',
        format: 'unknown'
      }));

      // 3. ENRICHMENT (TODO: utiliser BooksEnrichmentService)
      // const enrichedBooks = await enrichmentService.enrichBatch(parsedBooks);

      // 4. DEDUPLICATION
      const { unique, duplicates } = removeDuplicates(
        parsedBooks as DetectedBook[],
        input.options.deduplicationThreshold
      );

      console.log(`[PhotoBooks] ${unique.length} unique, ${duplicates.length} duplicates`);

      // 5. DATABASE WRITE (TODO: bulk insert)
      // await c.env.DB.batch([...insert statements]);

      // 6. RESPONSE
      const response: ImageStackResponse = {
        success: true,
        requestId,
        items: unique as DetectedBook[],
        cached: false,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      // Export CSV si demandé
      if (exportFormat === 'csv') {
        const csv = exportToCSV(unique as DetectedBook[]);
        return c.body(csv, 200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="detected-books-${requestId}.csv"`
        });
      }

      return c.json(response);

    } catch (error) {
      console.error('[PhotoBooks] Error:', error);
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
          request_id: requestId
        },
        timestamp: new Date().toISOString()
      }, 500);
    }
  }
);
```

### Intégration dans `src/index.tsx`

Ajouter dans le fichier principal :

```typescript
import { photoBooksRouter } from './routes/photo-books';

// Après les autres routes
app.route('/api/photo-books-extract', photoBooksRouter);
```

---

## 🧪 Tests

### Unit Tests

**Fichier** : `tests/unit/levenshtein.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  levenshteinDistance,
  levenshteinSimilarity,
  areLikelyDuplicates
} from '../../src/lib/levenshtein';

describe('Levenshtein', () => {
  it('should calculate distance correctly', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('', '')).toBe(0);
    expect(levenshteinDistance('abc', 'abc')).toBe(0);
  });

  it('should calculate similarity ratio', () => {
    expect(levenshteinSimilarity('abc', 'abc')).toBe(1.0);
    expect(levenshteinSimilarity('', '')).toBe(1.0);
    expect(levenshteinSimilarity('abc', 'xyz')).toBeLessThan(0.5);
  });

  it('should detect duplicates', () => {
    const book1 = { title: 'Harry Potter', artist_author: 'J.K. Rowling', year: 1997 };
    const book2 = { title: 'Harry Potter', artist_author: 'JK Rowling', year: 1997 };
    const book3 = { title: 'Lord of the Rings', artist_author: 'Tolkien', year: 1954 };

    expect(areLikelyDuplicates(book1, book2, 0.85)).toBe(true);
    expect(areLikelyDuplicates(book1, book3, 0.85)).toBe(false);
  });
});
```

### Contract Tests

**Fichier** : `tests/contract/photo-books.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { ImageStackInputSchema } from '../../src/schemas/photo-books.schema';

describe('/api/photo-books-extract contract', () => {
  it('should validate correct input', () => {
    const valid = {
      imageUrl: 'https://example.com/books.jpg',
      options: { maxItems: 20, useCache: true }
    };
    expect(() => ImageStackInputSchema.parse(valid)).not.toThrow();
  });

  it('should reject missing image', () => {
    const invalid = { options: {} };
    expect(() => ImageStackInputSchema.parse(invalid)).toThrow();
  });

  it('should enforce maxItems range', () => {
    const invalid = { imageUrl: 'https://example.com/test.jpg', options: { maxItems: 50 } };
    expect(() => ImageStackInputSchema.parse(invalid)).toThrow();
  });
});
```

### E2E Tests

**Fichier** : `tests/e2e/photo-books.e2e.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('Photo Books E2E', () => {
  const BASE_URL = 'http://localhost:3000';

  it('should extract books from photo', async () => {
    const response = await fetch(`${BASE_URL}/api/photo-books-extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: 'https://example.com/test-bookshelf.jpg',
        options: { maxItems: 10, useCache: false }
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.items)).toBe(true);
  });

  it('should export CSV', async () => {
    const response = await fetch(`${BASE_URL}/api/photo-books-extract?export=csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: 'https://example.com/test-bookshelf.jpg'
      })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
  });
});
```

---

## 📦 Déploiement

### 1. Variables d'Environnement

Ajouter dans Cloudflare Pages → Settings → Environment Variables :

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_BOOKS_API_KEY=AIza...
# (autres déjà configurées)
```

### 2. Build & Deploy

```bash
# Local test
npm run build
npm run dev:d1

# Deploy to staging
npx wrangler pages deploy dist --project-name evaluateur-collection-pro --branch staging

# Deploy to production
npx wrangler pages deploy dist --project-name evaluateur-collection-pro --branch main
```

### 3. CI/CD GitHub Actions

Fichier `.github/workflows/deploy.yml` (EXISTE DÉJÀ) gère automatiquement le déploiement.

---

## ✅ Checklist d'Implémentation

### Phase 1 : Core Services ✅
- [x] Schémas Zod (photo-books.schema.ts)
- [x] Service Vision Multi-Spine (vision-multi-spine.service.ts)
- [x] Bibliothèque Levenshtein (levenshtein.ts)

### Phase 2 : Services Complémentaires 🚧
- [ ] ClaudeNERService (claude-ner.service.ts)
- [ ] BooksEnrichmentService (books-enrichment.service.ts)
- [ ] CSV Export (csv-export.ts)

### Phase 3 : Endpoint & Integration 🚧
- [ ] Route /api/photo-books-extract (routes/photo-books.ts)
- [ ] Intégration dans src/index.tsx
- [ ] Middleware auth + rate limit

### Phase 4 : Tests 🚧
- [ ] Unit tests (levenshtein, schemas)
- [ ] Contract tests (endpoint validation)
- [ ] E2E tests (full pipeline)

### Phase 5 : Documentation & Deploy 🚧
- [ ] OpenAPI spec update
- [ ] README exemples cURL
- [ ] Deploy staging
- [ ] Deploy production

---

## 📝 Prochaines Étapes Recommandées

1. **Implémenter ClaudeNERService** (priorité haute)
   - Utiliser le skeleton fourni
   - Tester avec des exemples de rawText

2. **Créer BooksEnrichmentService** (priorité haute)
   - Réutiliser les services existants (BooksService, DiscogsService, etc.)
   - Implémenter searchAbeBooks()

3. **Créer CSV Export** (priorité moyenne)
   - Implémenter exportToCSV()
   - Tester avec Excel/Google Sheets

4. **Créer l'endpoint complet** (priorité haute)
   - Copier skeleton de routes/photo-books.ts
   - Intégrer tous les services
   - Tester bout en bout

5. **Tests** (priorité moyenne)
   - Unit tests pour nouveaux services
   - E2E test avec vraie photo

6. **Documentation** (priorité basse)
   - Mettre à jour README
   - Ajouter exemples cURL

---

## 🤝 Support

Pour questions ou aide :
- 📧 Contacter Mathieu Chamberland
- 📚 Consulter README.md
- 🔍 Voir SMART_FEATURES.md pour APIs existantes

---

**Dernière mise à jour** : 19 octobre 2025
**Statut** : Fondations créées, implémentation en cours
