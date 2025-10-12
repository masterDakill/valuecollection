// Service d'analyse IA pour reconnaissance d'objets et extraction de données
import { CollectionItem, AIAnalysis, ItemCategory } from '../types/collection';

export class AIAnalysisService {
  private openaiApiKey: string;
  private model: string;

  constructor(openaiApiKey: string, model = 'gpt-4o') {
    this.openaiApiKey = openaiApiKey;
    this.model = model;
  }

  // Analyse complète d'une image d'objet de collection
  async analyzeImage(imageUrl: string, item: CollectionItem): Promise<AIAnalysis | null> {
    try {
      const startTime = Date.now();
      
      const analysis = await this.performVisionAnalysis(imageUrl, item);
      
      if (!analysis) {
        return null;
      }

      const processingTime = Date.now() - startTime;

      const aiAnalysis: AIAnalysis = {
        id: 0, // Sera généré par la DB
        item_id: item.id,
        detected_objects: JSON.stringify(analysis.detected_objects),
        text_extracted: analysis.text_extracted,
        colors_dominant: JSON.stringify(analysis.dominant_colors),
        image_quality_score: analysis.quality_score,
        suggested_category: analysis.suggested_category,
        suggested_subcategory: analysis.suggested_subcategory,
        confidence_category: analysis.category_confidence,
        analysis_model: this.model,
        analysis_date: new Date().toISOString(),
        processing_time_ms: processingTime
      };

      return aiAnalysis;

    } catch (error) {
      console.error('AI analysis error:', error);
      return null;
    }
  }

  // Analyse vision avec GPT-4 Vision
  private async performVisionAnalysis(imageUrl: string, item: CollectionItem) {
    const prompt = this.buildAnalysisPrompt(item);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1 // Faible pour cohérence
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No analysis content returned');
    }

    return this.parseAnalysisResponse(content);
  }

  // Construction du prompt spécialisé selon le type d'objet
  private buildAnalysisPrompt(item: CollectionItem): string {
    let basePrompt = `Analysez cette image d'objet de collection en détail. Répondez UNIQUEMENT en JSON valide avec cette structure exacte:

{
  "detected_objects": ["object1", "object2", "object3"],
  "text_extracted": "tout texte visible dans l'image",
  "dominant_colors": ["#FF0000", "#00FF00", "#0000FF"],
  "quality_score": 0.85,
  "suggested_category": "category_name",
  "suggested_subcategory": "subcategory_name", 
  "category_confidence": 0.92,
  "detailed_analysis": "description détaillée de l'objet"
}`;

    // Prompts spécialisés par catégorie
    switch (item.category) {
      case 'sports_cards':
        basePrompt += `\n\nPour cette CARTE DE SPORT, identifiez:
- Nom du joueur visible
- Sport (hockey, baseball, football, etc.)
- Année/série de la carte
- Fabricant (Topps, O-Pee-Chee, Upper Deck, etc.)
- Équipe du joueur
- Numéro de la carte si visible
- État apparent (corners, centring, surface)
- Éléments spéciaux (rookie, autograph, patch, etc.)`;
        break;

      case 'books':
        basePrompt += `\n\nPour ce LIVRE, identifiez:
- Titre complet
- Auteur(s)
- Éditeur
- Année de publication si visible
- ISBN si présent
- Type d'édition (première, limitée, etc.)
- État de la couverture et reliure
- Langue du texte
- Genre littéraire`;
        break;

      case 'comics':
        basePrompt += `\n\nPour ce COMIC/BD, identifiez:
- Titre de la série
- Numéro d'issue
- Éditeur (Marvel, DC, etc.)
- Date de publication
- Artiste/Dessinateur
- Scénariste si visible
- État général (grade approximatif)
- Éléments spéciaux (variant cover, etc.)`;
        break;

      case 'vintage':
        basePrompt += `\n\nPour cet OBJET VINTAGE, identifiez:
- Type d'objet principal
- Époque/décennie probable
- Marque ou fabricant
- Matériaux utilisés
- Style artistique
- Pays/région d'origine probable
- Signes d'usure ou d'âge
- Éléments décoratifs particuliers`;
        break;

      case 'trading_cards':
        basePrompt += `\n\nPour cette CARTE À COLLECTIONNER, identifiez:
- Jeu/franchise (Pokémon, Magic, etc.)
- Nom de la carte
- Série/extension
- Rareté (commune, rare, ultra rare, etc.)
- Numéro de collection
- Type de carte (créature, sort, etc.)
- État de conservation
- Éléments holographiques ou spéciaux`;
        break;

      default:
        basePrompt += `\n\nAnalysez tous les détails visibles de cet objet de collection.`;
    }

    basePrompt += `\n\nCatégories possibles: books, comics, sports_cards, trading_cards, vintage, art, toys, coins, stamps, jewelry, watches, memorabilia, other`;

    return basePrompt;
  }

  // Parsing de la réponse JSON de l'IA
  private parseAnalysisResponse(content: string) {
    try {
      // Nettoyer le contenu pour extraire le JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Validation et nettoyage des données
      return {
        detected_objects: Array.isArray(analysis.detected_objects) ? analysis.detected_objects : [],
        text_extracted: analysis.text_extracted || '',
        dominant_colors: Array.isArray(analysis.dominant_colors) ? analysis.dominant_colors : [],
        quality_score: Math.max(0, Math.min(1, analysis.quality_score || 0.5)),
        suggested_category: this.validateCategory(analysis.suggested_category),
        suggested_subcategory: analysis.suggested_subcategory || '',
        category_confidence: Math.max(0, Math.min(1, analysis.category_confidence || 0.5)),
        detailed_analysis: analysis.detailed_analysis || ''
      };

    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw content:', content);
      
      // Retour de base en cas d'erreur de parsing
      return {
        detected_objects: ['unknown_object'],
        text_extracted: '',
        dominant_colors: ['#808080'],
        quality_score: 0.5,
        suggested_category: 'other',
        suggested_subcategory: '',
        category_confidence: 0.3,
        detailed_analysis: 'Analyse échouée - parsing error'
      };
    }
  }

  // Validation des catégories suggérées
  private validateCategory(category: string): ItemCategory {
    const validCategories: ItemCategory[] = [
      'books', 'comics', 'sports_cards', 'trading_cards', 'vintage', 
      'art', 'toys', 'coins', 'stamps', 'jewelry', 'watches', 'memorabilia', 'other'
    ];

    if (validCategories.includes(category as ItemCategory)) {
      return category as ItemCategory;
    }

    // Mapping de synonymes courants
    const categoryMap: { [key: string]: ItemCategory } = {
      'book': 'books',
      'comic_book': 'comics',
      'bd': 'comics',
      'carte_sport': 'sports_cards',
      'hockey_card': 'sports_cards',
      'baseball_card': 'sports_cards',
      'pokemon_card': 'trading_cards',
      'magic_card': 'trading_cards',
      'antique': 'vintage',
      'collectible': 'other',
      'toy': 'toys',
      'coin': 'coins',
      'stamp': 'stamps',
      'watch': 'watches'
    };

    return categoryMap[category.toLowerCase()] || 'other';
  }

  // Analyse batch pour plusieurs images
  async analyzeBatch(items: Array<{ imageUrl: string; item: CollectionItem }>): Promise<AIAnalysis[]> {
    const results: AIAnalysis[] = [];
    const batchSize = 5; // Limite pour éviter rate limiting

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchPromises = batch.map(({ imageUrl, item }) => 
        this.analyzeImage(imageUrl, item)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      });

      // Délai entre les batches pour respecter les limites de taux
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  // Extraction de texte OCR spécialisée
  async extractText(imageUrl: string, language = 'fr'): Promise<string> {
    const prompt = `Extrayez TOUT le texte visible dans cette image. Incluez:
- Tous les mots et nombres
- Marques et logos
- Dates et codes
- Descriptions et titres
- Même le texte flou ou partiellement visible

Répondez uniquement avec le texte extrait, un élément par ligne.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            }
          ],
          max_tokens: 500,
          temperature: 0
        })
      });

      if (!response.ok) {
        throw new Error(`OCR extraction failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';

    } catch (error) {
      console.error('Text extraction error:', error);
      return '';
    }
  }
}