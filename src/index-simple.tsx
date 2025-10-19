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

// Route pour servir app.js depuis public/
app.get('/app.js', async (c) => {
  // Le fichier app.js est maintenant dans public/
  return new Response(`
// Version simplifiée - redirection vers le fichier complet
console.log('Loading external app.js...');
  `, {
    headers: { 'Content-Type': 'application/javascript' }
  });
})

// Route principale - Interface simplifiée
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
        <style>{`
          .item-card { transition: all 0.2s ease; }
          .item-card:hover { transform: translateY(-2px); }
        `}</style>
      </head>
      <body className="bg-gray-50">
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
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Application en cours de chargement...</h2>
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Chargement des fonctionnalités avancées...</span>
            </div>
          </div>
        </div>

        <script src="/app.js"></script>
      </body>
    </html>
  )
})

export default app