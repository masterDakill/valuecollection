// ==================================================================================
// CODE JAVASCRIPT POUR LA GALERIE DE PHOTOS
// À intégrer dans la classe CollectionEvaluator de src/index.tsx
// ==================================================================================

// ============ À AJOUTER DANS init() après this.loadItems() ============
    this.loadPhotos();
    this.setupPhotoTabs();

// ============ À AJOUTER À LA FIN DE setupEventListeners() ============
    // Onglets Photos/Collection
    const tabCollection = document.getElementById('tabCollection');
    const tabPhotos = document.getElementById('tabPhotos');
    if (tabCollection) {
      tabCollection.addEventListener('click', () => this.switchTab('collection'));
    }
    if (tabPhotos) {
      tabPhotos.addEventListener('click', () => this.switchTab('photos'));
    }

    // Modal photo
    const closePhotoModal = document.getElementById('closePhotoModal');
    if (closePhotoModal) {
      closePhotoModal.addEventListener('click', () => this.closePhotoModal());
    }

    const deletePhotoBtn = document.getElementById('deletePhotoBtn');
    if (deletePhotoBtn) {
      deletePhotoBtn.addEventListener('click', () => this.deleteCurrentPhoto());
    }

    const exportPhotoBtn = document.getElementById('exportPhotoBtn');
    if (exportPhotoBtn) {
      exportPhotoBtn.addEventListener('click', () => this.exportPhotoBooks());
    }

    // Fermer modal en cliquant à l'extérieur
    const photoModal = document.getElementById('photoModal');
    if (photoModal) {
      photoModal.addEventListener('click', (e) => {
        if (e.target === photoModal) {
          this.closePhotoModal();
        }
      });
    }

// ============ NOUVELLES MÉTHODES À AJOUTER À LA FIN DE LA CLASSE ============

  setupPhotoTabs() {
    // Par défaut, afficher Collection
    this.switchTab('collection');
  }

  switchTab(tab) {
    const tabCollection = document.getElementById('tabCollection');
    const tabPhotos = document.getElementById('tabPhotos');
    const collectionSection = document.querySelector('.bg-white.rounded-lg.shadow');
    const photosSection = document.getElementById('photosSection');

    if (tab === 'collection') {
      // Activer onglet Collection
      tabCollection?.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
      tabCollection?.classList.remove('text-gray-500');
      tabPhotos?.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
      tabPhotos?.classList.add('text-gray-500');

      // Afficher Collection, cacher Photos
      collectionSection?.classList.remove('hidden');
      photosSection?.classList.add('hidden');
    } else if (tab === 'photos') {
      // Activer onglet Photos
      tabPhotos?.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
      tabPhotos?.classList.remove('text-gray-500');
      tabCollection?.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
      tabCollection?.classList.add('text-gray-500');

      // Afficher Photos, cacher Collection
      photosSection?.classList.remove('hidden');
      collectionSection?.classList.add('hidden');

      // Recharger les photos
      this.loadPhotos();
    }
  }

  async loadPhotos() {
    try {
      const response = await fetch('/api/photos?limit=50');
      const data = await response.json();

      if (data.success) {
        this.displayPhotos(data.photos);
        document.getElementById('photosCount').textContent = data.photos.length;
      }
    } catch (error) {
      console.error('Erreur chargement photos:', error);
      this.showNotification('❌ Erreur chargement photos', 'error');
    }
  }

  displayPhotos(photos) {
    const grid = document.getElementById('photosGrid');
    const empty = document.getElementById('photosEmpty');

    if (!photos || photos.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');

    grid.innerHTML = photos.map(photo => `
      <div class="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
           onclick="window.evaluator.showPhotoDetail(${photo.id})">
        <div class="aspect-video bg-gray-200 relative">
          ${photo.image_url
            ? `<img src="${photo.image_url}" alt="Photo" class="w-full h-full object-cover">`
            : `<div class="w-full h-full flex items-center justify-center">
                 <i class="fas fa-image text-gray-400 text-4xl"></i>
               </div>`
          }
          <div class="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
            ${photo.total_items_detected || 0} livres
          </div>
        </div>
        <div class="p-4">
          <div class="text-sm text-gray-600">
            <p class="mb-1">
              <i class="fas fa-calendar mr-1"></i>
              ${new Date(photo.uploaded_at).toLocaleDateString('fr-FR')}
            </p>
            ${photo.total_value
              ? `<p class="text-green-600 font-semibold">
                   <i class="fas fa-dollar-sign mr-1"></i>
                   ${photo.total_value.toFixed(2)} CAD
                 </p>`
              : '<p class="text-gray-400">Valeur non estimée</p>'
            }
          </div>
        </div>
      </div>
    `).join('');
  }

  async showPhotoDetail(photoId) {
    try {
      const response = await fetch(`/api/photos/${photoId}`);
      const data = await response.json();

      if (data.success && data.photo) {
        this.currentPhotoId = photoId;
        this.displayPhotoDetail(data.photo, data.items);
      }
    } catch (error) {
      console.error('Erreur chargement détail photo:', error);
      this.showNotification('❌ Erreur chargement détail', 'error');
    }
  }

  displayPhotoDetail(photo, items) {
    // Afficher l'image
    const img = document.getElementById('modalPhotoImg');
    if (img) {
      img.src = photo.image_url || '';
    }

    // Afficher les métadonnées
    document.getElementById('modalPhotoDate').textContent =
      new Date(photo.uploaded_at).toLocaleString('fr-FR');
    document.getElementById('modalPhotoCount').textContent = items.length;

    const totalValue = items.reduce((sum, item) => sum + (parseFloat(item.estimated_value) || 0), 0);
    document.getElementById('modalPhotoValue').textContent =
      totalValue > 0 ? `${totalValue.toFixed(2)} CAD` : 'Non estimée';

    // Afficher la liste des livres
    const booksList = document.getElementById('modalBooksList');
    booksList.innerHTML = items.map((item, idx) => `
      <div class="p-3 bg-gray-50 rounded-lg">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <p class="font-semibold text-gray-800">${idx + 1}. ${item.title || 'Sans titre'}</p>
            ${item.artist_author
              ? `<p class="text-sm text-gray-600"><i class="fas fa-user mr-1"></i>${item.artist_author}</p>`
              : ''
            }
            ${item.publisher_label
              ? `<p class="text-xs text-gray-500">${item.publisher_label}</p>`
              : ''
            }
            ${item.year
              ? `<p class="text-xs text-gray-500">${item.year}</p>`
              : ''
            }
            ${item.isbn_13
              ? `<p class="text-xs text-gray-400 font-mono">${item.isbn_13}</p>`
              : ''
            }
          </div>
          <div class="text-right ml-4">
            ${item.estimated_value
              ? `<p class="text-green-600 font-semibold">${parseFloat(item.estimated_value).toFixed(2)} CAD</p>`
              : '<p class="text-gray-400 text-sm">N/A</p>'
            }
            ${item.detection_confidence
              ? `<p class="text-xs text-gray-500">${(item.detection_confidence * 100).toFixed(0)}% confiance</p>`
              : ''
            }
          </div>
        </div>
      </div>
    `).join('');

    // Afficher le modal
    document.getElementById('photoModal').classList.remove('hidden');
  }

  closePhotoModal() {
    document.getElementById('photoModal').classList.add('hidden');
    this.currentPhotoId = null;
  }

  async deleteCurrentPhoto() {
    if (!this.currentPhotoId) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo et tous les livres associés ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/photos/${this.currentPhotoId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        this.showNotification('✅ Photo supprimée', 'success');
        this.closePhotoModal();
        this.loadPhotos();
        this.loadItems(); // Recharger aussi la collection
      } else {
        this.showNotification('❌ Erreur suppression', 'error');
      }
    } catch (error) {
      console.error('Erreur suppression photo:', error);
      this.showNotification('❌ Erreur suppression', 'error');
    }
  }

  async exportPhotoBooks() {
    if (!this.currentPhotoId) return;

    try {
      const response = await fetch(`/api/photos/${this.currentPhotoId}`);
      const data = await response.json();

      if (data.success && data.items) {
        // Créer CSV
        const headers = ['Titre', 'Auteur', 'Éditeur', 'Année', 'ISBN-13', 'Valeur', 'Confiance'];
        const rows = data.items.map(item => [
          item.title || '',
          item.artist_author || '',
          item.publisher_label || '',
          item.year || '',
          item.isbn_13 || '',
          item.estimated_value || '',
          item.detection_confidence ? (item.detection_confidence * 100).toFixed(0) + '%' : ''
        ]);

        const csv = [headers, ...rows]
          .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\\n');

        // Download
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `photo_${this.currentPhotoId}_livres.csv`;
        link.click();

        this.showNotification('✅ CSV exporté', 'success');
      }
    } catch (error) {
      console.error('Erreur export CSV:', error);
      this.showNotification('❌ Erreur export', 'error');
    }
  }

// ============ MODIFIER evaluateMedia() POUR UTILISER LE NOUVEAU ENDPOINT ============
  async evaluateMedia() {
    if (!this.selectedMedia) {
      this.showNotification('❌ Veuillez sélectionner une photo ou vidéo', 'error');
      return;
    }

    this.showNotification('🔍 Analyse en cours avec détection multi-livres...', 'info');

    try {
      // Convertir image en base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
      });
      reader.readAsDataURL(this.selectedMedia);
      const imageBase64 = await base64Promise;

      // Appeler le nouveau endpoint /api/photos/analyze
      const response = await fetch('/api/photos/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          options: {
            maxItems: 30,
            useCache: true
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        this.showNotification(`✅ ${result.total_detected} livres détectés !`, 'success');

        // Basculer vers l'onglet Photos et afficher le détail
        this.switchTab('photos');
        setTimeout(() => {
          this.showPhotoDetail(result.photo_id);
        }, 500);
      } else {
        this.showNotification('❌ Erreur analyse: ' + result.error?.message, 'error');
      }
    } catch (error) {
      console.error('Erreur évaluation média:', error);
      this.showNotification('❌ Erreur lors de l\\'analyse', 'error');
    }
  }

// ==================================================================================
// FIN DU CODE À INTÉGRER
// ==================================================================================
