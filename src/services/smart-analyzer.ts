// Analyseur Intelligent Ultra-Précis pour Collections
import { CollectionItem, AIAnalysis, ItemCategory } from '../types/collection';

export interface SmartAnalysisResult {
  category: ItemCategory;
  confidence: number;
  extracted_data: {
    title?: string;
    artist_author?: string;
    year?: number;
    publisher_label?: string;
    isbn_barcode?: string;
    condition?: string;
    format?: string; // vinyl, CD, hardcover, paperback, etc.
    edition?: string;
    catalog_number?: string;
  };
  market_identifiers: {
    discogs_id?: string;
    musicbrainz_id?: string;
    isbn_10?: string;
    isbn_13?: string;
    upc?: string;
  };
  search_queries: string[];
  estimated_rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'ultra_rare';
}

export class SmartAnalyzer {
  private openaiApiKey: string;
  private isDemoMode: boolean;

  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
    this.isDemoMode = !openaiApiKey || openaiApiKey === 'demo-key' || openaiApiKey.startsWith('sk-your_');
  }

  // Point d'entrée principal pour analyse complète
  async analyzeMedia(input: {
    imageUrl?: string;
    videoUrl?: string;
    textInput?: string;
    filename?: string;
  }): Promise<SmartAnalysisResult> {
    
    let analysisResult: any = {};

    // 1. Analyse de l'image si fournie
    if (input.imageUrl) {
      const imageAnalysis = await this.analyzeImage(input.imageUrl);
      analysisResult = { ...analysisResult, ...imageAnalysis };
    }

    // 2. Analyse vidéo (extraction frame + audio)
    if (input.videoUrl) {
      const videoAnalysis = await this.analyzeVideo(input.videoUrl);
      analysisResult = { ...analysisResult, ...videoAnalysis };
    }

    // 3. Analyse du texte (titre + auteur manual)
    if (input.textInput) {
      const textAnalysis = await this.analyzeText(input.textInput);
      analysisResult = { ...analysisResult, ...textAnalysis };
    }

    // 4. Analyse du nom de fichier
    if (input.filename) {
      const filenameData = this.extractFromFilename(input.filename);
      analysisResult = { ...analysisResult, ...filenameData };
    }

    // 5. Consolidation et enrichissement
    return await this.consolidateAnalysis(analysisResult);
  }

  // Analyse d'image ultra-spécialisée
  private async analyzeImage(imageUrl: string): Promise<Partial<SmartAnalysisResult>> {
    
    // MODE DÉMO : Retourner des données simulées
    if (this.isDemoMode) {
      console.log('📸 Mode démo : simulation analyse image', imageUrl);
      return {
        category: 'records',
        confidence: 0.75,
        extracted_data: {
          title: 'Album Détecté (Demo)',
          artist_author: 'Artiste Détecté (Demo)',
          format: 'LP Vinyle'
        }
      };
    }

    const prompt = `Analysez cette image d'objet de collection avec une PRÉCISION MAXIMALE.
    
RÉPONDEZ UNIQUEMENT EN JSON VALIDE avec cette structure exacte:
{
  "object_type": "book|cd|vinyl|dvd|bluray|cassette|vhs|comic|card|memorabilia",
  "title": "titre exact visible",
  "artist_author": "artiste ou auteur visible",
  "year": année_si_visible_ou_null,
  "publisher_label": "éditeur ou label visible",
  "format_details": "format précis (LP, CD, hardcover, etc.)",
  "condition_visual": "état visuel apparent (mint|excellent|good|fair|poor)",
  "text_all": "TOUT le texte visible dans l'image",
  "identifiers": "codes barres, ISBN, numéros de catalogue visibles",
  "rarity_indicators": ["limited edition", "first pressing", "promo", etc.],
  "confidence_score": 0.XX
}

INSTRUCTIONS SPÉCIFIQUES:
- Pour LIVRES: Cherchez ISBN, édition, éditeur, année copyright
- Pour VINYLES: Label, numéro de catalogue, vitesse (33/45 RPM), format (LP/EP)  
- Pour CDs: Label, année, code barres, édition spéciale
- Pour DVDs/Blu-ray: Studio, année, région, édition collector
- EXTRAIRE TOUT LE TEXTE même flou ou partiellement visible
- Identifier les INDICATEURS DE RARETÉ (première édition, pressage limité, promo, etc.)`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
              ]
            }
          ],
          max_tokens: 1500,
          temperature: 0.1
        })
      });

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      return this.parseImageAnalysis(content);

    } catch (error) {
      console.error('Image analysis error:', error);
      return { confidence: 0 };
    }
  }

  // Analyse vidéo (extraction frame + analyse audio pour musique)
  private async analyzeVideo(videoUrl: string): Promise<Partial<SmartAnalysisResult>> {
    // Pour l'instant, on simule l'extraction d'un frame
    // En production, utiliserait ffmpeg pour extraire des frames clés
    
    try {
      // Simulation: analyser comme une image
      // En réalité, extrairait frame à 00:05, 00:15, 00:30
      const frameAnalysis = await this.analyzeImage(videoUrl);
      
      // TODO: Ajouter analyse audio pour identifier musique
      // Utiliserait Shazam API, AcoustID, ou analyse spectrale
      
      return {
        ...frameAnalysis,
        extracted_data: {
          ...frameAnalysis.extracted_data,
          format: 'video_content'
        }
      };

    } catch (error) {
      console.error('Video analysis error:', error);
      return { confidence: 0 };
    }
  }

  // Analyse de texte libre (titre + auteur saisis manuellement)
  private async analyzeText(textInput: string): Promise<Partial<SmartAnalysisResult>> {
    
    // MODE DÉMO : Analyse intelligente simulée basée sur le texte
    if (this.isDemoMode) {
      console.log('📝 Mode démo : simulation analyse texte', textInput);
      return this.simulateTextAnalysis(textInput);
    }

    const prompt = `Analysez ce texte décrivant un objet de collection et extraire les informations structurées.

TEXTE: "${textInput}"

RÉPONDEZ EN JSON VALIDE:
{
  "probable_type": "book|cd|vinyl|dvd|game|etc",
  "title": "titre identifié",
  "artist_author": "artiste/auteur identifié", 
  "year": année_probable_ou_null,
  "publisher_label": "éditeur/label probable",
  "search_terms": ["terme1", "terme2", "terme3"],
  "confidence": 0.XX
}

EXEMPLES:
- "Les Anciens Canadiens Philippe Aubert de Gaspé" → livre canadien
- "Abbey Road The Beatles" → album vinyle/CD  
- "Mario Bros Nintendo NES" → jeu vidéo vintage
- "Tintin Hergé Casterman" → BD/comic

Soyez intelligent sur les VARIATIONS et SYNONYMES.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: "user", content: prompt }],
          max_tokens: 800,
          temperature: 0.1
        })
      });

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      return this.parseTextAnalysis(content);

    } catch (error) {
      console.error('Text analysis error:', error);
      return { confidence: 0 };
    }
  }

  // Extraction intelligente depuis nom de fichier
  private extractFromFilename(filename: string): Partial<SmartAnalysisResult> {
    const name = filename.toLowerCase().replace(/\.[^/.]+$/, '');
    
    const result: any = {
      confidence: 0.3,
      extracted_data: {},
      search_queries: []
    };

    // Patterns de reconnaissance
    const patterns = {
      // Livres: "titre_auteur_année.jpg"
      book: /(.+?)_([a-z\s]+)_(\d{4})/i,
      // Albums: "artiste_album_année.jpg"
      music: /(.*?)[-_](.*?)[-_](\d{4})/i,
      // ISBN dans le nom
      isbn: /(97[89]\d{10})/,
      // Années
      year: /\b(19|20)\d{2}\b/,
    };

    // Détection ISBN
    const isbnMatch = name.match(patterns.isbn);
    if (isbnMatch) {
      result.market_identifiers = { isbn_13: isbnMatch[1] };
      result.category = 'books';
      result.confidence = 0.8;
    }

    // Détection année
    const yearMatch = name.match(patterns.year);
    if (yearMatch) {
      result.extracted_data.year = parseInt(yearMatch[0]);
    }

    // Mots-clés de format
    const formatKeywords = {
      vinyl: ['lp', 'ep', '45rpm', '33rpm', 'vinyl', 'record'],
      cd: ['cd', 'compact', 'disc'],
      book: ['book', 'livre', 'isbn', 'edition'],
      dvd: ['dvd', 'bluray', 'blu-ray'],
      game: ['game', 'jeu', 'nintendo', 'playstation', 'xbox']
    };

    // Détection de catégorie par mots-clés
    for (const [category, keywords] of Object.entries(formatKeywords)) {
      if (keywords.some(kw => name.includes(kw))) {
        result.category = category === 'vinyl' ? 'records' : category;
        result.confidence = Math.max(result.confidence, 0.6);
        break;
      }
    }

    // Nettoyage du titre
    const cleanTitle = name
      .replace(/[-_]/g, ' ')
      .replace(/\b\d{4}\b/, '') // Supprimer années
      .replace(/\b(cd|dvd|vinyl|lp|ep)\b/gi, '') // Supprimer formats
      .trim()
      .replace(/\s+/g, ' ');

    if (cleanTitle.length > 3) {
      result.extracted_data.title = this.capitalizeTitle(cleanTitle);
      result.search_queries.push(cleanTitle);
    }

    return result;
  }

  // Consolidation intelligente de toutes les analyses
  private async consolidateAnalysis(data: any): Promise<SmartAnalysisResult> {
    // Choisir la meilleure catégorie basée sur la confiance
    const category = this.selectBestCategory(data);
    
    // Construire les données finales
    const extractedData = {
      title: data.title || data.extracted_data?.title,
      artist_author: data.artist_author || data.extracted_data?.artist_author,
      year: data.year || data.extracted_data?.year,
      publisher_label: data.publisher_label || data.extracted_data?.publisher_label,
      condition: data.condition_visual || data.extracted_data?.condition,
      format: data.format_details || data.extracted_data?.format,
      edition: data.edition || data.extracted_data?.edition
    };

    // Générer requêtes de recherche optimisées
    const searchQueries = this.generateSearchQueries(extractedData, category);

    // Estimer la rareté
    const rarity = this.estimateRarity(data, extractedData);

    return {
      category,
      confidence: Math.max(data.confidence || 0, data.confidence_score || 0),
      extracted_data: extractedData,
      market_identifiers: data.market_identifiers || {},
      search_queries: searchQueries,
      estimated_rarity: rarity
    };
  }

  // Sélection intelligente de catégorie
  private selectBestCategory(data: any): ItemCategory {
    // Logique de priorité basée sur la confiance et les indicateurs
    const categories = {
      books: data.isbn || data.publisher_label || (data.object_type === 'book'),
      records: data.object_type === 'vinyl' || data.format_details?.includes('LP'),
      cds: data.object_type === 'cd' || data.format_details?.includes('CD'),
      dvds: data.object_type === 'dvd' || data.object_type === 'bluray'
    };

    // Retourner la première catégorie trouvée avec indicateurs forts
    for (const [cat, hasIndicator] of Object.entries(categories)) {
      if (hasIndicator) {
        return cat as ItemCategory;
      }
    }

    return 'other';
  }

  // Génération de requêtes de recherche optimisées
  private generateSearchQueries(data: any, category: ItemCategory): string[] {
    const queries: string[] = [];
    
    if (data.title && data.artist_author) {
      queries.push(`"${data.title}" "${data.artist_author}"`);
      queries.push(`${data.artist_author} ${data.title}`);
    }

    if (data.title) {
      queries.push(`"${data.title}"`);
      if (data.year) {
        queries.push(`"${data.title}" ${data.year}`);
      }
    }

    // Requêtes spécialisées par catégorie
    switch (category) {
      case 'books':
        if (data.publisher_label) {
          queries.push(`${data.title} ${data.publisher_label}`);
        }
        break;
      case 'records':
        queries.push(`${data.artist_author} ${data.title} vinyl`);
        if (data.publisher_label) {
          queries.push(`${data.artist_author} ${data.publisher_label} LP`);
        }
        break;
      case 'cds':
        queries.push(`${data.artist_author} ${data.title} CD`);
        break;
    }

    return [...new Set(queries)].slice(0, 5); // Max 5 requêtes uniques
  }

  // Estimation de rareté basée sur les indicateurs
  private estimateRarity(analysis: any, data: any): 'common' | 'uncommon' | 'rare' | 'very_rare' | 'ultra_rare' {
    let rarityScore = 0;

    // Indicateurs de rareté
    const rarityIndicators = analysis.rarity_indicators || [];
    
    if (rarityIndicators.includes('limited edition')) rarityScore += 3;
    if (rarityIndicators.includes('first pressing')) rarityScore += 4;
    if (rarityIndicators.includes('promo')) rarityScore += 3;
    if (rarityIndicators.includes('test pressing')) rarityScore += 5;
    if (rarityIndicators.includes('white label')) rarityScore += 4;
    
    // Âge (plus vieux = plus rare)
    if (data.year) {
      const age = new Date().getFullYear() - data.year;
      if (age > 50) rarityScore += 3;
      else if (age > 30) rarityScore += 2;
      else if (age > 15) rarityScore += 1;
    }

    // Format spéciaux
    if (data.format?.includes('45 RPM')) rarityScore += 1;
    if (data.format?.includes('78 RPM')) rarityScore += 3;

    // Classification finale
    if (rarityScore >= 8) return 'ultra_rare';
    if (rarityScore >= 6) return 'very_rare';
    if (rarityScore >= 4) return 'rare';
    if (rarityScore >= 2) return 'uncommon';
    return 'common';
  }

  // Helpers de parsing
  private parseImageAnalysis(content: string): Partial<SmartAnalysisResult> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { confidence: 0 };
      
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: this.mapObjectTypeToCategory(parsed.object_type),
        extracted_data: {
          title: parsed.title,
          artist_author: parsed.artist_author,
          year: parsed.year,
          publisher_label: parsed.publisher_label,
          format: parsed.format_details,
          condition: parsed.condition_visual
        },
        confidence: parsed.confidence_score || 0.7
      };
    } catch (error) {
      console.error('Failed to parse image analysis:', error);
      return { confidence: 0 };
    }
  }

  private parseTextAnalysis(content: string): Partial<SmartAnalysisResult> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { confidence: 0 };
      
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.probable_type as ItemCategory,
        extracted_data: {
          title: parsed.title,
          artist_author: parsed.artist_author,
          year: parsed.year,
          publisher_label: parsed.publisher_label
        },
        search_queries: parsed.search_terms,
        confidence: parsed.confidence || 0.6
      };
    } catch (error) {
      console.error('Failed to parse text analysis:', error);
      return { confidence: 0 };
    }
  }

  private mapObjectTypeToCategory(objectType: string): ItemCategory {
    const mapping: { [key: string]: ItemCategory } = {
      'book': 'books',
      'cd': 'cds',
      'vinyl': 'records',
      'dvd': 'dvds',
      'bluray': 'dvds',
      'comic': 'comics',
      'card': 'trading_cards'
    };
    
    return mapping[objectType] || 'other';
  }

  private capitalizeTitle(title: string): string {
    return title.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }
  // Simulation intelligente pour le mode démo
  private simulateTextAnalysis(textInput: string): Partial<SmartAnalysisResult> {
    const input = textInput.toLowerCase();
    let category: ItemCategory = 'other';
    let title = '';
    let artist_author = '';
    let year: number | undefined;
    let estimated_rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'ultra_rare' = 'common';
    let confidence = 0.8;

    // Détection intelligente par mots-clés spécifiques
    if (input.includes('abbey road') && input.includes('beatles')) {
      category = 'records';
      title = 'Abbey Road';
      artist_author = 'The Beatles';
      year = 1969;
      estimated_rarity = 'uncommon';
      confidence = 0.95;
    } else if (input.includes('anciens canadiens') || input.includes('philippe aubert')) {
      category = 'books';
      title = 'Les Anciens Canadiens';
      artist_author = 'Philippe Aubert de Gaspé';
      year = 1863;
      estimated_rarity = 'rare';
      confidence = 0.90;
    } else if (input.includes('gretzky') && (input.includes('card') || input.includes('carte'))) {
      category = 'sports_cards';
      title = 'Wayne Gretzky Rookie Card';
      artist_author = 'Topps';
      year = 1979;
      estimated_rarity = 'ultra_rare';
      confidence = 0.95;
    } else if (input.includes('pink floyd') && input.includes('wall')) {
      category = 'records';
      title = 'The Wall';
      artist_author = 'Pink Floyd';
      year = 1979;
      estimated_rarity = 'uncommon';
      confidence = 0.92;
    } else {
      // Détection générique par mots-clés
      if (input.includes('vinyl') || input.includes('lp') || input.includes('album')) {
        category = 'records';
        estimated_rarity = 'uncommon';
      } else if (input.includes('book') || input.includes('livre')) {
        category = 'books';
        estimated_rarity = 'common';
      } else if (input.includes('card') || input.includes('carte')) {
        if (input.includes('hockey') || input.includes('baseball') || input.includes('sport')) {
          category = 'sports_cards';
          estimated_rarity = 'rare';
        } else {
          category = 'trading_cards';
          estimated_rarity = 'common';
        }
      } else if (input.includes('cd')) {
        category = 'cds';
        estimated_rarity = 'common';
      } else if (input.includes('comic') || input.includes('bd')) {
        category = 'comics';
        estimated_rarity = 'uncommon';
      }

      // Extraction générique titre/artiste
      const parts = textInput.split(' ');
      if (parts.length >= 2) {
        if (parts.length <= 4) {
          title = parts.slice(0, Math.ceil(parts.length/2)).join(' ');
          artist_author = parts.slice(Math.ceil(parts.length/2)).join(' ');
        } else {
          title = parts.slice(0, -2).join(' ');
          artist_author = parts.slice(-2).join(' ');
        }
      }
      
      confidence = 0.6;
    }

    const search_queries = [
      textInput,
      (title + ' ' + artist_author).trim(),
      title,
      artist_author
    ].filter(q => q && q.trim().length > 0);

    return {
      category,
      confidence,
      extracted_data: {
        title: this.capitalizeTitle(title || textInput),
        artist_author: this.capitalizeTitle(artist_author),
        year,
        format: category === 'records' ? 'LP' : category === 'books' ? 'Paperback' : undefined
      },
      search_queries,
      estimated_rarity
    };
  }}
