// 📄 OpenAPI Specification Generator
// Generates OpenAPI 3.1 spec from Zod schemas

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  SmartEvaluateRequestSchema,
  SmartEvaluateResponseSchema,
  AdvancedAnalysisRequestSchema,
  AdvancedAnalysisResponseSchema,
  ApiErrorSchema,
  ErrorCode
} from '../schemas/evaluate.schema';

/**
 * Generate complete OpenAPI specification
 */
export function generateOpenAPISpec(baseUrl: string = 'https://imagetovalue.pages.dev'): any {
  return {
    openapi: '3.1.0',
    info: {
      title: 'ImageToValue Evaluator API',
      version: '2.1.0',
      description: `
# ImageToValue Evaluator API

Multi-expert AI-powered evaluation system for collectibles, books, music, art, and more.

## Features

- 🤖 **Multi-Expert Analysis**: Combines OpenAI GPT-4o Vision, Claude 3 Sonnet, and Gemini Pro
- 📸 **Multi-Modal Input**: Support for text, images, videos, and 3D scans (Polycam)
- 🎯 **Smart Consolidation**: Weighted consensus with confidence scoring
- 💾 **Intelligent Caching**: 50-80% API cost reduction with intelligent cache
- 🔒 **Enterprise Security**: Rate limiting, authentication, size limits
- 📊 **Observability**: Prometheus metrics, JSON logs, request tracing
- ⚡ **Performance**: Async processing, SSE streaming, batch operations

## Authentication

All endpoints (except health checks) require Bearer token authentication:

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Rate Limits

- Standard endpoints: 60 requests/minute
- Heavy operations (image analysis): 10 requests/minute
- Batch operations: 5 requests/minute

## Idempotency

Include \`X-Idempotency-Key\` header or \`clientRequestId\` in request body for idempotent requests.
      `.trim(),
      contact: {
        name: 'API Support',
        url: baseUrl
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: baseUrl,
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    paths: {
      '/api/smart-evaluate': {
        post: {
          summary: 'Smart Evaluation',
          description: 'Analyze an item using AI experts and return category, rarity, and market insights',
          operationId: 'smartEvaluate',
          tags: ['Evaluation'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: zodToJsonSchema(SmartEvaluateRequestSchema, 'SmartEvaluateRequest'),
                examples: {
                  text_only: {
                    summary: 'Text-only analysis',
                    value: {
                      mode: 'text',
                      text_input: 'Abbey Road by The Beatles, original 1969 pressing',
                      category: 'Music',
                      options: {
                        expertSources: ['claude', 'gemini'],
                        useCache: true
                      }
                    }
                  },
                  image_analysis: {
                    summary: 'Image-based analysis',
                    value: {
                      mode: 'image',
                      imageUrls: ['https://example.com/book-cover.jpg'],
                      options: {
                        expertSources: ['vision', 'claude'],
                        includeComparables: true
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Successful analysis',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(SmartEvaluateResponseSchema, 'SmartEvaluateResponse')
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(ApiErrorSchema, 'ApiError')
                }
              }
            },
            401: {
              description: 'Authentication error',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(ApiErrorSchema, 'ApiError')
                }
              }
            },
            429: {
              description: 'Rate limit exceeded',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(ApiErrorSchema, 'ApiError')
                }
              }
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(ApiErrorSchema, 'ApiError')
                }
              }
            }
          }
        }
      },
      '/api/advanced-analysis': {
        post: {
          summary: 'Advanced Multi-Expert Analysis',
          description: 'Detailed analysis with expert consensus and consolidation',
          operationId: 'advancedAnalysis',
          tags: ['Evaluation'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: zodToJsonSchema(AdvancedAnalysisRequestSchema, 'AdvancedAnalysisRequest'),
                examples: {
                  sync_analysis: {
                    summary: 'Synchronous analysis',
                    value: {
                      mode: 'mixed',
                      text_input: 'First edition Harry Potter and the Philosopher\'s Stone',
                      imageUrls: ['https://example.com/book.jpg'],
                      compute_mode: 'sync',
                      include_expert_details: true,
                      options: {
                        expertSources: ['vision', 'claude', 'gemini']
                      }
                    }
                  },
                  async_analysis: {
                    summary: 'Asynchronous analysis',
                    value: {
                      mode: 'video',
                      videoUrl: 'https://youtube.com/watch?v=example',
                      compute_mode: 'async',
                      webhook_url: 'https://your-app.com/webhooks/analysis'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Successful analysis',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(AdvancedAnalysisResponseSchema, 'AdvancedAnalysisResponse')
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(ApiErrorSchema, 'ApiError')
                }
              }
            }
          }
        }
      },
      '/api/cache/stats': {
        get: {
          summary: 'Cache Statistics',
          description: 'Get API cache performance metrics',
          operationId: 'getCacheStats',
          tags: ['Cache'],
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: 'Cache statistics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      cache_stats: {
                        type: 'object',
                        properties: {
                          total_entries: { type: 'integer' },
                          total_hits: { type: 'integer' },
                          expired_entries: { type: 'integer' },
                          cache_size_mb: { type: 'number' },
                          hit_rate: { type: 'number' }
                        }
                      },
                      recommendations: { type: 'object' },
                      timestamp: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/healthz': {
        get: {
          summary: 'Health Check',
          description: 'Basic health check endpoint',
          operationId: 'healthCheck',
          tags: ['System'],
          security: [],
          responses: {
            200: {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', enum: ['healthy'] },
                      timestamp: { type: 'string', format: 'date-time' },
                      version: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/readyz': {
        get: {
          summary: 'Readiness Check',
          description: 'Check if service is ready to accept traffic',
          operationId: 'readinessCheck',
          tags: ['System'],
          security: [],
          responses: {
            200: {
              description: 'Service is ready',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', enum: ['ready', 'not_ready'] },
                      checks: { type: 'object' },
                      timestamp: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            },
            503: {
              description: 'Service is not ready'
            }
          }
        }
      },
      '/metrics': {
        get: {
          summary: 'Prometheus Metrics',
          description: 'Export metrics in Prometheus text format',
          operationId: 'prometheusMetrics',
          tags: ['System'],
          security: [],
          responses: {
            200: {
              description: 'Metrics in Prometheus format',
              content: {
                'text/plain': {
                  schema: {
                    type: 'string'
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          description: 'Enter your API key'
        }
      },
      schemas: {
        SmartEvaluateRequest: zodToJsonSchema(SmartEvaluateRequestSchema, 'SmartEvaluateRequest'),
        SmartEvaluateResponse: zodToJsonSchema(SmartEvaluateResponseSchema, 'SmartEvaluateResponse'),
        AdvancedAnalysisRequest: zodToJsonSchema(AdvancedAnalysisRequestSchema, 'AdvancedAnalysisRequest'),
        AdvancedAnalysisResponse: zodToJsonSchema(AdvancedAnalysisResponseSchema, 'AdvancedAnalysisResponse'),
        ApiError: zodToJsonSchema(ApiErrorSchema, 'ApiError')
      }
    },
    tags: [
      {
        name: 'Evaluation',
        description: 'AI-powered item evaluation endpoints'
      },
      {
        name: 'Cache',
        description: 'Cache management and statistics'
      },
      {
        name: 'System',
        description: 'Health checks and system information'
      }
    ]
  };
}

/**
 * Generate curl examples for testing
 */
export function generateCurlExamples(baseUrl: string = 'http://localhost:3000'): string {
  return `
# ImageToValue API - Curl Examples

## Smart Evaluate (Text)
curl -X POST ${baseUrl}/api/smart-evaluate \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "mode": "text",
    "text_input": "Abbey Road by The Beatles, original 1969 pressing",
    "category": "Music"
  }'

## Smart Evaluate (Image)
curl -X POST ${baseUrl}/api/smart-evaluate \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "mode": "image",
    "imageUrls": ["https://example.com/book-cover.jpg"],
    "options": {
      "expertSources": ["vision", "claude"],
      "useCache": true
    }
  }'

## Advanced Analysis
curl -X POST ${baseUrl}/api/advanced-analysis \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "mode": "mixed",
    "text_input": "First edition Harry Potter",
    "imageUrls": ["https://example.com/book.jpg"],
    "compute_mode": "sync",
    "include_expert_details": true
  }'

## Cache Stats
curl ${baseUrl}/api/cache/stats \\
  -H "Authorization: Bearer YOUR_API_KEY"

## Health Check
curl ${baseUrl}/healthz

## Metrics
curl ${baseUrl}/metrics
  `.trim();
}
