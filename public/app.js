// Évaluateur de Collection Pro - Frontend JavaScript
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
        thumb.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded-lg" alt="Preview" />`;
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
    
    modal.innerHTML = `<div class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-96 overflow-y-auto">
      <div class="p-6">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-bold text-gray-900">
            <i class="fas fa-brain text-purple-600 mr-2"></i>
            Analyse IA Terminée
          </h3>
          <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" 
                  class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 class="font-semibold mb-2">📄 Source: ${source}</h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Catégorie:</strong> ${analysis.category || 'Non détectée'}</div>
            <div><strong>Confiance:</strong> <span class="text-purple-600 font-semibold">${confidence}%</span></div>
            <div><strong>Titre:</strong> ${analysis.extracted_data?.title || 'Non détecté'}</div>
            <div><strong>Auteur/Artiste:</strong> ${analysis.extracted_data?.artist_author || 'Non détecté'}</div>
            <div><strong>Année:</strong> ${analysis.extracted_data?.year || 'Non détectée'}</div>
            <div><strong>Rareté:</strong> ${analysis.estimated_rarity || 'Inconnue'}</div>
          </div>
        </div>
        
        <div class="bg-blue-50 rounded-lg p-4 mb-4">
          <h4 class="font-semibold mb-2">🔍 Requêtes de recherche générées:</h4>
          <div class="flex flex-wrap gap-1">
            ${(analysis.search_queries || []).map(query => 
              `<span class="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">${query}</span>`
            ).join('')}
          </div>
        </div>
        
        <div class="text-center">
          <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" 
                  class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Fermer
          </button>
        </div>
      </div>
    </div>`;

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

  // ===== FONCTIONNALITÉS D'IMPORT AVANCÉES COMPLÈTES =====

  // Import CSV Simple avec validation avancée
  async handleCSVImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.showNotification('❌ Sélectionnez un fichier CSV valide', 'error');
      return;
    }

    this.showNotification('📊 Analyse du fichier CSV...', 'info');
    
    try {
      const content = await this.readFileAsText(file);
      const { data, errors, suggestions } = this.parseAndValidateCSV(content);
      
      if (errors.length > 0) {
        this.showValidationResults(errors, suggestions, data);
        return;
      }

      // Traitement des données
      const results = await this.processCSVData(data, false);
      this.showImportResults(results, 'CSV');
      
    } catch (error) {
      console.error('Erreur import CSV:', error);
      this.showNotification('❌ Erreur lors de l\'import CSV', 'error');
    }
  }

  // Import ZIP + Images avec CSV metadata
  async handleZIPImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      this.showNotification('❌ Sélectionnez un fichier ZIP valide', 'error');
      return;
    }

    this.showNotification('📦 Extraction du fichier ZIP...', 'info');
    
    try {
      // Utiliser JSZip (via CDN)
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Rechercher le fichier CSV de métadonnées
      const csvFile = Object.keys(zipContent.files).find(name => 
        name.toLowerCase().endsWith('.csv') && !zipContent.files[name].dir
      );
      
      if (!csvFile) {
        this.showNotification('❌ Aucun fichier CSV de métadonnées trouvé dans le ZIP', 'error');
        return;
      }

      // Lire les métadonnées CSV
      const csvContent = await zipContent.files[csvFile].async('string');
      const { data, errors, suggestions } = this.parseAndValidateCSV(csvContent);
      
      if (errors.length > 0) {
        this.showValidationResults(errors, suggestions, data, 'ZIP');
        return;
      }

      // Extraire et associer les images
      const imageFiles = Object.keys(zipContent.files).filter(name => 
        /\.(jpg|jpeg|png|webp|gif)$/i.test(name) && !zipContent.files[name].dir
      );

      this.showNotification(`📸 ${imageFiles.length} images trouvées, traitement...`, 'info');

      // Associer images aux données CSV
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        // Chercher image correspondante (par nom ou index)
        const matchingImage = imageFiles.find(imgName => {
          const baseName = imgName.split('/').pop().split('.')[0];
          return baseName === row.title?.replace(/[^a-zA-Z0-9]/g, '') || 
                 baseName === `item_${i+1}` || 
                 imgName.includes(row.title?.substring(0, 10) || '');
        });
        
        if (matchingImage) {
          const imageBlob = await zipContent.files[matchingImage].async('blob');
          row.image_url = URL.createObjectURL(imageBlob);
          row.image_filename = matchingImage.split('/').pop();
        }
      }

      // Traitement des données avec images
      const results = await this.processCSVData(data, true);
      this.showImportResults(results, 'ZIP');
      
    } catch (error) {
      console.error('Erreur import ZIP:', error);
      this.showNotification('❌ Erreur lors de l\'extraction ZIP', 'error');
    }
  }

  // Import incrémental avec détection de doublons
  async handleIncrementalImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.showNotification('❌ Sélectionnez un fichier CSV pour l\'import incrémental', 'error');
      return;
    }

    this.showNotification('🔄 Analyse incrémentale en cours...', 'info');
    
    try {
      const content = await this.readFileAsText(file);
      const { data, errors, suggestions } = this.parseAndValidateCSV(content);
      
      if (errors.length > 0) {
        this.showValidationResults(errors, suggestions, data, 'INCREMENTAL');
        return;
      }

      // Récupérer les items existants pour détection de doublons
      const existingItems = await this.loadExistingItems();
      
      // Détecter les doublons avec algorithme Levenshtein
      const { newItems, duplicates, updates } = this.detectDuplicates(data, existingItems);
      
      // Afficher les résultats de détection
      this.showDuplicateDetectionResults(newItems, duplicates, updates);
      
    } catch (error) {
      console.error('Erreur import incrémental:', error);
      this.showNotification('❌ Erreur lors de l\'import incrémental', 'error');
    }
  }

  // Afficher sélecteur de templates CSV
  showTemplateSelector() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    
    const templates = this.getCSVTemplates();
    
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div class="p-6">
          <h3 class="text-xl font-bold text-gray-900 mb-4">
            <i class="fas fa-download text-blue-600 mr-2"></i>
            Templates CSV Prédéfinis
          </h3>
          
          <p class="text-sm text-gray-600 mb-4">
            Choisissez un template adapté à votre type de collection
          </p>
          
          <div class="space-y-2 mb-6">
            ${templates.map(template => `
              <button onclick="window.app.downloadTemplate('${template.id}')" 
                      class="w-full p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                <div class="flex items-center">
                  <i class="${template.icon} text-lg mr-3" style="color: ${template.color}"></i>
                  <div>
                    <div class="font-semibold">${template.name}</div>
                    <div class="text-xs text-gray-500">${template.description}</div>
                    <div class="text-xs text-blue-600 mt-1">${template.columns.length} colonnes: ${template.columns.slice(0,3).join(', ')}...</div>
                  </div>
                </div>
              </button>
            `).join('')}
          </div>
          
          <div class="flex space-x-2">
            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                    class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
              Annuler
            </button>
            <button onclick="window.app.downloadTemplate('custom')" 
                    class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Template Personnalisé
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Export CSV complet avec filtres
  async exportToCSV() {
    try {
      this.showNotification('📋 Préparation de l\'export CSV...', 'info');
      
      // Récupérer tous les items
      const response = await axios.get('/api/items?per_page=1000');
      if (!response.data.success) {
        throw new Error(response.data.error);
      }

      const items = response.data.items || [];
      
      if (items.length === 0) {
        this.showNotification('❌ Aucun item à exporter', 'warning');
        return;
      }

      // Générer le CSV
      const csvContent = this.generateCSVContent(items);
      
      // Télécharger le fichier
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `collection_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      this.showNotification(`✅ Export réussi - ${items.length} items exportés`, 'success');
      
    } catch (error) {
      console.error('Erreur export CSV:', error);
      this.showNotification('❌ Erreur lors de l\'export', 'error');
    }
  }

  // ===== FONCTIONS UTILITAIRES AVANCÉES =====

  // Lire fichier comme texte
  async readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, 'UTF-8');
    });
  }

  // Parser et valider CSV avec suggestions de correction
  parseAndValidateCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      return { data: [], errors: ['Fichier CSV vide ou invalide'], suggestions: [] };
    }

    // Détecter le séparateur
    const separators = [',', ';', '\t', '|'];
    const separator = separators.find(sep => 
      lines[0].split(sep).length > 1
    ) || ',';

    // Parser l'en-tête
    const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
    const requiredColumns = ['title', 'category'];
    const optionalColumns = ['author', 'artist', 'year', 'condition', 'description', 'estimated_value'];
    
    const errors = [];
    const suggestions = [];
    
    // Vérifier colonnes requises
    const missingRequired = requiredColumns.filter(col => 
      !headers.some(header => header.toLowerCase().includes(col.toLowerCase()))
    );
    
    if (missingRequired.length > 0) {
      errors.push(`Colonnes manquantes: ${missingRequired.join(', ')}`);
      suggestions.push('Ajoutez au minimum les colonnes: title, category');
    }

    // Parser les données
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = this.parseCSVLine(lines[i], separator);
        const row = {};
        
        headers.forEach((header, index) => {
          const cleanHeader = header.toLowerCase().replace(/[^a-z]/g, '_');
          row[cleanHeader] = values[index] || '';
        });
        
        // Validation des données
        if (!row.title || !row.category) {
          errors.push(`Ligne ${i + 1}: title et category sont requis`);
        }
        
        data.push(row);
      }
    }

    return { data, errors, suggestions };
  }

  // Parser une ligne CSV en respectant les guillemets
  parseCSVLine(line, separator) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  // Traitement des données CSV
  async processCSVData(data, hasImages = false) {
    const results = { processed: 0, errors: 0, items: [] };
    
    for (const row of data) {
      try {
        // Envoyer à l'API pour sauvegarde
        const response = await axios.post('/api/import-item', {
          ...row,
          has_image: hasImages && !!row.image_url,
          image_data: row.image_url || null
        });
        
        if (response.data.success) {
          results.processed++;
          results.items.push(row);
        } else {
          results.errors++;
        }
      } catch (error) {
        results.errors++;
        console.error('Erreur traitement ligne:', error);
      }
    }
    
    return results;
  }

  // Charger items existants pour détection doublons
  async loadExistingItems() {
    try {
      const response = await axios.get('/api/items?per_page=1000');
      return response.data.success ? response.data.items : [];
    } catch (error) {
      console.error('Erreur chargement items existants:', error);
      return [];
    }
  }

  // Détection de doublons avec distance Levenshtein
  detectDuplicates(newData, existingItems) {
    const newItems = [];
    const duplicates = [];
    const updates = [];
    const threshold = 0.8; // Seuil de similarité
    
    for (const newItem of newData) {
      let bestMatch = null;
      let maxSimilarity = 0;
      
      for (const existingItem of existingItems) {
        const similarity = this.calculateSimilarity(
          newItem.title || '', 
          existingItem.title || ''
        );
        
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          bestMatch = existingItem;
        }
      }
      
      if (maxSimilarity > threshold) {
        duplicates.push({
          newItem,
          existingItem: bestMatch,
          similarity: maxSimilarity
        });
      } else {
        newItems.push(newItem);
      }
    }
    
    return { newItems, duplicates, updates };
  }

  // Calcul de similarité (Distance Levenshtein normalisée)
  calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 1.0;
    
    const distance = this.levenshteinDistance(s1, s2);
    return 1.0 - (distance / maxLength);
  }

  // Algorithme de distance Levenshtein
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
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Obtenir les templates CSV prédéfinis
  getCSVTemplates() {
    return [
      {
        id: 'books',
        name: 'Livres et Publications',
        description: 'Romans, essais, magazines, BD',
        icon: 'fas fa-book',
        color: '#10B981',
        columns: ['title', 'author', 'publisher', 'year', 'isbn', 'category', 'condition', 'language', 'pages', 'estimated_value', 'notes']
      },
      {
        id: 'music',
        name: 'Musique et Disques', 
        description: 'Vinyles, CD, cassettes',
        icon: 'fas fa-music',
        color: '#8B5CF6',
        columns: ['title', 'artist', 'album', 'year', 'label', 'category', 'format', 'condition', 'limited_edition', 'estimated_value', 'notes']
      },
      {
        id: 'cards',
        name: 'Cartes de Collection',
        description: 'Sports, Pokémon, Magic, etc.',
        icon: 'fas fa-id-card',
        color: '#F59E0B',
        columns: ['title', 'set_name', 'year', 'rarity', 'card_number', 'category', 'condition', 'graded', 'grade_company', 'estimated_value', 'notes']
      },
      {
        id: 'art',
        name: 'Art et Objets d\'Art',
        description: 'Peintures, sculptures, artisanat',
        icon: 'fas fa-palette',
        color: '#EF4444',
        columns: ['title', 'artist', 'medium', 'dimensions', 'year', 'category', 'condition', 'provenance', 'authentication', 'estimated_value', 'notes']
      },
      {
        id: 'collectibles',
        name: 'Objets de Collection',
        description: 'Jouets, figurines, antiquités',
        icon: 'fas fa-gem',
        color: '#3B82F6',
        columns: ['title', 'manufacturer', 'series', 'year', 'material', 'category', 'condition', 'original_packaging', 'limited_edition', 'estimated_value', 'notes']
      }
    ];
  }

  // Télécharger template CSV
  downloadTemplate(templateId) {
    const templates = this.getCSVTemplates();
    const template = templates.find(t => t.id === templateId);
    
    let csvContent;
    if (templateId === 'custom') {
      // Template personnalisé
      csvContent = 'title,category,author_or_artist,year,condition,description,estimated_value,notes\n';
      csvContent += '"Exemple Item","books","Auteur Exemple",2023,"Excellent","Description exemple",50.00,"Notes exemple"\n';
    } else if (template) {
      csvContent = template.columns.join(',') + '\n';
      // Ligne d'exemple
      const examples = {
        'books': ['"Les Anciens Canadiens"', '"Philippe Aubert de Gaspé"', '"Beauchemin"', '1863', '"978-1234567890"', '"literature"', '"Good"', '"French"', '300', '150.00', '"Édition originale"'],
        'music': ['"Abbey Road"', '"The Beatles"', '"Abbey Road"', '1969', '"Apple Records"', '"rock"', '"Vinyl"', '"Near Mint"', '"No"', '500.00', '"Pressing original"'],
        'cards': ['"Wayne Gretzky Rookie"', '"O-Pee-Chee Hockey"', '1979', '"Rookie"', '"#18"', '"sports"', '"PSA 9"', '"Yes"', '"PSA"', '25000.00', '"Hall of Fame card"'],
        'art': ['"Paysage d\'automne"', '"Jean-Paul Riopelle"', '"Oil on canvas"', '"24x36 inches"', '1965', '"painting"', '"Excellent"', '"Galerie X"', '"Certificate included"', '150000.00', '"Museum quality"'],
        'collectibles': ['"Optimus Prime G1"', '"Hasbro"', '"Transformers"', '1984', '"Die-cast metal"', '"toys"', '"Complete"', '"Yes"', '"No"', '350.00', '"Original box included"']
      };
      
      if (examples[templateId]) {
        csvContent += examples[templateId].join(',') + '\n';
      }
    }
    
    // Créer et télécharger le fichier
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `template_${templateId}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    // Fermer la modal
    document.querySelector('.fixed.inset-0').remove();
    
    this.showNotification(`✅ Template "${template?.name || 'Personnalisé'}" téléchargé`, 'success');
  }

  // Générer contenu CSV pour export
  generateCSVContent(items) {
    const headers = ['ID', 'Title', 'Category', 'Author/Artist', 'Year', 'Condition', 'Description', 'Estimated Value', 'Created', 'Last Updated'];
    let csvContent = headers.join(',') + '\n';
    
    for (const item of items) {
      const row = [
        item.id || '',
        `"${(item.title || '').replace(/"/g, '""')}"`,
        `"${(item.category || '').replace(/"/g, '""')}"`,
        `"${(item.author || item.artist || '').replace(/"/g, '""')}"`,
        item.year || '',
        `"${(item.condition || '').replace(/"/g, '""')}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        item.estimated_value || '0.00',
        item.created_at || '',
        item.updated_at || ''
      ];
      csvContent += row.join(',') + '\n';
    }
    
    return csvContent;
  }

  // Afficher résultats de validation
  showValidationResults(errors, suggestions, data, importType = 'CSV') {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-96 overflow-y-auto">
        <div class="p-6">
          <h3 class="text-xl font-bold text-red-600 mb-4">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            Erreurs de Validation - ${importType}
          </h3>
          
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h4 class="font-semibold text-red-800 mb-2">Erreurs détectées:</h4>
            <ul class="text-sm text-red-700 space-y-1">
              ${errors.map(error => `<li>• ${error}</li>`).join('')}
            </ul>
          </div>
          
          ${suggestions.length > 0 ? `
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 class="font-semibold text-yellow-800 mb-2">Suggestions:</h4>
            <ul class="text-sm text-yellow-700 space-y-1">
              ${suggestions.map(suggestion => `<li>• ${suggestion}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          
          <div class="flex space-x-2">
            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                    class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
              Fermer
            </button>
            <button onclick="window.app.downloadTemplate('custom')" 
                    class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Télécharger Template
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // Afficher résultats d'import
  showImportResults(results, type) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    
    const successRate = results.processed / (results.processed + results.errors) * 100;
    
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div class="p-6">
          <h3 class="text-xl font-bold text-green-600 mb-4">
            <i class="fas fa-check-circle mr-2"></i>
            Import ${type} Terminé
          </h3>
          
          <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Traités:</strong> ${results.processed}</div>
              <div><strong>Erreurs:</strong> ${results.errors}</div>
              <div><strong>Succès:</strong> ${Math.round(successRate)}%</div>
              <div><strong>Total:</strong> ${results.processed + results.errors}</div>
            </div>
          </div>
          
          <button onclick="this.parentElement.parentElement.parentElement.remove(); window.app.loadStats(); window.app.loadItems();" 
                  class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Fermer et Actualiser
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // Afficher résultats détection de doublons
  showDuplicateDetectionResults(newItems, duplicates, updates) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
        <div class="p-6">
          <h3 class="text-xl font-bold text-orange-600 mb-4">
            <i class="fas fa-search mr-2"></i>
            Détection de Doublons - Résultats
          </h3>
          
          <div class="grid grid-cols-3 gap-4 mb-4">
            <div class="bg-green-50 p-3 rounded-lg text-center">
              <div class="text-2xl font-bold text-green-600">${newItems.length}</div>
              <div class="text-sm text-green-700">Nouveaux items</div>
            </div>
            <div class="bg-orange-50 p-3 rounded-lg text-center">
              <div class="text-2xl font-bold text-orange-600">${duplicates.length}</div>
              <div class="text-sm text-orange-700">Doublons détectés</div>
            </div>
            <div class="bg-blue-50 p-3 rounded-lg text-center">
              <div class="text-2xl font-bold text-blue-600">${updates.length}</div>
              <div class="text-sm text-blue-700">Mises à jour</div>
            </div>
          </div>
          
          ${duplicates.length > 0 ? `
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 class="font-semibold text-yellow-800 mb-2">Doublons détectés:</h4>
            <div class="space-y-2 max-h-32 overflow-y-auto">
              ${duplicates.slice(0, 5).map(dup => `
                <div class="text-sm">
                  <strong>Nouveau:</strong> "${dup.newItem.title}" 
                  <strong>Similaire à:</strong> "${dup.existingItem.title}" 
                  (${Math.round(dup.similarity * 100)}% similarité)
                </div>
              `).join('')}
              ${duplicates.length > 5 ? `<div class="text-xs text-gray-500">... et ${duplicates.length - 5} autres</div>` : ''}
            </div>
          </div>
          ` : ''}
          
          <div class="flex space-x-2">
            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                    class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
              Annuler
            </button>
            ${newItems.length > 0 ? `
            <button onclick="window.app.processIncrementalImport(${JSON.stringify(newItems).replace(/"/g, '&quot;')}, 'new')" 
                    class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Importer Nouveaux (${newItems.length})
            </button>
            ` : ''}
            ${duplicates.length > 0 ? `
            <button onclick="window.app.processIncrementalImport(${JSON.stringify(duplicates).replace(/"/g, '&quot;')}, 'duplicates')" 
                    class="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
              Forcer Doublons (${duplicates.length})
            </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // Traitement final import incrémental
  async processIncrementalImport(items, mode) {
    try {
      let itemsToProcess = items;
      
      if (mode === 'duplicates') {
        itemsToProcess = items.map(dup => dup.newItem);
      }
      
      const results = await this.processCSVData(itemsToProcess, false);
      
      // Fermer modal précédente
      document.querySelector('.fixed.inset-0').remove();
      
      this.showImportResults(results, 'Incrémental');
      
    } catch (error) {
      console.error('Erreur traitement incrémental final:', error);
      this.showNotification('❌ Erreur lors du traitement final', 'error');
    }
  }
}

// Initialisation
window.addEventListener('DOMContentLoaded', () => {
  window.app = new CollectionEvaluator();
});