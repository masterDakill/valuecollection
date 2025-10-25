import { z } from "zod";

export const BoundingBoxSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const DetectedItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string().optional(),
  confidence: z.number().min(0).max(1),
  estimated_value: z.number().min(0),
  currency: z.string().default("CAD"),
  category: z.string(),
  condition: z.string(),
  rarity: z.string(),
  bbox: BoundingBoxSchema.optional(),
  notes: z.string().optional(),
});

export type DetectedItem = z.infer<typeof DetectedItemSchema>;

export const PhotoRecordSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  file_name: z.string(),
  captured_at: z.string(),
  source: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  checksum: z.string(),
  dominant_color: z.string(),
  detected_items: z.array(DetectedItemSchema),
});

export type PhotoRecord = z.infer<typeof PhotoRecordSchema>;

export const PhotoAnalyzeOptionsSchema = z
  .object({
    maxItems: z.number().int().min(1).max(10).default(5),
    collectionId: z.string().optional(),
  })
  .default({ maxItems: 5 });

export const PhotoAnalyzeRequestSchema = z
  .object({
    imageUrl: z.string().url().optional(),
    imageBase64: z.string().optional(),
    options: PhotoAnalyzeOptionsSchema.optional(),
  })
  .refine((value) => Boolean(value.imageUrl || value.imageBase64), {
    message: "imageUrl ou imageBase64 est requis",
    path: ["imageUrl"],
  });

export type PhotoAnalyzeRequest = z.infer<typeof PhotoAnalyzeRequestSchema>;

export const PhotoAnalyzeResponseSchema = z.object({
  success: z.literal(true),
  photo: PhotoRecordSchema,
  stats: z.object({
    detected_items: z.number().int().min(0),
    processing_time_ms: z.number().min(0),
  }),
  request_id: z.string(),
  timestamp: z.string(),
});

export const PhotosListResponseSchema = z.object({
  success: z.literal(true),
  photos: z.array(PhotoRecordSchema),
  stats: z.object({
    total_photos: z.number().int().min(0),
    last_photo_at: z.string().nullable(),
  }),
  timestamp: z.string(),
});

export type PhotosListResponse = z.infer<typeof PhotosListResponseSchema>;

export const ItemsListResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(
    z.object({
      id: z.string(),
      photo_id: z.string(),
      title: z.string(),
      author: z.string().optional(),
      category: z.string(),
      confidence: z.number().min(0).max(1),
      estimated_value: z.number().min(0),
      currency: z.string(),
      condition: z.string(),
      rarity: z.string(),
      last_seen_at: z.string(),
    }),
  ),
  stats: z.object({
    total_items: z.number().int().min(0),
    total_value: z.number().min(0),
    currency: z.string(),
  }),
  timestamp: z.string(),
});

export type InventoryItem = z.infer<typeof ItemsListResponseSchema>['items'][number];

export type ItemsListResponse = z.infer<typeof ItemsListResponseSchema>;

export const AdsGenerateRequestSchema = z.object({
  min_value: z.number().min(0).default(0),
});

export const AdListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number().min(0),
  currency: z.string(),
  description: z.string(),
  photo_url: z.string().url().optional(),
  tags: z.array(z.string()),
});

export type AdListing = z.infer<typeof AdListingSchema>;

export const AdsGenerateResponseSchema = z.object({
  success: z.literal(true),
  ads: z.array(AdListingSchema),
  generated_at: z.string(),
});

export const AdsExportResponseHeaders = {
  "content-type": "text/csv; charset=utf-8",
  "content-disposition": "attachment; filename=ads-export.csv",
} as const;
