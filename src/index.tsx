import { Hono } from 'hono'
import { cors } from 'hono/cors'
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
app.use(renderer)

// ========================================
// ROUTES STATIQUES
// ========================================

// Route pour servir app.js
app.get('/app.js', async (c) => {
  // Lis le contenu de app.js depuis le système de fichiers
  // Note: En production Cloudflare, ceci devra être intégré autrement
  return c.text(`
// Évaluateur de Collection Pro - Frontend JavaScript
class CollectionEvaluator {
  constructor() {
    this.selectedFiles = [];
    this.currentItems = [];
    this.currentFilters = {};
    this.uploadQueue = [];
    this.isUploading = false;
    
    this.init();
    this.loadStats();
    this.loadItems();
  }

  init() {
    this.setupEventListeners();
    this.setupDropZone();
    this.updateThreshold();
  }

  // ... reste du code JavaScript intégré directement ...
  // Pour la production, ce code sera intégré dans le HTML
  
  showNotification(message, type = 'info') {
    console.log(type.toUpperCase() + ': ' + message);
  }
}

// Initialisation de l'application
window.addEventListener('DOMContentLoaded', () => {
  window.app = new CollectionEvaluator();
});
`, 200, {
    'Content-Type': 'application/javascript',
    'Cache-Control': 'public, max-age=3600'
  });
})

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
                  <p className="text-xs text-gray-500">Investisseur Immobilier</p>
                </div>
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

          {/* Évaluation Intelligente */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center">
                <i className="fas fa-brain mr-3 text-blue-600"></i>
                Évaluation Intelligente IA
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Analysez vos objets de collection avec l'intelligence artificielle
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              
              {/* Upload de média */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-3">
                  <i className="fas fa-camera mr-2"></i>
                  Évaluation par Photo/Vidéo
                </h4>
                <div className="flex items-center space-x-3">
                  <button 
                    id="selectMediaBtn"
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <i className="fas fa-upload mr-2"></i>
                    Choisir Photo/Vidéo
                  </button>
                  <input 
                    type="file" 
                    id="mediaInput" 
                    accept="image/*,video/*" 
                    className="hidden"
                  />
                  <span className="text-sm text-purple-600">
                    JPG, PNG, WebP, MP4, MOV • Max 10MB
                  </span>
                </div>
                <div id="mediaPreview" className="mt-3 hidden">
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                    <div id="mediaThumb" className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                      <i className="fas fa-image text-gray-400"></i>
                    </div>
                    <div className="flex-1">
                      <p id="mediaName" className="text-sm font-medium text-gray-800"></p>
                      <p id="mediaSize" className="text-xs text-gray-500"></p>
                    </div>
                    <button id="evaluateMediaBtn" className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                      <i className="fas fa-magic mr-2"></i>
                      Analyser
                    </button>
                    <button id="clearMediaBtn" className="p-2 text-red-500 hover:text-red-700">
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Évaluation par texte */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-3">
                  <i className="fas fa-keyboard mr-2"></i>
                  Évaluation par Texte
                </h4>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    id="quickEvalText" 
                    placeholder="Ex: Abbey Road The Beatles, Les Anciens Canadiens Philippe Aubert de Gaspé..."
                    className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button id="quickEvalBtn" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <i className="fas fa-search-dollar mr-2"></i>
                    Évaluer
                  </button>
                  <button id="testSmartEval" className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <i className="fas fa-magic mr-2"></i>
                    Test Démo
                  </button>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Saisissez le titre et l'auteur/artiste pour une évaluation intelligente instantanée
                </p>
                <div className="mt-3 text-xs text-gray-500">
                  <strong>Exemples :</strong> "Abbey Road The Beatles" • "Wayne Gretzky rookie card 1979" • "Les Anciens Canadiens Philippe Aubert de Gaspé"
                </div>
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
                  
                  {/* Dropdown Import Avancé */}
                  <div className="relative inline-block">
                    <button id="importDropdown" className="px-3 py-1 text-green-600 border border-green-300 rounded hover:bg-green-50 flex items-center">
                      <i className="fas fa-upload mr-1"></i>
                      Import Avancé
                      <i className="fas fa-chevron-down ml-1 text-xs"></i>
                    </button>
                    <div id="importMenu" className="hidden absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                      <button id="importCSV" className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center">
                        <i className="fas fa-file-csv mr-2 text-green-600"></i>
                        Import CSV Simple
                      </button>
                      <button id="importZIP" className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center">
                        <i className="fas fa-file-archive mr-2 text-purple-600"></i>
                        Import ZIP + Images
                      </button>
                      <button id="importIncremental" className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center">
                        <i className="fas fa-sync mr-2 text-orange-600"></i>
                        Import Incrémental
                      </button>
                      <hr className="my-1" />
                      <button id="downloadTemplate" className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center">
                        <i className="fas fa-download mr-2 text-blue-600"></i>
                        Télécharger Template
                      </button>
                    </div>
                  </div>
                  
                  <button id="exportData" className="px-3 py-1 text-blue-600 border border-blue-300 rounded hover:bg-blue-50">
                    <i className="fas fa-download mr-1"></i>
                    Export CSV
                  </button>
                  
                  {/* Inputs cachés pour les différents types d'import */}
                  <input type="file" id="csvFileInput" accept=".csv" className="hidden" />
                  <input type="file" id="zipFileInput" accept=".zip" className="hidden" />
                  <input type="file" id="incrementalInput" accept=".csv" className="hidden" />
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

        {/* Script principal intégré */}
        <script type="module">{`
          // Version simplifiée pour le développement
          class CollectionEvaluator {
            constructor() {
              this.selectedFiles = [];
              this.currentItems = [];
              this.currentFilters = {};
              this.selectedMedia = null;
              this.init();
            }

            init() {
              console.log('🚀 Évaluateur de Collection Pro initialisé');
              this.setupEventListeners();
              this.loadStats();
              this.loadItems();
            }

            setupEventListeners() {
              // Évaluation par texte
              const quickEvalBtn = document.getElementById('quickEvalBtn');
              if (quickEvalBtn) {
                quickEvalBtn.addEventListener('click', () => this.quickEvaluate());
              }

              const testSmartEval = document.getElementById('testSmartEval');
              if (testSmartEval) {
                testSmartEval.addEventListener('click', () => this.testSmartEvaluation());
              }

              // Upload de média
              const selectMediaBtn = document.getElementById('selectMediaBtn');
              const mediaInput = document.getElementById('mediaInput');
              if (selectMediaBtn && mediaInput) {
                selectMediaBtn.addEventListener('click', () => mediaInput.click());
                mediaInput.addEventListener('change', (e) => this.handleMediaSelect(e));
              }

              const evaluateMediaBtn = document.getElementById('evaluateMediaBtn');
              if (evaluateMediaBtn) {
                evaluateMediaBtn.addEventListener('click', () => this.evaluateMedia());
              }

              const clearMediaBtn = document.getElementById('clearMediaBtn');
              if (clearMediaBtn) {
                clearMediaBtn.addEventListener('click', () => this.clearMedia());
              }

              // Import/Export avancés
              const importDropdown = document.getElementById('importDropdown');
              const importMenu = document.getElementById('importMenu');
              if (importDropdown && importMenu) {
                importDropdown.addEventListener('click', (e) => {
                  e.stopPropagation();
                  importMenu.classList.toggle('hidden');
                });
                
                // Fermer le menu en cliquant ailleurs
                document.addEventListener('click', () => {
                  importMenu.classList.add('hidden');
                });
              }

              // Import CSV Simple
              const importCSV = document.getElementById('importCSV');
              const csvInput = document.getElementById('csvFileInput');
              if (importCSV && csvInput) {
                importCSV.addEventListener('click', () => csvInput.click());
                csvInput.addEventListener('change', (e) => this.handleCSVImport(e));
              }

              // Import ZIP + Images
              const importZIP = document.getElementById('importZIP');
              const zipInput = document.getElementById('zipFileInput');
              if (importZIP && zipInput) {
                importZIP.addEventListener('click', () => zipInput.click());
                zipInput.addEventListener('change', (e) => this.handleZIPImport(e));
              }

              // Import Incrémental
              const importIncremental = document.getElementById('importIncremental');
              const incrementalInput = document.getElementById('incrementalInput');
              if (importIncremental && incrementalInput) {
                importIncremental.addEventListener('click', () => incrementalInput.click());
                incrementalInput.addEventListener('change', (e) => this.handleIncrementalImport(e));
              }

              // Télécharger Template
              const downloadTemplate = document.getElementById('downloadTemplate');
              if (downloadTemplate) {
                downloadTemplate.addEventListener('click', () => this.showTemplateSelector());
              }

              const exportBtn = document.getElementById('exportData');
              if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportToCSV());
              }
            }

            async handleMediaSelect(e) {
              const file = e.target.files[0];
              if (!file) return;

              // Vérification du fichier
              const maxSize = 10 * 1024 * 1024; // 10MB
              if (file.size > maxSize) {
                this.showNotification('Fichier trop volumineux (max 10MB)', 'warning');
                return;
              }

              const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/x-msvideo'];
              if (!validTypes.includes(file.type)) {
                this.showNotification('Type de fichier non supporté', 'warning');
                return;
              }

              // Afficher la prévisualisation
              this.displayMediaPreview(file);
              this.showNotification('Fichier sélectionné avec succès', 'success');
            }

            displayMediaPreview(file) {
              const preview = document.getElementById('mediaPreview');
              const thumb = document.getElementById('mediaThumb');
              const name = document.getElementById('mediaName');
              const size = document.getElementById('mediaSize');

              name.textContent = file.name;
              size.textContent = this.formatFileSize(file.size);

              // Créer une miniature
              if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  thumb.innerHTML = '<img src="' + e.target.result + '" class="w-full h-full object-cover rounded-lg" alt="Preview" />';
                };
                reader.readAsDataURL(file);
              } else if (file.type.startsWith('video/')) {
                thumb.innerHTML = '<i class="fas fa-video text-purple-500 text-xl"></i>';
              }

              preview.classList.remove('hidden');
              this.selectedMedia = file;
            }

            async evaluateMedia() {
              if (!this.selectedMedia) {
                this.showNotification('Aucun fichier sélectionné', 'warning');
                return;
              }

              const btn = document.getElementById('evaluateMediaBtn');
              const originalText = btn.innerHTML;
              btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyse...';
              btn.disabled = true;

              try {
                // Convertir le fichier en URL data
                const mediaUrl = await this.fileToDataUrl(this.selectedMedia);
                const isVideo = this.selectedMedia.type.startsWith('video/');

                const response = await axios.post('/api/smart-evaluate', {
                  imageUrl: isVideo ? null : mediaUrl,
                  videoUrl: isVideo ? mediaUrl : null,
                  filename: this.selectedMedia.name
                });

                if (response.data.success) {
                  this.displayEvaluationResult(response.data, 'Fichier: ' + this.selectedMedia.name);
                  this.showNotification('✅ Analyse du fichier terminée !', 'success');
                } else {
                  this.showNotification('Erreur: ' + response.data.error, 'error');
                }

              } catch (error) {
                console.error('Erreur analyse fichier:', error);
                this.showNotification('Erreur lors de l\'analyse', 'error');
              } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
              }
            }

            clearMedia() {
              const preview = document.getElementById('mediaPreview');
              const input = document.getElementById('mediaInput');
              
              preview.classList.add('hidden');
              input.value = '';
              this.selectedMedia = null;
            }

            async fileToDataUrl(file) {
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
              });
            }

            formatFileSize(bytes) {
              const sizes = ['B', 'KB', 'MB', 'GB'];
              if (bytes === 0) return '0 B';
              const i = Math.floor(Math.log(bytes) / Math.log(1024));
              return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
            }

            async quickEvaluate() {
              const textInput = document.getElementById('quickEvalText');
              if (!textInput || !textInput.value.trim()) {
                this.showNotification('Veuillez saisir un titre et auteur/artiste', 'warning');
                return;
              }

              const btn = document.getElementById('quickEvalBtn');
              const originalText = btn.innerHTML;
              btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyse...';
              btn.disabled = true;

              try {
                const response = await axios.post('/api/smart-evaluate', {
                  text_input: textInput.value
                });

                if (response.data.success) {
                  this.displayEvaluationResult(response.data, 'Texte: "' + textInput.value + '"');
                  this.showNotification('✅ Évaluation terminée !', 'success');
                } else {
                  this.showNotification('Erreur: ' + response.data.error, 'error');
                }
              } catch (error) {
                console.error('Erreur évaluation:', error);
                this.showNotification('Erreur de connexion', 'error');
              } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
              }
            }

            async testSmartEvaluation() {
              const examples = [
                'Abbey Road The Beatles',
                'Les Anciens Canadiens Philippe Aubert de Gaspé',
                'Wayne Gretzky rookie card 1979',
                'Pink Floyd The Wall vinyl'
              ];

              const randomExample = examples[Math.floor(Math.random() * examples.length)];
              document.getElementById('quickEvalText').value = randomExample;
              
              this.showNotification('Test avec: "' + randomExample + '"', 'info');
              await this.quickEvaluate();
            }

            displayEvaluationResult(result, source) {
              const analysis = result.smart_analysis;
              const confidence = Math.round(result.matching_confidence * 100);
              
              // Créer modal de résultats
              const modal = document.createElement('div');
              modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
              
              modal.innerHTML = '<div class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-96 overflow-y-auto">' +
                '<div class="p-6">' +
                  '<div class="flex justify-between items-start mb-4">' +
                    '<h3 class="text-xl font-bold text-gray-900">' +
                      '<i class="fas fa-brain text-purple-600 mr-2"></i>' +
                      'Analyse IA Terminée' +
                    '</h3>' +
                    '<button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" ' +
                            'class="text-gray-400 hover:text-gray-600">' +
                      '<i class="fas fa-times text-xl"></i>' +
                    '</button>' +
                  '</div>' +
                  
                  '<div class="bg-gray-50 rounded-lg p-4 mb-4">' +
                    '<h4 class="font-semibold mb-2">📄 Source: ' + source + '</h4>' +
                    '<div class="grid grid-cols-2 gap-2 text-sm">' +
                      '<div><strong>Catégorie:</strong> ' + (analysis.category || 'Non détectée') + '</div>' +
                      '<div><strong>Confiance:</strong> <span class="text-purple-600 font-semibold">' + confidence + '%</span></div>' +
                      '<div><strong>Titre:</strong> ' + (analysis.extracted_data?.title || 'Non détecté') + '</div>' +
                      '<div><strong>Auteur/Artiste:</strong> ' + (analysis.extracted_data?.artist_author || 'Non détecté') + '</div>' +
                      '<div><strong>Année:</strong> ' + (analysis.extracted_data?.year || 'Non détectée') + '</div>' +
                      '<div><strong>Rareté:</strong> ' + (analysis.estimated_rarity || 'Inconnue') + '</div>' +
                    '</div>' +
                  '</div>' +
                  
                  '<div class="bg-blue-50 rounded-lg p-4 mb-4">' +
                    '<h4 class="font-semibold mb-2">🔍 Requêtes de recherche générées:</h4>' +
                    '<div class="flex flex-wrap gap-1">' +
                      (analysis.search_queries || []).map(query => 
                        '<span class="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">' + query + '</span>'
                      ).join('') +
                    '</div>' +
                  '</div>' +
                  
                  '<div class="text-center">' +
                    '<button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" ' +
                            'class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">' +
                      'Fermer' +
                    '</button>' +
                  '</div>' +
                '</div>' +
              '</div>';

              document.body.appendChild(modal);
              
              // Fermer en cliquant à l'extérieur
              modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                  modal.remove();
                }
              });
            }

            async loadStats() {
              try {
                const response = await axios.get('/api/stats');
                if (response.data.success) {
                  const stats = response.data.stats;
                  document.getElementById('totalItems').textContent = stats.total_items || 0;
                  document.getElementById('analyzedItems').textContent = stats.analyzed_items || 0;
                  document.getElementById('totalValue').textContent = this.formatCurrency(stats.total_value || 0);
                }
              } catch (error) {
                console.error('Erreur chargement stats:', error);
              }
            }

            async loadItems() {
              try {
                const response = await axios.get('/api/items?per_page=5');
                if (response.data.success) {
                  console.log('Items chargés:', response.data.items.length);
                  this.currentItems = response.data.items;
                }
              } catch (error) {
                console.error('Erreur chargement items:', error);
              }
            }

            async handleCSVImport(event) {
              const file = event.target.files[0];
              if (!file) return;

              // Vérification du type de fichier
              if (!file.name.toLowerCase().endsWith('.csv')) {
                this.showNotification('Veuillez sélectionner un fichier CSV valide', 'warning');
                return;
              }

              // Lecture du fichier
              try {
                const text = await this.readFileAsText(file);
                const items = this.parseCSV(text);
                
                if (items.length === 0) {
                  this.showNotification('Aucun item trouvé dans le fichier CSV', 'warning');
                  return;
                }

                this.showNotification('Analyse du fichier CSV: ' + items.length + ' items trouvés', 'info');
                
                // Importer les items
                await this.importItems(items);
                
              } catch (error) {
                console.error('Erreur lors de l\'import CSV:', error);
                this.showNotification('Erreur lors de l\'import: ' + error.message, 'error');
              }
            }

            readFileAsText(file) {
              return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(new Error('Erreur lecture fichier'));
                reader.readAsText(file, 'UTF-8');
              });
            }

            parseCSV(text) {
              const lines = text.split('\\n').filter(line => line.trim());
              if (lines.length < 2) return [];

              // Analyser l'en-tête
              const headers = this.parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
              const items = [];

              // Traiter chaque ligne de données
              for (let i = 1; i < lines.length; i++) {
                const values = this.parseCSVLine(lines[i]);
                if (values.length < headers.length) continue;

                const item = {};
                headers.forEach((header, index) => {
                  item[header] = values[index] ? values[index].trim() : '';
                });

                // Mapper les données vers notre format
                const mappedItem = this.mapCSVItem(item);
                if (mappedItem) {
                  items.push(mappedItem);
                }
              }

              return items;
            }

            parseCSVLine(line) {
              const result = [];
              let current = '';
              let inQuotes = false;
              
              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  result.push(current);
                  current = '';
                } else {
                  current += char;
                }
              }
              
              result.push(current);
              return result;
            }

            mapCSVItem(csvRow) {
              // Mapping flexible des colonnes CSV vers notre format
              const mapping = {
                title: ['title', 'titre', 'nom', 'name', 'objet', 'item'],
                description: ['description', 'desc', 'details', 'notes'],
                category: ['category', 'categorie', 'type', 'genre'],
                condition: ['condition', 'etat', 'état', 'grade'],
                year: ['year', 'annee', 'année', 'date'],
                manufacturer: ['manufacturer', 'fabricant', 'marque', 'brand', 'editeur', 'publisher'],
                price: ['price', 'prix', 'value', 'valeur', 'estimation']
              };

              const item = {
                title: '',
                description: '',
                category: 'other',
                condition_grade: 'good',
                year_made: null,
                manufacturer: '',
                estimated_value: null
              };

              // Chercher les correspondances dans les en-têtes
              Object.keys(csvRow).forEach(header => {
                const value = csvRow[header];
                if (!value) return;

                // Titre
                if (mapping.title.some(key => header.includes(key))) {
                  item.title = value;
                }
                
                // Description  
                if (mapping.description.some(key => header.includes(key))) {
                  item.description = value;
                }
                
                // Catégorie
                if (mapping.category.some(key => header.includes(key))) {
                  item.category = this.mapCategory(value);
                }
                
                // État/Condition
                if (mapping.condition.some(key => header.includes(key))) {
                  item.condition_grade = this.mapCondition(value);
                }
                
                // Année
                if (mapping.year.some(key => header.includes(key))) {
                  item.year_made = this.parseYear(value);
                }
                
                // Fabricant/Marque
                if (mapping.manufacturer.some(key => header.includes(key))) {
                  item.manufacturer = value;
                }
                
                // Prix/Valeur
                if (mapping.price.some(key => header.includes(key))) {
                  item.estimated_value = this.parsePrice(value);
                }
              });

              // Validation minimale - doit avoir au moins un titre
              if (!item.title || item.title.length < 2) {
                return null;
              }

              return item;
            }

            mapCategory(value) {
              const categoryMap = {
                'livre': 'books',
                'livres': 'books', 
                'book': 'books',
                'books': 'books',
                'bd': 'comics',
                'comic': 'comics',
                'comics': 'comics',
                'bande dessinée': 'comics',
                'carte': 'trading_cards',
                'cartes': 'trading_cards',
                'card': 'trading_cards',
                'cards': 'trading_cards',
                'sport': 'sports_cards',
                'sports': 'sports_cards',
                'vintage': 'vintage',
                'collection': 'memorabilia',
                'souvenir': 'memorabilia',
                'memorabilia': 'memorabilia'
              };
              
              const normalized = value.toLowerCase().trim();
              return categoryMap[normalized] || 'other';
            }

            mapCondition(value) {
              const conditionMap = {
                'mint': 'mint',
                'parfait': 'mint',
                'neuf': 'mint',
                'near mint': 'near_mint',
                'proche du neuf': 'near_mint',
                'excellent': 'excellent',
                'très bon': 'very_good',
                'tres bon': 'very_good',
                'very good': 'very_good',
                'bon': 'good',
                'good': 'good',
                'moyen': 'good',
                'fair': 'good'
              };
              
              const normalized = value.toLowerCase().trim();
              return conditionMap[normalized] || 'good';
            }

            parseYear(value) {
              if (!value) return null;
              const match = value.toString().match(/\\b(19|20)\\d{2}\\b/);
              return match ? parseInt(match[0]) : null;
            }

            parsePrice(value) {
              if (!value) return null;
              // Supprimer les caractères non-numériques sauf le point décimal
              const cleaned = value.toString().replace(/[^0-9.,]/g, '');
              const parsed = parseFloat(cleaned.replace(',', '.'));
              return isNaN(parsed) ? null : parsed;
            }

            async importItems(items) {
              const totalItems = items.length;
              let successCount = 0;
              let errorCount = 0;

              this.showNotification('Importation en cours: ' + totalItems + ' items...', 'info');

              // Importer par lots pour éviter la surcharge
              const batchSize = 5;
              for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (item) => {
                  try {
                    const response = await axios.post('/api/import-item', item);
                    if (response.data.success) {
                      successCount++;
                    } else {
                      errorCount++;
                      console.error('Erreur import item:', response.data.error);
                    }
                  } catch (error) {
                    errorCount++;
                    console.error('Erreur API import:', error);
                  }
                }));

                // Petite pause entre les lots
                if (i + batchSize < items.length) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }

              // Mise à jour des données
              await this.loadStats();
              await this.loadItems();

              // Notification finale
              if (errorCount === 0) {
                this.showNotification('Import terminé avec succès: ' + successCount + ' items importés', 'success');
              } else {
                this.showNotification('Import terminé: ' + successCount + ' succès, ' + errorCount + ' erreurs', 'warning');
              }
            }

            async exportToCSV() {
              try {
                this.showNotification('Préparation de l\'export CSV...', 'info');
                
                // Récupérer toutes les données
                const response = await axios.get('/api/items?per_page=1000');
                if (!response.data.success) {
                  this.showNotification('Erreur lors de la récupération des données', 'error');
                  return;
                }

                const items = response.data.items;
                if (items.length === 0) {
                  this.showNotification('Aucun item à exporter', 'warning');
                  return;
                }

                // Générer le CSV
                const csvContent = this.generateCSV(items);
                
                // Télécharger le fichier
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'collection-export-' + new Date().toISOString().split('T')[0] + '.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                this.showNotification('Export CSV terminé: ' + items.length + ' items', 'success');
                
              } catch (error) {
                console.error('Erreur export CSV:', error);
                this.showNotification('Erreur lors de l\'export', 'error');
              }
            }

            generateCSV(items) {
              // En-têtes CSV
              const headers = [
                'Titre',
                'Description', 
                'Catégorie',
                'État',
                'Année',
                'Fabricant',
                'Valeur estimée',
                'Confiance',
                'Statut',
                'Date création',
                'Dernière évaluation'
              ];

              // Convertir les items en lignes CSV
              const rows = items.map(item => [
                this.escapeCSV(item.title || ''),
                this.escapeCSV(item.description || ''),
                this.escapeCSV(item.category || ''),
                this.escapeCSV(item.condition_grade || ''),
                item.year_made || '',
                this.escapeCSV(item.manufacturer || ''),
                item.estimated_value || '',
                item.confidence_score || '',
                this.escapeCSV(item.processing_status || ''),
                item.created_at ? new Date(item.created_at).toLocaleDateString('fr-CA') : '',
                item.evaluation_date ? new Date(item.evaluation_date).toLocaleDateString('fr-CA') : ''
              ]);

              // Assemblage final
              return [headers, ...rows]
                .map(row => row.join(','))
                .join('\\n');
            }

            async handleZIPImport(event) {
              const file = event.target.files[0];
              if (!file) return;

              if (!file.name.toLowerCase().endsWith('.zip')) {
                this.showNotification('Veuillez sélectionner un fichier ZIP valide', 'warning');
                return;
              }

              try {
                this.showNotification('Analyse du fichier ZIP en cours...', 'info');
                
                // Utiliser JSZip pour extraire le contenu
                const JSZip = await this.loadJSZip();
                const zip = new JSZip();
                const zipContent = await zip.loadAsync(file);
                
                // Chercher le fichier CSV de métadonnées
                const csvFile = Object.keys(zipContent.files).find(name => 
                  name.toLowerCase().endsWith('.csv') && !zipContent.files[name].dir
                );
                
                if (!csvFile) {
                  this.showNotification('Aucun fichier CSV trouvé dans le ZIP', 'error');
                  return;
                }
                
                // Extraire le CSV
                const csvContent = await zipContent.file(csvFile).async('text');
                const items = this.parseCSV(csvContent);
                
                // Extraire les images
                const images = {};
                for (const [filename, zipEntry] of Object.entries(zipContent.files)) {
                  if (!zipEntry.dir && this.isImageFile(filename)) {
                    const imageBlob = await zipEntry.async('blob');
                    const imageUrl = await this.blobToDataUrl(imageBlob);
                    images[filename] = imageUrl;
                  }
                }
                
                this.showNotification('ZIP analysé: ' + items.length + ' items, ' + Object.keys(images).length + ' images', 'success');
                
                // Associer les images aux items et importer
                await this.importItemsWithImages(items, images);
                
              } catch (error) {
                console.error('Erreur import ZIP:', error);
                this.showNotification('Erreur lors de l\'analyse du ZIP: ' + error.message, 'error');
              }
            }

            async loadJSZip() {
              // Charger JSZip dynamiquement
              if (window.JSZip) return window.JSZip;
              
              return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
                script.onload = () => resolve(window.JSZip);
                script.onerror = reject;
                document.head.appendChild(script);
              });
            }

            isImageFile(filename) {
              const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
              return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
            }

            async blobToDataUrl(blob) {
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(blob);
              });
            }

            async importItemsWithImages(items, images) {
              const totalItems = items.length;
              let successCount = 0;
              let errorCount = 0;

              this.showNotification('Importation avec images: ' + totalItems + ' items...', 'info');

              for (const item of items) {
                try {
                  // Chercher une image associée
                  const possibleImageNames = [
                    item.image || '',
                    item.filename || '',
                    item.title.replace(/[^a-zA-Z0-9]/g, '_') + '.jpg',
                    item.title.replace(/[^a-zA-Z0-9]/g, '_') + '.png'
                  ];
                  
                  let imageUrl = null;
                  for (const imageName of possibleImageNames) {
                    if (imageName && images[imageName]) {
                      imageUrl = images[imageName];
                      break;
                    }
                  }
                  
                  const response = await axios.post('/api/import-item', {
                    ...item,
                    image_url: imageUrl
                  });
                  
                  if (response.data.success) {
                    successCount++;
                  } else {
                    errorCount++;
                  }
                } catch (error) {
                  errorCount++;
                  console.error('Erreur import item avec image:', error);
                }
              }

              await this.loadStats();
              await this.loadItems();

              if (errorCount === 0) {
                this.showNotification('Import ZIP terminé: ' + successCount + ' items avec images', 'success');
              } else {
                this.showNotification('Import ZIP terminé: ' + successCount + ' succès, ' + errorCount + ' erreurs', 'warning');
              }
            }

            async handleIncrementalImport(event) {
              const file = event.target.files[0];
              if (!file) return;

              try {
                const text = await this.readFileAsText(file);
                const newItems = this.parseCSV(text);
                
                if (newItems.length === 0) {
                  this.showNotification('Aucun item trouvé dans le fichier', 'warning');
                  return;
                }
                
                this.showNotification('Vérification des doublons...', 'info');
                
                // Obtenir les items existants
                const existingResponse = await axios.get('/api/items?per_page=1000');
                const existingItems = existingResponse.data.success ? existingResponse.data.items : [];
                
                // Détecter les doublons
                const duplicateResults = this.detectDuplicates(newItems, existingItems);
                
                if (duplicateResults.duplicates.length > 0) {
                  this.showDuplicateDialog(duplicateResults);
                } else {
                  await this.importItems(duplicateResults.newItems);
                }
                
              } catch (error) {
                console.error('Erreur import incrémental:', error);
                this.showNotification('Erreur lors de l\'import incrémental', 'error');
              }
            }

            detectDuplicates(newItems, existingItems) {
              const duplicates = [];
              const newUniqueItems = [];
              
              for (const newItem of newItems) {
                const isDuplicate = existingItems.some(existing => 
                  this.isSimilarItem(newItem, existing)
                );
                
                if (isDuplicate) {
                  duplicates.push(newItem);
                } else {
                  newUniqueItems.push(newItem);
                }
              }
              
              return {
                newItems: newUniqueItems,
                duplicates: duplicates,
                total: newItems.length
              };
            }

            isSimilarItem(item1, item2) {
              // Comparaison floue basée sur titre et année
              const similarity = this.calculateStringSimilarity(
                (item1.title || '').toLowerCase(), 
                (item2.title || '').toLowerCase()
              );
              
              const yearMatch = item1.year_made === item2.year_made;
              
              return similarity > 0.8 || (similarity > 0.6 && yearMatch);
            }

            calculateStringSimilarity(str1, str2) {
              const longer = str1.length > str2.length ? str1 : str2;
              const shorter = str1.length > str2.length ? str2 : str1;
              
              if (longer.length === 0) return 1.0;
              
              const distance = this.levenshteinDistance(longer, shorter);
              return (longer.length - distance) / longer.length;
            }

            levenshteinDistance(str1, str2) {
              const matrix = [];
              
              for (let i = 0; i <= str2.length; i++) {
                matrix[i] = [i];
              }
              
              for (let j = 0; j <= str1.length; j++) {
                matrix[0][j] = j;
              }
              
              for (let i = 1; i <= str2.length; i++) {
                for (let j = 1; j <= str1.length; j++) {
                  if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                  } else {
                    matrix[i][j] = Math.min(
                      matrix[i - 1][j - 1] + 1,
                      matrix[i][j - 1] + 1,
                      matrix[i - 1][j] + 1
                    );
                  }
                }
              }
              
              return matrix[str2.length][str1.length];
            }

            showDuplicateDialog(duplicateResults) {
              const modal = document.createElement('div');
              modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
              
              modal.innerHTML = '<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">' +
                '<div class="p-6">' +
                  '<h3 class="text-xl font-bold text-gray-900 mb-4">' +
                    '<i class="fas fa-exclamation-triangle text-orange-500 mr-2"></i>' +
                    'Doublons Détectés' +
                  '</h3>' +
                  
                  '<div class="mb-4">' +
                    '<p class="text-gray-600">Sur ' + duplicateResults.total + ' items à importer :</p>' +
                    '<ul class="list-disc list-inside mt-2">' +
                      '<li class="text-green-600">' + duplicateResults.newItems.length + ' nouveaux items</li>' +
                      '<li class="text-orange-600">' + duplicateResults.duplicates.length + ' doublons potentiels</li>' +
                    '</ul>' +
                  '</div>' +
                  
                  '<div class="bg-orange-50 rounded-lg p-4 mb-4">' +
                    '<h4 class="font-semibold mb-2">Doublons détectés :</h4>' +
                    '<div class="text-sm max-h-32 overflow-y-auto">' +
                      duplicateResults.duplicates.map(item => 
                        '<div class="mb-1">• ' + (item.title || 'Sans titre') + '</div>'
                      ).join('') +
                    '</div>' +
                  '</div>' +
                  
                  '<div class="flex space-x-3">' +
                    '<button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" ' +
                            'class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">' +
                      'Annuler' +
                    '</button>' +
                    '<button id="importOnlyNew" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">' +
                      'Importer Nouveaux Seulement (' + duplicateResults.newItems.length + ')' +
                    '</button>' +
                    '<button id="importAll" class="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">' +
                      'Importer Tous (avec doublons)' +
                    '</button>' +
                  '</div>' +
                '</div>' +
              '</div>';

              document.body.appendChild(modal);
              
              // Gestionnaires d'événements
              modal.querySelector('#importOnlyNew').addEventListener('click', async () => {
                modal.remove();
                await this.importItems(duplicateResults.newItems);
              });
              
              modal.querySelector('#importAll').addEventListener('click', async () => {
                modal.remove();
                await this.importItems([...duplicateResults.newItems, ...duplicateResults.duplicates]);
              });
            }

            showTemplateSelector() {
              const modal = document.createElement('div');
              modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
              
              modal.innerHTML = '<div class="bg-white rounded-lg shadow-xl max-w-lg w-full">' +
                '<div class="p-6">' +
                  '<h3 class="text-xl font-bold text-gray-900 mb-4">' +
                    '<i class="fas fa-file-csv text-blue-600 mr-2"></i>' +
                    'Templates CSV' +
                  '</h3>' +
                  
                  '<p class="text-gray-600 mb-4">Choisissez un template CSV prédéfini pour votre catégorie :</p>' +
                  
                  '<div class="space-y-2">' +
                    '<button onclick="window.app.downloadTemplate(\\'books\\')" ' +
                            'class="w-full text-left p-3 border rounded-lg hover:bg-blue-50 flex items-center">' +
                      '<i class="fas fa-book text-blue-600 mr-3"></i>' +
                      '<div>' +
                        '<div class="font-semibold">Livres & Publications</div>' +
                        '<div class="text-sm text-gray-500">Titre, Auteur, ISBN, Éditeur, Année...</div>' +
                      '</div>' +
                    '</button>' +
                    
                    '<button onclick="window.app.downloadTemplate(\\'cards\\')" ' +
                            'class="w-full text-left p-3 border rounded-lg hover:bg-green-50 flex items-center">' +
                      '<i class="fas fa-id-card text-green-600 mr-3"></i>' +
                      '<div>' +
                        '<div class="font-semibold">Cartes de Collection</div>' +
                        '<div class="text-sm text-gray-500">Nom, Sport, Année, Marque, Numéro...</div>' +
                      '</div>' +
                    '</button>' +
                    
                    '<button onclick="window.app.downloadTemplate(\\'music\\')" ' +
                            'class="w-full text-left p-3 border rounded-lg hover:bg-purple-50 flex items-center">' +
                      '<i class="fas fa-music text-purple-600 mr-3"></i>' +
                      '<div>' +
                        '<div class="font-semibold">Musique & Vinyles</div>' +
                        '<div class="text-sm text-gray-500">Album, Artiste, Label, Format, Année...</div>' +
                      '</div>' +
                    '</button>' +
                    
                    '<button onclick="window.app.downloadTemplate(\\'comics\\')" ' +
                            'class="w-full text-left p-3 border rounded-lg hover:bg-red-50 flex items-center">' +
                      '<i class="fas fa-mask text-red-600 mr-3"></i>' +
                      '<div>' +
                        '<div class="font-semibold">BD & Comics</div>' +
                        '<div class="text-sm text-gray-500">Titre, Série, Auteur, Éditeur, Numéro...</div>' +
                      '</div>' +
                    '</button>' +
                    
                    '<button onclick="window.app.downloadTemplate(\\'general\\')" ' +
                            'class="w-full text-left p-3 border rounded-lg hover:bg-gray-50 flex items-center">' +
                      '<i class="fas fa-star text-yellow-600 mr-3"></i>' +
                      '<div>' +
                        '<div class="font-semibold">Général / Personnalisé</div>' +
                        '<div class="text-sm text-gray-500">Template de base avec colonnes standards</div>' +
                      '</div>' +
                    '</button>' +
                  '</div>' +
                  
                  '<div class="mt-6 text-center">' +
                    '<button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" ' +
                            'class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">' +
                      'Fermer' +
                    '</button>' +
                  '</div>' +
                '</div>' +
              '</div>';

              document.body.appendChild(modal);
            }

            downloadTemplate(category) {
              const templates = {
                books: {
                  headers: ['Titre', 'Auteur', 'ISBN', 'Éditeur', 'Année', 'Format', 'État', 'Valeur estimée', 'Notes'],
                  sample: ['Les Anciens Canadiens', 'Philippe Aubert de Gaspé', '978-2-7644-0123-4', 'Bibliothèque québécoise', '1863', 'Broché', 'Bon', '1200', 'Première édition française']
                },
                cards: {
                  headers: ['Nom du joueur', 'Sport', 'Année', 'Marque', 'Numéro', 'Série', 'État', 'Valeur estimée', 'Certification'],
                  sample: ['Wayne Gretzky', 'Hockey', '1979', 'O-Pee-Chee', '18', 'Rookie', 'Near Mint', '2500', 'PSA']
                },
                music: {
                  headers: ['Album', 'Artiste', 'Label', 'Format', 'Année', 'Pays', 'État', 'Valeur estimée', 'Pressing'],
                  sample: ['Abbey Road', 'The Beatles', 'Apple Records', 'Vinyle', '1969', 'UK', 'Excellent', '750', 'Original']
                },
                comics: {
                  headers: ['Titre', 'Série', 'Numéro', 'Auteur', 'Éditeur', 'Année', 'État', 'Valeur estimée', 'Variant'],
                  sample: ['Tintin au Tibet', 'Les Aventures de Tintin', '20', 'Hergé', 'Casterman', '1960', 'Excellent', '400', 'Première édition']
                },
                general: {
                  headers: ['Titre', 'Description', 'Catégorie', 'État', 'Année', 'Fabricant', 'Valeur estimée', 'Notes'],
                  sample: ['Exemple d\'item', 'Description détaillée', 'vintage', 'Excellent', '1980', 'Fabricant XYZ', '500', 'Notes additionnelles']
                }
              };

              const template = templates[category];
              if (!template) return;

              const csvContent = [template.headers, template.sample]
                .map(row => row.join(','))
                .join('\\n');

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', 'template-' + category + '.csv');
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              this.showNotification('Template ' + category + ' téléchargé avec succès', 'success');
              
              // Fermer le modal
              document.querySelector('.fixed.inset-0').remove();
            }

            escapeCSV(str) {
              if (!str) return '';
              const escaped = str.toString().replace(/"/g, '""');
              return escaped.includes(',') || escaped.includes('"') || escaped.includes('\\n') 
                ? '"' + escaped + '"' 
                : escaped;
            }

            formatCurrency(amount) {
              return new Intl.NumberFormat('fr-CA', {
                style: 'currency',
                currency: 'CAD'
              }).format(amount);
            }

            showNotification(message, type = 'info') {
              const notification = document.createElement('div');
              notification.className = 'fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300';
              
              const colors = {
                success: 'bg-green-500 text-white',
                error: 'bg-red-500 text-white', 
                warning: 'bg-yellow-500 text-white',
                info: 'bg-blue-500 text-white'
              };
              
              notification.className += ' ' + (colors[type] || colors.info);
              notification.innerHTML = '<i class="fas fa-info-circle mr-2"></i>' + message;
              
              document.body.appendChild(notification);
              
              setTimeout(() => {
                if (notification.parentNode) {
                  notification.parentNode.removeChild(notification);
                }
              }, 3000);
            }
          }

          // Initialisation
          window.addEventListener('DOMContentLoaded', () => {
            window.app = new CollectionEvaluator();
          });
        `}</script>
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

// API: Upload intelligent avec analyse automatique
app.post('/api/upload', async (c) => {
  const { DB, OPENAI_API_KEY, EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, GOOGLE_BOOKS_API_KEY, DISCOGS_API_KEY } = c.env;
  
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
      text_input,        // Nouveau: texte libre "Abbey Road Beatles" 
      video_url,         // Nouveau: support vidéo
      filename,          // Nouveau: nom du fichier pour extraction
      collection_id = 1,
      auto_evaluate = true  // Nouveau: évaluation automatique
    } = body;

    // Créer l'item en base avec statut 'analyzing'
    const result = await DB.prepare(`
      INSERT INTO collection_items (
        collection_id, title, description, category, condition_grade,
        year_made, manufacturer, primary_image_url, video_url, processing_status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'analyzing', ?, ?)
    `).bind(
      collection_id,
      title || 'Item en cours d\'analyse',
      description,
      category || 'other',
      condition_grade,
      year_made,
      manufacturer,
      image_url,
      video_url,
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    const itemId = result.meta.last_row_id as number;

    // Log initial
    await DB.prepare(`
      INSERT INTO activity_logs (item_id, action_type, action_description, status, created_at)
      VALUES (?, 'upload', 'Item créé - Analyse intelligente démarrée', 'success', ?)
    `).bind(itemId, new Date().toISOString()).run();

    let evaluationResult = null;

    // Évaluation intelligente automatique si demandée
    if (auto_evaluate && OPENAI_API_KEY) {
      try {
        // Importer et utiliser l'évaluateur amélioré
        const { EnhancedEvaluator } = await import('./services/enhanced-evaluator');
        
        const evaluator = new EnhancedEvaluator(DB, {
          openai: { api_key: OPENAI_API_KEY },
          ebay: EBAY_CLIENT_ID && EBAY_CLIENT_SECRET ? {
            client_id: EBAY_CLIENT_ID,
            client_secret: EBAY_CLIENT_SECRET,
            sandbox: false
          } : null,
          google_books: GOOGLE_BOOKS_API_KEY ? { api_key: GOOGLE_BOOKS_API_KEY } : null,
          discogs: DISCOGS_API_KEY ? { api_key: DISCOGS_API_KEY } : null
        });

        console.log('🚀 Démarrage évaluation intelligente...');
        
        evaluationResult = await evaluator.evaluateItem({
          imageUrl: image_url,
          videoUrl: video_url,
          textInput: text_input || title,
          filename: filename,
          category: category as any,
          force_refresh: true
        });

        // Mettre à jour l'item avec les résultats de l'analyse
        if (evaluationResult.success && evaluationResult.smart_analysis) {
          const analysis = evaluationResult.smart_analysis;
          
          await DB.prepare(`
            UPDATE collection_items 
            SET 
              title = COALESCE(?, title),
              category = COALESCE(?, category), 
              condition_grade = COALESCE(?, condition_grade),
              year_made = COALESCE(?, year_made),
              manufacturer = COALESCE(?, manufacturer),
              processing_status = 'completed',
              ai_analyzed = 1,
              last_evaluation_date = ?,
              updated_at = ?
            WHERE id = ?
          `).bind(
            analysis.extracted_data.title || null,
            analysis.category || null,
            analysis.extracted_data.condition || null,
            analysis.extracted_data.year || null,
            analysis.extracted_data.publisher_label || null,
            new Date().toISOString(),
            new Date().toISOString(),
            itemId
          ).run();

          // Sauvegarder tous les résultats enrichis
          await evaluator.saveEnhancedResults(itemId, evaluationResult);
        }

      } catch (evalError) {
        console.error('❌ Erreur évaluation intelligente:', evalError);
        
        // Marquer comme erreur mais ne pas échouer l'upload
        await DB.prepare(`
          UPDATE collection_items 
          SET processing_status = 'error', updated_at = ?
          WHERE id = ?
        `).bind(new Date().toISOString(), itemId).run();

        await DB.prepare(`
          INSERT INTO activity_logs (item_id, action_type, action_description, status, error_message, created_at)
          VALUES (?, 'evaluation', 'Erreur évaluation intelligente', 'error', ?, ?)
        `).bind(itemId, evalError.message, new Date().toISOString()).run();
      }
    }

    return c.json({
      success: true,
      item_id: itemId,
      message: auto_evaluate ? 'Item créé et analyse intelligente démarrée' : 'Item créé avec succès',
      evaluation_result: evaluationResult || undefined
    });

  } catch (error) {
    console.error('❌ Erreur upload:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
})

// API: Évaluation intelligente d'un item existant
app.post('/api/evaluate/:id', async (c) => {
  const { DB, OPENAI_API_KEY, EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, GOOGLE_BOOKS_API_KEY, DISCOGS_API_KEY } = c.env;
  const itemId = parseInt(c.req.param('id'));
  
  try {
    // Récupérer l'item existant
    const item = await DB.prepare(`
      SELECT * FROM collection_items WHERE id = ?
    `).bind(itemId).first() as any;

    if (!item) {
      return c.json({ success: false, error: 'Item non trouvé' }, 404);
    }

    // Marquer comme en cours de traitement
    await DB.prepare(`
      UPDATE collection_items 
      SET processing_status = 'processing', updated_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), itemId).run();

    let evaluationResult = null;

    if (OPENAI_API_KEY) {
      try {
        const { EnhancedEvaluator } = await import('./services/enhanced-evaluator');
        
        const evaluator = new EnhancedEvaluator(DB, {
          openai: { api_key: OPENAI_API_KEY },
          ebay: EBAY_CLIENT_ID && EBAY_CLIENT_SECRET ? {
            client_id: EBAY_CLIENT_ID,
            client_secret: EBAY_CLIENT_SECRET,
            sandbox: false
          } : null,
          google_books: GOOGLE_BOOKS_API_KEY ? { api_key: GOOGLE_BOOKS_API_KEY } : null,
          discogs: DISCOGS_API_KEY ? { api_key: DISCOGS_API_KEY } : null
        });

        console.log(`🔄 Réévaluation intelligente item ${itemId}...`);
        
        evaluationResult = await evaluator.evaluateItem({
          imageUrl: item.primary_image_url,
          videoUrl: item.video_url,
          textInput: `${item.title} ${item.manufacturer || ''}`.trim(),
          category: item.category as any,
          force_refresh: true
        });

        // Mettre à jour avec les nouveaux résultats
        if (evaluationResult.success) {
          await DB.prepare(`
            UPDATE collection_items 
            SET 
              processing_status = 'completed',
              ai_analyzed = 1,
              last_evaluation_date = ?,
              updated_at = ?
            WHERE id = ?
          `).bind(
            new Date().toISOString(),
            new Date().toISOString(),
            itemId
          ).run();

          await evaluator.saveEnhancedResults(itemId, evaluationResult);
        } else {
          await DB.prepare(`
            UPDATE collection_items 
            SET processing_status = 'error', updated_at = ?
            WHERE id = ?
          `).bind(new Date().toISOString(), itemId).run();
        }

      } catch (evalError) {
        console.error('❌ Erreur réévaluation:', evalError);
        
        await DB.prepare(`
          UPDATE collection_items 
          SET processing_status = 'error', updated_at = ?
          WHERE id = ?
        `).bind(new Date().toISOString(), itemId).run();

        return c.json({ 
          success: false, 
          error: evalError.message 
        }, 500);
      }
    }

    return c.json({
      success: true,
      message: 'Évaluation intelligente terminée',
      evaluation_result: evaluationResult
    });

  } catch (error) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
})

// API: Import d'un item depuis CSV
app.post('/api/import-item', async (c) => {
  const { DB } = c.env;
  
  try {
    const body = await c.req.json();
    const {
      title,
      description = '',
      category = 'other',
      condition_grade = 'good',
      year_made,
      manufacturer = '',
      estimated_value,
      image_url // Nouvelle: URL de l'image
    } = body;

    // Validation basique
    if (!title || title.trim().length < 2) {
      return c.json({
        success: false,
        error: 'Titre requis (minimum 2 caractères)'
      }, 400);
    }

    // Créer l'item en base
    const result = await DB.prepare(`
      INSERT INTO collection_items (
        collection_id, title, description, category, condition_grade,
        year_made, manufacturer, primary_image_url, processing_status, ai_analyzed,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', 0, ?, ?)
    `).bind(
      1, // collection_id par défaut
      title.trim(),
      description.trim(),
      category,
      condition_grade,
      year_made,
      manufacturer.trim(),
      image_url || null,
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    const itemId = result.meta.last_row_id as number;

    // Ajouter une évaluation de prix si fournie
    if (estimated_value && estimated_value > 0) {
      await DB.prepare(`
        INSERT INTO price_evaluations (
          item_id, source_name, estimated_value, confidence_score, 
          evaluation_date, is_active, created_at
        ) VALUES (?, 'CSV Import', ?, 0.5, ?, 1, ?)
      `).bind(
        itemId,
        estimated_value,
        new Date().toISOString(),
        new Date().toISOString()
      ).run();
    }

    // Log de l'activité
    await DB.prepare(`
      INSERT INTO activity_logs (
        item_id, action_type, action_description, status, created_at
      ) VALUES (?, 'import', 'Item importé depuis CSV', 'success', ?)
    `).bind(itemId, new Date().toISOString()).run();

    return c.json({
      success: true,
      item_id: itemId,
      message: 'Item importé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur import item:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
})

// API: Évaluation intelligente directe (sans sauvegarde)
app.post('/api/smart-evaluate', async (c) => {
  const { OPENAI_API_KEY, EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, GOOGLE_BOOKS_API_KEY, DISCOGS_API_KEY } = c.env;
  
  try {
    const body = await c.req.json();
    const { 
      image_url,
      video_url,
      text_input,
      filename,
      category
    } = body;

    // Mode démo : continuer même sans vraie API key
    // if (!OPENAI_API_KEY) {
    //   return c.json({ 
    //     success: false, 
    //     error: 'OpenAI API key non configurée' 
    //   }, 400);
    // }

    const { EnhancedEvaluator } = await import('./services/enhanced-evaluator');
    
    // Créer une DB temporaire pour cette évaluation
    const tempDb = null as any; // L'évaluateur peut fonctionner sans DB pour analyse seule
    
    const evaluator = new EnhancedEvaluator(tempDb, {
      openai: { api_key: OPENAI_API_KEY || 'demo-key' },
      ebay: EBAY_CLIENT_ID && EBAY_CLIENT_SECRET ? {
        client_id: EBAY_CLIENT_ID,
        client_secret: EBAY_CLIENT_SECRET,
        sandbox: false
      } : null,
      google_books: GOOGLE_BOOKS_API_KEY ? { api_key: GOOGLE_BOOKS_API_KEY } : null,
      discogs: DISCOGS_API_KEY ? { api_key: DISCOGS_API_KEY } : null
    });

    console.log('🧠 Évaluation intelligente directe...');
    
    const evaluationResult = await evaluator.evaluateItem({
      imageUrl: image_url,
      videoUrl: video_url,
      textInput: text_input,
      filename: filename,
      category: category as any
    });

    return c.json(evaluationResult);

  } catch (error) {
    console.error('❌ Erreur évaluation directe:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
})

export default app