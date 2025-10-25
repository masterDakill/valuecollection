-- =============================================================================
-- Migration 0004 : Photo Storage & Individual Book Detection
-- =============================================================================
-- Date : 20 octobre 2025
-- Objectif : Stocker les photos analysées et lier les livres individuels détectés
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLE : Analyzed Photos (Photos Analyzed)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS analyzed_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Image data
  image_url TEXT,                        -- URL originale si fournie
  image_base64 TEXT,                     -- Image en base64 si uploadée
  thumbnail_url TEXT,                    -- Thumbnail pour galerie
  image_hash TEXT,                       -- Hash pour détecter doublons

  -- Metadata
  original_filename TEXT,
  file_size_bytes INTEGER,
  mime_type TEXT,
  width_px INTEGER,
  height_px INTEGER,

  -- Analysis status
  analysis_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  analysis_mode TEXT,                    -- 'vision', 'smart', 'advanced'
  total_items_detected INTEGER DEFAULT 0,

  -- Performance metrics
  processing_time_ms INTEGER,
  ai_model_used TEXT,                   -- 'gpt-4o', 'claude-3.5-sonnet', etc.

  -- User context
  user_notes TEXT,
  collection_id INTEGER,                -- Lien vers collection parente

  -- Timestamps
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  analyzed_at DATETIME,
  last_viewed_at DATETIME,

  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_analyzed_photos_status ON analyzed_photos(analysis_status);
CREATE INDEX IF NOT EXISTS idx_analyzed_photos_collection ON analyzed_photos(collection_id);
CREATE INDEX IF NOT EXISTS idx_analyzed_photos_uploaded ON analyzed_photos(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyzed_photos_hash ON analyzed_photos(image_hash);

-- -----------------------------------------------------------------------------
-- ALTER TABLE : Collection Items - Add Photo Reference
-- -----------------------------------------------------------------------------

-- Lien vers la photo source
ALTER TABLE collection_items ADD COLUMN photo_id INTEGER REFERENCES analyzed_photos(id) ON DELETE SET NULL;

-- Bounding box pour position dans l'image (format: [x, y, width, height] normalisé 0-1)
ALTER TABLE collection_items ADD COLUMN bbox TEXT; -- JSON: [x, y, w, h]

-- Confiance de la détection
ALTER TABLE collection_items ADD COLUMN detection_confidence REAL; -- 0.0 - 1.0

-- Index position dans l'ordre de détection
ALTER TABLE collection_items ADD COLUMN detection_index INTEGER; -- 0, 1, 2, etc.

-- Auteur/artiste pour livres/albums
ALTER TABLE collection_items ADD COLUMN artist_author TEXT;

-- Éditeur/label
ALTER TABLE collection_items ADD COLUMN publisher_label TEXT;

-- ISBN-13 spécifique
ALTER TABLE collection_items ADD COLUMN isbn_13 TEXT;

CREATE INDEX IF NOT EXISTS idx_collection_items_photo ON collection_items(photo_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_author ON collection_items(artist_author);
CREATE INDEX IF NOT EXISTS idx_collection_items_publisher ON collection_items(publisher_label);
CREATE INDEX IF NOT EXISTS idx_collection_items_isbn13 ON collection_items(isbn_13);

-- -----------------------------------------------------------------------------
-- VUE : Photos avec statistiques
-- -----------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS photos_with_stats AS
SELECT
  ap.id,
  ap.image_url,
  ap.thumbnail_url,
  ap.original_filename,
  ap.analysis_status,
  ap.total_items_detected,
  ap.uploaded_at,
  ap.analyzed_at,
  COUNT(ci.id) as saved_items_count,
  AVG(ci.detection_confidence) as avg_confidence,
  MIN(pe.estimated_value) as min_value,
  MAX(pe.estimated_value) as max_value,
  AVG(pe.estimated_value) as avg_value,
  SUM(pe.estimated_value) as total_value
FROM analyzed_photos ap
LEFT JOIN collection_items ci ON ci.photo_id = ap.id
LEFT JOIN price_evaluations pe ON pe.item_id = ci.id AND pe.is_active = TRUE
GROUP BY ap.id
ORDER BY ap.uploaded_at DESC;

-- -----------------------------------------------------------------------------
-- VUE : Items par photo
-- -----------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS photo_items_detail AS
SELECT
  ci.id as item_id,
  ci.photo_id,
  ci.title,
  ci.artist_author,
  ci.publisher_label,
  ci.year_made as year,
  ci.isbn,
  ci.isbn_13,
  ci.category,
  ci.bbox,
  ci.detection_confidence,
  ci.detection_index,
  ci.primary_image_url,
  pe.estimated_value,
  pe.price_range_min,
  pe.price_range_max,
  pe.evaluation_source,
  pe.confidence_score as price_confidence,
  ap.image_url as source_photo_url,
  ap.uploaded_at as photo_date
FROM collection_items ci
INNER JOIN analyzed_photos ap ON ci.photo_id = ap.id
LEFT JOIN price_evaluations pe ON pe.item_id = ci.id AND pe.is_active = TRUE
WHERE ci.photo_id IS NOT NULL
ORDER BY ci.photo_id, ci.detection_index;

-- -----------------------------------------------------------------------------
-- VÉRIFICATION
-- -----------------------------------------------------------------------------

SELECT 'Migration 0004 completed' as status;

SELECT 'analyzed_photos table:' as info, COUNT(*) as count
FROM sqlite_master
WHERE type = 'table' AND name = 'analyzed_photos';

SELECT 'New indexes created:' as info, COUNT(*) as count
FROM sqlite_master
WHERE type = 'index' AND name LIKE '%photo%';

-- =============================================================================
-- FIN DE LA MIGRATION
-- =============================================================================
