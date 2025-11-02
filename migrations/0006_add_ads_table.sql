-- Migration: Add ads_created table for saving created ads
-- Created: 2025-11-02

CREATE TABLE IF NOT EXISTS ads_created (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2),
  currency TEXT DEFAULT 'CAD',
  condition TEXT,
  platform TEXT NOT NULL, -- 'ebay', 'facebook', 'kijiji', etc.
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  ebay_listing_id TEXT, -- ID retourné par eBay après publication
  ebay_listing_url TEXT, -- URL de l'annonce eBay
  facebook_listing_id TEXT,
  kijiji_listing_id TEXT,
  tags TEXT, -- JSON array de tags
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  FOREIGN KEY (item_id) REFERENCES collection_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ads_item_id ON ads_created(item_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads_created(status);
CREATE INDEX IF NOT EXISTS idx_ads_platform ON ads_created(platform);
CREATE INDEX IF NOT EXISTS idx_ads_created_at ON ads_created(created_at);
