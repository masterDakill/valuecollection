# 🚀 Photo Books Extract - Quick Start

**Objectif**: Avoir un endpoint `/api/photo-books-extract` fonctionnel en 2-3 heures.

---

## ✅ Ce Qui Est Déjà Fait

```
src/schemas/photo-books.schema.ts         ✅ COMPLET
src/services/vision-multi-spine.service.ts ✅ COMPLET
src/lib/levenshtein.ts                     ✅ COMPLET
PHOTO_BOOKS_IMPLEMENTATION.md              ✅ GUIDE COMPLET
```

---

## 🔧 À Faire (Copy-Paste Ready)

### 1. Créer ClaudeNERService (5 min)

**Fichier**: `src/services/claude-ner.service.ts`

Copier depuis `PHOTO_BOOKS_IMPLEMENTATION.md` section "ClaudeNERService".

Ou utiliser ce code minimal:

```typescript
// src/services/claude-ner.service.ts
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeNERService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async parseSpineText(rawText: string): Promise<any> {
    const prompt = `Parse book spine: "${rawText}"\nReturn JSON with: title, artist_author, publisher_label, year, format, language, category`;

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response');

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    return JSON.parse(jsonMatch[0]);
  }

  async parseBatch(rawTexts: string[]): Promise<any[]> {
    return await Promise.all(rawTexts.map(text => this.parseSpineText(text)));
  }
}

export function createClaudeNERService(apiKey: string): ClaudeNERService {
  return new ClaudeNERService(apiKey);
}
```

### 2. Créer CSV Export (5 min)

**Fichier**: `src/lib/csv-export.ts`

```typescript
// src/lib/csv-export.ts
export function exportToCSV(books: any[]): string {
  const BOM = '\uFEFF';
  const headers = ['title', 'artist_author', 'publisher_label', 'year', 'category', 'isbn_13', 'estimated_value_median', 'confidence'];

  const escape = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [
    headers.join(','),
    ...books.map(book => headers.map(h => escape(book[h])).join(','))
  ];

  return BOM + rows.join('\n');
}
```

### 3. Créer la Route (10 min)

**Fichier**: `src/routes/photo-books.ts`

```typescript
// src/routes/photo-books.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ImageStackInputSchema } from '../schemas/photo-books.schema';
import { createVisionMultiSpineService } from '../services/vision-multi-spine.service';
import { createClaudeNERService } from '../services/claude-ner.service';
import { removeDuplicates } from '../lib/levenshtein';
import { exportToCSV } from '../lib/csv-export';

type Bindings = {
  DB: D1Database;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
};

export const photoBooksRouter = new Hono<{ Bindings: Bindings }>();

photoBooksRouter.post(
  '/',
  zValidator('json', ImageStackInputSchema),
  async (c) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const input = c.req.valid('json');

    try {
      // 1. VISION: Detect spines
      const visionService = createVisionMultiSpineService(c.env.OPENAI_API_KEY);
      const spines = await visionService.detectMultipleSpines(
        input.imageUrl || null,
        input.imageBase64 || null,
        input.options
      );

      console.log(`[PhotoBooks] Detected ${spines.length} spines`);

      // 2. NER: Parse text
      const nerService = createClaudeNERService(c.env.ANTHROPIC_API_KEY);
      const parsed = await nerService.parseBatch(spines.map(s => s.rawText));

      // 3. Deduplication
      const books = spines.map((spine, i) => ({
        ...parsed[i],
        bbox: spine.bbox,
        confidence: spine.confidence
      }));

      const { unique } = removeDuplicates(books, input.options.deduplicationThreshold);

      // 4. Response
      const exportFormat = c.req.query('export');
      if (exportFormat === 'csv') {
        return c.body(exportToCSV(unique), 200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="books-${requestId}.csv"`
        });
      }

      return c.json({
        success: true,
        requestId,
        items: unique,
        cached: false,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });

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

### 4. Intégrer dans index.tsx (2 min)

Ajouter dans `src/index.tsx` après les autres routes:

```typescript
import { photoBooksRouter } from './routes/photo-books';

// ... après les autres app.route()
app.route('/api/photo-books-extract', photoBooksRouter);
```

### 5. Build & Test (5 min)

```bash
# Build
npm run build

# Redémarrer le serveur
pkill -f "wrangler pages dev"
npm run dev:d1

# Attendre 5 secondes
sleep 5

# Tester
curl -X POST http://localhost:3000/api/photo-books-extract \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/bookshelf.jpg",
    "options": {
      "maxItems": 10,
      "useCache": true
    }
  }'
```

---

## 🧪 Test Rapide

**Fichier de test**: Créer `test-photo-books.sh`

```bash
#!/bin/bash

echo "🧪 Testing Photo Books Extract Endpoint"
echo ""

BASE_URL="http://localhost:3000"

echo "1️⃣  Testing with sample image URL..."
curl -s -X POST $BASE_URL/api/photo-books-extract \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://picsum.photos/800/600",
    "options": {"maxItems": 5}
  }' | jq '.'

echo ""
echo "2️⃣  Testing CSV export..."
curl -s -X POST "$BASE_URL/api/photo-books-extract?export=csv" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://picsum.photos/800/600",
    "options": {"maxItems": 5}
  }' > test-export.csv

echo "✅ CSV exported to test-export.csv"
cat test-export.csv
```

Puis:

```bash
chmod +x test-photo-books.sh
./test-photo-books.sh
```

---

## 📊 Exemple de Réponse

```json
{
  "success": true,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "title": "The Lord of the Rings",
      "artist_author": "J.R.R. Tolkien",
      "publisher_label": "Houghton Mifflin",
      "year": 1954,
      "category": "books",
      "format": "hardcover",
      "language": "en",
      "bbox": [0.1, 0.2, 0.05, 0.3],
      "confidence": 0.92
    },
    {
      "title": "Harry Potter and the Philosopher's Stone",
      "artist_author": "J.K. Rowling",
      "publisher_label": "Bloomsbury",
      "year": 1997,
      "category": "books",
      "format": "paperback",
      "language": "en",
      "bbox": [0.15, 0.2, 0.05, 0.3],
      "confidence": 0.88
    }
  ],
  "cached": false,
  "latencyMs": 4250,
  "timestamp": "2025-10-19T20:30:00.000Z"
}
```

---

## ✅ Checklist de Validation

Après implémentation, vérifier:

- [ ] Build passe sans erreur (`npm run build`)
- [ ] Serveur démarre (`npm run dev:d1`)
- [ ] Endpoint répond (`curl POST /api/photo-books-extract`)
- [ ] Response JSON est valide
- [ ] Export CSV fonctionne (`?export=csv`)
- [ ] Détection de multiples livres fonctionne
- [ ] Déduplication fonctionne (tester avec doublons)

---

## 🐛 Troubleshooting

### Erreur "Cannot find module '@anthropic-ai/sdk'"

```bash
npm install @anthropic-ai/sdk
```

### Erreur "zValidator is not a function"

```bash
npm install @hono/zod-validator
```

### Erreur TypeScript sur crypto.randomUUID()

Ajouter dans `tsconfig.json`:

```json
{
  "compilerOptions": {
    "lib": ["ES2022", "DOM"]
  }
}
```

### Vision API timeout

Augmenter timeout dans `vision-multi-spine.service.ts`:

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 60000); // 60s

const response = await fetch('...', {
  signal: controller.signal
});
```

---

## 🚀 Prochaines Améliorations

Après avoir l'endpoint fonctionnel:

1. **Enrichissement** - Ajouter Google Books, AbeBooks, eBay APIs
2. **Cache** - Implémenter cache D1 pour réduire coûts
3. **Database** - Sauvegarder résultats dans collection_items
4. **Tests** - Ajouter unit/contract/E2E tests
5. **Auth** - Ajouter Bearer token auth
6. **Rate Limit** - Limiter à 10 req/min
7. **Metrics** - Logger dans Prometheus
8. **OpenAPI** - Mettre à jour spec

Voir `PHOTO_BOOKS_IMPLEMENTATION.md` pour les détails complets.

---

**Temps estimé total**: 2-3 heures pour un endpoint MVP fonctionnel.

**Support**: Consulter `PHOTO_BOOKS_IMPLEMENTATION.md` pour l'architecture complète et tous les skeletons de code.
