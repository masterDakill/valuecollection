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

  setupEventListeners() {
    // Upload et fichiers
    document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));
    document.getElementById('dropZone').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('clearFiles').addEventListener('click', () => this.clearFiles());
    document.getElementById('startUpload').addEventListener('click', () => this.startBatchUpload());
    document.getElementById('quickEvalBtn').addEventListener('click', () => this.quickEvaluate());
    document.getElementById('testSmartEval').addEventListener('click', () => this.testSmartEvaluation());

    // Filtres
    document.getElementById('applyFilters').addEventListener('click', () => this.applyFilters());
    document.getElementById('searchInput').addEventListener('keyup', _.debounce(() => this.applyFilters(), 500));
    document.getElementById('thresholdValue').addEventListener('change', () => this.updateThreshold());

    // Actions
    document.getElementById('exportData').addEventListener('click', () => this.exportToCSV());
    document.getElementById('viewGrid').addEventListener('click', () => this.switchView('grid'));
    document.getElementById('viewList').addEventListener('click', () => this.switchView('list'));

    // Auto-refresh stats
    setInterval(() => this.loadStats(), 30000); // Toutes les 30s
  }

  setupDropZone() {
    const dropZone = document.getElementById('dropZone');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, this.preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  async handleFileSelect(e) {
    const files = Array.from(e.target.files);
    await this.processFiles(files);
  }

  async handleDrop(e) {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);
    await this.processFiles(files);
  }

  async processFiles(files) {
    // Filtrer les fichiers image valides
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isImage && isValidSize;
    });

    if (validFiles.length === 0) {
      this.showNotification('Aucun fichier image valide sélectionné', 'warning');
      return;
    }

    if (validFiles.length > 100) {
      this.showNotification('Maximum 100 fichiers autorisés à la fois', 'warning');
      return;
    }

    // Ajouter à la sélection
    for (const file of validFiles) {
      if (!this.selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        this.selectedFiles.push(file);
      }
    }

    this.displayFilePreview();
    this.showNotification(`${validFiles.length} fichier(s) ajouté(s)`, 'success');
  }

  displayFilePreview() {
    const preview = document.getElementById('filePreview');
    const fileList = document.getElementById('fileList');
    
    if (this.selectedFiles.length === 0) {
      preview.classList.add('hidden');
      return;
    }

    preview.classList.remove('hidden');
    fileList.innerHTML = '';

    this.selectedFiles.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'relative bg-gray-50 border rounded-lg p-3';
      
      const reader = new FileReader();
      reader.onload = (e) => {
        fileItem.innerHTML = `
          <div class="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-2">
            <img src="${e.target.result}" alt="${file.name}" 
                 class="w-full h-full object-cover" />
          </div>
          <p class="text-xs text-gray-600 truncate" title="${file.name}">
            ${file.name}
          </p>
          <p class="text-xs text-gray-400">
            ${this.formatFileSize(file.size)}
          </p>
          <button onclick="app.removeFile(${index})" 
                  class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">
            ×
          </button>
        `;
      };
      reader.readAsDataURL(file);
      
      fileList.appendChild(fileItem);
    });
  }

  removeFile(index) {
    this.selectedFiles.splice(index, 1);
    this.displayFilePreview();
  }

  clearFiles() {
    this.selectedFiles = [];
    this.displayFilePreview();
    document.getElementById('fileInput').value = '';
  }

  async startBatchUpload() {
    if (this.selectedFiles.length === 0) {
      this.showNotification('Aucun fichier sélectionné', 'warning');
      return;
    }

    if (this.isUploading) {
      this.showNotification('Upload déjà en cours', 'warning');
      return;
    }

    this.isUploading = true;
    const dropContent = document.getElementById('dropContent');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    dropContent.classList.add('hidden');
    uploadProgress.classList.remove('hidden');

    let completed = 0;
    const total = this.selectedFiles.length;

    try {
      for (let i = 0; i < this.selectedFiles.length; i++) {
        const file = this.selectedFiles[i];
        
        progressText.textContent = `Traitement ${i + 1}/${total}: ${file.name}`;
        
        try {
          await this.uploadSingleFile(file);
          completed++;
        } catch (error) {
          console.error(`Erreur upload ${file.name}:`, error);
        }

        const progress = ((i + 1) / total) * 100;
        progressBar.style.width = `${progress}%`;
        
        // Délai entre uploads pour éviter surcharge
        if (i < this.selectedFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      this.showNotification(`${completed}/${total} fichiers traités avec succès`, 'success');
      this.clearFiles();
      await this.loadStats();
      await this.loadItems();

    } catch (error) {
      this.showNotification('Erreur lors de l\'upload', 'error');
      console.error('Batch upload error:', error);
    } finally {
      this.isUploading = false;
      dropContent.classList.remove('hidden');
      uploadProgress.classList.add('hidden');
      progressBar.style.width = '0%';
    }
  }

  async uploadSingleFile(file) {
    // Simuler upload vers stockage cloud (Cloudflare R2, AWS S3, etc.)
    const imageUrl = await this.simulateImageUpload(file);
    
    // Extraire métadonnées du nom de fichier
    const metadata = this.extractMetadataFromFilename(file.name);
    
    // Détecter si c'est une vidéo
    const isVideo = file.type.startsWith('video/');
    
    // Upload intelligent avec analyse automatique
    const response = await axios.post('/api/upload', {
      title: metadata.title,
      description: metadata.description,
      category: metadata.category,
      condition_grade: metadata.condition,
      year_made: metadata.year,
      manufacturer: metadata.manufacturer,
      image_url: isVideo ? null : imageUrl,
      video_url: isVideo ? imageUrl : null,
      text_input: metadata.searchText, // Texte libre extrait
      filename: file.name,
      auto_evaluate: true  // Évaluation intelligente automatique
    });

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    // L'évaluation est maintenant automatique et intégrée
    console.log('✅ Upload avec évaluation intelligente:', response.data.evaluation_result);

    return response.data;
  }

  async simulateImageUpload(file) {
    // En production, ceci uploadrait vers Cloudflare R2 ou service similaire
    // Pour le moment, on simule avec une URL data
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  extractMetadataFromFilename(filename) {
    // Intelligence améliorée pour extraire info du nom de fichier
    const name = filename.toLowerCase().replace(/\\.[^/.]+$/, '');
    
    let category = 'other';
    let condition = 'good';
    let year = null;
    let manufacturer = '';
    let searchText = '';
    
    // Détection de catégorie enrichie
    if (name.includes('vinyl') || name.includes('lp') || name.includes('ep') || name.includes('45rpm')) {
      category = 'records';
    } else if (name.includes('cd') && !name.includes('card')) {
      category = 'cds';
    } else if (name.includes('dvd') || name.includes('bluray') || name.includes('blu-ray')) {
      category = 'dvds';
    } else if (name.includes('card') || name.includes('carte')) {
      if (name.includes('hockey') || name.includes('baseball') || name.includes('sport')) {
        category = 'sports_cards';
      } else if (name.includes('pokemon') || name.includes('magic') || name.includes('tcg')) {
        category = 'trading_cards';
      }
    } else if (name.includes('book') || name.includes('livre')) {
      category = 'books';
    } else if (name.includes('comic') || name.includes('bd')) {
      category = 'comics';
    } else if (name.includes('game') || name.includes('jeu')) {
      category = 'games';
    } else if (name.includes('vintage') || name.includes('antique')) {
      category = 'vintage';
    }

    // Détection d'état enrichie
    if (name.includes('mint') || name.includes('sealed')) condition = 'mint';
    else if (name.includes('near mint') || name.includes('nm')) condition = 'near_mint';
    else if (name.includes('excellent') || name.includes('vg+')) condition = 'excellent';
    else if (name.includes('very good') || name.includes('vg')) condition = 'very_good';
    else if (name.includes('good')) condition = 'good';
    else if (name.includes('fair') || name.includes('poor')) condition = 'fair';

    // Détection d'année
    const yearMatch = name.match(/(19|20)\\d{2}/);
    if (yearMatch) {
      year = parseInt(yearMatch[0]);
    }

    // Fabricants/labels étendus
    const manufacturers = [
      // Cartes
      'topps', 'upper deck', 'panini', 'opc', 'o-pee-chee', 'parkhurst', 'bowman',
      // Vinyles/CDs
      'columbia', 'rca', 'atlantic', 'capitol', 'motown', 'warner', 'emi', 'universal',
      // Livres
      'penguin', 'vintage', 'bantam', 'del rey', 'tor', 'scholastic',
      // Éditeurs québécois
      'boreal', 'leméac', 'quebec amerique', 'vlb', 'fides'
    ];
    
    for (const mfg of manufacturers) {
      if (name.includes(mfg)) {
        manufacturer = mfg;
        break;
      }
    }

    // Extraction de texte de recherche intelligent
    searchText = name
      .replace(/[-_]/g, ' ')
      .replace(/\\b(cd|dvd|vinyl|lp|ep|mint|excellent|good)\\b/gi, '')
      .replace(/\\b\\d{4}\\b/, '') // Supprimer années
      .replace(/\\s+/g, ' ')
      .trim();

    // Patterns spéciaux pour musique (artiste - album)
    const musicPattern = /(.*?)[-_](.*?)(?:[-_]\\d{4})?$/;
    const musicMatch = searchText.match(musicPattern);
    if (musicMatch && (category === 'records' || category === 'cds')) {
      searchText = `${musicMatch[1].trim()} ${musicMatch[2].trim()}`;
    }

    return {
      title: this.cleanTitle(name),
      description: `Analysé automatiquement depuis ${filename}`,
      category,
      condition,
      year,
      manufacturer,
      searchText
    };
  }

  cleanTitle(name) {
    return name
      .replace(/[-_]/g, ' ')
      .replace(/\\b\\w/g, l => l.toUpperCase())
      .replace(/\\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  async evaluateItem(itemId) {
    try {
      await axios.post(`/api/evaluate/${itemId}`);
    } catch (error) {
      console.error('Evaluation error:', error);
    }
  }

  async loadStats() {
    try {
      const response = await axios.get('/api/stats');
      if (response.data.success) {
        const stats = response.data.stats;
        
        document.getElementById('totalItems').textContent = stats.total_items || 0;
        document.getElementById('analyzedItems').textContent = stats.analyzed_items || 0;
        document.getElementById('totalValue').textContent = this.formatCurrency(stats.total_value || 0);
        
        this.updateThreshold();
      }
    } catch (error) {
      console.error('Stats loading error:', error);
    }
  }

  updateThreshold() {
    const threshold = parseFloat(document.getElementById('thresholdValue').value) || 0;
    
    // Compter items au-dessus du seuil (simulation pour l'instant)
    const aboveThreshold = this.currentItems.filter(item => 
      (item.estimated_value || 0) >= threshold
    ).length;
    
    document.getElementById('aboveThreshold').textContent = aboveThreshold;
  }

  async loadItems(page = 1) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        ...this.currentFilters
      });

      const response = await axios.get(`/api/items?${params}`);
      
      if (response.data.success) {
        this.currentItems = response.data.items;
        this.displayItems(response.data.items);
        this.updateItemCount(response.data.pagination.total);
      }
    } catch (error) {
      console.error('Items loading error:', error);
      this.showNotification('Erreur lors du chargement des items', 'error');
    }
  }

  applyFilters() {
    this.currentFilters = {
      search: document.getElementById('searchInput').value,
      category: document.getElementById('categoryFilter').value,
      condition: document.getElementById('conditionFilter').value,
      status: document.getElementById('statusFilter').value
    };

    // Nettoyer les filtres vides
    Object.keys(this.currentFilters).forEach(key => {
      if (!this.currentFilters[key]) {
        delete this.currentFilters[key];
      }
    });

    this.loadItems(1);
  }

  displayItems(items) {
    const container = document.getElementById('itemsList');
    const emptyState = document.getElementById('emptyState');
    
    if (items.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    
    const itemsHtml = items.map(item => this.renderItemCard(item)).join('');
    container.innerHTML = itemsHtml;
  }

  renderItemCard(item) {
    const statusColors = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-yellow-100 text-yellow-800',
      uploaded: 'bg-blue-100 text-blue-800',
      error: 'bg-red-100 text-red-800'
    };

    const statusColor = statusColors[item.processing_status] || 'bg-gray-100 text-gray-800';
    const processingClass = item.processing_status === 'processing' ? 'processing' : '';
    
    return `
      <div class="item-card ${processingClass} border-b p-6 hover:bg-gray-50">
        <div class="flex items-start space-x-4">
          
          <!-- Image -->
          <div class="flex-shrink-0">
            <div class="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden">
              ${item.primary_image_url ? 
                `<img src="${item.primary_image_url}" alt="${item.title}" class="w-full h-full object-cover" />` :
                `<div class="w-full h-full flex items-center justify-center text-gray-400">
                   <i class="fas fa-image text-2xl"></i>
                 </div>`
              }
            </div>
          </div>

          <!-- Contenu principal -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900 truncate">
                  ${item.title}
                </h3>
                <p class="text-sm text-gray-600 mt-1">
                  ${item.description || 'Aucune description'}
                </p>
                
                <div class="flex items-center space-x-4 mt-2">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ${this.getCategoryLabel(item.category)}
                  </span>
                  
                  ${item.condition_grade ? 
                    `<span class="text-xs text-gray-500">État: ${this.getConditionLabel(item.condition_grade)}</span>` : ''
                  }
                  
                  ${item.year_made ? 
                    `<span class="text-xs text-gray-500">Année: ${item.year_made}</span>` : ''
                  }
                </div>
              </div>

              <!-- Prix et statut -->
              <div class="text-right ml-4">
                <div class="text-lg font-bold text-gray-900">
                  ${item.estimated_value ? 
                    this.formatCurrency(item.estimated_value) : 
                    '<span class="text-gray-400">Non évalué</span>'
                  }
                </div>
                
                ${item.confidence_score ? 
                  `<div class="text-xs text-gray-500">
                     Confiance: ${Math.round(item.confidence_score * 100)}%
                   </div>` : ''
                }
                
                <div class="mt-2">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">
                    ${this.getStatusLabel(item.processing_status)}
                  </span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center space-x-3 mt-4">
              <button onclick="app.evaluateItem(${item.id})" 
                      class="text-blue-600 hover:text-blue-800 text-sm">
                <i class="fas fa-search-dollar mr-1"></i>
                Réévaluer
              </button>
              
              <button onclick="app.viewItemDetails(${item.id})" 
                      class="text-green-600 hover:text-green-800 text-sm">
                <i class="fas fa-eye mr-1"></i>
                Détails
              </button>
              
              <button onclick="app.editItem(${item.id})" 
                      class="text-yellow-600 hover:text-yellow-800 text-sm">
                <i class="fas fa-edit mr-1"></i>
                Modifier
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getCategoryLabel(category) {
    const labels = {
      sports_cards: 'Cartes Sport',
      books: 'Livres',
      comics: 'BD/Comics',
      trading_cards: 'Cartes TCG',
      vintage: 'Vintage',
      memorabilia: 'Souvenirs',
      other: 'Autres'
    };
    return labels[category] || category;
  }

  getConditionLabel(condition) {
    const labels = {
      mint: 'Mint',
      near_mint: 'Near Mint',
      excellent: 'Excellent',
      very_good: 'Très Bon',
      good: 'Bon',
      fair: 'Acceptable',
      poor: 'Pauvre'
    };
    return labels[condition] || condition;
  }

  getStatusLabel(status) {
    const labels = {
      completed: 'Complété',
      processing: 'En cours...',
      uploaded: 'Uploadé',
      error: 'Erreur'
    };
    return labels[status] || status;
  }

  updateItemCount(total) {
    document.getElementById('itemCount').textContent = total;
  }

  viewItemDetails(itemId) {
    // TODO: Implémenter modal de détails
    console.log('View details for item:', itemId);
  }

  editItem(itemId) {
    // TODO: Implémenter édition d'item
    console.log('Edit item:', itemId);
  }

  switchView(viewType) {
    // TODO: Implémenter vue grille
    console.log('Switch to view:', viewType);
  }

  async exportToCSV() {
    try {
      const response = await axios.get('/api/items', {
        params: { per_page: 10000, ...this.currentFilters }
      });
      
      if (response.data.success) {
        this.downloadCSV(response.data.items);
      }
    } catch (error) {
      console.error('Export error:', error);
      this.showNotification('Erreur lors de l\'export', 'error');
    }
  }

  downloadCSV(items) {
    const headers = [
      'ID', 'Titre', 'Description', 'Catégorie', 'État', 
      'Année', 'Fabricant', 'Valeur Estimée', 'Confiance', 'Statut'
    ];
    
    const rows = items.map(item => [
      item.id,
      `"${item.title || ''}"`,
      `"${item.description || ''}"`,
      item.category,
      item.condition_grade || '',
      item.year_made || '',
      item.manufacturer || '',
      item.estimated_value || '',
      item.confidence_score || '',
      item.processing_status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `collection_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  }

  formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Évaluation rapide par texte libre
  async quickEvaluate() {
    const textInput = document.getElementById('quickEvalText').value.trim();
    
    if (!textInput) {
      this.showNotification('Veuillez saisir un titre et auteur/artiste', 'warning');
      return;
    }

    const btn = document.getElementById('quickEvalBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyse...';
    btn.disabled = true;

    try {
      const response = await axios.post('/api/smart-evaluate', {
        text_input: textInput
      });

      if (response.data.success) {
        this.displayQuickEvalResult(response.data);
      } else {
        this.showNotification('Erreur lors de l\'évaluation: ' + response.data.error, 'error');
      }

    } catch (error) {
      console.error('Erreur évaluation rapide:', error);
      this.showNotification('Erreur de connexion lors de l\'évaluation', 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  // Test de l'évaluation intelligente avec exemples
  async testSmartEvaluation() {
    const examples = [
      'Abbey Road The Beatles',
      'Les Anciens Canadiens Philippe Aubert de Gaspé',
      'Wayne Gretzky rookie card 1979',
      'Pink Floyd The Wall vinyl'
    ];

    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    document.getElementById('quickEvalText').value = randomExample;
    
    this.showNotification(`Test avec: "${randomExample}"`, 'info');
    await this.quickEvaluate();
  }

  // Affichage des résultats d'évaluation rapide
  displayQuickEvalResult(result) {
    const analysis = result.smart_analysis;
    const evaluations = result.evaluations || [];
    const insights = result.market_insights;

    // Créer modal ou section de résultats
    const resultModal = document.createElement('div');
    resultModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    const avgPrice = evaluations.length > 0 
      ? evaluations.reduce((sum, e) => sum + (e.estimated_value || 0), 0) / evaluations.length
      : 0;

    const confidenceColor = result.matching_confidence > 0.8 ? 'green' : 
                           result.matching_confidence > 0.6 ? 'yellow' : 'red';

    resultModal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-xl font-bold text-gray-900">
              <i class="fas fa-brain text-blue-600 mr-2"></i>
              Évaluation Intelligente
            </h3>
            <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" 
                    class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>

          <!-- Analyse principale -->
          <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 class="font-semibold mb-2">🔍 Analyse IA</h4>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div><strong>Catégorie:</strong> ${this.getCategoryLabel(analysis.category)}</div>
              <div><strong>Confiance:</strong> 
                <span class="text-${confidenceColor}-600 font-semibold">
                  ${Math.round(result.matching_confidence * 100)}%
                </span>
              </div>
              <div><strong>Titre:</strong> ${analysis.extracted_data.title || 'Non détecté'}</div>
              <div><strong>Auteur/Artiste:</strong> ${analysis.extracted_data.artist_author || 'Non détecté'}</div>
              <div><strong>Année:</strong> ${analysis.extracted_data.year || 'Non détectée'}</div>
              <div><strong>Rareté:</strong> ${this.getRarityLabel(analysis.estimated_rarity)}</div>
            </div>
          </div>

          <!-- Évaluations de prix -->
          ${evaluations.length > 0 ? `
            <div class="bg-green-50 rounded-lg p-4 mb-4">
              <h4 class="font-semibold mb-2">💰 Évaluations (${evaluations.length} sources)</h4>
              <div class="text-2xl font-bold text-green-800 mb-2">
                ${this.formatCurrency(avgPrice)} CAD
              </div>
              <div class="grid grid-cols-1 gap-2 text-sm">
                ${evaluations.map(eval => `
                  <div class="flex justify-between">
                    <span>${this.getSourceLabel(eval.evaluation_source)}:</span>
                    <span class="font-semibold">${this.formatCurrency(eval.estimated_value || 0)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : `
            <div class="bg-yellow-50 rounded-lg p-4 mb-4">
              <h4 class="font-semibold mb-2">⚠️ Aucune évaluation trouvée</h4>
              <p class="text-sm text-yellow-800">
                Aucune source n'a pu évaluer cet item. Vérifiez l'orthographe ou essayez avec plus d'informations.
              </p>
            </div>
          `}

          <!-- Insights marché -->
          <div class="bg-blue-50 rounded-lg p-4 mb-4">
            <h4 class="font-semibold mb-2">📊 Insights Marché</h4>
            <div class="text-sm space-y-1">
              <div><strong>Évaluation rareté:</strong> ${insights.rarity_assessment}</div>
              <div><strong>Tendance:</strong> ${this.getTrendLabel(insights.market_trend)}</div>
              <div><strong>Demande estimée:</strong> ${this.getDemandLabel(insights.estimated_demand)}</div>
              <div><strong>Ventes comparables:</strong> ${insights.comparable_sales} items</div>
            </div>
          </div>

          <!-- Suggestions -->
          ${result.suggested_improvements.length > 0 ? `
            <div class="bg-purple-50 rounded-lg p-4">
              <h4 class="font-semibold mb-2">💡 Suggestions</h4>
              <ul class="text-sm space-y-1">
                ${result.suggested_improvements.map(suggestion => `
                  <li><i class="fas fa-lightbulb text-yellow-500 mr-2"></i>${suggestion}</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

        </div>
      </div>
    `;

    document.body.appendChild(resultModal);
    
    // Fermer en cliquant à l'extérieur
    resultModal.addEventListener('click', (e) => {
      if (e.target === resultModal) {
        resultModal.remove();
      }
    });

    this.showNotification('Évaluation intelligente terminée !', 'success');
  }

  // Helpers pour l'affichage
  getRarityLabel(rarity) {
    const labels = {
      'ultra_rare': '💎 Ultra Rare',
      'very_rare': '💍 Très Rare',
      'rare': '🔹 Rare',
      'uncommon': '🔸 Peu Commun',
      'common': '⚪ Commun'
    };
    return labels[rarity] || rarity;
  }

  getSourceLabel(source) {
    const labels = {
      'ebay_sold_listings': 'eBay Vendus',
      'discogs': 'Discogs',
      'google_books': 'Google Books',
      'abebooks': 'AbeBooks',
      'enhanced_ai': 'IA Avancée'
    };
    return labels[source] || source;
  }

  getTrendLabel(trend) {
    const labels = {
      'increasing': '📈 En hausse',
      'stable': '➡️ Stable', 
      'decreasing': '📉 En baisse'
    };
    return labels[trend] || trend;
  }

  getDemandLabel(demand) {
    const labels = {
      'high': '🔥 Élevée',
      'medium': '🟡 Modérée',
      'low': '🔵 Faible'
    };
    return labels[demand] || demand;
  }

  showNotification(message, type = 'info') {
    // Créer notification toast
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
    
    const colors = {
      success: 'bg-green-500 text-white',
      error: 'bg-red-500 text-white', 
      warning: 'bg-yellow-500 text-white',
      info: 'bg-blue-500 text-white'
    };
    
    notification.className += ` ${colors[type] || colors.info}`;
    
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                       type === 'error' ? 'fa-exclamation-circle' :
                       type === 'warning' ? 'fa-exclamation-triangle' :
                       'fa-info-circle'}"></i>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto-suppression
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// Initialisation de l'application
window.addEventListener('DOMContentLoaded', () => {
  window.app = new CollectionEvaluator();
});