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
    
    // Créer l'item en base
    const response = await axios.post('/api/upload', {
      title: metadata.title,
      description: metadata.description,
      category: metadata.category,
      condition_grade: metadata.condition,
      year_made: metadata.year,
      manufacturer: metadata.manufacturer,
      image_url: imageUrl
    });

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    // Déclencher évaluation automatique
    setTimeout(() => {
      this.evaluateItem(response.data.item_id);
    }, 1000);

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
    // Intelligence artificielle basique pour extraire info du nom de fichier
    const name = filename.toLowerCase().replace(/\\.[^/.]+$/, '');
    
    let category = 'other';
    let condition = 'good';
    let year = null;
    let manufacturer = '';
    
    // Détection de catégorie
    if (name.includes('card') || name.includes('carte')) {
      if (name.includes('hockey') || name.includes('baseball') || name.includes('sport')) {
        category = 'sports_cards';
      } else if (name.includes('pokemon') || name.includes('magic') || name.includes('tcg')) {
        category = 'trading_cards';
      }
    } else if (name.includes('book') || name.includes('livre')) {
      category = 'books';
    } else if (name.includes('comic') || name.includes('bd')) {
      category = 'comics';
    } else if (name.includes('vintage') || name.includes('antique')) {
      category = 'vintage';
    }

    // Détection d'état
    if (name.includes('mint')) condition = 'mint';
    else if (name.includes('excellent')) condition = 'excellent';
    else if (name.includes('good')) condition = 'good';

    // Détection d'année
    const yearMatch = name.match(/(19|20)\\d{2}/);
    if (yearMatch) {
      year = parseInt(yearMatch[0]);
    }

    // Fabricants communs
    const manufacturers = ['topps', 'upper deck', 'panini', 'opc', 'o-pee-chee', 'parkhurst'];
    for (const mfg of manufacturers) {
      if (name.includes(mfg)) {
        manufacturer = mfg;
        break;
      }
    }

    return {
      title: this.cleanTitle(name),
      description: `Uploadé automatiquement depuis ${filename}`,
      category,
      condition,
      year,
      manufacturer
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