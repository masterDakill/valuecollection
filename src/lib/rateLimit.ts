// ⏱️ Rate Limiting Middleware
// IP-based and API-key-based rate limiting

import { Context, Next } from 'hono';
import { createLogger } from './logger';
import { ErrorCode } from '../schemas/evaluate.schema';

export interface RateLimitConfig {
  maxRequests: number; // Max requests per window
  windowMs: number; // Time window in milliseconds
  keyPrefix?: string; // Prefix for rate limit keys
}

export interface RateLimitStore {
  requests: number;
  resetAt: number;
}

/**
 * In-memory rate limit store (global across worker invocations)
 */
const rateLimitStore = new Map<string, RateLimitStore>();

/**
 * Get client identifier (IP or API key)
 */
export function getClientIdentifier(c: Context): string {
  // Try to get API key from Bearer token
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      // Use hash of API key (don't store raw keys)
      return `key:${simpleHash(parts[1])}`;
    }
  }

  // Fall back to IP address
  const ip = c.req.header('CF-Connecting-IP') ||
             c.req.header('X-Forwarded-For')?.split(',')[0] ||
             c.req.header('X-Real-IP') ||
             'unknown';

  return `ip:${ip}`;
}

/**
 * Simple hash function for API keys
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check rate limit for client
 */
export function checkRateLimit(
  clientId: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = config.keyPrefix ? `${config.keyPrefix}:${clientId}` : clientId;

  let store = rateLimitStore.get(key);

  // Initialize or reset if window expired
  if (!store || now >= store.resetAt) {
    store = {
      requests: 0,
      resetAt: now + config.windowMs
    };
    rateLimitStore.set(key, store);
  }

  // Check if limit exceeded
  if (store.requests >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: store.resetAt
    };
  }

  // Increment request count
  store.requests += 1;

  return {
    allowed: true,
    remaining: config.maxRequests - store.requests,
    resetAt: store.resetAt
  };
}

/**
 * Cleanup expired rate limit entries (call periodically)
 */
export function cleanupRateLimitStore(): number {
  const now = Date.now();
  let cleaned = 0;

  rateLimitStore.forEach((store, key) => {
    if (now >= store.resetAt) {
      rateLimitStore.delete(key);
      cleaned += 1;
    }
  });

  return cleaned;
}

/**
 * Rate limit middleware factory
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (c: Context, next: Next) => {
    const logger = createLogger(c.get('requestId'));
    const clientId = getClientIdentifier(c);

    const result = checkRateLimit(clientId, config);

    // Add rate limit headers
    c.header('X-RateLimit-Limit', config.maxRequests.toString());
    c.header('X-RateLimit-Remaining', result.remaining.toString());
    c.header('X-RateLimit-Reset', Math.floor(result.resetAt / 1000).toString());

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      c.header('Retry-After', retryAfter.toString());

      logger.warn('Rate limit exceeded', {
        clientId,
        path: c.req.path,
        method: c.req.method,
        retryAfter
      });

      return c.json({
        success: false,
        error: {
          code: ErrorCode.RATE_LIMIT_EXCEEDED,
          message: `Rate limit exceeded. Max ${config.maxRequests} requests per ${config.windowMs / 1000}s. Retry after ${retryAfter}s.`,
          details: {
            limit: config.maxRequests,
            window_seconds: config.windowMs / 1000,
            retry_after_seconds: retryAfter
          },
          request_id: c.get('requestId')
        },
        timestamp: new Date().toISOString()
      }, 429);
    }

    logger.debug('Rate limit check passed', {
      clientId,
      remaining: result.remaining,
      limit: config.maxRequests
    });

    await next();
  };
}

/**
 * Default rate limit configs
 */
export const RateLimitPresets = {
  /**
   * Standard API: 60 req/min
   */
  standard: {
    maxRequests: 60,
    windowMs: 60 * 1000,
    keyPrefix: 'rl:standard'
  },

  /**
   * Heavy operations (image analysis): 10 req/min
   */
  heavy: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    keyPrefix: 'rl:heavy'
  },

  /**
   * Batch operations: 5 req/min
   */
  batch: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    keyPrefix: 'rl:batch'
  },

  /**
   * Public endpoints: 30 req/min
   */
  public: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    keyPrefix: 'rl:public'
  }
};
