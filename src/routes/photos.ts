/**
 * Photo Analysis Routes
 * Handles photo upload, multi-book detection, and storage
 */

import { Hono } from 'hono';
import { createLogger } from '../lib/logger';
import { createVisionMultiSpineService } from '../services/vision-multi-spine.service';
import { createPhotoStorageService, PhotoStorageService } from '../services/photo-storage.service';
import type { DetectedItem } from '../services/photo-storage.service';

type Bindings = {
  DB: D1Database;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY?: string;
};

export const photosRouter = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/photos/analyze
 * Analyze a photo, detect multiple books, and store everything
 */
photosRouter.post('/analyze', async (c) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const body = await c.req.json();
    const { imageUrl, imageBase64, options = {} } = body;

    if (!imageUrl && !imageBase64) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Either imageUrl or imageBase64 is required'
        }
      }, 400);
    }

    logger.info('Photo analysis started', {
      hasUrl: !!imageUrl,
      hasBase64: !!imageBase64,
      maxItems: options.maxItems
    });

    // Initialize services
    const photoStorage = createPhotoStorageService(c.env.DB, requestId);
    const visionService = createVisionMultiSpineService(c.env.OPENAI_API_KEY);

    // Generate image hash for deduplication
    const imageData = imageBase64 || imageUrl;
    const imageHash = PhotoStorageService.generateImageHash(imageData);

    // Check if photo already analyzed
    const existingPhotoId = await photoStorage.findPhotoByHash(imageHash);
    if (existingPhotoId && options.useCache !== false) {
      logger.info('Photo already analyzed, returning cached result', { photoId: existingPhotoId });

      const cached = await photoStorage.getPhotoWithItems(existingPhotoId);
      return c.json({
        success: true,
        photo_id: existingPhotoId,
        items: cached.items,
        total_detected: cached.items.length,
        cached: true,
        processing_time_ms: Date.now() - startTime,
        request_id: requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Validation: Check base64 size (limit to prevent SQLITE_TOOBIG)
    if (imageBase64) {
      const estimatedBytes = (imageBase64.length * 3) / 4; // rough estimate of decoded size
      const maxBytes = 1 * 1024 * 1024; // 1 MB limit for safety

      if (estimatedBytes > maxBytes) {
        logger.error('Image too large for processing', { estimatedBytes, maxBytes });
        return c.json({
          success: false,
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: `Image trop volumineuse (${Math.round(estimatedBytes / 1024 / 1024)} MB). Maximum: ${Math.round(maxBytes / 1024 / 1024)} MB. Utilisez une URL ou compressez l'image.`
          }
        }, 413);
      }
    }

    // Store photo record (initially as pending)
    // IMPORTANT: Never store image_base64 in D1 to prevent SQLITE_TOOBIG
    const photoId = await photoStorage.storePhoto({
      image_url: imageUrl || undefined,
      image_base64: undefined, // Never store base64 in D1
      image_hash: imageHash,
      analysis_status: 'processing',
      analysis_mode: 'vision',
      total_items_detected: 0,
      ai_model_used: 'gpt-4o',
      collection_id: options.collectionId || 1
    });

    logger.info('Photo stored', { photoId });

    try {
      // Step 1: Detect multiple spines using Vision API
      const spines = await visionService.detectMultipleSpines(
        imageUrl || null,
        imageBase64 || null,
        {
          maxItems: options.maxItems || 30,
          deskew: options.deskew !== false,
          cropStrategy: options.cropStrategy || 'auto'
        }
      );

      logger.info('Spines detected', { count: spines.length });

      // Step 2: Convert spines to DetectedItems
      const detectedItems: DetectedItem[] = spines.map((spine, index) => {
        // Parse rawText to extract basic info
        const rawText = spine.rawText || '';

        // Simple parsing (in production, use NER service)
        const lines = rawText.split(/[\n\r]+/).map(l => l.trim()).filter(l => l);
        const title = lines[0] || `Book ${index + 1}`;
        const author = lines.length > 1 ? lines[1] : undefined;

        return {
          title,
          artist_author: author,
          description: rawText,
          category: 'books',
          bbox: spine.bbox,
          detection_confidence: spine.confidence,
          detection_index: index,
          raw_text: rawText
        };
      });

      // Step 3: Store all detected items
      const itemIds = await photoStorage.storeDetectedItems(
        photoId,
        detectedItems,
        options.collectionId || 1
      );

      logger.info('Items stored', { count: itemIds.length });

      // Step 4: Update photo status
      await photoStorage.updatePhotoStatus(photoId, 'completed', detectedItems.length);

      // Step 5: Get full photo with items for response
      const result = await photoStorage.getPhotoWithItems(photoId);

      const processingTime = Date.now() - startTime;

      logger.info('Photo analysis completed', {
        photoId,
        itemsDetected: detectedItems.length,
        processingTime
      });

      return c.json({
        success: true,
        photo_id: photoId,
        items: result.items,
        total_detected: detectedItems.length,
        cached: false,
        processing_time_ms: processingTime,
        request_id: requestId,
        timestamp: new Date().toISOString()
      });

    } catch (analysisError: any) {
      // Update photo status to failed
      await photoStorage.updatePhotoStatus(photoId, 'failed', 0);
      throw analysisError;
    }

  } catch (error: any) {
    logger.error('Photo analysis failed', error);

    return c.json({
      success: false,
      error: {
        code: 'ANALYSIS_FAILED',
        message: error.message || 'Photo analysis failed',
        request_id: requestId
      },
      timestamp: new Date().toISOString()
    }, 500);
  }
});

/**
 * GET /api/photos
 * Get all analyzed photos with stats
 */
photosRouter.get('/', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const photoStorage = createPhotoStorageService(c.env.DB, requestId);
    const photos = await photoStorage.getAllPhotos(limit, offset);

    return c.json({
      success: true,
      photos,
      count: photos.length,
      limit,
      offset,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to get photos', error);

    return c.json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to retrieve photos',
        request_id: requestId
      },
      timestamp: new Date().toISOString()
    }, 500);
  }
});

/**
 * GET /api/photos/:id
 * Get single photo with all detected items
 */
photosRouter.get('/:id', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const photoId = parseInt(c.req.param('id'));

    if (isNaN(photoId)) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid photo ID'
        }
      }, 400);
    }

    const photoStorage = createPhotoStorageService(c.env.DB, requestId);
    const result = await photoStorage.getPhotoWithItems(photoId);

    if (!result.photo) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Photo not found'
        }
      }, 404);
    }

    return c.json({
      success: true,
      photo: result.photo,
      items: result.items,
      total_items: result.items.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to get photo', error);

    return c.json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to retrieve photo',
        request_id: requestId
      },
      timestamp: new Date().toISOString()
    }, 500);
  }
});

/**
 * DELETE /api/photos/:id
 * Delete a photo and all associated items
 */
photosRouter.delete('/:id', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const photoId = parseInt(c.req.param('id'));

    if (isNaN(photoId)) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid photo ID'
        }
      }, 400);
    }

    // Delete photo (cascade will delete items)
    await c.env.DB.prepare(`
      DELETE FROM analyzed_photos WHERE id = ?
    `).bind(photoId).run();

    logger.info('Photo deleted', { photoId });

    return c.json({
      success: true,
      message: 'Photo and associated items deleted',
      photo_id: photoId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to delete photo', error);

    return c.json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete photo',
        request_id: requestId
      },
      timestamp: new Date().toISOString()
    }, 500);
  }
});
