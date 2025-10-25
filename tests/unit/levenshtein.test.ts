/**
 * Unit tests for Levenshtein distance algorithm
 */

import { describe, it, expect } from 'vitest';
import {
  levenshteinDistance,
  levenshteinSimilarity,
  normalizeForComparison,
  areLikelyDuplicates,
  findDuplicateGroups,
  removeDuplicates
} from '../../src/lib/levenshtein';

describe('Levenshtein Distance', () => {
  it('should calculate distance correctly', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('', '')).toBe(0);
    expect(levenshteinDistance('abc', 'abc')).toBe(0);
    expect(levenshteinDistance('abc', 'def')).toBe(3);
  });

  it('should handle edge cases', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
    expect(levenshteinDistance('a', 'a')).toBe(0);
  });
});

describe('Levenshtein Similarity', () => {
  it('should calculate similarity ratio correctly', () => {
    expect(levenshteinSimilarity('abc', 'abc')).toBe(1.0);
    expect(levenshteinSimilarity('', '')).toBe(1.0);
    expect(levenshteinSimilarity('abc', 'xyz')).toBeLessThan(0.5);
  });

  it('should return 0 for completely different strings', () => {
    const similarity = levenshteinSimilarity('aaaa', 'bbbb');
    expect(similarity).toBe(0);
  });

  it('should handle partial matches', () => {
    const similarity = levenshteinSimilarity('Harry Potter', 'Harry Potte');
    expect(similarity).toBeGreaterThan(0.9);
  });
});

describe('Normalize For Comparison', () => {
  it('should normalize strings correctly', () => {
    expect(normalizeForComparison('Harry Potter')).toBe('harry potter');
    expect(normalizeForComparison('Café  au   lait')).toBe('cafe au lait');
    expect(normalizeForComparison('L\'Étranger')).toBe('letranger');
  });

  it('should remove punctuation', () => {
    expect(normalizeForComparison('Hello, World!')).toBe('hello world');
    expect(normalizeForComparison('don\'t')).toBe('dont');
  });

  it('should collapse whitespace', () => {
    expect(normalizeForComparison('a    b    c')).toBe('a b c');
    expect(normalizeForComparison('  trim  me  ')).toBe('trim me');
  });
});

describe('Are Likely Duplicates', () => {
  it('should detect exact duplicates', () => {
    const book1 = { title: 'Harry Potter', artist_author: 'J.K. Rowling', year: 1997 };
    const book2 = { title: 'Harry Potter', artist_author: 'J.K. Rowling', year: 1997 };
    expect(areLikelyDuplicates(book1, book2, 0.85)).toBe(true);
  });

  it('should detect near duplicates', () => {
    const book1 = { title: 'Harry Potter and the Philosopher\'s Stone', artist_author: 'J.K. Rowling' };
    const book2 = { title: 'Harry Potter and the Philosophers Stone', artist_author: 'JK Rowling' };
    expect(areLikelyDuplicates(book1, book2, 0.85)).toBe(true);
  });

  it('should reject different books', () => {
    const book1 = { title: 'Harry Potter', artist_author: 'J.K. Rowling', year: 1997 };
    const book2 = { title: 'Lord of the Rings', artist_author: 'J.R.R. Tolkien', year: 1954 };
    expect(areLikelyDuplicates(book1, book2, 0.85)).toBe(false);
  });

  it('should consider year matches', () => {
    const book1 = { title: 'Test Book', year: 2000 };
    const book2 = { title: 'Test Book', year: 2000 };
    expect(areLikelyDuplicates(book1, book2, 0.85)).toBe(true);

    const book3 = { title: 'Test Book', year: 2001 };
    expect(areLikelyDuplicates(book1, book3, 0.85)).toBe(true); // Close years
  });

  it('should require title', () => {
    const book1 = { artist_author: 'J.K. Rowling', year: 1997 };
    const book2 = { artist_author: 'J.K. Rowling', year: 1997 };
    expect(areLikelyDuplicates(book1 as any, book2 as any, 0.85)).toBe(false);
  });
});

describe('Find Duplicate Groups', () => {
  it('should find groups of duplicates', () => {
    const books = [
      { title: 'Book A', artist_author: 'Author 1' },
      { title: 'Book A', artist_author: 'Author 1' }, // Duplicate of 0
      { title: 'Book B', artist_author: 'Author 2' },
      { title: 'Book A', artist_author: 'Author 1' }, // Duplicate of 0
      { title: 'Book C', artist_author: 'Author 3' },
    ];

    const groups = findDuplicateGroups(books, 0.85);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual([0, 1, 3]);
  });

  it('should return empty array when no duplicates', () => {
    const books = [
      { title: 'Book A' },
      { title: 'Book B' },
      { title: 'Book C' },
    ];

    const groups = findDuplicateGroups(books, 0.85);
    expect(groups).toHaveLength(0);
  });
});

describe('Remove Duplicates', () => {
  it('should remove duplicates and keep first occurrence', () => {
    const books = [
      { title: 'Harry Potter', artist_author: 'J.K. Rowling', year: 1997 },
      { title: 'Harry Potter', artist_author: 'JK Rowling', year: 1997 }, // Duplicate
      { title: 'Lord of the Rings', artist_author: 'Tolkien', year: 1954 },
      { title: 'Harry Potter', artist_author: 'J.K. Rowling', year: 1997 }, // Duplicate
    ];

    const result = removeDuplicates(books, 0.85);

    expect(result.unique).toHaveLength(2);
    expect(result.duplicates).toHaveLength(2);
    expect(result.unique[0].title).toBe('Harry Potter');
    expect(result.unique[1].title).toBe('Lord of the Rings');
  });

  it('should handle empty array', () => {
    const result = removeDuplicates([], 0.85);
    expect(result.unique).toHaveLength(0);
    expect(result.duplicates).toHaveLength(0);
  });

  it('should handle array with no duplicates', () => {
    const books = [
      { title: 'Book A' },
      { title: 'Book B' },
      { title: 'Book C' },
    ];

    const result = removeDuplicates(books, 0.85);
    expect(result.unique).toHaveLength(3);
    expect(result.duplicates).toHaveLength(0);
  });
});
