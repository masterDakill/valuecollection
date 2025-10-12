-- Évaluateur de Collection Pro - Schéma de base de données
-- Base de données optimisée pour gérer 2500+ items avec évaluations multiples

-- Table principale des collections
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  owner_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des items/objets de collection
CREATE TABLE IF NOT EXISTS collection_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- books, comics, cards, vintage, art, etc.
  subcategory TEXT, -- baseball_cards, pokemon, first_edition, etc.
  
  -- Identifiants externes
  isbn TEXT, -- pour les livres
  upc_code TEXT, -- codes universels
  barcode TEXT,
  serial_number TEXT,
  
  -- Métadonnées physiques
  condition_grade TEXT, -- mint, near_mint, excellent, good, poor
  year_made INTEGER,
  manufacturer TEXT,
  material TEXT,
  dimensions TEXT, -- "10x15x2 cm"
  weight_grams INTEGER,
  
  -- Métadonnées média
  primary_image_url TEXT,
  additional_images TEXT, -- JSON array des URLs d'images supplémentaires
  video_url TEXT,
  thumbnail_url TEXT,
  
  -- Statut de traitement
  processing_status TEXT DEFAULT 'uploaded', -- uploaded, processing, completed, error
  ai_analyzed BOOLEAN DEFAULT FALSE,
  last_evaluation_date DATETIME,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

-- Table des évaluations de prix provenant des différentes API
CREATE TABLE IF NOT EXISTS price_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  
  -- Source de l'évaluation
  evaluation_source TEXT NOT NULL, -- ebay, worthpoint, sportscardspro, amazon, google_books, etc.
  api_response_id TEXT, -- ID de la réponse API pour traçabilité
  
  -- Données de prix
  estimated_value DECIMAL(10,2),
  currency TEXT DEFAULT 'CAD',
  price_range_min DECIMAL(10,2),
  price_range_max DECIMAL(10,2),
  
  -- Contexte de l'évaluation
  condition_matched TEXT, -- condition utilisée pour l'évaluation
  similar_items_count INTEGER, -- nombre d'items similaires trouvés
  confidence_score DECIMAL(3,2), -- 0.0 à 1.0, confiance dans l'évaluation
  
  -- Métadonnées de l'évaluation
  evaluation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE, -- pour désactiver anciennes évaluations
  
  -- Données brutes de l'API (JSON)
  raw_api_data TEXT, -- stockage JSON de la réponse complète
  
  FOREIGN KEY (item_id) REFERENCES collection_items(id) ON DELETE CASCADE
);

-- Table des ventes récentes trouvées (pour historique des prix)
CREATE TABLE IF NOT EXISTS recent_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  
  -- Informations de la vente
  sale_platform TEXT NOT NULL, -- ebay, mercari, facebook_marketplace, etc.
  sale_date DATETIME,
  sale_price DECIMAL(10,2),
  currency TEXT DEFAULT 'CAD',
  
  -- Détails de l'item vendu
  sold_condition TEXT,
  sold_title TEXT,
  sold_description TEXT,
  sold_item_url TEXT,
  
  -- Pertinence de la comparaison
  similarity_score DECIMAL(3,2), -- 0.0 à 1.0
  verified_sale BOOLEAN DEFAULT FALSE, -- vente confirmée vs listing
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (item_id) REFERENCES collection_items(id) ON DELETE CASCADE
);

-- Table pour l'analyse IA des images/vidéos
CREATE TABLE IF NOT EXISTS ai_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  
  -- Résultats de l'analyse IA
  detected_objects TEXT, -- JSON array des objets détectés
  text_extracted TEXT, -- texte extrait de l'image (OCR)
  colors_dominant TEXT, -- JSON des couleurs dominantes
  image_quality_score DECIMAL(3,2), -- qualité de l'image pour évaluation
  
  -- Classification automatique
  suggested_category TEXT,
  suggested_subcategory TEXT,
  confidence_category DECIMAL(3,2),
  
  -- Informations techniques
  analysis_model TEXT, -- modèle IA utilisé
  analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  processing_time_ms INTEGER,
  
  FOREIGN KEY (item_id) REFERENCES collection_items(id) ON DELETE CASCADE
);

-- Table des logs d'activité et erreurs
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER,
  
  -- Type d'activité
  action_type TEXT NOT NULL, -- upload, analysis, evaluation, error
  action_description TEXT,
  
  -- Résultat
  status TEXT NOT NULL, -- success, warning, error
  error_message TEXT,
  
  -- Contexte
  user_agent TEXT,
  ip_address TEXT,
  session_id TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (item_id) REFERENCES collection_items(id) ON DELETE SET NULL
);

-- Index pour optimiser les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_category ON collection_items(category);
CREATE INDEX IF NOT EXISTS idx_collection_items_status ON collection_items(processing_status);
CREATE INDEX IF NOT EXISTS idx_collection_items_isbn ON collection_items(isbn) WHERE isbn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collection_items_barcode ON collection_items(barcode) WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_price_evaluations_item_id ON price_evaluations(item_id);
CREATE INDEX IF NOT EXISTS idx_price_evaluations_source ON price_evaluations(evaluation_source);
CREATE INDEX IF NOT EXISTS idx_price_evaluations_active ON price_evaluations(item_id, is_active);
CREATE INDEX IF NOT EXISTS idx_price_evaluations_date ON price_evaluations(evaluation_date);

CREATE INDEX IF NOT EXISTS idx_recent_sales_item_id ON recent_sales(item_id);
CREATE INDEX IF NOT EXISTS idx_recent_sales_platform ON recent_sales(sale_platform);
CREATE INDEX IF NOT EXISTS idx_recent_sales_date ON recent_sales(sale_date);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_item_id ON ai_analysis(item_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_item_id ON activity_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(created_at);