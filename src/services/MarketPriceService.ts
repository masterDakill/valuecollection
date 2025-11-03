// 💰 Market Price Service - Intégration des prix de marché réels
// Combine eBay, Discogs, Google Books, PriceAggregator pour des évaluations basées sur des données réelles

import { EbayService } from './ebay-service';
import { DiscogsService } from './discogs-service';
import { BooksService } from './books-service';
import { createPriceAggregatorService } from './price-aggregator.service';
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
  private priceAggregator?: any;
  private logger: Logger;
  private env: any;

  constructor(env: any, logger: Logger) {
    this.logger = logger;
    this.env = env;

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

    // Initialize Price Aggregator Service (web scraping + Gemini search)
    this.priceAggregator = createPriceAggregatorService(
      env.EBAY_CLIENT_ID,
      env.GEMINI_API_KEY
    );
    this.logger.info('Price Aggregator service initialized', {
      hasGemini: !!env.GEMINI_API_KEY
    });
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
   * Get prices from Google Books + Multi-Source Aggregator
   * Enhanced to use web scraping from AbeBooks, Amazon, BookFinder
   * AND Gemini's Google search capability
   */
  private async getBookPrices(analysis: ExpertAnalysis): Promise<MarketPriceResult | null> {
    const isbn = analysis.extracted_data.isbn || '';
    const title = analysis.extracted_data.title || '';
    const author = analysis.extracted_data.author;

    this.logger.info('Fetching book prices from multiple sources', {
      isbn,
      title,
      author
    });

    // STRATEGY: Try aggregator first (most comprehensive), then fallback to Google Books API
    
    // 1. Try Price Aggregator (AbeBooks, Amazon, BookFinder, eBay Finding API, Gemini+Google)
    if (this.priceAggregator) {
      try {
        const aggregatedPrices = await this.priceAggregator.aggregatePrices(isbn, title, author);
        
        if (aggregatedPrices && aggregatedPrices.count > 0) {
          this.logger.info('Multi-source prices found', {
            avgPrice: aggregatedPrices.average,
            sources: aggregatedPrices.sources.length,
            priceRange: `${aggregatedPrices.min}-${aggregatedPrices.max}`
          });

          return {
            source: 'multi_source_aggregator',
            estimated_value: aggregatedPrices.median, // Median is more robust than average
            price_range_min: aggregatedPrices.min,
            price_range_max: aggregatedPrices.max,
            currency: aggregatedPrices.currency,
            similar_items_count: aggregatedPrices.count,
            confidence_score: this.calculateAggregatorConfidence(aggregatedPrices),
            comparable_items: aggregatedPrices.sources.slice(0, 10).map(source => ({
              title: `${title} (${source.condition})`,
              price: source.price,
              condition: source.condition,
              url: source.url
            }))
          };
        }
      } catch (error: any) {
        this.logger.warn('Price aggregator failed, falling back to Google Books', {
          error: error.message
        });
      }
    }

    // 2. Fallback to Google Books API
    if (!this.booksService) return null;

    const mockAnalysis: any = {
      extracted_data: analysis.extracted_data,
      market_identifiers: {
        isbn_13: isbn,
        isbn_10: isbn
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
    const median = prices[Math.floor(prices.length / 2)];

    return {
      source: 'google_books',
      estimated_value: median,
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
   * Calculate confidence score for aggregated prices
   * Based on: number of sources, price consistency, data quality
   */
  private calculateAggregatorConfidence(aggregated: any): number {
    let confidence = 0.5; // Base confidence

    // More sources = higher confidence
    if (aggregated.count >= 15) confidence += 0.3;
    else if (aggregated.count >= 10) confidence += 0.2;
    else if (aggregated.count >= 5) confidence += 0.1;

    // Price consistency (low variance = higher confidence)
    const priceRange = aggregated.max - aggregated.min;
    const avgPrice = aggregated.average;
    const variance = priceRange / avgPrice;

    if (variance < 0.3) confidence += 0.15; // Very consistent pricing
    else if (variance < 0.5) confidence += 0.1; // Moderately consistent
    else if (variance < 1.0) confidence += 0.05; // Some variance

    // Multiple source types increase confidence
    const uniqueSources = new Set(aggregated.sources.map((s: any) => s.source));
    if (uniqueSources.size >= 3) confidence += 0.1;
    else if (uniqueSources.size >= 2) confidence += 0.05;

    return Math.min(confidence, 0.95); // Cap at 95%
  }

  /**
   * Consolidate prices from multiple sources
   * Enhanced to provide comprehensive price ranges and confidence levels
   */
  private consolidatePrices(
    results: MarketPriceResult[],
    analysis: ExpertAnalysis
  ): ConsolidatedMarketPrice {
    this.logger.info('Consolidating prices from sources', {
      sourceCount: results.length,
      sources: results.map(r => r.source)
    });

    // Collect ALL prices from all sources for statistical analysis
    const allPrices: number[] = [];
    results.forEach(result => {
      // Add the estimated value
      allPrices.push(result.estimated_value);
      
      // Add comparable item prices if available
      result.comparable_items.forEach(item => {
        if (item.price > 0) {
          allPrices.push(item.price);
        }
      });
    });

    // Sort for statistical calculations
    const sortedPrices = allPrices.filter(p => p > 0).sort((a, b) => a - b);

    if (sortedPrices.length === 0) {
      // Fallback if no valid prices
      const weightedValue = results.reduce(
        (sum, r) => sum + (r.estimated_value * r.confidence_score),
        0
      ) / results.reduce((sum, r) => sum + r.confidence_score, 0);

      return {
        estimated_value: Math.round(weightedValue * 100) / 100,
        price_range_min: Math.round(weightedValue * 0.8 * 100) / 100,
        price_range_max: Math.round(weightedValue * 1.2 * 100) / 100,
        currency: 'CAD',
        confidence: 0.5,
        sources_used: results.map(r => r.source),
        market_insights: this.analyzeMarketInsights(results, analysis, weightedValue, 0),
        comparable_sales: []
      };
    }

    // ENHANCED STATISTICAL ANALYSIS
    const min = sortedPrices[0];
    const max = sortedPrices[sortedPrices.length - 1];
    const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const average = sortedPrices.reduce((sum, p) => sum + p, 0) / sortedPrices.length;
    
    // Calculate percentiles for better range understanding
    const p25 = sortedPrices[Math.floor(sortedPrices.length * 0.25)]; // 25th percentile
    const p75 = sortedPrices[Math.floor(sortedPrices.length * 0.75)]; // 75th percentile

    // Weight each source by confidence
    const totalConfidence = results.reduce((sum, r) => sum + r.confidence_score, 0);
    const weightedValue = results.reduce(
      (sum, r) => sum + (r.estimated_value * r.confidence_score),
      0
    ) / totalConfidence;

    // Use weighted value if reasonable, otherwise use median (more robust)
    const finalEstimate = Math.abs(weightedValue - median) / median < 0.3 
      ? weightedValue  // Within 30% of median
      : median;        // Use median if weighted value is an outlier

    // Enhanced confidence calculation
    const totalItems = results.reduce((sum, r) => sum + r.similar_items_count, 0);
    let enhancedConfidence = 0.5; // Base

    // Factor 1: Number of data sources
    if (results.length >= 3) enhancedConfidence += 0.2;
    else if (results.length >= 2) enhancedConfidence += 0.1;

    // Factor 2: Total comparable items
    if (totalItems >= 20) enhancedConfidence += 0.15;
    else if (totalItems >= 10) enhancedConfidence += 0.1;
    else if (totalItems >= 5) enhancedConfidence += 0.05;

    // Factor 3: Price consistency (coefficient of variation)
    const stdDev = Math.sqrt(
      sortedPrices.reduce((sum, p) => sum + Math.pow(p - average, 2), 0) / sortedPrices.length
    );
    const cv = stdDev / average; // Coefficient of variation
    if (cv < 0.2) enhancedConfidence += 0.15; // Very consistent
    else if (cv < 0.4) enhancedConfidence += 0.1; // Moderately consistent
    else if (cv < 0.6) enhancedConfidence += 0.05; // Some variance

    // Factor 4: Source confidence scores
    const avgSourceConfidence = totalConfidence / results.length;
    enhancedConfidence += avgSourceConfidence * 0.1;

    enhancedConfidence = Math.min(enhancedConfidence, 0.95); // Cap at 95%

    // Collect all comparable sales with source attribution
    const allComparableSales = results.flatMap(result =>
      result.comparable_items.map(item => ({
        source: result.source,
        title: item.title,
        price: item.price,
        condition: item.condition,
        date: item.date
      }))
    );

    // Sort by price and take representative sample across price range
    allComparableSales.sort((a, b) => b.price - a.price);
    const topComparables = allComparableSales.slice(0, 20);

    // Determine market insights based on comprehensive data
    const market_insights = this.analyzeMarketInsights(
      results,
      analysis,
      finalEstimate,
      totalItems
    );

    this.logger.info('Price consolidation complete', {
      estimated_value: finalEstimate,
      range: `${min}-${max}`,
      median,
      confidence: enhancedConfidence,
      totalDataPoints: sortedPrices.length
    });

    return {
      estimated_value: Math.round(finalEstimate * 100) / 100,
      price_range_min: Math.round(min * 100) / 100,
      price_range_max: Math.round(max * 100) / 100,
      currency: 'CAD',
      confidence: Math.round(enhancedConfidence * 100) / 100,
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
