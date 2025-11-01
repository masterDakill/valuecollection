-- Migration: Système de Monitoring
-- Suit l'utilisation de tous les services et APIs

CREATE TABLE IF NOT EXISTS service_monitoring (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0, -- 1 = success, 0 = failure
  response_time_ms INTEGER,
  cost_usd REAL DEFAULT 0.0,
  details TEXT, -- JSON avec infos supplémentaires
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index pour requêtes rapides
CREATE INDEX IF NOT EXISTS idx_service_monitoring_service ON service_monitoring(service_name);
CREATE INDEX IF NOT EXISTS idx_service_monitoring_created ON service_monitoring(created_at);
CREATE INDEX IF NOT EXISTS idx_service_monitoring_success ON service_monitoring(success);

-- Vue pour stats rapides
CREATE VIEW IF NOT EXISTS v_service_stats AS
SELECT
  service_name,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_calls,
  SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_calls,
  ROUND(AVG(response_time_ms), 2) as avg_response_time,
  ROUND(SUM(cost_usd), 4) as total_cost_usd,
  MAX(created_at) as last_used
FROM service_monitoring
GROUP BY service_name;
