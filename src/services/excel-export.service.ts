// Service d'Export Excel/CSV pour ValueCollection
import type { CollectionItem } from '../types/collection';

export interface ExcelRow {
  Date: string;
  Titre: string;
  Auteur: string;
  Editeur: string;
  Annee: number | null;
  ISBN: string;
  Etat: string;
  Estimation_CAD: number | null;
  Source: string;
  URL: string;
  Photo: string;
  Confiance: number;
  Notes: string;
}

export class ExcelExportService {
  /**
   * Convertir items en format CSV
   */
  exportToCSV(items: CollectionItem[]): string {
    const headers = [
      'Date',
      'Titre',
      'Auteur',
      'Editeur',
      'Année',
      'ISBN',
      'État',
      'Estimation_CAD',
      'Source',
      'URL',
      'Photo',
      'Confiance',
      'Notes'
    ];

    const rows = items.map(item => [
      item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      this.escapeCsv(item.title || ''),
      this.escapeCsv(item.artist_author || ''),
      this.escapeCsv(item.publisher_label || ''),
      item.year || '',
      item.isbn || '',
      item.condition || '',
      item.estimated_value || '',
      'Base de données',
      item.external_url || '',
      item.image_url || '',
      item.confidence || 0,
      this.escapeCsv(item.notes || '')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Créer un format compatible Excel (TSV)
   */
  exportToTSV(items: CollectionItem[]): string {
    const headers = [
      'Date',
      'Titre',
      'Auteur',
      'Éditeur',
      'Année',
      'ISBN',
      'État',
      'Estimation_CAD',
      'Source',
      'URL',
      'Photo',
      'Confiance',
      'Notes'
    ];

    const rows = items.map(item => [
      item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      item.title || '',
      item.artist_author || '',
      item.publisher_label || '',
      item.year || '',
      item.isbn || '',
      item.condition || '',
      item.estimated_value || '',
      'Base de données',
      item.external_url || '',
      item.image_url || '',
      item.confidence || 0,
      item.notes || ''
    ]);

    const tsvContent = [
      headers.join('\t'),
      ...rows.map(row => row.join('\t'))
    ].join('\n');

    return tsvContent;
  }

  /**
   * Convertir en format JSON pour GenSpark
   */
  exportToGenSparkFormat(item: CollectionItem): Record<string, any> {
    return {
      Date: new Date().toISOString().split('T')[0],
      Titre: item.title || '',
      Auteur: item.artist_author || '',
      Editeur: item.publisher_label || '',
      Annee: item.year || null,
      ISBN: item.isbn || '',
      Etat: item.condition || '',
      Estimation_CAD: item.estimated_value || null,
      Source: 'Analyse IA',
      URL: item.external_url || '',
      Photo: item.image_url || '',
      Confiance: item.confidence || 0,
      Notes: item.notes || ''
    };
  }

  /**
   * Échapper les valeurs CSV
   */
  private escapeCsv(value: string): string {
    if (typeof value !== 'string') {
      return String(value);
    }
    
    // Si contient virgule, guillemets ou retour ligne, entourer de guillemets
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }

  /**
   * Générer nom de fichier avec timestamp
   */
  getFileName(extension: 'csv' | 'tsv' | 'xlsx'): string {
    const date = new Date().toISOString().split('T')[0];
    return `valuecollection_${date}.${extension}`;
  }
}
