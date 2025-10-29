/**
 * Service de Comparaison d'Éditions
 * Compare différentes éditions d'un même livre
 */

import { createLogger } from '../lib/logger';
import { createBookEnrichmentService } from './book-enrichment.service';

interface Edition {
  title: string;
  isbn10?: string;
  isbn13?: string;
  publisher?: string;
  publishedDate?: string;
  format?: string; // hardcover, paperback, ebook, audiobook
  language?: string;
  pageCount?: number;
  imageUrl?: string;
  description?: string;
  avgPrice?: number;
  availability?: string;
}

interface EditionComparison {
  originalBook: {
    title: string;
    author?: string;
  };
  editions: Edition[];
  mostValuable?: Edition;
  mostRare?: Edition;
  mostCommon?: Edition;
  recommendations: string[];
  totalEditionsFound: number;
}

export class EditionComparatorService {
  private logger = createLogger('EditionComparator');
  private googleBooksKey: string;

  constructor(googleBooksApiKey: string) {
    this.googleBooksKey = googleBooksApiKey;
  }

  /**
   * Trouve et compare toutes les éditions d'un livre
   */
  async compareEditions(title: string, author?: string): Promise<EditionComparison> {
    try {
      this.logger.info('Comparing editions', { title, author });

      // Rechercher toutes les éditions via Google Books
      const editions = await this.findAllEditions(title, author);

      // Analyser et classifier
      const comparison = this.analyzeEditions(title, author, editions);

      this.logger.info('Edition comparison completed', {
        totalFound: comparison.totalEditionsFound
      });

      return comparison;

    } catch (error: any) {
      this.logger.error('Edition comparison failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Recherche toutes les éditions via Google Books
   */
  private async findAllEditions(title: string, author?: string): Promise<Edition[]> {
    const editions: Edition[] = [];

    try {
      // Construire query de recherche
      let query = `intitle:"${title}"`;
      if (author) {
        query += ` inauthor:"${author}"`;
      }

      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=40&key=${this.googleBooksKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return [];
      }

      // Extraire les éditions
      for (const item of data.items) {
        const volumeInfo = item.volumeInfo;

        const edition: Edition = {
          title: volumeInfo.title,
          publisher: volumeInfo.publisher,
          publishedDate: volumeInfo.publishedDate,
          isbn10: volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier,
          isbn13: volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier,
          format: this.detectFormat(volumeInfo),
          language: volumeInfo.language,
          pageCount: volumeInfo.pageCount,
          imageUrl: volumeInfo.imageLinks?.thumbnail,
          description: volumeInfo.description,
          availability: item.saleInfo?.saleability || 'NOT_FOR_SALE'
        };

        // Ajouter seulement si on a un ISBN (évite duplicatas)
        if (edition.isbn13 || edition.isbn10) {
          editions.push(edition);
        }
      }

      // Dédoublonner par ISBN-13
      const uniqueEditions = this.deduplicateEditions(editions);

      this.logger.info('Editions found', {
        total: uniqueEditions.length,
        formats: this.countByFormat(uniqueEditions)
      });

      return uniqueEditions;

    } catch (error: any) {
      this.logger.error('Failed to find editions', { error: error.message });
      return [];
    }
  }

  /**
   * Détecte le format du livre
   */
  private detectFormat(volumeInfo: any): string {
    const title = volumeInfo.title?.toLowerCase() || '';
    const subtitle = volumeInfo.subtitle?.toLowerCase() || '';
    const description = volumeInfo.description?.toLowerCase() || '';

    const combined = `${title} ${subtitle} ${description}`;

    if (combined.includes('audiobook') || combined.includes('audio book')) return 'audiobook';
    if (combined.includes('ebook') || combined.includes('kindle') || combined.includes('epub')) return 'ebook';
    if (combined.includes('hardcover') || combined.includes('hardback')) return 'hardcover';
    if (combined.includes('paperback') || combined.includes('softcover')) return 'paperback';

    // Par défaut, utiliser printType
    if (volumeInfo.printType === 'BOOK') {
      // Si pas d'info, supposer paperback (plus commun)
      return 'paperback';
    }

    return 'unknown';
  }

  /**
   * Déduplique les éditions par ISBN-13
   */
  private deduplicateEditions(editions: Edition[]): Edition[] {
    const seen = new Set<string>();
    const unique: Edition[] = [];

    for (const edition of editions) {
      const key = edition.isbn13 || edition.isbn10 || edition.title;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(edition);
      }
    }

    return unique;
  }

  /**
   * Compte les éditions par format
   */
  private countByFormat(editions: Edition[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const edition of editions) {
      const format = edition.format || 'unknown';
      counts[format] = (counts[format] || 0) + 1;
    }

    return counts;
  }

  /**
   * Analyse les éditions et génère les recommandations
   */
  private analyzeEditions(title: string, author: string | undefined, editions: Edition[]): EditionComparison {
    const recommendations: string[] = [];

    // Trouver la plus ancienne (potentiellement première édition)
    const oldestEdition = this.findOldestEdition(editions);

    // Trouver hardcover (généralement plus valorisée)
    const hardcoverEditions = editions.filter(e => e.format === 'hardcover');

    // Stats par format
    const formatCounts = this.countByFormat(editions);

    // Générer recommandations
    if (hardcoverEditions.length > 0) {
      recommendations.push(`${hardcoverEditions.length} édition(s) hardcover disponible(s) - généralement plus valorisées`);
    }

    if (oldestEdition) {
      recommendations.push(`Édition la plus ancienne: ${oldestEdition.publishedDate} - Vérifier si première édition`);
    }

    if (formatCounts['audiobook']) {
      recommendations.push(`${formatCounts['audiobook']} édition(s) audiobook disponible(s)`);
    }

    if (formatCounts['ebook']) {
      recommendations.push(`${formatCounts['ebook']} édition(s) numérique(s) disponible(s)`);
    }

    if (editions.length > 10) {
      recommendations.push(`Grande disponibilité (${editions.length} éditions) - Livre populaire`);
    } else if (editions.length < 3) {
      recommendations.push(`Peu d'éditions trouvées (${editions.length}) - Potentiellement rare`);
    }

    return {
      originalBook: {
        title,
        author
      },
      editions: editions.sort((a, b) => {
        // Trier par date (plus anciennes en premier)
        const dateA = a.publishedDate || '9999';
        const dateB = b.publishedDate || '9999';
        return dateA.localeCompare(dateB);
      }),
      mostValuable: hardcoverEditions[0] || oldestEdition,
      mostRare: oldestEdition,
      mostCommon: editions.find(e => e.format === 'paperback'),
      recommendations,
      totalEditionsFound: editions.length
    };
  }

  /**
   * Trouve l'édition la plus ancienne
   */
  private findOldestEdition(editions: Edition[]): Edition | undefined {
    let oldest: Edition | undefined;
    let oldestDate = '9999';

    for (const edition of editions) {
      if (edition.publishedDate && edition.publishedDate < oldestDate) {
        oldestDate = edition.publishedDate;
        oldest = edition;
      }
    }

    return oldest;
  }

  /**
   * Génère un rapport textuel de comparaison
   */
  generateComparisonReport(comparison: EditionComparison): string {
    let report = `📚 COMPARAISON DES ÉDITIONS\n\n`;
    report += `Livre: ${comparison.originalBook.title}\n`;
    if (comparison.originalBook.author) {
      report += `Auteur: ${comparison.originalBook.author}\n`;
    }
    report += `\nÉditions trouvées: ${comparison.totalEditionsFound}\n\n`;

    if (comparison.mostRare) {
      report += `📖 ÉDITION LA PLUS ANCIENNE:\n`;
      report += `   ${comparison.mostRare.title}\n`;
      report += `   ${comparison.mostRare.publisher || 'Éditeur inconnu'} - ${comparison.mostRare.publishedDate}\n`;
      report += `   Format: ${comparison.mostRare.format}\n`;
      if (comparison.mostRare.isbn13) {
        report += `   ISBN-13: ${comparison.mostRare.isbn13}\n`;
      }
      report += `\n`;
    }

    if (comparison.mostValuable && comparison.mostValuable !== comparison.mostRare) {
      report += `💎 ÉDITION POTENTIELLEMENT LA PLUS VALORISÉE:\n`;
      report += `   ${comparison.mostValuable.title}\n`;
      report += `   ${comparison.mostValuable.publisher || 'Éditeur inconnu'} - ${comparison.mostValuable.publishedDate}\n`;
      report += `   Format: ${comparison.mostValuable.format}\n`;
      report += `\n`;
    }

    report += `💡 RECOMMANDATIONS:\n`;
    for (const rec of comparison.recommendations) {
      report += `   • ${rec}\n`;
    }

    return report;
  }
}

export function createEditionComparatorService(googleBooksApiKey: string): EditionComparatorService {
  return new EditionComparatorService(googleBooksApiKey);
}
