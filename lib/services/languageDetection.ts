/**
 * Language Detection Service
 *
 * Detects whether text is in English or Swahili using heuristic-based detection.
 * Optimized for budget document queries where users may ask questions in either language.
 *
 * Features:
 * - Fast heuristic-based detection (no API calls)
 * - Swahili-specific indicator words
 * - Configurable threshold for detection confidence
 * - Handles mixed-language queries
 */

import type { DetectedLanguage } from '@/types';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Threshold for Swahili classification
 * If the percentage of Swahili indicators exceeds this, classify as Swahili
 */
const SWAHILI_THRESHOLD = 0.15; // 15% of words must be Swahili indicators

/**
 * Minimum words required for reliable detection
 * Below this, default to English
 */
const MIN_WORDS_FOR_DETECTION = 3;

// =============================================================================
// SWAHILI LANGUAGE INDICATORS
// =============================================================================

/**
 * Common Swahili words and particles
 * These are words that appear frequently in Swahili but rarely in English
 */
const SWAHILI_INDICATORS = new Set([
  // Question words
  'nini', 'vipi', 'wapi', 'lini', 'kwa', 'nani', 'gani', 'je',

  // Common particles and prepositions
  'na', 'ya', 'wa', 'za', 'la', 'katika', 'kwa', 'kwenye', 'ndani',
  'nje', 'juu', 'chini', 'mbele', 'nyuma', 'karibu', 'mbali',

  // Pronouns
  'mimi', 'wewe', 'yeye', 'sisi', 'nyinyi', 'wao', 'yake', 'yangu',
  'yetu', 'yao', 'hii', 'hiyo', 'hizi', 'hizo', 'ile', 'hili',

  // Common verbs (stems)
  'ni', 'si', 'kuwa', 'kufanya', 'kusema', 'kwenda', 'kuja', 'kuona',
  'kupata', 'kutaka', 'kujua', 'kuwa', 'kuambia', 'kusaidia',

  // Verb prefixes/suffixes
  'nina', 'una', 'ana', 'tuna', 'mna', 'wana', // present tense
  'nilikuwa', 'ulikuwa', 'alikuwa', // past tense
  'nitakuwa', 'utakuwa', 'atakuwa', // future tense

  // Budget-related terms
  'bajeti', 'fedha', 'pesa', 'matumizi', 'mapato', 'mgawanyo',
  'serikali', 'kaunti', 'wilaya', 'mkoa', 'taifa',
  'elimu', 'afya', 'kilimo', 'miundombinu', 'usalama',

  // Common adjectives/adverbs
  'kubwa', 'ndogo', 'mpya', 'zamani', 'sasa', 'baadaye', 'kabla',
  'zaidi', 'kidogo', 'sana', 'kabisa', 'tu', 'pia', 'lakini', 'au',

  // Numbers (Swahili)
  'moja', 'mbili', 'tatu', 'nne', 'tano', 'sita', 'saba', 'nane',
  'tisa', 'kumi', 'ishirini', 'mia', 'elfu', 'milioni', 'bilioni',

  // Document-related
  'hati', 'ripoti', 'mpango', 'sera', 'sheria', 'sura', 'sehemu',
  'jedwali', 'muhtasari', 'maelezo', 'malengo', 'vipaumbele',
]);

/**
 * Swahili word patterns (regex)
 * These patterns help identify Swahili morphological structures
 */
const SWAHILI_PATTERNS = [
  // Noun class prefixes
  /^m[a-z]+$/i,   // m- prefix (e.g., mtu, mwaka)
  /^wa[a-z]+$/i,  // wa- prefix (e.g., watu, wanafunzi)
  /^ki[a-z]+$/i,  // ki- prefix (e.g., kitu, kitabu)
  /^vi[a-z]+$/i,  // vi- prefix (e.g., vitu, vitabu)
  /^u[a-z]+$/i,   // u- prefix (e.g., ugonjwa, uhuru)

  // Verb patterns
  /^ku[a-z]+a$/i,  // infinitive (e.g., kusoma, kuandika)
  /^ni[a-z]+a$/i,  // first person (e.g., ninasoma, ninaandika)
  /^a[a-z]+a$/i,   // third person (e.g., anasoma, anaandika)
];

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Check if a word matches Swahili patterns
 */
function matchesSwahiliPattern(word: string): boolean {
  return SWAHILI_PATTERNS.some((pattern) => pattern.test(word));
}

/**
 * Calculate Swahili score for text
 * Returns a value between 0 and 1
 */
function calculateSwahiliScore(text: string): number {
  // Normalize and split into words
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter((word) => word.length >= 2); // Ignore single characters

  if (words.length === 0) {
    return 0;
  }

  let swahiliCount = 0;

  for (const word of words) {
    // Check if word is in indicator set
    if (SWAHILI_INDICATORS.has(word)) {
      swahiliCount++;
      continue;
    }

    // Check if word matches Swahili patterns
    if (matchesSwahiliPattern(word)) {
      swahiliCount += 0.5; // Partial score for pattern match
    }
  }

  return swahiliCount / words.length;
}

/**
 * Detect language of text
 *
 * @param text - Input text to analyze
 * @returns Detected language ('en' or 'sw')
 */
export function detectLanguage(text: string): DetectedLanguage {
  if (!text || text.trim().length === 0) {
    return 'en'; // Default to English for empty input
  }

  const words = text.trim().split(/\s+/);

  // For very short queries, default to English
  if (words.length < MIN_WORDS_FOR_DETECTION) {
    // Check if any word is a strong Swahili indicator
    const hasStrongIndicator = words.some((word) =>
      SWAHILI_INDICATORS.has(word.toLowerCase())
    );

    return hasStrongIndicator ? 'sw' : 'en';
  }

  const swahiliScore = calculateSwahiliScore(text);

  console.log(
    `[LanguageDetection] Score: ${(swahiliScore * 100).toFixed(1)}% ` +
      `(threshold: ${SWAHILI_THRESHOLD * 100}%)`
  );

  return swahiliScore >= SWAHILI_THRESHOLD ? 'sw' : 'en';
}

/**
 * Detect language with confidence score
 *
 * @param text - Input text to analyze
 * @returns Object with detected language and confidence
 */
export function detectLanguageWithConfidence(text: string): {
  language: DetectedLanguage;
  confidence: number;
  swahiliScore: number;
} {
  if (!text || text.trim().length === 0) {
    return {
      language: 'en',
      confidence: 1.0,
      swahiliScore: 0,
    };
  }

  const swahiliScore = calculateSwahiliScore(text);

  // Calculate confidence based on how far from threshold
  let confidence: number;
  let language: DetectedLanguage;

  if (swahiliScore >= SWAHILI_THRESHOLD) {
    language = 'sw';
    // Higher score = higher confidence for Swahili
    confidence = Math.min(1.0, 0.5 + swahiliScore);
  } else {
    language = 'en';
    // Lower score = higher confidence for English
    confidence = Math.min(1.0, 1.0 - swahiliScore);
  }

  return {
    language,
    confidence,
    swahiliScore,
  };
}

/**
 * Check if text contains mixed languages
 *
 * @param text - Input text to analyze
 * @returns True if text appears to be mixed English/Swahili
 */
export function isMixedLanguage(text: string): boolean {
  const swahiliScore = calculateSwahiliScore(text);

  // Mixed if score is in the "uncertain" range
  return swahiliScore >= 0.1 && swahiliScore <= 0.4;
}

/**
 * Get language name for display
 */
export function getLanguageName(language: DetectedLanguage): string {
  return language === 'sw' ? 'Kiswahili' : 'English';
}

/**
 * Get language name in that language
 */
export function getLanguageNameNative(language: DetectedLanguage): string {
  return language === 'sw' ? 'Kiswahili' : 'English';
}
