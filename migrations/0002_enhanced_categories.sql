-- Migration pour support des nouvelles catégories et fonctionnalités avancées

-- Ajouter nouvelles colonnes pour média enrichis
ALTER TABLE collection_items ADD COLUMN video_url TEXT;
ALTER TABLE collection_items ADD COLUMN additional_videos TEXT; -- JSON array des URLs vidéos
ALTER TABLE collection_items ADD COLUMN extracted_text TEXT; -- Texte extrait par OCR/IA
ALTER TABLE collection_items ADD COLUMN rarity_score INTEGER DEFAULT 0; -- Score de rareté 0-100
ALTER TABLE collection_items ADD COLUMN market_demand TEXT CHECK(market_demand IN ('high', 'medium', 'low'));

-- Ajouter métadonnées spécialisées selon type
ALTER TABLE collection_items ADD COLUMN format_details TEXT; -- LP, CD, hardcover, etc.
ALTER TABLE collection_items ADD COLUMN catalog_number TEXT; -- Numéro de catalogue
ALTER TABLE collection_items ADD COLUMN matrix_number TEXT; -- Numéro matrice vinyles
ALTER TABLE collection_items ADD COLUMN label_name TEXT; -- Label/éditeur spécialisé
ALTER TABLE collection_items ADD COLUMN edition_details TEXT; -- Détails édition
ALTER TABLE collection_items ADD COLUMN pressing_info TEXT; -- Info pressage (first, reissue, etc.)

-- Index pour les nouvelles colonnes de recherche
CREATE INDEX IF NOT EXISTS idx_collection_items_catalog_number ON collection_items(catalog_number) WHERE catalog_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collection_items_label_name ON collection_items(label_name) WHERE label_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collection_items_format ON collection_items(format_details) WHERE format_details IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collection_items_rarity ON collection_items(rarity_score) WHERE rarity_score > 0;

-- Table pour les identifiants externes multiples
CREATE TABLE IF NOT EXISTS external_identifiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  
  -- Type d'identifiant
  identifier_type TEXT NOT NULL, -- isbn_10, isbn_13, discogs_id, musicbrainz_id, upc, ean, etc.
  identifier_value TEXT NOT NULL,
  
  -- Métadonnées
  source TEXT, -- Source qui a fourni cet identifiant
  confidence DECIMAL(3,2), -- Confiance dans l'identifiant
  verified BOOLEAN DEFAULT FALSE, -- Identifiant vérifié manuellement
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (item_id) REFERENCES collection_items(id) ON DELETE CASCADE,
  UNIQUE(item_id, identifier_type, identifier_value)
);

CREATE INDEX IF NOT EXISTS idx_external_identifiers_item_id ON external_identifiers(item_id);
CREATE INDEX IF NOT EXISTS idx_external_identifiers_type ON external_identifiers(identifier_type);
CREATE INDEX IF NOT EXISTS idx_external_identifiers_value ON external_identifiers(identifier_value);

-- Table pour les requêtes de recherche utilisées
CREATE TABLE IF NOT EXISTS search_queries_used (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  
  -- Requête et source
  search_query TEXT NOT NULL,
  evaluation_source TEXT NOT NULL,
  
  -- Résultats
  results_found INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT FALSE,
  
  -- Performance
  response_time_ms INTEGER,
  api_calls_made INTEGER DEFAULT 1,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (item_id) REFERENCES collection_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_search_queries_item_id ON search_queries_used(item_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_source ON search_queries_used(evaluation_source);

-- Table pour le cache des résultats API externes
CREATE TABLE IF NOT EXISTS api_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Clé de cache (hash de la requête)
  cache_key TEXT UNIQUE NOT NULL,
  
  -- Source API
  api_source TEXT NOT NULL,
  
  -- Données
  request_data TEXT NOT NULL, -- JSON de la requête
  response_data TEXT NOT NULL, -- JSON de la réponse
  
  -- Métadonnées
  success BOOLEAN DEFAULT TRUE,
  response_time_ms INTEGER,
  
  -- Expiration
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  
  -- Statistiques d'usage
  hit_count INTEGER DEFAULT 0,
  last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_source ON api_cache(api_source);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at);

-- Vue pour statistiques avancées par catégorie
CREATE VIEW IF NOT EXISTS collection_stats_by_category AS
SELECT 
  category,
  COUNT(*) as total_items,
  COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as completed_items,
  COUNT(CASE WHEN ai_analyzed = 1 THEN 1 END) as ai_analyzed_items,
  AVG(rarity_score) as avg_rarity_score,
  COUNT(CASE WHEN rarity_score >= 70 THEN 1 END) as rare_items,
  
  -- Prix statistiques
  COUNT(CASE WHEN pe.estimated_value IS NOT NULL THEN 1 END) as items_with_prices,
  AVG(pe.estimated_value) as avg_estimated_value,
  SUM(pe.estimated_value) as total_estimated_value,
  MIN(pe.estimated_value) as min_value,
  MAX(pe.estimated_value) as max_value,
  
  -- Dates
  MIN(ci.created_at) as first_added,
  MAX(ci.last_evaluation_date) as last_evaluated
  
FROM collection_items ci
LEFT JOIN (
  SELECT 
    item_id, 
    AVG(estimated_value) as estimated_value
  FROM price_evaluations 
  WHERE is_active = 1 
  GROUP BY item_id
) pe ON ci.id = pe.item_id
GROUP BY category;

-- Vue pour items nécessitant attention
CREATE VIEW IF NOT EXISTS items_needing_attention AS
SELECT 
  ci.*,
  CASE 
    WHEN ci.processing_status = 'error' THEN 'Erreur de traitement'
    WHEN ci.processing_status = 'uploaded' AND ci.created_at < datetime('now', '-1 hour') THEN 'Analyse en retard'
    WHEN ci.ai_analyzed = 0 AND ci.created_at < datetime('now', '-30 minutes') THEN 'IA non exécutée'
    WHEN pe.item_id IS NULL AND ci.processing_status = 'completed' THEN 'Aucune évaluation'
    WHEN pe.max_confidence < 0.6 THEN 'Confiance faible'
    ELSE 'OK'
  END as attention_reason,
  
  pe.evaluation_count,
  pe.max_confidence,
  pe.last_evaluation
  
FROM collection_items ci
LEFT JOIN (
  SELECT 
    item_id,
    COUNT(*) as evaluation_count,
    MAX(confidence_score) as max_confidence,
    MAX(evaluation_date) as last_evaluation
  FROM price_evaluations 
  WHERE is_active = 1 
  GROUP BY item_id
) pe ON ci.id = pe.item_id

WHERE 
  ci.processing_status = 'error'
  OR (ci.processing_status = 'uploaded' AND ci.created_at < datetime('now', '-1 hour'))
  OR (ci.ai_analyzed = 0 AND ci.created_at < datetime('now', '-30 minutes'))
  OR (pe.item_id IS NULL AND ci.processing_status = 'completed')
  OR pe.max_confidence < 0.6;

-- Fonctions pour nettoyer le cache expiré (à exécuter périodiquement)
-- DELETE FROM api_cache WHERE expires_at < datetime('now');

-- Mettre à jour les statistiques
UPDATE collection_items 
SET rarity_score = 
  CASE 
    WHEN year_made IS NOT NULL AND year_made < 1970 THEN 50 + (1970 - year_made)
    WHEN condition_grade = 'mint' THEN 30
    WHEN condition_grade = 'near_mint' THEN 20
    WHEN condition_grade = 'excellent' THEN 10
    ELSE 0
  END
WHERE rarity_score = 0;