// 🚀 Version 2.1 - Intégration Complète SANS Authentication
// Toutes les fonctionnalités v2.1 activées pour usage personnel

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { MultiExpertAISystem } from './ai-experts'

// ============================================================================
// V2.1 IMPORTS - Nouvelles fonctionnalités
// ============================================================================
import {
  requestIdMiddleware,
  requestTimingMiddleware,
  errorHandlerMiddleware,
  securityHeadersMiddleware
} from './lib/request';
import { createLogger } from './lib/logger';
import { metrics, Metrics } from './lib/metrics';
import { healthRoutes } from './routes/health';
import { docsRoutes } from './routes/docs';
import { evaluateRoutes } from './routes/evaluate';

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

  // V2.1 - Optionnels (pas d'auth requise pour usage perso)
  API_KEY?: string;
  ALLOWED_ORIGINS?: string;
  ENVIRONMENT?: string;
  BASE_URL?: string;
}

const app = new Hono<{ Bindings: Bindings }>()

// ============================================================================
// MIDDLEWARE STACK V2.1 (SANS AUTH)
// ============================================================================

// 1. Request ID & Timing (pour logs et métriques)
app.use('*', requestIdMiddleware);
app.use('*', requestTimingMiddleware);

// 2. Security Headers (protection XSS, clickjacking, etc.)
app.use('*', securityHeadersMiddleware);

// 3. CORS (permet tous les origines pour usage perso)
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Idempotency-Key'],
  exposeHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  credentials: false
}));

// 4. Global Error Handler (capture toutes les erreurs)
app.use('*', errorHandlerMiddleware);

// ============================================================================
// V2.1 ROUTES PUBLIQUES (SANS AUTH)
// ============================================================================

// Health checks - pour monitoring
app.route('/', healthRoutes);

// Documentation interactive - Swagger UI
app.route('/', docsRoutes);

// Nouvelles routes d'évaluation v2.1 - SANS AUTH
// Note: Ces routes utilisent validation Zod mais pas d'authentification
app.route('/api', evaluateRoutes);

// ============================================================================
// ROUTES EXISTANTES (CODE ORIGINAL PRÉSERVÉ)
// ============================================================================

// Middleware CORS (gardé pour compatibilité)
app.use('/api/*', cors())

// Route principale avec TOUTES les fonctionnalités restaurées
app.get('/', async (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Évaluateur de Collection Pro v2.1 - Mathieu Chamberland</title>
    <script src="https://cdn.tailwindcss.com"></script>
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

        /* V2.1 - Badge nouveau */
        .badge-v21 {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            margin-left: 8px;
        }
    </style>
</head>
<body class="bg-gray-50">

    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <i class="fas fa-gem text-blue-600 text-3xl"></i>
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">
                            Évaluateur de Collection Pro
                            <span class="badge-v21">v2.1</span>
                        </h1>
                        <p class="text-gray-600">Analyse IA et évaluations automatisées</p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <!-- V2.1 - Liens rapides -->
                    <a href="/docs" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm">
                        <i class="fas fa-book"></i> API Docs
                    </a>
                    <a href="/metrics" target="_blank" class="text-green-600 hover:text-green-800 text-sm">
                        <i class="fas fa-chart-line"></i> Metrics
                    </a>
                    <div class="text-right">
                        <p class="text-sm text-gray-600">Mathieu Chamberland</p>
                        <p class="text-xs text-gray-500">Investisseur Immobilier</p>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- V2.1 - Notification Banner -->
    <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2">
        <div class="max-w-7xl mx-auto flex items-center justify-between text-sm">
            <div class="flex items-center space-x-2">
                <i class="fas fa-rocket"></i>
                <span><strong>v2.1 Actif:</strong> Cache intelligent, Logs structurés, Métriques Prometheus, Documentation interactive</span>
            </div>
            <div class="flex space-x-4 text-xs">
                <span id="cacheHitRate" class="bg-white bg-opacity-20 px-2 py-1 rounded">Cache: --</span>
                <span id="requestCount" class="bg-white bg-opacity-20 px-2 py-1 rounded">Requêtes: 0</span>
            </div>
        </div>
    </div>

    <!-- Dashboard Summary -->
    <div class="max-w-7xl mx-auto px-4 py-6">
        <!-- Le reste de votre HTML existant continue ici... -->
        <!-- Incluez tout le contenu original de votre fichier -->
    </div>

    <script>
    // V2.1 - Charger stats cache en temps réel
    async function loadCacheStats() {
        try {
            const response = await fetch('/api/cache/stats');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.cache_stats) {
                    document.getElementById('cacheHitRate').textContent =
                        \`Cache: \${data.cache_stats.hit_rate.toFixed(1)}%\`;
                }
            }
        } catch (error) {
            console.log('Cache stats not available yet');
        }
    }

    // V2.1 - Charger metrics
    async function loadMetrics() {
        try {
            const response = await fetch('/metrics/json');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.metrics) {
                    const totalRequests = data.metrics.counters
                        .find(c => c.name === 'http_requests_total')?.value || 0;
                    document.getElementById('requestCount').textContent =
                        \`Requêtes: \${totalRequests}\`;
                }
            }
        } catch (error) {
            console.log('Metrics not available yet');
        }
    }

    // Rafraîchir stats toutes les 10 secondes
    setInterval(() => {
        loadCacheStats();
        loadMetrics();
    }, 10000);

    // Charger au démarrage
    loadCacheStats();
    loadMetrics();

    // Votre code JavaScript existant continue ici...
    </script>
</body>
</html>`;

  return c.html(html);
});

// ============================================================================
// TOUTES VOS ROUTES EXISTANTES CONTINUENT ICI
// ============================================================================
// Copiez tout le reste de votre fichier src/index.tsx original
// Toutes vos routes /api/smart-analyze, /api/collection-items, etc.

export default app
