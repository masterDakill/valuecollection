/**
 * Service d'Analyse de Rareté avec IA
 * Utilise GPT-4, Claude ou Gemini pour évaluer la rareté et la valeur des livres
 */

import { createLogger } from '../lib/logger';
import { createLLMManager, LLMManager } from './llm-manager.service';

interface BookData {
  title: string;
  author?: string;
  publisher?: string;
  year?: number;
  isbn?: string;
  isbn13?: string;
  edition?: string;
  condition?: string;
}

interface MarketData {
  totalListings: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  recentSales: number;
  pricesByCondition: Record<string, number>;
}

interface RarityAnalysis {
  rarityScore: number; // 1-10
  rarityLevel: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'extremely_rare';
  factors: string[];
  estimatedValue: number;
  demandLevel: 'low' | 'medium' | 'high';
  investmentPotential: number; // 1-10
  notes: string;
  confidence: number; // 0-1
  isFirstEdition: boolean;
  isSignedEdition: boolean;
  specialFeatures: string[];
}

export class RarityAnalyzerService {
  private logger = createLogger('RarityAnalyzer');
  private llmManager: LLMManager;

  constructor(openaiApiKey?: string, anthropicApiKey?: string, geminiApiKey?: string) {
    this.llmManager = createLLMManager(openaiApiKey, anthropicApiKey, geminiApiKey);
  }

  /**
   * Analyse la rareté d'un livre avec IA
   */
  async analyzeRarity(book: BookData, marketData: MarketData): Promise<RarityAnalysis> {
    try {
      this.logger.info('Analyzing rarity with AI', { title: book.title });

      const systemPrompt = `Tu es un expert en livres rares et collections. Tu analyses la rareté et la valeur des livres en te basant sur:
- L'année de publication et l'édition
- La disponibilité sur le marché
- Les prix actuels
- Les facteurs historiques et culturels
- La demande des collectionneurs
- Les caractéristiques spéciales (édition limitée, signée, etc.)

Tu réponds TOUJOURS en JSON valide, sans texte avant ou après.`;

      const userPrompt = this.buildAnalysisPrompt(book, marketData);

      // Utiliser le LLM Manager pour la rotation automatique
      const llmResponse = await this.llmManager.chat(systemPrompt, userPrompt, true);

      this.logger.info('LLM used for analysis', {
        provider: llmResponse.provider,
        model: llmResponse.model
      });

      const analysis = JSON.parse(llmResponse.content) as RarityAnalysis;

      this.logger.info('Rarity analysis completed', {
        rarityScore: analysis.rarityScore,
        rarityLevel: analysis.rarityLevel,
        estimatedValue: analysis.estimatedValue
      });

      return analysis;

    } catch (error: any) {
      this.logger.error('Rarity analysis failed', { error: error.message });

      // Retour de secours basé sur les données de marché
      return this.fallbackAnalysis(book, marketData);
    }
  }

  /**
   * Construit le prompt pour l'IA
   */
  private buildAnalysisPrompt(book: BookData, marketData: MarketData): string {
    return `Analyse la rareté de ce livre en tant qu'expert collectionneur:

📚 INFORMATIONS DU LIVRE:
Titre: ${book.title}
Auteur: ${book.author || 'Inconnu'}
Éditeur: ${book.publisher || 'Inconnu'}
Année: ${book.year || 'Inconnue'}
ISBN-13: ${book.isbn13 || 'Non disponible'}
ISBN-10: ${book.isbn || 'Non disponible'}
Édition: ${book.edition || 'Standard'}
État: ${book.condition || 'Non spécifié'}

📊 DONNÉES DE MARCHÉ:
Exemplaires en vente: ${marketData.totalListings}
Prix moyen: ${marketData.avgPrice.toFixed(2)} CAD$
Fourchette de prix: ${marketData.minPrice.toFixed(2)} - ${marketData.maxPrice.toFixed(2)} CAD$
Ventes récentes (30 jours): ${marketData.recentSales}
Prix par état: ${JSON.stringify(marketData.pricesByCondition, null, 2)}

📋 ANALYSE DEMANDÉE:
Évalue ce livre selon les critères suivants et retourne un JSON avec cette structure EXACTE:

{
  "rarityScore": <nombre 1-10>,
  "rarityLevel": "<common|uncommon|rare|very_rare|extremely_rare>",
  "factors": ["facteur1", "facteur2", "facteur3"],
  "estimatedValue": <prix recommandé en CAD>,
  "demandLevel": "<low|medium|high>",
  "investmentPotential": <nombre 1-10>,
  "notes": "Explication détaillée de l'évaluation",
  "confidence": <0.0-1.0>,
  "isFirstEdition": <true|false>,
  "isSignedEdition": <false>,
  "specialFeatures": ["feature1", "feature2"]
}

CRITÈRES D'ÉVALUATION:
- Score de rareté: 1=très commun, 10=extrêmement rare
- Facteurs: Liste les éléments qui influencent la valeur
- Potentiel investissement: Probabilité d'appréciation future
- Confiance: Ta confiance dans cette analyse (0-1)

Réponds UNIQUEMENT avec le JSON, rien d'autre.`;
  }

  /**
   * Analyse de secours basée sur les règles
   */
  private fallbackAnalysis(book: BookData, marketData: MarketData): RarityAnalysis {
    const factors: string[] = [];
    let rarityScore = 5; // Base moyenne

    // Ajuster selon l'année
    if (book.year) {
      if (book.year < 1950) {
        rarityScore += 3;
        factors.push(`Publication ancienne (${book.year})`);
      } else if (book.year < 1980) {
        rarityScore += 2;
        factors.push(`Publication vintage (${book.year})`);
      } else if (book.year < 2000) {
        rarityScore += 1;
        factors.push(`Publication du 20ème siècle`);
      }
    }

    // Ajuster selon disponibilité
    if (marketData.totalListings < 5) {
      rarityScore += 2;
      factors.push('Très peu d\'exemplaires disponibles');
    } else if (marketData.totalListings < 20) {
      rarityScore += 1;
      factors.push('Disponibilité limitée');
    }

    // Ajuster selon prix
    if (marketData.avgPrice > 100) {
      rarityScore += 1;
      factors.push('Prix élevé sur le marché');
    }

    // Limiter à 1-10
    rarityScore = Math.max(1, Math.min(10, rarityScore));

    // Déterminer le niveau
    let rarityLevel: RarityAnalysis['rarityLevel'];
    if (rarityScore >= 9) rarityLevel = 'extremely_rare';
    else if (rarityScore >= 7) rarityLevel = 'very_rare';
    else if (rarityScore >= 5) rarityLevel = 'rare';
    else if (rarityScore >= 3) rarityLevel = 'uncommon';
    else rarityLevel = 'common';

    return {
      rarityScore,
      rarityLevel,
      factors,
      estimatedValue: marketData.avgPrice,
      demandLevel: marketData.recentSales > 10 ? 'high' : marketData.recentSales > 3 ? 'medium' : 'low',
      investmentPotential: rarityScore >= 7 ? 8 : rarityScore >= 5 ? 6 : 4,
      notes: `Analyse automatique basée sur ${factors.length} facteurs.`,
      confidence: 0.6,
      isFirstEdition: false,
      isSignedEdition: false,
      specialFeatures: []
    };
  }

  /**
   * Génère un résumé lisible de l'analyse
   */
  generateSummary(analysis: RarityAnalysis): string {
    const emoji = {
      'extremely_rare': '💎',
      'very_rare': '⭐',
      'rare': '🔹',
      'uncommon': '📘',
      'common': '📖'
    }[analysis.rarityLevel];

    return `${emoji} ${analysis.rarityLevel.toUpperCase()} (${analysis.rarityScore}/10)

Valeur estimée: ${analysis.estimatedValue.toFixed(2)} CAD$
Demande: ${analysis.demandLevel.toUpperCase()}
Potentiel investissement: ${analysis.investmentPotential}/10

${analysis.notes}

Facteurs clés:
${analysis.factors.map(f => `• ${f}`).join('\n')}`;
  }
}

export function createRarityAnalyzerService(
  openaiApiKey?: string,
  anthropicApiKey?: string,
  geminiApiKey?: string
): RarityAnalyzerService {
  return new RarityAnalyzerService(openaiApiKey, anthropicApiKey, geminiApiKey);
}
