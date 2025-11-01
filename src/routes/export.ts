// Routes d'Export Excel/CSV
import { Hono } from 'hono';
import { ExcelExportService } from '../services/excel-export.service';
import type { Bindings } from '../types/bindings';

const export_routes = new Hono<{ Bindings: Bindings }>();
const excelService = new ExcelExportService();

/**
 * Export CSV de tous les items
 * GET /api/export/csv
 */
export_routes.get('/csv', async (c) => {
  try {
    const db = c.env.DB;
    
    // Récupérer tous les items
    const { results } = await db.prepare(`
      SELECT 
        ci.*,
        c.name as collection_name
      FROM collection_items ci
      LEFT JOIN collections c ON ci.collection_id = c.id
      ORDER BY ci.created_at DESC
    `).all();

    const csv = excelService.exportToCSV(results as any);
    const filename = excelService.getFileName('csv');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Export CSV error:', error);
    return c.json({ 
      success: false, 
      error: 'Export CSV failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * Export TSV (compatible Excel) de tous les items
 * GET /api/export/tsv
 */
export_routes.get('/tsv', async (c) => {
  try {
    const db = c.env.DB;
    
    const { results } = await db.prepare(`
      SELECT 
        ci.*,
        c.name as collection_name
      FROM collection_items ci
      LEFT JOIN collections c ON ci.collection_id = c.id
      ORDER BY ci.created_at DESC
    `).all();

    const tsv = excelService.exportToTSV(results as any);
    const filename = excelService.getFileName('tsv');

    return new Response(tsv, {
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Export TSV error:', error);
    return c.json({ 
      success: false, 
      error: 'Export TSV failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * Export JSON pour GenSpark
 * GET /api/export/json
 */
export_routes.get('/json', async (c) => {
  try {
    const db = c.env.DB;
    
    const { results } = await db.prepare(`
      SELECT * FROM collection_items 
      ORDER BY created_at DESC
    `).all();

    const gensparkData = results.map((item: any) => 
      excelService.exportToGenSparkFormat(item)
    );

    return c.json({
      success: true,
      count: gensparkData.length,
      data: gensparkData
    });
  } catch (error) {
    console.error('Export JSON error:', error);
    return c.json({ 
      success: false, 
      error: 'Export JSON failed'
    }, 500);
  }
});

/**
 * Webhook GenSpark - Auto-add après analyse
 * POST /api/export/genspark-webhook
 */
export_routes.post('/genspark-webhook', async (c) => {
  try {
    const data = await c.req.json();
    
    // Format GenSpark
    const gensparkPayload = {
      Date: data.Date || new Date().toISOString().split('T')[0],
      Titre: data.Titre || data.title,
      Auteur: data.Auteur || data.author || data.artist_author,
      Editeur: data.Editeur || data.publisher || data.publisher_label,
      Annee: data.Annee || data.year,
      ISBN: data.ISBN || data.isbn,
      Etat: data.Etat || data.condition,
      Estimation_CAD: data.Estimation_CAD || data.estimated_value,
      Source: data.Source || 'Analyse IA',
      URL: data.URL || data.external_url || '',
      Photo: data.Photo || data.image_url || '',
      Confiance: data.Confiance || data.confidence || 0,
      Notes: data.Notes || data.notes || ''
    };

    // Envoyer à GenSpark (si configuré)
    if (c.env.GENSPARK_WEBHOOK_URL) {
      await fetch(c.env.GENSPARK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gensparkPayload)
      });
    }

    return c.json({ 
      success: true, 
      message: '✅ Données prêtes pour GenSpark',
      data: gensparkPayload
    });
  } catch (error) {
    console.error('GenSpark webhook error:', error);
    return c.json({ 
      success: false, 
      error: 'Webhook failed'
    }, 500);
  }
});

/**
 * Export d'un seul item
 * GET /api/export/item/:id/csv
 */
export_routes.get('/item/:id/csv', async (c) => {
  try {
    const itemId = c.req.param('id');
    const db = c.env.DB;
    
    const { results } = await db.prepare(`
      SELECT * FROM collection_items WHERE id = ?
    `).bind(itemId).all();

    if (results.length === 0) {
      return c.json({ error: 'Item not found' }, 404);
    }

    const csv = excelService.exportToCSV(results as any);
    const filename = `item_${itemId}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    return c.json({ error: 'Export failed' }, 500);
  }
});

/**
 * Stats d'export
 * GET /api/export/stats
 */
export_routes.get('/stats', async (c) => {
  try {
    const db = c.env.DB;
    
    const stats = await db.prepare(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN estimated_value IS NOT NULL THEN 1 END) as items_with_value,
        SUM(estimated_value) as total_value,
        AVG(confidence) as avg_confidence
      FROM collection_items
    `).first();

    return c.json({
      success: true,
      stats,
      export_formats: ['CSV', 'TSV', 'JSON'],
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    return c.json({ error: 'Failed to get stats' }, 500);
  }
});

export default export_routes;
