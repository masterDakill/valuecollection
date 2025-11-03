// Service d'intégration eBay pour évaluations de prix
import { CollectionItem, PriceEvaluation, RecentSale } from '../types/collection';

export class EbayService {
  private clientId: string;
  private clientSecret: string;
  private sandbox: boolean;
  private baseUrl: string;
  private accessToken?: string;
  private tokenExpiry?: number;
  private userToken?: string; // OAuth User Token for enhanced permissions

  constructor(clientId: string, clientSecret: string, sandbox = false, userToken?: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.sandbox = sandbox;
    this.userToken = userToken;
    this.baseUrl = sandbox 
      ? 'https://api.sandbox.ebay.com' 
      : 'https://api.ebay.com';
  }

  // Authentification OAuth2
  private async getAccessToken(): Promise<string> {
    // If we have a User Token, use it (provides more permissions like soldItemsOnly)
    if (this.userToken) {
      return this.userToken;
    }

    // Otherwise fall back to client credentials (limited permissions)
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = btoa(`${this.clientId}:${this.clientSecret}`);
    const response = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
    });

    if (!response.ok) {
      throw new Error(`eBay auth failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer

    return this.accessToken;
  }

  // Recherche d'items similaires vendus
  async searchSoldListings(item: CollectionItem): Promise<RecentSale[]> {
    try {
      const token = await this.getAccessToken();
      const searchTerms = this.buildSearchTerms(item);
      
      // Try with soldItemsOnly filter first
      let params = new URLSearchParams({
        q: searchTerms,
        limit: '50',
        filter: 'conditionIds:{3000|4000|5000},deliveryCountry:CA,soldItemsOnly:true',
        sort: 'endTime'
      });

      let response = await fetch(
        `${this.baseUrl}/buy/browse/v1/item_summary/search?${params}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_CA',
            'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country%3DCA'
          }
        }
      );

      // If soldItemsOnly fails (requires advanced permissions), try without it
      if (!response.ok && response.status === 403) {
        console.warn('eBay soldItemsOnly requires advanced permissions, falling back to active listings');
        params = new URLSearchParams({
          q: searchTerms,
          limit: '50',
          filter: 'conditionIds:{3000|4000|5000},deliveryCountry:CA',
          sort: 'price'
        });

        response = await fetch(
          `${this.baseUrl}/buy/browse/v1/item_summary/search?${params}`, 
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-EBAY-C-MARKETPLACE-ID': 'EBAY_CA',
              'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country%3DCA'
            }
          }
        );
      }

      // If still 403, try Finding API (no OAuth required)
      if (!response.ok && response.status === 403) {
        console.warn('eBay Browse API 403, falling back to Finding API (no OAuth)');
        return await this.searchUsingFindingAPI(searchTerms, item.id);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`eBay API error: ${response.status} - ${errorText}`);
        return [];
      }

      const data = await response.json();
      return this.parseEbaySales(data.itemSummaries || [], item.id);

    } catch (error) {
      console.error('eBay search error:', error);
      return [];
    }
  }

  // Fallback to Finding API (older API, no OAuth required, just App ID)
  private async searchUsingFindingAPI(keywords: string, itemId: number): Promise<RecentSale[]> {
    try {
      const findingBaseUrl = this.sandbox 
        ? 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1'
        : 'https://svcs.ebay.com/services/search/FindingService/v1';

      const params = new URLSearchParams({
        'OPERATION-NAME': 'findCompletedItems',
        'SERVICE-VERSION': '1.13.0',
        'SECURITY-APPNAME': this.clientId,
        'RESPONSE-DATA-FORMAT': 'JSON',
        'REST-PAYLOAD': '',
        'keywords': keywords,
        'paginationInput.entriesPerPage': '100',
        'sortOrder': 'EndTimeSoonest',
        'itemFilter(0).name': 'SoldItemsOnly',
        'itemFilter(0).value': 'true',
        'itemFilter(1).name': 'Condition',
        'itemFilter(1).value': 'Used'
      });

      const response = await fetch(`${findingBaseUrl}?${params}`);

      if (!response.ok) {
        console.error(`Finding API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const searchResult = data.findCompletedItemsResponse?.[0]?.searchResult?.[0];
      
      if (!searchResult?.item) {
        return [];
      }

      // Parse Finding API results into RecentSale format
      return searchResult.item.map((ebayItem: any) => {
        const sellingStatus = ebayItem.sellingStatus?.[0];
        const price = sellingStatus?.currentPrice?.[0];
        
        const sale: RecentSale = {
          id: 0,
          item_id: itemId,
          sale_platform: 'ebay',
          sale_date: ebayItem.listingInfo?.[0]?.endTime?.[0] || new Date().toISOString(),
          sale_price: price?.__value__ ? parseFloat(price.__value__) : undefined,
          currency: price?.['@currencyId'] || 'CAD',
          sold_condition: this.mapEbayCondition(ebayItem.condition?.[0]?.conditionDisplayName?.[0] || 'GOOD'),
          sold_title: ebayItem.title?.[0]?.substring(0, 255),
          sold_description: ebayItem.subtitle?.[0]?.substring(0, 500),
          sold_item_url: ebayItem.viewItemURL?.[0],
          similarity_score: this.calculateSimilarity(ebayItem.title?.[0] || ''),
          verified_sale: true,
          created_at: new Date().toISOString()
        };
        
        return sale;
      }).filter((sale: RecentSale) => sale.sale_price && sale.sale_price > 0);

    } catch (error) {
      console.error('Finding API error:', error);
      return [];
    }
  }

  // Construction intelligente des termes de recherche
  private buildSearchTerms(item: CollectionItem): string {
    const terms: string[] = [];
    
    // Titre principal (nettoyé)
    if (item.title) {
      const cleanTitle = item.title
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      terms.push(`"${cleanTitle}"`);
    }

    // Année si importante pour la valeur
    if (item.year_made && item.category === 'sports_cards') {
      terms.push(item.year_made.toString());
    }

    // Fabricant pour cartes/objets manufacturés
    if (item.manufacturer && ['sports_cards', 'trading_cards', 'vintage'].includes(item.category)) {
      terms.push(item.manufacturer);
    }

    // Mots-clés spécifiques par catégorie
    switch (item.category) {
      case 'sports_cards':
        terms.push('card', 'hockey', 'baseball');
        break;
      case 'books':
        if (item.isbn) terms.push(`isbn:${item.isbn}`);
        terms.push('book', 'edition');
        break;
      case 'comics':
        terms.push('comic', 'issue');
        break;
      case 'vintage':
        terms.push('vintage', 'antique');
        break;
    }

    return terms.join(' ');
  }

  // Conversion des résultats eBay en RecentSale
  private parseEbaySales(items: any[], itemId: number): RecentSale[] {
    return items.map(ebayItem => {
      const sale: RecentSale = {
        id: 0, // Sera généré par la DB
        item_id: itemId,
        sale_platform: 'ebay',
        sale_date: ebayItem.itemEndDate || new Date().toISOString(),
        sale_price: ebayItem.price?.value ? parseFloat(ebayItem.price.value) : undefined,
        currency: ebayItem.price?.currency || 'CAD',
        sold_condition: this.mapEbayCondition(ebayItem.condition),
        sold_title: ebayItem.title?.substring(0, 255),
        sold_description: ebayItem.shortDescription?.substring(0, 500),
        sold_item_url: ebayItem.itemWebUrl,
        similarity_score: this.calculateSimilarity(ebayItem.title || ''),
        verified_sale: true, // eBay sold listings sont vérifiées
        created_at: new Date().toISOString()
      };
      
      return sale;
    });
  }

  // Mapping des conditions eBay vers nos standards
  private mapEbayCondition(condition: string): string {
    const conditionMap: { [key: string]: string } = {
      'NEW': 'mint',
      'LIKE_NEW': 'near_mint', 
      'EXCELLENT': 'excellent',
      'VERY_GOOD': 'very_good',
      'GOOD': 'good',
      'ACCEPTABLE': 'fair'
    };
    
    return conditionMap[condition] || 'good';
  }

  // Calcul basique de similarité (peut être amélioré avec ML)
  private calculateSimilarity(title: string): number {
    // Implémentation simple - peut être améliorée avec algorithmes ML
    // Pour l'instant, score basé sur la longueur du titre
    const wordCount = title.split(' ').length;
    if (wordCount >= 5) return 0.85;
    if (wordCount >= 3) return 0.70;
    return 0.50;
  }

  // Évaluation de prix basée sur les ventes récentes
  async evaluatePrice(item: CollectionItem): Promise<PriceEvaluation | null> {
    try {
      const sales = await this.searchSoldListings(item);
      
      if (sales.length === 0) {
        return null;
      }

      // Filtrer les ventes avec prix valides
      const validSales = sales.filter(sale => 
        sale.sale_price && sale.sale_price > 0
      );

      if (validSales.length === 0) {
        return null;
      }

      // Calculs statistiques
      const prices = validSales.map(sale => sale.sale_price!);
      const sortedPrices = prices.sort((a, b) => a - b);
      
      const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      
      // Estimation basée sur la médiane (plus robuste que la moyenne)
      const estimatedValue = median;
      
      // Confidence basée sur le nombre de ventes et leur dispersion
      const priceVariance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
      const coefficientVariation = Math.sqrt(priceVariance) / mean;
      
      let confidence = 0.6; // Base
      if (validSales.length >= 10) confidence += 0.2;
      if (validSales.length >= 5) confidence += 0.1;
      if (coefficientVariation < 0.3) confidence += 0.1; // Prix cohérents
      
      confidence = Math.min(confidence, 0.95); // Max 95%

      const evaluation: PriceEvaluation = {
        id: 0,
        item_id: item.id,
        evaluation_source: 'ebay_sold_listings',
        estimated_value: estimatedValue,
        currency: 'CAD',
        price_range_min: min,
        price_range_max: max,
        condition_matched: item.condition_grade || 'unknown',
        similar_items_count: validSales.length,
        confidence_score: confidence,
        evaluation_date: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        is_active: true,
        raw_api_data: JSON.stringify({
          search_terms: this.buildSearchTerms(item),
          total_found: sales.length,
          valid_sales: validSales.length,
          price_statistics: {
            mean,
            median,
            min,
            max,
            standard_deviation: Math.sqrt(priceVariance)
          }
        })
      };

      return evaluation;

    } catch (error) {
      console.error('eBay evaluation error:', error);
      return null;
    }
  }

  // Recherche d'items actifs (pour comparaison avec le marché actuel)
  async searchActiveListings(item: CollectionItem): Promise<any[]> {
    const token = await this.getAccessToken();
    const searchTerms = this.buildSearchTerms(item);
    
    const params = new URLSearchParams({
      q: searchTerms,
      limit: '25',
      filter: 'conditionIds:{3000|4000|5000},deliveryCountry:CA',
      sort: 'price' // Prix croissant
    });

    try {
      const response = await fetch(
        `${this.baseUrl}/buy/browse/v1/item_summary/search?${params}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_CA'
          }
        }
      );

      const data = await response.json();
      return data.itemSummaries || [];

    } catch (error) {
      console.error('eBay active listings error:', error);
      return [];
    }
  }
}