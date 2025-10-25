/**
 * Vision Multi-Spine Service
 * Détecte et extrait plusieurs dos de livres dans une seule image
 */

import type { DetectedBook } from '../schemas/photo-books.schema';

interface VisionSpineResult {
  rawText: string;
  bbox: [number, number, number, number]; // x, y, width, height (normalized 0-1)
  confidence: number;
}

export class VisionMultiSpineService {
  private openaiApiKey: string;

  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
  }

  /**
   * Détecte plusieurs dos de livres dans une image
   * Utilise GPT-4o Vision pour identifier chaque dos individuellement
   */
  async detectMultipleSpines(
    imageUrl: string | null,
    imageBase64: string | null,
    options: {
      maxItems: number;
      deskew: boolean;
      cropStrategy: 'auto' | 'grid' | 'none';
    }
  ): Promise<VisionSpineResult[]> {
    const startTime = Date.now();

    // Préparer l'image pour l'API
    const imageContent = imageUrl || imageBase64;
    if (!imageContent) {
      throw new Error('No image provided');
    }

    try {
      // Construire le prompt pour détecter plusieurs dos
      const prompt = this.buildMultiSpinePrompt(options);

      // Appel à l'API OpenAI Vision
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageContent,
                    detail: 'high' // Haute résolution pour OCR précis
                  }
                }
              ]
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 4000,
          temperature: 0.1 // Basse température pour précision
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // LOG: Afficher la réponse complète de GPT-4o
      console.log('[VisionMultiSpine] GPT-4o Response:', content);

      // Parser la réponse JSON
      const parsedResults = this.parseVisionResponse(content, options.maxItems);

      console.log(`[VisionMultiSpine] Detected ${parsedResults.length} spines in ${Date.now() - startTime}ms`);

      return parsedResults;

    } catch (error) {
      console.error('[VisionMultiSpine] Error:', error);
      throw error;
    }
  }

  /**
   * Construit le prompt pour détecter plusieurs dos de livres
   */
  private buildMultiSpinePrompt(options: { maxItems: number }): string {
    return `Analyze this image containing one or more books in ANY orientation or presentation.

TASK: Identify and extract information from EACH visible book, regardless of how it's presented.

ACCEPTED FORMATS:
- Book spines/DOS (vertical on shelf, side view showing title on edge)
- Front covers (face-up or standing, showing full cover design)
- Back covers (showing ISBN, publisher info)
- Stacked books (multiple books piled)
- 3D scans or Polycam captures (any angle or perspective)
- Mixed orientations (some spines, some covers in same photo)

INSTRUCTIONS:
1. Detect up to ${options.maxItems} books in ANY presentation
2. For EACH book visible, extract ALL readable information:
   - Title (from spine, cover, or any visible text)
   - Author/Artist name (if visible anywhere)
   - Publisher/Label (if visible)
   - Year/Date (if visible)
   - ISBN (if visible on back cover or inside)
   - Edition info (if visible)
   - Series name (if part of a series)
   - Approximate position in image (normalized 0-1: x, y, width, height)
3. Include books even if partially visible or at odd angles
4. Confidence level for each detection (0-1)
5. For covers: read ALL visible text including subtitles, taglines, author names

OUTPUT FORMAT (JSON object with books array):
{
  "books": [
    {
      "rawText": "All readable text from book (title, author, publisher, etc)",
      "bbox": [x, y, width, height],
      "confidence": 0.95
    }
  ]
}

EXAMPLES of rawText format:
- Spine: "Harry Potter and the Philosopher's Stone - J.K. Rowling - Bloomsbury"
- Cover: "H.P. LOVECRAFT LE ROMAN DE SA VIE par L. Sprague de Camp"
- Mixed: "The Great Gatsby by F. Scott Fitzgerald, Penguin Classics, 2000"

IMPORTANT:
- Return ONLY valid JSON array, no additional commentary
- Normalize bbox coordinates to 0-1 range
- Order books naturally (left-to-right, top-to-bottom)
- Include books with confidence >= 0.4 (lower threshold for flexibility)
- Extract MAXIMUM information from each book
- Work with ANY photo angle, lighting, or book orientation

Begin analysis now:`;
  }

  /**
   * Parse la réponse de GPT-4o Vision
   */
  private parseVisionResponse(content: string, maxItems: number): VisionSpineResult[] {
    try {
      // Parse le JSON (avec response_format json_object, c'est déjà du JSON valide)
      const parsed = JSON.parse(content);

      // Extraire l'array books
      const books = parsed.books || parsed.items || [];

      if (!Array.isArray(books)) {
        console.warn('[VisionMultiSpine] No books array found in response:', parsed);
        return [];
      }

      // Valider et limiter les résultats
      return books
        .filter(item => item.rawText && item.bbox && item.confidence >= 0.4)
        .slice(0, maxItems)
        .map(item => ({
          rawText: item.rawText,
          bbox: item.bbox,
          confidence: item.confidence
        }));

    } catch (error) {
      console.error('[VisionMultiSpine] Failed to parse response:', error, 'Content:', content);
      // Fallback: retourner array vide
      return [];
    }
  }

  /**
   * Prétraitement d'image (deskew, crop)
   * TODO: Implémenter avec Sharp ou Canvas API
   */
  async preprocessImage(
    imageData: string,
    deskew: boolean,
    cropStrategy: string
  ): Promise<string> {
    // Pour l'instant, retourne l'image telle quelle
    // TODO: Ajouter Sharp pour:
    // - Détection d'angle et redressement (deskew)
    // - Découpage automatique en grille
    // - Amélioration de contraste pour l'OCR
    console.warn('[VisionMultiSpine] Image preprocessing not yet implemented');
    return imageData;
  }
}

/**
 * Factory function pour créer le service
 */
export function createVisionMultiSpineService(apiKey: string): VisionMultiSpineService {
  return new VisionMultiSpineService(apiKey);
}
