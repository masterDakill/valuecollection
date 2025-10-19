// 🧪 Contract Tests - API Endpoint Responses
// Tests that API responses match OpenAPI spec

import { describe, it, expect, beforeAll } from 'vitest';

// These tests would run against a running instance
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const API_KEY = process.env.TEST_API_KEY || 'test-key';

describe('API Contract Tests', () => {
  describe('POST /api/smart-evaluate', () => {
    it('should return 400 for missing inputs', async () => {
      const response = await fetch(`${API_BASE_URL}/api/smart-evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          mode: 'text'
          // Missing text_input
        })
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_INPUT');
      expect(data.error.request_id).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should return 401 for missing auth', async () => {
      const response = await fetch(`${API_BASE_URL}/api/smart-evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // Missing Authorization header
        },
        body: JSON.stringify({
          mode: 'text',
          text_input: 'Test'
        })
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 200 for valid request', async () => {
      const response = await fetch(`${API_BASE_URL}/api/smart-evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          mode: 'text',
          text_input: 'Abbey Road by The Beatles'
        })
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.smart_analysis).toBeDefined();
      expect(data.smart_analysis.category).toBeDefined();
      expect(data.smart_analysis.confidence).toBeGreaterThan(0);
      expect(data.processing_time_ms).toBeGreaterThan(0);
      expect(data.request_id).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should respect rate limits', async () => {
      // Make multiple requests quickly
      const promises = Array(15).fill(null).map(() =>
        fetch(`${API_BASE_URL}/api/smart-evaluate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify({
            mode: 'text',
            text_input: 'Test'
          })
        })
      );

      const responses = await Promise.all(promises);

      // At least one should be rate limited
      const rateLimited = responses.find(r => r.status === 429);
      expect(rateLimited).toBeDefined();

      if (rateLimited) {
        expect(rateLimited.headers.get('Retry-After')).toBeDefined();
        expect(rateLimited.headers.get('X-RateLimit-Limit')).toBeDefined();
      }
    });
  });

  describe('GET /healthz', () => {
    it('should return health status', async () => {
      const response = await fetch(`${API_BASE_URL}/healthz`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.version).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('GET /readyz', () => {
    it('should return readiness status', async () => {
      const response = await fetch(`${API_BASE_URL}/readyz`);

      const data = await response.json();
      expect(data.status).toMatch(/ready|not_ready/);
      expect(data.checks).toBeDefined();
      expect(data.checks.database).toBeDefined();
    });
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics', async () => {
      const response = await fetch(`${API_BASE_URL}/metrics`);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/plain');

      const text = await response.text();
      expect(text).toContain('# HELP');
      expect(text).toContain('# TYPE');
    });
  });

  describe('GET /openapi.json', () => {
    it('should return valid OpenAPI spec', async () => {
      const response = await fetch(`${API_BASE_URL}/openapi.json`);

      expect(response.status).toBe(200);

      const spec = await response.json();
      expect(spec.openapi).toBe('3.1.0');
      expect(spec.info.title).toBeDefined();
      expect(spec.paths).toBeDefined();
      expect(spec.paths['/api/smart-evaluate']).toBeDefined();
    });
  });
});
