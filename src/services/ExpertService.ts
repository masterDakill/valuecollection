// 🧠 Unified Expert Service
// Manages multiple AI experts with weighted consolidation

import { MultiExpertAISystem } from '../ai-experts';
import { Logger } from '../lib/logger';
import { Metrics } from '../lib/metrics';
import {
  CategorySchema,
  ConditionSchema,
  ExtractedDataSchema,
  SmartAnalysisSchema,
  ConsolidatedAnalysisSchema
} from '../schemas/evaluate.schema';
import { z } from 'zod';

export type ExpertType = 'vision' | 'claude' | 'gemini';
export type Category = z.infer<typeof CategorySchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type ExtractedData = z.infer<typeof ExtractedDataSchema>;

export interface ExpertInput {
  mode: 'text' | 'image' | 'video' | 'mixed';
  text_input?: string;
  imageUrls?: string[];
  videoUrl?: string;
  category?: Category;
}

export interface ExpertAnalysis {
  expert: ExpertType;
  category: Category;
  confidence: number;
  extracted_data: ExtractedData;
  estimated_rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'ultra_rare';
  search_queries: string[];
  latency_ms: number;
  raw_payload?: any; // Original response for debugging
}

export interface ConsolidatedResult {
  consensus_category: Category;
  consensus_title: string;
  consensus_author_artist?: string;
  consensus_year?: number;
  estimated_value: {
    min: number;
    max: number;
    average: number;
    confidence: number;
  };
  rarity_assessment: {
    score: number; // 1-10
    level: 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Extremely Rare';
    factors: string[];
  };
  expert_consensus: number; // 0-100%
  action_recommendations: string[];
  comparable_sales: string[];
  expert_analyses: ExpertAnalysis[];
  explanation: string; // Human-readable explanation of consolidation
}

export class ExpertService {
  private aiSystem: MultiExpertAISystem;
  private logger: Logger;

  constructor(env: any, logger: Logger) {
    this.aiSystem = new MultiExpertAISystem(env);
    this.logger = logger;
  }

  /**
   * Query all experts in parallel
   */
  async queryExperts(
    input: ExpertInput,
    enabledExperts: ExpertType[] = ['vision', 'claude', 'gemini']
  ): Promise<ExpertAnalysis[]> {
    const startTime = Date.now();

    try {
      // Use the existing MultiExpertAISystem
      const imageUrl = input.imageUrls && input.imageUrls.length > 0 ? input.imageUrls[0] : undefined;
      const result = await this.aiSystem.analyzeCollection(imageUrl, input.text_input, { category: input.category });

      // Convert result to ExpertAnalysis format
      const analysis: ExpertAnalysis = {
        expert: 'vision', // Primary expert used
        category: this.normalizeCategory(result.consensus_category),
        confidence: result.expert_consensus / 100,
        extracted_data: {
          title: result.consensus_title,
          artist_author: result.consensus_author_artist,
          year: result.consensus_year,
          condition: this.mapConditionFromAnalysis(result),
          format: undefined,
          publisher_label: undefined,
          manufacturer: undefined,
          edition: undefined,
          isbn: undefined,
          catalog_number: undefined,
          dimensions: undefined,
          weight: undefined,
          materials: []
        },
        estimated_rarity: this.mapRarityLevel(result.rarity_assessment.level),
        search_queries: result.comparable_sales || [],
        latency_ms: Date.now() - startTime,
        raw_payload: result
      };

      this.logger.info('Expert analysis completed', {
        category: analysis.category,
        confidence: analysis.confidence,
        latency_ms: analysis.latency_ms
      });

      return [analysis];

    } catch (error: any) {
      this.logger.error('Expert analysis failed', error);
      return [];
    }
  }

  /**
   * Helper: Map rarity level to our format
   */
  private mapRarityLevel(level: string): 'common' | 'uncommon' | 'rare' | 'very_rare' | 'ultra_rare' {
    const normalized = level.toLowerCase().replace(/\s+/g, '_');
    if (normalized.includes('extremely')) return 'ultra_rare';
    if (normalized.includes('very')) return 'very_rare';
    if (normalized.includes('rare')) return 'rare';
    if (normalized.includes('uncommon')) return 'uncommon';
    return 'common';
  }

  /**
   * Helper: Map condition from analysis
   */
  private mapConditionFromAnalysis(result: any): string | undefined {
    // Try to extract condition from market_analysis or other fields
    return undefined; // Simplified for now
  }

  /**
   * Consolidate multiple expert analyses into consensus
   */
  consolidateAnalyses(analyses: ExpertAnalysis[]): ConsolidatedResult {
    if (analyses.length === 0) {
      throw new Error('No expert analyses to consolidate');
    }

    // Weighted voting for category
    const consensus_category = this.weightedCategoryVote(analyses);

    // Consolidate extracted data
    const consolidated_data = this.consolidateExtractedData(analyses);

    // Calculate expert consensus percentage
    const expert_consensus = this.calculateConsensus(analyses);

    // Consolidate rarity assessment
    const rarity_assessment = this.consolidateRarity(analyses);

    // Generate value estimation (placeholder - would integrate with price services)
    const estimated_value = {
      min: 0,
      max: 0,
      average: 0,
      confidence: this.averageConfidence(analyses)
    };

    // Generate recommendations
    const action_recommendations = this.generateRecommendations(analyses, rarity_assessment);

    // Consolidate search queries
    const comparable_sales = this.consolidateSearchQueries(analyses);

    // Generate explanation
    const explanation = this.generateExplanation(analyses, expert_consensus, consensus_category);

    return {
      consensus_category,
      consensus_title: consolidated_data.title || 'Unknown',
      consensus_author_artist: consolidated_data.artist_author,
      consensus_year: consolidated_data.year,
      estimated_value,
      rarity_assessment,
      expert_consensus,
      action_recommendations,
      comparable_sales,
      expert_analyses: analyses,
      explanation
    };
  }

  /**
   * Weighted category voting with confidence scores
   */
  private weightedCategoryVote(analyses: ExpertAnalysis[]): Category {
    const votes = new Map<Category, number>();

    analyses.forEach(analysis => {
      const weight = analysis.confidence;
      const current = votes.get(analysis.category) || 0;
      votes.set(analysis.category, current + weight);
    });

    let maxVotes = 0;
    let winner: Category = 'Other';

    votes.forEach((score, category) => {
      if (score > maxVotes) {
        maxVotes = score;
        winner = category;
      }
    });

    return winner;
  }

  /**
   * Consolidate extracted data from multiple experts
   */
  private consolidateExtractedData(analyses: ExpertAnalysis[]): ExtractedData {
    const consolidated: ExtractedData = {};

    // Title: prefer highest confidence
    const titledAnalyses = analyses
      .filter(a => a.extracted_data.title)
      .sort((a, b) => b.confidence - a.confidence);
    if (titledAnalyses.length > 0) {
      consolidated.title = titledAnalyses[0].extracted_data.title;
    }

    // Artist/Author: prefer highest confidence
    const artistAnalyses = analyses
      .filter(a => a.extracted_data.artist_author)
      .sort((a, b) => b.confidence - a.confidence);
    if (artistAnalyses.length > 0) {
      consolidated.artist_author = artistAnalyses[0].extracted_data.artist_author;
    }

    // Year: take median to avoid outliers
    const years = analyses
      .map(a => a.extracted_data.year)
      .filter((y): y is number => y !== undefined)
      .sort((a, b) => a - b);
    if (years.length > 0) {
      const mid = Math.floor(years.length / 2);
      consolidated.year = years[mid];
    }

    // Other fields: prefer highest confidence
    const formats = analyses.filter(a => a.extracted_data.format);
    if (formats.length > 0) {
      consolidated.format = formats.sort((a, b) => b.confidence - a.confidence)[0].extracted_data.format;
    }

    const publishers = analyses.filter(a => a.extracted_data.publisher_label);
    if (publishers.length > 0) {
      consolidated.publisher_label = publishers.sort((a, b) => b.confidence - a.confidence)[0].extracted_data.publisher_label;
    }

    const isbns = analyses.filter(a => a.extracted_data.isbn);
    if (isbns.length > 0) {
      consolidated.isbn = isbns[0].extracted_data.isbn;
    }

    return consolidated;
  }

  /**
   * Calculate consensus percentage between experts
   */
  private calculateConsensus(analyses: ExpertAnalysis[]): number {
    if (analyses.length < 2) return 100;

    const categories = analyses.map(a => a.category);
    const mostCommon = categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxCount = Math.max(...Object.values(mostCommon));
    return Math.round((maxCount / analyses.length) * 100);
  }

  /**
   * Consolidate rarity assessment
   */
  private consolidateRarity(analyses: ExpertAnalysis[]): {
    score: number;
    level: 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Extremely Rare';
    factors: string[];
  } {
    const rarityScores = {
      'common': 2,
      'uncommon': 4,
      'rare': 6,
      'very_rare': 8,
      'ultra_rare': 10
    };

    const scores = analyses.map(a => rarityScores[a.estimated_rarity]);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    let level: 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Extremely Rare';
    if (avgScore <= 2) level = 'Common';
    else if (avgScore <= 4) level = 'Uncommon';
    else if (avgScore <= 6) level = 'Rare';
    else if (avgScore <= 8) level = 'Very Rare';
    else level = 'Extremely Rare';

    const factors: string[] = [];
    if (avgScore >= 6) factors.push('Limited production or distribution');
    if (avgScore >= 8) factors.push('High collector demand');
    if (avgScore >= 10) factors.push('Ultra-rare collectible item');

    return { score: avgScore, level, factors };
  }

  /**
   * Generate action recommendations
   */
  private generateRecommendations(
    analyses: ExpertAnalysis[],
    rarity: { score: number; level: string }
  ): string[] {
    const recommendations: string[] = [];

    if (rarity.score >= 7) {
      recommendations.push('Consider professional grading or authentication');
      recommendations.push('Research recent comparable sales before pricing');
    }

    if (analyses.some(a => !a.extracted_data.condition)) {
      recommendations.push('Add detailed condition photos for better valuation');
    }

    if (analyses.some(a => a.extracted_data.isbn || a.extracted_data.catalog_number)) {
      recommendations.push('Verify edition details using catalog number');
    }

    if (analyses.length < 2) {
      recommendations.push('Additional expert analysis recommended for confidence');
    }

    return recommendations;
  }

  /**
   * Consolidate search queries for comparable sales
   */
  private consolidateSearchQueries(analyses: ExpertAnalysis[]): string[] {
    const allQueries = analyses.flatMap(a => a.search_queries);
    // Deduplicate and take top 5
    return [...new Set(allQueries)].slice(0, 5);
  }

  /**
   * Average confidence across experts
   */
  private averageConfidence(analyses: ExpertAnalysis[]): number {
    const sum = analyses.reduce((acc, a) => acc + a.confidence, 0);
    return Math.round((sum / analyses.length) * 100) / 100;
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    analyses: ExpertAnalysis[],
    consensus: number,
    category: Category
  ): string {
    const expertCount = analyses.length;
    const avgLatency = Math.round(
      analyses.reduce((acc, a) => acc + a.latency_ms, 0) / expertCount
    );

    let explanation = `Analyzed by ${expertCount} AI expert${expertCount > 1 ? 's' : ''} `;
    explanation += `(${analyses.map(a => a.expert).join(', ')}). `;

    if (consensus >= 100) {
      explanation += `All experts agree this is ${category}. `;
    } else if (consensus >= 67) {
      explanation += `Strong consensus (${consensus}%) identified as ${category}. `;
    } else {
      explanation += `Moderate agreement (${consensus}%) suggests ${category}. `;
    }

    explanation += `Average analysis time: ${avgLatency}ms.`;

    return explanation;
  }

  /**
   * Normalize category string to schema enum
   */
  private normalizeCategory(category: any): Category {
    if (!category || typeof category !== 'string') {
      return 'Other';
    }

    const normalized = category.toLowerCase();

    if (normalized.includes('book')) return 'Books';
    if (normalized.includes('music') || normalized.includes('vinyl') || normalized.includes('cd')) return 'Music';
    if (normalized.includes('art') || normalized.includes('painting')) return 'Art';
    if (normalized.includes('card') || normalized.includes('pokemon') || normalized.includes('mtg')) return 'Trading Cards';
    if (normalized.includes('comic')) return 'Comics';
    if (normalized.includes('game') || normalized.includes('video game')) return 'Video Games';
    if (normalized.includes('film') || normalized.includes('movie') || normalized.includes('dvd')) return 'Films';
    if (normalized.includes('collectible')) return 'Collectibles';

    return 'Other';
  }
}
