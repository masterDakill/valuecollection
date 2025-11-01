-- Migration: Add default collection for photos without specific collection
-- Created: 2025-11-01
-- Purpose: Fix FOREIGN KEY constraint error when storing photos

-- Create a default collection for uncategorized photos
INSERT INTO collections (name, description, owner_email, created_at)
VALUES (
  'Photos Non Classées',
  'Collection par défaut pour les photos uploadées sans collection spécifique',
  'system@valuecollection.local',
  datetime('now')
)
ON CONFLICT DO NOTHING;

-- Note: The default collection will have ID 1 if it's the first insertion
-- Photos can reference this collection or use NULL (with ON DELETE SET NULL)
