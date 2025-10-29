-- =============================================================================
-- Migration 0005 : Ajout des colonnes pour enrichissement de livres
-- =============================================================================
-- Date : 25 octobre 2025
-- Objectif : Ajouter les colonnes manquantes pour les données de livres enrichis
-- =============================================================================

-- Colonnes spécifiques aux livres
-- NOTE: artist_author, publisher_label, isbn_13 déjà ajoutés dans 0004_add_photo_storage.sql
ALTER TABLE collection_items ADD COLUMN year INTEGER;            -- Année de publication

-- Colonnes additionnelles pour enrichissement
ALTER TABLE collection_items ADD COLUMN page_count INTEGER;      -- Nombre de pages
ALTER TABLE collection_items ADD COLUMN language TEXT;           -- Langue du livre
ALTER TABLE collection_items ADD COLUMN genres TEXT;             -- JSON array des genres
ALTER TABLE collection_items ADD COLUMN enrichment_source TEXT;  -- google_books, open_library
ALTER TABLE collection_items ADD COLUMN enrichment_date DATETIME; -- Date d'enrichissement
ALTER TABLE collection_items ADD COLUMN enrichment_confidence REAL; -- Confiance enrichissement

-- Index pour améliorer les recherches
CREATE INDEX IF NOT EXISTS idx_collection_items_artist_author
  ON collection_items(artist_author) WHERE artist_author IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collection_items_publisher
  ON collection_items(publisher_label) WHERE publisher_label IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collection_items_isbn_13
  ON collection_items(isbn_13) WHERE isbn_13 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collection_items_year
  ON collection_items(year) WHERE year IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collection_items_enrichment
  ON collection_items(enrichment_source, enrichment_date)
  WHERE enrichment_source IS NOT NULL;

-- =============================================================================
-- FIN DE LA MIGRATION
-- =============================================================================
