/**
 * Translation Service
 *
 * Handles translation of English summaries to Swahili (and vice versa) using OpenAI.
 * Optimized for budget document summaries with domain-specific context.
 *
 * Phase: 6 - Translation
 */

import OpenAI from 'openai';

// Environment configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Translation direction
export type TranslationDirection = 'en-to-sw' | 'sw-to-en';

// Translation options
export interface TranslationOptions {
  direction: TranslationDirection;
  timeout?: number; // Timeout in milliseconds (default: 30s)
  contextType?: 'budget' | 'general'; // Context type for better translations
}

// Translation result
export interface TranslationResult {
  translatedText: string;
  sourceLanguage: 'en' | 'sw';
  targetLanguage: 'en' | 'sw';
  modelVersion: string;
  confidence: number;
  characterCount: number;
  wordCount: number;
  durationMs: number;
}

// OpenAI client (lazy initialization)
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY not configured. Translation service unavailable.'
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return client;
}

/**
 * Translate text from English to Swahili or vice versa
 */
export async function translateText(
  text: string,
  options: TranslationOptions
): Promise<TranslationResult> {
  const { direction, timeout = 30000, contextType = 'budget' } = options;

  // Validation
  if (!text || text.trim().length === 0) {
    throw new Error('Text to translate cannot be empty');
  }

  if (text.length > 50000) {
    throw new Error(
      'Text too long for translation. Maximum 50,000 characters.'
    );
  }

  const startTime = Date.now();
  const sourceLanguage = direction === 'en-to-sw' ? 'en' : 'sw';
  const targetLanguage = direction === 'en-to-sw' ? 'sw' : 'en';

  try {
    const client = getClient();

    // Create context-aware system prompt
    const systemPrompt = createSystemPrompt(direction, contextType);

    // Create translation prompt
    const userPrompt = createUserPrompt(text, direction);

    console.log(
      `[Translation] Starting ${direction} translation (${text.length} chars)...`
    );

    // Call OpenAI API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await client.chat.completions.create(
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.3, // Low temperature for accurate translation
        max_tokens: Math.ceil(text.length * 2), // Translations can be longer
      },
      {
        signal: controller.signal as any,
      }
    );

    clearTimeout(timeoutId);

    const translatedText = response.choices[0]?.message?.content?.trim() || '';
    const durationMs = Date.now() - startTime;

    if (!translatedText) {
      throw new Error('Translation returned empty result');
    }

    // Calculate metrics
    const characterCount = translatedText.length;
    const wordCount = translatedText.split(/\s+/).filter((w) => w.length > 0)
      .length;

    // Confidence score based on response quality
    const confidence = calculateConfidence(text, translatedText, direction);

    console.log(
      `[Translation] Success in ${durationMs}ms. Output: ${characterCount} chars, ${wordCount} words (confidence: ${confidence.toFixed(2)})`
    );

    return {
      translatedText,
      sourceLanguage,
      targetLanguage,
      modelVersion: 'gpt-3.5-turbo',
      confidence,
      characterCount,
      wordCount,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[Translation] Error after ${durationMs}ms:`, error);

    // Classify error
    if (error instanceof Error) {
      if (error.message.includes('abort')) {
        throw new Error(
          `Translation timeout after ${timeout}ms. Try with shorter text.`
        );
      }
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key invalid or missing');
      }
      if (error.message.includes('rate limit')) {
        throw new Error(
          'OpenAI rate limit exceeded. Please try again later.'
        );
      }
    }

    throw new Error(
      `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create system prompt for translation based on context
 */
function createSystemPrompt(
  direction: TranslationDirection,
  contextType: 'budget' | 'general'
): string {
  const sourceLang = direction === 'en-to-sw' ? 'English' : 'Swahili';
  const targetLang = direction === 'en-to-sw' ? 'Swahili' : 'English';

  if (contextType === 'budget') {
    return `You are a professional translator specializing in government budget documents.
Your task is to translate ${sourceLang} text to ${targetLang} while:
1. Preserving all numbers, dates, and monetary amounts exactly as written
2. Maintaining formal, professional tone appropriate for government documents
3. Using proper terminology for budget-related terms (allocations, expenditures, revenue, etc.)
4. Keeping acronyms and organization names in original form unless standard translations exist
5. Ensuring cultural appropriateness for Kenyan context

Translate accurately and naturally. Do not add explanations or notes - provide only the translation.`;
  }

  return `You are a professional translator. Translate the following ${sourceLang} text to ${targetLang}.
Maintain the original meaning, tone, and style. Provide only the translation without explanations.`;
}

/**
 * Create user prompt for translation
 */
function createUserPrompt(
  text: string,
  direction: TranslationDirection
): string {
  const targetLang = direction === 'en-to-sw' ? 'Swahili' : 'English';
  return `Translate the following text to ${targetLang}:\n\n${text}`;
}

/**
 * Calculate confidence score for translation quality
 */
function calculateConfidence(
  sourceText: string,
  translatedText: string,
  direction: TranslationDirection
): number {
  // Base confidence for GPT-3.5-turbo translations
  let confidence = 0.85;

  // Factor 1: Length similarity (translations should be within reasonable range)
  const lengthRatio = translatedText.length / sourceText.length;
  if (lengthRatio < 0.5 || lengthRatio > 2.5) {
    // Very different lengths might indicate issues
    confidence -= 0.1;
  }

  // Factor 2: Check if translation is too similar (might not have translated)
  const similarity = calculateSimilarity(sourceText, translatedText);
  if (similarity > 0.9) {
    // Too similar - might not have translated properly
    confidence -= 0.2;
  }

  // Factor 3: Check for common translation indicators
  // Swahili text should have characteristic words
  if (direction === 'en-to-sw') {
    const swahiliIndicators = ['ya', 'na', 'kwa', 'wa', 'za'];
    const hasIndicators = swahiliIndicators.some((word) =>
      translatedText.toLowerCase().includes(` ${word} `)
    );
    if (!hasIndicators && translatedText.length > 50) {
      confidence -= 0.1;
    }
  }

  // Ensure confidence stays between 0 and 1
  return Math.max(0.5, Math.min(1.0, confidence));
}

/**
 * Calculate simple similarity between two texts
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(
    text1
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
  const words2 = new Set(
    text2
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Check if OpenAI is configured and available for translation
 */
export function isTranslationAvailable(): boolean {
  return !!OPENAI_API_KEY;
}

/**
 * Translate English summary to Swahili (convenience function)
 */
export async function translateEnglishToSwahili(
  englishText: string,
  timeout?: number
): Promise<TranslationResult> {
  return translateText(englishText, {
    direction: 'en-to-sw',
    contextType: 'budget',
    timeout,
  });
}

/**
 * Translate Swahili summary to English (convenience function)
 */
export async function translateSwahiliToEnglish(
  swahiliText: string,
  timeout?: number
): Promise<TranslationResult> {
  return translateText(swahiliText, {
    direction: 'sw-to-en',
    contextType: 'budget',
    timeout,
  });
}
