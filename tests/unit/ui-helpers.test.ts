import { describe, expect, it } from 'vitest';

const loadHelpers = async () => await import('../../public/ui-helpers.mjs');

describe('UI helper utilities', () => {
  it('builds analyze payload with URL', async () => {
    const { createAnalyzePayload } = await loadHelpers();
    const payload = createAnalyzePayload({
      imageUrl: 'https://cdn.example.com/photo.jpg',
      options: { maxItems: 5, collectionId: 'abc123' }
    });

    expect(payload).toEqual({
      imageUrl: 'https://cdn.example.com/photo.jpg',
      options: { maxItems: 5, collectionId: 'abc123' }
    });
  });

  it('throws when payload missing inputs', async () => {
    const { createAnalyzePayload } = await loadHelpers();
    expect(() => createAnalyzePayload({ imageUrl: '', imageBase64: null, options: {} })).toThrow();
  });

  it('normalizes raw items with aliases', async () => {
    const { normalizeItem } = await loadHelpers();
    const normalized = normalizeItem({
      item_id: 'id-1',
      item_name: 'Test Item',
      artist_author: 'Author',
      category: 'Books',
      estimated_value: '250',
      currency_code: 'USD',
      detection_confidence: 0.92,
      detected_at: '2024-01-02T10:00:00Z'
    });

    expect(normalized.title).toBe('Test Item');
    expect(normalized.author).toBe('Author');
    expect(normalized.currency).toBe('USD');
    expect(normalized.estimatedValue).toBe(250);
    expect(normalized.confidence).toBeCloseTo(0.92);
    expect(normalized.detectedAt).toBe('2024-01-02T10:00:00Z');
  });

  it('normalizes inventory timestamps with last_seen_at alias', async () => {
    const { normalizeItem } = await loadHelpers();
    const normalized = normalizeItem({
      id: 'inv-2',
      title: 'Guide reliure',
      estimated_value: 95.25,
      currency: 'CAD',
      last_seen_at: '2025-10-25T07:50:41.000Z'
    });

    expect(normalized.detectedAt).toBe('2025-10-25T07:50:41.000Z');
  });

  it('counts items above threshold', async () => {
    const { countAboveThreshold, normalizeItem } = await loadHelpers();
    const items = [
      normalizeItem({ title: 'A', estimated_value: 100 }),
      normalizeItem({ title: 'B', estimated_value: 800 }),
      normalizeItem({ title: 'C', estimated_value: 1200 })
    ];

    expect(countAboveThreshold(items, 500)).toBe(2);
  });

  it('normalizes photos with detection metadata', async () => {
    const { normalizePhoto } = await loadHelpers();
    const photo = normalizePhoto({
      id: 'photo-1',
      url: 'https://example.com/photo.jpg',
      analyzed_at: '2025-10-25T07:50:41.000Z',
      source: 'iphone',
      status: 'processed',
      detected_items: [
        {
          id: 'photo-1-item-1',
          title: 'Atlas du Québec ancien',
          estimated_value: 185.5,
          currency: 'CAD'
        },
        {
          id: 'photo-1-item-2',
          title: 'Guide reliure',
          estimated_value: 95.25,
          currency: 'CAD'
        }
      ]
    });

    expect(photo.detectedItemsCount).toBe(2);
    expect(photo.detectedItemsValue).toBeCloseTo(280.75);
    expect(photo.detectedItems[0].title).toBe('Atlas du Québec ancien');
  });
});
