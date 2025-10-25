 codex/add-export-csv-button-and-collection-selector-2025-10-25
import { Hono } from "hono";
import { cors } from "hono/cors";
import appScript from "../public/app.js?raw";
import helperScript from "../public/ui-helpers.mjs?raw";
import {
  SmartEvaluateRequestSchema,
  SmartEvaluateResponseSchema,
  SmartEvaluateResponse,
  AdvancedAnalysisRequestSchema,
} from "./schemas/evaluate.schema";
import {
  PhotoAnalyzeRequestSchema,
  PhotoAnalyzeResponseSchema,
  PhotosListResponseSchema,
  ItemsListResponseSchema,
  AdsGenerateRequestSchema,
  AdsGenerateResponseSchema,
  AdsExportResponseHeaders,
  PhotoRecordSchema,
  DetectedItem,
  PhotoRecord,
  InventoryItem,
  AdListing,
} from "./schemas/media.schema";


import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { MultiExpertAISystem } from './ai-experts'
import { photoBooksRouter } from './routes/photo-books';
import { photosRouter } from './routes/photos';
 main
// Types pour les bindings Cloudflare
type Bindings = {
  DB: D1Database;
  API_KEY?: string;
};

const API_VERSION = "2025.10.25";
const DEFAULT_API_KEY = "test-key";
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX = 10;

type CacheEntry = {
  response: SmartEvaluateResponse;
  createdAt: number;
  hits: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const evaluationCache = new Map<string, CacheEntry>();
const cacheStats = {
  totalEntries: 0,
  hits: 0,
  misses: 0,
};

const idempotencyStore = new Map<string, SmartEvaluateResponse>();
const rateLimitBuckets = new Map<string, RateLimitBucket>();
const metrics = {
  requestsTotal: 0,
  evaluationSuccessTotal: 0,
  evaluationFailureTotal: 0,
  rateLimitedTotal: 0,
  cacheHitTotal: 0,
};

const photoStore = new Map<string, PhotoRecord>();
const photoUrlIndex = new Map<string, string>();
const inventoryStore = new Map<string, InventoryItem>();
let latestAds: AdListing[] = [];

const demoPhotoSeed = {
  id: "photo-sample-0001",
  url: "https://images.pexels.com/photos/6474521/pexels-photo-6474521.jpeg",
  file_name: "IMG_2450.JPG",
  captured_at: new Date("2025-10-25T07:50:41.000Z").toISOString(),
  source: "iphone-15-pro",
  width: 3024,
  height: 4032,
  checksum: "sha256-aa12c0ed0f52",
  dominant_color: "#d6c4a8",
} satisfies Omit<PhotoRecord, "detected_items">;

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors());

const htmlDocument = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Évaluateur de Collection Pro</title>
    <script src="https://cdn.tailwindcss.com"></script>
 codex/add-export-csv-button-and-collection-selector-2025-10-25
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/css/all.min.css"
    />
  </head>
  <body class="bg-slate-50">
    <div id="root"></div>
    <script>window.__API_BASE__ = '';</script>
    <script type="module" src="/app.js"></script>
  </body>
</html>`;

    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
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

    <!-- ======= PAGE: BASE DE DONNÉES ========== -->
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
                            accept="image/*,video/*" 
                            class="hidden"
                        >
                        <span class="text-sm text-purple-600">
                            JPG, PNG, WebP, MP4, MOV • Max 10MB
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
 main

const normalizeAuthToken = (value?: string | null) => {
  if (!value) return "";
  if (!value.toLowerCase().startsWith("bearer ")) return "";
  return value.slice(7).trim();
};

const getCacheKey = (payload: any) => {
  const { mode, text_input, query, imageUrl, imageUrls, videoUrl, category } =
    payload;
  return JSON.stringify({
    mode,
    text_input,
    query,
    imageUrl,
    imageUrls,
    videoUrl,
    category,
  });
};

const ensureRateLimitBucket = (key: string) => {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const nextBucket: RateLimitBucket = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
    rateLimitBuckets.set(key, nextBucket);
    return nextBucket;
  }
  return bucket;
};

const computeProcessingTime = (seed: number, cached: boolean) => {
  if (cached) {
    return 80 + (seed % 20);
  }
  return 420 + (seed % 180);
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const chooseCategory = (input?: string, fallback: string = "Books") => {
  if (!input) return fallback;
  const normalized = input.toLowerCase();
  if (
    normalized.includes("vinyl") ||
    normalized.includes("beatles") ||
    normalized.includes("music")
  ) {
    return "Music";
  }
  if (normalized.includes("card") || normalized.includes("trading")) {
    return "Trading Cards";
  }
  if (normalized.includes("comic")) {
    return "Comics";
  }
  if (normalized.includes("game")) {
    return "Video Games";
  }
  if (normalized.includes("poster") || normalized.includes("art")) {
    return "Art";
  }
  return fallback;
};

const rarityLevels = [
  "common",
  "uncommon",
  "rare",
  "very_rare",
  "ultra_rare",
] as const;
const marketTrends = ["declining", "stable", "rising", "hot"] as const;
const demandLevels = ["low", "medium", "high", "very_high"] as const;

const inventoryConditions = [
  "Excellent",
  "Very Good",
  "Good",
  "Fair",
] as const;

const chooseFromList = <T,>(values: readonly T[], seed: number, offset = 0) => {
  if (values.length === 0) {
    throw new Error("values must not be empty");
  }
  const index = Math.abs(seed + offset) % values.length;
  return values[index];
};

const computeDominantColor = (hash: number) => {
  const normalized = (hash * 2654435761) >>> 0;
  const hex = normalized.toString(16).padStart(8, "0");
  return `#${hex.slice(0, 6)}`;
};

const extractFileName = (value: string) => {
  try {
    const parsed = new URL(value);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return "capture.jpg";
    }
    return segments[segments.length - 1];
  } catch (error) {
    return "capture.jpg";
  }
};

const ensurePhotoEntry = (
  payload: { imageUrl?: string | undefined; options?: { collectionId?: string | undefined } },
  hash: number,
  timestamp: string,
): PhotoRecord => {
  const imageUrl =
    payload.imageUrl ||
    `https://collections.local/assets/${hash.toString(16).padStart(8, "0")}.jpg`;

  const existingId = photoUrlIndex.get(imageUrl);
  if (existingId) {
    const existing = photoStore.get(existingId);
    if (existing) {
      const refreshed = {
        ...existing,
        captured_at: existing.captured_at || timestamp,
      };
      photoStore.set(existingId, refreshed);
      return refreshed;
    }
  }

  const width = 1200 + (hash % 600);
  const height = 900 + ((hash >> 3) % 600);
  const created = PhotoRecordSchema.parse({
    id: `photo-${hash.toString(16).slice(-6)}`,
    url: imageUrl,
    file_name: extractFileName(imageUrl),
    captured_at: timestamp,
    source: payload.options?.collectionId
      ? `collection:${payload.options.collectionId}`
      : "analyze-upload",
    width,
    height,
    checksum: `sha256-${hash.toString(16).padStart(8, "0")}`,
    dominant_color: computeDominantColor(hash),
    detected_items: [],
  });

  photoStore.set(created.id, created);
  photoUrlIndex.set(imageUrl, created.id);
  return created;
};

const buildDetectedItems = (
  photoId: string,
  seed: string,
  hash: number,
  limit: number,
): DetectedItem[] => {
  const count = Math.max(1, Math.min(limit, 5));
  const words = seed
    .replace(/https?:\/\//g, "")
    .split(/[\s-_]+/)
    .filter(Boolean);

  return Array.from({ length: count }, (_, index) => {
    const localHash = hashString(`${photoId}-${seed}-${index}`);
    const category = chooseFromList(
      ["Books", "Music", "Trading Cards", "Comics", "Collectibles"],
      localHash,
    );
    const condition = chooseFromList(inventoryConditions, localHash);
    const title =
      words.length > 0
        ? `${words[0][0]?.toUpperCase() || "I"}${words[0]?.slice(1) || "tem"} ${
            index + 1
          }`
        : `Item ${index + 1}`;
    const confidence = Math.min(0.95, 0.72 + (localHash % 20) / 100);
    const estimated = 90 + (localHash % 210);
    const rarity = rarityLevels[Math.abs(localHash) % rarityLevels.length];

    return {
      id: `${photoId}-item-${index + 1}`,
      title,
      author: words[1] ? words.slice(1).join(" ") : undefined,
      confidence: Number(confidence.toFixed(2)),
      estimated_value: Number(estimated.toFixed(2)),
      currency: "CAD",
      category,
      condition,
      rarity,
      bbox: {
        x: (localHash % 180) + 20,
        y: ((localHash >> 3) % 140) + 18,
        width: 180 + ((localHash >> 5) % 140),
        height: 220 + ((localHash >> 7) % 120),
      },
      notes:
        index === 0
          ? "Détection générée automatiquement depuis l'analyse locale"
          : undefined,
    } satisfies DetectedItem;
  });
};

const refreshInventory = (photo: PhotoRecord, detections: DetectedItem[], timestamp: string) => {
  for (const [id, item] of inventoryStore.entries()) {
    if (item.photo_id === photo.id) {
      inventoryStore.delete(id);
    }
  }

  detections.forEach((detection) => {
    const entry: InventoryItem = {
      id: detection.id,
      photo_id: photo.id,
      title: detection.title,
      author: detection.author,
      category: detection.category,
      confidence: detection.confidence,
      estimated_value: detection.estimated_value,
      currency: detection.currency,
      condition: detection.condition,
      rarity: detection.rarity,
      last_seen_at: timestamp,
    };
    inventoryStore.set(entry.id, entry);
  });
};

const seedDemoData = () => {
  const basePhoto = PhotoRecordSchema.parse({
    ...demoPhotoSeed,
    detected_items: [],
  });

  const detections: DetectedItem[] = [
    {
      id: `${basePhoto.id}-item-1`,
      title: "Atlas du Québec ancien",
      author: "Collectif régional",
      confidence: 0.92,
      estimated_value: 185.5,
      currency: "CAD",
      category: "Books",
      condition: "Very Good",
      rarity: "rare",
      bbox: { x: 420, y: 280, width: 640, height: 860 },
      notes: "Échantillon local pré-rempli pour la démo hors-ligne.",
    },
    {
      id: `${basePhoto.id}-item-2`,
      title: "Guide de reliure artisanale 1978",
      author: "Atelier de Québec",
      confidence: 0.84,
      estimated_value: 95.25,
      currency: "CAD",
      category: "Books",
      condition: "Good",
      rarity: "uncommon",
      bbox: { x: 1280, y: 320, width: 620, height: 780 },
      notes: "Détection simulée pour illustrer la valeur estimée.",
    },
  ];

  const enrichedPhoto: PhotoRecord = {
    ...basePhoto,
    detected_items: detections,
  };

  photoStore.set(enrichedPhoto.id, enrichedPhoto);
  photoUrlIndex.set(enrichedPhoto.url, enrichedPhoto.id);
  refreshInventory(enrichedPhoto, detections, enrichedPhoto.captured_at);
};

seedDemoData();

const computeInventoryStats = () => {
  const items = Array.from(inventoryStore.values());
  const totalValue = items.reduce((sum, item) => sum + item.estimated_value, 0);
  return {
    items,
    totalValue: Number(totalValue.toFixed(2)),
  };
};

const buildAdsFromInventory = (minValue: number): AdListing[] => {
  const eligible = Array.from(inventoryStore.values()).filter(
    (item) => item.estimated_value >= minValue,
  );
  return eligible.map((item) => {
    const photo = photoStore.get(item.photo_id);
    const markup = item.estimated_value * 1.18;
    return {
      id: `ad-${item.id}`,
      title: `${item.title} (${item.condition})`,
      price: Number(markup.toFixed(2)),
      currency: item.currency,
      description: `Annonce générée automatiquement pour ${item.title} évalué à ${
        item.estimated_value
      } ${item.currency}. Rareté ${item.rarity}.`,
      photo_url: photo?.url,
      tags: [item.category.toLowerCase(), item.rarity, item.condition.toLowerCase()],
    } satisfies AdListing;
  });
};

const buildAdsCsv = (ads: AdListing[]) => {
  const header = ["id", "title", "price", "currency", "description", "photo_url", "tags"];
  const rows = ads.map((ad) => {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const cells = [
      ad.id,
      ad.title,
      ad.price.toFixed(2),
      ad.currency,
      ad.description,
      ad.photo_url ?? "",
      ad.tags.join("|") || "",
    ];
    return cells.map(escape).join(",");
  });
  return [header.join(","), ...rows].join("\n");
};

const buildEvaluationResponse = (
  payload: any,
  options: { cached: boolean; requestId: string },
): SmartEvaluateResponse => {
  const baseText =
    payload.text_input ||
    payload.query ||
    payload.imageUrl ||
    "collection-item";
  const hash = hashString(baseText);
  const category = payload.category || chooseCategory(baseText);
  const rarity = rarityLevels[hash % rarityLevels.length];
  const evaluations = [0, 1, 2].map((index) => ({
    evaluation_source: ["WorthPoint", "eBay", "Google Books"][index],
    estimated_value: Math.round(120 + (hash % 40) * (index + 1)),
    currency: index === 1 ? "USD" : "CAD",
    confidence_score: Math.min(0.95, 0.55 + index * 0.15),
    similar_items_count: 12 + index * 3,
  }));

  const smartResponse: SmartEvaluateResponse = {
    success: true,
    smart_analysis: {
      category,
      confidence: 0.62 + (hash % 20) / 100,
      extracted_data: {
        title:
          baseText.replace(/\s+/g, " ").trim().slice(0, 120) ||
          "Item de collection",
        artist_author:
          payload.category === "Music" ? "Unknown Artist" : "Auteur inconnu",
        year: 1950 + (hash % 70),
        condition: ["Good", "Very Good", "Excellent"][hash % 3] as any,
        format: payload.mode === "image" ? "Photo" : "Texte",
      },
      estimated_rarity: rarity,
      search_queries: [
        `${baseText} rare sale`,
        `${category} appraisal ${new Date().getFullYear()}`,
        `${baseText} valeur`,
      ],
    },
    evaluations,
    market_insights: {
      rarity_assessment: rarity,
      market_trend: marketTrends[hash % marketTrends.length],
      estimated_demand: demandLevels[hash % demandLevels.length],
    },
    suggested_improvements: [
      "Ajouter plus de photos haute résolution",
      "Documenter la provenance pour améliorer la valeur",
      "Comparer avec les ventes récentes",
    ],
    cached: options.cached,
    processing_time_ms: computeProcessingTime(hash, options.cached),
    request_id: options.requestId,
    timestamp: new Date().toISOString(),
  };

  return SmartEvaluateResponseSchema.parse(smartResponse);
};

const unauthorizedResponse = (requestId: string) => ({
  success: false,
  error: {
    code: "UNAUTHORIZED",
    message: "Jeton API invalide ou manquant",
    request_id: requestId,
  },
  timestamp: new Date().toISOString(),
});

const invalidInputResponse = (
  requestId: string,
  message: string,
  details?: any,
) => ({
  success: false,
  error: {
    code: "INVALID_INPUT",
    message,
    request_id: requestId,
    details,
  },
  timestamp: new Date().toISOString(),
});

const rateLimitedResponse = (requestId: string) => ({
  success: false,
  error: {
    code: "RATE_LIMITED",
    message: "Trop de requêtes. Réessayez plus tard.",
    request_id: requestId,
  },
  timestamp: new Date().toISOString(),
});

app.get("/", (c) => c.html(htmlDocument));

app.get(
  "/app.js",
  () =>
    new Response(appScript, {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    }),
);

app.get(
  "/ui-helpers.mjs",
  () =>
    new Response(helperScript, {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    }),
);

app.get("/healthz", (c) =>
  c.json({
    status: "healthy",
    version: API_VERSION,
    timestamp: new Date().toISOString(),
  }),
);

app.get("/readyz", (c) =>
  c.json({
    status: "ready",
    checks: {
      database: {
        status: c.env.DB ? "connected" : "mocked",
        latency_ms: 3,
      },
    },
    timestamp: new Date().toISOString(),
  }),
);

app.get("/metrics", (c) => {
  const lines = [
    "# HELP app_requests_total Total HTTP requests",
    "# TYPE app_requests_total counter",
    `app_requests_total ${metrics.requestsTotal}`,
    "# HELP app_evaluation_success_total Successful smart evaluations",
    "# TYPE app_evaluation_success_total counter",
    `app_evaluation_success_total ${metrics.evaluationSuccessTotal}`,
    "# HELP app_evaluation_failure_total Failed smart evaluations",
    "# TYPE app_evaluation_failure_total counter",
    `app_evaluation_failure_total ${metrics.evaluationFailureTotal}`,
    "# HELP app_rate_limited_total Rate limited requests",
    "# TYPE app_rate_limited_total counter",
    `app_rate_limited_total ${metrics.rateLimitedTotal}`,
    "# HELP app_cache_hit_total Cache hits for evaluations",
    "# TYPE app_cache_hit_total counter",
    `app_cache_hit_total ${metrics.cacheHitTotal}`,
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
});

app.get("/openapi.json", (c) =>
  c.json({
    openapi: "3.1.0",
    info: {
      title: "Évaluateur de Collection Pro API",
      version: API_VERSION,
      description:
        "API interne pour orchestrer les évaluations IA et la gestion de cache.",
    },
    paths: {
      "/api/smart-evaluate": {
        post: {
          summary: "Lance une évaluation IA smart",
          responses: {
            200: {
              description: "Résultat IA",
            },
            400: { description: "Erreur de validation" },
            401: { description: "Authentification requise" },
          },
        },
      },
      "/api/advanced-analysis": {
        post: {
          summary: "Analyse multi-expert détaillée",
        },
      },
      "/api/cache/stats": {
        get: {
          summary: "Statistiques du cache",
        },
      },
      "/api/photos": {
        get: {
          summary: "Liste les photos analysées",
        },
      },
      "/api/photos/analyze": {
        post: {
          summary: "Analyse une photo et détecte les items",
        },
      },
      "/api/items": {
        get: {
          summary: "Inventaire des items détectés",
        },
      },
      "/api/ads/generate": {
        post: {
          summary: "Génère des annonces marketing",
        },
      },
      "/api/ads/export": {
        get: {
          summary: "Export CSV des annonces générées",
        },
      },
    },
  }),
);

const authenticate = (c: any) => {
  const provided = normalizeAuthToken(c.req.header("Authorization"));
  const expected = c.env.API_KEY || DEFAULT_API_KEY;
  if (!provided || provided !== expected) {
    return false;
  }
  return true;
};

const applyRateLimiting = (key: string) => {
  const bucket = ensureRateLimitBucket(key);
  bucket.count += 1;
  return bucket;
};

app.get("/api/cache/stats", (c) => {
  const requestId = crypto.randomUUID();
  if (!authenticate(c)) {
    return c.json(unauthorizedResponse(requestId), 401);
  }

  const totalRequests = cacheStats.hits + cacheStats.misses;
  const hitRate = totalRequests === 0 ? 0 : cacheStats.hits / totalRequests;

  return c.json({
    success: true,
    cache_stats: {
      total_entries: cacheStats.totalEntries,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hit_rate: Number(hitRate.toFixed(2)),
    },
    request_id: requestId,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/photos", (c) => {
  metrics.requestsTotal += 1;
  const photos = Array.from(photoStore.values()).sort((a, b) =>
    a.captured_at > b.captured_at ? -1 : 1,
  );
  const payload = PhotosListResponseSchema.parse({
    success: true,
    photos,
    stats: {
      total_photos: photos.length,
      last_photo_at: photos.length > 0 ? photos[0].captured_at : null,
    },
    timestamp: new Date().toISOString(),
  });
  return c.json(payload);
});

app.get("/api/items", (c) => {
  metrics.requestsTotal += 1;
  const { items, totalValue } = computeInventoryStats();
  const sorted = [...items].sort((a, b) => b.estimated_value - a.estimated_value);
  const payload = ItemsListResponseSchema.parse({
    success: true,
    items: sorted,
    stats: {
      total_items: sorted.length,
      total_value: totalValue,
      currency: "CAD",
    },
    timestamp: new Date().toISOString(),
  });
  return c.json(payload);
});

app.post("/api/photos/analyze", async (c) => {
  metrics.requestsTotal += 1;
  const requestId = crypto.randomUUID();
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch (error) {
    return c.json(
      invalidInputResponse(requestId, "Requête JSON invalide", {
        error: "JSON.parse",
      }),
      400,
    );
  }

  const parsed = PhotoAnalyzeRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json(
      invalidInputResponse(
        requestId,
        "Le payload de l'analyse photo ne respecte pas le schéma attendu",
        parsed.error.flatten(),
      ),
      400,
    );
  }

  const request = parsed.data;
  const now = new Date().toISOString();
  const fingerprint = request.imageUrl || request.imageBase64!;
  const hash = hashString(fingerprint);
  const photo = ensurePhotoEntry(request, hash, now);
  const detections = buildDetectedItems(
    photo.id,
    fingerprint,
    hash,
    request.options?.maxItems ?? 5,
  );
  const updatedPhoto: PhotoRecord = {
    ...photo,
    captured_at: photo.captured_at || now,
    detected_items: detections,
  };
  photoStore.set(updatedPhoto.id, updatedPhoto);
  refreshInventory(updatedPhoto, detections, now);

  const response = PhotoAnalyzeResponseSchema.parse({
    success: true,
    photo: updatedPhoto,
    stats: {
      detected_items: detections.length,
      processing_time_ms: 180 + (hash % 120),
    },
    request_id: requestId,
    timestamp: now,
  });

  return c.json(response);
});

app.post("/api/ads/generate", async (c) => {
  metrics.requestsTotal += 1;
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch (error) {
    payload = {};
  }

  const parsed = AdsGenerateRequestSchema.safeParse(payload ?? {});
  if (!parsed.success) {
    const requestId = crypto.randomUUID();
    return c.json(
      invalidInputResponse(
        requestId,
        "Le payload de génération d'annonces est invalide",
        parsed.error.flatten(),
      ),
      400,
    );
  }

 codex/add-export-csv-button-and-collection-selector-2025-10-25
  const minValue = parsed.data.min_value;
  const ads = buildAdsFromInventory(minValue);
  latestAds = ads;
  const response = AdsGenerateResponseSchema.parse({
    success: true,
    ads,
    generated_at: new Date().toISOString(),
  });

  return c.json(response);
});

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
 main

app.get("/api/ads/export", () => {
  metrics.requestsTotal += 1;
  const csv = buildAdsCsv(latestAds);
  return new Response(csv, {
    headers: AdsExportResponseHeaders,
  });
});

 codex/add-export-csv-button-and-collection-selector-2025-10-25
app.post("/api/smart-evaluate", async (c) => {
  metrics.requestsTotal += 1;
  const requestId = crypto.randomUUID();

  if (!authenticate(c)) {
    metrics.evaluationFailureTotal += 1;
    return c.json(unauthorizedResponse(requestId), 401);
  }

  const apiKey =
    normalizeAuthToken(c.req.header("Authorization")) || DEFAULT_API_KEY;
  const bucket = applyRateLimiting(apiKey);
  const remaining = Math.max(0, RATE_LIMIT_MAX - bucket.count);
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
  };

  if (bucket.count > RATE_LIMIT_MAX) {
    metrics.rateLimitedTotal += 1;
    return c.json(rateLimitedResponse(requestId), 429, {
      ...headers,
      "Retry-After": String(Math.ceil((bucket.resetAt - Date.now()) / 1000)),

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
 main
    });
  }

  let payload;
  try {
    payload = await c.req.json();
  } catch (error) {
    metrics.evaluationFailureTotal += 1;
    return c.json(
      invalidInputResponse(requestId, "Requête JSON invalide"),
      400,
      headers,
    );
  }

  const parsed = SmartEvaluateRequestSchema.safeParse(payload);
  if (!parsed.success) {
    metrics.evaluationFailureTotal += 1;
    return c.json(
      invalidInputResponse(
        requestId,
        "Le payload ne respecte pas le schéma attendu",
        parsed.error.flatten(),
      ),
      400,
      headers,
    );
  }

  const idempotencyKey = c.req.header("X-Idempotency-Key");
  if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
    const stored = idempotencyStore.get(idempotencyKey)!;
    headers["X-Idempotent-Replay"] = "true";
    metrics.cacheHitTotal += 1;
    return c.json(stored, 200, headers);
  }

  const requestPayload = parsed.data;
  const useCache = requestPayload.options?.useCache !== false;
  const cacheKey = getCacheKey(requestPayload);
  const cachedEntry = useCache ? evaluationCache.get(cacheKey) : undefined;

  let response: SmartEvaluateResponse;
  if (cachedEntry && useCache) {
    cacheStats.hits += 1;
    cachedEntry.hits += 1;
    metrics.cacheHitTotal += 1;
    response = {
      ...cachedEntry.response,
      cached: true,
      processing_time_ms: computeProcessingTime(hashString(cacheKey), true),
      timestamp: new Date().toISOString(),
    };
  } else {
    cacheStats.misses += 1;
    response = buildEvaluationResponse(requestPayload, {
      cached: false,
      requestId: idempotencyKey || requestId,
    });
    if (useCache) {
      evaluationCache.set(cacheKey, {
        response,
        createdAt: Date.now(),
        hits: 0,
      });
 codex/add-export-csv-button-and-collection-selector-2025-10-25
      cacheStats.totalEntries = evaluationCache.size;


      if (response.data.success) {
        this.displayAdvancedAnalysisResult(response.data.analysis);
        this.showNotification('✅ Analyse avancée terminée !', 'success');
      } else {
        this.showNotification('❌ Erreur analyse avancée', 'error');
      }
    } catch (error) {
      console.error('Erreur analyse avancée:', error);
      this.showNotification('❌ Erreur lors de l\\'analyse avancée', 'error');
 main
    }
  }

  metrics.evaluationSuccessTotal += 1;

  if (idempotencyKey) {
    idempotencyStore.set(idempotencyKey, response);
    headers["X-Idempotent-Replay"] = "false";
  }
 codex/add-export-csv-button-and-collection-selector-2025-10-25


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
      // Recharger les photos pour la galerie
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
}

// Initialisation
window.addEventListener('DOMContentLoaded', () => {
  window.app = new CollectionEvaluator();
});
    </script>
</body>
</html>`;
 main

  return c.json(response, 200, headers);
});

app.post("/api/advanced-analysis", async (c) => {
  metrics.requestsTotal += 1;
  const requestId = crypto.randomUUID();

  if (!authenticate(c)) {
    metrics.evaluationFailureTotal += 1;
    return c.json(unauthorizedResponse(requestId), 401);
  }

 codex/add-export-csv-button-and-collection-selector-2025-10-25
  let payload;
  try {
    payload = await c.req.json();
  } catch (error) {
    metrics.evaluationFailureTotal += 1;
    return c.json(
      invalidInputResponse(requestId, "Requête JSON invalide"),
      400,

// API: Lister les items
app.get('/api/items', async (c) => {
  const { DB } = c.env;

  try {
    // Paramètres de pagination
    const page = parseInt(c.req.query('page') || '1');
    const per_page = parseInt(c.req.query('per_page') || '20');
    const offset = (page - 1) * per_page;

    // Compter le total
    const countResult = await DB.prepare('SELECT COUNT(*) as total FROM collection_items').first();
    const total = countResult.total || 0;

    // Récupérer les items
    const items = await DB.prepare(`
      SELECT id, title, description, category, primary_image_url, processing_status, created_at
      FROM collection_items
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(per_page, offset).all();

    return c.json({
      success: true,
      items: items.results || [],
      pagination: {
        page,
        per_page,
        total,
        pages: Math.ceil(total / per_page)
      }
    });
  } catch (error: any) {
    console.error('❌ Erreur listing items:', error);
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
 main
    );
  }

  const parsed = AdvancedAnalysisRequestSchema.safeParse(payload);
  if (!parsed.success) {
    metrics.evaluationFailureTotal += 1;
    return c.json(
      invalidInputResponse(
        requestId,
        "Le payload ne respecte pas le schéma attendu",
        parsed.error.flatten(),
      ),
      400,
    );
  }

 codex/add-export-csv-button-and-collection-selector-2025-10-25
  const seedText = parsed.data.text_input || parsed.data.query || "analysis";
  const hash = hashString(seedText);
  const expertDetails = ["vision", "claude", "gemini"].map((expert, index) => ({
    expert: expert as "vision" | "claude" | "gemini",
    confidence: 0.6 + index * 0.1,
    payload: {
      notes: `${expert} analysis for ${seedText}`,
      comparable_sales: [`${seedText} sale ${index + 1}`],
    },
    latency_ms: 300 + index * 40,
  }));

  const response = {
    success: true,
    consolidated_analysis: {
      expert_consensus: 70 + (hash % 20),
      estimated_value: {
        min: 120,
        max: 320,
        average: 220,
        currency: "CAD",
      },
      rarity: rarityLevels[hash % rarityLevels.length],
      category: chooseCategory(seedText),
    },
    expert_details: parsed.data.include_expert_details ? expertDetails : [],
    request_id: requestId,
    timestamp: new Date().toISOString(),
  };

  metrics.evaluationSuccessTotal += 1;
  return c.json(response);
});

export default app;

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

// ============================================================================
// FIN DU CODE V2.1
// ============================================================================

export default app
 main
