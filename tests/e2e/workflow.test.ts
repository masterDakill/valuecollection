// 🧪 E2E Tests - Complete Workflow
// Tests full user workflows from input to output

import { describe, it, expect } from 'vitest';

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const API_KEY = process.env.TEST_API_KEY || 'test-key';

describe('E2E: Complete Evaluation Workflow', () => {
  it('should complete full evaluation workflow', async () => {
    // Step 1: Submit evaluation request
    const evalResponse = await fetch(`${API_BASE_URL}/api/smart-evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({
        mode: 'text',
        text_input: 'First edition Harry Potter and the Philosopher\'s Stone',
        category: 'Books',
        options: {
          useCache: true,
          includeComparables: true
        }
      })
    });

    expect(evalResponse.status).toBe(200);

    const evalData = await evalResponse.json();
    expect(evalData.success).toBe(true);
    expect(evalData.smart_analysis).toBeDefined();
    expect(evalData.smart_analysis.category).toBe('Books');

    // Step 2: Check cache stats
    const cacheResponse = await fetch(`${API_BASE_URL}/api/cache/stats`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    expect(cacheResponse.status).toBe(200);

    const cacheData = await cacheResponse.json();
    expect(cacheData.success).toBe(true);
    expect(cacheData.cache_stats).toBeDefined();
    expect(cacheData.cache_stats.total_entries).toBeGreaterThan(0);

    // Step 3: Verify idempotent request returns same response
    const idempotentResponse = await fetch(`${API_BASE_URL}/api/smart-evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Idempotency-Key': evalData.request_id
      },
      body: JSON.stringify({
        mode: 'text',
        text_input: 'First edition Harry Potter and the Philosopher\'s Stone'
      })
    });

    expect(idempotentResponse.status).toBe(200);
    expect(idempotentResponse.headers.get('X-Idempotent-Replay')).toBe('true');
  });

  it('should handle multi-expert advanced analysis', async () => {
    const response = await fetch(`${API_BASE_URL}/api/advanced-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        mode: 'text',
        text_input: 'Abbey Road vinyl original pressing 1969',
        category: 'Music',
        compute_mode: 'sync',
        include_expert_details: true,
        options: {
          expertSources: ['claude', 'gemini']
        }
      })
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.consolidated_analysis).toBeDefined();
    expect(data.consolidated_analysis.expert_consensus).toBeGreaterThan(0);
    expect(data.expert_details).toBeDefined();
    expect(data.expert_details.length).toBeGreaterThan(0);
  });

  it('should handle error gracefully', async () => {
    const response = await fetch(`${API_BASE_URL}/api/smart-evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        mode: 'image',
        imageUrls: ['invalid-url-not-https']
      })
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
    expect(data.error.code).toBeDefined();
    expect(data.error.request_id).toBeDefined();
  });
});

describe('E2E: Batch Processing Workflow', () => {
  it('should process multiple items with cache benefits', async () => {
    const items = [
      { text_input: 'The Beatles - Abbey Road' },
      { text_input: 'The Beatles - Abbey Road' }, // Duplicate for cache hit
      { text_input: 'Pink Floyd - Dark Side of the Moon' }
    ];

    const results = [];

    for (const item of items) {
      const response = await fetch(`${API_BASE_URL}/api/smart-evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          mode: 'text',
          ...item,
          category: 'Music'
        })
      });

      const data = await response.json();
      results.push(data);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // All requests should succeed
    expect(results.every(r => r.success)).toBe(true);

    // Second request should be faster (cache hit)
    expect(results[1].processing_time_ms).toBeLessThan(results[0].processing_time_ms);
  });
});
