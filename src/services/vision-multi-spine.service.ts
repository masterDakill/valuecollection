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
    return `Analyze this image containing multiple book spines on a shelf.

TASK: Identify and extract information from each individual book spine visible in the image.

INSTRUCTIONS:
1. Detect up to ${options.maxItems} book spines
2. For each spine, extract:
   - Title (exact text from spine)
   - Author name (if visible)
   - Publisher/Label (if visible)
   - Year (if visible)
   - Approximate position in image (normalized 0-1: x, y, width, height)
3. Skip spines that are too blurry or partially hidden
4. Confidence level for each detection (0-1)

OUTPUT FORMAT (JSON array):
[
  {
    "rawText": "Full text visible on spine",
    "bbox": [x, y, width, height],
    "confidence": 0.95
  },
  ...
]

IMPORTANT:
- Return ONLY valid JSON, no additional text
- Normalize bbox coordinates to 0-1 range
- Order books from left to right (or top to bottom)
- Include only spines with confidence >= 0.5

Begin analysis now:`;
  }

  /**
   * Parse la réponse de GPT-4o Vision
   */
  private parseVisionResponse(content: string, maxItems: number): VisionSpineResult[] {
    try {
      // Extraire le JSON du contenu (au cas où il y aurait du texte autour)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('[VisionMultiSpine] No JSON array found in response, returning empty array');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      // Valider et limiter les résultats
      return parsed
        .filter(item => item.rawText && item.bbox && item.confidence >= 0.5)
        .slice(0, maxItems)
        .map(item => ({
          rawText: item.rawText,
          bbox: item.bbox,
          confidence: item.confidence
        }));

    } catch (error) {
      console.error('[VisionMultiSpine] Failed to parse response:', error);
      // Fallback: essayer de créer un seul résultat avec tout le texte
      return [{
        rawText: content,
        bbox: [0, 0, 1, 1],
        confidence: 0.5
      }];
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
