/**
 * Make.com Webhook Service
 * Sends normalized book data to Make.com webhook for Google Sheets integration
 */

export interface MakeWebhookPayload {
  run_id: string;
  timestamp: string;
  source: string;
  photo_url: string;
  
  titre: string;
  auteur: string;
  editeur: string;
  annee: number;
  ISBN_10: string;
  ISBN_13: string;
  etat: string;
  notes: string;
  
  prix_estime_cad: number;
  prix_min_cad: number;
  prix_max_cad: number;
  devise_source: string;
  prix_confiance: number;
  comps_count: number;
  prix_source: string;
  
  ebay_url_top: string;
  
  cout_acquisition_cad: number;
  date_acquisition: string;
  emplacement: string;
  proprietaire: string;
  plateforme_vente: string;
  prix_affichage_cad: number;
  statut_vente: string;
  
  hash_fichier: string;
  agent: string;
}

export interface CollectionItem {
  id?: number;
  title?: string;
  artist_author?: string;
  publisher_label?: string;
  year?: number;
  isbn?: string;
  condition?: string;
  estimated_value?: number;
  confidence?: number;
  notes?: string;
  external_url?: string;
  image_url?: string;
  created_at?: string;
}

export class MakeWebhookService {
  private webhookUrl: string;
  private apiKey: string;
  
  constructor(webhookUrl?: string, apiKey?: string) {
    this.webhookUrl = webhookUrl || 'https://hook.us2.make.com/c13wdyjwsqtrcfablgyb2baiow108go1';
    this.apiKey = apiKey || 'mk-value-collector-2025';
  }
  
  /**
   * Génère un run_id unique
   */
  private generateRunId(): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `vc-${date}-${random}`;
  }
  
  /**
   * Normalise un item pour Make.com
   */
  public normalizeItem(item: CollectionItem, photoUrl?: string): MakeWebhookPayload {
    // Normaliser l'état (5 valeurs exactes)
    const normalizeCondition = (condition?: string): string => {
      if (!condition) return 'Good';
      const lower = condition.toLowerCase();
      if (lower.includes('new') && !lower.includes('like')) return 'New';
      if (lower.includes('like new') || lower.includes('likenew')) return 'Like New';
      if (lower.includes('very good') || lower.includes('verygood')) return 'Very Good';
      if (lower.includes('acceptable')) return 'Acceptable';
      return 'Good';
    };
    
    // Normaliser ISBN (retirer espaces et tirets)
    const normalizeISBN = (isbn?: string): string => {
      if (!isbn) return '';
      return isbn.replace(/[-\s]/g, '');
    };
    
    // Extraire ISBN-10 et ISBN-13
    const isbn = normalizeISBN(item.isbn);
    const ISBN_10 = isbn.length === 10 ? isbn : '';
    const ISBN_13 = isbn.length === 13 ? isbn : '';
    
    return {
      run_id: this.generateRunId(),
      timestamp: new Date().toISOString(),
      source: 'ValueCollection_App',
      photo_url: photoUrl || item.image_url || '',
      
      titre: item.title || '',
      auteur: item.artist_author || '',
      editeur: item.publisher_label || '',
      annee: item.year || 0,
      ISBN_10,
      ISBN_13,
      etat: normalizeCondition(item.condition),
      notes: item.notes || '',
      
      prix_estime_cad: item.estimated_value || 0,
      prix_min_cad: item.estimated_value ? item.estimated_value * 0.8 : 0,
      prix_max_cad: item.estimated_value ? item.estimated_value * 1.2 : 0,
      devise_source: 'CAD',
      prix_confiance: item.confidence || 0,
      comps_count: 0,
      prix_source: item.estimated_value ? 'estimation interne' : '',
      
      ebay_url_top: item.external_url || '',
      
      cout_acquisition_cad: 0,
      date_acquisition: '',
      emplacement: '',
      proprietaire: 'Mathieu',
      plateforme_vente: 'eBay',
      prix_affichage_cad: item.estimated_value ? Math.round(item.estimated_value * 1.1 * 100) / 100 : 0,
      statut_vente: 'À lister',
      
      hash_fichier: '',
      agent: 'ValueCollection v2.1'
    };
  }
  
  /**
   * Envoie un item à Make.com webhook
   */
  public async sendItem(item: CollectionItem, photoUrl?: string): Promise<{
    success: boolean;
    error?: string;
    response?: any;
  }> {
    try {
      const payload = this.normalizeItem(item, photoUrl);
      
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-make-apikey': this.apiKey
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      
      const data = await response.text();
      
      return {
        success: true,
        response: data
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send webhook'
      };
    }
  }
  
  /**
   * Envoie plusieurs items à Make.com
   */
  public async sendBatch(items: CollectionItem[], photoUrl?: string): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    
    for (const item of items) {
      const result = await this.sendItem(item, photoUrl);
      
      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push(`Item "${item.title}": ${result.error}`);
      }
      
      // Attendre 500ms entre chaque envoi pour éviter rate limiting
      if (items.indexOf(item) < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return {
      success: failed === 0,
      sent,
      failed,
      errors
    };
  }
}

/**
 * Factory function
 */
export function createMakeWebhookService(webhookUrl?: string, apiKey?: string) {
  return new MakeWebhookService(webhookUrl, apiKey);
}
