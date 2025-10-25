import { describe, it, expect } from 'vitest';
import {
  PhotoAnalyzeRequestSchema,
  PhotoAnalyzeOptionsSchema,
  PhotoAnalyzeResponseSchema,
  PhotosListResponseSchema,
  ItemsListResponseSchema,
  AdsGenerateRequestSchema,
} from '../../src/schemas/media.schema';

const demoPhoto = {
  id: 'photo-1',
  url: 'https://example.com/photo.jpg',
  file_name: 'photo.jpg',
  captured_at: '2025-10-25T10:00:00Z',
  source: 'demo',
  width: 1024,
  height: 768,
  checksum: 'abc123',
  dominant_color: '#ffffff',
  detected_items: [],
};

describe('PhotoAnalyzeRequestSchema', () => {
  it('accepts either imageUrl or base64 payload', () => {
    const byUrl = PhotoAnalyzeRequestSchema.safeParse({ imageUrl: demoPhoto.url });
    expect(byUrl.success).toBe(true);

    const byBase64 = PhotoAnalyzeRequestSchema.safeParse({ imageBase64: 'data:image/png;base64,AA==' });
    expect(byBase64.success).toBe(true);
  });

  it('rejects empty payloads and surfaces the refine error message', () => {
    const result = PhotoAnalyzeRequestSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('requis');
    }
  });
});

describe('Photo response schemas', () => {
  it('fills default options when omitted', () => {
    const defaults = PhotoAnalyzeOptionsSchema.parse(undefined);
    expect(defaults.maxItems).toBe(5);
  });

  it('validates full analyze response payloads', () => {
    const response = {
      success: true,
      photo: demoPhoto,
      stats: { detected_items: 0, processing_time_ms: 250 },
      request_id: '00000000-0000-4000-8000-000000000000',
      timestamp: '2025-10-25T10:00:00Z',
    };

    const parsed = PhotoAnalyzeResponseSchema.safeParse(response);
    expect(parsed.success).toBe(true);
  });

  it('validates photos list payloads and ensures stats are shaped correctly', () => {
    const list = {
      success: true,
      photos: [demoPhoto],
      stats: { total_photos: 1, last_photo_at: demoPhoto.captured_at },
      timestamp: '2025-10-25T10:00:00Z',
    };

    const parsed = PhotosListResponseSchema.safeParse(list);
    expect(parsed.success).toBe(true);
  });

  it('validates inventory items list payloads', () => {
    const payload = {
      success: true,
      items: [
        {
          id: 'item-1',
          photo_id: demoPhoto.id,
          title: 'Test Book',
          category: 'Books',
          confidence: 0.9,
          estimated_value: 199.99,
          currency: 'CAD',
          condition: 'Near Mint',
          rarity: 'Rare',
          last_seen_at: '2025-10-25T10:00:00Z',
        },
      ],
      stats: { total_items: 1, total_value: 199.99, currency: 'CAD' },
      timestamp: '2025-10-25T10:00:00Z',
    };

    const parsed = ItemsListResponseSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });
});

describe('AdsGenerateRequestSchema', () => {
  it('applies default when min_value omitted', () => {
    const result = AdsGenerateRequestSchema.parse({});
    expect(result.min_value).toBe(0);
  });
});
