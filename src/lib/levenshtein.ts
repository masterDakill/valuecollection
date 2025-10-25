/**
 * Levenshtein Distance Calculator
 * Used for fuzzy matching and duplicate detection
 */

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits required
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a 2D array for dynamic programming
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity ratio (0-1) between two strings
 * 1.0 = identical, 0.0 = completely different
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(str1, str2);
  return 1.0 - distance / maxLen;
}

/**
 * Normalize string for better comparison
 * - Lowercase
 * - Remove accents
 * - Remove punctuation
 * - Collapse whitespace
 */
export function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD') // Decompose accents
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

/**
 * Check if two books are likely duplicates
 * Uses multi-criteria matching:
 * - Title similarity (Levenshtein)
 * - Year match
 * - Author/Publisher match
 */
export function areLikelyDuplicates(
  book1: {
    title?: string;
    artist_author?: string;
    publisher_label?: string;
    year?: number;
  },
  book2: {
    title?: string;
    artist_author?: string;
    publisher_label?: string;
    year?: number;
  },
  threshold: number = 0.85
): boolean {
  // Both must have a title
  if (!book1.title || !book2.title) return false;

  // Normalize titles
  const title1 = normalizeForComparison(book1.title);
  const title2 = normalizeForComparison(book2.title);

  // Calculate title similarity
  const titleSimilarity = levenshteinSimilarity(title1, title2);

  // If titles are very different, not a duplicate
  if (titleSimilarity < threshold) return false;

  // If titles are identical, likely duplicate
  if (titleSimilarity >= 0.95) return true;

  // Check additional criteria
  let matchScore = titleSimilarity;
  let criteriaCount = 1;

  // Year match
  if (book1.year && book2.year) {
    criteriaCount++;
    if (book1.year === book2.year) {
      matchScore += 1.0;
    } else if (Math.abs(book1.year - book2.year) <= 1) {
      matchScore += 0.5; // Close years (reprints, etc.)
    }
  }

  // Author match
  if (book1.artist_author && book2.artist_author) {
    criteriaCount++;
    const author1 = normalizeForComparison(book1.artist_author);
    const author2 = normalizeForComparison(book2.artist_author);
    matchScore += levenshteinSimilarity(author1, author2);
  }

  // Publisher match
  if (book1.publisher_label && book2.publisher_label) {
    criteriaCount++;
    const pub1 = normalizeForComparison(book1.publisher_label);
    const pub2 = normalizeForComparison(book2.publisher_label);
    matchScore += levenshteinSimilarity(pub1, pub2);
  }

  // Average score across all criteria
  const avgScore = matchScore / criteriaCount;

  return avgScore >= threshold;
}

/**
 * Find all duplicates in a list of books
 * Returns groups of duplicate indices
 */
export function findDuplicateGroups<T extends {
  title?: string;
  artist_author?: string;
  publisher_label?: string;
  year?: number;
}>(
  books: T[],
  threshold: number = 0.85
): number[][] {
  const duplicateGroups: number[][] = [];
  const processed = new Set<number>();

  for (let i = 0; i < books.length; i++) {
    if (processed.has(i)) continue;

    const group = [i];
    processed.add(i);

    for (let j = i + 1; j < books.length; j++) {
      if (processed.has(j)) continue;

      if (areLikelyDuplicates(books[i], books[j], threshold)) {
        group.push(j);
        processed.add(j);
      }
    }

    if (group.length > 1) {
      duplicateGroups.push(group);
    }
  }

  return duplicateGroups;
}

/**
 * Remove duplicates from a list, keeping the first occurrence
 */
export function removeDuplicates<T extends {
  title?: string;
  artist_author?: string;
  publisher_label?: string;
  year?: number;
}>(
  books: T[],
  threshold: number = 0.85
): {
  unique: T[];
  duplicates: T[];
  duplicateGroups: number[][];
} {
  const duplicateGroups = findDuplicateGroups(books, threshold);
  const duplicateIndices = new Set(
    duplicateGroups.flatMap(group => group.slice(1))
  );

  const unique: T[] = [];
  const duplicates: T[] = [];

  books.forEach((book, index) => {
    if (duplicateIndices.has(index)) {
      duplicates.push(book);
    } else {
      unique.push(book);
    }
  });

  return { unique, duplicates, duplicateGroups };
}
