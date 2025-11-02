/**
 * Photo Storage Service
 * Handles storing analyzed photos and creating individual book/item entries
 */

import { createLogger } from '../lib/logger';

export interface AnalyzedPhoto {
  id?: number;
  image_url?: string;
  image_base64?: string;
  thumbnail_url?: string;
  image_hash?: string;
  original_filename?: string;
  file_size_bytes?: number;
  mime_type?: string;
  width_px?: number;
  height_px?: number;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  analysis_mode: 'vision' | 'smart' | 'advanced';
  total_items_detected: number;
  processing_time_ms?: number;
  ai_model_used?: string;
  user_notes?: string;
  collection_id?: number;
  uploaded_at?: string;
  analyzed_at?: string;
}

export interface DetectedItem {
  title?: string;
  artist_author?: string;
  publisher_label?: string;
  description?: string;
  category: string;
  subcategory?: string;
  year_made?: number;
  isbn?: string;
  isbn_13?: string;
  bbox?: [number, number, number, number]; // [x, y, width, height] normalized 0-1
  detection_confidence?: number;
  detection_index?: number;
  condition_grade?: string;
  estimated_value?: number;
  sources_used?: string[];
  raw_text?: string; // Original text from vision
}

export class PhotoStorageService {
  private db: D1Database;
  private logger: ReturnType<typeof createLogger>;

  constructor(db: D1Database, requestId?: string) {
    this.db = db;
    this.logger = createLogger(requestId || crypto.randomUUID());
  }

  /**
   * Store an analyzed photo and return the photo ID
   */
  async storePhoto(photo: AnalyzedPhoto): Promise<number> {
    try {
      this.logger.info('Storing analyzed photo', {
        hasUrl: !!photo.image_url,
        hasBase64: !!photo.image_base64,
        totalItems: photo.total_items_detected
      });

      const result = await this.db.prepare(`
        INSERT INTO analyzed_photos (
          image_url, image_base64, thumbnail_url, image_hash,
          original_filename, file_size_bytes, mime_type,
          width_px, height_px,
          analysis_status, analysis_mode, total_items_detected,
          processing_time_ms, ai_model_used,
          user_notes, collection_id,
          analyzed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        photo.image_url || null,
        photo.image_base64 || null,
        photo.thumbnail_url || null,
        photo.image_hash || null,
        photo.original_filename || null,
        photo.file_size_bytes || null,
        photo.mime_type || null,
        photo.width_px || null,
        photo.height_px || null,
        photo.analysis_status,
        photo.analysis_mode,
        photo.total_items_detected,
        photo.processing_time_ms || null,
        photo.ai_model_used || null,
        photo.user_notes || null,
        photo.collection_id || null
      ).run();

      const photoId = result.meta.last_row_id;
      this.logger.info('Photo stored successfully', { photoId });

      return photoId as number;

    } catch (error: any) {
      this.logger.error('Failed to store photo', error);

      // Handle SQLITE_TOOBIG specifically
      if (error.message?.includes('SQLITE_TOOBIG') || error.message?.includes('too big')) {
        throw new Error('Image trop volumineuse pour D1. Utilisez R2 object storage ou réduisez la taille de l\'image.');
      }

      throw new Error(`Failed to store photo: ${error.message}`);
    }
  }

  /**
   * Create individual collection items for detected books/objects
   */
  async storeDetectedItems(
    photoId: number,
    items: DetectedItem[],
    collectionId: number = 1
  ): Promise<number[]> {
    try {
      this.logger.info('Storing detected items', {
        photoId,
        itemCount: items.length
      });

      const itemIds: number[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        const result = await this.db.prepare(`
          INSERT INTO collection_items (
            collection_id, photo_id,
            title, artist_author, publisher_label, description,
            category, subcategory,
            year_made, isbn, isbn_13,
            bbox, detection_confidence, detection_index,
            condition_grade,
            estimated_value,
            processing_status, ai_analyzed,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).bind(
          collectionId,
          photoId,
          item.title || `Item ${i + 1}`,
          item.artist_author || null,
          item.publisher_label || null,
          item.description || item.raw_text || null,
          item.category,
          item.subcategory || null,
          item.year_made || null,
          item.isbn || null,
          item.isbn_13 || null,
          item.bbox ? JSON.stringify(item.bbox) : null,
          item.detection_confidence || null,
          item.detection_index !== undefined ? item.detection_index : i,
          item.condition_grade || null,
          item.estimated_value || 0,
          'completed',
          true
        ).run();

        const itemId = result.meta.last_row_id as number;
        itemIds.push(itemId);

        // If we have estimated value, create price evaluation
        if (item.estimated_value) {
          await this.storePriceEvaluation(
            itemId,
            item.estimated_value,
            item.sources_used
          );
        }
      }

      this.logger.info('Detected items stored successfully', {
        photoId,
        itemCount: itemIds.length
      });

      return itemIds;

    } catch (error: any) {
      this.logger.error('Failed to store detected items', error);
      throw new Error(`Failed to store detected items: ${error.message}`);
    }
  }

  /**
   * Store price evaluation for an item
   */
  private async storePriceEvaluation(
    itemId: number,
    estimatedValue: number,
    sources?: string[]
  ): Promise<void> {
    try {
      await this.db.prepare(`
        INSERT INTO price_evaluations (
          item_id, evaluation_source,
          estimated_value, currency,
          confidence_score,
          evaluation_date, is_active
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), TRUE)
      `).bind(
        itemId,
        sources?.[0] || 'ai_analysis',
        estimatedValue,
        'CAD',
        0.75
      ).run();
    } catch (error: any) {
      this.logger.error('Failed to store price evaluation', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Get all analyzed photos with stats
   */
  async getAllPhotos(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM photos_with_stats
        ORDER BY uploaded_at DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all();

      return result.results || [];
    } catch (error: any) {
      this.logger.error('Failed to get photos', error);
      return [];
    }
  }

  /**
   * Get photo details with all detected items
   */
  async getPhotoWithItems(photoId: number): Promise<{
    photo: AnalyzedPhoto | null;
    items: any[];
  }> {
    try {
      // Get photo
      const photoResult = await this.db.prepare(`
        SELECT * FROM analyzed_photos WHERE id = ?
      `).bind(photoId).first();

      if (!photoResult) {
        return { photo: null, items: [] };
      }

      // Get items
      const itemsResult = await this.db.prepare(`
        SELECT * FROM photo_items_detail WHERE photo_id = ?
        ORDER BY detection_index
      `).bind(photoId).all();

      return {
        photo: photoResult as any,
        items: itemsResult.results || []
      };

    } catch (error: any) {
      this.logger.error('Failed to get photo with items', error);
      return { photo: null, items: [] };
    }
  }

  /**
   * Update photo analysis status
   */
  async updatePhotoStatus(
    photoId: number,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    totalItemsDetected?: number
  ): Promise<void> {
    try {
      let query = `UPDATE analyzed_photos SET analysis_status = ?`;
      const params: any[] = [status];

      if (totalItemsDetected !== undefined) {
        query += `, total_items_detected = ?`;
        params.push(totalItemsDetected);
      }

      query += ` WHERE id = ?`;
      params.push(photoId);

      await this.db.prepare(query).bind(...params).run();

      this.logger.info('Photo status updated', { photoId, status });
    } catch (error: any) {
      this.logger.error('Failed to update photo status', error);
    }
  }

  /**
   * Generate simple hash for image deduplication
   */
  static generateImageHash(imageData: string): string {
    // Simple hash based on first/last characters and length
    // For production, use a proper image hash library
    const data = imageData.substring(0, 100) + imageData.substring(imageData.length - 100);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `${Math.abs(hash)}_${imageData.length}`;
  }

  /**
   * Check if photo already exists by hash
   */
  async findPhotoByHash(imageHash: string): Promise<number | null> {
    try {
      const result = await this.db.prepare(`
        SELECT id FROM analyzed_photos
        WHERE image_hash = ?
        ORDER BY uploaded_at DESC
        LIMIT 1
      `).bind(imageHash).first();

      return result ? (result.id as number) : null;
    } catch (error: any) {
      this.logger.error('Failed to find photo by hash', error);
      return null;
    }
  }
}

/**
 * Factory function to create PhotoStorageService
 */
export function createPhotoStorageService(db: D1Database, requestId?: string): PhotoStorageService {
  return new PhotoStorageService(db, requestId);
}
