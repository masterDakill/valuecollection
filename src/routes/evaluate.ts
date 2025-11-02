// 🎯 Evaluation Routes
// Smart evaluation endpoints with strict validation

import { Hono } from 'hono';
import {
  SmartEvaluateRequestSchema,
  SmartEvaluateResponseSchema,
  AdvancedAnalysisRequestSchema,
  AdvancedAnalysisResponseSchema,
  ErrorCode,
  SECURITY_LIMITS
} from '../schemas/evaluate.schema';
import { validateBody, validateFileSize } from '../lib/validation';
import { createLogger } from '../lib/logger';
import { Metrics } from '../lib/metrics';
import { ExpertService } from '../services/ExpertService';
import { APICacheService } from '../services/api-cache-service';
import { MarketPriceService } from '../services/MarketPriceService';

export const evaluateRoutes = new Hono<{ Bindings: any }>();

/**
 * POST /api/smart-evaluate
 * Main evaluation endpoint with multi-expert analysis
 */
evaluateRoutes.post(
  '/smart-evaluate',
  validateFileSize({
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/json']
  }),
  validateBody(SmartEvaluateRequestSchema),
  async (c) => {
    const { env } = c;
    const requestId = c.get('requestId');
    const logger = createLogger(requestId);
    const request = c.get('validatedBody');

    const startTime = Date.now();

    try {
      logger.info('Smart evaluate request started', {
        mode: request.mode,
        hasText: !!request.text_input,
        imageCount: request.imageUrls?.length || 0,
        hasVideo: !!request.videoUrl,
        category: request.category
      });

      // Initialize services
      const expertService = new ExpertService(env, logger);
      const marketPriceService = new MarketPriceService(env, logger);
      const cache = new APICacheService(env.DB);

      // Prepare expert input
      const expertInput = {
        mode: request.mode,
        text_input: request.text_input || request.query,
        imageUrls: request.imageUrls || (request.imageUrl ? [request.imageUrl] : undefined),
        videoUrl: request.videoUrl,
        category: request.category
      };

      // Determine which experts to use
      const enabledExperts = request.options?.expertSources || ['vision', 'claude'];

      // Use cache if enabled
      const useCache = request.options?.useCache ?? true;
      let smart_analysis;

      if (useCache) {
        smart_analysis = await cache.fetchWithCache(
          'smart_analysis',
          { input: expertInput, experts: enabledExperts },
          async () => {
            // Query experts
            const analyses = await expertService.queryExperts(expertInput, enabledExperts);

            if (analyses.length === 0) {
              throw new Error('All expert analyses failed');
            }

            // Use first expert analysis for smart_analysis format
            const primary = analyses[0];
            return {
              category: primary.category,
              confidence: primary.confidence,
              extracted_data: primary.extracted_data,
              estimated_rarity: primary.estimated_rarity,
              search_queries: primary.search_queries
            };
          },
          request.options?.timeoutMs ? request.options.timeoutMs / 1000 : 86400
        );
      } else {
        const analyses = await expertService.queryExperts(expertInput, enabledExperts);

        if (analyses.length === 0) {
          throw new Error('All expert analyses failed');
        }

        const primary = analyses[0];
        smart_analysis = {
          category: primary.category,
          confidence: primary.confidence,
          extracted_data: primary.extracted_data,
          estimated_rarity: primary.estimated_rarity,
          search_queries: primary.search_queries
        };
      }

      // Get real market prices from eBay, Discogs, Google Books
      let market_insights = {
        rarity_assessment: `Estimated as ${smart_analysis.estimated_rarity.replace('_', ' ')}`,
        market_trend: 'stable' as const,
        estimated_demand: 'medium' as const
      };

      // Fetch market prices if available
      const primaryAnalysis = analyses[0];
      let marketPrices = null;
      
      try {
        marketPrices = await marketPriceService.getMarketPrices(primaryAnalysis);
        
        if (marketPrices) {
          // Update market insights with real data
          market_insights = marketPrices.market_insights;
          
          logger.info('Market prices fetched', {
            estimated_value: marketPrices.estimated_value,
            sources: marketPrices.sources_used,
            confidence: marketPrices.confidence
          });
        }
      } catch (error: any) {
        logger.warn('Failed to fetch market prices', error);
      }

      // Generate search queries for improvements
      const suggested_improvements: string[] = [];
      if (!expertInput.imageUrls || expertInput.imageUrls.length === 0) {
        suggested_improvements.push('Add images for better accuracy');
      }
      if (!expertInput.category) {
        suggested_improvements.push('Specify category for targeted analysis');
      }

      const processingTime = Date.now() - startTime;

      // Build response with market data
      const response = {
        success: true,
        smart_analysis,
        evaluations: marketPrices ? [{
          source: marketPrices.sources_used.join(', '),
          estimated_value: marketPrices.estimated_value,
          price_range_min: marketPrices.price_range_min,
          price_range_max: marketPrices.price_range_max,
          currency: marketPrices.currency,
          confidence: marketPrices.confidence,
          comparable_sales: marketPrices.comparable_sales
        }] : [],
        market_insights,
        suggested_improvements,
        cached: useCache,
        processing_time_ms: processingTime,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };

      logger.info('Smart evaluate completed', {
        processingTime,
        category: smart_analysis.category,
        confidence: smart_analysis.confidence
      });

      Metrics.trackItemsProcessed(smart_analysis.category, 1);

      return c.json(response);

    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      logger.error('Smart evaluate failed', error);
      Metrics.trackError(ErrorCode.INTERNAL_ERROR, '/api/smart-evaluate');

      return c.json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: error.message || 'Analysis failed',
          request_id: requestId
        },
        timestamp: new Date().toISOString()
      }, 500);
    }
  }
);

/**
 * POST /api/advanced-analysis
 * Advanced multi-expert consolidation with detailed consensus
 */
evaluateRoutes.post(
  '/advanced-analysis',
  validateFileSize({
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['application/json']
  }),
  validateBody(AdvancedAnalysisRequestSchema),
  async (c) => {
    const { env } = c;
    const requestId = c.get('requestId');
    const logger = createLogger(requestId);
    const request = c.get('validatedBody');

    const startTime = Date.now();

    try {
      logger.info('Advanced analysis request started', {
        mode: request.mode,
        computeMode: request.compute_mode,
        includeDetails: request.include_expert_details
      });

      // Check if async mode requested
      if (request.compute_mode === 'async') {
        // TODO: Implement async job queue with Durable Objects
        const jobId = crypto.randomUUID();

        logger.info('Async job queued', { jobId });

        return c.json({
          success: true,
          job_id: jobId,
          stream_url: `${env.BASE_URL || ''}/api/jobs/${jobId}/stream`,
          cached: false,
          processing_time_ms: Date.now() - startTime,
          request_id: requestId,
          timestamp: new Date().toISOString()
        });
      }

      // Sync mode: process immediately
      const expertService = new ExpertService(env, logger);

      const expertInput = {
        mode: request.mode,
        text_input: request.text_input || request.query,
        imageUrls: request.imageUrls || (request.imageUrl ? [request.imageUrl] : undefined),
        videoUrl: request.videoUrl,
        category: request.category
      };

      const enabledExperts = request.options?.expertSources || ['vision', 'claude', 'gemini'];

      // Query all experts
      const analyses = await expertService.queryExperts(expertInput, enabledExperts);

      if (analyses.length === 0) {
        throw new Error('All expert analyses failed');
      }

      // Consolidate analyses
      const consolidated = expertService.consolidateAnalyses(analyses);

      // Build response
      const response: any = {
        success: true,
        consolidated_analysis: {
          consensus_category: consolidated.consensus_category,
          consensus_title: consolidated.consensus_title,
          consensus_author_artist: consolidated.consensus_author_artist,
          consensus_year: consolidated.consensus_year,
          estimated_value: consolidated.estimated_value,
          rarity_assessment: consolidated.rarity_assessment,
          expert_consensus: consolidated.expert_consensus,
          action_recommendations: consolidated.action_recommendations,
          comparable_sales: consolidated.comparable_sales
        },
        cached: false,
        processing_time_ms: Date.now() - startTime,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };

      // Include expert details if requested
      if (request.include_expert_details) {
        response.expert_details = analyses.map(a => ({
          expert: a.expert,
          confidence: a.confidence,
          payload: a.raw_payload,
          latency_ms: a.latency_ms
        }));
      }

      logger.info('Advanced analysis completed', {
        expertsUsed: analyses.length,
        consensus: consolidated.expert_consensus,
        category: consolidated.consensus_category
      });

      Metrics.trackItemsProcessed(consolidated.consensus_category, 1);

      return c.json(response);

    } catch (error: any) {
      logger.error('Advanced analysis failed', error);
      Metrics.trackError(ErrorCode.INTERNAL_ERROR, '/api/advanced-analysis');

      return c.json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: error.message || 'Advanced analysis failed',
          request_id: requestId
        },
        timestamp: new Date().toISOString()
      }, 500);
    }
  }
);

/**
 * GET /api/cache/stats
 * Cache statistics endpoint
 */
evaluateRoutes.get('/cache/stats', async (c) => {
  const { env } = c;
  const logger = createLogger(c.get('requestId'));

  try {
    const cache = new APICacheService(env.DB);
    const stats = await cache.getStats();

    return c.json({
      success: true,
      cache_stats: stats,
      recommendations: {
        hit_rate_target: 80,
        current_performance: stats.hit_rate >= 80 ? '✅ Excellent' : stats.hit_rate >= 60 ? '⚠️ Good' : '❌ Needs improvement',
        estimated_savings: `${Math.round(stats.hit_rate)}% API cost reduction`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to get cache stats', error);

    return c.json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to retrieve cache statistics',
        request_id: c.get('requestId')
      },
      timestamp: new Date().toISOString()
    }, 500);
  }
});

/**
 * POST /api/cache/cleanup
 * Manual cache cleanup endpoint
 */
evaluateRoutes.post('/cache/cleanup', async (c) => {
  const { env } = c;
  const logger = createLogger(c.get('requestId'));

  try {
    const cache = new APICacheService(env.DB);
    const deleted = await cache.cleanExpired();

    logger.info('Cache cleanup completed', { deleted });

    return c.json({
      success: true,
      deleted_entries: deleted,
      message: `${deleted} expired cache entries removed`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Cache cleanup failed', error);

    return c.json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Cache cleanup failed',
        request_id: c.get('requestId')
      },
      timestamp: new Date().toISOString()
    }, 500);
  }
});
