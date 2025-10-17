// Évaluateur Amélioré - Orchestrateur Principal avec Analyse Intelligente
import { SmartAnalyzer, SmartAnalysisResult } from './smart-analyzer';
import { DiscogsService } from './discogs-service';
import { BooksService } from './books-service';
import { EbayService } from './ebay-service';
import { CollectionItem, PriceEvaluation, EvaluationResponse, ItemCategory } from '../types/collection';

export interface EnhancedEvaluationRequest {
  // Input principal
  imageUrl?: string;
  videoUrl?: string;
  textInput?: string; // "Abbey Road The Beatles" ou "Les Anciens Canadiens Philippe Aubert de Gaspé"
  filename?: string;
  
  // Métadonnées optionnelles (pour override)
  category?: ItemCategory;
  force_refresh?: boolean;
  evaluation_sources?: string[];
}

export interface EnhancedEvaluationResponse extends EvaluationResponse {
  smart_analysis: SmartAnalysisResult;
  matching_confidence: number;
  suggested_improvements: string[];
  market_insights: {
    rarity_assessment: string;
    market_trend: 'increasing' | 'stable' | 'decreasing';
    comparable_sales: number;
    estimated_demand: 'high' | 'medium' | 'low';
  };
}

export class EnhancedEvaluator {
  private smartAnalyzer: SmartAnalyzer;
  private discogsService?: DiscogsService;
  private booksService?: BooksService;
  private ebayService?: EbayService;
  private db: D1Database;

  constructor(db: D1Database, apiKeys: any) {
    this.db = db;
    
    // MODE DÉMO: Toujours instancier l'analyseur intelligent
    this.smartAnalyzer = new SmartAnalyzer(apiKeys.openai?.api_key || 'demo-key');
    
    // Services spécialisés (optionnels si vraies clés disponibles)
    if (apiKeys.discogs && apiKeys.discogs.api_key !== 'demo-key') {
      this.discogsService = new DiscogsService(apiKeys.discogs.api_key);
    }
    
    if (apiKeys.google_books && apiKeys.google_books.api_key !== 'demo-key') {
      this.booksService = new BooksService(apiKeys.google_books.api_key);
    }

    if (apiKeys.ebay && apiKeys.ebay.client_id !== 'demo-key') {
      this.ebayService = new EbayService(
        apiKeys.ebay.client_id,
        apiKeys.ebay.client_secret,
        apiKeys.ebay.sandbox || false
      );
    }
  }

  // Point d'entrée principal - Évaluation complète et intelligente
  async evaluateItem(request: EnhancedEvaluationRequest): Promise<EnhancedEvaluationResponse> {
    const startTime = Date.now();

    try {
      // 1. Analyse intelligente multi-input
      console.log('🔍 Démarrage analyse intelligente...');
      const smartAnalysis = await this.smartAnalyzer.analyzeMedia({
        imageUrl: request.imageUrl,
        videoUrl: request.videoUrl,
        textInput: request.textInput,
        filename: request.filename
      });

      console.log(`📊 Analyse terminée - Catégorie: ${smartAnalysis.category} (${Math.round(smartAnalysis.confidence * 100)}%)`);

      // 2. Sélection des sources d'évaluation optimales
      const evaluationSources = request.evaluation_sources || 
        this.selectOptimalSources(smartAnalysis, request.category);

      console.log(`🎯 Sources sélectionnées: ${evaluationSources.join(', ')}`);

      // 3. Évaluations parallèles par sources spécialisées
      const evaluationPromises = evaluationSources.map(source => 
        this.evaluateWithSpecializedSource(source, smartAnalysis)
      );

      const evaluationResults = await Promise.allSettled(evaluationPromises);

      // 4. Consolidation des résultats
      const evaluations: PriceEvaluation[] = [];
      const recentSales: any[] = [];

      evaluationResults.forEach((result, index) => {
        const source = evaluationSources[index];
        
        if (result.status === 'fulfilled' && result.value) {
          console.log(`✅ ${source}: Évaluation réussie`);
          
          if (result.value.evaluation) {
            evaluations.push(result.value.evaluation);
          }
          if (result.value.sales) {
            recentSales.push(...result.value.sales);
          }
        } else {
          console.log(`❌ ${source}: Échec évaluation`);
        }
      });

      // 5. Analyse du marché et insights
      const marketInsights = this.generateMarketInsights(smartAnalysis, evaluations);
      
      // 6. Suggestions d'amélioration
      const suggestions = this.generateSuggestions(smartAnalysis, request, evaluations);

      // 7. Calcul de confiance globale
      const matchingConfidence = this.calculateOverallConfidence(smartAnalysis, evaluations);

      console.log(`🎉 Évaluation terminée: ${evaluations.length} évaluations obtenues`);

      return {
        success: true,
        evaluations,
        recent_sales: recentSales,
        smart_analysis: smartAnalysis,
        matching_confidence: matchingConfidence,
        suggested_improvements: suggestions,
        market_insights: marketInsights,
        processing_time_ms: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Erreur évaluation améliorée:', error);
      
      return {
        success: false,
        evaluations: [],
        recent_sales: [],
        smart_analysis: {
          category: 'other',
          confidence: 0,
          extracted_data: {},
          market_identifiers: {},
          search_queries: [],
          estimated_rarity: 'common'
        },
        matching_confidence: 0,
        suggested_improvements: ['Erreur lors de l\'analyse. Vérifiez la qualité de l\'image ou des données.'],
        market_insights: {
          rarity_assessment: 'Indéterminé',
          market_trend: 'stable',
          comparable_sales: 0,
          estimated_demand: 'low'
        },
        error: error.message,
        processing_time_ms: Date.now() - startTime
      };
    }
  }

  // Sélection intelligente des sources selon le type d'objet
  private selectOptimalSources(analysis: SmartAnalysisResult, categoryOverride?: ItemCategory): string[] {
    const category = categoryOverride || analysis.category;
    const sources: string[] = [];

    // Toujours inclure eBay (source universelle)
    if (this.ebayService) {
      sources.push('ebay');
    }

    // Sources spécialisées selon catégorie
    switch (category) {
      case 'records':
      case 'cds':
        if (this.discogsService) {
          sources.unshift('discogs'); // Priorité à Discogs pour la musique
        }
        break;

      case 'books':
        if (this.booksService) {
          sources.unshift('books'); // Priorité aux services livres
        }
        break;

      case 'sports_cards':
        sources.push('sportscardspro');
        break;

      case 'vintage':
      case 'memorabilia':
        sources.push('worthpoint');
        break;
    }

    return sources.slice(0, 3); // Max 3 sources pour éviter rate limiting
  }

  // Évaluation avec source spécialisée
  private async evaluateWithSpecializedSource(
    source: string,
    analysis: SmartAnalysisResult
  ): Promise<{ evaluation?: PriceEvaluation; sales?: any[] } | null> {
    
    try {
      switch (source) {
        case 'discogs':
          if (!this.discogsService) return null;
          
          console.log('🎵 Recherche Discogs...');
          const releases = await this.discogsService.searchReleases(analysis);
          
          if (releases.length > 0) {
            console.log(`📀 Trouvé ${releases.length} releases sur Discogs`);
            const evaluation = await this.discogsService.generatePriceEvaluation(0, analysis, releases);
            return { evaluation };
          }
          break;

        case 'books':
          if (!this.booksService) return null;
          
          console.log('📚 Recherche services livres...');
          const bookEvaluation = await this.booksService.generateBookPriceEvaluation(0, analysis);
          return { evaluation: bookEvaluation };

        case 'ebay':
          if (!this.ebayService) return null;
          
          console.log('🛒 Recherche eBay...');
          // Créer un item temporaire pour l'évaluation eBay
          const tempItem: CollectionItem = {
            id: 0,
            collection_id: 1,
            title: analysis.extracted_data.title || 'Unknown Item',
            category: analysis.category,
            condition_grade: analysis.extracted_data.condition as any,
            year_made: analysis.extracted_data.year,
            manufacturer: analysis.extracted_data.publisher_label,
            processing_status: 'processing',
            ai_analyzed: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const [ebayEvaluation, ebaySales] = await Promise.all([
            this.ebayService.evaluatePrice(tempItem),
            this.ebayService.searchSoldListings(tempItem)
          ]);

          return { 
            evaluation: ebayEvaluation, 
            sales: ebaySales 
          };

        default:
          console.log(`⚠️ Source non implémentée: ${source}`);
          return null;
      }
      
      return null;

    } catch (error) {
      console.error(`❌ Erreur source ${source}:`, error);
      return null;
    }
  }

  // Génération d'insights marché
  private generateMarketInsights(
    analysis: SmartAnalysisResult, 
    evaluations: PriceEvaluation[]
  ): any {
    
    // Évaluation de rareté textuelle
    let rarityText = '';
    switch (analysis.estimated_rarity) {
      case 'ultra_rare':
        rarityText = 'Extrêmement rare - Article de collection de très haute valeur';
        break;
      case 'very_rare':
        rarityText = 'Très rare - Valeur de collection significative';
        break;
      case 'rare':
        rarityText = 'Rare - Intérêt des collectionneurs';
        break;
      case 'uncommon':
        rarityText = 'Peu commun - Valeur au-dessus de la moyenne';
        break;
      default:
        rarityText = 'Commun - Valeur de marché standard';
    }

    // Analyse des prix pour trend
    const prices = evaluations
      .map(e => e.estimated_value)
      .filter(p => p && p > 0) as number[];

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    let demand: 'high' | 'medium' | 'low' = 'medium';

    if (prices.length > 0) {
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      
      // Estimation demand basée sur nombre de sources et prix
      if (evaluations.length >= 3 && avgPrice > 100) {
        demand = 'high';
      } else if (evaluations.length >= 2 && avgPrice > 25) {
        demand = 'medium';
      } else {
        demand = 'low';
      }

      // Estimation trend (simplifié - en production utiliserait données historiques)
      if (analysis.estimated_rarity === 'rare' || analysis.estimated_rarity === 'very_rare') {
        trend = 'increasing';
      }
    }

    return {
      rarity_assessment: rarityText,
      market_trend: trend,
      comparable_sales: evaluations.reduce((sum, e) => sum + (e.similar_items_count || 0), 0),
      estimated_demand: demand
    };
  }

  // Suggestions d'amélioration
  private generateSuggestions(
    analysis: SmartAnalysisResult,
    request: EnhancedEvaluationRequest,
    evaluations: PriceEvaluation[]
  ): string[] {
    
    const suggestions: string[] = [];

    // Suggestions basées sur la qualité de l'analyse
    if (analysis.confidence < 0.7) {
      if (!request.imageUrl) {
        suggestions.push('📸 Ajoutez une photo claire pour améliorer la précision de l\'évaluation');
      } else {
        suggestions.push('📸 Essayez une photo plus nette avec un meilleur éclairage');
      }
    }

    if (!analysis.extracted_data.year) {
      suggestions.push('📅 Indiquez l\'année de publication/production pour une évaluation plus précise');
    }

    if (!analysis.extracted_data.condition) {
      suggestions.push('🔍 Spécifiez l\'état de conservation (mint, excellent, bon, etc.)');
    }

    if (!analysis.market_identifiers.isbn_13 && analysis.category === 'books') {
      suggestions.push('📖 Recherchez le code ISBN pour une identification parfaite');
    }

    // Suggestions basées sur les résultats d'évaluation
    if (evaluations.length === 0) {
      suggestions.push('🔍 Essayez une recherche manuelle sur eBay, Discogs ou sites spécialisés');
      suggestions.push('📝 Vérifiez l\'orthographe du titre et de l\'auteur/artiste');
    } else if (evaluations.length === 1) {
      suggestions.push('📊 Consultez plusieurs sources pour confirmer la valeur estimée');
    }

    // Suggestions pour améliorer la valeur
    if (analysis.estimated_rarity !== 'common') {
      suggestions.push('💎 Objet rare détecté - Consultez un expert pour certification authentique');
    }

    const avgConfidence = evaluations.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / evaluations.length;
    if (avgConfidence < 0.7) {
      suggestions.push('🎯 Données insuffisantes - Ajoutez plus d\'informations (éditeur, label, etc.)');
    }

    return suggestions.slice(0, 5); // Max 5 suggestions
  }

  // Calcul de confiance globale
  private calculateOverallConfidence(
    analysis: SmartAnalysisResult,
    evaluations: PriceEvaluation[]
  ): number {
    
    let confidence = analysis.confidence * 0.4; // 40% de poids pour l'analyse

    if (evaluations.length > 0) {
      const avgEvalConfidence = evaluations.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / evaluations.length;
      confidence += avgEvalConfidence * 0.6; // 60% de poids pour les évaluations
    } else {
      confidence *= 0.5; // Pénalité si aucune évaluation
    }

    // Bonus/malus selon qualité des données
    if (analysis.market_identifiers.isbn_13 || analysis.market_identifiers.isbn_10) {
      confidence += 0.1; // Bonus ISBN
    }
    
    if (analysis.extracted_data.year && analysis.extracted_data.condition) {
      confidence += 0.05; // Bonus métadonnées complètes
    }

    if (evaluations.length >= 3) {
      confidence += 0.05; // Bonus sources multiples
    }

    return Math.min(Math.max(confidence, 0.0), 1.0); // Clamp entre 0 et 1
  }

  // Sauvegarde des résultats enrichis
  async saveEnhancedResults(itemId: number, response: EnhancedEvaluationResponse): Promise<void> {
    try {
      // Sauvegarder l'analyse intelligente
      await this.db.prepare(`
        INSERT OR REPLACE INTO ai_analysis (
          item_id, detected_objects, text_extracted, suggested_category,
          suggested_subcategory, confidence_category, analysis_model,
          analysis_date, processing_time_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        itemId,
        JSON.stringify(response.smart_analysis.extracted_data),
        JSON.stringify(response.smart_analysis.search_queries),
        response.smart_analysis.category,
        response.smart_analysis.extracted_data.format || '',
        response.smart_analysis.confidence,
        'smart_analyzer_v1',
        new Date().toISOString(),
        response.processing_time_ms
      ).run();

      // Sauvegarder les évaluations
      for (const evaluation of response.evaluations) {
        await this.db.prepare(`
          INSERT INTO price_evaluations (
            item_id, evaluation_source, estimated_value, currency,
            price_range_min, price_range_max, condition_matched,
            similar_items_count, confidence_score, evaluation_date,
            last_updated, is_active, raw_api_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          itemId, evaluation.evaluation_source, evaluation.estimated_value,
          evaluation.currency, evaluation.price_range_min, evaluation.price_range_max,
          evaluation.condition_matched, evaluation.similar_items_count,
          evaluation.confidence_score, evaluation.evaluation_date,
          evaluation.last_updated, evaluation.is_active, evaluation.raw_api_data
        ).run();
      }

      // Log de succès
      await this.db.prepare(`
        INSERT INTO activity_logs (
          item_id, action_type, action_description, status, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(
        itemId,
        'enhanced_evaluation',
        `Évaluation intelligente complétée: ${response.evaluations.length} sources, confiance ${Math.round(response.matching_confidence * 100)}%`,
        'success',
        new Date().toISOString()
      ).run();

    } catch (error) {
      console.error('Erreur sauvegarde résultats:', error);
      throw error;
    }
  }
}