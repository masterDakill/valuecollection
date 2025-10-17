// Service Discogs pour évaluation de vinyles, CDs et musique
import { SmartAnalysisResult } from './smart-analyzer';
import { PriceEvaluation, RecentSale } from '../types/collection';

export interface DiscogsRelease {
  id: number;
  title: string;
  artist: string;
  year: number;
  format: string[];
  label: string[];
  catalog_number: string;
  genres: string[];
  styles: string[];
  lowest_price?: number;
  median_price?: number;
  highest_price?: number;
  num_for_sale: number;
  release_date: string;
  condition_stats: {
    [condition: string]: {
      count: number;
      avg_price: number;
      min_price: number;
      max_price: number;
    };
  };
}

export class DiscogsService {
  private apiKey: string;
  private baseUrl = 'https://api.discogs.com';
  private userAgent = 'EvaluateurCollectionPro/1.0 +https://evaluateur-collection-pro.pages.dev';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Recherche intelligente de releases
  async searchReleases(analysis: SmartAnalysisResult): Promise<DiscogsRelease[]> {
    const searchQueries = this.buildDiscogsQueries(analysis);
    const allResults: DiscogsRelease[] = [];

    for (const query of searchQueries) {
      try {
        const results = await this.performSearch(query);
        allResults.push(...results);
        
        // Délai pour respecter rate limiting (60 req/min)
        await this.delay(1000);
        
      } catch (error) {
        console.error('Discogs search error:', error);
      }
    }

    // Déduplication et tri par pertinence
    return this.deduplicateAndRank(allResults, analysis);
  }

  // Construction de requêtes optimisées pour Discogs
  private buildDiscogsQueries(analysis: SmartAnalysisResult): string[] {
    const queries: string[] = [];
    const data = analysis.extracted_data;

    // Requête principale avec artiste et titre
    if (data.artist_author && data.title) {
      queries.push(`artist:"${data.artist_author}" release_title:"${data.title}"`);
      queries.push(`${data.artist_author} ${data.title}`);
    }

    // Requête avec année si disponible
    if (data.year && data.artist_author) {
      queries.push(`artist:"${data.artist_author}" year:${data.year}`);
    }

    // Requête par label et numéro de catalogue
    if (data.publisher_label && data.catalog_number) {
      queries.push(`label:"${data.publisher_label}" catno:"${data.catalog_number}"`);
    }

    // Requête par format spécifique
    if (data.format && data.title) {
      const format = this.mapFormatToDiscogs(data.format);
      if (format) {
        queries.push(`release_title:"${data.title}" format:"${format}"`);
      }
    }

    return queries.slice(0, 4); // Limiter à 4 requêtes max
  }

  // Recherche API Discogs
  private async performSearch(query: string): Promise<DiscogsRelease[]> {
    const url = `${this.baseUrl}/database/search?q=${encodeURIComponent(query)}&type=release&per_page=25`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Discogs token=${this.apiKey}`,
        'User-Agent': this.userAgent
      }
    });

    if (!response.ok) {
      throw new Error(`Discogs API error: ${response.status}`);
    }

    const data = await response.json();
    const releases: DiscogsRelease[] = [];

    for (const release of data.results || []) {
      try {
        // Obtenir les détails complets de chaque release
        const detailsUrl = `${this.baseUrl}/releases/${release.id}`;
        const detailsResponse = await fetch(detailsUrl, {
          headers: {
            'Authorization': `Discogs token=${this.apiKey}`,
            'User-Agent': this.userAgent
          }
        });

        if (detailsResponse.ok) {
          const details = await detailsResponse.json();
          releases.push(this.parseDiscogsRelease(details));
        }

        // Délai entre requêtes détaillées
        await this.delay(500);

      } catch (error) {
        console.error('Error fetching release details:', error);
      }
    }

    return releases;
  }

  // Parsing des données Discogs
  private parseDiscogsRelease(release: any): DiscogsRelease {
    return {
      id: release.id,
      title: release.title,
      artist: release.artists?.[0]?.name || 'Unknown Artist',
      year: release.year || 0,
      format: release.formats?.map((f: any) => f.name) || [],
      label: release.labels?.map((l: any) => l.name) || [],
      catalog_number: release.labels?.[0]?.catno || '',
      genres: release.genres || [],
      styles: release.styles || [],
      release_date: release.released_formatted || '',
      lowest_price: release.lowest_price,
      median_price: release.stats?.median_price,
      highest_price: release.stats?.highest_price,
      num_for_sale: release.num_for_sale || 0,
      condition_stats: {}
    };
  }

  // Déduplication et classement par pertinence
  private deduplicateAndRank(releases: DiscogsRelease[], analysis: SmartAnalysisResult): DiscogsRelease[] {
    // Supprimer les doublons par ID
    const unique = releases.filter((release, index, self) => 
      index === self.findIndex(r => r.id === release.id)
    );

    // Calculer score de pertinence
    return unique
      .map(release => ({
        ...release,
        relevance_score: this.calculateRelevanceScore(release, analysis)
      }))
      .sort((a, b) => (b as any).relevance_score - (a as any).relevance_score)
      .slice(0, 10); // Top 10 résultats
  }

  // Calcul du score de pertinence
  private calculateRelevanceScore(release: DiscogsRelease, analysis: SmartAnalysisResult): number {
    let score = 0;
    const data = analysis.extracted_data;

    // Correspondance titre (poids fort)
    if (data.title && this.fuzzyMatch(release.title, data.title)) {
      score += 50;
    }

    // Correspondance artiste (poids fort)
    if (data.artist_author && this.fuzzyMatch(release.artist, data.artist_author)) {
      score += 50;
    }

    // Correspondance année (poids moyen)
    if (data.year && Math.abs(release.year - data.year) <= 1) {
      score += 30;
    }

    // Correspondance format (poids moyen)
    if (data.format && release.format.some(f => f.toLowerCase().includes(data.format!.toLowerCase()))) {
      score += 25;
    }

    // Correspondance label (poids faible)
    if (data.publisher_label && release.label.some(l => this.fuzzyMatch(l, data.publisher_label!))) {
      score += 15;
    }

    // Bonus pour disponibilité de prix
    if (release.lowest_price && release.num_for_sale > 0) {
      score += 10;
    }

    return score;
  }

  // Obtenir les prix du marché pour une release
  async getMarketPrices(releaseId: number): Promise<{
    statistics: any;
    for_sale: any[];
    sold_listings: any[];
  }> {
    try {
      // Statistiques des prix
      const statsUrl = `${this.baseUrl}/releases/${releaseId}/stats`;
      const statsResponse = await fetch(statsUrl, {
        headers: {
          'Authorization': `Discogs token=${this.apiKey}`,
          'User-Agent': this.userAgent
        }
      });

      let statistics = {};
      if (statsResponse.ok) {
        statistics = await statsResponse.json();
      }

      // Items en vente
      const forSaleUrl = `${this.baseUrl}/marketplace/search?release_id=${releaseId}&sort=price&sort_order=asc`;
      const forSaleResponse = await fetch(forSaleUrl, {
        headers: {
          'Authorization': `Discogs token=${this.apiKey}`,
          'User-Agent': this.userAgent
        }
      });

      let forSale = [];
      if (forSaleResponse.ok) {
        const forSaleData = await forSaleResponse.json();
        forSale = forSaleData.listings || [];
      }

      return {
        statistics,
        for_sale: forSale.slice(0, 20), // Limiter à 20 résultats
        sold_listings: [] // Discogs ne fournit pas l'historique des ventes via API
      };

    } catch (error) {
      console.error('Error fetching market prices:', error);
      return { statistics: {}, for_sale: [], sold_listings: [] };
    }
  }

  // Générer évaluation de prix basée sur Discogs
  async generatePriceEvaluation(
    itemId: number,
    analysis: SmartAnalysisResult,
    releases: DiscogsRelease[]
  ): Promise<PriceEvaluation | null> {
    
    if (releases.length === 0) return null;

    const bestMatch = releases[0]; // Release avec le meilleur score
    const marketData = await this.getMarketPrices(bestMatch.id);

    // Calculer estimation basée sur les données Discogs
    const prices = marketData.for_sale
      .map(item => parseFloat(item.price?.value || '0'))
      .filter(price => price > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) return null;

    const min = prices[0];
    const max = prices[prices.length - 1];
    const median = prices[Math.floor(prices.length / 2)];

    // Ajuster selon l'état estimé
    const conditionMultiplier = this.getConditionMultiplier(analysis.extracted_data.condition);
    const estimatedValue = median * conditionMultiplier;

    // Calculer confiance basée sur nombre de données
    let confidence = 0.6;
    if (prices.length >= 10) confidence += 0.2;
    if (marketData.statistics && Object.keys(marketData.statistics).length > 0) confidence += 0.1;
    if (bestMatch.year === analysis.extracted_data.year) confidence += 0.1;

    return {
      id: 0,
      item_id: itemId,
      evaluation_source: 'discogs',
      estimated_value: Math.round(estimatedValue * 100) / 100,
      currency: 'CAD',
      price_range_min: Math.round(min * conditionMultiplier * 100) / 100,
      price_range_max: Math.round(max * conditionMultiplier * 100) / 100,
      condition_matched: analysis.extracted_data.condition || 'unknown',
      similar_items_count: prices.length,
      confidence_score: Math.min(confidence, 0.95),
      evaluation_date: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      is_active: true,
      raw_api_data: JSON.stringify({
        discogs_release_id: bestMatch.id,
        release_title: bestMatch.title,
        artist: bestMatch.artist,
        year: bestMatch.year,
        formats: bestMatch.format,
        labels: bestMatch.label,
        market_stats: marketData.statistics,
        sample_prices: prices.slice(0, 10)
      })
    };
  }

  // Helpers privés
  private mapFormatToDiscogs(format: string): string | null {
    const formatMap: { [key: string]: string } = {
      'lp': 'LP',
      'ep': 'EP',
      '45 rpm': '7"',
      '33 rpm': 'LP',
      'cd': 'CD',
      'cassette': 'Cassette',
      'vinyl': 'Vinyl'
    };

    return formatMap[format.toLowerCase()] || null;
  }

  private getConditionMultiplier(condition?: string): number {
    const multipliers: { [key: string]: number } = {
      'mint': 1.0,
      'near_mint': 0.85,
      'excellent': 0.70,
      'very_good': 0.55,
      'good': 0.40,
      'fair': 0.25,
      'poor': 0.15
    };

    return multipliers[condition || 'good'] || 0.40;
  }

  private fuzzyMatch(str1: string, str2: string): boolean {
    const normalize = (s: string) => s.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const n1 = normalize(str1);
    const n2 = normalize(str2);

    // Correspondance exacte
    if (n1 === n2) return true;

    // Correspondance partielle (60% des mots)
    const words1 = n1.split(' ');
    const words2 = n2.split(' ');
    
    let matches = 0;
    for (const word1 of words1) {
      if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        matches++;
      }
    }

    return matches / Math.max(words1.length, words2.length) >= 0.6;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}