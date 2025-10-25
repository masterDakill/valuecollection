/**
 * Items/Books Routes
 * Handles book listing and enrichment
 */

import { Hono } from 'hono';
import { createLogger } from '../lib/logger';
import { createBookEnrichmentService } from '../services/book-enrichment.service';

type Bindings = {
  DB: D1Database;
  GOOGLE_BOOKS_API_KEY?: string;
};

export const itemsRouter = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/items
 * Get all detected books/items with their photos
 */
itemsRouter.get('/', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const db = c.env.DB;

    // Get all items with photo info
    const query = `
      SELECT
        i.id,
        i.title,
        i.category,
        i.description,
        i.artist_author,
        i.publisher_label,
        i.year,
        i.isbn,
        i.isbn_13,
        i.estimated_value,
        i.bbox,
        i.detection_confidence,
        i.detection_index,
        i.primary_image_url,
        i.photo_id,
        i.created_at,
        p.image_url as source_photo_url,
        p.uploaded_at as photo_date,
        p.analysis_status as photo_status
      FROM collection_items i
      LEFT JOIN analyzed_photos p ON i.photo_id = p.id
      WHERE i.category = 'books'
      ORDER BY i.photo_id DESC, i.detection_index ASC
    `;

    const result = await db.prepare(query).all();

    logger.info('Items retrieved', { count: result.results?.length || 0 });

    return c.json({
      success: true,
      items: result.results || [],
      count: result.results?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to fetch items', { error: error.message });

    return c.json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: error.message
      }
    }, 500);
  }
});

/**
 * POST /api/items/:id/enrich
 * Enrich a book with data from Google Books / Open Library
 */
itemsRouter.post('/:id/enrich', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const itemId = c.req.param('id');
    const db = c.env.DB;

    logger.info('Enriching item', { itemId });

    // Get the item from database
    const item = await db.prepare(`
      SELECT * FROM collection_items WHERE id = ?
    `).bind(itemId).first();

    if (!item) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Item ${itemId} not found`
        }
      }, 404);
    }

    // Initialize enrichment service
    const googleBooksKey = c.env.GOOGLE_BOOKS_API_KEY || '';
    const enrichmentService = createBookEnrichmentService(googleBooksKey);

    // Search for book data
    const enrichedData = await enrichmentService.enrichBook(
      item.title as string,
      item.artist_author as string | undefined
    );

    if (!enrichedData) {
      return c.json({
        success: false,
        error: {
          code: 'NO_RESULTS',
          message: 'No enrichment data found for this book'
        }
      }, 404);
    }

    // Update the item with enriched data
    await db.prepare(`
      UPDATE collection_items
      SET
        artist_author = COALESCE(artist_author, ?),
        publisher_label = COALESCE(publisher_label, ?),
        year = COALESCE(year, ?),
        isbn = COALESCE(isbn, ?),
        isbn_13 = COALESCE(isbn_13, ?),
        primary_image_url = COALESCE(primary_image_url, ?)
      WHERE id = ?
    `).bind(
      enrichedData.authors?.join(', '),
      enrichedData.publisher,
      enrichedData.publishedDate?.substring(0, 4), // Extract year
      enrichedData.isbn10,
      enrichedData.isbn13,
      enrichedData.imageUrl,
      itemId
    ).run();

    // Get updated item
    const updatedItem = await db.prepare(`
      SELECT * FROM collection_items WHERE id = ?
    `).bind(itemId).first();

    logger.info('Item enriched successfully', {
      itemId,
      source: enrichedData.source,
      confidence: enrichedData.confidence
    });

    return c.json({
      success: true,
      item: updatedItem,
      enrichment: {
        source: enrichedData.source,
        confidence: enrichedData.confidence,
        found_data: {
          authors: enrichedData.authors,
          publisher: enrichedData.publisher,
          year: enrichedData.publishedDate,
          isbn10: enrichedData.isbn10,
          isbn13: enrichedData.isbn13,
          description: enrichedData.description,
          image: enrichedData.imageUrl,
          categories: enrichedData.categories
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Enrichment failed', { error: error.message });

    return c.json({
      success: false,
      error: {
        code: 'ENRICHMENT_ERROR',
        message: error.message
      }
    }, 500);
  }
});

/**
 * POST /api/items/enrich-all
 * Enrich all items that don't have full data
 */
itemsRouter.post('/enrich-all', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const db = c.env.DB;

    // Get items that need enrichment (missing author or publisher)
    const items = await db.prepare(`
      SELECT id, title, artist_author
      FROM collection_items
      WHERE category = 'books'
        AND (artist_author IS NULL OR publisher_label IS NULL OR isbn_13 IS NULL)
      ORDER BY photo_id DESC
      LIMIT 20
    `).all();

    if (!items.results || items.results.length === 0) {
      return c.json({
        success: true,
        message: 'All items are already enriched',
        processed: 0
      });
    }

    logger.info('Starting batch enrichment', { itemCount: items.results.length });

    const googleBooksKey = c.env.GOOGLE_BOOKS_API_KEY || '';
    const enrichmentService = createBookEnrichmentService(googleBooksKey);

    let enriched = 0;
    let failed = 0;

    for (const item of items.results) {
      try {
        const enrichedData = await enrichmentService.enrichBook(
          item.title as string,
          item.artist_author as string | undefined
        );

        if (enrichedData) {
          await db.prepare(`
            UPDATE collection_items
            SET
              artist_author = COALESCE(artist_author, ?),
              publisher_label = COALESCE(publisher_label, ?),
              year = COALESCE(year, ?),
              isbn = COALESCE(isbn, ?),
              isbn_13 = COALESCE(isbn_13, ?),
              primary_image_url = COALESCE(primary_image_url, ?)
            WHERE id = ?
          `).bind(
            enrichedData.authors?.join(', '),
            enrichedData.publisher,
            enrichedData.publishedDate?.substring(0, 4),
            enrichedData.isbn10,
            enrichedData.isbn13,
            enrichedData.imageUrl,
            item.id
          ).run();

          enriched++;
          logger.info('Item enriched', { itemId: item.id, title: item.title });
        } else {
          failed++;
        }

        // Rate limiting: wait 200ms between requests
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error: any) {
        logger.warn('Failed to enrich item', { itemId: item.id, error: error.message });
        failed++;
      }
    }

    return c.json({
      success: true,
      processed: enriched,
      failed,
      total: items.results.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Batch enrichment failed', { error: error.message });

    return c.json({
      success: false,
      error: {
        code: 'BATCH_ENRICHMENT_ERROR',
        message: error.message
      }
    }, 500);
  }
});
