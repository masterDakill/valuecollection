/**
 * Ad Generator Service
 * Generates simple marketplace listings from collection items
 */

export interface CollectionItem {
  id?: number;
  title: string;
  artist_author?: string;
  publisher_label?: string;
  year?: number;
  isbn?: string;
  isbn_13?: string;
  condition?: string;
  estimated_value?: number;
  description?: string;
  category?: string;
  primary_image_url?: string;
}

export interface GeneratedAd {
  id: string;
  itemId: number;
  title: string;
  price: string;
  description: string;
  condition: string;
  platform: string;
  keywords: string[];
  createdAt: string;
}

export class AdGeneratorService {
  /**
   * Generate a simple marketplace ad from an item
   */
  generateAd(item: CollectionItem, platform: string = 'eBay'): GeneratedAd {
    const title = this.generateTitle(item);
    const price = this.formatPrice(item.estimated_value);
    const description = this.generateDescription(item);
    const condition = this.normalizeCondition(item.condition);
    const keywords = this.extractKeywords(item);
    
    return {
      id: `ad-${item.id}-${Date.now()}`,
      itemId: item.id || 0,
      title,
      price,
      description,
      condition,
      platform,
      keywords,
      createdAt: new Date().toISOString()
    };
  }
  
  /**
   * Generate optimized title for marketplace
   */
  private generateTitle(item: CollectionItem): string {
    let title = item.title || 'Untitled Item';
    
    // Add author if available
    if (item.artist_author) {
      title = `${title} - ${item.artist_author}`;
    }
    
    // Add year if available
    if (item.year) {
      title = `${title} (${item.year})`;
    }
    
    // Truncate to 80 chars for eBay
    if (title.length > 80) {
      title = title.substring(0, 77) + '...';
    }
    
    return title;
  }
  
  /**
   * Format price for display
   */
  private formatPrice(value?: number): string {
    if (!value || value === 0) {
      return 'Prix à discuter';
    }
    
    // Add 10% markup for negotiation room
    const listingPrice = Math.round(value * 1.1 * 100) / 100;
    
    return `${listingPrice.toFixed(2)} CAD`;
  }
  
  /**
   * Generate simple description
   */
  private generateDescription(item: CollectionItem): string {
    const parts: string[] = [];
    
    // Title
    parts.push(`📚 ${item.title || 'Livre'}`);
    parts.push('');
    
    // Basic info
    if (item.artist_author) {
      parts.push(`✍️ Auteur: ${item.artist_author}`);
    }
    
    if (item.publisher_label) {
      parts.push(`📖 Éditeur: ${item.publisher_label}`);
    }
    
    if (item.year) {
      parts.push(`📅 Année: ${item.year}`);
    }
    
    if (item.isbn_13 || item.isbn) {
      parts.push(`🔢 ISBN: ${item.isbn_13 || item.isbn}`);
    }
    
    parts.push('');
    
    // Condition
    const condition = this.normalizeCondition(item.condition);
    const conditionEmoji = this.getConditionEmoji(condition);
    parts.push(`${conditionEmoji} État: ${condition}`);
    parts.push('');
    
    // Additional description if available
    if (item.description) {
      parts.push('📝 Description:');
      parts.push(item.description);
      parts.push('');
    }
    
    // Standard footer
    parts.push('📦 Expédition rapide et soignée');
    parts.push('💳 Paiement sécurisé');
    parts.push('✅ Vendeur sérieux');
    
    return parts.join('\n');
  }
  
  /**
   * Normalize condition to standard values
   */
  private normalizeCondition(condition?: string): string {
    if (!condition) return 'Bon état';
    
    const lower = condition.toLowerCase();
    
    if (lower.includes('new') && !lower.includes('like')) return 'Neuf';
    if (lower.includes('like new') || lower.includes('très bon')) return 'Comme neuf';
    if (lower.includes('very good')) return 'Très bon état';
    if (lower.includes('good') || lower.includes('bon')) return 'Bon état';
    if (lower.includes('acceptable')) return 'État acceptable';
    
    return 'Bon état';
  }
  
  /**
   * Get emoji for condition
   */
  private getConditionEmoji(condition: string): string {
    if (condition.includes('Neuf')) return '⭐';
    if (condition.includes('Comme neuf')) return '✨';
    if (condition.includes('Très bon')) return '👍';
    if (condition.includes('Bon')) return '✓';
    return '📦';
  }
  
  /**
   * Extract keywords from item
   */
  private extractKeywords(item: CollectionItem): string[] {
    const keywords: string[] = [];
    
    // Category
    if (item.category) {
      keywords.push(item.category);
    }
    
    // Author name parts
    if (item.artist_author) {
      keywords.push(...item.artist_author.split(' ').filter(w => w.length > 2));
    }
    
    // Publisher
    if (item.publisher_label) {
      keywords.push(item.publisher_label);
    }
    
    // Title words (significant ones)
    if (item.title) {
      const titleWords = item.title.split(' ')
        .filter(w => w.length > 3)
        .slice(0, 5);
      keywords.push(...titleWords);
    }
    
    // Common keywords
    keywords.push('livre', 'book', 'collection');
    
    return [...new Set(keywords)]; // Remove duplicates
  }
  
  /**
   * Generate multiple ads
   */
  generateBatch(items: CollectionItem[], platform: string = 'eBay'): GeneratedAd[] {
    return items.map(item => this.generateAd(item, platform));
  }
}

/**
 * Factory function
 */
export function createAdGeneratorService() {
  return new AdGeneratorService();
}
