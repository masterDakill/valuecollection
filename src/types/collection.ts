// Types TypeScript pour l'Évaluateur de Collection Pro

export interface Collection {
  id: number;
  name: string;
  description?: string;
  owner_email: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionItem {
  id: number;
  collection_id: number;
  title: string;
  description?: string;
  category: ItemCategory;
  subcategory?: string;
  
  // Identifiants
  isbn?: string;
  upc_code?: string;
  barcode?: string;
  serial_number?: string;
  
  // Métadonnées physiques
  condition_grade?: ConditionGrade;
  year_made?: number;
  manufacturer?: string;
  material?: string;
  dimensions?: string;
  weight_grams?: number;
  
  // URLs média
  primary_image_url?: string;
  additional_images?: string; // JSON array
  video_url?: string;
  thumbnail_url?: string;
  
  // Statut
  processing_status: ProcessingStatus;
  ai_analyzed: boolean;
  last_evaluation_date?: string;
  
  created_at: string;
  updated_at: string;
}

export interface PriceEvaluation {
  id: number;
  item_id: number;
  evaluation_source: EvaluationSource;
  api_response_id?: string;
  
  // Prix
  estimated_value?: number;
  currency: string;
  price_range_min?: number;
  price_range_max?: number;
  
  // Contexte
  condition_matched?: string;
  similar_items_count?: number;
  confidence_score?: number; // 0.0 to 1.0
  
  evaluation_date: string;
  last_updated: string;
  is_active: boolean;
  raw_api_data?: string; // JSON
}

export interface RecentSale {
  id: number;
  item_id: number;
  sale_platform: string;
  sale_date?: string;
  sale_price?: number;
  currency: string;
  sold_condition?: string;
  sold_title?: string;
  sold_description?: string;
  sold_item_url?: string;
  similarity_score?: number;
  verified_sale: boolean;
  created_at: string;
}

export interface AIAnalysis {
  id: number;
  item_id: number;
  detected_objects?: string; // JSON array
  text_extracted?: string;
  colors_dominant?: string; // JSON
  image_quality_score?: number;
  suggested_category?: string;
  suggested_subcategory?: string;
  confidence_category?: number;
  analysis_model?: string;
  analysis_date: string;
  processing_time_ms?: number;
}

export interface ActivityLog {
  id: number;
  item_id?: number;
  action_type: ActionType;
  action_description?: string;
  status: ActionStatus;
  error_message?: string;
  user_agent?: string;
  ip_address?: string;
  session_id?: string;
  created_at: string;
}

// Enums et types utilitaires
export type ItemCategory = 
  | 'books' 
  | 'comics' 
  | 'sports_cards' 
  | 'trading_cards' 
  | 'vintage' 
  | 'art' 
  | 'toys' 
  | 'coins' 
  | 'stamps' 
  | 'jewelry' 
  | 'watches'
  | 'memorabilia'
  | 'other';

export type ConditionGrade = 
  | 'mint' 
  | 'near_mint' 
  | 'excellent' 
  | 'very_good' 
  | 'good' 
  | 'fair' 
  | 'poor';

export type ProcessingStatus = 
  | 'uploaded' 
  | 'processing' 
  | 'completed' 
  | 'error' 
  | 'pending_review';

export type EvaluationSource = 
  | 'ebay_sold_listings'
  | 'ebay_active_listings' 
  | 'worthpoint'
  | 'sportscardspro'
  | 'amazon_books'
  | 'google_books'
  | 'abebooks'
  | 'heritage_auctions'
  | 'comc'
  | 'tcgplayer'
  | 'mercari'
  | 'facebook_marketplace'
  | 'manual_appraisal';

export type ActionType = 
  | 'upload' 
  | 'analysis' 
  | 'evaluation' 
  | 'update' 
  | 'delete' 
  | 'error' 
  | 'bulk_operation';

export type ActionStatus = 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'pending';

// Interfaces pour les réponses API
export interface EvaluationRequest {
  item: CollectionItem;
  force_refresh?: boolean;
  sources?: EvaluationSource[];
}

export interface EvaluationResponse {
  success: boolean;
  evaluations: PriceEvaluation[];
  recent_sales: RecentSale[];
  error?: string;
  processing_time_ms?: number;
}

export interface BulkUploadResult {
  success: boolean;
  uploaded_count: number;
  failed_count: number;
  items: CollectionItem[];
  errors: Array<{
    filename: string;
    error: string;
  }>;
}

// Configuration des API externes
export interface APIConfig {
  ebay: {
    client_id?: string;
    client_secret?: string;
    sandbox?: boolean;
  };
  worthpoint: {
    api_key?: string;
  };
  openai: {
    api_key?: string;
    model?: string;
  };
  google_books: {
    api_key?: string;
  };
}

// Filtres et recherche
export interface ItemFilters {
  category?: ItemCategory[];
  condition_grade?: ConditionGrade[];
  year_min?: number;
  year_max?: number;
  value_min?: number;
  value_max?: number;
  processing_status?: ProcessingStatus[];
  search_text?: string;
  has_evaluation?: boolean;
}

export interface SearchResult {
  items: CollectionItem[];
  total_count: number;
  page: number;
  per_page: number;
  filters_applied: ItemFilters;
}

// Statistiques de collection
export interface CollectionStats {
  total_items: number;
  items_by_category: Record<ItemCategory, number>;
  total_estimated_value: number;
  items_above_threshold: number;
  threshold_amount: number;
  processing_status_counts: Record<ProcessingStatus, number>;
  last_updated: string;
}