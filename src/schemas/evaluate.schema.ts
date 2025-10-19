// 📋 Schémas Zod - Validation Stricte API Évaluation
// Conforme SMART_FEATURES.md ￼

import { z } from 'zod';

// =============================================================================
// TYPES DE BASE
// =============================================================================

export const InputModeSchema = z.enum(['text', 'image', 'video', 'mixed']);

export const CategorySchema = z.enum([
  'Books',
  'Music',
  'Art',
  'Trading Cards',
  'Comics',
  'Video Games',
  'Films',
  'Collectibles',
  'Other'
]);

export const ConditionSchema = z.enum([
  'Mint',
  'Near Mint',
  'Excellent',
  'Very Good',
  'Good',
  'Fair',
  'Poor'
]);

// =============================================================================
// OPTIONS COMMUNES
// =============================================================================

export const EvaluationOptionsSchema = z.object({
  dedupeThreshold: z.number().min(0).max(1).default(0.8)
    .describe('Seuil similarité Levenshtein (0-1)'),

  useCache: z.boolean().default(true)
    .describe('Utiliser cache API si disponible'),

  timeoutMs: z.number().int().min(1000).max(120000).default(30000)
    .describe('Timeout total requête (1s-120s)'),

  expertSources: z.array(z.enum(['vision', 'claude', 'gemini'])).default(['vision', 'claude'])
    .describe('Experts IA à consulter'),

  includeComparables: z.boolean().default(true)
    .describe('Inclure ventes comparables dans résultat'),

  clientRequestId: z.string().uuid().optional()
    .describe('ID client pour idempotence')
}).strict();

// =============================================================================
// POST /api/smart-evaluate
// =============================================================================

export const SmartEvaluateRequestSchema = z.object({
  // Mode
  mode: InputModeSchema.describe('Type d\'input principal'),

  // Inputs texte
  text_input: z.string().min(1).max(500).optional()
    .describe('Description texte libre (ex: "Abbey Road The Beatles")'),

  query: z.string().min(1).max(500).optional()
    .describe('Alias de text_input pour compatibilité'),

  // Inputs image
  imageUrl: z.string().url().optional()
    .describe('URL image unique (DEPRECATED, use imageUrls)'),

  imageUrls: z.array(z.string().url()).max(10).optional()
    .describe('URLs images (max 10, chacune <10MB)'),

  // Inputs vidéo
  videoUrl: z.string().url().optional()
    .describe('URL vidéo (YouTube ou upload direct)'),

  // Metadata
  filename: z.string().max(255).optional()
    .describe('Nom fichier original (extraction metadata)'),

  category: CategorySchema.optional()
    .describe('Catégorie si connue (améliore précision)'),

  // Options
  options: EvaluationOptionsSchema.optional()
    .describe('Options avancées évaluation')
}).strict()
  .refine(
    (data) => data.text_input || data.query || data.imageUrl || data.imageUrls || data.videoUrl,
    { message: 'Au moins un input requis: text_input, imageUrls, ou videoUrl' }
  );

export type SmartEvaluateRequest = z.infer<typeof SmartEvaluateRequestSchema>;

// =============================================================================
// RÉPONSE /api/smart-evaluate
// =============================================================================

export const ExtractedDataSchema = z.object({
  title: z.string().optional(),
  artist_author: z.string().optional(),
  year: z.number().int().min(1000).max(2100).optional(),
  publisher_label: z.string().optional(),
  format: z.string().optional(),
  condition: ConditionSchema.optional(),
  isbn: z.string().optional(),
  catalog_number: z.string().optional()
}).strict();

export const SmartAnalysisSchema = z.object({
  category: CategorySchema,
  confidence: z.number().min(0).max(1),
  extracted_data: ExtractedDataSchema,
  estimated_rarity: z.enum(['common', 'uncommon', 'rare', 'very_rare', 'ultra_rare']),
  search_queries: z.array(z.string())
}).strict();

export const EvaluationSourceSchema = z.object({
  evaluation_source: z.string(),
  estimated_value: z.number().min(0),
  currency: z.enum(['CAD', 'USD', 'EUR']),
  confidence_score: z.number().min(0).max(1),
  similar_items_count: z.number().int().min(0)
}).strict();

export const MarketInsightsSchema = z.object({
  rarity_assessment: z.string(),
  market_trend: z.enum(['declining', 'stable', 'rising', 'hot']),
  estimated_demand: z.enum(['low', 'medium', 'high', 'very_high'])
}).strict();

export const SmartEvaluateResponseSchema = z.object({
  success: z.boolean(),
  smart_analysis: SmartAnalysisSchema.optional(),
  evaluations: z.array(EvaluationSourceSchema).optional(),
  market_insights: MarketInsightsSchema.optional(),
  suggested_improvements: z.array(z.string()).optional(),

  // Metadata performance
  cached: z.boolean().default(false),
  processing_time_ms: z.number().int().min(0),
  request_id: z.string().uuid(),
  timestamp: z.string().datetime()
}).strict();

export type SmartEvaluateResponse = z.infer<typeof SmartEvaluateResponseSchema>;

// =============================================================================
// POST /api/advanced-analysis
// =============================================================================

export const AdvancedAnalysisRequestSchema = SmartEvaluateRequestSchema.extend({
  compute_mode: z.enum(['sync', 'async']).default('sync')
    .describe('sync=réponse immédiate, async=job queued avec jobId'),

  include_expert_details: z.boolean().default(false)
    .describe('Inclure détails individuels de chaque expert'),

  webhook_url: z.string().url().optional()
    .describe('URL callback pour résultats async')
}).strict();

export type AdvancedAnalysisRequest = z.infer<typeof AdvancedAnalysisRequestSchema>;

// Réponse sync
export const ExpertAnalysisDetailSchema = z.object({
  expert: z.enum(['vision', 'claude', 'gemini']),
  confidence: z.number().min(0).max(1),
  payload: z.record(z.unknown()),
  latency_ms: z.number().int().min(0)
}).strict();

export const ConsolidatedAnalysisSchema = z.object({
  consensus_category: CategorySchema,
  consensus_title: z.string(),
  consensus_author_artist: z.string().optional(),
  consensus_year: z.number().int().optional(),

  estimated_value: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    average: z.number().min(0),
    confidence: z.number().min(0).max(1)
  }),

  rarity_assessment: z.object({
    score: z.number().int().min(1).max(10),
    level: z.enum(['Common', 'Uncommon', 'Rare', 'Very Rare', 'Extremely Rare']),
    factors: z.array(z.string())
  }),

  expert_consensus: z.number().min(0).max(100)
    .describe('% d\'accord entre experts'),

  action_recommendations: z.array(z.string()),
  comparable_sales: z.array(z.string())
}).strict();

export const AdvancedAnalysisResponseSchema = z.object({
  success: z.boolean(),

  // Si sync
  consolidated_analysis: ConsolidatedAnalysisSchema.optional(),
  expert_details: z.array(ExpertAnalysisDetailSchema).optional(),

  // Si async
  job_id: z.string().uuid().optional(),
  stream_url: z.string().url().optional(),

  // Metadata
  cached: z.boolean().default(false),
  processing_time_ms: z.number().int().min(0),
  request_id: z.string().uuid(),
  timestamp: z.string().datetime()
}).strict();

export type AdvancedAnalysisResponse = z.infer<typeof AdvancedAnalysisResponseSchema>;

// =============================================================================
// ERREURS TYPÉES
// =============================================================================

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    request_id: z.string().uuid()
  }),
  timestamp: z.string().datetime()
}).strict();

export type ApiError = z.infer<typeof ApiErrorSchema>;

// Codes d'erreur standardisés
export enum ErrorCode {
  // 400
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // 401
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_API_KEY = 'INVALID_API_KEY',

  // 403
  FORBIDDEN = 'FORBIDDEN',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // 413
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',

  // 429
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // 500
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  TIMEOUT = 'TIMEOUT'
}

// =============================================================================
// HELPERS VALIDATION
// =============================================================================

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ApiError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        success: false,
        error: {
          success: false,
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Validation failed',
            details: { issues: err.issues },
            request_id: crypto.randomUUID()
          },
          timestamp: new Date().toISOString()
        }
      };
    }

    return {
      success: false,
      error: {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Unknown validation error',
          request_id: crypto.randomUUID()
        },
        timestamp: new Date().toISOString()
      }
    };
  }
}

// =============================================================================
// LIMITES DE SÉCURITÉ (configurable via env)
// =============================================================================

export const SECURITY_LIMITS = {
  MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_VIDEO_SIZE_BYTES: 100 * 1024 * 1024, // 100 MB
  MAX_ZIP_SIZE_BYTES: 100 * 1024 * 1024, // 100 MB
  MAX_CSV_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_IMAGES_PER_REQUEST: 10,
  MAX_ZIP_NESTING_LEVEL: 2,

  ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic'],
  ALLOWED_VIDEO_EXTENSIONS: ['.mp4', '.mov', '.avi', '.webm'],
  ALLOWED_ARCHIVE_EXTENSIONS: ['.zip'],
  ALLOWED_CSV_EXTENSIONS: ['.csv'],

  ALLOWED_IMAGE_MIMES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic'
  ],
  ALLOWED_VIDEO_MIMES: [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm'
  ]
} as const;
