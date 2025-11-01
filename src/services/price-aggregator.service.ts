/**
 * Service d'Agrégation de Prix Multi-Sources
 * Collecte les prix depuis AbeBooks, Amazon, eBay, BookFinder
 */

import { createLogger } from '../lib/logger';
import { createGeminiPriceSearchService } from './gemini-price-search.service';

interface PriceSource {
  source: string;
  price: number;
  currency: string;
  condition: string;
  url?: string;
  seller?: string;
  availability: boolean;
}

interface AggregatedPrices {
  average: number;
  median: number;
  min: number;
  max: number;
  count: number;
  sources: PriceSource[];
  byCondition: {
    new?: { avg: number; count: number };
    likeNew?: { avg: number; count: number };
    veryGood?: { avg: number; count: number };
    good?: { avg: number; count: number };
    acceptable?: { avg: number; count: number };
  };
  currency: string;
  lastUpdated: string;
}

export class PriceAggregatorService {
  private logger = createLogger('PriceAggregator');
  private ebayAppId?: string;
  private geminiApiKey?: string;

  constructor(ebayAppId?: string, geminiApiKey?: string) {
    this.ebayAppId = ebayAppId;
    this.geminiApiKey = geminiApiKey;
  }

  /**
   * Agrège les prix depuis toutes les sources
   */
  async aggregatePrices(isbn: string, title: string, author?: string): Promise<AggregatedPrices | null> {
    try {
      this.logger.info('Aggregating prices', { isbn, title });

      // PRIORITÉ 1: Essayer Gemini avec recherche Google (meilleure source!)
      if (this.geminiApiKey) {
        this.logger.info('Trying Gemini price search with Google...');
        const geminiService = createGeminiPriceSearchService(this.geminiApiKey);
        const geminiResult = await geminiService.searchPrices({
          title,
          author,
          isbn,
          isbn13: isbn
        });

        if (geminiResult && geminiResult.confidence > 0.5) {
          this.logger.info('Gemini found reliable prices', {
            avgPrice: geminiResult.avgPrice,
            confidence: geminiResult.confidence,
            sources: geminiResult.sources.length
          });

          // Convertir le résultat Gemini en format AggregatedPrices
          return {
            average: geminiResult.avgPrice,
            median: geminiResult.avgPrice,
            min: geminiResult.minPrice,
            max: geminiResult.maxPrice,
            count: geminiResult.sources.length,
            sources: geminiResult.sources.map((source, i) => ({
              source: source,
              price: geminiResult.avgPrice,
              currency: 'CAD',
              condition: 'good',
              availability: true
            })),
            byCondition: this.parseConditionPrices(geminiResult.pricesByCondition),
            currency: 'CAD',
            lastUpdated: new Date().toISOString()
          };
        }

        this.logger.warn('Gemini prices unreliable, trying other sources...');
      }

      // FALLBACK: Essayer scraping (probablement bloqué)
      const prices: PriceSource[] = [];
      const results = await Promise.allSettled([
        this.fetchAbeBooks(isbn, title),
        this.fetchBookFinder(isbn, title),
        this.fetchEbay(isbn, title),
        this.fetchAmazon(isbn, title),
      ]);

      // Collecter tous les prix valides
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          prices.push(...result.value);
        } else if (result.status === 'rejected') {
          const sources = ['AbeBooks', 'BookFinder', 'eBay', 'Amazon'];
          this.logger.warn(`Failed to fetch from ${sources[index]}`, {
            error: result.reason?.message
          });
        }
      });

      if (prices.length === 0) {
        this.logger.warn('No prices found from any source');
        return null;
      }

      // Calculer les statistiques
      return this.calculateStatistics(prices);

    } catch (error: any) {
      this.logger.error('Price aggregation failed', { error: error.message });
      return null;
    }
  }

  /**
   * Parse les prix par condition depuis Gemini
   */
  private parseConditionPrices(conditions: any): Record<string, number> {
    const result: Record<string, number> = {};

    if (conditions.excellent) {
      const price = parseFloat(conditions.excellent.replace(/[^\d.]/g, ''));
      if (!isNaN(price)) result.veryGood = price;
    }

    if (conditions.good) {
      const price = parseFloat(conditions.good.replace(/[^\d.]/g, ''));
      if (!isNaN(price)) result.good = price;
    }

    if (conditions.acceptable) {
      const price = parseFloat(conditions.acceptable.replace(/[^\d.]/g, ''));
      if (!isNaN(price)) result.acceptable = price;
    }

    return result;
  }

  /**
   * AbeBooks - Web scraping pour prix d'occasion réels
   */
  private async fetchAbeBooks(isbn: string, title: string): Promise<PriceSource[]> {
    try {
      const prices: PriceSource[] = [];

      // Search by ISBN if available
      const searchQuery = isbn || encodeURIComponent(title);
      const searchUrl = isbn
        ? `https://www.abebooks.com/servlet/SearchResults?isbn=${isbn}`
        : `https://www.abebooks.com/servlet/SearchResults?kn=${searchQuery}`;

      this.logger.info('Fetching AbeBooks prices', { isbn, title });

      // Fetch the page
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (!response.ok) {
        this.logger.warn('AbeBooks request failed', { status: response.status });
        return [];
      }

      const html = await response.text();

      // Parse prices from HTML
      // AbeBooks uses specific CSS classes for prices
      const priceMatches = html.matchAll(/item-price.*?>\s*(?:CAD?\s*\$?\s*)?(\d+(?:[.,]\d{2})?)/gi);
      const conditionMatches = html.matchAll(/item-condition.*?>(.*?)<\//gi);

      const pricesArray = Array.from(priceMatches);
      const conditionsArray = Array.from(conditionMatches);

      for (let i = 0; i < Math.min(pricesArray.length, 5); i++) {
        const priceStr = pricesArray[i][1].replace(',', '.');
        const price = parseFloat(priceStr);

        if (!isNaN(price) && price > 0) {
          const conditionText = conditionsArray[i]?.[1]?.toLowerCase() || 'good';
          let condition = 'good';

          if (conditionText.includes('new')) condition = 'new';
          else if (conditionText.includes('very good')) condition = 'veryGood';
          else if (conditionText.includes('fine')) condition = 'veryGood';
          else if (conditionText.includes('acceptable')) condition = 'acceptable';

          prices.push({
            source: 'AbeBooks',
            price,
            currency: 'CAD',
            condition,
            availability: true
          });
        }
      }

      this.logger.info('AbeBooks prices fetched', { count: prices.length });
      return prices;

    } catch (error: any) {
      this.logger.error('AbeBooks fetch failed', { error: error.message });
      return [];
    }
  }

  /**
   * BookFinder - Scraping des métasearch de 100,000+ vendeurs
   */
  private async fetchBookFinder(isbn: string, title: string): Promise<PriceSource[]> {
    try {
      const prices: PriceSource[] = [];

      if (!isbn && !title) return [];

      const searchQuery = isbn || encodeURIComponent(title);
      const searchUrl = isbn
        ? `https://www.bookfinder.com/search/?isbn=${isbn}&mode=basic&destination=ca&currency=CAD`
        : `https://www.bookfinder.com/search/?title=${searchQuery}&mode=basic&destination=ca&currency=CAD`;

      this.logger.info('Fetching BookFinder prices', { isbn, title });

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        this.logger.warn('BookFinder request failed', { status: response.status });
        return [];
      }

      const html = await response.text();

      // Parse prices from BookFinder HTML
      const priceMatches = html.matchAll(/data-price[^>]*>.*?CAD\s*\$?\s*(\d+(?:\.\d{2})?)/gi);
      const pricesArray = Array.from(priceMatches).slice(0, 5);

      for (const match of pricesArray) {
        const price = parseFloat(match[1]);
        if (!isNaN(price) && price > 0) {
          prices.push({
            source: 'BookFinder',
            price,
            currency: 'CAD',
            condition: 'good', // BookFinder shows various conditions
            availability: true,
          });
        }
      }

      this.logger.info('BookFinder prices fetched', { count: prices.length });
      return prices;

    } catch (error: any) {
      this.logger.error('BookFinder fetch failed', { error: error.message });
      return [];
    }
  }

  /**
   * eBay - API Finding pour prix réels du marché
   */
  private async fetchEbay(isbn: string, title: string): Promise<PriceSource[]> {
    try {
      const prices: PriceSource[] = [];

      // Note: eBay credentials are in .dev.vars but we need OAuth token
      // For now, using Finding API without auth (limited but works)

      const searchKeywords = isbn || title;
      const url = new URL('https://svcs.ebay.com/services/search/FindingService/v1');

      url.searchParams.set('OPERATION-NAME', 'findItemsByKeywords');
      url.searchParams.set('SERVICE-VERSION', '1.0.0');
      url.searchParams.set('SECURITY-APPNAME', this.ebayAppId || 'MathieuC-Collecto-SBX-fc5825f8b');
      url.searchParams.set('RESPONSE-DATA-FORMAT', 'JSON');
      url.searchParams.set('REST-PAYLOAD', 'true');
      url.searchParams.set('keywords', searchKeywords);
      url.searchParams.set('paginationInput.entriesPerPage', '10');
      url.searchParams.set('sortOrder', 'PricePlusShippingLowest');
      url.searchParams.set('itemFilter(0).name', 'ListingType');
      url.searchParams.set('itemFilter(0).value', 'FixedPrice');
      url.searchParams.set('itemFilter(1).name', 'Condition');
      url.searchParams.set('itemFilter(1).value', 'Used');

      this.logger.info('Fetching eBay prices', { searchKeywords });

      const response = await fetch(url.toString());

      if (!response.ok) {
        this.logger.warn('eBay request failed', { status: response.status });
        return [];
      }

      const data = await response.json();
      const searchResult = data?.findItemsByKeywordsResponse?.[0]?.searchResult?.[0];
      const items = searchResult?.item || [];

      for (const item of items.slice(0, 5)) {
        const priceInfo = item.sellingStatus?.[0]?.currentPrice?.[0];
        const price = parseFloat(priceInfo?.__value__ || '0');
        const currency = priceInfo?.['@currencyId'] || 'USD';
        const conditionId = item.condition?.[0]?.conditionId?.[0];

        // Convert USD to CAD (rough conversion, should use real rate)
        const priceCAD = currency === 'USD' ? price * 1.35 : price;

        if (price > 0) {
          // Map eBay condition IDs to our condition enum
          let condition = 'good';
          if (conditionId === '1000') condition = 'new';
          else if (conditionId === '1500' || conditionId === '2000') condition = 'veryGood';
          else if (conditionId === '3000') condition = 'good';
          else if (conditionId === '4000' || conditionId === '5000') condition = 'acceptable';

          prices.push({
            source: 'eBay',
            price: priceCAD,
            currency: 'CAD',
            condition,
            availability: true,
            url: item.viewItemURL?.[0]
          });
        }
      }

      this.logger.info('eBay prices fetched', { count: prices.length });
      return prices;

    } catch (error: any) {
      this.logger.error('eBay fetch failed', { error: error.message });
      return [];
    }
  }

  /**
   * Amazon - Scraping des prix neufs et occasions (Amazon.ca)
   */
  private async fetchAmazon(isbn: string, title: string): Promise<PriceSource[]> {
    try {
      const prices: PriceSource[] = [];

      if (!isbn && !title) return [];

      // Search Amazon.ca
      const searchQuery = isbn || encodeURIComponent(title + ' book');
      const searchUrl = `https://www.amazon.ca/s?k=${searchQuery}`;

      this.logger.info('Fetching Amazon prices', { isbn, title });

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept-Language': 'en-CA,en;q=0.9'
        }
      });

      if (!response.ok) {
        this.logger.warn('Amazon request failed', { status: response.status });
        return [];
      }

      const html = await response.text();

      // Parse Amazon prices (new and used)
      const newPriceMatches = html.matchAll(/a-price-whole[^>]*>(\d+)[^<]*<span[^>]*>\.(\d{2})/gi);
      const pricesArray = Array.from(newPriceMatches).slice(0, 3);

      for (const match of pricesArray) {
        const price = parseFloat(`${match[1]}.${match[2]}`);
        if (!isNaN(price) && price > 0) {
          prices.push({
            source: 'Amazon',
            price,
            currency: 'CAD',
            condition: 'good', // Mixed new/used on Amazon
            availability: true,
          });
        }
      }

      this.logger.info('Amazon prices fetched', { count: prices.length });
      return prices;

    } catch (error: any) {
      this.logger.error('Amazon fetch failed', { error: error.message });
      return [];
    }
  }

  /**
   * Calcule les statistiques agrégées
   */
  private calculateStatistics(prices: PriceSource[]): AggregatedPrices {
    const priceValues = prices.map(p => p.price);

    // Trier pour calculer médiane
    const sorted = [...priceValues].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    // Grouper par condition
    const byCondition: any = {};
    prices.forEach(p => {
      if (!byCondition[p.condition]) {
        byCondition[p.condition] = { prices: [], count: 0 };
      }
      byCondition[p.condition].prices.push(p.price);
      byCondition[p.condition].count++;
    });

    // Calculer moyennes par condition
    const conditionStats: any = {};
    Object.keys(byCondition).forEach(condition => {
      const condPrices = byCondition[condition].prices;
      conditionStats[condition] = {
        avg: condPrices.reduce((a: number, b: number) => a + b, 0) / condPrices.length,
        count: byCondition[condition].count
      };
    });

    return {
      average: priceValues.reduce((a, b) => a + b, 0) / priceValues.length,
      median,
      min: Math.min(...priceValues),
      max: Math.max(...priceValues),
      count: prices.length,
      sources: prices,
      byCondition: conditionStats,
      currency: 'CAD',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Estime la valeur recommandée basée sur l'état
   */
  estimateValueByCondition(aggregated: AggregatedPrices, bookCondition?: string): number {
    // Si on a un état spécifique dans les données
    if (bookCondition && aggregated.byCondition[bookCondition]) {
      return aggregated.byCondition[bookCondition].avg;
    }

    // Sinon utiliser la médiane (plus fiable que moyenne)
    return aggregated.median;
  }
}

export function createPriceAggregatorService(ebayAppId?: string, geminiApiKey?: string): PriceAggregatorService {
  return new PriceAggregatorService(ebayAppId, geminiApiKey);
}
