// 🧠 Système Multi-Expert IA pour Évaluation de Collections
// Mathieu Chamberland - Évaluateur de Collection Pro

interface ExpertAnalysis {
  expert: string;
  confidence: number;
  category: string;
  title?: string;
  author_artist?: string;
  year?: number;
  estimated_value?: number;
  rarity_score?: number;
  condition_assessment?: string;
  market_position?: string;
  key_features?: string[];
  comparable_items?: string[];
  expertise_notes?: string;
  reasoning?: string;
}

interface ConsolidatedAnalysis {
  consensus_category: string;
  consensus_title: string;
  consensus_author_artist: string;
  consensus_year: number;
  estimated_value: {
    min: number;
    max: number;
    average: number;
    confidence: number;
  };
  rarity_assessment: {
    score: number; // 1-10
    level: string; // "Common" | "Uncommon" | "Rare" | "Very Rare" | "Extremely Rare"
    factors: string[];
  };
  market_analysis: {
    demand: string; // "Low" | "Medium" | "High" | "Very High"
    liquidity: string; // "Poor" | "Fair" | "Good" | "Excellent"
    trend: string; // "Declining" | "Stable" | "Rising" | "Hot"
  };
  condition_impact: number; // Multiplicateur basé sur l'état
  expert_consensus: number; // % d'accord entre experts
  action_recommendations: string[];
  comparable_sales: string[];
}

export class MultiExpertAISystem {
  private openaiApiKey?: string;
  private anthropicApiKey?: string;
  private geminiApiKey?: string;

  constructor(env: any) {
    this.openaiApiKey = env.OPENAI_API_KEY;
    this.anthropicApiKey = env.ANTHROPIC_API_KEY;
    this.geminiApiKey = env.GEMINI_API_KEY;
  }

  /**
   * 🎯 ANALYSE MULTI-EXPERT PRINCIPALE
   */
  async analyzeCollection(
    imageUrl?: string, 
    textDescription?: string, 
    additionalContext?: any
  ): Promise<ConsolidatedAnalysis> {
    
    console.log('🧠 Démarrage analyse multi-expert...');
    
    // Lancer les 3 experts en parallèle
    const expertPromises = [
      this.openaiVisionExpert(imageUrl, textDescription, additionalContext),
      this.claudeCollectionExpert(textDescription, additionalContext),
      this.geminiComparativeExpert(imageUrl, textDescription, additionalContext)
    ];

    try {
      const expertAnalyses = await Promise.all(expertPromises);
      console.log('✅ Analyses des experts terminées');
      
      // Consolider les opinions
      const consolidatedAnalysis = this.consolidateExpertOpinions(expertAnalyses);
      
      return consolidatedAnalysis;
    } catch (error) {
      console.error('❌ Erreur analyse multi-expert:', error);
      throw error;
    }
  }

  /**
   * 👁️ EXPERT #1: OpenAI GPT-4 Vision - Spécialiste analyse d'images
   */
  private async openaiVisionExpert(
    imageUrl?: string, 
    textDescription?: string, 
    context?: any
  ): Promise<ExpertAnalysis> {
    
    if (!this.openaiApiKey) {
      throw new Error('Clé API OpenAI manquante');
    }

    const prompt = this.buildOpenAIPrompt(textDescription, context);
    
    const messages: any[] = [
      {
        role: "system",
        content: `Tu es un expert mondial en évaluation de collections avec 30 ans d'expérience. 
        Spécialisé en: livres rares, art, cartes de collection, antiquités.
        Tu analyses les détails visuels avec une précision exceptionnelle.
        
        Fournis TOUJOURS une réponse en JSON strict avec tous les champs requis.`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt
          }
        ]
      }
    ];

    // Ajouter l'image si fournie
    if (imageUrl) {
      messages[1].content.push({
        type: "image_url",
        image_url: {
          url: imageUrl,
          detail: "high"
        }
      });
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4o", // Modèle le plus récent avec vision
          messages: messages,
          max_tokens: 1500,
          temperature: 0.1 // Précision maximale
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`OpenAI API erreur: ${data.error?.message}`);
      }

      const content = data.choices[0].message.content;
      const analysis = this.parseJSONResponse(content, 'OpenAI Vision Expert');
      
      return {
        expert: 'OpenAI Vision Expert',
        confidence: analysis.confidence || 0.8,
        ...analysis
      };
      
    } catch (error) {
      console.error('❌ Erreur OpenAI Vision Expert:', error);
      return this.getFallbackAnalysis('OpenAI Vision Expert', textDescription);
    }
  }

  /**
   * 🎓 EXPERT #2: Claude-3 - Spécialiste expertise en collections
   */
  private async claudeCollectionExpert(
    textDescription?: string, 
    context?: any
  ): Promise<ExpertAnalysis> {
    
    if (!this.anthropicApiKey) {
      console.warn('⚠️ Clé API Anthropic manquante, utilisation du mode démo');
      return this.getDemoAnalysis('Claude Collection Expert', textDescription);
    }

    const prompt = this.buildClaudePrompt(textDescription, context);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: "claude-3-sonnet-20240229",
          max_tokens: 1500,
          temperature: 0.1,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Claude API erreur: ${data.error?.message}`);
      }

      const content = data.content[0].text;
      const analysis = this.parseJSONResponse(content, 'Claude Collection Expert');
      
      return {
        expert: 'Claude Collection Expert',
        confidence: analysis.confidence || 0.85,
        ...analysis
      };
      
    } catch (error) {
      console.error('❌ Erreur Claude Collection Expert:', error);
      return this.getFallbackAnalysis('Claude Collection Expert', textDescription);
    }
  }

  /**
   * 🔍 EXPERT #3: Gemini Pro Vision - Spécialiste analyse comparative
   */
  private async geminiComparativeExpert(
    imageUrl?: string, 
    textDescription?: string, 
    context?: any
  ): Promise<ExpertAnalysis> {
    
    if (!this.geminiApiKey) {
      console.warn('⚠️ Clé API Gemini manquante, utilisation du mode démo');
      return this.getDemoAnalysis('Gemini Comparative Expert', textDescription);
    }

    // Pour l'instant, mode démo - intégration Gemini à venir
    return this.getDemoAnalysis('Gemini Comparative Expert', textDescription);
  }

  /**
   * 🔄 CONSOLIDATION DES OPINIONS D'EXPERTS
   */
  private consolidateExpertOpinions(analyses: ExpertAnalysis[]): ConsolidatedAnalysis {
    console.log('🔄 Consolidation des opinions d\'experts...');

    // Filtrer les analyses valides
    const validAnalyses = analyses.filter(a => a && a.confidence > 0.1);
    
    if (validAnalyses.length === 0) {
      throw new Error('Aucune analyse valide obtenue des experts');
    }

    // Consensus sur la catégorie
    const categories = validAnalyses.map(a => a.category).filter(Boolean);
    const consensus_category = this.findConsensus(categories) || 'unknown';

    // Consensus sur le titre
    const titles = validAnalyses.map(a => a.title).filter(Boolean);
    const consensus_title = this.findConsensus(titles) || 'Non identifié';

    // Consensus sur l'auteur/artiste
    const authors = validAnalyses.map(a => a.author_artist).filter(Boolean);
    const consensus_author_artist = this.findConsensus(authors) || 'Non identifié';

    // Consensus sur l'année
    const years = validAnalyses.map(a => a.year).filter(Boolean);
    const consensus_year = this.calculateAverageYear(years);

    // Analyse des valeurs estimées
    const values = validAnalyses.map(a => a.estimated_value).filter(v => v && v > 0);
    const estimated_value = this.consolidateValues(values);

    // Score de rareté consolidé
    const rarityScores = validAnalyses.map(a => a.rarity_score).filter(s => s && s > 0);
    const rarity_assessment = this.consolidateRarity(rarityScores, validAnalyses);

    // Analyse de marché
    const market_analysis = this.analyzeMarket(validAnalyses);

    // Calcul du consensus
    const expert_consensus = this.calculateConsensus(validAnalyses);

    // Recommandations d'actions
    const action_recommendations = this.generateRecommendations(
      consensus_category, 
      estimated_value, 
      rarity_assessment
    );

    return {
      consensus_category,
      consensus_title,
      consensus_author_artist,
      consensus_year,
      estimated_value,
      rarity_assessment,
      market_analysis,
      condition_impact: 1.0, // À calculer selon l'état
      expert_consensus,
      action_recommendations,
      comparable_sales: this.extractComparableSales(validAnalyses)
    };
  }

  /**
   * 🛠️ MÉTHODES UTILITAIRES
   */

  private buildOpenAIPrompt(textDescription?: string, context?: any): string {
    return `ANALYSE D'EXPERT - ÉVALUATION DE COLLECTION

${textDescription ? `DESCRIPTION: ${textDescription}` : ''}
${context ? `CONTEXTE ADDITIONNEL: ${JSON.stringify(context)}` : ''}

En tant qu'expert mondial en collections, analyse cet objet et fournis une évaluation détaillée.

RÉPONDS EN JSON STRICT avec cette structure:
{
  "category": "books|music|cards|art|collectibles|other",
  "title": "Titre exact de l'œuvre",
  "author_artist": "Nom de l'auteur/artiste",
  "year": 1900,
  "estimated_value": 150.00,
  "rarity_score": 7,
  "condition_assessment": "Excellent|Good|Fair|Poor",
  "market_position": "Common|Uncommon|Rare|Very Rare|Extremely Rare",
  "key_features": ["Edition originale", "Signature", "État exceptionnel"],
  "comparable_items": ["Items similaires pour comparaison"],
  "expertise_notes": "Notes détaillées d'expert",
  "reasoning": "Justification de l'évaluation",
  "confidence": 0.9
}`;
  }

  private buildClaudePrompt(textDescription?: string, context?: any): string {
    return `Tu es Claude, expert réputé en collections et antiquités avec une spécialisation en livres rares canadiens et québécois.

${textDescription ? `OBJET À ANALYSER: ${textDescription}` : ''}

Mission: Fournis une analyse experte approfondie de cet objet de collection.

Concentre-toi sur:
- Identification précise (titre, auteur, éditeur)
- Contextualisation historique et culturelle
- Facteurs de rareté spécifiques au marché canadien/québécois
- Valeur de marché actuelle avec justifications
- Recommandations de conservation/vente

RÉPONSE EN JSON STRICT:
{
  "category": "string",
  "title": "string", 
  "author_artist": "string",
  "year": number,
  "estimated_value": number,
  "rarity_score": number,
  "condition_assessment": "string",
  "market_position": "string", 
  "key_features": ["array"],
  "comparable_items": ["array"],
  "expertise_notes": "string",
  "reasoning": "string",
  "confidence": number
}`;
  }

  private parseJSONResponse(content: string, expertName: string): any {
    try {
      // Nettoyer le contenu pour extraire le JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Aucun JSON trouvé dans la réponse');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error(`❌ Erreur parsing JSON pour ${expertName}:`, error);
      console.log('Contenu reçu:', content);
      throw new Error(`Impossible de parser la réponse JSON de ${expertName}`);
    }
  }

  private getFallbackAnalysis(expertName: string, textDescription?: string): ExpertAnalysis {
    return {
      expert: expertName,
      confidence: 0.3,
      category: 'unknown',
      title: textDescription || 'Non identifié',
      author_artist: 'Non identifié',
      year: 0,
      estimated_value: 0,
      rarity_score: 5,
      condition_assessment: 'Unknown',
      market_position: 'Unknown',
      key_features: [],
      comparable_items: [],
      expertise_notes: `Analyse de secours - ${expertName} indisponible`,
      reasoning: 'Données insuffisantes pour analyse complète'
    };
  }

  private getDemoAnalysis(expertName: string, textDescription?: string): ExpertAnalysis {
    // Analyse démo réaliste basée sur le texte
    const categories = ['books', 'music', 'cards', 'art', 'collectibles'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    return {
      expert: expertName,
      confidence: 0.75 + Math.random() * 0.2,
      category: randomCategory,
      title: textDescription || 'Item de démonstration',
      author_artist: 'Auteur/Artiste démo',
      year: 1900 + Math.floor(Math.random() * 124),
      estimated_value: Math.floor(Math.random() * 1000) + 50,
      rarity_score: Math.floor(Math.random() * 10) + 1,
      condition_assessment: ['Excellent', 'Good', 'Fair'][Math.floor(Math.random() * 3)],
      market_position: ['Common', 'Uncommon', 'Rare', 'Very Rare'][Math.floor(Math.random() * 4)],
      key_features: ['Démonstration', 'Analyse simulée'],
      comparable_items: ['Item similaire 1', 'Item similaire 2'],
      expertise_notes: `Analyse de démonstration par ${expertName}`,
      reasoning: 'Évaluation basée sur des données simulées pour démonstration'
    };
  }

  private findConsensus(items: string[]): string | null {
    if (items.length === 0) return null;
    
    const frequency: { [key: string]: number } = {};
    items.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });
    
    return Object.keys(frequency).reduce((a, b) => 
      frequency[a] > frequency[b] ? a : b
    );
  }

  private calculateAverageYear(years: number[]): number {
    if (years.length === 0) return 0;
    return Math.round(years.reduce((sum, year) => sum + year, 0) / years.length);
  }

  private consolidateValues(values: number[]): any {
    if (values.length === 0) {
      return { min: 0, max: 0, average: 0, confidence: 0 };
    }

    const sortedValues = values.sort((a, b) => a - b);
    const min = sortedValues[0];
    const max = sortedValues[sortedValues.length - 1];
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Confiance basée sur la convergence des estimations
    const range = max - min;
    const confidence = range === 0 ? 1.0 : Math.max(0.1, 1.0 - (range / average));

    return {
      min: Math.round(min),
      max: Math.round(max),
      average: Math.round(average),
      confidence: Math.round(confidence * 100) / 100
    };
  }

  private consolidateRarity(scores: number[], analyses: ExpertAnalysis[]): any {
    const averageScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : 5;

    const level = averageScore >= 9 ? 'Extremely Rare' :
                  averageScore >= 7 ? 'Very Rare' :
                  averageScore >= 5 ? 'Rare' :
                  averageScore >= 3 ? 'Uncommon' : 'Common';

    const factors = analyses.flatMap(a => a.key_features || []);

    return {
      score: Math.round(averageScore * 10) / 10,
      level,
      factors
    };
  }

  private analyzeMarket(analyses: ExpertAnalysis[]): any {
    return {
      demand: 'Medium',
      liquidity: 'Fair', 
      trend: 'Stable'
    };
  }

  private calculateConsensus(analyses: ExpertAnalysis[]): number {
    const avgConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;
    return Math.round(avgConfidence * 100);
  }

  private generateRecommendations(category: string, value: any, rarity: any): string[] {
    const recommendations = [];

    if (value.average > 500) {
      recommendations.push('Obtenir une évaluation professionnelle');
      recommendations.push('Considérer une assurance spécialisée');
    }

    if (rarity.score >= 7) {
      recommendations.push('Conservation dans environnement contrôlé recommandée');
      recommendations.push('Documentation photographique détaillée');
    }

    if (value.confidence < 0.5) {
      recommendations.push('Recherche additionnelle nécessaire pour confirmation');
    }

    recommendations.push('Surveiller les tendances du marché pour ce type d\'item');

    return recommendations;
  }

  private extractComparableSales(analyses: ExpertAnalysis[]): string[] {
    return analyses.flatMap(a => a.comparable_items || []).slice(0, 5);
  }
}