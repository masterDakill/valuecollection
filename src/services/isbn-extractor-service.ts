// 📖 Service d'Extraction ISBN et Détails d'Édition
// Extraction OCR + Validation + Enrichissement via APIs

export interface ISBNExtractionResult {
  // Identifiants trouvés
  isbn13?: string;
  isbn10?: string;
  oclc_number?: string;
  lccn?: string;

  // Détails d'édition détectés
  edition_details: {
    edition_statement?: string;  // "First Edition", "Limited Edition"
    printing_number?: number;    // 1, 2, 3...
    print_run?: number;          // Nombre d'exemplaires
    number_line?: string;        // "10 9 8 7 6 5 4 3 2 1"

    // Flags booléens
    is_first_edition: boolean;
    is_first_printing: boolean;
    is_limited_edition: boolean;
    is_signed: boolean;
    is_numbered: boolean;
    copy_number?: string;        // "123/500"
  };

  // Publication
  publication_info: {
    publisher?: string;
    publisher_location?: string;
    publication_year?: number;
    publication_month?: string;
    copyright_year?: number;
  };

  // Texte OCR complet
  ocr_text: {
    title_page?: string;
    copyright_page?: string;
    colophon?: string;
  };

  // Confiance
  confidence: {
    isbn_confidence: number;      // 0-1
    edition_confidence: number;   // 0-1
    overall_confidence: number;   // 0-1
  };

  // Sources
  data_sources: string[];         // 'ocr', 'barcode', 'api_lookup'
}

export class ISBNExtractorService {
  private openaiApiKey: string;

  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
  }

  /**
   * EXTRACTION PRINCIPALE
   * Analyse une ou plusieurs images pour extraire ISBN et détails
   */
  async extractFromImages(imageUrls: string[]): Promise<ISBNExtractionResult> {
    const results: Partial<ISBNExtractionResult>[] = [];

    // Analyser chaque image
    for (const imageUrl of imageUrls) {
      const result = await this.analyzeImageForISBN(imageUrl);
      results.push(result);
    }

    // Consolider les résultats
    return this.consolidateResults(results);
  }

  /**
   * ANALYSE D'UNE IMAGE AVEC GPT-4o VISION
   */
  private async analyzeImageForISBN(imageUrl: string): Promise<Partial<ISBNExtractionResult>> {
    const prompt = `Tu es un expert en identification de livres. Analyse cette image et extrait TOUTES les informations suivantes si visibles:

1. ISBN (ISBN-13 ou ISBN-10) - CRITIQUE
2. Numéro OCLC (WorldCat)
3. LCCN (Library of Congress Control Number)
4. Mention d'édition (First Edition, Limited Edition, etc.)
5. Numéro d'impression (Number Line: "10 9 8 7 6 5 4 3 2 1")
6. Éditeur et lieu de publication
7. Année de publication et copyright
8. Signatures ou dédicaces
9. Numérotation si édition limitée (ex: "123/500")

Retourne un JSON STRICT avec cette structure exacte:
{
  "isbn13": "978-X-XXX-XXXXX-X ou null",
  "isbn10": "X-XXX-XXXXX-X ou null",
  "oclc_number": "string ou null",
  "lccn": "string ou null",
  "edition_statement": "string ou null",
  "number_line": "string ou null",
  "printing_number": number ou null,
  "print_run": number ou null,
  "is_first_edition": boolean,
  "is_first_printing": boolean,
  "is_limited_edition": boolean,
  "is_signed": boolean,
  "is_numbered": boolean,
  "copy_number": "string ou null",
  "publisher": "string ou null",
  "publisher_location": "string ou null",
  "publication_year": number ou null,
  "publication_month": "string ou null",
  "copyright_year": number ou null,
  "ocr_text_title_page": "texte complet ou null",
  "ocr_text_copyright_page": "texte complet ou null",
  "confidence_isbn": 0.0 à 1.0,
  "confidence_edition": 0.0 à 1.0
}

IMPORTANT:
- Si un ISBN est visible, extrais-le EXACTEMENT comme écrit
- Si tu vois "First Edition" ou "First Printing", is_first_edition = true
- Si la number line commence par "1" (ex: "1 2 3 4 5"), is_first_printing = true
- Si tu vois une signature, is_signed = true
- Sois très précis sur les éditions, c'est CRUCIAL pour la valeur`;

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
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'high' // Haute résolution pour OCR précis
                  }
                }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.1 // Précision maximale
        })
      });

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Parser le JSON retourné
      const extracted = this.parseJSONResponse(content);

      return {
        isbn13: extracted.isbn13,
        isbn10: extracted.isbn10,
        oclc_number: extracted.oclc_number,
        lccn: extracted.lccn,
        edition_details: {
          edition_statement: extracted.edition_statement,
          printing_number: extracted.printing_number,
          print_run: extracted.print_run,
          number_line: extracted.number_line,
          is_first_edition: extracted.is_first_edition || false,
          is_first_printing: extracted.is_first_printing || false,
          is_limited_edition: extracted.is_limited_edition || false,
          is_signed: extracted.is_signed || false,
          is_numbered: extracted.is_numbered || false,
          copy_number: extracted.copy_number
        },
        publication_info: {
          publisher: extracted.publisher,
          publisher_location: extracted.publisher_location,
          publication_year: extracted.publication_year,
          publication_month: extracted.publication_month,
          copyright_year: extracted.copyright_year
        },
        ocr_text: {
          copyright_page: extracted.ocr_text_copyright_page,
          title_page: extracted.ocr_text_title_page
        },
        confidence: {
          isbn_confidence: extracted.confidence_isbn || 0.5,
          edition_confidence: extracted.confidence_edition || 0.5,
          overall_confidence: (extracted.confidence_isbn + extracted.confidence_edition) / 2
        },
        data_sources: ['ocr']
      };

    } catch (error) {
      console.error('Erreur extraction ISBN:', error);
      return {};
    }
  }

  /**
   * CONSOLIDER RÉSULTATS DE PLUSIEURS IMAGES
   */
  private consolidateResults(results: Partial<ISBNExtractionResult>[]): ISBNExtractionResult {
    // Prendre le résultat avec la meilleure confiance globale
    const bestResult = results.reduce((best, current) => {
      const bestConfidence = best.confidence?.overall_confidence || 0;
      const currentConfidence = current.confidence?.overall_confidence || 0;
      return currentConfidence > bestConfidence ? current : best;
    }, results[0] || {});

    // Fusionner les données manquantes des autres résultats
    for (const result of results) {
      if (!bestResult.isbn13 && result.isbn13) bestResult.isbn13 = result.isbn13;
      if (!bestResult.isbn10 && result.isbn10) bestResult.isbn10 = result.isbn10;

      // Fusionner edition_details
      if (result.edition_details) {
        bestResult.edition_details = {
          ...bestResult.edition_details,
          ...result.edition_details,
          is_first_edition: bestResult.edition_details?.is_first_edition || result.edition_details.is_first_edition,
          is_first_printing: bestResult.edition_details?.is_first_printing || result.edition_details.is_first_printing,
          is_signed: bestResult.edition_details?.is_signed || result.edition_details.is_signed
        };
      }
    }

    // Recalculer confiance globale
    const isbnConfidence = bestResult.isbn13 || bestResult.isbn10 ? 0.9 : 0.3;
    const editionConfidence = bestResult.edition_details?.is_first_edition ? 0.85 : 0.5;

    return {
      isbn13: bestResult.isbn13,
      isbn10: bestResult.isbn10,
      oclc_number: bestResult.oclc_number,
      lccn: bestResult.lccn,
      edition_details: bestResult.edition_details || {
        is_first_edition: false,
        is_first_printing: false,
        is_limited_edition: false,
        is_signed: false,
        is_numbered: false
      },
      publication_info: bestResult.publication_info || {},
      ocr_text: bestResult.ocr_text || {},
      confidence: {
        isbn_confidence: isbnConfidence,
        edition_confidence: editionConfidence,
        overall_confidence: (isbnConfidence + editionConfidence) / 2
      },
      data_sources: ['ocr']
    };
  }

  /**
   * ENRICHIR AVEC API LOOKUP
   * Si ISBN trouvé, récupérer détails complets depuis bases de données
   */
  async enrichWithAPIs(extraction: ISBNExtractionResult): Promise<ISBNExtractionResult> {
    const isbn = extraction.isbn13 || extraction.isbn10;
    if (!isbn) return extraction;

    // Essayer plusieurs sources en parallèle
    const [googleBooks, openLibrary] = await Promise.all([
      this.lookupGoogleBooks(isbn).catch(() => null),
      this.lookupOpenLibrary(isbn).catch(() => null)
    ]);

    // Enrichir avec données API si manquantes
    if (googleBooks) {
      extraction.publication_info.publisher = extraction.publication_info.publisher || googleBooks.publisher;
      extraction.publication_info.publication_year = extraction.publication_info.publication_year || googleBooks.year;
    }

    if (openLibrary) {
      extraction.publication_info.publisher = extraction.publication_info.publisher || openLibrary.publishers?.[0];
    }

    extraction.data_sources.push('api_lookup');
    return extraction;
  }

  /**
   * LOOKUP GOOGLE BOOKS API
   */
  private async lookupGoogleBooks(isbn: string): Promise<any> {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const book = data.items[0].volumeInfo;
      return {
        title: book.title,
        authors: book.authors,
        publisher: book.publisher,
        year: parseInt(book.publishedDate?.substring(0, 4)),
        description: book.description
      };
    }

    return null;
  }

  /**
   * LOOKUP OPEN LIBRARY API
   */
  private async lookupOpenLibrary(isbn: string): Promise<any> {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    const response = await fetch(url);
    const data = await response.json();

    const key = `ISBN:${isbn}`;
    if (data[key]) {
      return data[key];
    }

    return null;
  }

  /**
   * VALIDATION ISBN
   */
  validateISBN13(isbn: string): boolean {
    // Retirer tirets et espaces
    const cleaned = isbn.replace(/[-\s]/g, '');

    if (cleaned.length !== 13 || !/^\d{13}$/.test(cleaned)) {
      return false;
    }

    // Algorithme de validation ISBN-13
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(cleaned[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(cleaned[12]);
  }

  validateISBN10(isbn: string): boolean {
    const cleaned = isbn.replace(/[-\s]/g, '');

    if (cleaned.length !== 10) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned[i]) * (10 - i);
    }

    const checkChar = cleaned[9];
    const checkDigit = checkChar === 'X' ? 10 : parseInt(checkChar);
    return (sum + checkDigit) % 11 === 0;
  }

  /**
   * CONVERTIR ISBN-10 → ISBN-13
   */
  convertISBN10to13(isbn10: string): string {
    const cleaned = isbn10.replace(/[-\s]/g, '').substring(0, 9);
    const prefix = '978' + cleaned;

    // Calculer check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(prefix[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return `978-${cleaned.substring(0, 1)}-${cleaned.substring(1, 4)}-${cleaned.substring(4, 9)}-${checkDigit}`;
  }

  /**
   * PARSER RÉPONSE JSON (robuste)
   */
  private parseJSONResponse(content: string): any {
    try {
      // Essayer de trouver le JSON dans la réponse
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {};
    } catch (error) {
      console.error('Erreur parsing JSON:', error);
      return {};
    }
  }

  /**
   * DÉTECTER ÉDITION DEPUIS NUMBER LINE
   */
  detectPrintingFromNumberLine(numberLine: string): number {
    // Exemples:
    // "10 9 8 7 6 5 4 3 2 1" → 1st printing
    // "10 9 8 7 6 5 4 3 2" → 2nd printing
    // "5 4 3 2 1" → 1st printing
    // "1 3 5 7 9 10 8 6 4 2" → 1st printing (variant)

    const numbers = numberLine.match(/\d+/g)?.map(n => parseInt(n)) || [];

    if (numbers.length === 0) return 1;

    // Le plus petit numéro indique l'impression
    return Math.min(...numbers);
  }
}
