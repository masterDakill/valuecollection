/**
 * Service de Monitoring Centralisé
 * Suit l'utilisation et les coûts de tous les outils/APIs
 */

import { createLogger } from '../lib/logger';

export interface ServiceMetrics {
  serviceName: string;
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  totalCostUSD: number;
  avgResponseTime: number;
  lastUsed: string | null;
  status: 'active' | 'error' | 'disabled';
  details?: any;
}

export interface MonitoringSnapshot {
  timestamp: string;
  services: {
    // LLMs
    openai: ServiceMetrics;
    anthropic: ServiceMetrics;
    gemini: ServiceMetrics;

    // APIs externes
    googleBooks: ServiceMetrics;
    openLibrary: ServiceMetrics;
    ebay: ServiceMetrics;

    // Scraping
    abeBooks: ServiceMetrics;
    bookFinder: ServiceMetrics;
    amazon: ServiceMetrics;

    // Services internes
    photoAnalysis: ServiceMetrics;
    priceAggregation: ServiceMetrics;
    rarityAnalysis: ServiceMetrics;
    enrichment: ServiceMetrics;
  };
  summary: {
    totalCalls: number;
    totalCostUSD: number;
    successRate: number;
    avgResponseTime: number;
  };
}

/**
 * Prix approximatifs par service (USD)
 */
const COST_PER_CALL = {
  openai_gpt4: 0.01,
  openai_vision: 0.05,
  anthropic_claude: 0.015,
  gemini_search: 0.0, // Gratuit avec quota
  googleBooks: 0.0,
  openLibrary: 0.0,
  ebay: 0.0,
  scraping: 0.0
};

export class MonitoringService {
  private logger = createLogger('Monitoring');
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Enregistre une utilisation de service
   */
  async trackServiceCall(
    serviceName: string,
    success: boolean,
    responseTime: number,
    costUSD: number = 0,
    details?: any
  ): Promise<void> {
    try {
      await this.db.prepare(`
        INSERT INTO service_monitoring (
          service_name,
          success,
          response_time_ms,
          cost_usd,
          details,
          created_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        serviceName,
        success ? 1 : 0,
        responseTime,
        costUSD,
        JSON.stringify(details || {})
      ).run();

      this.logger.info('Service call tracked', {
        serviceName,
        success,
        responseTime,
        costUSD
      });
    } catch (error: any) {
      this.logger.error('Failed to track service call', {
        serviceName,
        error: error.message
      });
    }
  }

  /**
   * Récupère les métriques globales
   */
  async getSnapshot(): Promise<MonitoringSnapshot> {
    try {
      // Récupérer stats des dernières 24h
      const stats = await this.db.prepare(`
        SELECT
          service_name,
          COUNT(*) as total_calls,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_calls,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_calls,
          SUM(cost_usd) as total_cost,
          AVG(response_time_ms) as avg_response_time,
          MAX(created_at) as last_used
        FROM service_monitoring
        WHERE created_at >= datetime('now', '-24 hours')
        GROUP BY service_name
      `).all();

      const services: any = {
        openai: this.createEmptyMetrics('OpenAI GPT-4'),
        anthropic: this.createEmptyMetrics('Anthropic Claude'),
        gemini: this.createEmptyMetrics('Google Gemini'),
        googleBooks: this.createEmptyMetrics('Google Books API'),
        openLibrary: this.createEmptyMetrics('Open Library'),
        ebay: this.createEmptyMetrics('eBay Finding API'),
        abeBooks: this.createEmptyMetrics('AbeBooks Scraping'),
        bookFinder: this.createEmptyMetrics('BookFinder Scraping'),
        amazon: this.createEmptyMetrics('Amazon Scraping'),
        photoAnalysis: this.createEmptyMetrics('Photo Analysis'),
        priceAggregation: this.createEmptyMetrics('Price Aggregation'),
        rarityAnalysis: this.createEmptyMetrics('Rarity Analysis'),
        enrichment: this.createEmptyMetrics('Book Enrichment')
      };

      // Remplir avec les vraies données
      if (stats.results) {
        for (const row of stats.results as any[]) {
          const key = this.mapServiceNameToKey(row.service_name);
          if (key && services[key]) {
            services[key] = {
              serviceName: row.service_name,
              totalCalls: row.total_calls,
              successCalls: row.success_calls,
              failedCalls: row.failed_calls,
              totalCostUSD: parseFloat(row.total_cost || 0),
              avgResponseTime: parseFloat(row.avg_response_time || 0),
              lastUsed: row.last_used,
              status: row.success_calls > 0 ? 'active' : (row.failed_calls > 0 ? 'error' : 'disabled')
            };
          }
        }
      }

      // Calculer le résumé
      const totalCalls = Object.values(services).reduce((sum: number, s: any) => sum + s.totalCalls, 0);
      const successCalls = Object.values(services).reduce((sum: number, s: any) => sum + s.successCalls, 0);
      const totalCost = Object.values(services).reduce((sum: number, s: any) => sum + s.totalCostUSD, 0);
      const avgResponseTime = totalCalls > 0
        ? Object.values(services).reduce((sum: number, s: any) => sum + (s.avgResponseTime * s.totalCalls), 0) / totalCalls
        : 0;

      return {
        timestamp: new Date().toISOString(),
        services,
        summary: {
          totalCalls,
          totalCostUSD: totalCost,
          successRate: totalCalls > 0 ? (successCalls / totalCalls) * 100 : 0,
          avgResponseTime
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to get monitoring snapshot', { error: error.message });
      throw error;
    }
  }

  /**
   * Récupère l'historique d'un service
   */
  async getServiceHistory(serviceName: string, hours: number = 24): Promise<any[]> {
    const result = await this.db.prepare(`
      SELECT
        service_name,
        success,
        response_time_ms,
        cost_usd,
        details,
        created_at
      FROM service_monitoring
      WHERE service_name = ?
        AND created_at >= datetime('now', '-' || ? || ' hours')
      ORDER BY created_at DESC
      LIMIT 100
    `).bind(serviceName, hours).all();

    return result.results || [];
  }

  /**
   * Calcule les coûts estimés
   */
  estimateCosts(metrics: ServiceMetrics, serviceType: string): number {
    switch (serviceType) {
      case 'openai':
        return metrics.totalCalls * COST_PER_CALL.openai_gpt4;
      case 'openai_vision':
        return metrics.totalCalls * COST_PER_CALL.openai_vision;
      case 'anthropic':
        return metrics.totalCalls * COST_PER_CALL.anthropic_claude;
      case 'gemini':
        return 0; // Gratuit
      default:
        return 0;
    }
  }

  /**
   * Crée des métriques vides
   */
  private createEmptyMetrics(serviceName: string): ServiceMetrics {
    return {
      serviceName,
      totalCalls: 0,
      successCalls: 0,
      failedCalls: 0,
      totalCostUSD: 0,
      avgResponseTime: 0,
      lastUsed: null,
      status: 'disabled'
    };
  }

  /**
   * Map service name to key
   */
  private mapServiceNameToKey(serviceName: string): string | null {
    const mapping: Record<string, string> = {
      'OpenAI GPT-4': 'openai',
      'Anthropic Claude': 'anthropic',
      'Google Gemini': 'gemini',
      'Google Books API': 'googleBooks',
      'Open Library': 'openLibrary',
      'eBay Finding API': 'ebay',
      'AbeBooks Scraping': 'abeBooks',
      'BookFinder Scraping': 'bookFinder',
      'Amazon Scraping': 'amazon',
      'Photo Analysis': 'photoAnalysis',
      'Price Aggregation': 'priceAggregation',
      'Rarity Analysis': 'rarityAnalysis',
      'Book Enrichment': 'enrichment'
    };

    return mapping[serviceName] || null;
  }
}

export function createMonitoringService(db: D1Database): MonitoringService {
  return new MonitoringService(db);
}
