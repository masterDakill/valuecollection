-- Données de test pour l'Évaluateur de Collection Pro

-- Collection de test
INSERT OR IGNORE INTO collections (name, description, owner_email) VALUES 
  ('Collection Mathieu - Cartes Sport', 'Collection de cartes de hockey et baseball vintage', 'Math55_50@hotmail.com'),
  ('Livres Rares & Premiers Éditions', 'Collection de livres anciens et éditions limitées', 'Math55_50@hotmail.com'),
  ('Objets Vintage Québec', 'Collection d\'objets vintage du Québec', 'Math55_50@hotmail.com');

-- Items de test avec différentes catégories
INSERT OR IGNORE INTO collection_items (
  collection_id, title, description, category, subcategory, 
  condition_grade, year_made, manufacturer, processing_status
) VALUES 
  -- Cartes de sport
  (1, 'Carte Wayne Gretzky Rookie 1979-80', 'Carte rookie de Wayne Gretzky en excellent état', 'sports_cards', 'hockey', 'excellent', 1979, 'O-Pee-Chee', 'completed'),
  (1, 'Carte Maurice Richard 1951-52', 'Carte vintage de Maurice Richard', 'sports_cards', 'hockey', 'good', 1951, 'Parkhurst', 'processing'),
  (1, 'Carte Roberto Clemente 1973', 'Carte de baseball Roberto Clemente', 'sports_cards', 'baseball', 'near_mint', 1973, 'Topps', 'uploaded'),
  
  -- Livres
  (2, 'Les Anciens Canadiens - Philippe Aubert de Gaspé', 'Première édition 1863', 'books', 'canadian_literature', 'good', 1863, 'G.E. Desbarats', 'completed'),
  (2, 'Maria Chapdelaine - Louis Hémon', 'Édition originale française 1916', 'books', 'canadian_literature', 'excellent', 1916, 'Bernard Grasset', 'processing'),
  
  -- Objets vintage
  (3, 'Bouteille Coca-Cola Québec 1950s', 'Bouteille vintage en verre avec logo Québec', 'vintage', 'advertising', 'mint', 1955, 'Coca-Cola', 'uploaded'),
  (3, 'Affiche Expo 67 Montréal', 'Affiche promotionnelle officielle Expo 67', 'vintage', 'expo_memorabilia', 'excellent', 1967, 'Expo 67 Corporation', 'completed');

-- Évaluations de prix de test
INSERT OR IGNORE INTO price_evaluations (
  item_id, evaluation_source, estimated_value, currency, 
  price_range_min, price_range_max, confidence_score, similar_items_count
) VALUES 
  -- Wayne Gretzky Rookie
  (1, 'ebay_sold_listings', 15000.00, 'CAD', 12000.00, 18000.00, 0.95, 23),
  (1, 'sportscardspro', 14500.00, 'CAD', 13000.00, 16000.00, 0.90, 15),
  (1, 'worthpoint', 16200.00, 'CAD', 14000.00, 19000.00, 0.85, 8),
  
  -- Maurice Richard 1951
  (2, 'ebay_sold_listings', 2500.00, 'CAD', 2000.00, 3200.00, 0.80, 12),
  (2, 'worthpoint', 2800.00, 'CAD', 2200.00, 3500.00, 0.75, 6),
  
  -- Les Anciens Canadiens
  (4, 'abebooks', 1200.00, 'CAD', 800.00, 1500.00, 0.85, 4),
  (4, 'worthpoint', 1100.00, 'CAD', 900.00, 1400.00, 0.80, 3);

-- Ventes récentes de test
INSERT OR IGNORE INTO recent_sales (
  item_id, sale_platform, sale_date, sale_price, currency,
  sold_condition, sold_title, similarity_score, verified_sale
) VALUES 
  (1, 'ebay', '2024-09-15 14:30:00', 15200.00, 'CAD', 'excellent', 'Wayne Gretzky 1979-80 OPC Rookie Card #18 PSA 8', 0.95, TRUE),
  (1, 'ebay', '2024-08-22 09:15:00', 14800.00, 'CAD', 'excellent', '1979 O-Pee-Chee #18 Wayne Gretzky RC', 0.92, TRUE),
  (1, 'heritage_auctions', '2024-07-10 16:00:00', 16500.00, 'CAD', 'near_mint', 'Gretzky Rookie 1979-80 O-Pee-Chee', 0.88, TRUE),
  
  (2, 'ebay', '2024-09-05 11:20:00', 2400.00, 'CAD', 'good', '1951-52 Parkhurst Maurice Richard #4', 0.90, TRUE),
  (2, 'kijiji', '2024-08-18 15:45:00', 2600.00, 'CAD', 'good', 'Maurice Richard carte vintage 1951', 0.85, FALSE);

-- Analyses IA de test
INSERT OR IGNORE INTO ai_analysis (
  item_id, detected_objects, text_extracted, suggested_category, 
  suggested_subcategory, confidence_category, analysis_model
) VALUES 
  (1, '["hockey_player", "uniform", "stick", "logo_opc"]', 'WAYNE GRETZKY - EDMONTON OILERS - O-PEE-CHEE 1979-80', 'sports_cards', 'hockey', 0.98, 'gpt-4-vision'),
  (4, '["book_cover", "text", "vintage_binding"]', 'LES ANCIENS CANADIENS - PHILIPPE AUBERT DE GASPÉ', 'books', 'canadian_literature', 0.92, 'gpt-4-vision'),
  (6, '["bottle", "logo_coca_cola", "vintage_glass"]', 'COCA-COLA - QUÉBEC - BOTTLE', 'vintage', 'advertising', 0.89, 'gpt-4-vision');

-- Logs d'activité de test
INSERT OR IGNORE INTO activity_logs (
  item_id, action_type, action_description, status
) VALUES 
  (1, 'upload', 'Image principale uploadée avec succès', 'success'),
  (1, 'analysis', 'Analyse IA complétée - hockey card détectée', 'success'),
  (1, 'evaluation', 'Évaluation eBay complétée - 3 ventes similaires trouvées', 'success'),
  (2, 'upload', 'Image principale uploadée avec succès', 'success'),
  (2, 'evaluation', 'Évaluation en cours - recherche ventes récentes', 'success'),
  (3, 'upload', 'Upload en cours - traitement de l\'image', 'success'),
  (4, 'analysis', 'Analyse IA complétée - livre ancien détecté', 'success');