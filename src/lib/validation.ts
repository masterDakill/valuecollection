// ✅ Request Validation Middleware
// Strict validation using Zod schemas

import { Context, Next } from 'hono';
import { z, ZodSchema } from 'zod';
import { createLogger } from './logger';
import { ErrorCode } from '../schemas/evaluate.schema';

/**
 * Validate request body against Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return async (c: Context, next: Next) => {
    const logger = createLogger(c.get('requestId'));

    try {
      // Parse JSON body
      const body = await c.req.json().catch(() => ({}));

      // Validate against schema
      const validated = schema.parse(body);

      // Store validated data for route handler
      c.set('validatedBody', validated);

      logger.debug('Request body validated', {
        path: c.req.path,
        bodyKeys: Object.keys(validated as any)
      });

      await next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        logger.logValidationError('body', error.message, {
          issues: error.issues
        });

        return c.json({
          success: false,
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Request validation failed',
            details: {
              issues: error.issues.map(issue => ({
                path: issue.path.join('.'),
                message: issue.message,
                code: issue.code
              }))
            },
            request_id: c.get('requestId')
          },
          timestamp: new Date().toISOString()
        }, 400);
      }

      // JSON parse error
      logger.error('Failed to parse request body', error);

      return c.json({
        success: false,
        error: {
          code: ErrorCode.INVALID_FORMAT,
          message: 'Invalid JSON in request body',
          request_id: c.get('requestId')
        },
        timestamp: new Date().toISOString()
      }, 400);
    }
  };
}

/**
 * Validate query parameters against Zod schema
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (c: Context, next: Next) => {
    const logger = createLogger(c.get('requestId'));

    try {
      const query = c.req.query();
      const validated = schema.parse(query);

      c.set('validatedQuery', validated);

      logger.debug('Query parameters validated', {
        path: c.req.path,
        queryKeys: Object.keys(validated as any)
      });

      await next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        logger.logValidationError('query', error.message, {
          issues: error.issues
        });

        return c.json({
          success: false,
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Query parameter validation failed',
            details: {
              issues: error.issues.map(issue => ({
                path: issue.path.join('.'),
                message: issue.message
              }))
            },
            request_id: c.get('requestId')
          },
          timestamp: new Date().toISOString()
        }, 400);
      }

      logger.error('Query validation error', error);
      await next();
    }
  };
}

/**
 * Validate file size and type
 */
export interface FileValidationConfig {
  maxSizeBytes: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

export function validateFileSize(config: FileValidationConfig) {
  return async (c: Context, next: Next) => {
    const logger = createLogger(c.get('requestId'));

    const contentLength = c.req.header('Content-Length');
    if (contentLength && parseInt(contentLength) > config.maxSizeBytes) {
      logger.warn('Payload too large', {
        contentLength: parseInt(contentLength),
        maxSize: config.maxSizeBytes,
        path: c.req.path
      });

      return c.json({
        success: false,
        error: {
          code: ErrorCode.PAYLOAD_TOO_LARGE,
          message: `Payload too large. Max size: ${Math.round(config.maxSizeBytes / 1024 / 1024)}MB`,
          details: {
            received_bytes: parseInt(contentLength),
            max_bytes: config.maxSizeBytes
          },
          request_id: c.get('requestId')
        },
        timestamp: new Date().toISOString()
      }, 413);
    }

    const contentType = c.req.header('Content-Type');
    if (config.allowedMimeTypes && contentType) {
      const baseType = contentType.split(';')[0].trim();
      if (!config.allowedMimeTypes.includes(baseType)) {
        logger.warn('Invalid content type', {
          contentType: baseType,
          allowed: config.allowedMimeTypes,
          path: c.req.path
        });

        return c.json({
          success: false,
          error: {
            code: ErrorCode.INVALID_FORMAT,
            message: 'Invalid content type',
            details: {
              received: baseType,
              allowed: config.allowedMimeTypes
            },
            request_id: c.get('requestId')
          },
          timestamp: new Date().toISOString()
        }, 400);
      }
    }

    await next();
  };
}
