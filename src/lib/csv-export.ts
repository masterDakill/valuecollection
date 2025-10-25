typescript
import type { DetectedBook } from '../schemas/photo-books.schema';
import { BooksService } from './books-service'; // EXISTE DÉJÀ
import { DiscogsService } from './discogs-service'; // EXISTE DÉJÀ
import { EbayService } from './ebay-service'; // EXISTE DÉJÀ
import { APICacheService } from './api-cache-service'; // EXISTE DÉJÀ

export class BooksEnrichmentService {
  constructor(
    private booksService: BooksService,
    private discogsService: DiscogsService,
    private ebayService: EbayService,
    private cacheService: APICacheService
  ) {}

  async enrichBook(
    book: Partial<DetectedBook>
  ): Promise<Partial<DetectedBook>> {
    const results: Partial<DetectedBook> = { ...book };
    const sources: string[] = [];

    try {
      // 1. Google Books (ISBN priority)
      if (book.isbn_13 || book.isbn_10) {
        const googleData = await this.booksService.searchByISBN(
          book.isbn_13 || book.isbn_10
        );
        if (googleData) {
          results.publisher_label = googleData.publisher;
          results.year = googleData.year;
          sources.push('google_books');
        }
      }

      // 2. AbeBooks (pricing for books)
      if (book.category === 'books') {
        const abeData = await this.searchAbeBooks(book.title, book.artist_author);
        if (abeData) {
          results.estimated_value_min = abeData.minPrice;
          results.estimated_value_median = abeData.medianPrice;
          results.estimated_value_max = abeData.maxPrice;
          results.rarity_score = abeData.rarityScore;
          sources.push('abebooks');
        }
      }

      // 3. Discogs (si musique détectée)
      if (book.category === 'music') {
        const discogsData = await this.discogsService.search(
          `${book.artist_author} ${book.title}`
        );
        if (discogsData) {
          results.publisher_label = discogsData.label;
          results.year = discogsData.year;
          sources.push('discogs');
        }
      }

      // 4. eBay (market trend)
      const ebayData = await this.ebayService.search(
        `${book.title} ${book.artist_author}`
      );
      if (ebayData && ebayData.length > 0) {
        const prices = ebayData.map(item => item.price);
        results.market_trend = this.calculateTrend(prices);
        sources.push('ebay');
      }

      results.sources_used = sources;

    } catch (error) {
      console.error('[Enrichment] Error enriching book:', error);
      results.notes = `Enrichment partially failed: ${error.message}`;
    }

    return results;
  }

  async enrichBatch(books: Partial<DetectedBook>[]): Promise<Partial<DetectedBook>[]> {
    // Parallel avec throttling (max 5 simultanés)
    const batches = [];
    for (let i = 0; i < books.length; i += 5) {
      const batch = books.slice(i, i + 5);
      batches.push(Promise.allSettled(
        batch.map(book => this.enrichBook(book))
      ));
    }

    const results = await Promise.all(batches);
    return results.flat().map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
  }

  private calculateTrend(prices: number[]): 'up' | 'stable' | 'down' {
    // TODO: Implémenter logique de tendance
    return 'stable';
  }

  private async searchAbeBooks(title: string, author: string): Promise<any> {
    // TODO: Implémenter recherche AbeBooks
    // API: https://www.abebooks.com/servlet/DevelopersAPI
    return null;
  }
}