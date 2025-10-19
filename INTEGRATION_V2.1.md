# 🔌 Integration Guide - Version 2.1

This document explains how to integrate all the new v2.1 components into the existing `src/index.tsx` file.

---

## Overview

Version 2.1 has created many new services, middleware, and routes that need to be wired into the main application. This guide shows the exact code changes needed.

---

## Step 1: Update `src/index.tsx` Imports

Add these imports at the top of `src/index.tsx`:

```typescript
// New v2.1 imports
import { z } from 'zod';

// Middleware
import {
  requestIdMiddleware,
  requestTimingMiddleware,
  errorHandlerMiddleware,
  securityHeadersMiddleware,
  idempotencyMiddleware
} from './lib/request';
import { createAuthMiddleware, createCORSMiddleware } from './lib/auth';
import { createRateLimitMiddleware, RateLimitPresets } from './lib/rateLimit';

// Routes
import { healthRoutes } from './routes/health';
import { docsRoutes } from './routes/docs';
import { evaluateRoutes } from './routes/evaluate';

// Logger and Metrics
import { createLogger } from './lib/logger';
import { metrics, Metrics } from './lib/metrics';
```

---

## Step 2: Configure Middleware Stack

Replace the current app initialization with:

```typescript
import { Hono } from 'hono';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// ============================================================================
// GLOBAL MIDDLEWARE STACK (Applied to all routes)
// ============================================================================

// 1. Request ID & Timing
app.use('*', requestIdMiddleware);
app.use('*', requestTimingMiddleware);

// 2. Security Headers
app.use('*', securityHeadersMiddleware);

// 3. CORS
app.use('*', createCORSMiddleware(
  // Parse ALLOWED_ORIGINS from environment (comma-separated)
  // Example: "https://app1.com,https://app2.com"
  // Leave undefined to allow all origins in dev mode
  undefined // Or: c.env.ALLOWED_ORIGINS?.split(',')
));

// 4. Global Error Handler
app.use('*', errorHandlerMiddleware);

// ============================================================================
// PUBLIC ROUTES (No auth required)
// ============================================================================

// Health checks (for load balancers, monitoring)
app.route('/', healthRoutes);

// API documentation
app.route('/', docsRoutes);

// ============================================================================
// AUTHENTICATED ROUTES (Require Bearer token)
// ============================================================================

// Auth middleware for /api/* routes
app.use('/api/*', createAuthMiddleware({
  API_KEY: (c) => c.env.API_KEY,
  ALLOWED_ORIGINS: undefined
}));

// Rate limiting for different endpoint types
app.use('/api/smart-evaluate', createRateLimitMiddleware(RateLimitPresets.heavy));
app.use('/api/advanced-analysis', createRateLimitMiddleware(RateLimitPresets.heavy));
app.use('/api/cache/*', createRateLimitMiddleware(RateLimitPresets.standard));

// Idempotency support
app.use('/api/*', idempotencyMiddleware);

// Mount v2.1 evaluation routes
app.route('/api', evaluateRoutes);

// ============================================================================
// LEGACY ROUTES (Backward compatibility - keep existing functionality)
// ============================================================================

// Your existing routes here...
// app.get('/...', ...)
// app.post('/...', ...)

// ============================================================================
// SERVE STATIC FRONTEND
// ============================================================================

// Existing serveStatic configuration...
```

---

## Step 3: Add Environment Variables

Update `wrangler.toml` or Cloudflare Pages settings:

```toml
[vars]
ENVIRONMENT = "production"
BASE_URL = "https://imagetovalue.pages.dev"

# Note: API_KEY should be set as a secret:
# wrangler pages secret put API_KEY
```

Set secrets:

```bash
# Set API key (required for v2.1 auth)
wrangler pages secret put API_KEY
# Enter: your-secure-api-key-here

# Optional: CORS origins
wrangler pages secret put ALLOWED_ORIGINS
# Enter: https://your-app.com,https://another-domain.com
```

---

## Step 4: Update Type Definitions

If using TypeScript bindings, update `CloudflareBindings` type:

```typescript
interface CloudflareBindings {
  DB: D1Database;

  // Existing API keys
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  EBAY_CLIENT_ID?: string;
  EBAY_CLIENT_SECRET?: string;
  DISCOGS_API_KEY?: string;
  GOOGLE_BOOKS_API_KEY?: string;

  // New v2.1 config
  API_KEY?: string;
  ALLOWED_ORIGINS?: string;
  ENVIRONMENT?: string;
  BASE_URL?: string;
}
```

---

## Step 5: Optional - Migrate Existing Routes

If you want to update existing routes to use new middleware:

### Before (existing route):
```typescript
app.post('/api/evaluate-text', async (c) => {
  try {
    const { text_input } = await c.req.json();

    // ... logic ...

    return c.json({ success: true, result });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
```

### After (with v2.1 patterns):
```typescript
import { validateBody } from './lib/validation';
import { SmartEvaluateRequestSchema } from './schemas/evaluate.schema';
import { createLogger } from './lib/logger';
import { Metrics } from './lib/metrics';

app.post(
  '/api/evaluate-text',
  validateBody(SmartEvaluateRequestSchema),
  async (c) => {
    const logger = createLogger(c.get('requestId'));
    const request = c.get('validatedBody');

    try {
      logger.info('Text evaluation started', { text_length: request.text_input?.length });

      // ... logic ...

      Metrics.trackItemsProcessed('general', 1);
      logger.info('Text evaluation completed', { category: result.category });

      return c.json({
        success: true,
        result,
        request_id: c.get('requestId'),
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Text evaluation failed', error);
      Metrics.trackError('INTERNAL_ERROR', '/api/evaluate-text');

      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
          request_id: c.get('requestId')
        },
        timestamp: new Date().toISOString()
      }, 500);
    }
  }
);
```

---

## Step 6: Test Integration

### Test 1: Health Checks (No Auth)

```bash
curl http://localhost:3000/healthz

# Expected:
# {"status":"healthy","timestamp":"2025-10-19T14:30:00.000Z","version":"2.1.0"}
```

### Test 2: Metrics (No Auth)

```bash
curl http://localhost:3000/metrics

# Expected: Prometheus format text
# # HELP http_requests_total ...
# # TYPE http_requests_total counter
# ...
```

### Test 3: Documentation (No Auth)

```bash
open http://localhost:3000/docs

# Expected: Swagger UI interface
```

### Test 4: Authenticated Endpoint

```bash
# Without auth (should fail)
curl -X POST http://localhost:3000/api/smart-evaluate \
  -H "Content-Type: application/json" \
  -d '{"mode":"text","text_input":"Test"}'

# Expected:
# {"success":false,"error":{"code":"UNAUTHORIZED",...}}

# With auth (should succeed)
curl -X POST http://localhost:3000/api/smart-evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"mode":"text","text_input":"Abbey Road The Beatles"}'

# Expected:
# {"success":true,"smart_analysis":{...},"request_id":"...","timestamp":"..."}
```

### Test 5: Rate Limiting

```bash
# Run 15 requests quickly (should hit rate limit)
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/smart-evaluate \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer your-api-key" \
    -d '{"mode":"text","text_input":"Test"}' &
done
wait

# Some requests should return:
# HTTP/1.1 429 Too Many Requests
# {"success":false,"error":{"code":"RATE_LIMIT_EXCEEDED",...}}
```

### Test 6: Validation Errors

```bash
# Invalid request (missing required fields)
curl -X POST http://localhost:3000/api/smart-evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"mode":"text"}'

# Expected:
# {"success":false,"error":{"code":"INVALID_INPUT","details":{"issues":[...]}}}

# Too many images
curl -X POST http://localhost:3000/api/smart-evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"mode":"image","imageUrls":["url1","url2",...,"url11"]}'

# Expected:
# {"success":false,"error":{"code":"INVALID_INPUT","message":"Array must contain at most 10 element(s)"}}
```

---

## Step 7: Monitor & Verify

After deploying, verify:

### 1. Check Logs

In Cloudflare dashboard → Pages → Logs:

```json
{
  "timestamp": "2025-10-19T14:30:00.000Z",
  "level": "info",
  "message": "POST /api/smart-evaluate - 200 (2340ms)",
  "context": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "statusCode": 200,
    "durationMs": 2340
  }
}
```

### 2. Check Metrics

```bash
curl https://imagetovalue.pages.dev/metrics

# Look for:
# http_requests_total{method="POST",path="/api/smart-evaluate",status="200"} 42
# http_request_duration_ms_sum{method="POST",path="/api/smart-evaluate"} 98400
# cache_hits_total{apiSource="smart_analysis"} 35
# expert_requests_total{expert="claude",success="true"} 28
```

### 3. Check Cache Stats

```bash
curl https://imagetovalue.pages.dev/api/cache/stats \
  -H "Authorization: Bearer YOUR_API_KEY"

# Expected hit rate to increase over time:
# Day 1: ~20-30%
# Day 7: ~70-80%
# Day 30: ~85-90%
```

---

## Troubleshooting

### Problem: "UNAUTHORIZED" errors

**Cause:** `API_KEY` environment variable not set.

**Fix:**
```bash
wrangler pages secret put API_KEY
# Enter your secure API key
```

### Problem: Rate limit too aggressive

**Cause:** Default limits are 60 req/min for standard, 10 req/min for heavy ops.

**Fix:** Adjust limits in `src/index.tsx`:

```typescript
app.use('/api/smart-evaluate', createRateLimitMiddleware({
  maxRequests: 20,  // Increase from 10
  windowMs: 60 * 1000,
  keyPrefix: 'rl:heavy'
}));
```

### Problem: CORS errors from frontend

**Cause:** Origin not in allowed list.

**Fix:** Set `ALLOWED_ORIGINS` environment variable:

```bash
wrangler pages secret put ALLOWED_ORIGINS
# Enter: https://your-frontend.com,https://localhost:3000
```

### Problem: Validation errors on existing API clients

**Cause:** v2.1 has stricter validation. Old requests may be missing required fields.

**Fix:** Update client code to include `mode` field:

```typescript
// Old
{ text_input: "Item" }

// New
{ mode: "text", text_input: "Item" }
```

---

## Backward Compatibility

To maintain backward compatibility with existing frontend:

### Option 1: Keep both old and new routes

```typescript
// Old routes (no auth, loose validation)
app.post('/api/legacy/smart-evaluate', async (c) => {
  // Original implementation
});

// New routes (auth, strict validation)
app.route('/api', evaluateRoutes);
```

### Option 2: Make auth optional for migration period

```typescript
import { createOptionalAuthMiddleware } from './lib/auth';

// Auth optional (validates if provided, allows if not)
app.use('/api/*', createOptionalAuthMiddleware({
  API_KEY: (c) => c.env.API_KEY
}));
```

After migration period, switch to required auth.

---

## Performance Considerations

### Rate Limit Storage

Current implementation uses in-memory Map (resets on worker restart).

For production at scale, consider using:

1. **Cloudflare Durable Objects** - Persistent rate limit state
2. **Cloudflare KV** - Distributed storage with TTL
3. **Upstash Redis** - External Redis for rate limiting

### Cache Storage

Current implementation uses D1 database (good for most cases).

For high-volume scenarios:
- Monitor D1 query latency via `/metrics`
- Consider caching hot queries in KV
- Use Cloudflare Cache API for edge caching

---

## Next Steps

1. ✅ Complete `src/index.tsx` integration (following this guide)
2. ✅ Test all endpoints locally
3. ✅ Deploy to staging for testing
4. ✅ Run E2E tests: `npm run test:e2e`
5. ✅ Monitor metrics for 24h on staging
6. ✅ Deploy to production
7. ✅ Update API documentation links
8. ✅ Notify API consumers of auth requirement
9. ✅ Monitor error rates, latency, cache hit rate
10. ✅ Celebrate! 🎉

---

**Integration Status:** 📋 Ready to integrate

All components have been built and are ready to wire together. Follow this guide to complete the v2.1 integration.
