/**
 * Book Enrichment Service
 * Recherche et enrichit les données des livres via APIs externes
 */

export interface BookSearchResult {
  title: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  isbn10?: string;
  isbn13?: string;
  pageCount?: number;
  categories?: string[];
  description?: string;
  imageUrl?: string;
  language?: string;
  source: 'google_books' | 'open_library' | 'manual';
  confidence: number;
}

export class BookEnrichmentService {
  private googleBooksApiKey: string;

  constructor(googleBooksApiKey: string) {
    this.googleBooksApiKey = googleBooksApiKey;
  }

  /**
   * Recherche un livre sur Google Books API
   */
  async searchGoogleBooks(query: string): Promise<BookSearchResult[]> {
    const url = new URL('https://www.googleapis.com/books/v1/volumes');
    url.searchParams.set('q', query);
    url.searchParams.set('key', this.googleBooksApiKey);
    url.searchParams.set('maxResults', '5');
    url.searchParams.set('langRestrict', 'fr');

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        console.warn('[BookEnrichment] Google Books API error:', response.statusText);
        return [];
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return [];
      }

      return data.items.map((item: any) => {
        const volumeInfo = item.volumeInfo || {};
        const identifiers = volumeInfo.industryIdentifiers || [];

        const isbn10 = identifiers.find((id: any) => id.type === 'ISBN_10')?.identifier;
        const isbn13 = identifiers.find((id: any) => id.type === 'ISBN_13')?.identifier;

        return {
          title: volumeInfo.title || '',
          authors: volumeInfo.authors || [],
          publisher: volumeInfo.publisher,
          publishedDate: volumeInfo.publishedDate,
          isbn10,
          isbn13,
          pageCount: volumeInfo.pageCount,
          categories: volumeInfo.categories || [],
          description: volumeInfo.description,
          imageUrl: volumeInfo.imageLinks?.thumbnail,
          language: volumeInfo.language,
          source: 'google_books' as const,
          confidence: 0.85
        };
      });
    } catch (error) {
      console.error('[BookEnrichment] Google Books search failed:', error);
      return [];
    }
  }

  /**
   * Recherche un livre sur Open Library
   */
  async searchOpenLibrary(query: string): Promise<BookSearchResult[]> {
    const url = new URL('https://openlibrary.org/search.json');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '5');
    url.searchParams.set('fields', 'key,title,author_name,publisher,publish_date,isbn,number_of_pages_median,cover_i,language,subject');

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        console.warn('[BookEnrichment] Open Library API error:', response.statusText);
        return [];
      }

      const data = await response.json();

      if (!data.docs || data.docs.length === 0) {
        return [];
      }

      return data.docs.map((doc: any) => {
        const isbn13 = doc.isbn?.find((i: string) => i.length === 13);
        const isbn10 = doc.isbn?.find((i: string) => i.length === 10);

        return {
          title: doc.title || '',
          authors: doc.author_name || [],
          publisher: doc.publisher?.[0],
          publishedDate: doc.publish_date?.[0],
          isbn10,
          isbn13,
          pageCount: doc.number_of_pages_median,
          categories: doc.subject?.slice(0, 3) || [],
          description: undefined,
          imageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
          language: doc.language?.[0],
          source: 'open_library' as const,
          confidence: 0.75
        };
      });
    } catch (error) {
      console.error('[BookEnrichment] Open Library search failed:', error);
      return [];
    }
  }

  /**
   * Recherche combinée (Google Books + Open Library)
   */
  async searchAllSources(title: string): Promise<BookSearchResult[]> {
    console.log(`[BookEnrichment] Searching for: "${title}"`);

    const [googleResults, openLibResults] = await Promise.all([
      this.searchGoogleBooks(title),
      this.searchOpenLibrary(title)
    ]);

    // Combine et déduplique les résultats
    const allResults = [...googleResults, ...openLibResults];

    // Trier par confidence score
    return allResults.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Enrichit un livre avec les meilleures données trouvées
   */
  async enrichBook(title: string, existingAuthor?: string): Promise<BookSearchResult | null> {
    const query = existingAuthor ? `${title} ${existingAuthor}` : title;
    const results = await this.searchAllSources(query);

    if (results.length === 0) {
      console.warn(`[BookEnrichment] No results found for: ${title}`);
      return null;
    }

    // Retourne le meilleur match (premier résultat)
    const bestMatch = results[0];
    console.log(`[BookEnrichment] Best match: ${bestMatch.title} (${bestMatch.source}, confidence: ${bestMatch.confidence})`);

    return bestMatch;
  }
}

/**
 * Factory function
 */
export function createBookEnrichmentService(googleBooksApiKey: string): BookEnrichmentService {
  return new BookEnrichmentService(googleBooksApiKey);
}
