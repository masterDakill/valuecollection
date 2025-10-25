import { describe, it, expect } from 'vitest';

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

describe.sequential('Media endpoints contract', () => {
  it('GET /api/photos retourne la photothèque', async () => {
    const response = await fetch(`${API_BASE_URL}/api/photos`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.photos)).toBe(true);
    expect(data.stats.total_photos).toBeGreaterThanOrEqual(1);
    if (data.photos.length > 0) {
      const [firstPhoto] = data.photos;
      expect(typeof firstPhoto.url).toBe('string');
      expect(firstPhoto.detected_items.length).toBeGreaterThan(0);
    }
  });

  it("POST /api/photos/analyze détecte des items", async () => {
    const response = await fetch(`${API_BASE_URL}/api/photos/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: 'https://example.com/library/rare-book.jpg',
        options: {
          maxItems: 3,
          collectionId: 'books-demo',
        },
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.photo.detected_items.length).toBeGreaterThan(0);
    expect(data.stats.detected_items).toBe(data.photo.detected_items.length);
  });

  it('GET /api/items expose les items détectés', async () => {
    const response = await fetch(`${API_BASE_URL}/api/items`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
    const [first] = data.items;
    expect(first).toHaveProperty('estimated_value');
    expect(data.stats.total_items).toBe(data.items.length);
    expect(data.stats.total_value).toBeGreaterThan(0);
  });

  it("POST /api/ads/generate applique le filtre min_value", async () => {
    const minValue = 100;
    const response = await fetch(`${API_BASE_URL}/api/ads/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ min_value: minValue }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.ads)).toBe(true);
    expect(
      data.ads.every((ad: any) => typeof ad.price === 'number' && ad.price >= minValue),
    ).toBe(true);
  });

  it('GET /api/ads/export retourne un CSV', async () => {
    const response = await fetch(`${API_BASE_URL}/api/ads/export`);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');

    const text = await response.text();
    expect(text.split('\n')[0]).toContain('id,title,price');
  });
});
