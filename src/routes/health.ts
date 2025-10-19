// 🏥 Health Check and System Endpoints

import { Hono } from 'hono';
import { metrics } from '../lib/metrics';
import { cleanupRateLimitStore } from '../lib/rateLimit';
import { cleanupIdempotencyStore } from '../lib/request';

export const healthRoutes = new Hono<{ Bindings: any }>();

/**
 * Health check endpoint
 * Returns 200 if service is running
 */
healthRoutes.get('/healthz', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.1.0'
  });
});

/**
 * Readiness check endpoint
 * Returns 200 if service is ready to accept traffic
 */
healthRoutes.get('/readyz', async (c) => {
  const { env } = c;
  const checks: Record<string, boolean> = {};

  // Check database connectivity
  try {
    await env.DB.prepare('SELECT 1').first();
    checks.database = true;
  } catch (error) {
    checks.database = false;
  }

  // Check required API keys
  checks.openai = !!env.OPENAI_API_KEY;
  checks.anthropic = !!env.ANTHROPIC_API_KEY;

  // Overall readiness
  const ready = Object.values(checks).every(check => check);

  return c.json({
    status: ready ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString()
  }, ready ? 200 : 503);
});

/**
 * Prometheus metrics endpoint
 * Exports metrics in Prometheus text format
 */
healthRoutes.get('/metrics', (c) => {
  const prometheusText = metrics.exportPrometheus();

  c.header('Content-Type', 'text/plain; version=0.0.4');
  return c.text(prometheusText);
});

/**
 * JSON metrics endpoint
 * Exports metrics as JSON for alternative monitoring
 */
healthRoutes.get('/metrics/json', (c) => {
  const metricsData = metrics.exportJSON();

  return c.json({
    success: true,
    metrics: metricsData,
    timestamp: new Date().toISOString()
  });
});

/**
 * System info endpoint
 */
healthRoutes.get('/info', (c) => {
  const { env } = c;

  return c.json({
    success: true,
    system: {
      version: '2.1.0',
      environment: env.ENVIRONMENT || 'production',
      features: {
        multi_expert_analysis: true,
        api_caching: true,
        batch_processing: true,
        video_analysis: !!env.OPENAI_API_KEY,
        isbn_extraction: !!env.OPENAI_API_KEY,
        rate_limiting: true,
        authentication: !!env.API_KEY
      },
      experts: {
        openai_vision: !!env.OPENAI_API_KEY,
        claude_collection: !!env.ANTHROPIC_API_KEY,
        gemini_comparative: !!env.GEMINI_API_KEY
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * System cleanup endpoint (admin only)
 * Cleans up expired cache, rate limits, etc.
 */
healthRoutes.post('/system/cleanup', async (c) => {
  const { env } = c;

  // This should be protected by auth in production
  const results = {
    rate_limits_cleaned: cleanupRateLimitStore(),
    idempotency_cleaned: cleanupIdempotencyStore(),
    cache_expired_cleaned: 0
  };

  // Clean expired cache entries
  try {
    const { APICacheService } = await import('../services/api-cache-service');
    const cache = new APICacheService(env.DB);
    results.cache_expired_cleaned = await cache.cleanExpired();
  } catch (error) {
    // Cache service might not be initialized
  }

  return c.json({
    success: true,
    cleanup: results,
    timestamp: new Date().toISOString()
  });
});
