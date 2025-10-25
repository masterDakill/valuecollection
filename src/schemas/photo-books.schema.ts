/**
 * Zod Schemas for Photo Books Extract API
 * Endpoint: POST /api/photo-books-extract
 */

import { z } from 'zod';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const ImageStackOptionsSchema = z.object({
  maxItems: z.number().int().min(1).max(40).default(30)
    .describe('Maximum number of book spines to detect (recommended: 12-20 for high precision)'),
  deskew: z.boolean().default(true)
    .describe('Apply deskew correction to straighten tilted images'),
  cropStrategy: z.enum(['auto', 'grid', 'none']).default('auto')
    .describe('Strategy for detecting individual book spines'),
  useCache: z.boolean().default(true)
    .describe('Use API cache for faster responses and cost savings'),
  confidenceThreshold: z.number().min(0).max(1).default(0.5)
    .describe('Minimum confidence score to include a detected book (0-1)'),
  deduplicationThreshold: z.number().min(0).max(1).default(0.85)
    .describe('Levenshtein similarity threshold for duplicate detection (0-1)')
}).default({});

export const ImageStackInputSchema = z.object({
  imageUrl: z.string().url().optional()
    .describe('URL of the image containing book spines'),
  imageBase64: z.string().regex(/^data:image\/(jpeg|jpg|png|webp);base64,/).optional()
    .describe('Base64-encoded image data (data:image/jpeg;base64,...)'),
  options: ImageStackOptionsSchema
}).refine(
  data => data.imageUrl || data.imageBase64,
  { message: 'Either imageUrl or imageBase64 must be provided' }
);

// ============================================================================
// OUTPUT SCHEMAS
// ============================================================================

export const DetectedBookSchema = z.object({
  // Core metadata
  title: z.string().optional()
    .describe('Book title extracted from spine'),
  artist_author: z.string().optional()
    .describe('Author or artist name'),
  publisher_label: z.string().optional()
    .describe('Publisher or record label'),
  year: z.number().int().optional()
    .describe('Publication year'),
  language: z.string().optional()
    .describe('Detected language (ISO 639-1 code)'),

  // Classification
  category: z.enum([
    'artbook',
    'cinema',
    'reference',
    'biography',
    'interviews',
    'music',
    'books',
    'unknown'
  ]).default('unknown')
    .describe('Detected category'),
  format: z.enum(['hardcover', 'paperback', 'unknown']).default('unknown')
    .describe('Physical format'),

  // Identifiers
  isbn_10: z.string().optional()
    .describe('ISBN-10 identifier'),
  isbn_13: z.string().optional()
    .describe('ISBN-13 identifier'),

  // Publishing details
  edition_details: z.string().optional()
    .describe('Edition information (first, limited, deluxe, reprint, etc.)'),
  rarity_score: z.number().min(0).max(100).optional()
    .describe('Rarity score 0-100 (higher = rarer)'),
  market_trend: z.enum(['up', 'stable', 'down']).optional()
    .describe('Current market trend'),

  // Pricing
  estimated_value_min: z.number().optional()
    .describe('Minimum estimated value in CAD'),
  estimated_value_median: z.number().optional()
    .describe('Median estimated value in CAD'),
  estimated_value_max: z.number().optional()
    .describe('Maximum estimated value in CAD'),

  // Metadata
  sources_used: z.array(z.string()).optional()
    .describe('APIs used for enrichment (google_books, abebooks, ebay, etc.)'),
  confidence: z.number().min(0).max(1)
    .describe('Overall confidence score for this detection (0-1)'),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional()
    .describe('Bounding box [x, y, width, height] normalized to 0-1'),
  notes: z.string().optional()
    .describe('Additional notes or warnings')
});

export const ImageStackResponseSchema = z.object({
  success: z.boolean(),
  requestId: z.string().uuid()
    .describe('Unique request identifier for tracking'),
  items: z.array(DetectedBookSchema)
    .describe('Detected books from the image'),
  cached: z.boolean()
    .describe('Whether this response was served from cache'),
  cache_key: z.string().optional()
    .describe('Cache key used (for debugging)'),
  latencyMs: z.number()
    .describe('Total processing time in milliseconds'),
  breakdown: z.object({
    vision_ms: z.number().optional(),
    ner_ms: z.number().optional(),
    enrichment_ms: z.number().optional(),
    deduplication_ms: z.number().optional(),
    db_write_ms: z.number().optional()
  }).optional()
    .describe('Performance breakdown by stage'),
  warnings: z.array(z.string()).optional()
    .describe('Non-fatal warnings during processing'),
  timestamp: z.string().datetime()
    .describe('ISO 8601 timestamp')
});

// ============================================================================
// ERROR SCHEMAS
// ============================================================================

export const PhotoBooksErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum([
      'INVALID_INPUT',
      'IMAGE_TOO_LARGE',
      'INVALID_IMAGE_FORMAT',
      'VISION_API_ERROR',
      'NER_API_ERROR',
      'ENRICHMENT_ERROR',
      'DATABASE_ERROR',
      'TIMEOUT',
      'RATE_LIMIT_EXCEEDED',
      'INTERNAL_ERROR'
    ]),
    message: z.string(),
    details: z.any().optional(),
    request_id: z.string().uuid()
  }),
  timestamp: z.string().datetime()
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ImageStackOptions = z.infer<typeof ImageStackOptionsSchema>;
export type ImageStackInput = z.infer<typeof ImageStackInputSchema>;
export type DetectedBook = z.infer<typeof DetectedBookSchema>;
export type ImageStackResponse = z.infer<typeof ImageStackResponseSchema>;
export type PhotoBooksError = z.infer<typeof PhotoBooksErrorSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate image size (max 10MB)
 */
export function validateImageSize(imageData: string): boolean {
  if (!imageData.startsWith('data:image/')) return true; // URL, can't check size

  // Remove data URI prefix
  const base64Data = imageData.split(',')[1];
  const sizeInBytes = (base64Data.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);

  return sizeInMB <= 10;
}

/**
 * Validate image MIME type
 */
export function validateImageMimeType(imageData: string): boolean {
  if (!imageData.startsWith('data:image/')) return true; // Assume URL is valid

  const mimeMatch = imageData.match(/^data:image\/(jpeg|jpg|png|webp);base64,/);
  return mimeMatch !== null;
}

/**
 * Extract MIME type from data URI
 */
export function extractMimeType(imageData: string): string | null {
  const match = imageData.match(/^data:image\/([a-zA-Z]+);base64,/);
  return match ? match[1] : null;
}
