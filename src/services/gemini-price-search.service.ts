/**
 * Service de Recherche de Prix avec Gemini + Google Search Grounding
 * Utilise la recherche Google intégrée de Gemini pour trouver les vrais prix du marché
 */

import { createLogger } from '../lib/logger';

interface BookPriceSearch {
  title: string;
  author?: string;
  isbn?: string;
  isbn13?: string;
}

interface PriceResult {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  currency: string;
  sources: string[];
  pricesByCondition: {
    excellent?: string;
    good?: string;
    acceptable?: string;
  };
  confidence: number;
  searchResults: string;
}

export class GeminiPriceSearchService {
  private logger = createLogger('GeminiPriceSearch');
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Recherche les prix avec Gemini + Google Search
   */
  async searchPrices(book: BookPriceSearch): Promise<PriceResult | null> {
    try {
      this.logger.info('Searching prices with Gemini + Google', {
        title: book.title,
        isbn: book.isbn13
      });

      const searchQuery = this.buildSearchQuery(book);

      // Appel à Gemini avec Google Search Grounding activé
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: searchQuery
              }]
            }],
            // ACTIVATION DE LA RECHERCHE GOOGLE!
            tools: [{
              googleSearchRetrieval: {
                dynamicRetrievalConfig: {
                  mode: 'MODE_DYNAMIC',
                  dynamicThreshold: 0.3
                }
              }
            }],
            generationConfig: {
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('Gemini API error', {
          status: response.status,
          error: errorText
        });
        return null;
      }

      const data = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        this.logger.warn('No results from Gemini');
        return null;
      }

      const resultText = data.candidates[0].content.parts[0].text;

      // Parser la réponse JSON
      const priceData = this.parseGeminiResponse(resultText);

      this.logger.info('Prices found with Gemini', {
        avgPrice: priceData?.avgPrice,
        sources: priceData?.sources.length
      });

      return priceData;

    } catch (error: any) {
      this.logger.error('Gemini price search failed', { error: error.message });
      return null;
    }
  }

  /**
   * Construit la requête de recherche optimisée
   */
  private buildSearchQuery(book: BookPriceSearch): string {
    const searchTerms: string[] = [];

    if (book.isbn13) searchTerms.push(`ISBN ${book.isbn13}`);
    if (book.isbn) searchTerms.push(`ISBN ${book.isbn}`);
    searchTerms.push(`"${book.title}"`);
    if (book.author) searchTerms.push(`"${book.author}"`);

    return `Tu es un expert en évaluation de livres rares et d'occasion.

**TÂCHE**: Trouve les prix de vente ACTUELS pour ce livre au Canada:

📚 **LIVRE À ÉVALUER**:
${searchTerms.join(' ')}

🔍 **INSTRUCTIONS DE RECHERCHE**:
1. Cherche sur ces sites canadiens/internationaux:
   - AbeBooks.com (site:abebooks.com OR site:abebooks.ca)
   - eBay Canada (site:ebay.ca)
   - Amazon.ca (site:amazon.ca)
   - BookFinder.com
   - Vinted, Marketplace Facebook, Kijiji

2. Trouve des PRIX RÉELS d'annonces ACTUELLES (pas des estimations)

3. Note les prix en CAD$ selon l'état:
   - État EXCELLENT (fine/near fine/like new)
   - État BON (good/very good)
   - État ACCEPTABLE (acceptable/fair)

📊 **FORMAT DE RÉPONSE** (JSON strict):
{
  "minPrice": <prix minimum trouvé en CAD>,
  "maxPrice": <prix maximum trouvé en CAD>,
  "avgPrice": <prix moyen en CAD>,
  "currency": "CAD",
  "sources": ["source1", "source2", "source3"],
  "pricesByCondition": {
    "excellent": "prix-CAD",
    "good": "prix-CAD",
    "acceptable": "prix-CAD"
  },
  "confidence": <0.0-1.0 confiance dans les données>,
  "searchResults": "Résumé des prix trouvés avec sources"
}

⚠️ **IMPORTANT**:
- Utilise UNIQUEMENT des prix trouvés par recherche Google, pas d'estimation
- Si aucun prix trouvé, mets confidence: 0.0
- Convertis tous les prix en CAD (1 USD = 1.35 CAD, 1 EUR = 1.50 CAD)
- Cite tes sources dans searchResults

Réponds UNIQUEMENT avec le JSON, rien d'autre.`;
  }

  /**
   * Parse la réponse JSON de Gemini
   */
  private parseGeminiResponse(responseText: string): PriceResult | null {
    try {
      // Nettoyer le texte (enlever markdown)
      let cleanText = responseText.trim();

      // Enlever les balises markdown ```json
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleanText) as PriceResult;

      // Validation
      if (!parsed.avgPrice || parsed.avgPrice <= 0) {
        this.logger.warn('Invalid price data from Gemini');
        return null;
      }

      return parsed;

    } catch (error: any) {
      this.logger.error('Failed to parse Gemini response', {
        error: error.message,
        responseText: responseText.substring(0, 200)
      });
      return null;
    }
  }
}

export function createGeminiPriceSearchService(apiKey: string): GeminiPriceSearchService {
  return new GeminiPriceSearchService(apiKey);
}
