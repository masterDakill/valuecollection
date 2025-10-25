import { Hono } from "hono";
import { cors } from "hono/cors";
import appScript from "../public/app.js?raw";
import helperScript from "../public/ui-helpers.mjs?raw";
import {
  SmartEvaluateRequestSchema,
  SmartEvaluateResponseSchema,
  SmartEvaluateResponse,
  AdvancedAnalysisRequestSchema,
} from "./schemas/evaluate.schema";
import {
  PhotoAnalyzeRequestSchema,
  PhotoAnalyzeResponseSchema,
  PhotosListResponseSchema,
  ItemsListResponseSchema,
  AdsGenerateRequestSchema,
  AdsGenerateResponseSchema,
  AdsExportResponseHeaders,
  PhotoRecordSchema,
  DetectedItem,
  PhotoRecord,
  InventoryItem,
  AdListing,
} from "./schemas/media.schema";

// Types pour les bindings Cloudflare
type Bindings = {
  DB: D1Database;
  API_KEY?: string;
};

const API_VERSION = "2025.10.25";
const DEFAULT_API_KEY = "test-key";
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX = 10;

type CacheEntry = {
  response: SmartEvaluateResponse;
  createdAt: number;
  hits: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const evaluationCache = new Map<string, CacheEntry>();
const cacheStats = {
  totalEntries: 0,
  hits: 0,
  misses: 0,
};

const idempotencyStore = new Map<string, SmartEvaluateResponse>();
const rateLimitBuckets = new Map<string, RateLimitBucket>();
const metrics = {
  requestsTotal: 0,
  evaluationSuccessTotal: 0,
  evaluationFailureTotal: 0,
  rateLimitedTotal: 0,
  cacheHitTotal: 0,
};

const photoStore = new Map<string, PhotoRecord>();
const photoUrlIndex = new Map<string, string>();
const inventoryStore = new Map<string, InventoryItem>();
let latestAds: AdListing[] = [];

const demoPhotoSeed = {
  id: "photo-sample-0001",
  url: "https://images.pexels.com/photos/6474521/pexels-photo-6474521.jpeg",
  file_name: "IMG_2450.JPG",
  captured_at: new Date("2025-10-25T07:50:41.000Z").toISOString(),
  source: "iphone-15-pro",
  width: 3024,
  height: 4032,
  checksum: "sha256-aa12c0ed0f52",
  dominant_color: "#d6c4a8",
} satisfies Omit<PhotoRecord, "detected_items">;

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors());

const htmlDocument = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Évaluateur de Collection Pro</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/css/all.min.css"
    />
  </head>
  <body class="bg-slate-50">
    <div id="root"></div>
    <script>window.__API_BASE__ = '';</script>
    <script type="module" src="/app.js"></script>
  </body>
</html>`;

const normalizeAuthToken = (value?: string | null) => {
  if (!value) return "";
  if (!value.toLowerCase().startsWith("bearer ")) return "";
  return value.slice(7).trim();
};

const getCacheKey = (payload: any) => {
  const { mode, text_input, query, imageUrl, imageUrls, videoUrl, category } =
    payload;
  return JSON.stringify({
    mode,
    text_input,
    query,
    imageUrl,
    imageUrls,
    videoUrl,
    category,
  });
};

const ensureRateLimitBucket = (key: string) => {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const nextBucket: RateLimitBucket = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
    rateLimitBuckets.set(key, nextBucket);
    return nextBucket;
  }
  return bucket;
};

const computeProcessingTime = (seed: number, cached: boolean) => {
  if (cached) {
    return 80 + (seed % 20);
  }
  return 420 + (seed % 180);
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const chooseCategory = (input?: string, fallback: string = "Books") => {
  if (!input) return fallback;
  const normalized = input.toLowerCase();
  if (
    normalized.includes("vinyl") ||
    normalized.includes("beatles") ||
    normalized.includes("music")
  ) {
    return "Music";
  }
  if (normalized.includes("card") || normalized.includes("trading")) {
    return "Trading Cards";
  }
  if (normalized.includes("comic")) {
    return "Comics";
  }
  if (normalized.includes("game")) {
    return "Video Games";
  }
  if (normalized.includes("poster") || normalized.includes("art")) {
    return "Art";
  }
  return fallback;
};

const rarityLevels = [
  "common",
  "uncommon",
  "rare",
  "very_rare",
  "ultra_rare",
] as const;
const marketTrends = ["declining", "stable", "rising", "hot"] as const;
const demandLevels = ["low", "medium", "high", "very_high"] as const;

const inventoryConditions = [
  "Excellent",
  "Very Good",
  "Good",
  "Fair",
] as const;

const chooseFromList = <T,>(values: readonly T[], seed: number, offset = 0) => {
  if (values.length === 0) {
    throw new Error("values must not be empty");
  }
  const index = Math.abs(seed + offset) % values.length;
  return values[index];
};

const computeDominantColor = (hash: number) => {
  const normalized = (hash * 2654435761) >>> 0;
  const hex = normalized.toString(16).padStart(8, "0");
  return `#${hex.slice(0, 6)}`;
};

const extractFileName = (value: string) => {
  try {
    const parsed = new URL(value);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return "capture.jpg";
    }
    return segments[segments.length - 1];
  } catch (error) {
    return "capture.jpg";
  }
};

const ensurePhotoEntry = (
  payload: { imageUrl?: string | undefined; options?: { collectionId?: string | undefined } },
  hash: number,
  timestamp: string,
): PhotoRecord => {
  const imageUrl =
    payload.imageUrl ||
    `https://collections.local/assets/${hash.toString(16).padStart(8, "0")}.jpg`;

  const existingId = photoUrlIndex.get(imageUrl);
  if (existingId) {
    const existing = photoStore.get(existingId);
    if (existing) {
      const refreshed = {
        ...existing,
        captured_at: existing.captured_at || timestamp,
      };
      photoStore.set(existingId, refreshed);
      return refreshed;
    }
  }

  const width = 1200 + (hash % 600);
  const height = 900 + ((hash >> 3) % 600);
  const created = PhotoRecordSchema.parse({
    id: `photo-${hash.toString(16).slice(-6)}`,
    url: imageUrl,
    file_name: extractFileName(imageUrl),
    captured_at: timestamp,
    source: payload.options?.collectionId
      ? `collection:${payload.options.collectionId}`
      : "analyze-upload",
    width,
    height,
    checksum: `sha256-${hash.toString(16).padStart(8, "0")}`,
    dominant_color: computeDominantColor(hash),
    detected_items: [],
  });

  photoStore.set(created.id, created);
  photoUrlIndex.set(imageUrl, created.id);
  return created;
};

const buildDetectedItems = (
  photoId: string,
  seed: string,
  hash: number,
  limit: number,
): DetectedItem[] => {
  const count = Math.max(1, Math.min(limit, 5));
  const words = seed
    .replace(/https?:\/\//g, "")
    .split(/[\s-_]+/)
    .filter(Boolean);

  return Array.from({ length: count }, (_, index) => {
    const localHash = hashString(`${photoId}-${seed}-${index}`);
    const category = chooseFromList(
      ["Books", "Music", "Trading Cards", "Comics", "Collectibles"],
      localHash,
    );
    const condition = chooseFromList(inventoryConditions, localHash);
    const title =
      words.length > 0
        ? `${words[0][0]?.toUpperCase() || "I"}${words[0]?.slice(1) || "tem"} ${
            index + 1
          }`
        : `Item ${index + 1}`;
    const confidence = Math.min(0.95, 0.72 + (localHash % 20) / 100);
    const estimated = 90 + (localHash % 210);
    const rarity = rarityLevels[Math.abs(localHash) % rarityLevels.length];

    return {
      id: `${photoId}-item-${index + 1}`,
      title,
      author: words[1] ? words.slice(1).join(" ") : undefined,
      confidence: Number(confidence.toFixed(2)),
      estimated_value: Number(estimated.toFixed(2)),
      currency: "CAD",
      category,
      condition,
      rarity,
      bbox: {
        x: (localHash % 180) + 20,
        y: ((localHash >> 3) % 140) + 18,
        width: 180 + ((localHash >> 5) % 140),
        height: 220 + ((localHash >> 7) % 120),
      },
      notes:
        index === 0
          ? "Détection générée automatiquement depuis l'analyse locale"
          : undefined,
    } satisfies DetectedItem;
  });
};

const refreshInventory = (photo: PhotoRecord, detections: DetectedItem[], timestamp: string) => {
  for (const [id, item] of inventoryStore.entries()) {
    if (item.photo_id === photo.id) {
      inventoryStore.delete(id);
    }
  }

  detections.forEach((detection) => {
    const entry: InventoryItem = {
      id: detection.id,
      photo_id: photo.id,
      title: detection.title,
      author: detection.author,
      category: detection.category,
      confidence: detection.confidence,
      estimated_value: detection.estimated_value,
      currency: detection.currency,
      condition: detection.condition,
      rarity: detection.rarity,
      last_seen_at: timestamp,
    };
    inventoryStore.set(entry.id, entry);
  });
};

const seedDemoData = () => {
  const basePhoto = PhotoRecordSchema.parse({
    ...demoPhotoSeed,
    detected_items: [],
  });

  const detections: DetectedItem[] = [
    {
      id: `${basePhoto.id}-item-1`,
      title: "Atlas du Québec ancien",
      author: "Collectif régional",
      confidence: 0.92,
      estimated_value: 185.5,
      currency: "CAD",
      category: "Books",
      condition: "Very Good",
      rarity: "rare",
      bbox: { x: 420, y: 280, width: 640, height: 860 },
      notes: "Échantillon local pré-rempli pour la démo hors-ligne.",
    },
    {
      id: `${basePhoto.id}-item-2`,
      title: "Guide de reliure artisanale 1978",
      author: "Atelier de Québec",
      confidence: 0.84,
      estimated_value: 95.25,
      currency: "CAD",
      category: "Books",
      condition: "Good",
      rarity: "uncommon",
      bbox: { x: 1280, y: 320, width: 620, height: 780 },
      notes: "Détection simulée pour illustrer la valeur estimée.",
    },
  ];

  const enrichedPhoto: PhotoRecord = {
    ...basePhoto,
    detected_items: detections,
  };

  photoStore.set(enrichedPhoto.id, enrichedPhoto);
  photoUrlIndex.set(enrichedPhoto.url, enrichedPhoto.id);
  refreshInventory(enrichedPhoto, detections, enrichedPhoto.captured_at);
};

seedDemoData();

const computeInventoryStats = () => {
  const items = Array.from(inventoryStore.values());
  const totalValue = items.reduce((sum, item) => sum + item.estimated_value, 0);
  return {
    items,
    totalValue: Number(totalValue.toFixed(2)),
  };
};

const buildAdsFromInventory = (minValue: number): AdListing[] => {
  const eligible = Array.from(inventoryStore.values()).filter(
    (item) => item.estimated_value >= minValue,
  );
  return eligible.map((item) => {
    const photo = photoStore.get(item.photo_id);
    const markup = item.estimated_value * 1.18;
    return {
      id: `ad-${item.id}`,
      title: `${item.title} (${item.condition})`,
      price: Number(markup.toFixed(2)),
      currency: item.currency,
      description: `Annonce générée automatiquement pour ${item.title} évalué à ${
        item.estimated_value
      } ${item.currency}. Rareté ${item.rarity}.`,
      photo_url: photo?.url,
      tags: [item.category.toLowerCase(), item.rarity, item.condition.toLowerCase()],
    } satisfies AdListing;
  });
};

const buildAdsCsv = (ads: AdListing[]) => {
  const header = ["id", "title", "price", "currency", "description", "photo_url", "tags"];
  const rows = ads.map((ad) => {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const cells = [
      ad.id,
      ad.title,
      ad.price.toFixed(2),
      ad.currency,
      ad.description,
      ad.photo_url ?? "",
      ad.tags.join("|") || "",
    ];
    return cells.map(escape).join(",");
  });
  return [header.join(","), ...rows].join("\n");
};

const buildEvaluationResponse = (
  payload: any,
  options: { cached: boolean; requestId: string },
): SmartEvaluateResponse => {
  const baseText =
    payload.text_input ||
    payload.query ||
    payload.imageUrl ||
    "collection-item";
  const hash = hashString(baseText);
  const category = payload.category || chooseCategory(baseText);
  const rarity = rarityLevels[hash % rarityLevels.length];
  const evaluations = [0, 1, 2].map((index) => ({
    evaluation_source: ["WorthPoint", "eBay", "Google Books"][index],
    estimated_value: Math.round(120 + (hash % 40) * (index + 1)),
    currency: index === 1 ? "USD" : "CAD",
    confidence_score: Math.min(0.95, 0.55 + index * 0.15),
    similar_items_count: 12 + index * 3,
  }));

  const smartResponse: SmartEvaluateResponse = {
    success: true,
    smart_analysis: {
      category,
      confidence: 0.62 + (hash % 20) / 100,
      extracted_data: {
        title:
          baseText.replace(/\s+/g, " ").trim().slice(0, 120) ||
          "Item de collection",
        artist_author:
          payload.category === "Music" ? "Unknown Artist" : "Auteur inconnu",
        year: 1950 + (hash % 70),
        condition: ["Good", "Very Good", "Excellent"][hash % 3] as any,
        format: payload.mode === "image" ? "Photo" : "Texte",
      },
      estimated_rarity: rarity,
      search_queries: [
        `${baseText} rare sale`,
        `${category} appraisal ${new Date().getFullYear()}`,
        `${baseText} valeur`,
      ],
    },
    evaluations,
    market_insights: {
      rarity_assessment: rarity,
      market_trend: marketTrends[hash % marketTrends.length],
      estimated_demand: demandLevels[hash % demandLevels.length],
    },
    suggested_improvements: [
      "Ajouter plus de photos haute résolution",
      "Documenter la provenance pour améliorer la valeur",
      "Comparer avec les ventes récentes",
    ],
    cached: options.cached,
    processing_time_ms: computeProcessingTime(hash, options.cached),
    request_id: options.requestId,
    timestamp: new Date().toISOString(),
  };

  return SmartEvaluateResponseSchema.parse(smartResponse);
};

const unauthorizedResponse = (requestId: string) => ({
  success: false,
  error: {
    code: "UNAUTHORIZED",
    message: "Jeton API invalide ou manquant",
    request_id: requestId,
  },
  timestamp: new Date().toISOString(),
});

const invalidInputResponse = (
  requestId: string,
  message: string,
  details?: any,
) => ({
  success: false,
  error: {
    code: "INVALID_INPUT",
    message,
    request_id: requestId,
    details,
  },
  timestamp: new Date().toISOString(),
});

const rateLimitedResponse = (requestId: string) => ({
  success: false,
  error: {
    code: "RATE_LIMITED",
    message: "Trop de requêtes. Réessayez plus tard.",
    request_id: requestId,
  },
  timestamp: new Date().toISOString(),
});

app.get("/", (c) => c.html(htmlDocument));

app.get(
  "/app.js",
  () =>
    new Response(appScript, {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    }),
);

app.get(
  "/ui-helpers.mjs",
  () =>
    new Response(helperScript, {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    }),
);

app.get("/healthz", (c) =>
  c.json({
    status: "healthy",
    version: API_VERSION,
    timestamp: new Date().toISOString(),
  }),
);

app.get("/readyz", (c) =>
  c.json({
    status: "ready",
    checks: {
      database: {
        status: c.env.DB ? "connected" : "mocked",
        latency_ms: 3,
      },
    },
    timestamp: new Date().toISOString(),
  }),
);

app.get("/metrics", (c) => {
  const lines = [
    "# HELP app_requests_total Total HTTP requests",
    "# TYPE app_requests_total counter",
    `app_requests_total ${metrics.requestsTotal}`,
    "# HELP app_evaluation_success_total Successful smart evaluations",
    "# TYPE app_evaluation_success_total counter",
    `app_evaluation_success_total ${metrics.evaluationSuccessTotal}`,
    "# HELP app_evaluation_failure_total Failed smart evaluations",
    "# TYPE app_evaluation_failure_total counter",
    `app_evaluation_failure_total ${metrics.evaluationFailureTotal}`,
    "# HELP app_rate_limited_total Rate limited requests",
    "# TYPE app_rate_limited_total counter",
    `app_rate_limited_total ${metrics.rateLimitedTotal}`,
    "# HELP app_cache_hit_total Cache hits for evaluations",
    "# TYPE app_cache_hit_total counter",
    `app_cache_hit_total ${metrics.cacheHitTotal}`,
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
});

app.get("/openapi.json", (c) =>
  c.json({
    openapi: "3.1.0",
    info: {
      title: "Évaluateur de Collection Pro API",
      version: API_VERSION,
      description:
        "API interne pour orchestrer les évaluations IA et la gestion de cache.",
    },
    paths: {
      "/api/smart-evaluate": {
        post: {
          summary: "Lance une évaluation IA smart",
          responses: {
            200: {
              description: "Résultat IA",
            },
            400: { description: "Erreur de validation" },
            401: { description: "Authentification requise" },
          },
        },
      },
      "/api/advanced-analysis": {
        post: {
          summary: "Analyse multi-expert détaillée",
        },
      },
      "/api/cache/stats": {
        get: {
          summary: "Statistiques du cache",
        },
      },
      "/api/photos": {
        get: {
          summary: "Liste les photos analysées",
        },
      },
      "/api/photos/analyze": {
        post: {
          summary: "Analyse une photo et détecte les items",
        },
      },
      "/api/items": {
        get: {
          summary: "Inventaire des items détectés",
        },
      },
      "/api/ads/generate": {
        post: {
          summary: "Génère des annonces marketing",
        },
      },
      "/api/ads/export": {
        get: {
          summary: "Export CSV des annonces générées",
        },
      },
    },
  }),
);

const authenticate = (c: any) => {
  const provided = normalizeAuthToken(c.req.header("Authorization"));
  const expected = c.env.API_KEY || DEFAULT_API_KEY;
  if (!provided || provided !== expected) {
    return false;
  }
  return true;
};

const applyRateLimiting = (key: string) => {
  const bucket = ensureRateLimitBucket(key);
  bucket.count += 1;
  return bucket;
};

app.get("/api/cache/stats", (c) => {
  const requestId = crypto.randomUUID();
  if (!authenticate(c)) {
    return c.json(unauthorizedResponse(requestId), 401);
  }

  const totalRequests = cacheStats.hits + cacheStats.misses;
  const hitRate = totalRequests === 0 ? 0 : cacheStats.hits / totalRequests;

  return c.json({
    success: true,
    cache_stats: {
      total_entries: cacheStats.totalEntries,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hit_rate: Number(hitRate.toFixed(2)),
    },
    request_id: requestId,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/photos", (c) => {
  metrics.requestsTotal += 1;
  const photos = Array.from(photoStore.values()).sort((a, b) =>
    a.captured_at > b.captured_at ? -1 : 1,
  );
  const payload = PhotosListResponseSchema.parse({
    success: true,
    photos,
    stats: {
      total_photos: photos.length,
      last_photo_at: photos.length > 0 ? photos[0].captured_at : null,
    },
    timestamp: new Date().toISOString(),
  });
  return c.json(payload);
});

app.get("/api/items", (c) => {
  metrics.requestsTotal += 1;
  const { items, totalValue } = computeInventoryStats();
  const sorted = [...items].sort((a, b) => b.estimated_value - a.estimated_value);
  const payload = ItemsListResponseSchema.parse({
    success: true,
    items: sorted,
    stats: {
      total_items: sorted.length,
      total_value: totalValue,
      currency: "CAD",
    },
    timestamp: new Date().toISOString(),
  });
  return c.json(payload);
});

app.post("/api/photos/analyze", async (c) => {
  metrics.requestsTotal += 1;
  const requestId = crypto.randomUUID();
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch (error) {
    return c.json(
      invalidInputResponse(requestId, "Requête JSON invalide", {
        error: "JSON.parse",
      }),
      400,
    );
  }

  const parsed = PhotoAnalyzeRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json(
      invalidInputResponse(
        requestId,
        "Le payload de l'analyse photo ne respecte pas le schéma attendu",
        parsed.error.flatten(),
      ),
      400,
    );
  }

  const request = parsed.data;
  const now = new Date().toISOString();
  const fingerprint = request.imageUrl || request.imageBase64!;
  const hash = hashString(fingerprint);
  const photo = ensurePhotoEntry(request, hash, now);
  const detections = buildDetectedItems(
    photo.id,
    fingerprint,
    hash,
    request.options?.maxItems ?? 5,
  );
  const updatedPhoto: PhotoRecord = {
    ...photo,
    captured_at: photo.captured_at || now,
    detected_items: detections,
  };
  photoStore.set(updatedPhoto.id, updatedPhoto);
  refreshInventory(updatedPhoto, detections, now);

  const response = PhotoAnalyzeResponseSchema.parse({
    success: true,
    photo: updatedPhoto,
    stats: {
      detected_items: detections.length,
      processing_time_ms: 180 + (hash % 120),
    },
    request_id: requestId,
    timestamp: now,
  });

  return c.json(response);
});

app.post("/api/ads/generate", async (c) => {
  metrics.requestsTotal += 1;
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch (error) {
    payload = {};
  }

  const parsed = AdsGenerateRequestSchema.safeParse(payload ?? {});
  if (!parsed.success) {
    const requestId = crypto.randomUUID();
    return c.json(
      invalidInputResponse(
        requestId,
        "Le payload de génération d'annonces est invalide",
        parsed.error.flatten(),
      ),
      400,
    );
  }

  const minValue = parsed.data.min_value;
  const ads = buildAdsFromInventory(minValue);
  latestAds = ads;
  const response = AdsGenerateResponseSchema.parse({
    success: true,
    ads,
    generated_at: new Date().toISOString(),
  });

  return c.json(response);
});

app.get("/api/ads/export", () => {
  metrics.requestsTotal += 1;
  const csv = buildAdsCsv(latestAds);
  return new Response(csv, {
    headers: AdsExportResponseHeaders,
  });
});

app.post("/api/smart-evaluate", async (c) => {
  metrics.requestsTotal += 1;
  const requestId = crypto.randomUUID();

  if (!authenticate(c)) {
    metrics.evaluationFailureTotal += 1;
    return c.json(unauthorizedResponse(requestId), 401);
  }

  const apiKey =
    normalizeAuthToken(c.req.header("Authorization")) || DEFAULT_API_KEY;
  const bucket = applyRateLimiting(apiKey);
  const remaining = Math.max(0, RATE_LIMIT_MAX - bucket.count);
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
  };

  if (bucket.count > RATE_LIMIT_MAX) {
    metrics.rateLimitedTotal += 1;
    return c.json(rateLimitedResponse(requestId), 429, {
      ...headers,
      "Retry-After": String(Math.ceil((bucket.resetAt - Date.now()) / 1000)),
    });
  }

  let payload;
  try {
    payload = await c.req.json();
  } catch (error) {
    metrics.evaluationFailureTotal += 1;
    return c.json(
      invalidInputResponse(requestId, "Requête JSON invalide"),
      400,
      headers,
    );
  }

  const parsed = SmartEvaluateRequestSchema.safeParse(payload);
  if (!parsed.success) {
    metrics.evaluationFailureTotal += 1;
    return c.json(
      invalidInputResponse(
        requestId,
        "Le payload ne respecte pas le schéma attendu",
        parsed.error.flatten(),
      ),
      400,
      headers,
    );
  }

  const idempotencyKey = c.req.header("X-Idempotency-Key");
  if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
    const stored = idempotencyStore.get(idempotencyKey)!;
    headers["X-Idempotent-Replay"] = "true";
    metrics.cacheHitTotal += 1;
    return c.json(stored, 200, headers);
  }

  const requestPayload = parsed.data;
  const useCache = requestPayload.options?.useCache !== false;
  const cacheKey = getCacheKey(requestPayload);
  const cachedEntry = useCache ? evaluationCache.get(cacheKey) : undefined;

  let response: SmartEvaluateResponse;
  if (cachedEntry && useCache) {
    cacheStats.hits += 1;
    cachedEntry.hits += 1;
    metrics.cacheHitTotal += 1;
    response = {
      ...cachedEntry.response,
      cached: true,
      processing_time_ms: computeProcessingTime(hashString(cacheKey), true),
      timestamp: new Date().toISOString(),
    };
  } else {
    cacheStats.misses += 1;
    response = buildEvaluationResponse(requestPayload, {
      cached: false,
      requestId: idempotencyKey || requestId,
    });
    if (useCache) {
      evaluationCache.set(cacheKey, {
        response,
        createdAt: Date.now(),
        hits: 0,
      });
      cacheStats.totalEntries = evaluationCache.size;
    }
  }

  metrics.evaluationSuccessTotal += 1;

  if (idempotencyKey) {
    idempotencyStore.set(idempotencyKey, response);
    headers["X-Idempotent-Replay"] = "false";
  }

  return c.json(response, 200, headers);
});

app.post("/api/advanced-analysis", async (c) => {
  metrics.requestsTotal += 1;
  const requestId = crypto.randomUUID();

  if (!authenticate(c)) {
    metrics.evaluationFailureTotal += 1;
    return c.json(unauthorizedResponse(requestId), 401);
  }

  let payload;
  try {
    payload = await c.req.json();
  } catch (error) {
    metrics.evaluationFailureTotal += 1;
    return c.json(
      invalidInputResponse(requestId, "Requête JSON invalide"),
      400,
    );
  }

  const parsed = AdvancedAnalysisRequestSchema.safeParse(payload);
  if (!parsed.success) {
    metrics.evaluationFailureTotal += 1;
    return c.json(
      invalidInputResponse(
        requestId,
        "Le payload ne respecte pas le schéma attendu",
        parsed.error.flatten(),
      ),
      400,
    );
  }

  const seedText = parsed.data.text_input || parsed.data.query || "analysis";
  const hash = hashString(seedText);
  const expertDetails = ["vision", "claude", "gemini"].map((expert, index) => ({
    expert: expert as "vision" | "claude" | "gemini",
    confidence: 0.6 + index * 0.1,
    payload: {
      notes: `${expert} analysis for ${seedText}`,
      comparable_sales: [`${seedText} sale ${index + 1}`],
    },
    latency_ms: 300 + index * 40,
  }));

  const response = {
    success: true,
    consolidated_analysis: {
      expert_consensus: 70 + (hash % 20),
      estimated_value: {
        min: 120,
        max: 320,
        average: 220,
        currency: "CAD",
      },
      rarity: rarityLevels[hash % rarityLevels.length],
      category: chooseCategory(seedText),
    },
    expert_details: parsed.data.include_expert_details ? expertDetails : [],
    request_id: requestId,
    timestamp: new Date().toISOString(),
  };

  metrics.evaluationSuccessTotal += 1;
  return c.json(response);
});

export default app;
