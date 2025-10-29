-- Migration 0006: Ajouter colonne estimated_value
-- Stocke la valeur estimée du livre après évaluation IA

ALTER TABLE collection_items ADD COLUMN estimated_value REAL DEFAULT 0;

-- Note: Cette colonne est mise à jour automatiquement par l'endpoint
--       POST /api/items/:id/evaluate après l'analyse de rareté IA
