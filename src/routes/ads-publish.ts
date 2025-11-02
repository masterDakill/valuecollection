/**
 * Ads Publishing Routes
 * Handles saving ads to DB and publishing to marketplaces (eBay, Facebook, etc.)
 */

import { Hono } from 'hono';
import { createLogger } from '../lib/logger';
import { EbayOAuthService } from '../services/ebay-oauth.service';

type Bindings = {
  DB: D1Database;
  EBAY_CLIENT_ID?: string;
  EBAY_CLIENT_SECRET?: string;
  EBAY_DEV_ID?: string;
  EBAY_ENVIRONMENT?: string;
  EBAY_RUNAME?: string;
};

export const adsPublishRouter = new Hono<{ Bindings: Bindings }>();

// Store tokens temporarily (in production, use D1 or KV storage)
const userTokens = new Map<string, { access_token: string; refresh_token: string; expires_at: number }>();

/**
 * GET /api/ads-publish/ebay/auth-url
 * Get eBay OAuth authorization URL
 */
adsPublishRouter.get('/ebay/auth-url', async (c) => {
  const logger = createLogger(crypto.randomUUID());
  
  try {
    const ebayService = new EbayOAuthService(
      c.env.EBAY_CLIENT_ID || '',
      c.env.EBAY_CLIENT_SECRET || '',
      c.env.EBAY_DEV_ID || '',
      (c.env.EBAY_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      c.req.query('redirect_uri') || c.env.EBAY_RUNAME
    );
    
    const authUrl = ebayService.getAuthorizationUrl();
    
    return c.json({
      success: true,
      authUrl,
      message: 'Redirect user to this URL to authorize access'
    });
    
  } catch (error: any) {
    logger.error('Failed to generate auth URL', { error: error.message });
    return c.json({
      success: false,
      error: { code: 'AUTH_URL_ERROR', message: error.message }
    }, 500);
  }
});

/**
 * POST /api/ads-publish/ebay/exchange-token
 * Exchange authorization code for access token
 */
adsPublishRouter.post('/ebay/exchange-token', async (c) => {
  const logger = createLogger(crypto.randomUUID());
  
  try {
    const { code } = await c.req.json();
    
    if (!code) {
      return c.json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Authorization code required' }
      }, 400);
    }
    
    const ebayService = new EbayOAuthService(
      c.env.EBAY_CLIENT_ID || '',
      c.env.EBAY_CLIENT_SECRET || '',
      c.env.EBAY_DEV_ID || '',
      (c.env.EBAY_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
    );
    
    const tokenData = await ebayService.exchangeCodeForToken(code);
    
    // Store token (in production, save to D1 or KV with user association)
    const userId = 'default'; // Replace with actual user ID in production
    userTokens.set(userId, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || '',
      expires_at: Date.now() + (tokenData.expires_in * 1000)
    });
    
    logger.info('Token exchanged successfully', { userId });
    
    return c.json({
      success: true,
      message: 'eBay access granted successfully',
      expiresIn: tokenData.expires_in
    });
    
  } catch (error: any) {
    logger.error('Token exchange failed', { error: error.message });
    return c.json({
      success: false,
      error: { code: 'TOKEN_EXCHANGE_ERROR', message: error.message }
    }, 500);
  }
});

/**
 * POST /api/ads-publish/ebay/set-user-token
 * Directly set a user token (from eBay Developer Portal)
 */
adsPublishRouter.post('/ebay/set-user-token', async (c) => {
  const logger = createLogger(crypto.randomUUID());
  
  try {
    const { token, expiresIn } = await c.req.json();
    
    if (!token) {
      return c.json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Token required' }
      }, 400);
    }
    
    // Store token (default expires in 2 hours = 7200 seconds)
    const userId = 'default';
    const expiresInMs = (expiresIn || 7200) * 1000;
    
    userTokens.set(userId, {
      access_token: token,
      refresh_token: '',
      expires_at: Date.now() + expiresInMs
    });
    
    logger.info('User token set manually', { userId, expiresInMs });
    
    return c.json({
      success: true,
      message: 'eBay User Token configured successfully',
      expiresAt: new Date(Date.now() + expiresInMs).toISOString()
    });
    
  } catch (error: any) {
    logger.error('Failed to set user token', { error: error.message });
    return c.json({
      success: false,
      error: { code: 'SET_TOKEN_ERROR', message: error.message }
    }, 500);
  }
});

/**
 * GET /api/ads-publish/ebay/token-status
 * Check if user has valid eBay token
 */
adsPublishRouter.get('/ebay/token-status', async (c) => {
  const userId = 'default'; // Replace with actual user ID
  const token = userTokens.get(userId);
  
  if (!token) {
    return c.json({
      success: true,
      hasToken: false,
      message: 'No eBay authorization found'
    });
  }
  
  const isExpired = Date.now() > token.expires_at;
  
  return c.json({
    success: true,
    hasToken: true,
    isExpired,
    expiresAt: new Date(token.expires_at).toISOString()
  });
});

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

    // Check if user has eBay token
    const userId = 'default'; // Replace with actual user ID
    const tokenData = userTokens.get(userId);
    
    let ebayListingId: string;
    let ebayListingUrl: string;
    let isRealListing = false;
    
    if (tokenData && Date.now() < tokenData.expires_at) {
      // Real eBay API publication
      try {
        const ebayService = new EbayOAuthService(
          c.env.EBAY_CLIENT_ID || '',
          c.env.EBAY_CLIENT_SECRET || '',
          c.env.EBAY_DEV_ID || '',
          (c.env.EBAY_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
        );
        
        // Generate unique SKU
        const sku = 'ITEM-' + ad.item_id + '-' + Date.now();
        
        // Prepare listing data
        const listingData = {
          sku,
          title: ad.title,
          description: ad.description,
          price: parseFloat(ad.price) || 0,
          quantity: 1,
          condition: ad.condition || 'USED_GOOD',
          categoryId: '267', // Books category - adjust as needed
          imageUrls: ad.primary_image_url ? [ad.primary_image_url] : [],
          location: {
            country: 'CA',
            postalCode: 'H1A1A1' // Default - should be configured per user
          }
        };
        
        const result = await ebayService.createAndPublishListing(tokenData.access_token, listingData);
        
        ebayListingId = result.listingId;
        ebayListingUrl = result.listingUrl;
        isRealListing = true;
        
        logger.info('Real eBay listing created', { adId, listingId: ebayListingId });
        
      } catch (ebayError: any) {
        logger.error('Real eBay publication failed, falling back to simulation', { error: ebayError.message });
        // Fall back to simulation
        ebayListingId = 'EBAY-SIMULATED-' + Date.now();
        ebayListingUrl = 'https://www.ebay.ca/itm/' + ebayListingId;
      }
    } else {
      // Simulate publication (no token or expired)
      ebayListingId = 'EBAY-SIMULATED-' + Date.now();
      ebayListingUrl = 'https://www.ebay.ca/itm/' + ebayListingId;
      logger.info('eBay publication simulated (no token)', { adId });
    }

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

    return c.json({
      success: true,
      ebayListingId,
      ebayListingUrl,
      isRealListing,
      message: isRealListing 
        ? 'Annonce publiée sur eBay avec succès !' 
        : 'Annonce sauvegardée (simulation - autorisez eBay pour publication réelle)',
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
