import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'

// Types pour les bindings Cloudflare
type Bindings = {
  DB: D1Database;
  EBAY_CLIENT_ID?: string;
  EBAY_CLIENT_SECRET?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_BOOKS_API_KEY?: string;
  WORTHPOINT_API_KEY?: string;
}

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('/api/*', cors())
app.use('/*', serveStatic({ root: './public' }))
app.use(renderer)

// ========================================
// ROUTES API
// ========================================

// Route principale - Interface de l'évaluateur
app.get('/', (c) => {
  return c.render(
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Évaluateur de Collection Pro - Mathieu Chamberland</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>{`
          .drop-zone {
            transition: all 0.3s ease;
            border: 3px dashed #cbd5e1;
          }
          .drop-zone.dragover {
            border-color: #3b82f6;
            background-color: #eff6ff;
          }
          .item-card {
            transition: all 0.2s ease;
          }
          .item-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          }
          .processing {
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .virtual-scroll {
            max-height: 600px;
            overflow-y: auto;
          }
        `}</style>
      </head>
      <body className="bg-gray-50">
        
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <i className="fas fa-gem text-blue-600 text-3xl"></i>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Évaluateur de Collection Pro</h1>
                  <p className="text-gray-600">Analyse IA et évaluations automatisées</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Mathieu Chamberland</p>
                  <p className="text-xs text-gray-500">Forza Construction Inc.</p>
                </div>
                <button id="settingsBtn" className="p-2 text-gray-500 hover:text-blue-600">
                  <i className="fas fa-cog text-xl"></i>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Summary */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            
            {/* Statistiques principales */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <i className="fas fa-images text-blue-600 text-xl"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p id="totalItems" className="text-2xl font-bold text-gray-900">0</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <i className="fas fa-check-circle text-green-600 text-xl"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Analysés</p>
                  <p id="analyzedItems" className="text-2xl font-bold text-gray-900">0</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <i className="fas fa-dollar-sign text-yellow-600 text-xl"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Valeur Totale</p>
                  <p id="totalValue" className="text-2xl font-bold text-gray-900">0 $</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <i className="fas fa-trophy text-purple-600 text-xl"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">≥ Seuil</p>
                  <div className="flex items-center space-x-2">
                    <input type="number" id="thresholdValue" value="500" min="0" 
                           className="w-16 text-sm border rounded px-1" />
                    <span className="text-sm">$</span>
                  </div>
                  <p id="aboveThreshold" className="text-2xl font-bold text-gray-900">0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Zone d'upload */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center">
                <i className="fas fa-upload mr-3 text-blue-600"></i>
                Upload par Lots
              </h2>
            </div>
            
            <div className="p-6">
              <div id="dropZone" className="drop-zone p-12 text-center rounded-lg cursor-pointer">
                <div id="dropContent">
                  <i className="fas fa-cloud-upload-alt text-6xl text-gray-400 mb-4"></i>
                  <p className="text-xl text-gray-700 mb-2">Glissez vos images ici</p>
                  <p className="text-gray-500 mb-4">ou cliquez pour sélectionner des fichiers</p>
                  <p className="text-sm text-gray-400">
                    Supports: JPG, PNG, WebP, HEIC • Max 10MB par fichier • Jusqu'à 100 fichiers
                  </p>
                  <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                    <i className="fas fa-folder-open mr-2"></i>
                    Parcourir les fichiers
                  </button>
                </div>
                
                <div id="uploadProgress" className="hidden">
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div id="progressBar" className="bg-blue-600 h-2 rounded-full" style="width: 0%"></div>
                  </div>
                  <p id="progressText" className="text-gray-600">Préparation...</p>
                </div>
              </div>

              <input type="file" id="fileInput" multiple accept="image/*" className="hidden" />
              
              {/* Prévisualisation des fichiers */}
              <div id="filePreview" className="mt-6 hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Fichiers sélectionnés</h3>
                  <div className="flex space-x-2">
                    <button id="clearFiles" className="px-3 py-1 text-red-600 border border-red-300 rounded hover:bg-red-50">
                      Effacer tout
                    </button>
                    <button id="startUpload" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                      <i className="fas fa-rocket mr-2"></i>
                      Commencer l'analyse
                    </button>
                  </div>
                </div>
                <div id="fileList" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"></div>
              </div>
            </div>
          </div>

          {/* Filtres et recherche */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center">
                <i className="fas fa-filter mr-3 text-blue-600"></i>
                Filtres & Recherche
              </h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
                  <input type="text" id="searchInput" placeholder="Titre, description..."
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <select id="categoryFilter" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Toutes</option>
                    <option value="sports_cards">Cartes Sport</option>
                    <option value="books">Livres</option>
                    <option value="comics">BD/Comics</option>
                    <option value="trading_cards">Cartes TCG</option>
                    <option value="vintage">Vintage</option>
                    <option value="memorabilia">Souvenirs</option>
                    <option value="other">Autres</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">État</label>
                  <select id="conditionFilter" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Tous</option>
                    <option value="mint">Mint</option>
                    <option value="near_mint">Near Mint</option>
                    <option value="excellent">Excellent</option>
                    <option value="very_good">Très Bon</option>
                    <option value="good">Bon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select id="statusFilter" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Tous</option>
                    <option value="completed">Complété</option>
                    <option value="processing">En cours</option>
                    <option value="uploaded">Uploadé</option>
                    <option value="error">Erreur</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button id="applyFilters" className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
                    <i className="fas fa-search mr-2"></i>
                    Filtrer
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Liste des items */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center">
                  <i className="fas fa-list mr-3 text-blue-600"></i>
                  Collection (<span id="itemCount">0</span> items)
                </h2>
                <div className="flex space-x-2">
                  <button id="viewGrid" className="p-2 text-gray-500 hover:text-blue-600">
                    <i className="fas fa-th"></i>
                  </button>
                  <button id="viewList" className="p-2 text-blue-600">
                    <i className="fas fa-list"></i>
                  </button>
                  <button id="exportData" className="px-3 py-1 text-blue-600 border border-blue-300 rounded hover:bg-blue-50">
                    <i className="fas fa-download mr-1"></i>
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
            
            <div id="itemsList" className="virtual-scroll">
              <div id="emptyState" className="p-12 text-center text-gray-500">
                <i className="fas fa-inbox text-6xl mb-4"></i>
                <p className="text-xl mb-2">Aucun item à afficher</p>
                <p>Uploadez vos premières images pour commencer l'évaluation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Script principal */}
        <script type="module" src="/app.js"></script>
      </body>
    </html>
  )
})

// API: Obtenir les statistiques de collection
app.get('/api/stats', async (c) => {
  const { DB } = c.env;
  
  try {
    // Statistiques principales
    const stats = await DB.prepare(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as completed_items,
        COUNT(CASE WHEN ai_analyzed = 1 THEN 1 END) as analyzed_items,
        SUM(CASE 
          WHEN pe.estimated_value IS NOT NULL THEN pe.estimated_value 
          ELSE 0 
        END) as total_value
      FROM collection_items ci
      LEFT JOIN (
        SELECT item_id, MAX(estimated_value) as estimated_value
        FROM price_evaluations 
        WHERE is_active = 1 
        GROUP BY item_id
      ) pe ON ci.id = pe.item_id
    `).first();

    // Items par catégorie
    const categories = await DB.prepare(`
      SELECT category, COUNT(*) as count
      FROM collection_items
      GROUP BY category
      ORDER BY count DESC
    `).all();

    return c.json({
      success: true,
      stats: {
        ...stats,
        categories: categories.results
      }
    });

  } catch (error) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
})

// API: Lister les items avec filtres
app.get('/api/items', async (c) => {
  const { DB } = c.env;
  const { 
    page = '1', 
    per_page = '20', 
    category, 
    condition, 
    status, 
    search,
    min_value,
    max_value
  } = c.req.query();

  try {
    let query = `
      SELECT 
        ci.*,
        pe.estimated_value,
        pe.confidence_score,
        pe.evaluation_date
      FROM collection_items ci
      LEFT JOIN (
        SELECT 
          item_id, 
          estimated_value, 
          confidence_score, 
          evaluation_date,
          ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY evaluation_date DESC) as rn
        FROM price_evaluations 
        WHERE is_active = 1
      ) pe ON ci.id = pe.item_id AND pe.rn = 1
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Filtres
    if (category) {
      query += ` AND ci.category = ?${paramIndex++}`;
      params.push(category);
    }

    if (condition) {
      query += ` AND ci.condition_grade = ?${paramIndex++}`;
      params.push(condition);
    }

    if (status) {
      query += ` AND ci.processing_status = ?${paramIndex++}`;
      params.push(status);
    }

    if (search) {
      query += ` AND (ci.title LIKE ?${paramIndex++} OR ci.description LIKE ?${paramIndex++})`;
      params.push(`%${search}%`, `%${search}%`);
      paramIndex++;
    }

    if (min_value) {
      query += ` AND pe.estimated_value >= ?${paramIndex++}`;
      params.push(parseFloat(min_value));
    }

    if (max_value) {
      query += ` AND pe.estimated_value <= ?${paramIndex++}`;
      params.push(parseFloat(max_value));
    }

    // Pagination
    query += ` ORDER BY ci.created_at DESC`;
    
    const offset = (parseInt(page) - 1) * parseInt(per_page);
    query += ` LIMIT ?${paramIndex++} OFFSET ?${paramIndex++}`;
    params.push(parseInt(per_page), offset);

    const items = await DB.prepare(query).bind(...params).all();

    // Count total pour pagination
    let countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    countQuery = countQuery.replace(/ORDER BY[\s\S]*$/, '');
    countQuery = countQuery.replace(/LIMIT[\s\S]*$/, '');
    
    const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET params
    const countResult = await DB.prepare(countQuery).bind(...countParams).first();

    return c.json({
      success: true,
      items: items.results,
      pagination: {
        page: parseInt(page),
        per_page: parseInt(per_page),
        total: countResult.total,
        pages: Math.ceil(countResult.total / parseInt(per_page))
      }
    });

  } catch (error) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
})

// API: Upload et création d'item
app.post('/api/upload', async (c) => {
  const { DB } = c.env;
  
  try {
    const body = await c.req.json();
    const { 
      title, 
      description, 
      category, 
      condition_grade,
      year_made,
      manufacturer,
      image_url,
      collection_id = 1  // Default collection
    } = body;

    // Créer l'item en base
    const result = await DB.prepare(`
      INSERT INTO collection_items (
        collection_id, title, description, category, condition_grade,
        year_made, manufacturer, primary_image_url, processing_status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'uploaded', ?, ?)
    `).bind(
      collection_id,
      title,
      description,
      category,
      condition_grade,
      year_made,
      manufacturer,
      image_url,
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    // Log de l'activité
    await DB.prepare(`
      INSERT INTO activity_logs (item_id, action_type, action_description, status, created_at)
      VALUES (?, 'upload', 'Item créé avec succès', 'success', ?)
    `).bind(result.meta.last_row_id, new Date().toISOString()).run();

    return c.json({
      success: true,
      item_id: result.meta.last_row_id,
      message: 'Item créé avec succès'
    });

  } catch (error) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
})

// API: Déclencher évaluation d'un item
app.post('/api/evaluate/:id', async (c) => {
  const { DB } = c.env;
  const itemId = parseInt(c.req.param('id'));
  
  try {
    // TODO: Implémenter l'orchestrateur d'évaluation
    // Pour l'instant, simulons une évaluation
    
    await DB.prepare(`
      UPDATE collection_items 
      SET processing_status = 'processing', updated_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), itemId).run();

    // Simulation d'évaluation (à remplacer par le vrai orchestrateur)
    setTimeout(async () => {
      await DB.prepare(`
        UPDATE collection_items 
        SET processing_status = 'completed', last_evaluation_date = ?, updated_at = ?
        WHERE id = ?
      `).bind(new Date().toISOString(), new Date().toISOString(), itemId).run();
    }, 5000);

    return c.json({
      success: true,
      message: 'Évaluation démarrée'
    });

  } catch (error) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
})

export default app