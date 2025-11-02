// 💰 Market Price Service - Intégration des prix de marché réels
// Combine eBay, Discogs, Google Books pour des évaluations basées sur des données réelles

import { EbayService } from './ebay-service';
import { DiscogsService } from './discogs-service';
import { BooksService } from './books-service';
import { Logger } from '../lib/logger';
import { ExpertAnalysis } from './ExpertService';

export interface MarketPriceResult {
  source: string;
  estimated_value: number;
  price_range_min: number;
  price_range_max: number;
  currency: string;
  similar_items_count: number;
  confidence_score: number;
  comparable_items: Array<{
    title: string;
    price: number;
    condition?: string;
    date?: string;
    url?: string;
  }>;
}

export interface ConsolidatedMarketPrice {
  estimated_value: number;
  price_range_min: number;
  price_range_max: number;
  currency: string;
  confidence: number;
  sources_used: string[];
  market_insights: {
    rarity_assessment: string;
    market_trend: 'declining' | 'stable' | 'rising' | 'hot';
    estimated_demand: 'low' | 'medium' | 'high' | 'very_high';
    liquidity: 'poor' | 'fair' | 'good' | 'excellent';
  };
  comparable_sales: Array<{
    source: string;
    title: string;
    price: number;
    condition?: string;
    date?: string;
  }>;
}

export class MarketPriceService {
  private ebayService?: EbayService;
  private discogsService?: DiscogsService;
  private booksService?: BooksService;
  private logger: Logger;

  constructor(env: any, logger: Logger) {
    this.logger = logger;

    // Initialize eBay service
    if (env.EBAY_CLIENT_ID && env.EBAY_CLIENT_SECRET) {
      this.ebayService = new EbayService(
        env.EBAY_CLIENT_ID,
        env.EBAY_CLIENT_SECRET,
        env.EBAY_ENVIRONMENT === 'sandbox',
        env.EBAY_USER_TOKEN // Pass User Token if available for enhanced permissions
      );
      this.logger.info('eBay service initialized', {
        hasUserToken: !!env.EBAY_USER_TOKEN,
        environment: env.EBAY_ENVIRONMENT
      });
    } else {
      this.logger.warn('eBay API keys missing - marketplace pricing unavailable');
    }

    // Initialize Discogs service
    if (env.DISCOGS_API_KEY) {
      this.discogsService = new DiscogsService(env.DISCOGS_API_KEY);
      this.logger.info('Discogs service initialized');
    } else {
      this.logger.warn('Discogs API key missing - music pricing unavailable');
    }

    // Initialize Google Books service
    if (env.GOOGLE_BOOKS_API_KEY) {
      this.booksService = new BooksService(env.GOOGLE_BOOKS_API_KEY);
      this.logger.info('Google Books service initialized');
    } else {
      this.logger.warn('Google Books API key missing - book pricing unavailable');
    }
  }

  /**
   * Get market prices based on expert analysis
   */
  async getMarketPrices(analysis: ExpertAnalysis): Promise<ConsolidatedMarketPrice | null> {
    this.logger.info('Fetching market prices', {
      category: analysis.category,
      confidence: analysis.confidence
    });

    const priceResults: MarketPriceResult[] = [];

    // Determine which services to use based on category
    const sources = this.determineDataSources(analysis.category);

    // Query each source in parallel
    const promises = sources.map(source => this.queryPriceSource(source, analysis));
    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        priceResults.push(result.value);
        this.logger.info(`Price data from ${sources[index]}`, {
          estimated_value: result.value.estimated_value,
          confidence: result.value.confidence_score
        });
      } else if (result.status === 'rejected') {
        this.logger.error(`Failed to fetch from ${sources[index]}`, result.reason);
      }
    });

    if (priceResults.length === 0) {
      this.logger.warn('No market price data available');
      return null;
    }

    // Consolidate all price results
    return this.consolidatePrices(priceResults, analysis);
  }

  /**
   * Determine which data sources to use based on category
   */
  private determineDataSources(category: string): string[] {
    const sources: string[] = [];

    switch (category) {
      case 'books':
        if (this.booksService) sources.push('google_books');
        if (this.ebayService) sources.push('ebay');
        break;

      case 'music':
      case 'vinyl':
      case 'cds':
        if (this.discogsService) sources.push('discogs');
        if (this.ebayService) sources.push('ebay');
        break;

      case 'sports_cards':
      case 'trading_cards':
      case 'comics':
      case 'collectibles':
      case 'vintage':
      case 'memorabilia':
      case 'art':
      case 'antiques':
      default:
        // eBay is excellent for most collectibles
        if (this.ebayService) sources.push('ebay');
        break;
    }

    return sources;
  }

  /**
   * Query a specific price source
   */
  private async queryPriceSource(
    source: string,
    analysis: ExpertAnalysis
  ): Promise<MarketPriceResult | null> {
    try {
      switch (source) {
        case 'ebay':
          return await this.getEbayPrices(analysis);

        case 'discogs':
          return await this.getDiscogsPrices(analysis);

        case 'google_books':
          return await this.getBookPrices(analysis);

        default:
          return null;
      }
    } catch (error: any) {
      this.logger.error(`Error querying ${source}`, error);
      return null;
    }
  }

  /**
   * Get prices from eBay sold listings
   */
  private async getEbayPrices(analysis: ExpertAnalysis): Promise<MarketPriceResult | null> {
    if (!this.ebayService) return null;

    // Create a mock CollectionItem for eBay service
    const mockItem: any = {
      id: 0,
      title: analysis.extracted_data.title || '',
      category: analysis.category,
      manufacturer: analysis.extracted_data.manufacturer,
      year_made: analysis.extracted_data.year,
      condition_grade: analysis.extracted_data.condition,
      isbn: analysis.extracted_data.isbn
    };

    const evaluation = await this.ebayService.evaluatePrice(mockItem);
    if (!evaluation) return null;

    const sales = await this.ebayService.searchSoldListings(mockItem);

    return {
      source: 'ebay',
      estimated_value: evaluation.estimated_value || 0,
      price_range_min: evaluation.price_range_min || 0,
      price_range_max: evaluation.price_range_max || 0,
      currency: evaluation.currency || 'CAD',
      similar_items_count: evaluation.similar_items_count || 0,
      confidence_score: evaluation.confidence_score || 0.5,
      comparable_items: sales.slice(0, 10).map(sale => ({
        title: sale.sold_title || '',
        price: sale.sale_price || 0,
        condition: sale.sold_condition,
        date: sale.sale_date,
        url: sale.sold_item_url
      }))
    };
  }

  /**
   * Get prices from Discogs
   */
  private async getDiscogsPrices(analysis: ExpertAnalysis): Promise<MarketPriceResult | null> {
    if (!this.discogsService) return null;

    // Convert ExpertAnalysis to SmartAnalysisResult format for Discogs
    const mockAnalysis: any = {
      extracted_data: analysis.extracted_data,
      category: analysis.category
    };

    const releases = await this.discogsService.searchReleases(mockAnalysis);
    if (releases.length === 0) return null;

    const bestMatch = releases[0];
    const marketData = await this.discogsService.getMarketPrices(bestMatch.id);

    // Calculate prices from for_sale listings
    const prices = marketData.for_sale
      .map((item: any) => parseFloat(item.price?.value || '0'))
      .filter((price: number) => price > 0)
      .sort((a: number, b: number) => a - b);

    if (prices.length === 0) return null;

    const min = prices[0];
    const max = prices[prices.length - 1];
    const median = prices[Math.floor(prices.length / 2)];

    return {
      source: 'discogs',
      estimated_value: median,
      price_range_min: min,
      price_range_max: max,
      currency: 'CAD',
      similar_items_count: prices.length,
      confidence_score: prices.length >= 10 ? 0.8 : 0.6,
      comparable_items: marketData.for_sale.slice(0, 10).map((item: any) => ({
        title: `${bestMatch.artist} - ${bestMatch.title}`,
        price: parseFloat(item.price?.value || '0'),
        condition: item.condition,
        url: item.uri
      }))
    };
  }

  /**
   * Get prices from Google Books
   */
  private async getBookPrices(analysis: ExpertAnalysis): Promise<MarketPriceResult | null> {
    if (!this.booksService) return null;

    // Convert to SmartAnalysisResult format
    const mockAnalysis: any = {
      extracted_data: analysis.extracted_data,
      market_identifiers: {
        isbn_13: analysis.extracted_data.isbn,
        isbn_10: analysis.extracted_data.isbn
      }
    };

    const books = await this.booksService.searchBooks(mockAnalysis);
    if (books.length === 0) return null;

    // Extract prices from sale info
    const prices = books
      .filter(book => book.saleInfo?.retailPrice)
      .map(book => book.saleInfo!.retailPrice!.amount)
      .filter(price => price > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) return null;

    const min = prices[0];
    const max = prices[prices.length - 1];
    const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    return {
      source: 'google_books',
      estimated_value: average,
      price_range_min: min,
      price_range_max: max,
      currency: 'CAD',
      similar_items_count: prices.length,
      confidence_score: 0.7,
      comparable_items: books.slice(0, 10).map(book => ({
        title: book.title,
        price: book.saleInfo?.retailPrice?.amount || 0,
        url: `https://books.google.com/books?id=${book.title}`
      }))
    };
  }

  /**
   * Consolidate prices from multiple sources
   */
  private consolidatePrices(
    results: MarketPriceResult[],
    analysis: ExpertAnalysis
  ): ConsolidatedMarketPrice {
    // Weight each source by confidence
    const totalConfidence = results.reduce((sum, r) => sum + r.confidence_score, 0);
    const weightedValue = results.reduce(
      (sum, r) => sum + (r.estimated_value * r.confidence_score),
      0
    ) / totalConfidence;

    // Get overall price range
    const allMins = results.map(r => r.price_range_min).filter(p => p > 0);
    const allMaxs = results.map(r => r.price_range_max).filter(p => p > 0);

    const overallMin = allMins.length > 0 ? Math.min(...allMins) : 0;
    const overallMax = allMaxs.length > 0 ? Math.max(...allMaxs) : 0;

    // Average confidence weighted by number of comparable items
    const totalItems = results.reduce((sum, r) => sum + r.similar_items_count, 0);
    const weightedConfidence = results.reduce(
      (sum, r) => sum + (r.confidence_score * r.similar_items_count),
      0
    ) / totalItems;

    // Collect all comparable sales
    const allComparableSales = results.flatMap(result =>
      result.comparable_items.map(item => ({
        source: result.source,
        title: item.title,
        price: item.price,
        condition: item.condition,
        date: item.date
      }))
    );

    // Sort by price and take top 15
    allComparableSales.sort((a, b) => b.price - a.price);
    const topComparables = allComparableSales.slice(0, 15);

    // Determine market insights based on data
    const market_insights = this.analyzeMarketInsights(
      results,
      analysis,
      weightedValue,
      totalItems
    );

    return {
      estimated_value: Math.round(weightedValue * 100) / 100,
      price_range_min: Math.round(overallMin * 100) / 100,
      price_range_max: Math.round(overallMax * 100) / 100,
      currency: 'CAD',
      confidence: Math.round(weightedConfidence * 100) / 100,
      sources_used: results.map(r => r.source),
      market_insights,
      comparable_sales: topComparables
    };
  }

  /**
   * Analyze market insights from price data
   */
  private analyzeMarketInsights(
    results: MarketPriceResult[],
    analysis: ExpertAnalysis,
    estimatedValue: number,
    totalItems: number
  ): ConsolidatedMarketPrice['market_insights'] {
    // Rarity assessment based on AI expert + market data
    let rarity_assessment = 'Common';
    if (analysis.estimated_rarity === 'ultra_rare') rarity_assessment = 'Extremely Rare';
    else if (analysis.estimated_rarity === 'very_rare') rarity_assessment = 'Very Rare';
    else if (analysis.estimated_rarity === 'rare') rarity_assessment = 'Rare';
    else if (analysis.estimated_rarity === 'uncommon') rarity_assessment = 'Uncommon';

    // Market trend based on number of listings
    let market_trend: 'declining' | 'stable' | 'rising' | 'hot' = 'stable';
    if (totalItems > 100) market_trend = 'declining'; // Oversupplied
    else if (totalItems > 50) market_trend = 'stable';
    else if (totalItems > 10) market_trend = 'rising';
    else market_trend = 'hot'; // Very few available = hot market

    // Demand based on price consistency
    const priceVariance = results.length > 1 ?
      this.calculatePriceVariance(results) : 0;
    let estimated_demand: 'low' | 'medium' | 'high' | 'very_high' = 'medium';
    if (priceVariance < 0.2) estimated_demand = 'very_high'; // Consistent pricing = high demand
    else if (priceVariance < 0.4) estimated_demand = 'high';
    else if (priceVariance < 0.6) estimated_demand = 'medium';
    else estimated_demand = 'low';

    // Liquidity based on number of sources and items
    let liquidity: 'poor' | 'fair' | 'good' | 'excellent' = 'fair';
    if (results.length >= 2 && totalItems >= 20) liquidity = 'excellent';
    else if (results.length >= 2 || totalItems >= 10) liquidity = 'good';
    else if (totalItems >= 5) liquidity = 'fair';
    else liquidity = 'poor';

    return {
      rarity_assessment,
      market_trend,
      estimated_demand,
      liquidity
    };
  }

  /**
   * Calculate price variance across sources
   */
  private calculatePriceVariance(results: MarketPriceResult[]): number {
    const values = results.map(r => r.estimated_value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return stdDev / mean; // Coefficient of variation
  }
}
