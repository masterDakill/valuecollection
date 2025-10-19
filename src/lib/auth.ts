// 🔐 Authentication Middleware
// Bearer token validation with Cloudflare secrets

import { Context, Next } from 'hono';
import { createLogger } from './logger';
import { ErrorCode } from '../schemas/evaluate.schema';

export interface AuthConfig {
  API_KEY?: string;
  ALLOWED_ORIGINS?: string[];
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Validate API key against environment secrets
 */
export function validateApiKey(providedKey: string, expectedKey: string | undefined): boolean {
  if (!expectedKey) {
    // If no API key is configured, authentication is disabled (dev mode)
    return true;
  }

  // Constant-time comparison to prevent timing attacks
  if (providedKey.length !== expectedKey.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < providedKey.length; i++) {
    result |= providedKey.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Auth middleware factory
 */
export function createAuthMiddleware(config: AuthConfig) {
  return async (c: Context, next: Next) => {
    const logger = createLogger(c.get('requestId'));

    // Extract token
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      logger.warn('Authentication failed: Missing Bearer token', {
        path: c.req.path,
        method: c.req.method
      });

      return c.json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
          request_id: c.get('requestId')
        },
        timestamp: new Date().toISOString()
      }, 401);
    }

    // Validate token
    if (!validateApiKey(token, config.API_KEY)) {
      logger.warn('Authentication failed: Invalid API key', {
        path: c.req.path,
        method: c.req.method
      });

      return c.json({
        success: false,
        error: {
          code: ErrorCode.INVALID_API_KEY,
          message: 'Invalid API key',
          request_id: c.get('requestId')
        },
        timestamp: new Date().toISOString()
      }, 401);
    }

    // Authentication successful
    logger.debug('Authentication successful', {
      path: c.req.path,
      method: c.req.method
    });

    await next();
  };
}

/**
 * Optional auth middleware (only validates if token is provided)
 */
export function createOptionalAuthMiddleware(config: AuthConfig) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    // If no auth header, continue without validation
    if (!authHeader) {
      await next();
      return;
    }

    // If auth header is present, validate it
    const token = extractBearerToken(authHeader);
    if (!token || !validateApiKey(token, config.API_KEY)) {
      const logger = createLogger(c.get('requestId'));
      logger.warn('Optional authentication failed', {
        path: c.req.path,
        method: c.req.method
      });

      return c.json({
        success: false,
        error: {
          code: ErrorCode.INVALID_API_KEY,
          message: 'Invalid API key',
          request_id: c.get('requestId')
        },
        timestamp: new Date().toISOString()
      }, 401);
    }

    await next();
  };
}

/**
 * CORS middleware
 */
export function createCORSMiddleware(allowedOrigins?: string[]) {
  return async (c: Context, next: Next) => {
    const origin = c.req.header('Origin');

    // If no allowed origins configured, allow all (dev mode)
    if (!allowedOrigins || allowedOrigins.length === 0) {
      c.header('Access-Control-Allow-Origin', '*');
      c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      c.header('Access-Control-Max-Age', '86400');

      if (c.req.method === 'OPTIONS') {
        return c.text('', 204);
      }

      await next();
      return;
    }

    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      c.header('Access-Control-Allow-Credentials', 'true');
      c.header('Access-Control-Max-Age', '86400');

      if (c.req.method === 'OPTIONS') {
        return c.text('', 204);
      }

      await next();
      return;
    }

    // Origin not allowed
    if (c.req.method === 'OPTIONS') {
      return c.text('', 403);
    }

    const logger = createLogger(c.get('requestId'));
    logger.warn('CORS: Origin not allowed', { origin, allowedOrigins });

    return c.json({
      success: false,
      error: {
        code: ErrorCode.FORBIDDEN,
        message: 'Origin not allowed',
        request_id: c.get('requestId')
      },
      timestamp: new Date().toISOString()
    }, 403);
  };
}
