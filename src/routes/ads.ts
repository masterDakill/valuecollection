/**
 * Ads Generation Routes
 * Handles marketplace listing generation from collection items
 */

import { Hono } from 'hono';
import { createLogger } from '../lib/logger';
import { createAdGeneratorService } from '../services/ad-generator.service';
import type { CollectionItem } from '../services/ad-generator.service';

type Bindings = {
  DB: D1Database;
};

export const adsRouter = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/ads/generate
 * Generate marketplace ads from selected items
 */
adsRouter.post('/generate', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const body = await c.req.json();
    const { itemIds, platform = 'eBay' } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'itemIds must be a non-empty array'
        }
      }, 400);
    }

    logger.info('Generating ads', { itemIds, platform, count: itemIds.length });

    const db = c.env.DB;

    // Fetch items from database
    const placeholders = itemIds.map(() => '?').join(',');
    const query = `
      SELECT
        id,
        title,
        artist_author,
        publisher_label,
        year,
        isbn,
        isbn_13,
        estimated_value,
        description,
        category,
        primary_image_url
      FROM collection_items
      WHERE id IN (${placeholders})
    `;

    const result = await db.prepare(query).bind(...itemIds).all();

    if (!result.results || result.results.length === 0) {
      return c.json({
        success: false,
        error: {
          code: 'NO_ITEMS_FOUND',
          message: 'No items found with the provided IDs'
        }
      }, 404);
    }

    // Generate ads
    const adGenerator = createAdGeneratorService();
    const ads = adGenerator.generateBatch(
      result.results as CollectionItem[],
      platform
    );

    logger.info('Ads generated successfully', { 
      count: ads.length,
      platform 
    });

    return c.json({
      success: true,
      ads,
      count: ads.length,
      platform,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to generate ads', { error: error.message });

    return c.json({
      success: false,
      error: {
        code: 'AD_GENERATION_ERROR',
        message: error.message || 'Failed to generate ads'
      }
    }, 500);
  }
});

/**
 * POST /api/ads/generate-all
 * Generate ads for all items in collection
 */
adsRouter.post('/generate-all', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const body = await c.req.json();
    const { platform = 'eBay', limit = 50 } = body;

    logger.info('Generating ads for all items', { platform, limit });

    const db = c.env.DB;

    // Fetch all items
    const query = `
      SELECT
        id,
        title,
        artist_author,
        publisher_label,
        year,
        isbn,
        isbn_13,
        estimated_value,
        description,
        category,
        primary_image_url
      FROM collection_items
      WHERE category = 'books'
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const result = await db.prepare(query).bind(limit).all();

    if (!result.results || result.results.length === 0) {
      return c.json({
        success: false,
        error: {
          code: 'NO_ITEMS_FOUND',
          message: 'No items found in collection'
        }
      }, 404);
    }

    // Generate ads
    const adGenerator = createAdGeneratorService();
    const ads = adGenerator.generateBatch(
      result.results as CollectionItem[],
      platform
    );

    logger.info('Batch ads generated', { count: ads.length });

    return c.json({
      success: true,
      ads,
      count: ads.length,
      platform,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to generate batch ads', { error: error.message });

    return c.json({
      success: false,
      error: {
        code: 'BATCH_AD_GENERATION_ERROR',
        message: error.message
      }
    }, 500);
  }
});

/**
 * GET /api/ads/export
 * Export generated ads as CSV/TXT
 */
adsRouter.get('/export', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const format = c.req.query('format') || 'txt';
    const itemIds = c.req.query('itemIds')?.split(',').map(id => parseInt(id)) || [];

    if (itemIds.length === 0) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'itemIds query parameter required'
        }
      }, 400);
    }

    logger.info('Exporting ads', { format, itemIds });

    const db = c.env.DB;

    // Fetch items
    const placeholders = itemIds.map(() => '?').join(',');
    const query = `
      SELECT
        id, title, artist_author, publisher_label, year,
        isbn_13, estimated_value, description
      FROM collection_items
      WHERE id IN (${placeholders})
    `;

    const result = await db.prepare(query).bind(...itemIds).all();

    if (!result.results || result.results.length === 0) {
      return c.json({
        success: false,
        error: { code: 'NO_ITEMS_FOUND', message: 'No items found' }
      }, 404);
    }

    // Generate ads
    const adGenerator = createAdGeneratorService();
    const ads = adGenerator.generateBatch(result.results as CollectionItem[]);

    // Format export
    let content: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      content = this.formatCSV(ads);
      contentType = 'text/csv';
      filename = `ads-export-${Date.now()}.csv`;
    } else {
      content = this.formatTXT(ads);
      contentType = 'text/plain';
      filename = `ads-export-${Date.now()}.txt`;
    }

    return new Response(content, {
      headers: {
        'Content-Type': `${contentType}; charset=utf-8`,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: any) {
    logger.error('Failed to export ads', { error: error.message });

    return c.json({
      success: false,
      error: { code: 'EXPORT_ERROR', message: error.message }
    }, 500);
  }
});

/**
 * Helper: Format ads as CSV
 */
function formatCSV(ads: any[]): string {
  const headers = ['ID', 'Titre', 'Prix', 'État', 'Plateforme'];
  const rows = ads.map(ad => [
    ad.itemId,
    `"${ad.title.replace(/"/g, '""')}"`,
    ad.price,
    ad.condition,
    ad.platform
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

/**
 * Helper: Format ads as TXT
 */
function formatTXT(ads: any[]): string {
  return ads.map((ad, index) => {
    return [
      `========================================`,
      `ANNONCE #${index + 1}`,
      `========================================`,
      ``,
      `Titre: ${ad.title}`,
      `Prix: ${ad.price}`,
      ``,
      `Description:`,
      ad.description,
      ``,
      `Mots-clés: ${ad.keywords.join(', ')}`,
      ``,
      ``
    ].join('\n');
  }).join('\n\n');
}

export default adsRouter;
