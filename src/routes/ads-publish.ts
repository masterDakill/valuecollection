/**
 * Ads Publishing Routes
 * Handles saving ads to DB and publishing to marketplaces (eBay, Facebook, etc.)
 */

import { Hono } from 'hono';
import { createLogger } from '../lib/logger';

type Bindings = {
  DB: D1Database;
  EBAY_CLIENT_ID?: string;
  EBAY_CLIENT_SECRET?: string;
};

export const adsPublishRouter = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/ads-publish/save
 * Save ad to database (local storage)
 */
adsPublishRouter.post('/save', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const body = await c.req.json();
    const { 
      itemId, 
      title, 
      description, 
      price, 
      platforms = [], // ['ebay', 'facebook', etc.]
      condition 
    } = body;

    if (!itemId || !title || !description) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'itemId, title et description sont requis'
        }
      }, 400);
    }

    logger.info('Saving ad', { itemId, platforms, title });

    const db = c.env.DB;
    const savedAds = [];

    // Sauvegarder une annonce par plateforme sélectionnée
    for (const platform of platforms) {
      const result = await db.prepare(`
        INSERT INTO ads_created (
          item_id, title, description, price, condition, platform, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'draft')
      `).bind(
        itemId,
        title,
        description,
        price || 0,
        condition || 'Bon état',
        platform
      ).run();

      const adId = result.meta.last_row_id as number;
      savedAds.push({ id: adId, platform });
    }

    logger.info('Ads saved successfully', { count: savedAds.length });

    return c.json({
      success: true,
      ads: savedAds,
      message: `${savedAds.length} annonce(s) sauvegardée(s)`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to save ads', { error: error.message });

    return c.json({
      success: false,
      error: {
        code: 'SAVE_ERROR',
        message: error.message
      }
    }, 500);
  }
});

/**
 * POST /api/ads-publish/publish-ebay
 * Publish ad to eBay marketplace
 */
adsPublishRouter.post('/publish-ebay', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const body = await c.req.json();
    const { adId } = body;

    if (!adId) {
      return c.json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'adId requis' }
      }, 400);
    }

    logger.info('Publishing to eBay', { adId });

    const db = c.env.DB;

    // Récupérer l'annonce
    const ad = await db.prepare(`
      SELECT a.*, i.primary_image_url, i.category
      FROM ads_created a
      JOIN collection_items i ON a.item_id = i.id
      WHERE a.id = ?
    `).bind(adId).first();

    if (!ad) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Annonce non trouvée' }
      }, 404);
    }

    // TODO: Implémenter l'API eBay réelle
    // Pour l'instant, simuler la publication
    const ebayListingId = `EBAY-${Date.now()}`;
    const ebayListingUrl = `https://www.ebay.ca/itm/${ebayListingId}`;

    // Mettre à jour le statut
    await db.prepare(`
      UPDATE ads_created 
      SET 
        status = 'published',
        ebay_listing_id = ?,
        ebay_listing_url = ?,
        published_at = datetime('now')
      WHERE id = ?
    `).bind(ebayListingId, ebayListingUrl, adId).run();

    logger.info('eBay publication simulated', { adId, ebayListingId });

    return c.json({
      success: true,
      ebayListingId,
      ebayListingUrl,
      message: 'Annonce publiée sur eBay (simulation)',
      note: 'Configuration API eBay requise pour publication réelle',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('eBay publication failed', { error: error.message });

    return c.json({
      success: false,
      error: {
        code: 'EBAY_PUBLISH_ERROR',
        message: error.message
      }
    }, 500);
  }
});

/**
 * GET /api/ads-publish/list
 * List all created ads
 */
adsPublishRouter.get('/list', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const db = c.env.DB;
    const status = c.req.query('status'); // 'draft', 'published', 'all'
    const platform = c.req.query('platform');

    let query = `
      SELECT 
        a.*,
        i.title as item_title,
        i.artist_author,
        i.estimated_value,
        i.primary_image_url
      FROM ads_created a
      JOIN collection_items i ON a.item_id = i.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status && status !== 'all') {
      query += ' AND a.status = ?';
      params.push(status);
    }

    if (platform) {
      query += ' AND a.platform = ?';
      params.push(platform);
    }

    query += ' ORDER BY a.created_at DESC LIMIT 50';

    const result = await db.prepare(query).bind(...params).all();

    logger.info('Ads listed', { count: result.results.length });

    return c.json({
      success: true,
      ads: result.results,
      count: result.results.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to list ads', { error: error.message });

    return c.json({
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: error.message
      }
    }, 500);
  }
});

/**
 * DELETE /api/ads-publish/:id
 * Delete an ad
 */
adsPublishRouter.delete('/:id', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const adId = c.req.param('id');
    const db = c.env.DB;

    await db.prepare('DELETE FROM ads_created WHERE id = ?').bind(adId).run();

    logger.info('Ad deleted', { adId });

    return c.json({
      success: true,
      message: 'Annonce supprimée',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to delete ad', { error: error.message });

    return c.json({
      success: false,
      error: { code: 'DELETE_ERROR', message: error.message }
    }, 500);
  }
});

export default adsPublishRouter;
