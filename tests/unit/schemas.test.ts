// 🧪 Unit Tests - Zod Schema Validation
// Tests for request/response schema validation

import { describe, it, expect } from 'vitest';
import {
  SmartEvaluateRequestSchema,
  CategorySchema,
  ConditionSchema,
  validateRequest
} from '../../src/schemas/evaluate.schema';

describe('SmartEvaluateRequestSchema', () => {
  it('should validate valid text input request', () => {
    const validRequest = {
      mode: 'text',
      text_input: 'Abbey Road by The Beatles'
    };

    const result = SmartEvaluateRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should validate valid image input request', () => {
    const validRequest = {
      mode: 'image',
      imageUrls: ['https://example.com/image.jpg']
    };

    const result = SmartEvaluateRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject request with no inputs', () => {
    const invalidRequest = {
      mode: 'text'
      // Missing text_input, imageUrls, videoUrl
    };

    const result = SmartEvaluateRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should validate text input length', () => {
    const tooLong = {
      mode: 'text',
      text_input: 'a'.repeat(501) // Max is 500
    };

    const result = SmartEvaluateRequestSchema.safeParse(tooLong);
    expect(result.success).toBe(false);
  });

  it('should validate imageUrls array length', () => {
    const tooManyImages = {
      mode: 'image',
      imageUrls: Array(11).fill('https://example.com/image.jpg') // Max is 10
    };

    const result = SmartEvaluateRequestSchema.safeParse(tooManyImages);
    expect(result.success).toBe(false);
  });

  it('should validate category enum', () => {
    const validCategories = ['Books', 'Music', 'Art', 'Trading Cards'];

    validCategories.forEach(category => {
      const result = CategorySchema.safeParse(category);
      expect(result.success).toBe(true);
    });

    const invalidCategory = CategorySchema.safeParse('InvalidCategory');
    expect(invalidCategory.success).toBe(false);
  });

  it('should validate condition enum', () => {
    const validConditions = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Poor'];

    validConditions.forEach(condition => {
      const result = ConditionSchema.safeParse(condition);
      expect(result.success).toBe(true);
    });
  });

  it('should validate options with defaults', () => {
    const requestWithOptions = {
      mode: 'text',
      text_input: 'Test item',
      options: {
        dedupeThreshold: 0.9,
        useCache: false,
        expertSources: ['vision', 'claude']
      }
    };

    const result = SmartEvaluateRequestSchema.safeParse(requestWithOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options?.dedupeThreshold).toBe(0.9);
      expect(result.data.options?.useCache).toBe(false);
    }
  });

  it('should reject invalid expert sources', () => {
    const invalidExperts = {
      mode: 'text',
      text_input: 'Test',
      options: {
        expertSources: ['invalid_expert']
      }
    };

    const result = SmartEvaluateRequestSchema.safeParse(invalidExperts);
    expect(result.success).toBe(false);
  });

  it('should validate UUID format for clientRequestId', () => {
    const validUUID = {
      mode: 'text',
      text_input: 'Test',
      options: {
        clientRequestId: '550e8400-e29b-41d4-a716-446655440000'
      }
    };

    const result = SmartEvaluateRequestSchema.safeParse(validUUID);
    expect(result.success).toBe(true);

    const invalidUUID = {
      mode: 'text',
      text_input: 'Test',
      options: {
        clientRequestId: 'not-a-uuid'
      }
    };

    const result2 = SmartEvaluateRequestSchema.safeParse(invalidUUID);
    expect(result2.success).toBe(false);
  });
});

describe('validateRequest helper', () => {
  it('should return success for valid data', () => {
    const validData = {
      mode: 'text',
      text_input: 'Test'
    };

    const result = validateRequest(SmartEvaluateRequestSchema, validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.text_input).toBe('Test');
    }
  });

  it('should return error for invalid data', () => {
    const invalidData = {
      mode: 'text'
      // Missing required input
    };

    const result = validateRequest(SmartEvaluateRequestSchema, invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.error.code).toBe('INVALID_INPUT');
    }
  });
});
