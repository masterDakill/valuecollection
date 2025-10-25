const FALLBACK_ID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
};

export function aliasValue(source, keys, fallback = undefined) {
  if (!source) return fallback;
  for (const key of keys) {
    if (key in source && source[key] !== undefined && source[key] !== null && source[key] !== '') {
      return source[key];
    }
  }
  return fallback;
}

export function normalizeItem(raw = {}) {
  const estimatedValue = Number(aliasValue(raw, [
    'estimated_value',
    'estimatedValue',
    'value',
    'price',
    'min_value',
    'max_value'
  ]));

  const currency = aliasValue(raw, ['currency', 'currency_code', 'currencyCode'], 'CAD');
  const confidence = Number(
    aliasValue(raw, ['confidence', 'confidence_score', 'detection_confidence', 'match_confidence'], null)
  );
  const title = aliasValue(raw, ['title', 'name', 'item_name', 'book_title'], 'Item sans titre');
  const author = aliasValue(raw, ['artist_author', 'author', 'creator', 'artist'], null);
  const category = aliasValue(raw, ['category', 'collection_type', 'type'], 'Autre');
  const detectedAt = aliasValue(raw, [
    'detected_at',
    'analysis_timestamp',
    'created_at',
    'timestamp',
    'last_seen_at'
  ], null);
  const imageUrl = aliasValue(raw, ['image_url', 'imageUrl', 'thumbnail', 'cover_url'], null);

  return {
    id: aliasValue(raw, ['id', 'item_id', 'uuid', 'record_id'], FALLBACK_ID()),
    title,
    author,
    category,
    estimatedValue: Number.isFinite(estimatedValue) ? estimatedValue : null,
    currency,
    confidence: Number.isFinite(confidence) ? confidence : null,
    detectedAt,
    imageUrl,
    raw
  };
}

export function normalizePhoto(raw = {}) {
  const url = aliasValue(raw, ['url', 'image_url', 'imageUrl', 'thumbnail'], null);
  const analyzedAt = aliasValue(raw, ['analyzed_at', 'created_at', 'timestamp'], null);
  const source = aliasValue(raw, ['source', 'provider', 'origin'], 'upload');
  const status = aliasValue(raw, ['status', 'state'], 'processed');
  const rawDetections = aliasValue(raw, ['detected_items', 'detections', 'items'], []);
  const detectionsArray = Array.isArray(rawDetections) ? rawDetections : [];
  const detectedItems = detectionsArray.map((item) => normalizeItem(item));
  const detectedItemsValue = detectedItems.reduce((sum, item) => {
    if (Number.isFinite(item.estimatedValue)) {
      return sum + item.estimatedValue;
    }
    return sum;
  }, 0);
  const detectedItemsCurrency =
    detectedItems.find((item) => item.currency)?.currency || aliasValue(raw, ['currency', 'currency_code'], 'CAD');

  return {
    id: aliasValue(raw, ['id', 'photo_id', 'uuid'], FALLBACK_ID()),
    url,
    analyzedAt,
    source,
    status,
    notes: aliasValue(raw, ['notes', 'comment', 'message'], null),
    detectedItems,
    detectedItemsCount: detectedItems.length,
    detectedItemsValue: Number(detectedItemsValue.toFixed(2)),
    detectedItemsCurrency,
    raw
  };
}

export function normalizeAd(raw = {}) {
  const title = aliasValue(raw, ['title', 'headline'], 'Annonce générée');
  const description = aliasValue(raw, ['description', 'body', 'content'], '');
  const price = Number(aliasValue(raw, ['price', 'estimated_price', 'value'], null));
  const currency = aliasValue(raw, ['currency', 'currency_code'], 'CAD');
  const platform = aliasValue(raw, ['platform', 'channel'], 'Marketplace');

  return {
    id: aliasValue(raw, ['id', 'ad_id', 'uuid'], FALLBACK_ID()),
    title,
    description,
    price: Number.isFinite(price) ? price : null,
    currency,
    platform,
    raw
  };
}

export function formatCurrency(value, currency = 'CAD') {
  if (!Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(value);
  } catch (error) {
    return `${value.toFixed(0)} ${currency}`;
  }
}

export function countAboveThreshold(items, threshold) {
  if (!Array.isArray(items)) return 0;
  return items.filter((item) => Number.isFinite(item.estimatedValue) && item.estimatedValue >= threshold).length;
}

export function computeDashboardStats({ items = [], photos = [], ads = [], lastAnalysis = null }) {
  const totalItems = items.length;
  const totalPhotos = photos.length;
  const estimatedTotalValue = items.reduce((sum, item) => {
    if (Number.isFinite(item.estimatedValue)) {
      return sum + item.estimatedValue;
    }
    return sum;
  }, 0);

  const latestItem = items
    .slice()
    .sort((a, b) => {
      const dateA = a.detectedAt ? Date.parse(a.detectedAt) : 0;
      const dateB = b.detectedAt ? Date.parse(b.detectedAt) : 0;
      return dateB - dateA;
    })
    .at(0);

  return {
    totalItems,
    totalPhotos,
    estimatedTotalValue,
    adsCount: ads.length,
    lastAnalyzedTitle: lastAnalysis?.smart_analysis?.extracted_data?.title || latestItem?.title || null,
    lastAnalyzedAt: lastAnalysis?.timestamp || latestItem?.detectedAt || null
  };
}

export function createAnalyzePayload({ imageUrl, imageBase64, options = {} }) {
  const payload = {};

  if (imageUrl && imageUrl.trim()) {
    payload.imageUrl = imageUrl.trim();
  }

  if (imageBase64) {
    payload.imageBase64 = imageBase64;
  }

  const cleanedOptions = {};
  const maxItems = options.maxItems ?? options.max_items;
  if (maxItems !== undefined && maxItems !== null && maxItems !== '') {
    const parsed = Number(maxItems);
    if (Number.isFinite(parsed) && parsed > 0) {
      cleanedOptions.maxItems = parsed;
    }
  }

  const collectionId = options.collectionId ?? options.collection_id;
  if (collectionId) {
    cleanedOptions.collectionId = String(collectionId);
  }

  if (Object.keys(cleanedOptions).length > 0) {
    payload.options = cleanedOptions;
  }

  if (!payload.imageUrl && !payload.imageBase64) {
    throw new Error("Merci de fournir une URL d'image ou un fichier à analyser.");
  }

  return payload;
}

export function toISODate(input) {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function shortDate(input) {
  const iso = toISODate(input);
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-CA', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(iso));
  } catch (error) {
    return iso;
  }
}
