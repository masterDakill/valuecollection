// 📊 Service de Scoring et Priorisation pour Livres Rares
// Calcule la valeur et la priorité d'analyse pour chaque livre

export interface BookScoringInput {
  // Identifiants
  isbn?: string;
  title: string;
  author?: string;
  year?: number;

  // Édition
  edition_statement?: string;
  is_first_edition?: boolean;
  is_first_printing?: boolean;
  is_limited_edition?: boolean;
  is_signed?: boolean;
  print_run?: number;

  // Condition
  overall_condition?: string; // 'As New', 'Fine', 'VG', 'Good', 'Fair', 'Poor'
  dust_jacket_present?: boolean;
  dust_jacket_condition?: string;
  binding_condition?: string;

  // Prix de référence (si déjà trouvés)
  comparable_prices?: number[];
  market_demand?: 'low' | 'medium' | 'high' | 'very_high';
}

export interface ScoringResult {
  // Scores détaillés (0-100 chacun)
  price_score: number;
  rarity_score: number;
  condition_score: number;
  demand_score: number;

  // Score total pondéré (0-100)
  overall_score: number;

  // Classification
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  value_tier: 'PREMIUM' | 'HIGH_VALUE' | 'MEDIUM_VALUE' | 'STANDARD' | 'BULK';

  // Estimations
  estimated_value: {
    low: number;
    high: number;
    best_estimate: number;
    confidence: number; // 0-1
  };

  // Recommandations
  next_steps: string[];
  analysis_depth: 'basic' | 'standard' | 'detailed' | 'professional';
  photo_count_recommended: number;
  requires_video: boolean;
  requires_3d_scan: boolean;
  requires_expert_appraisal: boolean;
}

export class BookScoringService {
  /**
   * ALGORITHME PRINCIPAL DE SCORING
   *
   * Score Total = (Prix × 40%) + (Rareté × 30%) + (État × 20%) + (Demande × 10%)
   */
  calculateScore(input: BookScoringInput): ScoringResult {
    // 1. Calculer chaque composante du score
    const priceScore = this.calculatePriceScore(input);
    const rarityScore = this.calculateRarityScore(input);
    const conditionScore = this.calculateConditionScore(input);
    const demandScore = this.calculateDemandScore(input);

    // 2. Score total pondéré
    const overallScore = Math.round(
      priceScore * 0.40 +
      rarityScore * 0.30 +
      conditionScore * 0.20 +
      demandScore * 0.10
    );

    // 3. Estimation de valeur
    const estimatedValue = this.estimateValue(input, overallScore);

    // 4. Déterminer priorité et tier
    const priority = this.determinePriority(overallScore);
    const valueTier = this.determineValueTier(estimatedValue.best_estimate);

    // 5. Recommandations d'actions
    const recommendations = this.generateRecommendations(overallScore, estimatedValue.best_estimate);

    return {
      price_score: priceScore,
      rarity_score: rarityScore,
      condition_score: conditionScore,
      demand_score: demandScore,
      overall_score: overallScore,
      priority,
      value_tier: valueTier,
      estimated_value: estimatedValue,
      next_steps: recommendations.next_steps,
      analysis_depth: recommendations.analysis_depth,
      photo_count_recommended: recommendations.photo_count,
      requires_video: recommendations.requires_video,
      requires_3d_scan: recommendations.requires_3d_scan,
      requires_expert_appraisal: recommendations.requires_expert
    };
  }

  /**
   * SCORE PRIX (0-100)
   * Basé sur les prix comparables trouvés
   */
  private calculatePriceScore(input: BookScoringInput): number {
    if (!input.comparable_prices || input.comparable_prices.length === 0) {
      // Pas de prix → estimation basée sur rareté
      return 50; // Score neutre
    }

    // Calculer le prix médian
    const sortedPrices = [...input.comparable_prices].sort((a, b) => a - b);
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];

    // Normaliser le score (logarithmique pour gérer grande fourchette)
    // $0-20 : 0-20
    // $20-50 : 20-40
    // $50-100 : 40-60
    // $100-500 : 60-80
    // $500+ : 80-100
    if (medianPrice < 20) return Math.min(medianPrice, 20);
    if (medianPrice < 50) return 20 + ((medianPrice - 20) / 30) * 20;
    if (medianPrice < 100) return 40 + ((medianPrice - 50) / 50) * 20;
    if (medianPrice < 500) return 60 + ((medianPrice - 100) / 400) * 20;
    return Math.min(80 + Math.log10(medianPrice - 500) * 5, 100);
  }

  /**
   * SCORE RARETÉ (0-100)
   * Facteurs: édition, année, particularités
   */
  private calculateRarityScore(input: BookScoringInput): number {
    let score = 0;

    // ÉDITION (0-40 points)
    if (input.is_first_edition && input.is_first_printing) {
      score += 40;
    } else if (input.is_first_edition) {
      score += 25;
    } else if (input.is_limited_edition) {
      score += 35;
      // Bonus si numérotation connue
      if (input.print_run && input.print_run < 500) score += 10;
      else if (input.print_run && input.print_run < 1000) score += 5;
    }

    // SIGNATURE/DÉDICACE (0-20 points)
    if (input.is_signed) {
      score += 20;
    }

    // ANNÉE (0-20 points)
    if (input.year) {
      if (input.year < 1900) score += 20;
      else if (input.year < 1950) score += 15;
      else if (input.year < 1980) score += 10;
      else if (input.year < 2000) score += 5;
    }

    // DUST JACKET (0-20 points)
    if (input.dust_jacket_present) {
      if (input.dust_jacket_condition === 'Fine' || input.dust_jacket_condition === 'As New') {
        score += 20;
      } else if (input.dust_jacket_condition === 'Very Good') {
        score += 15;
      } else {
        score += 10;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * SCORE CONDITION (0-100)
   * État physique du livre
   */
  private calculateConditionScore(input: BookScoringInput): number {
    const conditionMap: { [key: string]: number } = {
      'As New': 100,
      'Fine': 90,
      'Very Good': 75,
      'Good': 60,
      'Fair': 40,
      'Poor': 20
    };

    const baseScore = conditionMap[input.overall_condition || 'Good'] || 60;

    // Bonus/malus dust jacket
    let adjustment = 0;
    if (input.dust_jacket_present) {
      adjustment += 10;
    } else {
      adjustment -= 10;
    }

    return Math.max(0, Math.min(baseScore + adjustment, 100));
  }

  /**
   * SCORE DEMANDE (0-100)
   * Tendance du marché
   */
  private calculateDemandScore(input: BookScoringInput): number {
    const demandMap = {
      'very_high': 90,
      'high': 70,
      'medium': 50,
      'low': 30
    };

    return demandMap[input.market_demand || 'medium'];
  }

  /**
   * ESTIMATION DE VALEUR
   */
  private estimateValue(input: BookScoringInput, overallScore: number): {
    low: number;
    high: number;
    best_estimate: number;
    confidence: number;
  } {
    // Si on a des prix comparables, les utiliser
    if (input.comparable_prices && input.comparable_prices.length > 0) {
      const sortedPrices = [...input.comparable_prices].sort((a, b) => a - b);
      const low = sortedPrices[0];
      const high = sortedPrices[sortedPrices.length - 1];
      const median = sortedPrices[Math.floor(sortedPrices.length / 2)];

      // Ajuster selon condition
      const conditionMultiplier = this.getConditionMultiplier(input.overall_condition);

      return {
        low: Math.round(low * conditionMultiplier * 0.8),
        high: Math.round(high * conditionMultiplier * 1.2),
        best_estimate: Math.round(median * conditionMultiplier),
        confidence: Math.min(input.comparable_prices.length / 5, 1) // Max confiance à 5 comparables
      };
    }

    // Sinon, estimation basée sur le score
    const baseValue = this.scoreToValue(overallScore);
    return {
      low: Math.round(baseValue * 0.7),
      high: Math.round(baseValue * 1.3),
      best_estimate: baseValue,
      confidence: 0.5 // Confiance moyenne sans comparables
    };
  }

  /**
   * MULTIPLICATEUR SELON CONDITION
   */
  private getConditionMultiplier(condition?: string): number {
    const multipliers: { [key: string]: number } = {
      'As New': 1.3,
      'Fine': 1.15,
      'Very Good': 1.0,
      'Good': 0.75,
      'Fair': 0.5,
      'Poor': 0.3
    };

    return multipliers[condition || 'Good'] || 1.0;
  }

  /**
   * CONVERSION SCORE → VALEUR ESTIMÉE
   */
  private scoreToValue(score: number): number {
    // Courbe exponentielle pour refléter réalité marché
    if (score >= 90) return 1000 + (score - 90) * 200; // $1000-3000
    if (score >= 80) return 500 + (score - 80) * 50;   // $500-1000
    if (score >= 70) return 200 + (score - 70) * 30;   // $200-500
    if (score >= 50) return 50 + (score - 50) * 7.5;   // $50-200
    return score * 1; // $0-50
  }

  /**
   * DÉTERMINER PRIORITÉ
   */
  private determinePriority(score: number): 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW' {
    if (score >= 90) return 'URGENT';
    if (score >= 80) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    if (score >= 30) return 'LOW';
    return 'VERY_LOW';
  }

  /**
   * DÉTERMINER TIER DE VALEUR
   */
  private determineValueTier(estimatedValue: number): 'PREMIUM' | 'HIGH_VALUE' | 'MEDIUM_VALUE' | 'STANDARD' | 'BULK' {
    if (estimatedValue >= 1000) return 'PREMIUM';
    if (estimatedValue >= 500) return 'HIGH_VALUE';
    if (estimatedValue >= 100) return 'MEDIUM_VALUE';
    if (estimatedValue >= 50) return 'STANDARD';
    return 'BULK';
  }

  /**
   * GÉNÉRER RECOMMANDATIONS
   */
  private generateRecommendations(score: number, estimatedValue: number): {
    next_steps: string[];
    analysis_depth: 'basic' | 'standard' | 'detailed' | 'professional';
    photo_count: number;
    requires_video: boolean;
    requires_3d_scan: boolean;
    requires_expert: boolean;
  } {
    const steps: string[] = [];
    let analysisDepth: 'basic' | 'standard' | 'detailed' | 'professional' = 'basic';
    let photoCount = 2;
    let requiresVideo = false;
    let requires3DScan = false;
    let requiresExpert = false;

    if (score >= 90 || estimatedValue >= 1000) {
      // PRIORITÉ URGENTE
      steps.push('📸 Prendre 8-10 photos haute résolution de tous les angles');
      steps.push('🎥 Créer vidéo 360° montrant tous les détails');
      steps.push('🔍 Scanner 3D avec Polycam pour documentation complète');
      steps.push('👨‍🎓 Faire évaluer par expert certifié');
      steps.push('🔐 Assurer immédiatement pour la valeur estimée');
      steps.push('📝 Rechercher ventes aux enchères comparables');
      steps.push('💼 Considérer vente aux enchères prestigieuses (Christie\'s, Sotheby\'s)');

      analysisDepth = 'professional';
      photoCount = 10;
      requiresVideo = true;
      requires3DScan = true;
      requiresExpert = true;

    } else if (score >= 80 || estimatedValue >= 500) {
      // PRIORITÉ HAUTE
      steps.push('📸 Prendre 6-8 photos détaillées (couverture, spine, copyright, défauts)');
      steps.push('🎥 Vidéo courte recommandée (30-60 sec)');
      steps.push('🔍 Vérifier ISBN sur AbeBooks et bases de données spécialisées');
      steps.push('📊 Comparer avec 5+ ventes récentes similaires');
      steps.push('🔐 Protéger avec mylar et assurer');
      steps.push('📝 Documentation complète de tous les détails');

      analysisDepth = 'detailed';
      photoCount = 8;
      requiresVideo = true;
      requires3DScan = false;
      requiresExpert = false;

    } else if (score >= 50 || estimatedValue >= 100) {
      // PRIORITÉ MOYENNE
      steps.push('📸 Prendre 4-5 photos standard (couverture, spine, copyright)');
      steps.push('🔍 Vérifier ISBN et rechercher comparables');
      steps.push('📊 Comparer avec 3 ventes récentes');
      steps.push('💰 Pricing basé sur condition et marché');

      analysisDepth = 'standard';
      photoCount = 5;
      requiresVideo = false;
      requires3DScan = false;
      requiresExpert = false;

    } else {
      // PRIORITÉ BASSE
      steps.push('📸 Photos basiques suffisantes (2-3)');
      steps.push('📦 Considérer vente en lot groupé');
      steps.push('💰 Pricing agressif pour rotation rapide');

      analysisDepth = 'basic';
      photoCount = 2;
      requiresVideo = false;
      requires3DScan = false;
      requiresExpert = false;
    }

    return {
      next_steps: steps,
      analysis_depth: analysisDepth,
      photo_count: photoCount,
      requires_video: requiresVideo,
      requires_3d_scan: requires3DScan,
      requires_expert: requiresExpert
    };
  }

  /**
   * SCORING BATCH POUR TRIER 3000+ LIVRES
   */
  scoreBatch(books: BookScoringInput[]): Map<string, ScoringResult> {
    const results = new Map<string, ScoringResult>();

    for (const book of books) {
      const key = book.isbn || `${book.title}_${book.author}`;
      results.set(key, this.calculateScore(book));
    }

    return results;
  }

  /**
   * TRIER PAR PRIORITÉ
   */
  sortByPriority(results: Map<string, ScoringResult>): Array<{ key: string; result: ScoringResult }> {
    return Array.from(results.entries())
      .map(([key, result]) => ({ key, result }))
      .sort((a, b) => b.result.overall_score - a.result.overall_score);
  }

  /**
   * FILTRER PAR THRESHOLD
   */
  filterByThreshold(
    results: Map<string, ScoringResult>,
    minScore: number
  ): Map<string, ScoringResult> {
    const filtered = new Map<string, ScoringResult>();

    for (const [key, result] of results.entries()) {
      if (result.overall_score >= minScore) {
        filtered.set(key, result);
      }
    }

    return filtered;
  }

  /**
   * STATISTIQUES DE BATCH
   */
  getBatchStatistics(results: Map<string, ScoringResult>): {
    total_count: number;
    urgent_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    very_low_count: number;
    total_estimated_value: number;
    average_score: number;
    top_10_value: number;
  } {
    let urgentCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let veryLowCount = 0;
    let totalValue = 0;
    let totalScore = 0;

    const sortedByValue = Array.from(results.values())
      .sort((a, b) => b.estimated_value.best_estimate - a.estimated_value.best_estimate);

    for (const result of results.values()) {
      totalValue += result.estimated_value.best_estimate;
      totalScore += result.overall_score;

      switch (result.priority) {
        case 'URGENT': urgentCount++; break;
        case 'HIGH': highCount++; break;
        case 'MEDIUM': mediumCount++; break;
        case 'LOW': lowCount++; break;
        case 'VERY_LOW': veryLowCount++; break;
      }
    }

    const top10Count = Math.min(Math.ceil(results.size * 0.1), 10);
    const top10Value = sortedByValue
      .slice(0, top10Count)
      .reduce((sum, r) => sum + r.estimated_value.best_estimate, 0);

    return {
      total_count: results.size,
      urgent_count: urgentCount,
      high_count: highCount,
      medium_count: mediumCount,
      low_count: lowCount,
      very_low_count: veryLowCount,
      total_estimated_value: Math.round(totalValue),
      average_score: Math.round(totalScore / results.size),
      top_10_value: Math.round(top10Value)
    };
  }
}
