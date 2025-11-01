// Type definitions for ui-helpers.mjs

export interface NormalizedItem {
  id: string;
  title: string;
  author: string | null;
  category: string;
  estimatedValue: number | null;
  currency: string;
  confidence: number | null;
  detectedAt: string | null;
  imageUrl: string | null;
  raw: any;
}

export interface NormalizedPhoto {
  id: string;
  url: string | null;
  analyzedAt: string | null;
  source: string;
  status: string;
  notes: string | null;
  detectedItems: NormalizedItem[];
  detectedItemsCount: number;
  detectedItemsValue: number;
  detectedItemsCurrency: string;
  raw: any;
}

export interface NormalizedAd {
  id: string;
  title: string;
  description: string;
  price: number | null;
  currency: string;
  platform: string;
  raw: any;
}

export function aliasValue(source: any, keys: string[], fallback?: any): any;
export function normalizeItem(raw?: any): NormalizedItem;
export function normalizePhoto(raw?: any): NormalizedPhoto;
export function normalizeAd(raw?: any): NormalizedAd;
