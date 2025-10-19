// 🔄 Service de Cache API Multi-Niveaux
// Réduit coûts et latence des appels API externes

export interface CacheEntry {
  cache_key: string;
  api_source: string;
  request_data: string; // JSON
  response_data: string; // JSON
  created_at: Date;
  expires_at: Date;
  hit_count: number;
}

export class APICacheService {
  private db: any; // Cloudflare D1

  constructor(db: any) {
    this.db = db;
  }

  /**
   * GÉNÉRER CLÉ DE CACHE
   * Hash stable pour requête identique
   */
  private generateCacheKey(apiSource: string, requestData: any): string {
    const normalized = JSON.stringify(requestData, Object.keys(requestData).sort());
    return `${apiSource}:${this.simpleHash(normalized)}`;
  }

  /**
   * HASH SIMPLE (non-cryptographique)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * RÉCUPÉRER DU CACHE
   */
  async get<T>(apiSource: string, requestData: any): Promise<T | null> {
    const cacheKey = this.generateCacheKey(apiSource, requestData);

    try {
      const result = await this.db.prepare(`
        SELECT response_data, expires_at, hit_count
        FROM api_cache
        WHERE cache_key = ?
          AND expires_at > datetime('now')
        LIMIT 1
      `).bind(cacheKey).first();

      if (!result) {
        return null; // Cache miss
      }

      // Incrémenter hit count
      await this.db.prepare(`
        UPDATE api_cache
        SET hit_count = hit_count + 1
        WHERE cache_key = ?
      `).bind(cacheKey).run();

      return JSON.parse(result.response_data) as T;

    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * SAUVEGARDER DANS LE CACHE
   */
  async set(
    apiSource: string,
    requestData: any,
    responseData: any,
    ttlSeconds: number = 86400 // 24h par défaut
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(apiSource, requestData);

    try {
      await this.db.prepare(`
        INSERT INTO api_cache (
          cache_key,
          api_source,
          request_data,
          response_data,
          created_at,
          expires_at,
          hit_count
        )
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now', '+' || ? || ' seconds'), 0)
        ON CONFLICT(cache_key) DO UPDATE SET
          response_data = excluded.response_data,
          expires_at = excluded.expires_at,
          hit_count = 0
      `).bind(
        cacheKey,
        apiSource,
        JSON.stringify(requestData),
        JSON.stringify(responseData),
        ttlSeconds
      ).run();

    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * WRAPPER: EXÉCUTER AVEC CACHE
   */
  async fetchWithCache<T>(
    apiSource: string,
    requestData: any,
    fetchFunction: () => Promise<T>,
    ttlSeconds: number = 86400
  ): Promise<T> {
    // 1. Vérifier cache
    const cached = await this.get<T>(apiSource, requestData);
    if (cached !== null) {
      console.log(`✅ Cache HIT: ${apiSource}`);
      return cached;
    }

    console.log(`❌ Cache MISS: ${apiSource} - Fetching...`);

    // 2. Appel API
    const result = await fetchFunction();

    // 3. Sauvegarder dans cache
    await this.set(apiSource, requestData, result, ttlSeconds);

    return result;
  }

  /**
   * NETTOYER CACHE EXPIRÉ
   */
  async cleanExpired(): Promise<number> {
    try {
      const result = await this.db.prepare(`
        DELETE FROM api_cache
        WHERE expires_at < datetime('now')
      `).run();

      return result.changes || 0;
    } catch (error) {
      console.error('Cache cleanup error:', error);
      return 0;
    }
  }

  /**
   * STATISTIQUES CACHE
   */
  async getStats(): Promise<{
    total_entries: number;
    total_hits: number;
    expired_entries: number;
    cache_size_mb: number;
    hit_rate: number;
  }> {
    try {
      const stats = await this.db.prepare(`
        SELECT
          COUNT(*) as total_entries,
          SUM(hit_count) as total_hits,
          COUNT(CASE WHEN expires_at < datetime('now') THEN 1 END) as expired_entries,
          SUM(LENGTH(response_data)) / 1024.0 / 1024.0 as cache_size_mb
        FROM api_cache
      `).first();

      const hitRate = stats.total_entries > 0
        ? (stats.total_hits / stats.total_entries) * 100
        : 0;

      return {
        total_entries: stats.total_entries || 0,
        total_hits: stats.total_hits || 0,
        expired_entries: stats.expired_entries || 0,
        cache_size_mb: Math.round(stats.cache_size_mb * 100) / 100 || 0,
        hit_rate: Math.round(hitRate * 100) / 100
      };

    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        total_entries: 0,
        total_hits: 0,
        expired_entries: 0,
        cache_size_mb: 0,
        hit_rate: 0
      };
    }
  }

  /**
   * INVALIDATION CACHE (par source ou pattern)
   */
  async invalidate(apiSource?: string, pattern?: string): Promise<number> {
    try {
      let query = 'DELETE FROM api_cache WHERE 1=1';
      const params: any[] = [];

      if (apiSource) {
        query += ' AND api_source = ?';
        params.push(apiSource);
      }

      if (pattern) {
        query += ' AND cache_key LIKE ?';
        params.push(`%${pattern}%`);
      }

      const result = await this.db.prepare(query).bind(...params).run();
      return result.changes || 0;

    } catch (error) {
      console.error('Cache invalidation error:', error);
      return 0;
    }
  }
}

/**
 * EXEMPLE D'UTILISATION
 */
export async function exampleUsage(db: any) {
  const cache = new APICacheService(db);

  // Exemple avec eBay
  const ebaySearch = await cache.fetchWithCache(
    'ebay',
    { query: 'Abbey Road Beatles', category: 'music' },
    async () => {
      // Appel API réel
      const response = await fetch('https://api.ebay.com/...');
      return await response.json();
    },
    86400 // 24h TTL
  );

  // Exemple avec ISBN lookup
  const bookInfo = await cache.fetchWithCache(
    'google_books',
    { isbn: '978-0-123-45678-9' },
    async () => {
      const response = await fetch('https://www.googleapis.com/books/...');
      return await response.json();
    },
    604800 // 7 jours TTL (ISBN ne change pas)
  );

  // Stats
  const stats = await cache.getStats();
  console.log('Cache Stats:', stats);
  // {
  //   total_entries: 1250,
  //   total_hits: 8340,
  //   expired_entries: 45,
  //   cache_size_mb: 12.5,
  //   hit_rate: 85.2
  // }
}

/**
 * MIGRATION SQL
 */
export const CACHE_TABLE_MIGRATION = `
CREATE TABLE IF NOT EXISTS api_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key TEXT NOT NULL UNIQUE,
  api_source TEXT NOT NULL,
  request_data TEXT NOT NULL,
  response_data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  hit_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_cache_source ON api_cache(api_source);
`;
