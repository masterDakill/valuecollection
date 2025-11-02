/**
 * Collections Router
 * Manages collection CRUD operations and collection items
 */

import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import { createLogger } from '../lib/logger';

type Bindings = {
  DB: D1Database;
};

export const collectionsRouter = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/collections
 * List all collections
 */
collectionsRouter.get('/', async (c) => {
  const logger = createLogger(crypto.randomUUID());
  
  try {
    const result = await c.env.DB.prepare(`
      SELECT 
        c.*,
        COUNT(DISTINCT ci.id) as items_count,
        COALESCE(SUM(ci.estimated_value), 0) as total_value
      FROM collections c
      LEFT JOIN collection_items ci ON c.id = ci.collection_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();

    logger.info('Collections retrieved', { count: result.results?.length || 0 });

    return c.json({
      success: true,
      collections: result.results || []
    });
  } catch (error: any) {
    logger.error('Failed to retrieve collections', { error: error.message });
    return c.json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message }
    }, 500);
  }
});

/**
 * GET /api/collections/:id
 * Get a specific collection with its items
 */
collectionsRouter.get('/:id', async (c) => {
  const logger = createLogger(crypto.randomUUID());
  const collectionId = c.req.param('id');

  try {
    // Get collection details
    const collectionResult = await c.env.DB.prepare(`
      SELECT * FROM collections WHERE id = ?
    `).bind(collectionId).first();

    if (!collectionResult) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Collection not found' }
      }, 404);
    }

    // Get collection items
    const itemsResult = await c.env.DB.prepare(`
      SELECT 
        ci.*,
        ap.url as source_photo_url,
        ap.analyzed_at as photo_date,
        ap.status as photo_status
      FROM collection_items ci
      LEFT JOIN analyzed_photos ap ON ci.photo_id = ap.id
      WHERE ci.collection_id = ?
      ORDER BY ci.created_at DESC
    `).bind(collectionId).all();

    // Calculate statistics
    const items = itemsResult.results || [];
    const stats = {
      total_items: items.length,
      total_value: items.reduce((sum: number, item: any) => sum + (item.estimated_value || 0), 0),
      categories: {} as Record<string, number>
    };

    items.forEach((item: any) => {
      const category = item.category || 'uncategorized';
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    });

    logger.info('Collection retrieved', { 
      collectionId, 
      itemsCount: items.length 
    });

    return c.json({
      success: true,
      collection: {
        ...collectionResult,
        items,
        stats
      }
    });
  } catch (error: any) {
    logger.error('Failed to retrieve collection', { 
      collectionId, 
      error: error.message 
    });
    return c.json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message }
    }, 500);
  }
});

/**
 * POST /api/collections
 * Create a new collection
 */
collectionsRouter.post('/', async (c) => {
  const logger = createLogger(crypto.randomUUID());

  try {
    const body = await c.req.json();
    const { name, description, owner_email } = body;

    if (!name) {
      return c.json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Collection name is required' }
      }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO collections (name, description, owner_email, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      name,
      description || null,
      owner_email || 'default@valuecollection.local'
    ).run();

    const newId = result.meta?.last_row_id;

    logger.info('Collection created', { collectionId: newId, name });

    // Fetch the created collection
    const created = await c.env.DB.prepare(`
      SELECT * FROM collections WHERE id = ?
    `).bind(newId).first();

    return c.json({
      success: true,
      collection: created
    }, 201);
  } catch (error: any) {
    logger.error('Failed to create collection', { error: error.message });
    return c.json({
      success: false,
      error: { code: 'CREATE_ERROR', message: error.message }
    }, 500);
  }
});

/**
 * PUT /api/collections/:id
 * Update a collection
 */
collectionsRouter.put('/:id', async (c) => {
  const logger = createLogger(crypto.randomUUID());
  const collectionId = c.req.param('id');

  try {
    const body = await c.req.json();
    const { name, description } = body;

    // Check if collection exists
    const existing = await c.env.DB.prepare(`
      SELECT id FROM collections WHERE id = ?
    `).bind(collectionId).first();

    if (!existing) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Collection not found' }
      }, 404);
    }

    await c.env.DB.prepare(`
      UPDATE collections
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      name || null,
      description || null,
      collectionId
    ).run();

    logger.info('Collection updated', { collectionId });

    // Fetch updated collection
    const updated = await c.env.DB.prepare(`
      SELECT * FROM collections WHERE id = ?
    `).bind(collectionId).first();

    return c.json({
      success: true,
      collection: updated
    });
  } catch (error: any) {
    logger.error('Failed to update collection', { 
      collectionId, 
      error: error.message 
    });
    return c.json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: error.message }
    }, 500);
  }
});

/**
 * DELETE /api/collections/:id
 * Delete a collection (with cascade to items)
 */
collectionsRouter.delete('/:id', async (c) => {
  const logger = createLogger(crypto.randomUUID());
  const collectionId = c.req.param('id');

  try {
    // Check if it's the default collection
    if (collectionId === '1') {
      return c.json({
        success: false,
        error: { 
          code: 'FORBIDDEN', 
          message: 'Cannot delete the default collection' 
        }
      }, 403);
    }

    // Check if collection exists
    const existing = await c.env.DB.prepare(`
      SELECT id FROM collections WHERE id = ?
    `).bind(collectionId).first();

    if (!existing) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Collection not found' }
      }, 404);
    }

    // Move items to default collection instead of deleting
    await c.env.DB.prepare(`
      UPDATE collection_items
      SET collection_id = 1
      WHERE collection_id = ?
    `).bind(collectionId).run();

    // Delete the collection
    await c.env.DB.prepare(`
      DELETE FROM collections WHERE id = ?
    `).bind(collectionId).run();

    logger.info('Collection deleted', { collectionId });

    return c.json({
      success: true,
      message: 'Collection deleted successfully'
    });
  } catch (error: any) {
    logger.error('Failed to delete collection', { 
      collectionId, 
      error: error.message 
    });
    return c.json({
      success: false,
      error: { code: 'DELETE_ERROR', message: error.message }
    }, 500);
  }
});

/**
 * POST /api/collections/:id/items
 * Add items to a collection
 */
collectionsRouter.post('/:id/items', async (c) => {
  const logger = createLogger(crypto.randomUUID());
  const collectionId = c.req.param('id');

  try {
    const body = await c.req.json();
    const { itemIds } = body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return c.json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Item IDs array is required' }
      }, 400);
    }

    // Check if collection exists
    const collection = await c.env.DB.prepare(`
      SELECT id FROM collections WHERE id = ?
    `).bind(collectionId).first();

    if (!collection) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Collection not found' }
      }, 404);
    }

    // Update items' collection_id
    const placeholders = itemIds.map(() => '?').join(',');
    await c.env.DB.prepare(`
      UPDATE collection_items
      SET collection_id = ?
      WHERE id IN (${placeholders})
    `).bind(collectionId, ...itemIds).run();

    logger.info('Items added to collection', { 
      collectionId, 
      itemCount: itemIds.length 
    });

    return c.json({
      success: true,
      message: `${itemIds.length} items added to collection`
    });
  } catch (error: any) {
    logger.error('Failed to add items to collection', { 
      collectionId, 
      error: error.message 
    });
    return c.json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: error.message }
    }, 500);
  }
});

/**
 * GET /api/collections/:id/stats
 * Get detailed statistics for a collection
 */
collectionsRouter.get('/:id/stats', async (c) => {
  const logger = createLogger(crypto.randomUUID());
  const collectionId = c.req.param('id');

  try {
    // Get collection
    const collection = await c.env.DB.prepare(`
      SELECT * FROM collections WHERE id = ?
    `).bind(collectionId).first();

    if (!collection) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Collection not found' }
      }, 404);
    }

    // Get comprehensive stats
    const statsResult = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_items,
        COUNT(CASE WHEN estimated_value > 0 THEN 1 END) as valued_items,
        COALESCE(SUM(estimated_value), 0) as total_value,
        COALESCE(AVG(estimated_value), 0) as avg_value,
        COALESCE(MIN(estimated_value), 0) as min_value,
        COALESCE(MAX(estimated_value), 0) as max_value,
        COUNT(DISTINCT category) as categories_count,
        COUNT(DISTINCT artist_author) as authors_count,
        COUNT(DISTINCT publisher_label) as publishers_count
      FROM collection_items
      WHERE collection_id = ?
    `).bind(collectionId).first();

    // Get category breakdown
    const categoriesResult = await c.env.DB.prepare(`
      SELECT 
        category,
        COUNT(*) as count,
        COALESCE(SUM(estimated_value), 0) as total_value
      FROM collection_items
      WHERE collection_id = ?
      GROUP BY category
      ORDER BY count DESC
    `).bind(collectionId).all();

    // Get top valued items
    const topItemsResult = await c.env.DB.prepare(`
      SELECT 
        id,
        title,
        artist_author,
        estimated_value,
        category
      FROM collection_items
      WHERE collection_id = ?
        AND estimated_value > 0
      ORDER BY estimated_value DESC
      LIMIT 10
    `).bind(collectionId).all();

    logger.info('Collection stats retrieved', { collectionId });

    return c.json({
      success: true,
      stats: {
        ...statsResult,
        categories: categoriesResult.results || [],
        top_items: topItemsResult.results || []
      }
    });
  } catch (error: any) {
    logger.error('Failed to retrieve collection stats', { 
      collectionId, 
      error: error.message 
    });
    return c.json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message }
    }, 500);
  }
});
