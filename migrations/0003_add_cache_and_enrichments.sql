-- =============================================================================
-- Migration 0003 : Cache API + Enrichissements Base de Données
-- =============================================================================
-- Date : 19 octobre 2025
-- Objectif : Ajouter cache API multi-niveaux + colonnes enrichies pour livres
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLE : Cache API (Performance et Économies)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS api_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key TEXT NOT NULL UNIQUE,
  api_source TEXT NOT NULL,          -- 'ebay', 'discogs', 'google_books', 'openai', etc.
  request_data TEXT NOT NULL,        -- JSON de la requête
  response_data TEXT NOT NULL,       -- JSON de la réponse
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  hit_count INTEGER DEFAULT 0        -- Nombre de fois utilisé
);

CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_cache_source ON api_cache(api_source);
CREATE INDEX IF NOT EXISTS idx_api_cache_hit_count ON api_cache(hit_count DESC);

-- -----------------------------------------------------------------------------
-- TABLE : Enrichissements Collection Items (Support vidéo, OCR, métadonnées)
-- -----------------------------------------------------------------------------

-- NOTE: Les colonnes ci-dessous ont déjà été ajoutées dans les migrations précédentes:
-- - video_url (0001_initial_schema.sql)
-- - additional_videos, extracted_text, format_details, catalog_number,
--   matrix_number, label_name, edition_details, pressing_info,
--   rarity_score, market_demand (0002_enhanced_categories.sql)
-- Par conséquent, ces ALTER TABLE ont été commentés pour éviter les doublons.

-- -----------------------------------------------------------------------------
-- TABLE : Identifiants Externes Multiples
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS external_identifiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  identifier_type TEXT NOT NULL,     -- 'isbn', 'upc', 'ean', 'discogs_id', 'ebay_id'
  identifier_value TEXT NOT NULL,
  source TEXT,                       -- Où trouvé : 'ocr', 'barcode', 'user_input'
  confidence REAL DEFAULT 1.0,       -- 0.0 - 1.0
  verified BOOLEAN DEFAULT FALSE,    -- Confirmé par API externe
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (item_id) REFERENCES collection_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_external_id_item ON external_identifiers(item_id);
CREATE INDEX IF NOT EXISTS idx_external_id_type ON external_identifiers(identifier_type);
CREATE INDEX IF NOT EXISTS idx_external_id_value ON external_identifiers(identifier_value);

-- -----------------------------------------------------------------------------
-- TABLE : Requêtes de Recherche Utilisées (Analytics)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS search_queries_used (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER,
  search_query TEXT NOT NULL,
  evaluation_source TEXT NOT NULL,   -- 'ebay', 'discogs', 'google_books'
  results_found INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT FALSE,
  response_time_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (item_id) REFERENCES collection_items(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_search_queries_item ON search_queries_used(item_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_source ON search_queries_used(evaluation_source);
CREATE INDEX IF NOT EXISTS idx_search_queries_success ON search_queries_used(success);

-- -----------------------------------------------------------------------------
-- VUE : Statistiques par Catégorie
-- -----------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS collection_stats_by_category AS
SELECT
  ci.category,
  COUNT(*) as total_items,
  COUNT(CASE WHEN ci.status = 'completed' THEN 1 END) as completed_items,
  AVG(ci.rarity_score) as avg_rarity_score,
  COUNT(CASE WHEN ci.rarity_score >= 80 THEN 1 END) as rare_items,
  AVG(pe.estimated_value) as avg_estimated_value,
  SUM(pe.estimated_value) as total_value,
  MIN(ci.created_at) as first_added,
  MAX(pe.evaluated_at) as last_evaluated
FROM collection_items ci
LEFT JOIN price_evaluations pe ON ci.id = pe.item_id
WHERE ci.status != 'deleted'
GROUP BY ci.category;

-- -----------------------------------------------------------------------------
-- VUE : Items Nécessitant Attention
-- -----------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS items_needing_attention AS
SELECT
  ci.id,
  ci.title,
  ci.category,
  CASE
    WHEN pe.id IS NULL THEN 'no_evaluation'
    WHEN pe.evaluated_at < datetime('now', '-7 days') THEN 'outdated_evaluation'
    WHEN pe.confidence_score < 0.5 THEN 'low_confidence'
    WHEN ci.image_url IS NULL THEN 'no_image'
    ELSE 'unknown'
  END as attention_reason,
  COUNT(pe.id) as evaluation_count,
  MAX(pe.confidence_score) as max_confidence,
  MAX(pe.evaluated_at) as last_evaluation
FROM collection_items ci
LEFT JOIN price_evaluations pe ON ci.id = pe.item_id
WHERE ci.status = 'active'
GROUP BY ci.id
HAVING attention_reason != 'unknown'
ORDER BY
  CASE attention_reason
    WHEN 'no_evaluation' THEN 1
    WHEN 'low_confidence' THEN 2
    WHEN 'outdated_evaluation' THEN 3
    WHEN 'no_image' THEN 4
  END;

-- -----------------------------------------------------------------------------
-- INDEX ADDITIONNELS pour Performance
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_collection_items_catalog_number
  ON collection_items(catalog_number);

CREATE INDEX IF NOT EXISTS idx_collection_items_label_name
  ON collection_items(label_name);

CREATE INDEX IF NOT EXISTS idx_collection_items_rarity_score
  ON collection_items(rarity_score DESC);

CREATE INDEX IF NOT EXISTS idx_collection_items_market_demand
  ON collection_items(market_demand);

-- -----------------------------------------------------------------------------
-- VÉRIFICATION
-- -----------------------------------------------------------------------------

-- Compter les tables créées
SELECT 'Tables créées :' as info, COUNT(*) as count
FROM sqlite_master
WHERE type = 'table'
  AND name IN ('api_cache', 'external_identifiers', 'search_queries_used');

-- Compter les vues créées
SELECT 'Vues créées :' as info, COUNT(*) as count
FROM sqlite_master
WHERE type = 'view'
  AND name IN ('collection_stats_by_category', 'items_needing_attention');

-- Compter les index créés
SELECT 'Index créés :' as info, COUNT(*) as count
FROM sqlite_master
WHERE type = 'index'
  AND name LIKE 'idx_%';

-- =============================================================================
-- FIN DE LA MIGRATION
-- =============================================================================
