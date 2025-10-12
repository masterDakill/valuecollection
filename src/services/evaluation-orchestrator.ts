// Orchestrateur principal pour coordonner toutes les évaluations
import { CollectionItem, PriceEvaluation, RecentSale, EvaluationRequest, EvaluationResponse, EvaluationSource } from '../types/collection';
import { EbayService } from './ebay-service';
import { AIAnalysisService } from './ai-analysis-service';

export class EvaluationOrchestrator {
  private ebayService: EbayService;
  private aiService: AIAnalysisService;
  private db: D1Database;

  constructor(db: D1Database, apiKeys: any) {
    this.db = db;
    
    // Initialisation des services API
    if (apiKeys.ebay) {
      this.ebayService = new EbayService(
        apiKeys.ebay.client_id,
        apiKeys.ebay.client_secret,
        apiKeys.ebay.sandbox || false
      );
    }

    if (apiKeys.openai) {
      this.aiService = new AIAnalysisService(
        apiKeys.openai.api_key,
        apiKeys.openai.model || 'gpt-4o'
      );
    }
  }

  // Point d'entrée principal pour évaluer un item
  async evaluateItem(request: EvaluationRequest): Promise<EvaluationResponse> {
    const startTime = Date.now();
    const item = request.item;

    try {
      // 1. Analyse IA de l'image si pas encore fait
      let aiAnalysis = null;
      if (!item.ai_analyzed && item.primary_image_url && this.aiService) {
        aiAnalysis = await this.aiService.analyzeImage(item.primary_image_url, item);
        if (aiAnalysis) {
          await this.saveAIAnalysis(aiAnalysis);
          
          // Mettre à jour les suggestions de catégorie si pertinentes
          if (aiAnalysis.confidence_category && aiAnalysis.confidence_category > 0.8) {
            await this.updateItemCategory(item.id, aiAnalysis.suggested_category, aiAnalysis.suggested_subcategory);
          }
        }
      }

      // 2. Déterminer les sources d'évaluation appropriées
      const sources = request.sources || this.determineBestSources(item);

      // 3. Exécuter les évaluations en parallèle
      const evaluationPromises = sources.map(source => 
        this.evaluateWithSource(item, source, request.force_refresh)
      );

      const evaluationResults = await Promise.allSettled(evaluationPromises);

      // 4. Collecter les résultats réussis
      const evaluations: PriceEvaluation[] = [];
      const recentSales: RecentSale[] = [];

      for (const result of evaluationResults) {
        if (result.status === 'fulfilled' && result.value) {
          if (result.value.evaluation) {
            evaluations.push(result.value.evaluation);
          }
          if (result.value.sales) {
            recentSales.push(...result.value.sales);
          }
        }
      }

      // 5. Sauvegarder les résultats
      await this.saveEvaluations(evaluations);
      await this.saveSales(recentSales);

      // 6. Mettre à jour le statut de l'item
      await this.updateItemStatus(item.id, evaluations.length > 0 ? 'completed' : 'error');

      return {
        success: true,
        evaluations,
        recent_sales: recentSales,
        processing_time_ms: Date.now() - startTime
      };

    } catch (error) {
      console.error('Evaluation orchestrator error:', error);
      
      await this.logError(item.id, 'evaluation', error.message);
      
      return {
        success: false,
        evaluations: [],
        recent_sales: [],
        error: error.message,
        processing_time_ms: Date.now() - startTime
      };
    }
  }

  // Détermine les meilleures sources d'évaluation selon l'item
  private determineBestSources(item: CollectionItem): EvaluationSource[] {
    const sources: EvaluationSource[] = [];

    // eBay - excellent pour la plupart des collectibles
    sources.push('ebay_sold_listings');

    // Sources spécifiques par catégorie
    switch (item.category) {
      case 'sports_cards':
        sources.push('sportscardspro');
        if (this.isHighValueItem(item)) {
          sources.push('heritage_auctions');
        }
        break;

      case 'books':
        sources.push('google_books');
        if (item.isbn) {
          sources.push('abebooks');
        }
        break;

      case 'trading_cards':
        sources.push('tcgplayer');
        sources.push('comc');
        break;

      case 'comics':
        sources.push('heritage_auctions');
        break;

      case 'vintage':
      case 'memorabilia':
        sources.push('worthpoint');
        break;
    }

    return sources;
  }

  // Vérifie si c'est un item de haute valeur (nécessite sources premium)
  private isHighValueItem(item: CollectionItem): boolean {
    // Heuristiques pour identifier les items de haute valeur
    const highValueKeywords = [
      'rookie', 'rc', 'gretzky', 'lemieux', 'orr', 'howe',
      'premier', 'première édition', 'limited', 'signed', 'auto'
    ];

    const titleLower = item.title.toLowerCase();
    return highValueKeywords.some(keyword => titleLower.includes(keyword));
  }

  // Évaluation avec une source spécifique
  private async evaluateWithSource(
    item: CollectionItem, 
    source: EvaluationSource, 
    forceRefresh = false
  ): Promise<{ evaluation?: PriceEvaluation; sales?: RecentSale[] } | null> {
    
    try {
      // Vérifier si on a déjà une évaluation récente (< 24h)
      if (!forceRefresh) {
        const existing = await this.getRecentEvaluation(item.id, source);
        if (existing) {
          return { evaluation: existing };
        }
      }

      // Exécuter l'évaluation selon la source
      switch (source) {
        case 'ebay_sold_listings':
          if (!this.ebayService) return null;
          
          const [evaluation, sales] = await Promise.all([
            this.ebayService.evaluatePrice(item),
            this.ebayService.searchSoldListings(item)
          ]);
          
          return { evaluation, sales };

        case 'sportscardspro':
          return await this.evaluateWithSportsCardsPro(item);

        case 'google_books':
          return await this.evaluateWithGoogleBooks(item);

        case 'worthpoint':
          return await this.evaluateWithWorthPoint(item);

        default:
          console.warn(`Evaluation source not implemented: ${source}`);
          return null;
      }

    } catch (error) {
      console.error(`Evaluation error for source ${source}:`, error);
      return null;
    }
  }

  // Évaluation SportCardsPro (simulation - API pas publique)
  private async evaluateWithSportsCardsPro(item: CollectionItem): Promise<{ evaluation?: PriceEvaluation } | null> {
    if (item.category !== 'sports_cards') return null;

    try {
      // Simulation d'appel API SportCardsPro
      // En réalité, utiliserait leur API ou scraping autorisé
      
      const mockEvaluation: PriceEvaluation = {
        id: 0,
        item_id: item.id,
        evaluation_source: 'sportscardspro',
        estimated_value: 0, // À implémenter avec vraie API
        currency: 'CAD',
        confidence_score: 0.75,
        similar_items_count: 0,
        evaluation_date: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        is_active: true
      };

      return { evaluation: mockEvaluation };

    } catch (error) {
      console.error('SportCardsPro evaluation error:', error);
      return null;
    }
  }

  // Évaluation Google Books API
  private async evaluateWithGoogleBooks(item: CollectionItem): Promise<{ evaluation?: PriceEvaluation } | null> {
    if (item.category !== 'books') return null;

    try {
      let searchQuery = item.title;
      if (item.isbn) {
        searchQuery = `isbn:${item.isbn}`;
      }

      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&key=${process.env.GOOGLE_BOOKS_API_KEY}`
      );

      if (!response.ok) return null;

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) return null;

      // Analyser les résultats pour estimer la valeur
      const book = data.items[0].volumeInfo;
      
      // Note: Google Books API ne fournit pas directement les prix de marché
      // Il faudrait combiner avec d'autres sources (AbeBooks, Amazon, etc.)
      
      const evaluation: PriceEvaluation = {
        id: 0,
        item_id: item.id,
        evaluation_source: 'google_books',
        estimated_value: 0, // À calculer basé sur rareté, année, etc.
        currency: 'CAD',
        confidence_score: 0.60,
        similar_items_count: data.totalItems,
        evaluation_date: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        is_active: true,
        raw_api_data: JSON.stringify(book)
      };

      return { evaluation };

    } catch (error) {
      console.error('Google Books evaluation error:', error);
      return null;
    }
  }

  // Évaluation WorthPoint (simulation)
  private async evaluateWithWorthPoint(item: CollectionItem): Promise<{ evaluation?: PriceEvaluation } | null> {
    // WorthPoint nécessite un scraping autorisé ou partenariat
    // Simulation pour l'exemple
    
    const evaluation: PriceEvaluation = {
      id: 0,
      item_id: item.id,
      evaluation_source: 'worthpoint',
      estimated_value: 0,
      currency: 'CAD',
      confidence_score: 0.70,
      evaluation_date: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      is_active: true
    };

    return { evaluation };
  }

  // Sauvegarde des évaluations en base
  private async saveEvaluations(evaluations: PriceEvaluation[]): Promise<void> {
    if (evaluations.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO price_evaluations (
        item_id, evaluation_source, estimated_value, currency,
        price_range_min, price_range_max, condition_matched,
        similar_items_count, confidence_score, evaluation_date,
        last_updated, is_active, raw_api_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const evaluation of evaluations) {
      await stmt.bind(
        evaluation.item_id,
        evaluation.evaluation_source,
        evaluation.estimated_value,
        evaluation.currency,
        evaluation.price_range_min,
        evaluation.price_range_max,
        evaluation.condition_matched,
        evaluation.similar_items_count,
        evaluation.confidence_score,
        evaluation.evaluation_date,
        evaluation.last_updated,
        evaluation.is_active,
        evaluation.raw_api_data
      ).run();
    }
  }

  // Sauvegarde des ventes récentes
  private async saveSales(sales: RecentSale[]): Promise<void> {
    if (sales.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO recent_sales (
        item_id, sale_platform, sale_date, sale_price, currency,
        sold_condition, sold_title, sold_description, sold_item_url,
        similarity_score, verified_sale, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const sale of sales) {
      await stmt.bind(
        sale.item_id,
        sale.sale_platform,
        sale.sale_date,
        sale.sale_price,
        sale.currency,
        sale.sold_condition,
        sale.sold_title,
        sale.sold_description,
        sale.sold_item_url,
        sale.similarity_score,
        sale.verified_sale,
        sale.created_at
      ).run();
    }
  }

  // Sauvegarde de l'analyse IA
  private async saveAIAnalysis(analysis: AIAnalysis): Promise<void> {
    await this.db.prepare(`
      INSERT INTO ai_analysis (
        item_id, detected_objects, text_extracted, colors_dominant,
        image_quality_score, suggested_category, suggested_subcategory,
        confidence_category, analysis_model, analysis_date, processing_time_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      analysis.item_id,
      analysis.detected_objects,
      analysis.text_extracted,
      analysis.colors_dominant,
      analysis.image_quality_score,
      analysis.suggested_category,
      analysis.suggested_subcategory,
      analysis.confidence_category,
      analysis.analysis_model,
      analysis.analysis_date,
      analysis.processing_time_ms
    ).run();
  }

  // Helpers pour base de données
  private async getRecentEvaluation(itemId: number, source: EvaluationSource): Promise<PriceEvaluation | null> {
    const result = await this.db.prepare(`
      SELECT * FROM price_evaluations 
      WHERE item_id = ? AND evaluation_source = ? 
        AND is_active = 1 
        AND evaluation_date > datetime('now', '-24 hours')
      ORDER BY evaluation_date DESC LIMIT 1
    `).bind(itemId, source).first();

    return result as PriceEvaluation || null;
  }

  private async updateItemStatus(itemId: number, status: string): Promise<void> {
    await this.db.prepare(`
      UPDATE collection_items 
      SET processing_status = ?, last_evaluation_date = ?, updated_at = ?
      WHERE id = ?
    `).bind(status, new Date().toISOString(), new Date().toISOString(), itemId).run();
  }

  private async updateItemCategory(itemId: number, category?: string, subcategory?: string): Promise<void> {
    if (!category) return;
    
    await this.db.prepare(`
      UPDATE collection_items 
      SET category = ?, subcategory = ?, ai_analyzed = 1, updated_at = ?
      WHERE id = ?
    `).bind(category, subcategory, new Date().toISOString(), itemId).run();
  }

  private async logError(itemId: number, actionType: string, errorMessage: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO activity_logs (item_id, action_type, status, error_message, created_at)
      VALUES (?, ?, 'error', ?, ?)
    `).bind(itemId, actionType, errorMessage, new Date().toISOString()).run();
  }

  // Évaluation en lot pour performance
  async evaluateBatch(items: CollectionItem[], maxConcurrent = 5): Promise<EvaluationResponse[]> {
    const results: EvaluationResponse[] = [];
    
    for (let i = 0; i < items.length; i += maxConcurrent) {
      const batch = items.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(item => 
        this.evaluateItem({ item })
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            evaluations: [],
            recent_sales: [],
            error: result.reason.message
          });
        }
      });

      // Délai entre batches pour respecter rate limits
      if (i + maxConcurrent < items.length) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    return results;
  }
}