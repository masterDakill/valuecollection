typescript
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