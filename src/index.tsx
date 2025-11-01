import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { MultiExpertAISystem } from './ai-experts'
import { photoBooksRouter } from './routes/photo-books';
import { photosRouter } from './routes/photos';
import { itemsRouter } from './routes/items';
import { monitoringRouter } from './routes/monitoring';
import exportRoutes from './routes/export';
import booksHtml from '../public/books.html?raw';
// Types pour les bindings Cloudflare
type Bindings = {
  DB: D1Database;
  EBAY_CLIENT_ID?: string;
  EBAY_CLIENT_SECRET?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_BOOKS_API_KEY?: string;
  WORTHPOINT_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

const app = new Hono<{ Bindings: Bindings }>()

// Middleware CORS
app.use('/api/*', cors())



// Route principale avec TOUTES les fonctionnalités restaurées
app.get('/', async (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Évaluateur de Collection Pro - Mathieu Chamberland</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js" onerror="console.error('Failed to load heic2any library')"></script>
    <style>
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
    </style>
</head>
<body class="bg-gray-50">
    
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 py-4">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center space-x-4">
                    <i class="fas fa-gem text-blue-600 text-3xl"></i>
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">Évaluateur de Collection Pro</h1>
                        <p class="text-gray-600">Analyse IA et évaluations automatisées</p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-right">
                        <p class="text-sm text-gray-600">Mathieu Chamberland</p>
                        <p class="text-xs text-gray-500">Investisseur Immobilier</p>
                    </div>
                </div>
            </div>

            <!-- Navigation Tabs -->
            <nav class="flex space-x-2 border-b border-gray-200 pb-2">
                <button id="navDatabase" class="px-4 py-2 rounded-t-lg bg-blue-600 text-white font-medium">
                    <i class="fas fa-database mr-2"></i>Base de Données
                </button>
                <button id="navPhotos" class="px-4 py-2 rounded-t-lg text-gray-600 hover:bg-gray-100 font-medium">
                    <i class="fas fa-camera mr-2"></i>Photos & Livres
                </button>
                <button id="navRecommendations" class="px-4 py-2 rounded-t-lg text-gray-600 hover:bg-gray-100 font-medium">
                    <i class="fas fa-star mr-2"></i>Recommandations
                </button>
                <button id="navAnnonce" class="px-4 py-2 rounded-t-lg text-gray-600 hover:bg-gray-100 font-medium">
                    <i class="fas fa-bullhorn mr-2"></i>Créer Annonce
                </button>
                <button id="navComparables" class="px-4 py-2 rounded-t-lg text-gray-600 hover:bg-gray-100 font-medium">
                    <i class="fas fa-balance-scale mr-2"></i>Comparables
                </button>
            </nav>
        </div>
    </header>

    <!-- ========== PAGE: BASE DE DONNÉES ========== -->
    <div id="pageDatabase" class="page-content">
    <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            
            <!-- Statistiques principales -->
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 bg-blue-100 rounded-lg">
                        <i class="fas fa-images text-blue-600 text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm text-gray-600">Total Items</p>
                        <p id="totalItems" class="text-2xl font-bold text-gray-900">0</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 bg-green-100 rounded-lg">
                        <i class="fas fa-check-circle text-green-600 text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm text-gray-600">Analysés</p>
                        <p id="analyzedItems" class="text-2xl font-bold text-gray-900">0</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 bg-yellow-100 rounded-lg">
                        <i class="fas fa-dollar-sign text-yellow-600 text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm text-gray-600">Valeur Totale</p>
                        <p id="totalValue" class="text-2xl font-bold text-gray-900">0 $</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 bg-purple-100 rounded-lg">
                        <i class="fas fa-trophy text-purple-600 text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm text-gray-600">≥ Seuil</p>
                        <div class="flex items-center space-x-2">
                            <input type="number" id="thresholdValue" value="500" min="0" 
                                   class="w-16 text-sm border rounded px-1">
                            <span class="text-sm">$</span>
                        </div>
                        <p id="aboveThreshold" class="text-2xl font-bold text-gray-900">0</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Évaluation Intelligente -->
        <div class="bg-white rounded-lg shadow mb-8">
            <div class="p-6 border-b">
                <h2 class="text-xl font-semibold flex items-center">
                    <i class="fas fa-brain mr-3 text-blue-600"></i>
                    Évaluation Intelligente IA
                </h2>
                <p class="text-sm text-gray-600 mt-1">
                    Analysez vos objets de collection avec l'intelligence artificielle
                </p>
            </div>
            
            <div class="p-6 space-y-6">
                
                <!-- Upload de média -->
                <div class="p-4 bg-purple-50 rounded-lg">
                    <h4 class="font-semibold text-purple-800 mb-3">
                        <i class="fas fa-camera mr-2"></i>
                        Évaluation par Photo/Vidéo
                    </h4>
                    <div class="flex items-center space-x-3">
                        <button 
                            id="selectMediaBtn"
                            class="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            <i class="fas fa-upload mr-2"></i>
                            Choisir Photo/Vidéo
                        </button>
                        <input
                            type="file"
                            id="mediaInput"
                            accept="image/*,.heic,.heif,video/*"
                            class="hidden"
                        >
                        <span class="text-sm text-purple-600">
                            JPG, PNG, WebP, HEIC, MP4, MOV • Max 10MB
                        </span>
                    </div>
                    <div id="mediaPreview" class="mt-3 hidden">
                        <div class="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                            <div id="mediaThumb" class="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                <i class="fas fa-image text-gray-400"></i>
                            </div>
                            <div class="flex-1">
                                <p id="mediaName" class="text-sm font-medium text-gray-800"></p>
                                <p id="mediaSize" class="text-xs text-gray-500"></p>
                            </div>
                            <button id="evaluateMediaBtn" class="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                                <i class="fas fa-magic mr-2"></i>
                                Analyser
                            </button>
                            <button id="clearMediaBtn" class="p-2 text-red-500 hover:text-red-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Évaluation par texte -->
                <div class="p-4 bg-blue-50 rounded-lg">
                    <h4 class="font-semibold text-blue-800 mb-3">
                        <i class="fas fa-keyboard mr-2"></i>
                        Évaluation par Texte
                    </h4>
                    <div class="flex space-x-2">
                        <input 
                            type="text" 
                            id="quickEvalText" 
                            placeholder="Ex: Abbey Road The Beatles, Les Anciens Canadiens Philippe Aubert de Gaspé..."
                            class="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                        <button id="quickEvalBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <i class="fas fa-search-dollar mr-2"></i>
                            Évaluer
                        </button>
                        <button id="testSmartEval" class="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            <i class="fas fa-magic mr-2"></i>
                            Test Démo
                        </button>
                    </div>
                    <p class="text-xs text-blue-600 mt-2">
                        Saisissez le titre et l'auteur/artiste pour une évaluation intelligente instantanée
                    </p>
                    <div class="mt-3 text-xs text-gray-500">
                        <strong>Exemples :</strong> "Abbey Road The Beatles" • "Wayne Gretzky rookie card 1979" • "Les Anciens Canadiens Philippe Aubert de Gaspé"
                    </div>
                </div>
                
            </div>
        </div>

        <!-- Liste des items continue... -->
    </div>
    </div>
    <!-- FIN PAGE: BASE DE DONNÉES -->

    <!-- ========== PAGE: PHOTOS & LIVRES ========== -->
    <div id="pagePhotos" class="page-content hidden">
    <div class="max-w-7xl mx-auto px-4 py-6">
        <!-- Section Photos -->
        <div class="bg-white rounded-lg shadow mb-8">
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-semibold">
                        <i class="fas fa-images mr-2 text-purple-600"></i>
                        Galerie de Photos Analysées
                    </h2>
                    <div class="text-sm text-gray-600">
                        <span id="photosCount">0</span> photos
                    </div>
                </div>

                <!-- Grille de photos -->
                <div id="photosGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <!-- Rempli dynamiquement par JS -->
                </div>

                <!-- Message vide -->
                <div id="photosEmpty" class="text-center py-12 text-gray-500">
                    <i class="fas fa-camera text-6xl mb-4 text-gray-300"></i>
                    <p class="text-lg mb-2">Aucune photo analysée</p>
                    <p class="text-sm">Uploadez une photo de vos livres pour commencer</p>
                </div>
            </div>
        </div>

        <!-- Section Collection Complète -->
        <div class="bg-white rounded-lg shadow mb-8">
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-semibold">
                        <i class="fas fa-book mr-2 text-blue-600"></i>
                        Collection Complète de Livres
                    </h2>
                    <div class="flex items-center space-x-3">
                        <button id="refreshBooksBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                            <i class="fas fa-sync-alt mr-2"></i>Actualiser
                        </button>
                        <button id="enrichAllBooksBtn" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
                            <i class="fas fa-magic mr-2"></i>Enrichir Tout
                        </button>
                    </div>
                </div>

                <!-- Stats de la collection -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-xs font-medium text-blue-600 uppercase">Total Livres</p>
                                <p id="bookStatTotal" class="text-2xl font-bold text-blue-900">0</p>
                            </div>
                            <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                                <i class="fas fa-books text-white text-xl"></i>
                            </div>
                        </div>
                    </div>

                    <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-xs font-medium text-green-600 uppercase">Enrichis</p>
                                <p id="bookStatEnriched" class="text-2xl font-bold text-green-900">0</p>
                            </div>
                            <div class="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                                <i class="fas fa-check-circle text-white text-xl"></i>
                            </div>
                        </div>
                    </div>

                    <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-xs font-medium text-yellow-600 uppercase">À Enrichir</p>
                                <p id="bookStatPending" class="text-2xl font-bold text-yellow-900">0</p>
                            </div>
                            <div class="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
                                <i class="fas fa-hourglass-half text-white text-xl"></i>
                            </div>
                        </div>
                    </div>

                    <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-xs font-medium text-purple-600 uppercase">Valeur Totale</p>
                                <p id="bookStatValue" class="text-2xl font-bold text-purple-900">0 CAD$</p>
                            </div>
                            <div class="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                                <i class="fas fa-dollar-sign text-white text-xl"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Liste des livres -->
                <div id="booksCollectionList" class="space-y-4">
                    <!-- Rempli dynamiquement par JS -->
                </div>

                <!-- Message vide -->
                <div id="booksCollectionEmpty" class="hidden text-center py-12 text-gray-500">
                    <i class="fas fa-book-open text-6xl mb-4 text-gray-300"></i>
                    <p class="text-lg mb-2">Aucun livre dans votre collection</p>
                    <p class="text-sm">Analysez une photo pour détecter des livres</p>
                </div>
            </div>
        </div>

        <!-- Modal Détail Photo -->
        <div id="photoModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
            <div class="min-h-screen px-4 py-8">
                <div class="max-w-6xl mx-auto bg-white rounded-lg shadow-xl">
                    <!-- Header -->
                    <div class="flex items-center justify-between p-6 border-b">
                        <h3 class="text-xl font-semibold">
                            <i class="fas fa-image mr-2 text-purple-600"></i>
                            Détails de la Photo
                        </h3>
                        <button id="closePhotoModal" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>

                    <!-- Contenu -->
                    <div class="p-6">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Image -->
                            <div>
                                <img id="modalPhotoImg" src="" alt="Photo" class="w-full rounded-lg shadow-lg">
                                <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                                    <div class="text-sm text-gray-600">
                                        <p><strong>Date:</strong> <span id="modalPhotoDate"></span></p>
                                        <p><strong>Livres détectés:</strong> <span id="modalPhotoCount"></span></p>
                                        <p><strong>Valeur totale:</strong> <span id="modalPhotoValue"></span></p>
                                    </div>
                                </div>
                            </div>

                            <!-- Liste des livres -->
                            <div>
                                <h4 class="text-lg font-semibold mb-4">
                                    <i class="fas fa-book mr-2"></i>
                                    Livres Détectés
                                </h4>
                                <div id="modalBooksList" class="space-y-3 max-h-96 overflow-y-auto">
                                    <!-- Rempli dynamiquement -->
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="flex items-center justify-end space-x-3 p-6 border-t">
                        <button id="deletePhotoBtn" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                            <i class="fas fa-trash mr-2"></i>
                            Supprimer Photo
                        </button>
                        <button id="exportPhotoBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <i class="fas fa-download mr-2"></i>
                            Exporter CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </div>
    <!-- FIN PAGE: PHOTOS & LIVRES -->

    <!-- ========== PAGE: RECOMMANDATIONS ========== -->
    <div id="pageRecommendations" class="page-content hidden">
    <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-2xl font-bold mb-6">
                <i class="fas fa-star text-yellow-500 mr-3"></i>
                Recommandations Intelligentes
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Recommandations basées sur votre collection -->
                <div class="border rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-4 flex items-center">
                        <i class="fas fa-lightbulb text-blue-500 mr-2"></i>
                        Suggestions d'Achat
                    </h3>
                    <div id="suggestionsAchat" class="space-y-3">
                        <p class="text-gray-500 text-sm">Analysez votre collection pour obtenir des recommandations personnalisées</p>
                    </div>
                </div>

                <!-- Livres à valoriser -->
                <div class="border rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-4 flex items-center">
                        <i class="fas fa-chart-line text-green-500 mr-2"></i>
                        Opportunités de Vente
                    </h3>
                    <div id="opportunitesVente" class="space-y-3">
                        <p class="text-gray-500 text-sm">Livres avec forte demande du marché</p>
                    </div>
                </div>

                <!-- Livres manquants dans les séries -->
                <div class="border rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-4 flex items-center">
                        <i class="fas fa-puzzle-piece text-purple-500 mr-2"></i>
                        Compléter vos Séries
                    </h3>
                    <div id="seriesIncompletes" class="space-y-3">
                        <p class="text-gray-500 text-sm">Détection automatique des tomes manquants</p>
                    </div>
                </div>

                <!-- Tendances du marché -->
                <div class="border rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-4 flex items-center">
                        <i class="fas fa-fire text-red-500 mr-2"></i>
                        Tendances Actuelles
                    </h3>
                    <div id="tendances" class="space-y-3">
                        <p class="text-gray-500 text-sm">Ce qui se vend bien en ce moment</p>
                    </div>
                </div>
            </div>

            <div class="mt-6 text-center">
                <button id="generateRecommendations" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    <i class="fas fa-magic mr-2"></i>
                    Générer Recommandations IA
                </button>
            </div>
        </div>
    </div>
    </div>
    <!-- FIN PAGE: RECOMMANDATIONS -->

    <!-- ========== PAGE: CRÉER ANNONCE ========== -->
    <div id="pageAnnonce" class="page-content hidden">
    <div class="max-w-4xl mx-auto px-4 py-6">
        <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-2xl font-bold mb-6">
                <i class="fas fa-bullhorn text-blue-600 mr-3"></i>
                Créer une Annonce de Vente
            </h2>

            <form id="annonceForm" class="space-y-6">
                <!-- Sélection livre -->
                <div>
                    <label class="block text-sm font-medium mb-2">Sélectionner un livre</label>
                    <select id="annonceSelectLivre" class="w-full px-4 py-2 border rounded-lg">
                        <option value="">Choisir dans votre collection...</option>
                    </select>
                </div>

                <!-- Titre -->
                <div>
                    <label class="block text-sm font-medium mb-2">Titre de l\\'annonce</label>
                    <input type="text" id="annonceTitre" class="w-full px-4 py-2 border rounded-lg" placeholder="Ex: Rare - Harry Potter Première Edition">
                </div>

                <!-- Description -->
                <div>
                    <label class="block text-sm font-medium mb-2">Description</label>
                    <textarea id="annonceDescription" rows="6" class="w-full px-4 py-2 border rounded-lg" placeholder="Décrivez l\\'état, l\\'historique, particularités..."></textarea>
                    <button type="button" id="generateDescription" class="mt-2 px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200">
                        <i class="fas fa-magic mr-2"></i>Générer avec IA
                    </button>
                </div>

                <!-- Prix -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Prix demandé (CAD)</label>
                        <input type="number" id="annoncePrix" class="w-full px-4 py-2 border rounded-lg" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Prix suggéré</label>
                        <div class="px-4 py-2 bg-gray-50 border rounded-lg text-gray-600">
                            <span id="prixSuggere">--</span>
                        </div>
                    </div>
                </div>

                <!-- Plateformes -->
                <div>
                    <label class="block text-sm font-medium mb-2">Publier sur</label>
                    <div class="flex flex-wrap gap-3">
                        <label class="flex items-center">
                            <input type="checkbox" class="mr-2" value="ebay"> eBay
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" class="mr-2" value="facebook"> Facebook Marketplace
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" class="mr-2" value="kijiji"> Kijiji
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" class="mr-2" value="abebooks"> AbeBooks
                        </label>
                    </div>
                </div>

                <!-- Preview -->
                <div class="border-t pt-6">
                    <h3 class="font-semibold mb-3">Aperçu de l\\'annonce</h3>
                    <div id="annoncePreview" class="p-4 bg-gray-50 rounded-lg border min-h-32">
                        <p class="text-gray-400 text-sm">L\\'aperçu apparaîtra ici...</p>
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex justify-end space-x-3">
                    <button type="button" class="px-6 py-2 border rounded-lg hover:bg-gray-50">Sauvegarder Brouillon</button>
                    <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <i class="fas fa-paper-plane mr-2"></i>Publier Annonce
                    </button>
                </div>
            </form>
        </div>
    </div>
    </div>
    <!-- FIN PAGE: CRÉER ANNONCE -->

    <!-- ========== PAGE: COMPARABLES ========== -->
    <div id="pageComparables" class="page-content hidden">
    <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-2xl font-bold mb-6">
                <i class="fas fa-balance-scale text-green-600 mr-3"></i>
                Ventes Comparables
            </h2>

            <!-- Recherche -->
            <div class="mb-6">
                <div class="flex space-x-3">
                    <input type="text" id="searchComparables" class="flex-1 px-4 py-2 border rounded-lg" placeholder="Rechercher un livre pour voir les ventes comparables...">
                    <button id="btnSearchComparables" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <i class="fas fa-search mr-2"></i>Rechercher
                    </button>
                </div>
            </div>

            <!-- Résultats -->
            <div id="comparablesResults" class="space-y-4">
                <div class="text-center py-12 text-gray-400">
                    <i class="fas fa-search text-6xl mb-4"></i>
                    <p>Recherchez un livre pour voir les ventes récentes similaires</p>
                </div>
            </div>

            <!-- Graphique des prix -->
            <div class="mt-8">
                <h3 class="text-lg font-semibold mb-4">Évolution des Prix</h3>
                <canvas id="priceChart" class="w-full" height="100"></canvas>
            </div>
        </div>
    </div>
    </div>
    <!-- FIN PAGE: COMPARABLES -->

        <!-- Liste des items avec Import Avancé RESTAURÉ (reste dans page Database) -->
        <div class="bg-white rounded-lg shadow">
            <div class="p-6 border-b">
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-semibold flex items-center">
                        <i class="fas fa-list mr-3 text-blue-600"></i>
                        Collection (<span id="itemCount">0</span> items)
                    </h2>
                    <div class="flex space-x-2">
                        <button id="viewGrid" class="p-2 text-gray-500 hover:text-blue-600">
                            <i class="fas fa-th"></i>
                        </button>
                        <button id="viewList" class="p-2 text-blue-600">
                            <i class="fas fa-list"></i>
                        </button>
                        
                        <!-- 🚀 DROPDOWN IMPORT AVANCÉ - COMPLÈTEMENT RESTAURÉ -->
                        <div class="relative inline-block">
                            <button id="importDropdown" class="px-3 py-1 text-green-600 border border-green-300 rounded hover:bg-green-50 flex items-center">
                                <i class="fas fa-upload mr-1"></i>
                                Import Avancé
                                <i class="fas fa-chevron-down ml-1 text-xs"></i>
                            </button>
                            <div id="importMenu" class="hidden absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                                <button id="importCSV" class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center">
                                    <i class="fas fa-file-csv mr-2 text-green-600"></i>
                                    Import CSV Simple
                                </button>
                                <button id="importZIP" class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center">
                                    <i class="fas fa-file-archive mr-2 text-purple-600"></i>
                                    Import ZIP + Images
                                </button>
                                <button id="importIncremental" class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center">
                                    <i class="fas fa-sync mr-2 text-orange-600"></i>
                                    Import Incrémental
                                </button>
                                <hr class="my-1">
                                <button id="downloadTemplate" class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center">
                                    <i class="fas fa-download mr-2 text-blue-600"></i>
                                    Télécharger Template
                                </button>
                            </div>
                        </div>
                        
                        <button id="exportData" class="px-3 py-1 text-blue-600 border border-blue-300 rounded hover:bg-blue-50">
                            <i class="fas fa-download mr-1"></i>
                            Export CSV
                        </button>
                        
                        <!-- Inputs cachés pour les différents types d'import -->
                        <input type="file" id="csvFileInput" accept=".csv" class="hidden">
                        <input type="file" id="zipFileInput" accept=".zip" class="hidden">
                        <input type="file" id="incrementalInput" accept=".csv" class="hidden">
                    </div>
                </div>
            </div>
            
            <div id="itemsList" class="virtual-scroll">
                <div id="emptyState" class="p-12 text-center text-gray-500">
                    <i class="fas fa-rocket text-6xl mb-4 text-blue-500"></i>
                    <p class="text-xl mb-2">🚀 Application Complète Restaurée !</p>
                    <p class="mb-4">Toutes les fonctionnalités d'import avancées sont disponibles</p>
                    <div class="text-sm bg-blue-50 p-4 rounded-lg">
                        <p class="font-semibold mb-2">✅ Fonctionnalités disponibles :</p>
                        <ul class="text-left space-y-1">
                            <li>• Import CSV Simple avec validation avancée</li>
                            <li>• Import ZIP + Images avec métadonnées CSV</li>
                            <li>• Import Incrémental avec détection doublons (Levenshtein)</li>
                            <li>• Templates CSV prédéfinis (5 catégories)</li>
                            <li>• Export CSV complet avec filtres</li>
                            <li>• Évaluation IA par texte et images</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 🚀 JAVASCRIPT INTÉGRÉ AVEC TOUTES LES FONCTIONNALITÉS D'IMPORT AVANCÉES -->
    <script>
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
    this.setupPhotoTabs();
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

    // Navigation entre pages
    const navDatabase = document.getElementById('navDatabase');
    const navPhotos = document.getElementById('navPhotos');
    const navRecommendations = document.getElementById('navRecommendations');
    const navAnnonce = document.getElementById('navAnnonce');
    const navComparables = document.getElementById('navComparables');

    if (navDatabase) {
      navDatabase.addEventListener('click', () => this.showPage('Database'));
    }
    if (navPhotos) {
      navPhotos.addEventListener('click', () => this.showPage('Photos'));
    }
    if (navRecommendations) {
      navRecommendations.addEventListener('click', () => this.showPage('Recommendations'));
    }
    if (navAnnonce) {
      navAnnonce.addEventListener('click', () => this.showPage('Annonce'));
    }
    if (navComparables) {
      navComparables.addEventListener('click', () => this.showPage('Comparables'));
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

    // Fermer modal en cliquant à l\\'extérieur
    const photoModal = document.getElementById('photoModal');
    if (photoModal) {
      photoModal.addEventListener('click', (e) => {
        if (e.target === photoModal) {
          this.closePhotoModal();
        }
      });
    }

    // Boutons de la collection de livres
    const refreshBooksBtn = document.getElementById('refreshBooksBtn');
    if (refreshBooksBtn) {
      refreshBooksBtn.addEventListener('click', () => this.loadBooks());
    }

    const enrichAllBooksBtn = document.getElementById('enrichAllBooksBtn');
    if (enrichAllBooksBtn) {
      enrichAllBooksBtn.addEventListener('click', () => this.enrichAllBooks());
    }
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
      this.showNotification('❌ Erreur lors de l\\'import CSV', 'error');
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
        /\\.(jpg|jpeg|png|webp|gif)$/i.test(name) && !zipContent.files[name].dir
      );

      this.showNotification(\`📸 \${imageFiles.length} images trouvées, traitement...\`, 'info');

      // Associer images aux données CSV
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        // Chercher image correspondante (par nom ou index)
        const matchingImage = imageFiles.find(imgName => {
          const baseName = imgName.split('/').pop().split('.')[0];
          return baseName === row.title?.replace(/[^a-zA-Z0-9]/g, '') || 
                 baseName === \`item_\${i+1}\` || 
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
      this.showNotification('❌ Erreur lors de l\\'extraction ZIP', 'error');
    }
  }

  // Import incrémental avec détection de doublons
  async handleIncrementalImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.showNotification('❌ Sélectionnez un fichier CSV pour l\\'import incrémental', 'error');
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
      this.showNotification('❌ Erreur lors de l\\'import incrémental', 'error');
    }
  }

  // Afficher sélecteur de templates CSV
  showTemplateSelector() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    
    const templates = this.getCSVTemplates();
    
    modal.innerHTML = \`
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div class="p-6">
          <h3 class="text-xl font-bold text-gray-900 mb-4">
            <i class="fas fa-download text-blue-600 mr-2"></i>
            Templates CSV Prédéfinis
          </h3>
          
          <p class="text-sm text-gray-600 mb-4">
            Choisissez un template adapté à votre type de collection
          </p>
          
          <div class="space-y-2 mb-6" id="templateButtons">
          </div>
          
          <div class="flex space-x-2">
            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                    class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
              Annuler
            </button>
          </div>
        </div>
      </div>
    \`;

    // Ajouter les boutons de template via JavaScript pour éviter les problèmes de syntaxe
    const buttonsContainer = modal.querySelector('#templateButtons');
    
    templates.forEach(template => {
      const button = document.createElement('button');
      button.className = 'w-full p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors';
      button.onclick = () => {
        modal.remove();
        this.downloadTemplate(template.id);
      };
      
      button.innerHTML = 
        '<div class="flex items-center">' +
          '<i class="' + template.icon + ' text-lg mr-3" style="color: ' + template.color + '"></i>' +
          '<div>' +
            '<div class="font-semibold">' + template.name + '</div>' +
            '<div class="text-xs text-gray-500">' + template.description + '</div>' +
            '<div class="text-xs text-blue-600 mt-1">' + template.columns.length + ' colonnes: ' + template.columns.slice(0,3).join(', ') + '...</div>' +
          '</div>' +
        '</div>';
      
      buttonsContainer.appendChild(button);
    });
    
    // Ajouter le bouton Template Personnalisé
    const customBtn = document.createElement('button');
    customBtn.className = 'flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700';
    customBtn.textContent = 'Template Personnalisé';
    customBtn.onclick = () => {
      modal.remove();
      this.downloadTemplate('custom');
    };
    modal.querySelector('.flex.space-x-2').appendChild(customBtn);

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
      this.showNotification('📋 Préparation de l\\'export CSV...', 'info');
      
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
      link.download = \`collection_export_\${new Date().toISOString().split('T')[0]}.csv\`;
      link.click();

      // Libérer la mémoire après téléchargement
      setTimeout(() => URL.revokeObjectURL(link.href), 100);

      this.showNotification(\`✅ Export réussi - \${items.length} items exportés\`, 'success');
      
    } catch (error) {
      console.error('Erreur export CSV:', error);
      this.showNotification('❌ Erreur lors de l\\'export', 'error');
    }
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
        name: 'Art et Objets d\\'Art',
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
      csvContent = 'title,category,author_or_artist,year,condition,description,estimated_value,notes\\n';
      csvContent += '"Exemple Item","books","Auteur Exemple",2023,"Excellent","Description exemple",50.00,"Notes exemple"\\n';
    } else if (template) {
      csvContent = template.columns.join(',') + '\\n';
      // Ligne d'exemple basée sur le type
      const examples = {
        'books': ['"Les Anciens Canadiens"', '"Philippe Aubert de Gaspé"', '"Beauchemin"', '1863', '"978-1234567890"', '"literature"', '"Good"', '"French"', '300', '150.00', '"Édition originale"'],
        'music': ['"Abbey Road"', '"The Beatles"', '"Abbey Road"', '1969', '"Apple Records"', '"rock"', '"Vinyl"', '"Near Mint"', '"No"', '500.00', '"Pressing original"'],
        'cards': ['"Wayne Gretzky Rookie"', '"O-Pee-Chee Hockey"', '1979', '"Rookie"', '"#18"', '"sports"', '"PSA 9"', '"Yes"', '"PSA"', '25000.00', '"Hall of Fame card"'],
        'art': ['"Paysage d\\'automne"', '"Jean-Paul Riopelle"', '"Oil on canvas"', '"24x36 inches"', '1965', '"painting"', '"Excellent"', '"Galerie X"', '"Certificate included"', '150000.00', '"Museum quality"'],
        'collectibles': ['"Optimus Prime G1"', '"Hasbro"', '"Transformers"', '1984', '"Die-cast metal"', '"toys"', '"Complete"', '"Yes"', '"No"', '350.00', '"Original box included"']
      };
      
      if (examples[templateId]) {
        csvContent += examples[templateId].join(',') + '\\n';
      }
    }
    
    // Créer et télécharger le fichier
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = \`template_\${templateId}_\${new Date().toISOString().split('T')[0]}.csv\`;
    link.click();

    // Libérer la mémoire après téléchargement
    setTimeout(() => URL.revokeObjectURL(link.href), 100);

    // Fermer la modal
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) modal.remove();
    
    this.showNotification(\`✅ Template "\${template?.name || 'Personnalisé'}" téléchargé\`, 'success');
  }

  // ===== FONCTIONS UTILITAIRES AVANCÉES =====

  async readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, 'UTF-8');
    });
  }

  parseAndValidateCSV(csvContent) {
    const lines = csvContent.trim().split('\\n');
    if (lines.length < 2) {
      return { data: [], errors: ['Fichier CSV vide ou invalide'], suggestions: [] };
    }

    // Détecter le séparateur
    const separators = [',', ';', '\\t', '|'];
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
      errors.push(\`Colonnes manquantes: \${missingRequired.join(', ')}\`);
      suggestions.push('Ajoutez au minimum les colonnes: title, category');
    }

    // Parser les données
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = this.parseCSVLine(lines[i], separator);
        const row = {};
        
        headers.forEach((header, index) => {
          // Normaliser le header : garder lettres, chiffres, remplacer espaces/spéciaux par underscore
          const cleanHeader = header
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Enlever accents
            .replace(/[^a-z0-9]+/g, '_') // Remplacer caractères spéciaux par underscore
            .replace(/^_+|_+$/g, ''); // Enlever underscores début/fin
          row[cleanHeader] = values[index] || '';
        });
        
        // Validation des données
        if (!row.title || !row.category) {
          errors.push(\`Ligne \${i + 1}: title et category sont requis\`);
        }
        
        data.push(row);
      }
    }

    return { data, errors, suggestions };
  }

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

  async loadExistingItems() {
    try {
      const response = await axios.get('/api/items?per_page=1000');
      return response.data.success ? response.data.items : [];
    } catch (error) {
      console.error('Erreur chargement items existants:', error);
      return [];
    }
  }

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

  calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 1.0;
    
    const distance = this.levenshteinDistance(s1, s2);
    return 1.0 - (distance / maxLength);
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
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  generateCSVContent(items) {
    const headers = ['ID', 'Title', 'Category', 'Author/Artist', 'Year', 'Condition', 'Description', 'Estimated Value', 'Created', 'Last Updated'];
    let csvContent = headers.join(',') + '\\n';
    
    for (const item of items) {
      const row = [
        item.id || '',
        \`"\${(item.title || '').replace(/"/g, '""')}"\`,
        \`"\${(item.category || '').replace(/"/g, '""')}"\`,
        \`"\${(item.author || item.artist || '').replace(/"/g, '""')}"\`,
        item.year || '',
        \`"\${(item.condition || '').replace(/"/g, '""')}"\`,
        \`"\${(item.description || '').replace(/"/g, '""')}"\`,
        item.estimated_value || '0.00',
        item.created_at || '',
        item.updated_at || ''
      ];
      csvContent += row.join(',') + '\\n';
    }
    
    return csvContent;
  }

  showValidationResults(errors, suggestions, data, importType = 'CSV') {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = \`
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-96 overflow-y-auto">
        <div class="p-6">
          <h3 class="text-xl font-bold text-red-600 mb-4">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            Erreurs de Validation - \${importType}
          </h3>
          
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h4 class="font-semibold text-red-800 mb-2">Erreurs détectées:</h4>
            <ul class="text-sm text-red-700 space-y-1">
              \${errors.map(error => \`<li>• \${error}</li>\`).join('')}
            </ul>
          </div>
          
          \${suggestions.length > 0 ? \`
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 class="font-semibold text-yellow-800 mb-2">Suggestions:</h4>
            <ul class="text-sm text-yellow-700 space-y-1">
              \${suggestions.map(suggestion => \`<li>• \${suggestion}</li>\`).join('')}
            </ul>
          </div>
          \` : ''}
          
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
    \`;

    document.body.appendChild(modal);
  }

  showImportResults(results, type) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    
    const successRate = results.processed / (results.processed + results.errors) * 100;
    
    modal.innerHTML = \`
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div class="p-6">
          <h3 class="text-xl font-bold text-green-600 mb-4">
            <i class="fas fa-check-circle mr-2"></i>
            Import \${type} Terminé
          </h3>
          
          <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Traités:</strong> \${results.processed}</div>
              <div><strong>Erreurs:</strong> \${results.errors}</div>
              <div><strong>Succès:</strong> \${Math.round(successRate)}%</div>
              <div><strong>Total:</strong> \${results.processed + results.errors}</div>
            </div>
          </div>
          
          <button onclick="this.parentElement.parentElement.parentElement.remove(); window.app.loadStats(); window.app.loadItems();" 
                  class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Fermer et Actualiser
          </button>
        </div>
      </div>
    \`;

    document.body.appendChild(modal);
  }

  showDuplicateDetectionResults(newItems, duplicates, updates) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    
    // Construction sécurisée sans template literals imbriqués
    let duplicatesSection = '';
    if (duplicates.length > 0) {
      const dupsList = duplicates.slice(0, 5).map(dup => 
        '<div class="text-sm">' +
          '<strong>Nouveau:</strong> "' + dup.newItem.title + '" ' +
          '<strong>Similaire à:</strong> "' + dup.existingItem.title + '" ' +
          '(' + Math.round(dup.similarity * 100) + '% similarité)' +
        '</div>'
      ).join('');
      const extraText = duplicates.length > 5 ? '<div class="text-xs text-gray-500">... et ' + (duplicates.length - 5) + ' autres</div>' : '';
      
      duplicatesSection = 
        '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">' +
          '<h4 class="font-semibold text-yellow-800 mb-2">Doublons détectés:</h4>' +
          '<div class="space-y-2 max-h-32 overflow-y-auto">' +
            dupsList +
            extraText +
          '</div>' +
        '</div>';
    }
    
    modal.innerHTML = \`
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
        <div class="p-6">
          <h3 class="text-xl font-bold text-orange-600 mb-4">
            <i class="fas fa-search mr-2"></i>
            Détection de Doublons - Résultats
          </h3>
          
          <div class="grid grid-cols-3 gap-4 mb-4">
            <div class="bg-green-50 p-3 rounded-lg text-center">
              <div class="text-2xl font-bold text-green-600">\${newItems.length}</div>
              <div class="text-sm text-green-700">Nouveaux items</div>
            </div>
            <div class="bg-orange-50 p-3 rounded-lg text-center">
              <div class="text-2xl font-bold text-orange-600">\${duplicates.length}</div>
              <div class="text-sm text-orange-700">Doublons détectés</div>
            </div>
            <div class="bg-blue-50 p-3 rounded-lg text-center">
              <div class="text-2xl font-bold text-blue-600">\${updates.length}</div>
              <div class="text-sm text-blue-700">Mises à jour</div>
            </div>
          </div>
          
          \${duplicatesSection}
          
          <div class="flex space-x-2" id="actionButtons">
            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                    class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
              Annuler
            </button>
          </div>
        </div>
      </div>
    \`;

    // Ajouter les boutons d'action via JavaScript pour éviter les problèmes de syntaxe
    const buttonsContainer = modal.querySelector('#actionButtons');
    
    if (newItems.length > 0) {
      const newBtn = document.createElement('button');
      newBtn.className = 'flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700';
      newBtn.textContent = 'Importer Nouveaux (' + newItems.length + ')';
      newBtn.onclick = () => {
        modal.remove();
        this.processIncrementalImport(newItems, 'new');
      };
      buttonsContainer.appendChild(newBtn);
    }
    
    if (duplicates.length > 0) {
      const dupBtn = document.createElement('button');
      dupBtn.className = 'flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700';
      dupBtn.textContent = 'Forcer Doublons (' + duplicates.length + ')';
      dupBtn.onclick = () => {
        modal.remove();
        this.processIncrementalImport(duplicates, 'duplicates');
      };
      buttonsContainer.appendChild(dupBtn);
    }

    document.body.appendChild(modal);
  }

  async processIncrementalImport(items, mode) {
    try {
      let itemsToProcess = items;
      
      if (mode === 'duplicates') {
        itemsToProcess = items.map(dup => dup.newItem);
      }
      
      const results = await this.processCSVData(itemsToProcess, false);
      
      // Fermer modal précédente
      const modal = document.querySelector('.fixed.inset-0');
      if (modal) modal.remove();
      
      this.showImportResults(results, 'Incrémental');
      
    } catch (error) {
      console.error('Erreur traitement incrémental final:', error);
      this.showNotification('❌ Erreur lors du traitement final', 'error');
    }
  }

  // FONCTIONS EXISTANTES CONSERVÉES

  async handleMediaSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Vérification du fichier
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.showNotification('Fichier trop volumineux (max 10MB)', 'warning');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/x-msvideo'];

    // Support for HEIC/HEIF files (iPhone format)
    if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      // Check if heic2any is loaded
      if (typeof heic2any === 'undefined') {
        this.showNotification('❌ Bibliothèque de conversion HEIC non chargée. Rechargez la page.', 'error');
        console.error('heic2any library not loaded');
        return;
      }

      this.showNotification('🔄 Conversion HEIC en cours... (peut prendre 5-10 secondes)', 'info');
      try {
        console.log('Starting HEIC conversion for file:', file.name, 'Size:', file.size, 'Type:', file.type);

        // Convert HEIC to JPEG using heic2any library
        let convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8  // Reduced quality for better compatibility
        });

        console.log('HEIC conversion completed, result type:', typeof convertedBlob, 'Is array:', Array.isArray(convertedBlob));

        // heic2any can return an array of blobs, handle both cases
        if (Array.isArray(convertedBlob)) {
          console.log('Multiple blobs returned, using first one');
          convertedBlob = convertedBlob[0];
        }

        // Create new File object from converted blob
        file = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        this.showNotification('✅ HEIC converti en JPEG avec succès!', 'success');
        console.log('HEIC converted successfully. New file:', file.name, 'Size:', file.size, 'bytes');
      } catch (error) {
        // Detailed error logging
        console.error('=== HEIC Conversion Error ===');
        console.error('Error object:', error);
        console.error('Error type:', typeof error);
        console.error('Error message:', error?.message);
        console.error('Error code:', error?.code);
        console.error('Error name:', error?.name);
        console.error('Full error:', JSON.stringify(error, null, 2));

        const errorMsg = error?.message || error?.code || error?.name || 'Erreur inconnue';
        this.showNotification(\`❌ Conversion HEIC échouée: \${errorMsg}. Solution: Utilisez le script ./convert-heic.sh ou un convertisseur en ligne.\`, 'error');
        return;
      }
    }

    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.heic') && !file.name.toLowerCase().endsWith('.heif')) {
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
        thumb.innerHTML = \`<img src="\${e.target.result}" class="w-full h-full object-cover rounded-lg" alt="Preview" />\`;
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
      const isImage = this.selectedMedia.type.startsWith('image/');

      // Si c'est une image, utiliser le nouveau endpoint de détection multi-livres
      if (isImage) {
        this.showNotification('🔍 Analyse en cours avec détection multi-livres...', 'info');

        const response = await fetch('/api/photos/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: mediaUrl,
            options: {
              maxItems: 30,
              useCache: true
            }
          })
        });

        const result = await response.json();

        if (result.success) {
          this.showNotification(\`✅ \${result.total_detected} livres détectés !\`, 'success');

          // Basculer vers l'onglet Photos et afficher le détail
          this.showPage('Photos');
          setTimeout(() => {
            this.showPhotoDetail(result.photo_id);
          }, 500);
        } else {
          this.showNotification('❌ Erreur analyse: ' + result.error?.message, 'error');
        }
      } else {
        // Pour les vidéos ou autres médias, utiliser l'ancien endpoint
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
      }

    } catch (error) {
      console.error('Erreur analyse fichier:', error);
      this.showNotification('Erreur lors de l\\'analyse', 'error');
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
    // Si ce n'est pas une image, retourner le fichier tel quel
    if (!file.type.startsWith('image/')) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }

    // Compression automatique pour les images
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const img = new Image();
          img.onload = () => {
            // Calculer les dimensions optimales (max 1920px de largeur)
            let width = img.width;
            let height = img.height;
            const maxWidth = 1920;

            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }

            // Créer un canvas pour la compression
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Compression progressive jusqu'à atteindre < 900 KB (marge de sécurité)
            const targetSize = 900 * 1024; // 900 KB
            let quality = 0.85;
            let compressed = canvas.toDataURL('image/jpeg', quality);

            // Si trop gros, réduire la qualité
            while (compressed.length > targetSize && quality > 0.5) {
              quality -= 0.05;
              compressed = canvas.toDataURL('image/jpeg', quality);
            }

            // Si toujours trop gros, réduire les dimensions
            if (compressed.length > targetSize) {
              const scale = Math.sqrt(targetSize / compressed.length);
              canvas.width = width * scale;
              canvas.height = height * scale;
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              compressed = canvas.toDataURL('image/jpeg', 0.8);
            }

            console.log('Image compressée:', {
              original: Math.round(e.target.result.length / 1024) + ' KB',
              compressed: Math.round(compressed.length / 1024) + ' KB',
              dimensions: canvas.width + 'x' + canvas.height,
              quality
            });

            resolve(compressed);
          };
          img.onerror = reject;
          img.src = e.target.result;
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
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
    const isMultiExpert = result.analysis_type === 'multi_expert_ai';
    const detailedAnalysis = result.detailed_analysis;
    
    // Créer modal de résultats avancés
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    
    // Interface avancée pour analyse multi-expert
    const advancedContent = isMultiExpert ? \`
      <!-- Consensus d'experts -->
      <div class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-4">
        <h4 class="font-semibold mb-2 text-purple-800">
          <i class="fas fa-users mr-2"></i>
          Consensus d'Experts IA (\${result.expert_consensus}%)
        </h4>
        <div class="flex items-center mb-2">
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full" 
                 style="width: \${result.expert_consensus}%"></div>
          </div>
          <span class="ml-2 text-sm font-semibold text-purple-700">\${result.expert_consensus}%</span>
        </div>
        <p class="text-xs text-purple-600">
          Analyse basée sur 3 experts IA spécialisés: OpenAI Vision, Claude Collections, Gemini Comparative
        </p>
      </div>
      
      <!-- Estimation de valeur -->
      \${detailedAnalysis?.estimated_value ? \`
      <div class="bg-green-50 rounded-lg p-4 mb-4">
        <h4 class="font-semibold mb-2 text-green-800">
          <i class="fas fa-dollar-sign mr-2"></i>
          Estimation de Valeur
        </h4>
        <div class="grid grid-cols-3 gap-2 text-sm">
          <div class="text-center">
            <div class="text-lg font-bold text-green-700">\${detailedAnalysis.estimated_value.min}$</div>
            <div class="text-xs text-gray-600">Minimum</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-bold text-green-800">\${detailedAnalysis.estimated_value.average}$</div>
            <div class="text-xs text-gray-600">Moyenne</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-green-700">\${detailedAnalysis.estimated_value.max}$</div>
            <div class="text-xs text-gray-600">Maximum</div>
          </div>
        </div>
        <div class="mt-2 text-xs text-center text-gray-600">
          Confiance: \${Math.round(detailedAnalysis.estimated_value.confidence * 100)}%
        </div>
      </div>
      \` : ''}
      
      <!-- Analyse de rareté -->
      \${detailedAnalysis?.rarity_assessment ? \`
      <div class="bg-yellow-50 rounded-lg p-4 mb-4">
        <h4 class="font-semibold mb-2 text-yellow-800">
          <i class="fas fa-gem mr-2"></i>
          Évaluation de Rareté
        </h4>
        <div class="flex items-center justify-between mb-2">
          <span class="font-semibold text-yellow-700">\${detailedAnalysis.rarity_assessment.level}</span>
          <span class="bg-yellow-200 px-2 py-1 rounded text-xs font-bold">
            \${detailedAnalysis.rarity_assessment.score}/10
          </span>
        </div>
        \${detailedAnalysis.rarity_assessment.factors.length > 0 ? \`
        <div class="text-xs text-yellow-700">
          <strong>Facteurs:</strong> \${detailedAnalysis.rarity_assessment.factors.join(', ')}
        </div>
        \` : ''}
      </div>
      \` : ''}
      
      <!-- Recommandations -->
      \${result.recommendations?.length > 0 ? \`
      <div class="bg-blue-50 rounded-lg p-4 mb-4">
        <h4 class="font-semibold mb-2 text-blue-800">
          <i class="fas fa-lightbulb mr-2"></i>
          Recommandations d'Expert
        </h4>
        <ul class="text-sm text-blue-700 space-y-1">
          \${result.recommendations.map(rec => \`<li>• \${rec}</li>\`).join('')}
        </ul>
      </div>
      \` : ''}
    \` : '';
    
    modal.innerHTML = \`<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
      <div class="p-6">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-bold text-gray-900">
            <i class="fas fa-brain text-purple-600 mr-2"></i>
            \${isMultiExpert ? 'Analyse Multi-Expert IA' : 'Analyse IA'} Terminée
          </h3>
          <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" 
                  class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 class="font-semibold mb-2">📄 Source: \${source}</h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Catégorie:</strong> \${analysis.category || 'Non détectée'}</div>
            <div><strong>Confiance:</strong> <span class="text-purple-600 font-semibold">\${confidence}%</span></div>
            <div><strong>Titre:</strong> \${analysis.extracted_data?.title || 'Non détecté'}</div>
            <div><strong>Auteur/Artiste:</strong> \${analysis.extracted_data?.artist_author || 'Non détecté'}</div>
            <div><strong>Année:</strong> \${analysis.extracted_data?.year || 'Non détectée'}</div>
            <div><strong>Rareté:</strong> \${analysis.estimated_rarity || 'Inconnue'}</div>
          </div>
        </div>
        
        \${advancedContent}
        
        <div class="bg-blue-50 rounded-lg p-4 mb-4">
          <h4 class="font-semibold mb-2">🔍 Recherches suggérées:</h4>
          <div class="flex flex-wrap gap-1">
            \${(analysis.search_queries || []).map(query => 
              \`<span class="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">\${query}</span>\`
            ).join('')}
          </div>
        </div>
        
        \${result.fallback_reason ? \`
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <p class="text-xs text-orange-700">
            <i class="fas fa-info-circle mr-1"></i>
            \${result.error_note}
          </p>
        </div>
        \` : ''}
        
        <div class="flex space-x-2" id="modalButtons">
          <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" 
                  class="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Fermer
          </button>
        </div>
      </div>
    </div>\`;

    // Ajouter le bouton d'analyse avancée si nécessaire
    if (isMultiExpert) {
      const buttonsContainer = modal.querySelector('#modalButtons');
      const advancedBtn = document.createElement('button');
      advancedBtn.className = 'flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700';
      advancedBtn.textContent = 'Analyse Complète';
      advancedBtn.onclick = () => {
        modal.remove();
        this.requestAdvancedAnalysis(source);
      };
      buttonsContainer.appendChild(advancedBtn);
    }

    document.body.appendChild(modal);
    
    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  async requestAdvancedAnalysis(source) {
    this.showNotification('🔬 Lancement analyse avancée multi-expert...', 'info');
    
    try {
      const response = await axios.post('/api/advanced-analysis', {
        text_input: source,
        analysis_type: 'comprehensive'
      });

      if (response.data.success) {
        this.displayAdvancedAnalysisResult(response.data.analysis);
        this.showNotification('✅ Analyse avancée terminée !', 'success');
      } else {
        this.showNotification('❌ Erreur analyse avancée', 'error');
      }
    } catch (error) {
      console.error('Erreur analyse avancée:', error);
      this.showNotification('❌ Erreur lors de l\\'analyse avancée', 'error');
    }
  }

  displayAdvancedAnalysisResult(analysis) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = \`<div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-96 overflow-y-auto">
      <div class="p-6">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-bold text-gray-900">
            <i class="fas fa-microscope text-blue-600 mr-2"></i>
            Analyse Complète Multi-Expert
          </h3>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                  class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Colonne gauche -->
          <div>
            <div class="bg-purple-50 rounded-lg p-4 mb-4">
              <h4 class="font-semibold text-purple-800 mb-2">🎯 Identification</h4>
              <div class="text-sm space-y-1">
                <div><strong>Titre:</strong> \${analysis.consensus_title}</div>
                <div><strong>Auteur/Artiste:</strong> \${analysis.consensus_author_artist}</div>
                <div><strong>Année:</strong> \${analysis.consensus_year}</div>
                <div><strong>Catégorie:</strong> \${analysis.consensus_category}</div>
              </div>
            </div>
            
            <div class="bg-green-50 rounded-lg p-4 mb-4">
              <h4 class="font-semibold text-green-800 mb-2">💰 Valeur Estimée</h4>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-700">\${analysis.estimated_value.average}$</div>
                <div class="text-sm text-gray-600">(\${analysis.estimated_value.min}$ - \${analysis.estimated_value.max}$)</div>
                <div class="text-xs text-gray-500">Confiance: \${Math.round(analysis.estimated_value.confidence * 100)}%</div>
              </div>
            </div>
          </div>
          
          <!-- Colonne droite -->
          <div>
            <div class="bg-yellow-50 rounded-lg p-4 mb-4">
              <h4 class="font-semibold text-yellow-800 mb-2">💎 Analyse de Rareté</h4>
              <div class="text-sm">
                <div class="flex justify-between items-center mb-2">
                  <span>\${analysis.rarity_assessment.level}</span>
                  <span class="bg-yellow-200 px-2 py-1 rounded text-xs font-bold">
                    \${analysis.rarity_assessment.score}/10
                  </span>
                </div>
                \${analysis.rarity_assessment.factors.length > 0 ? \`
                <div class="text-xs">
                  <strong>Facteurs:</strong><br>
                  \${analysis.rarity_assessment.factors.map(f => \`• \${f}\`).join('<br>')}
                </div>
                \` : ''}
              </div>
            </div>
            
            <div class="bg-blue-50 rounded-lg p-4 mb-4">
              <h4 class="font-semibold text-blue-800 mb-2">📈 Analyse de Marché</h4>
              <div class="text-sm grid grid-cols-2 gap-2">
                <div><strong>Demande:</strong> \${analysis.market_analysis.demand}</div>
                <div><strong>Liquidité:</strong> \${analysis.market_analysis.liquidity}</div>
                <div><strong>Tendance:</strong> \${analysis.market_analysis.trend}</div>
                <div><strong>Consensus:</strong> \${analysis.expert_consensus}%</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Recommandations -->
        <div class="bg-gray-50 rounded-lg p-4 mt-4">
          <h4 class="font-semibold text-gray-800 mb-2">💡 Recommandations</h4>
          <ul class="text-sm text-gray-700 space-y-1">
            \${analysis.action_recommendations.map(rec => \`<li>• \${rec}</li>\`).join('')}
          </ul>
        </div>
        
        <div class="text-center mt-4">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                  class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Fermer
          </button>
        </div>
      </div>
    </div>\`;

    document.body.appendChild(modal);
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

  // ==================== NAVIGATION MULTI-PAGE ====================

  setupPhotoTabs() {
    // Initialiser sur la page Base de Données par défaut
    this.showPage('Database');
  }

  showPage(pageName) {
    // Cacher toutes les pages
    document.querySelectorAll('.page-content').forEach(page => {
      page.classList.add('hidden');
    });

    // Afficher la page sélectionnée
    const selectedPage = document.getElementById('page' + pageName);
    if (selectedPage) {
      selectedPage.classList.remove('hidden');
    }

    // Mettre à jour les boutons de navigation
    document.querySelectorAll('nav button').forEach(btn => {
      btn.classList.remove('bg-blue-600', 'text-white');
      btn.classList.add('text-gray-600');
    });

    const activeBtn = document.getElementById('nav' + pageName);
    if (activeBtn) {
      activeBtn.classList.add('bg-blue-600', 'text-white');
      activeBtn.classList.remove('text-gray-600');
    }

    // Recharger les données selon la page
    if (pageName === 'Database') {
      // Recharger stats et items pour la page Base de Données
      this.loadStats();
      this.loadItems();
    } else if (pageName === 'Photos') {
      // Recharger les photos et les livres pour la galerie
      this.loadPhotos();
      this.loadBooks();
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
    grid.innerHTML = photos.map(photo => \`
      <div class="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
           onclick="window.app.showPhotoDetail(\${photo.id})">
        <div class="aspect-video bg-gray-200 relative">
          \${photo.image_url ? \`<img src="\${photo.image_url}" alt="Photo" class="w-full h-full object-cover">\` :
            \`<div class="w-full h-full flex items-center justify-center"><i class="fas fa-image text-gray-400 text-4xl"></i></div>\`}
          <div class="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
            \${photo.total_items_detected || 0} livres
          </div>
        </div>
        <div class="p-4">
          <div class="text-sm text-gray-600">
            <p class="mb-1"><i class="fas fa-calendar mr-1"></i>\${new Date(photo.uploaded_at).toLocaleDateString('fr-FR')}</p>
            \${photo.total_value ? \`<p class="text-green-600 font-semibold"><i class="fas fa-dollar-sign mr-1"></i>\${photo.total_value.toFixed(2)} CAD</p>\` : '<p class="text-gray-400">Valeur non estimée</p>'}
          </div>
        </div>
      </div>
    \`).join('');
  }

  async showPhotoDetail(photoId) {
    try {
      const response = await fetch(\`/api/photos/\${photoId}\`);
      const data = await response.json();
      if (data.success && data.photo) {
        this.currentPhotoId = photoId;
        this.displayPhotoDetail(data.photo, data.items);
      }
    } catch (error) {
      console.error('Erreur détail photo:', error);
    }
  }

  displayPhotoDetail(photo, items) {
    document.getElementById('modalPhotoImg').src = photo.image_url || '';
    document.getElementById('modalPhotoDate').textContent = new Date(photo.uploaded_at).toLocaleString('fr-FR');
    document.getElementById('modalPhotoCount').textContent = items.length;
    const totalValue = items.reduce((sum, item) => sum + (parseFloat(item.estimated_value) || 0), 0);
    document.getElementById('modalPhotoValue').textContent = totalValue > 0 ? \`\${totalValue.toFixed(2)} CAD\` : 'Non estimée';

    document.getElementById('modalBooksList').innerHTML = items.map((item, idx) => \`
      <div class="p-3 bg-gray-50 rounded-lg">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <p class="font-semibold text-gray-800">\${idx + 1}. \${item.title || 'Sans titre'}</p>
            \${item.artist_author ? \`<p class="text-sm text-gray-600"><i class="fas fa-user mr-1"></i>\${item.artist_author}</p>\` : ''}
            \${item.publisher_label ? \`<p class="text-xs text-gray-500">\${item.publisher_label}</p>\` : ''}
            \${item.year ? \`<p class="text-xs text-gray-500">\${item.year}</p>\` : ''}
            \${item.isbn_13 ? \`<p class="text-xs text-gray-400 font-mono">\${item.isbn_13}</p>\` : ''}
          </div>
          <div class="text-right ml-4">
            \${item.estimated_value ? \`<p class="text-green-600 font-semibold">\${parseFloat(item.estimated_value).toFixed(2)} CAD</p>\` : '<p class="text-gray-400 text-sm">N/A</p>'}
            \${item.detection_confidence ? \`<p class="text-xs text-gray-500">\${(item.detection_confidence * 100).toFixed(0)}% confiance</p>\` : ''}
          </div>
        </div>
      </div>
    \`).join('');

    document.getElementById('photoModal').classList.remove('hidden');
  }

  closePhotoModal() {
    document.getElementById('photoModal').classList.add('hidden');
    this.currentPhotoId = null;
  }

  async deleteCurrentPhoto() {
    if (!this.currentPhotoId || !confirm('Supprimer cette photo et tous les livres associés ?')) return;
    try {
      const response = await fetch(\`/api/photos/\${this.currentPhotoId}\`, { method: 'DELETE' });
      if ((await response.json()).success) {
        this.showNotification('✅ Photo supprimée', 'success');
        this.closePhotoModal();
        this.loadPhotos();
        this.loadItems();
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  }

  async exportPhotoBooks() {
    if (!this.currentPhotoId) return;
    try {
      const response = await fetch(\`/api/photos/\${this.currentPhotoId}\`);
      const data = await response.json();
      if (data.success) {
        const headers = ['Titre', 'Auteur', 'Éditeur', 'Année', 'ISBN-13', 'Valeur', 'Confiance'];
        const rows = data.items.map(item => [item.title || '', item.artist_author || '', item.publisher_label || '',
          item.year || '', item.isbn_13 || '', item.estimated_value || '',
          item.detection_confidence ? (item.detection_confidence * 100).toFixed(0) + '%' : '']);
        const csv = [headers, ...rows].map(row => row.map(cell => \`"\${String(cell).replace(/"/g, '""')}"\`).join(',')).join('\\n');
        const blob = new Blob(['\\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = \`photo_\${this.currentPhotoId}_livres.csv\`;
        link.click();
        this.showNotification('✅ CSV exporté', 'success');
      }
    } catch (error) {
      console.error('Erreur export:', error);
    }
  }

  // ===== GESTION DE LA COLLECTION DE LIVRES =====

  async loadBooks() {
    try {
      const response = await fetch('/api/items');
      const data = await response.json();

      if (data.success) {
        this.currentBooks = data.items || [];
        this.displayBooks(this.currentBooks);
        this.updateBookStats(this.currentBooks);
      }
    } catch (error) {
      console.error('Erreur chargement livres:', error);
      this.showNotification('❌ Erreur lors du chargement des livres', 'error');
    }
  }

  displayBooks(books) {
    const container = document.getElementById('booksCollectionList');
    const empty = document.getElementById('booksCollectionEmpty');

    if (!container || !empty) return;

    if (!books || books.length === 0) {
      container.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    container.innerHTML = books.map((book, index) => {
      const isEnriched = book.artist_author && book.publisher_label && book.isbn_13;
      const hasPrice = book.estimated_value && parseFloat(book.estimated_value) > 0;

      return \`
        <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between gap-4">
            <!-- Numéro et Image -->
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full font-semibold">
                \${index + 1}
              </div>
              \${book.primary_image_url ? \`
                <img src="\${book.primary_image_url}" alt="Couverture" class="w-16 h-20 object-cover rounded shadow-sm">
              \` : ''}
            </div>

            <!-- Informations principales -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">\${this.escapeHtml(book.title)}</h3>

                  <div class="space-y-1 text-sm">
                    \${book.artist_author ? \`
                      <p class="text-gray-700">
                        <i class="fas fa-user w-5 text-gray-400"></i>
                        <strong>Auteur:</strong> \${this.escapeHtml(book.artist_author)}
                      </p>
                    \` : '<p class="text-gray-400 italic"><i class="fas fa-user w-5"></i>Auteur non renseigné</p>'}

                    \${book.publisher_label ? \`
                      <p class="text-gray-700">
                        <i class="fas fa-building w-5 text-gray-400"></i>
                        <strong>Éditeur:</strong> \${this.escapeHtml(book.publisher_label)}
                      </p>
                    \` : '<p class="text-gray-400 italic"><i class="fas fa-building w-5"></i>Éditeur non renseigné</p>'}

                    \${book.year ? \`
                      <p class="text-gray-600">
                        <i class="fas fa-calendar w-5 text-gray-400"></i>
                        <strong>Année:</strong> \${book.year}
                      </p>
                    \` : ''}

                    \${book.isbn_13 ? \`
                      <p class="text-gray-600 font-mono text-xs">
                        <i class="fas fa-barcode w-5 text-gray-400"></i>
                        <strong>ISBN-13:</strong> \${book.isbn_13}
                      </p>
                    \` : '<p class="text-gray-400 italic"><i class="fas fa-barcode w-5"></i>ISBN non renseigné</p>'}
                  </div>

                  <div class="mt-3 flex items-center gap-3 text-xs text-gray-500">
                    <span><i class="fas fa-camera mr-1"></i>Photo #\${book.photo_id || 'N/A'}</span>
                    <span><i class="fas fa-clock mr-1"></i>\${new Date(book.created_at).toLocaleDateString('fr-FR')}</span>
                    \${book.detection_confidence ? \`
                      <span class="px-2 py-1 rounded-full \${book.detection_confidence > 0.9 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                        \${Math.round(book.detection_confidence * 100)}% confiance
                      </span>
                    \` : ''}
                  </div>
                </div>

                <!-- Prix et Actions -->
                <div class="flex flex-col items-end gap-2">
                  \${hasPrice ? \`
                    <div class="text-right">
                      <p class="text-xs text-gray-500">Valeur estimée</p>
                      <p class="text-2xl font-bold text-green-600">\${parseFloat(book.estimated_value).toFixed(2)} CAD$</p>
                    </div>
                  \` : \`
                    <div class="text-right">
                      <p class="text-xs text-gray-400">Valeur estimée</p>
                      <p class="text-lg font-medium text-gray-400">N/A</p>
                    </div>
                  \`}

                  \${!isEnriched ? \`
                    <button onclick="window.app.enrichBook(\${book.id})"
                            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm whitespace-nowrap">
                      <i class="fas fa-magic mr-1"></i>Enrichir
                    </button>
                  \` : \`
                    <div class="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm text-center whitespace-nowrap">
                      <i class="fas fa-check-circle mr-1"></i>Complet
                    </div>
                  \`}

                  \${isEnriched ? \`
                    <button onclick="window.app.evaluateBook(\${book.id})"
                            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm whitespace-nowrap">
                      <i class="fas fa-brain mr-1"></i>Évaluation IA
                    </button>
                  \` : ''}
                </div>
              </div>

              <!-- Zone d'évaluation (cachée par défaut) -->
              <div id="evaluation-\${book.id}" class="hidden mt-4 p-4 bg-gray-50 rounded-lg border-t border-gray-200">
                <!-- Résultats d'évaluation IA affichés ici -->
              </div>
            </div>
          </div>
        </div>
      \`;
    }).join('');
  }

  updateBookStats(books) {
    const total = books.length;
    const enriched = books.filter(b => b.artist_author && b.publisher_label && b.isbn_13).length;
    const pending = total - enriched;
    const totalValue = books.reduce((sum, book) => sum + (parseFloat(book.estimated_value) || 0), 0);

    const statTotal = document.getElementById('bookStatTotal');
    const statEnriched = document.getElementById('bookStatEnriched');
    const statPending = document.getElementById('bookStatPending');
    const statValue = document.getElementById('bookStatValue');

    if (statTotal) statTotal.textContent = total;
    if (statEnriched) statEnriched.textContent = enriched;
    if (statPending) statPending.textContent = pending;
    if (statValue) statValue.textContent = totalValue > 0 ? \`\${totalValue.toFixed(2)} CAD$\` : '0 CAD$';
  }

  async enrichBook(bookId) {
    this.showNotification('🔍 Enrichissement en cours...', 'info');

    try {
      const response = await fetch(\`/api/items/\${bookId}/enrich\`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        this.showNotification(\`✅ Livre enrichi depuis \${data.enrichment.source}\`, 'success');
        await this.loadBooks(); // Recharger pour afficher les nouvelles données
      } else {
        this.showNotification(\`❌ \${data.error?.message || 'Enrichissement échoué'}\`, 'error');
      }
    } catch (error) {
      console.error('Erreur enrichissement:', error);
      this.showNotification('❌ Erreur lors de l\\'enrichissement', 'error');
    }
  }

  async enrichAllBooks() {
    const pending = (this.currentBooks || []).filter(b => !b.artist_author || !b.publisher_label || !b.isbn_13).length;

    if (pending === 0) {
      this.showNotification('✅ Tous les livres sont déjà enrichis', 'info');
      return;
    }

    if (!confirm(\`Enrichir \${pending} livre(s)? Cela peut prendre quelques minutes.\`)) {
      return;
    }

    this.showNotification(\`🔄 Enrichissement de \${pending} livres en cours...\`, 'info');

    try {
      const response = await fetch('/api/items/enrich-all', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        this.showNotification(\`✅ \${data.processed} livre(s) enrichi(s), \${data.failed} échec(s)\`, 'success');
        await this.loadBooks();
      } else {
        this.showNotification('❌ Enrichissement batch échoué', 'error');
      }
    } catch (error) {
      console.error('Erreur batch enrichissement:', error);
      this.showNotification('❌ Erreur lors de l\\'enrichissement batch', 'error');
    }
  }

  async evaluateBook(bookId) {
    this.showNotification('🤖 Évaluation IA en cours (cela peut prendre 10-15 secondes)...', 'info');

    try {
      const response = await fetch(\`/api/items/\${bookId}/evaluate\`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        this.displayEvaluation(bookId, data.evaluation);

        // Mettre à jour le prix localement dans l'objet book
        const book = this.bookManager.books.find(b => b.id === bookId);
        if (book && data.evaluation.rarity) {
          book.estimated_value = data.evaluation.rarity.estimatedValue;
          // Re-render le livre pour afficher le nouveau prix
          this.renderBooks();
        }

        this.showNotification('✅ Évaluation IA complète terminée!', 'success');
      } else {
        this.showNotification(\`❌ \${data.error?.message || 'Évaluation échouée'}\`, 'error');
      }
    } catch (error) {
      console.error('Erreur évaluation:', error);
      this.showNotification('❌ Erreur lors de l\\'évaluation IA', 'error');
    }
  }

  displayEvaluation(bookId, evaluation) {
    const container = document.getElementById(\`evaluation-\${bookId}\`);
    if (!container) return;

    const { prices, rarity, editions } = evaluation;

    container.innerHTML = \`
      <h4 class="font-bold text-lg mb-4 text-purple-700">
        <i class="fas fa-chart-line mr-2"></i>Analyse Complète IA
      </h4>

      <!-- Prix Multi-Sources -->
      \${prices ? \`
        <div class="mb-4 p-3 bg-white rounded-lg border border-gray-200">
          <h5 class="font-semibold text-green-700 mb-3">
            <i class="fas fa-dollar-sign mr-1"></i>Analyse de Prix (\${prices.count} sources)
          </h5>

          <!-- Statistiques de Distribution -->
          <div class="grid grid-cols-4 gap-2 mb-3">
            <div class="text-center p-2 bg-blue-50 rounded">
              <p class="text-xs text-gray-600">Min</p>
              <p class="text-sm font-bold text-blue-700">\${prices.min.toFixed(2)}</p>
            </div>
            <div class="text-center p-2 bg-green-50 rounded">
              <p class="text-xs text-gray-600">Médiane</p>
              <p class="text-sm font-bold text-green-700">\${prices.median.toFixed(2)}</p>
            </div>
            <div class="text-center p-2 bg-yellow-50 rounded">
              <p class="text-xs text-gray-600">Moyenne</p>
              <p class="text-sm font-bold text-yellow-700">\${prices.average.toFixed(2)}</p>
            </div>
            <div class="text-center p-2 bg-red-50 rounded">
              <p class="text-xs text-gray-600">Max</p>
              <p class="text-sm font-bold text-red-700">\${prices.max.toFixed(2)}</p>
            </div>
          </div>

          <!-- Prix par Condition -->
          \${Object.keys(prices.byCondition).length > 0 ? \`
            <div class="mb-2">
              <p class="text-xs font-semibold text-gray-700 mb-1">Prix par Condition:</p>
              <div class="grid grid-cols-2 gap-2">
                \${Object.entries(prices.byCondition).map(([condition, data]) => \`
                  <div class="text-xs p-2 bg-gray-50 rounded">
                    <span class="font-semibold capitalize">\${condition}:</span>
                    <span class="text-green-600 ml-1">\${data.avg.toFixed(2)} CAD$</span>
                    <span class="text-gray-500">(\${data.count})</span>
                  </div>
                \`).join('')}
              </div>
            </div>
          \` : ''}

          <details class="mt-2">
            <summary class="cursor-pointer text-xs text-blue-600 hover:underline">
              <i class="fas fa-list mr-1"></i>Détails par source (\${prices.sources.length})
            </summary>
            <div class="mt-2 space-y-1">
              \${prices.sources.map(s => \`
                <div class="text-xs p-2 bg-gray-50 rounded flex justify-between">
                  <span><strong>\${s.source}:</strong> \${s.condition}</span>
                  <span class="font-semibold">\${s.price.toFixed(2)} CAD$</span>
                </div>
              \`).join('')}
            </div>
          </details>
        </div>
      \` : '<p class="text-gray-400">Prix non disponibles</p>'}

      <!-- Comparaison des Éditions -->
      \${editions && editions.totalEditionsFound > 0 ? \`
        <div class="mb-4 p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
          <h5 class="font-semibold text-amber-800 mb-3">
            <i class="fas fa-book-open mr-1"></i>Éditions Disponibles (\${editions.totalEditionsFound})
          </h5>

          <!-- Éditions Remarquables -->
          \${editions.mostRare || editions.mostValuable ? \`
            <div class="grid grid-cols-2 gap-2 mb-3">
              \${editions.mostRare ? \`
                <div class="p-3 bg-white rounded border border-amber-300">
                  <p class="text-xs text-gray-600 mb-1">📜 Plus Ancienne</p>
                  <p class="text-sm font-semibold text-amber-900">\${editions.mostRare.publishedDate || 'N/A'}</p>
                  <p class="text-xs text-gray-700 truncate">\${this.escapeHtml(editions.mostRare.publisher || 'Éditeur inconnu')}</p>
                  \${editions.mostRare.isbn13 ? \`<p class="text-xs text-gray-500 mt-1">ISBN: \${editions.mostRare.isbn13}</p>\` : ''}
                </div>
              \` : ''}
              \${editions.mostValuable ? \`
                <div class="p-3 bg-white rounded border border-amber-300">
                  <p class="text-xs text-gray-600 mb-1">💎 Plus Valorisée</p>
                  <p class="text-sm font-semibold text-amber-900">\${editions.mostValuable.format || 'N/A'}</p>
                  <p class="text-xs text-gray-700 truncate">\${this.escapeHtml(editions.mostValuable.publisher || 'Éditeur inconnu')}</p>
                  \${editions.mostValuable.publishedDate ? \`<p class="text-xs text-gray-500 mt-1">\${editions.mostValuable.publishedDate}</p>\` : ''}
                </div>
              \` : ''}
            </div>
          \` : ''}

          <!-- Liste des Éditions -->
          <details class="mt-2">
            <summary class="cursor-pointer text-xs text-amber-700 hover:underline font-semibold">
              <i class="fas fa-list mr-1"></i>Voir toutes les éditions (\${editions.editions.length})
            </summary>
            <div class="mt-3 space-y-2 max-h-96 overflow-y-auto">
              \${editions.editions.slice(0, 20).map((edition, idx) => \`
                <div class="text-xs p-3 bg-white rounded border border-amber-200 hover:border-amber-400 transition">
                  <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                      <p class="font-semibold text-gray-800">\${this.escapeHtml(edition.title || 'Titre inconnu')}</p>
                      <p class="text-gray-600 mt-1">\${this.escapeHtml(edition.publisher || 'Éditeur inconnu')}</p>
                    </div>
                    <span class="ml-2 px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                      \${edition.format || 'N/A'}
                    </span>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    \${edition.publishedDate ? \`
                      <div>
                        <i class="fas fa-calendar mr-1"></i>
                        <span>\${edition.publishedDate}</span>
                      </div>
                    \` : ''}
                    \${edition.language ? \`
                      <div>
                        <i class="fas fa-language mr-1"></i>
                        <span>\${edition.language.toUpperCase()}</span>
                      </div>
                    \` : ''}
                  </div>

                  \${edition.isbn13 || edition.isbn10 ? \`
                    <div class="mt-2 pt-2 border-t border-amber-100">
                      \${edition.isbn13 ? \`<p class="text-xs text-gray-600"><strong>ISBN-13:</strong> \${edition.isbn13}</p>\` : ''}
                      \${edition.isbn10 ? \`<p class="text-xs text-gray-600"><strong>ISBN-10:</strong> \${edition.isbn10}</p>\` : ''}
                    </div>
                  \` : ''}

                  \${edition.pageCount ? \`
                    <p class="text-xs text-gray-500 mt-1">
                      <i class="fas fa-file-alt mr-1"></i>\${edition.pageCount} pages
                    </p>
                  \` : ''}
                </div>
              \`).join('')}
              \${editions.editions.length > 20 ? \`
                <p class="text-xs text-gray-500 text-center py-2">
                  ... et \${editions.editions.length - 20} autre(s) édition(s)
                </p>
              \` : ''}
            </div>
          </details>

          <!-- Recommandations -->
          \${editions.recommendations && editions.recommendations.length > 0 ? \`
            <div class="mt-3 p-3 bg-amber-50 rounded border border-amber-200">
              <p class="text-xs font-semibold text-amber-800 mb-2">
                <i class="fas fa-lightbulb mr-1"></i>Recommandations:
              </p>
              <ul class="list-disc pl-5 text-xs text-gray-700 space-y-1">
                \${editions.recommendations.map(r => \`<li>\${this.escapeHtml(r)}</li>\`).join('')}
              </ul>
            </div>
          \` : ''}
        </div>
      \` : ''}

      <!-- Analyse Rareté IA -->
      <div class="mb-4 p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
        <h5 class="font-semibold text-purple-800 mb-2">
          <i class="fas fa-brain mr-1"></i>Analyse IA de Rareté
        </h5>

        <div class="flex items-center justify-between mb-3">
          <div>
            <p class="text-3xl font-bold text-purple-900">
              \${rarity.rarityLevel.toUpperCase().replace('_', ' ')}
            </p>
            <p class="text-sm text-purple-700">Score: \${rarity.rarityScore}/10</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-600">Valeur recommandée</p>
            <p class="text-2xl font-bold text-green-600">\${rarity.estimatedValue.toFixed(2)} CAD$</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-3 text-sm">
          <div class="bg-white/50 p-2 rounded">
            <p class="text-xs text-gray-600">Demande</p>
            <p class="font-semibold text-purple-800">\${rarity.demandLevel.toUpperCase()}</p>
          </div>
          <div class="bg-white/50 p-2 rounded">
            <p class="text-xs text-gray-600">Potentiel investissement</p>
            <p class="font-semibold text-purple-800">\${rarity.investmentPotential}/10</p>
          </div>
        </div>

        <div class="mb-2">
          <p class="text-xs font-semibold text-purple-700 mb-1">Facteurs clés:</p>
          <ul class="list-disc pl-5 text-sm text-gray-700 space-y-1">
            \${rarity.factors.map(f => \`<li>\${this.escapeHtml(f)}</li>\`).join('')}
          </ul>
        </div>

        \${rarity.specialFeatures && rarity.specialFeatures.length > 0 ? \`
          <div class="mt-2">
            <p class="text-xs font-semibold text-purple-700">Caractéristiques spéciales:</p>
            <div class="flex flex-wrap gap-1 mt-1">
              \${rarity.specialFeatures.map(f => \`
                <span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                  \${this.escapeHtml(f)}
                </span>
              \`).join('')}
            </div>
          </div>
        \` : ''}

        <p class="mt-3 text-xs text-gray-600 italic">\${this.escapeHtml(rarity.notes)}</p>
        <p class="text-xs text-gray-500 mt-1">Confiance: \${Math.round(rarity.confidence * 100)}%</p>
      </div>

      <!-- Comparaison Éditions -->
      <div class="p-3 bg-white rounded-lg border border-gray-200">
        <h5 class="font-semibold text-blue-700 mb-2">
          <i class="fas fa-books mr-1"></i>\${editions.totalEditionsFound} Éditions Trouvées
        </h5>

        \${editions.mostRare ? \`
          <div class="mb-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
            <p class="text-xs font-semibold text-yellow-800">📖 Plus ancienne (potentiellement première édition)</p>
            <p class="text-sm">\${this.escapeHtml(editions.mostRare.title)}</p>
            <p class="text-xs text-gray-600">
              \${editions.mostRare.publisher || 'Éditeur inconnu'} - \${editions.mostRare.publishedDate || 'Date inconnue'}
            </p>
          </div>
        \` : ''}

        \${editions.mostValuable ? \`
          <div class="mb-2 p-2 bg-green-50 rounded border-l-4 border-green-400">
            <p class="text-xs font-semibold text-green-800">💎 Plus valorisée</p>
            <p class="text-sm">\${editions.mostValuable.format || 'Format inconnu'} - \${editions.mostValuable.publisher || 'Éditeur inconnu'}</p>
          </div>
        \` : ''}

        <details class="mt-2">
          <summary class="cursor-pointer text-xs text-blue-600 hover:underline">
            Recommandations (\${editions.recommendations.length})
          </summary>
          <ul class="list-disc pl-5 text-xs text-gray-700 mt-2 space-y-1">
            \${editions.recommendations.map(r => \`<li>\${this.escapeHtml(r)}</li>\`).join('')}
          </ul>
        </details>
      </div>
    \`;

    container.classList.remove('hidden');
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialisation
window.addEventListener('DOMContentLoaded', () => {
  window.app = new CollectionEvaluator();
});
    </script>
</body>
</html>`;

  return c.html(html);
});

// API: Obtenir les statistiques de collection
app.get('/api/stats', async (c) => {
  const { DB } = c.env;
  
  try {
    if (!DB) {
      return c.json({
        success: true,
        stats: {
          total_items: 0,
          completed_items: 0,
          analyzed_items: 0,
          total_value: 0,
          categories: []
        }
      });
    }

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

    return c.json({
      success: true,
      stats: {
        ...stats,
        categories: []
      }
    });

  } catch (error) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
})

// API: Lister les items - MOVED TO itemsRouter
// See src/routes/items.ts for the full implementation

// API: Import d'un item depuis CSV
app.post('/api/import-item', async (c) => {
  const { DB } = c.env;

  try {
    const body = await c.req.json();
    const { title, author, category, image_url, isbn } = body;

    // Validation
    if (!title || !category) {
      return c.json({
        success: false,
        error: 'title et category sont requis'
      }, 400);
    }

    // Insérer dans la base de données (utilise collection_id = 1 par défaut)
    const result = await DB.prepare(`
      INSERT INTO collection_items (collection_id, title, description, category, primary_image_url, processing_status, created_at, updated_at)
      VALUES (1, ?, ?, ?, ?, 'completed', datetime('now'), datetime('now'))
    `).bind(
      title,
      author ? `Auteur: ${author}${isbn ? ', ISBN: ' + isbn : ''}` : '',
      category,
      image_url || ''
    ).run();

    console.log('✅ Item importé:', title, '- ID:', result.meta.last_row_id);

    return c.json({
      success: true,
      item_id: result.meta.last_row_id,
      message: 'Item importé avec succès'
    });

  } catch (error: any) {
    console.error('❌ Erreur import item:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
})

// API: Évaluation intelligente avec système multi-expert IA
app.post('/api/smart-evaluate', async (c) => {
  const { env } = c;
  
  try {
    const body = await c.req.json();
    const { text_input, imageUrl, videoUrl, filename } = body;

    console.log('🧠 Démarrage évaluation multi-expert...');

    // Initialiser le système multi-expert
    const aiSystem = new MultiExpertAISystem(env);

    // Préparer le contexte d'analyse
    const additionalContext = {
      filename: filename,
      timestamp: new Date().toISOString(),
      user_context: 'Collection Mathieu Chamberland - Québec'
    };

    // Lancer l'analyse multi-expert
    const consolidatedAnalysis = await aiSystem.analyzeCollection(
      imageUrl, 
      text_input, 
      additionalContext
    );

    console.log('✅ Analyse multi-expert terminée');

    // Formatter la réponse pour compatibilité avec le frontend
    return c.json({
      success: true,
      analysis_type: 'multi_expert_ai',
      expert_consensus: consolidatedAnalysis.expert_consensus,
      smart_analysis: {
        category: consolidatedAnalysis.consensus_category,
        extracted_data: {
          title: consolidatedAnalysis.consensus_title,
          artist_author: consolidatedAnalysis.consensus_author_artist,
          year: consolidatedAnalysis.consensus_year
        },
        estimated_rarity: consolidatedAnalysis.rarity_assessment.level,
        rarity_score: consolidatedAnalysis.rarity_assessment.score,
        search_queries: consolidatedAnalysis.comparable_sales.slice(0, 3)
      },
      detailed_analysis: consolidatedAnalysis,
      matching_confidence: consolidatedAnalysis.expert_consensus / 100,
      estimated_value: consolidatedAnalysis.estimated_value,
      market_analysis: consolidatedAnalysis.market_analysis,
      recommendations: consolidatedAnalysis.action_recommendations
    });

  } catch (error) {
    console.error('❌ Erreur évaluation multi-expert:', error);
    
    // Fallback vers analyse simple en cas d'erreur
    return c.json({
      success: true,
      analysis_type: 'fallback_demo',
      expert_consensus: 60,
      smart_analysis: {
        category: 'books',
        extracted_data: {
          title: body.text_input || 'Item analysé',
          artist_author: 'Auteur à identifier',
          year: new Date().getFullYear() - Math.floor(Math.random() * 50)
        },
        estimated_rarity: ['Commune', 'Peu commune', 'Rare', 'Très rare'][Math.floor(Math.random() * 4)],
        rarity_score: Math.floor(Math.random() * 10) + 1,
        search_queries: ['Recherche suggérée 1', 'Recherche suggérée 2', 'Recherche suggérée 3']
      },
      matching_confidence: 0.6,
      error_note: 'Analyse de secours - Système multi-expert temporairement indisponible',
      fallback_reason: error.message
    });
  }
})

// API: Analyse avancée multi-expert (endpoint dédié)
app.post('/api/advanced-analysis', async (c) => {
  const { env } = c;
  
  try {
    const body = await c.req.json();
    const { text_input, imageUrl, analysis_type = 'full' } = body;

    console.log('🔬 Analyse avancée multi-expert demandée...');

    const aiSystem = new MultiExpertAISystem(env);
    
    const consolidatedAnalysis = await aiSystem.analyzeCollection(
      imageUrl, 
      text_input, 
      {
        analysis_depth: 'comprehensive',
        market_research: true,
        comparable_analysis: true,
        rarity_assessment: true
      }
    );

    return c.json({
      success: true,
      analysis_type: 'comprehensive_multi_expert',
      timestamp: new Date().toISOString(),
      analysis: consolidatedAnalysis
    });

  } catch (error) {
    console.error('❌ Erreur analyse avancée:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
})

// ============================================================================
// 🚀 V2.1 - NOUVEAUX ENDPOINTS (SANS AUTHENTICATION)
// ============================================================================

// 📚 Documentation Swagger UI
app.get('/docs', (c) => {
  const baseUrl = c.env.BASE_URL || 'http://localhost:3000';
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation - ImageToValue v2.1</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '${baseUrl}/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout",
        persistAuthorization: false,
        tryItOutEnabled: true
      });
    };
  </script>
</body>
</html>
  `.trim();

  c.header('Content-Type', 'text/html; charset=utf-8');
  return c.html(html);
});

// 📄 OpenAPI Specification
app.get('/openapi.json', (c) => {
  const baseUrl = c.env.BASE_URL || 'http://localhost:3000';

  return c.json({
    openapi: '3.1.0',
    info: {
      title: 'ImageToValue Evaluator API',
      version: '2.1.0',
      description: 'Système d\'évaluation multi-expert IA pour collections',
      contact: {
        name: 'Mathieu Chamberland',
        email: 'Math55_50@hotmail.com'
      }
    },
    servers: [
      { url: baseUrl, description: 'Serveur actuel' }
    ],
    paths: {
      '/healthz': {
        get: {
          summary: 'Health Check',
          tags: ['System'],
          responses: {
            200: { description: 'Service opérationnel' }
          }
        }
      },
      '/metrics': {
        get: {
          summary: 'Métriques Prometheus',
          tags: ['System'],
          responses: {
            200: { description: 'Métriques système' }
          }
        }
      },
      '/api/cache/stats': {
        get: {
          summary: 'Statistiques Cache',
          tags: ['Cache'],
          responses: {
            200: {
              description: 'Stats du cache API',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    cache_stats: {
                      total_entries: 1250,
                      total_hits: 8340,
                      hit_rate: 85.2,
                      cache_size_mb: 12.5
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      { name: 'System', description: 'Endpoints système' },
      { name: 'Cache', description: 'Gestion du cache' }
    ]
  });
});

// 📊 Métriques Prometheus
app.get('/metrics', (c) => {
  try {
    // Générer métriques basiques si le service n'est pas disponible
    const metricsText = `# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total 0

# HELP cache_hit_rate Cache hit rate percentage
# TYPE cache_hit_rate gauge
cache_hit_rate 0
`;
    c.header('Content-Type', 'text/plain; version=0.0.4');
    return c.text(metricsText);
  } catch (error) {
    return c.text('# No metrics available yet\n');
  }
});

// 📈 Métriques JSON
app.get('/metrics/json', (c) => {
  return c.json({
    success: true,
    metrics: {
      counters: [],
      histograms: []
    },
    timestamp: new Date().toISOString()
  });
});

// ❤️ Health Check
app.get('/healthz', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.1.0'
  });
});

// ✅ Readiness Check
app.get('/readyz', async (c) => {
  const checks: Record<string, boolean> = {};

  // Vérifier DB
  try {
    await c.env.DB.prepare('SELECT 1').first();
    checks.database = true;
  } catch {
    checks.database = false;
  }

  // Vérifier API keys
  checks.openai = !!c.env.OPENAI_API_KEY;
  checks.anthropic = !!c.env.ANTHROPIC_API_KEY;

  const ready = Object.values(checks).every(check => check);

  return c.json({
    status: ready ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString()
  }, ready ? 200 : 503);
});

// ℹ️ System Info
app.get('/info', (c) => {
  return c.json({
    success: true,
    system: {
      version: '2.1.0',
      environment: c.env.ENVIRONMENT || 'production',
      features: {
        multi_expert_analysis: true,
        api_caching: true,
        batch_processing: true,
        video_analysis: !!c.env.OPENAI_API_KEY,
        metrics: true,
        documentation: true
      },
      experts: {
        openai_vision: !!c.env.OPENAI_API_KEY,
        claude_collection: !!c.env.ANTHROPIC_API_KEY,
        gemini_comparative: !!c.env.GEMINI_API_KEY
      }
    },
    timestamp: new Date().toISOString()
  });
});

// 💾 Cache Stats
app.get('/api/cache/stats', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_entries,
        SUM(hit_count) as total_hits,
        COUNT(CASE WHEN expires_at < datetime('now') THEN 1 END) as expired_entries,
        SUM(LENGTH(response_data)) / 1024.0 / 1024.0 as cache_size_mb
      FROM api_cache
    `).first();

    const hitRate = result.total_entries > 0
      ? (result.total_hits / result.total_entries) * 100
      : 0;

    const stats = {
      total_entries: result.total_entries || 0,
      total_hits: result.total_hits || 0,
      expired_entries: result.expired_entries || 0,
      cache_size_mb: Math.round((result.cache_size_mb || 0) * 100) / 100,
      hit_rate: Math.round(hitRate * 100) / 100
    };

    return c.json({
      success: true,
      cache_stats: stats,
      recommendations: {
        hit_rate_target: 80,
        current_performance: stats.hit_rate >= 80
          ? '✅ Excellent'
          : stats.hit_rate >= 60
            ? '⚠️ Bon'
            : '❌ À améliorer',
        estimated_savings: `${Math.round(stats.hit_rate)}% de réduction coûts API`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Impossible de récupérer les statistiques du cache',
        details: error.message
      },
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// 🧹 Cache Cleanup
app.post('/api/cache/cleanup', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      DELETE FROM api_cache
      WHERE expires_at < datetime('now')
    `).run();

    const deleted = result.meta?.changes || 0;

    return c.json({
      success: true,
      deleted_entries: deleted,
      message: `${deleted} entrées expirées supprimées`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Échec du nettoyage du cache',
        details: error.message
      },
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// 📝 Curl Examples
app.get('/examples', (c) => {
  const baseUrl = c.env.BASE_URL || 'http://localhost:3000';

  const examples = `
# ImageToValue API - Exemples Curl

## Health Check
curl ${baseUrl}/healthz

## Vérifier que tout est prêt
curl ${baseUrl}/readyz

## Voir les métriques
curl ${baseUrl}/metrics

## Stats du cache (JSON)
curl ${baseUrl}/api/cache/stats | jq

## Nettoyage du cache
curl -X POST ${baseUrl}/api/cache/cleanup

## Info système
curl ${baseUrl}/info

## Documentation interactive
open ${baseUrl}/docs
  `.trim();

  c.header('Content-Type', 'text/plain; charset=utf-8');
  return c.text(examples);
});

// 🧪 Page de test simple de l'API
app.get('/test-api', (c) => {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test API - ImageToValue</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2563eb; margin-bottom: 20px; }
        button { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; margin: 5px; }
        button:hover { background: #1d4ed8; }
        #result { margin-top: 20px; padding: 15px; background: #f0f9ff; border-left: 4px solid #2563eb; border-radius: 4px; font-family: monospace; white-space: pre-wrap; max-height: 400px; overflow-y: auto; }
        .success { color: #059669; font-weight: bold; }
        .error { color: #dc2626; font-weight: bold; }
        .info { color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Test API Backend</h1>
        <p class="info">Cette page teste directement l'API backend pour vérifier qu'elle fonctionne.</p>
        <div style="margin: 20px 0;">
            <button onclick="testHealth()">✅ Test Health</button>
            <button onclick="testGetItems()">📚 Lister les Livres</button>
            <button onclick="testImport()">➕ Importer un Livre</button>
            <button onclick="testCacheStats()">💾 Stats Cache</button>
        </div>
        <div id="result"></div>
    </div>
    <script>
        const resultDiv = document.getElementById('result');
        function showResult(title, data, isSuccess = true) {
            const className = isSuccess ? 'success' : 'error';
            resultDiv.innerHTML = \`<div class="\${className}">\${title}</div><div style="margin-top: 10px;">\${JSON.stringify(data, null, 2)}</div>\`;
        }
        function showError(title, error) {
            resultDiv.innerHTML = \`<div class="error">\${title}</div><div style="margin-top: 10px; color: #dc2626;">Erreur: \${error.message}</div>\`;
        }
        async function testHealth() {
            try {
                const response = await fetch('/healthz');
                const data = await response.json();
                showResult('✅ Health Check - SUCCÈS', data);
            } catch (error) {
                showError('❌ Health Check - ÉCHEC', error);
            }
        }
        async function testGetItems() {
            try {
                const response = await fetch('/api/items');
                const data = await response.json();
                if (data.success && data.items.length > 0) {
                    showResult(\`✅ \${data.items.length} livres trouvés !\`, data);
                } else if (data.success && data.items.length === 0) {
                    showResult('⚠️ API fonctionne mais aucun livre', data);
                } else {
                    showError('❌ Erreur lors de la récupération', new Error(data.error));
                }
            } catch (error) {
                showError("❌ Impossible de contacter l'API", error);
            }
        }
        async function testImport() {
            try {
                const response = await fetch('/api/import-item', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'Test - ' + new Date().toLocaleTimeString(), author: 'Test Author', category: 'books' })
                });
                const data = await response.json();
                if (data.success) {
                    showResult('✅ Import réussi !', data);
                    setTimeout(testGetItems, 500);
                } else {
                    showError('❌ Import échoué', new Error(data.error));
                }
            } catch (error) {
                showError("❌ Erreur lors de l'import", error);
            }
        }
        async function testCacheStats() {
            try {
                const response = await fetch('/api/cache/stats');
                const data = await response.json();
                showResult('✅ Stats du cache', data);
            } catch (error) {
                showError('❌ Erreur cache stats', error);
            }
        }
        window.onload = function() {
            resultDiv.innerHTML = "<div class='info'>Cliquez sur un bouton pour tester l'API...</div>";
            setTimeout(testGetItems, 500);
        };
    </script>
</body>
</html>`;

  c.header('Content-Type', 'text/html; charset=utf-8');
  return c.html(html);
});

// ============================================================================
// PHOTO ANALYSIS ROUTES (v2.2)
// ============================================================================

app.route('/api/photos', photosRouter);
app.route('/api/items', itemsRouter);
app.route('/api/monitoring', monitoringRouter);
app.route('/api/export', exportRoutes);

// ============================================================================
// BOOKS PAGE
// ============================================================================

app.get('/books', (c) => {
  c.header('Content-Type', 'text/html; charset=utf-8');
  return c.html(booksHtml);
});

// ============================================================================
// FIN DU CODE V2.1
// ============================================================================

export default app