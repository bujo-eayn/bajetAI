/**
 * Summary Length Calculator
 *
 * Provides utilities for calculating dynamic summary lengths based on document size.
 * Implements the 10% rule: summary should be ~10% of original document length.
 *
 * Features:
 * - Word count estimation from character count
 * - Dynamic length calculation with min/max ranges
 * - Absolute constraints (200-15,000 words)
 * - Per-chunk length calculation for multi-chunk documents
 * - Edge case handling for very small and very large documents
 */

// Absolute constraints
const ABSOLUTE_MIN_WORDS = 200;
const ABSOLUTE_MAX_WORDS = 15000;

// Dynamic calculation parameters
const CHARS_PER_WORD = 5; // Average characters per word
const TARGET_PERCENTAGE = 0.10; // 10% of original document
const MIN_PERCENTAGE = 0.08; // 80% of target (8% of original)
const MAX_PERCENTAGE = 0.12; // 120% of target (12% of original)

/**
 * Estimate word count from character count
 *
 * @param charCount - Number of characters in text
 * @returns Estimated word count (rounded up)
 */
export function estimateWordCount(charCount: number): number {
  if (charCount <= 0) return 0;
  return Math.ceil(charCount / CHARS_PER_WORD);
}

/**
 * Calculate dynamic summary length based on document size
 *
 * Implements the 10% rule with 80%-120% range for flexibility.
 * Applies absolute constraints of 200-15,000 words.
 *
 * @param charCount - Number of characters in source document
 * @returns Object with minLength, maxLength, and targetLength in words
 *
 * @example
 * // 50-page document (~125,000 chars)
 * calculateSummaryLength(125000)
 * // Returns: { minLength: 2000, maxLength: 3000, targetLength: 2500 }
 *
 * @example
 * // Very short document (500 chars)
 * calculateSummaryLength(500)
 * // Returns: { minLength: 200, maxLength: 200, targetLength: 200 }
 */
export function calculateSummaryLength(charCount: number): {
  minLength: number;
  maxLength: number;
  targetLength: number;
} {
  // Estimate word count
  const estimatedWords = estimateWordCount(charCount);

  // Calculate 10% target
  const rawTarget = Math.ceil(estimatedWords * TARGET_PERCENTAGE);

  // Calculate 80%-120% range
  const rawMin = Math.ceil(estimatedWords * MIN_PERCENTAGE);
  const rawMax = Math.ceil(estimatedWords * MAX_PERCENTAGE);

  // Apply absolute constraints
  const targetLength = Math.max(
    ABSOLUTE_MIN_WORDS,
    Math.min(rawTarget, ABSOLUTE_MAX_WORDS)
  );

  const minLength = Math.max(
    ABSOLUTE_MIN_WORDS,
    Math.min(rawMin, ABSOLUTE_MAX_WORDS)
  );

  const maxLength = Math.max(
    ABSOLUTE_MIN_WORDS,
    Math.min(rawMax, ABSOLUTE_MAX_WORDS)
  );

  // Ensure min <= target <= max
  return {
    minLength: Math.min(minLength, targetLength),
    maxLength: Math.max(maxLength, targetLength),
    targetLength,
  };
}

/**
 * Calculate summary length for individual chunks in multi-chunk documents
 *
 * Distributes the document target length proportionally across chunks.
 * Ensures each chunk contributes appropriately to final summary.
 *
 * @param totalChunks - Total number of chunks in document
 * @param documentTarget - Target word count for entire document summary
 * @returns Object with minLength and maxLength for each chunk
 *
 * @example
 * // Document with 100 chunks, target 5000 words
 * calculateChunkLength(100, 5000)
 * // Returns: { minLength: 40, maxLength: 60, targetLength: 50 }
 */
export function calculateChunkLength(
  totalChunks: number,
  documentTarget: number
): {
  minLength: number;
  maxLength: number;
  targetLength: number;
} {
  if (totalChunks <= 0) {
    throw new Error('totalChunks must be positive');
  }

  if (documentTarget <= 0) {
    throw new Error('documentTarget must be positive');
  }

  // Calculate per-chunk target
  const targetPerChunk = Math.ceil(documentTarget / totalChunks);

  // Apply 80%-120% range for flexibility
  const minPerChunk = Math.ceil(targetPerChunk * 0.8);
  const maxPerChunk = Math.ceil(targetPerChunk * 1.2);

  // Ensure minimum of 10 words per chunk (very small chunks)
  const targetLength = Math.max(10, targetPerChunk);
  const minLength = Math.max(10, minPerChunk);
  const maxLength = Math.max(10, maxPerChunk);

  return {
    minLength,
    maxLength,
    targetLength,
  };
}

/**
 * Calculate coverage percentage (actual vs target)
 *
 * @param actualWords - Actual word count of generated summary
 * @param targetWords - Target word count
 * @returns Coverage percentage (0-100+)
 *
 * @example
 * calculateCoverage(2400, 2500) // Returns: 96
 */
export function calculateCoverage(actualWords: number, targetWords: number): number {
  if (targetWords <= 0) return 0;
  return Math.round((actualWords / targetWords) * 100);
}

/**
 * Validate that summary length is within acceptable range
 *
 * @param actualWords - Actual word count of generated summary
 * @param minWords - Minimum acceptable word count
 * @param maxWords - Maximum acceptable word count
 * @returns True if within range, false otherwise
 */
export function isLengthValid(
  actualWords: number,
  minWords: number,
  maxWords: number
): boolean {
  return actualWords >= minWords && actualWords <= maxWords;
}

/**
 * Format length statistics for logging
 *
 * @param actual - Actual word count
 * @param target - Target word count
 * @param min - Minimum word count
 * @param max - Maximum word count
 * @returns Formatted string for logging
 */
export function formatLengthStats(
  actual: number,
  target: number,
  min: number,
  max: number
): string {
  const coverage = calculateCoverage(actual, target);
  const status = isLengthValid(actual, min, max) ? '✓' : '✗';

  return `${status} ${actual} words (target: ${target}, range: ${min}-${max}, coverage: ${coverage}%)`;
}
