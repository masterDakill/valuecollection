/**
 * Items/Books Routes
 * Handles book listing and enrichment
 */

import { Hono } from 'hono';
import { createLogger } from '../lib/logger';
import { createBookEnrichmentService } from '../services/book-enrichment.service';
import { createPriceAggregatorService } from '../services/price-aggregator.service';
import { createRarityAnalyzerService } from '../services/rarity-analyzer.service';
import { createEditionComparatorService } from '../services/edition-comparator.service';

type Bindings = {
  DB: D1Database;
  GOOGLE_BOOKS_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  EBAY_CLIENT_ID?: string;
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

    // Update the item with enriched data (convert undefined to null for D1)
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
      enrichedData.authors?.join(', ') || null,
      enrichedData.publisher || null,
      enrichedData.publishedDate?.substring(0, 4) || null, // Extract year
      enrichedData.isbn10 || null,
      enrichedData.isbn13 || null,
      enrichedData.imageUrl || null,
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
            enrichedData.authors?.join(', ') || null,
            enrichedData.publisher || null,
            enrichedData.publishedDate?.substring(0, 4) || null,
            enrichedData.isbn10 || null,
            enrichedData.isbn13 || null,
            enrichedData.imageUrl || null,
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

/**
 * POST /api/items/:id/evaluate
 * Évaluation complète: prix multi-sources + analyse IA + comparaison éditions
 */
itemsRouter.post('/:id/evaluate', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const itemId = c.req.param('id');
    const db = c.env.DB;

    logger.info('Starting complete evaluation', { itemId });

    // Get book from database
    const book = await db.prepare(`
      SELECT * FROM collection_items WHERE id = ?
    `).bind(itemId).first();

    if (!book) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Book ${itemId} not found`
        }
      }, 404);
    }

    // Vérifier qu'on a les données minimales
    if (!book.title) {
      return c.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_DATA',
          message: 'Book title is required for evaluation'
        }
      }, 400);
    }

    // 1. Prix multi-sources (Gemini en priorité!)
    logger.info('Fetching prices from multiple sources');
    const priceService = createPriceAggregatorService(
      c.env.EBAY_CLIENT_ID,
      c.env.GEMINI_API_KEY  // Passer Gemini pour recherche Google
    );
    const prices = await priceService.aggregatePrices(
      book.isbn_13 as string || '',
      book.title as string,
      book.artist_author as string | undefined
    );

    // 2. Analyse rareté IA avec rotation automatique entre LLMs
    logger.info('Analyzing rarity with AI');
    const rarityService = createRarityAnalyzerService(
      c.env.OPENAI_API_KEY,
      c.env.ANTHROPIC_API_KEY,
      c.env.GEMINI_API_KEY
    );

    const rarity = await rarityService.analyzeRarity(
      {
        title: book.title as string,
        author: book.artist_author as string | undefined,
        publisher: book.publisher_label as string | undefined,
        year: book.year as number | undefined,
        isbn13: book.isbn_13 as string | undefined
      },
      {
        totalListings: prices?.count || 0,
        avgPrice: prices?.average || 0,
        minPrice: prices?.min || 0,
        maxPrice: prices?.max || 0,
        recentSales: 15, // Simulé pour l'instant
        pricesByCondition: prices?.byCondition || {}
      }
    );

    // 3. Comparaison éditions
    logger.info('Comparing editions');
    const editionService = createEditionComparatorService(c.env.GOOGLE_BOOKS_API_KEY || '');
    const editions = await editionService.compareEditions(
      book.title as string,
      book.artist_author as string | undefined
    );

    // 4. Mettre à jour estimated_value dans la DB
    await db.prepare(`
      UPDATE collection_items
      SET estimated_value = ?
      WHERE id = ?
    `).bind(rarity.estimatedValue, itemId).run();

    logger.info('Complete evaluation finished', {
      itemId,
      rarityScore: rarity.rarityScore,
      estimatedValue: rarity.estimatedValue,
      editionsFound: editions.totalEditionsFound
    });

    return c.json({
      success: true,
      evaluation: {
        prices,
        rarity,
        editions
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Complete evaluation failed', { error: error.message });

    return c.json({
      success: false,
      error: {
        code: 'EVALUATION_ERROR',
        message: error.message
      }
    }, 500);
  }
});
