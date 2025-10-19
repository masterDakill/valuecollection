// 🔍 Request Context Middleware
// Add request ID, timing, and context to all requests

import { Context, Next } from 'hono';
import { createLogger } from './logger';
import { Metrics } from './metrics';

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Request ID middleware
 * Adds unique ID to each request for tracing
 */
export async function requestIdMiddleware(c: Context, next: Next) {
  const requestId = c.req.header('X-Request-ID') || generateRequestId();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  await next();
}

/**
 * Request timing middleware
 * Tracks request duration and logs completion
 */
export async function requestTimingMiddleware(c: Context, next: Next) {
  const startTime = Date.now();
  const logger = createLogger(c.get('requestId'));

  const method = c.req.method;
  const path = c.req.path;

  logger.logRequestStart(method, path);

  await next();

  const durationMs = Date.now() - startTime;
  const statusCode = c.res.status;

  logger.logRequestEnd(method, path, statusCode, durationMs);
  Metrics.trackRequest(method, path, statusCode, durationMs);
}

/**
 * Error handling middleware
 * Catches unhandled errors and returns standardized error response
 */
export async function errorHandlerMiddleware(c: Context, next: Next) {
  const logger = createLogger(c.get('requestId'));

  try {
    await next();
  } catch (error: any) {
    logger.error('Unhandled error', error);

    // Check if response already sent
    if (c.res.status !== 200) {
      return;
    }

    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: {
          error_type: error.constructor.name,
          message: error.message
        },
        request_id: c.get('requestId')
      },
      timestamp: new Date().toISOString()
    }, 500);
  }
}

/**
 * Security headers middleware
 */
export async function securityHeadersMiddleware(c: Context, next: Next) {
  await next();

  // Add security headers to response
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
}

/**
 * Idempotency middleware
 * Checks for clientRequestId and deduplicates requests
 */
export interface IdempotencyStore {
  requestId: string;
  response: any;
  createdAt: number;
}

const idempotencyStore = new Map<string, IdempotencyStore>();

export async function idempotencyMiddleware(c: Context, next: Next) {
  const clientRequestId = c.req.header('X-Idempotency-Key') ||
                          (await c.req.json().catch(() => ({})))?.clientRequestId;

  if (!clientRequestId) {
    await next();
    return;
  }

  const logger = createLogger(c.get('requestId'));

  // Check if we've seen this client request ID before
  const existing = idempotencyStore.get(clientRequestId);
  if (existing) {
    const ageMs = Date.now() - existing.createdAt;

    // Only use cached response if less than 5 minutes old
    if (ageMs < 5 * 60 * 1000) {
      logger.info('Idempotent request detected, returning cached response', {
        clientRequestId,
        originalRequestId: existing.requestId,
        ageMs
      });

      c.header('X-Idempotent-Replay', 'true');
      c.header('X-Original-Request-ID', existing.requestId);

      return c.json(existing.response);
    } else {
      // Expired, remove from store
      idempotencyStore.delete(clientRequestId);
    }
  }

  // Process request
  await next();

  // Store response for future idempotent requests
  if (c.res.status === 200 || c.res.status === 201) {
    const responseClone = await c.res.clone().json();
    idempotencyStore.set(clientRequestId, {
      requestId: c.get('requestId'),
      response: responseClone,
      createdAt: Date.now()
    });

    logger.debug('Stored response for idempotency', {
      clientRequestId,
      ttlMs: 5 * 60 * 1000
    });
  }
}

/**
 * Cleanup expired idempotency entries
 */
export function cleanupIdempotencyStore(): number {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  let cleaned = 0;

  idempotencyStore.forEach((entry, key) => {
    if (now - entry.createdAt > maxAge) {
      idempotencyStore.delete(key);
      cleaned += 1;
    }
  });

  return cleaned;
}
