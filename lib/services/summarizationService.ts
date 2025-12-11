/**
 * Summarization Service
 *
 * This module provides intelligent text summarization with smart chunking for large documents.
 * It handles multi-level summarization, error handling, and fallback strategies.
 *
 * Features:
 * - Intelligent chunking with sentence boundary detection
 * - Multi-level summarization for long documents
 * - Fallback to extractive summarization if API fails
 * - Comprehensive error handling and validation
 * - Confidence scoring for summary quality
 */

import {
  openaiProvider,
  huggingFaceProvider,
  extractiveFallbackProvider,
  ProviderChain,
} from './providers';
import type { TokenUsage } from './providers/AIProvider';

// Chunking configuration - OPTIMIZED FOR GPT-3.5-TURBO 16K
const CHUNK_SIZE_TOKENS = 3000; // ~12000 characters (optimized for OpenAI 16k context)
const CHUNK_OVERLAP_TOKENS = 300; // ~1200 characters overlap
const MIN_CHUNK_TOKENS = 100;
const MAX_CHUNK_TOKENS = 3000; // Increased from 1024
const CHARS_PER_TOKEN = 4; // Approximate ratio

// Summarization configuration
const MAX_SUMMARY_LENGTH = 600; // words (for compatibility)
const MIN_SUMMARY_LENGTH = 200; // words (for compatibility)
const BATCH_SIZE = 3; // Process 3 chunks concurrently
const BATCH_DELAY_MS = 2000; // 2 second delay between batches

// Initialize provider chain: OpenAI → HuggingFace → Extractive
const providerChain = new ProviderChain([
  openaiProvider,
  huggingFaceProvider,
  extractiveFallbackProvider,
]);

export type SummarizationErrorType =
  | 'rate_limited'
  | 'timeout'
  | 'empty_content'
  | 'api_error'
  | 'invalid_response'
  | 'parsing_error'
  | 'model_error'
  | 'connection_error'
  | 'invalid_text'
  | 'unknown';

export interface SummarizationChunk {
  text: string;
  index: number;
  startPos: number;
  endPos: number;
  tokenCount: number;
}

export interface SummarizationResult {
  summary: string;
  confidence: number;
  modelVersion: string;
  charCount: number;
  chunkCount: number;
  errors?: string[];
  // OpenAI Migration - Phase 7: Add provider tracking
  provider?: string;
  tokensUsed?: TokenUsage;
  targetLength?: number;
  actualLength?: number;
}

/**
 * Estimate token count for text
 * Using simple heuristic: ~4 characters per token
 */
export function tokenizeText(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Find nearest sentence boundary for natural chunking
 */
function findSentenceBoundary(text: string, targetPos: number, searchBackward = true): number {
  // Sentence delimiters
  const delimiters = ['. ', '.\n', '! ', '!\n', '? ', '?\n'];

  if (searchBackward) {
    // Search backward from target position
    for (let i = targetPos; i >= Math.max(0, targetPos - 200); i--) {
      for (const delimiter of delimiters) {
        if (text.substring(i, i + delimiter.length) === delimiter) {
          return i + delimiter.length;
        }
      }
    }
    // Fallback: search for any whitespace
    for (let i = targetPos; i >= Math.max(0, targetPos - 200); i--) {
      if (/\s/.test(text[i])) {
        return i + 1;
      }
    }
  } else {
    // Search forward from target position
    for (let i = targetPos; i < Math.min(text.length, targetPos + 200); i++) {
      for (const delimiter of delimiters) {
        if (text.substring(i, i + delimiter.length) === delimiter) {
          return i + delimiter.length;
        }
      }
    }
    // Fallback: search for any whitespace
    for (let i = targetPos; i < Math.min(text.length, targetPos + 200); i++) {
      if (/\s/.test(text[i])) {
        return i + 1;
      }
    }
  }

  return targetPos; // No boundary found, use target position
}

/**
 * Split text into chunks with sentence boundary detection and overlap
 */
export function splitByBoundary(text: string): SummarizationChunk[] {
  const chunks: SummarizationChunk[] = [];
  const chunkSizeChars = CHUNK_SIZE_TOKENS * CHARS_PER_TOKEN;
  const overlapChars = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN;

  let position = 0;
  let index = 0;

  while (position < text.length) {
    // Calculate target end position
    let endPos = Math.min(position + chunkSizeChars, text.length);

    // Find sentence boundary if not at end of text
    if (endPos < text.length) {
      endPos = findSentenceBoundary(text, endPos, true);
    }

    // Extract chunk
    const chunkText = text.substring(position, endPos).trim();

    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        index,
        startPos: position,
        endPos,
        tokenCount: tokenizeText(chunkText),
      });
      index++;
    }

    // Move position forward, with overlap
    position = Math.max(position + 1, endPos - overlapChars);

    // Ensure we make progress
    if (endPos === position) {
      position = endPos + 1;
    }
  }

  return chunks;
}

/**
 * Validate summary quality
 */
export function validateSummary(summary: string, originalText: string): boolean {
  // Summary should not be empty
  if (!summary || summary.trim().length === 0) {
    return false;
  }

  // Summary should be shorter than original (at least 10% reduction)
  if (summary.length >= originalText.length * 0.9) {
    return false;
  }

  // Summary should have reasonable length (at least 20 characters)
  if (summary.length < 20) {
    return false;
  }

  return true;
}

/**
 * Combine chunk summaries intelligently
 */
export function combineChunkSummaries(chunkSummaries: string[]): string {
  // Join with periods and ensure proper spacing
  const combined = chunkSummaries
    .filter((s) => s && s.trim().length > 0)
    .map((s) => s.trim())
    .map((s) => (s.endsWith('.') ? s : s + '.'))
    .join(' ');

  return combined;
}

/**
 * Create fallback extractive summary using intelligent sentence selection
 * Improved to select diverse sentences from throughout the document
 */
function createFallbackSummary(text: string, targetLength: number = 600): string {
  // Split into sentences
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (sentences.length === 0) {
    return text.substring(0, targetLength).trim() + '...';
  }

  // Improved: Take sentences from beginning, middle, and end for better coverage
  const selectedSentences: string[] = [];
  let totalLength = 0;

  // Select 40% from beginning (key introductory info)
  const beginSentences = sentences.slice(0, Math.ceil(sentences.length * 0.2));

  // Select 40% from middle (core content)
  const midStart = Math.floor(sentences.length * 0.4);
  const midEnd = Math.ceil(sentences.length * 0.6);
  const middleSentences = sentences.slice(midStart, midEnd);

  // Select 20% from end (conclusions)
  const endSentences = sentences.slice(-Math.ceil(sentences.length * 0.1));

  // Combine with preference for key sentences (containing numbers, "total", "budget", etc.)
  const allCandidates = [...beginSentences, ...middleSentences, ...endSentences];
  const keywordPattern = /\b(budget|total|allocation|million|billion|ksh|key|priority|objective)\b/i;

  // Prioritize sentences with keywords
  const prioritizedSentences = allCandidates.sort((a, b) => {
    const aHasKeyword = keywordPattern.test(a) ? 1 : 0;
    const bHasKeyword = keywordPattern.test(b) ? 1 : 0;
    return bHasKeyword - aHasKeyword;
  });

  // Build summary until target length
  for (const sentence of prioritizedSentences) {
    if (totalLength + sentence.length + 2 > targetLength) {
      break;
    }
    selectedSentences.push(sentence);
    totalLength += sentence.length + 2; // +2 for ". "
  }

  return selectedSentences.length > 0
    ? selectedSentences.join('. ') + '.'
    : sentences[0] + '.';
}

/**
 * Sleep utility for batch delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Summarize a single chunk with error handling
 */
async function summarizeChunk(
  chunk: SummarizationChunk,
  totalChunks: number
): Promise<{ summary: string; error?: string; provider?: string }> {
  try {
    console.log(
      `[Summarization] Processing chunk ${chunk.index + 1}/${totalChunks} ` +
      `(${chunk.tokenCount} tokens, ${chunk.text.length} chars)`
    );

    // Use provider chain - automatically tries OpenAI → HuggingFace → Extractive
    const result = await providerChain.summarize(chunk.text, {
      maxLength: MAX_SUMMARY_LENGTH,
      minLength: MIN_SUMMARY_LENGTH,
      retries: 1, // Limited retries for individual chunks
      timeout: 60000, // 60 seconds to allow for model cold start
    });

    console.log(
      `[Summarization] Chunk ${chunk.index + 1} summarized by ${result.provider} ` +
      `(confidence: ${result.confidence.toFixed(2)})`
    );

    return {
      summary: result.summary,
      provider: result.provider
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[Summarization] All providers failed for chunk ${chunk.index + 1}:`,
      errorMessage
    );

    // Final fallback: extractive summary (shouldn't reach here as provider chain includes extractive)
    console.log(`[Summarization] Using local extractive fallback for chunk ${chunk.index + 1}`);
    return {
      summary: createFallbackSummary(chunk.text, 200), // Shorter fallback for chunks
      error: errorMessage,
      provider: 'fallback-local',
    };
  }
}

/**
 * Main summarization function with multi-level support
 */
export async function summarizeDocument(
  extractedText: string
): Promise<SummarizationResult> {
  // Validate input
  if (!extractedText || extractedText.trim().length === 0) {
    throw new Error('No valid text to summarize');
  }

  const trimmedText = extractedText.trim();

  // Check minimum content requirement
  if (trimmedText.length < 100) {
    throw new Error('Text is too short to summarize (minimum 100 characters)');
  }

  console.log(
    `[Summarization] Starting summarization for ${trimmedText.length} characters ` +
    `(~${tokenizeText(trimmedText)} tokens)`
  );

  try {
    // For short documents, summarize directly without chunking
    if (tokenizeText(trimmedText) <= MAX_CHUNK_TOKENS) {
      console.log('[Summarization] Document is small enough to summarize directly');

      try {
        const result = await providerChain.summarize(trimmedText, {
          maxLength: MAX_SUMMARY_LENGTH,
          minLength: MIN_SUMMARY_LENGTH,
          retries: 2,
          timeout: 60000, // 60 seconds to allow for model cold start
        });

        if (!validateSummary(result.summary, trimmedText)) {
          throw new Error('Generated summary failed quality validation');
        }

        console.log(
          `[Summarization] Document summarized by ${result.provider} ` +
          `(confidence: ${result.confidence.toFixed(2)})`
        );

        return {
          summary: result.summary,
          confidence: result.confidence,
          modelVersion: result.modelVersion,
          charCount: result.summary.length,
          chunkCount: 1,
          provider: result.provider,
          tokensUsed: result.tokensUsed,
          targetLength: result.targetLength,
          actualLength: result.actualLength,
        };
      } catch (error) {
        console.error('[Summarization] All providers failed, using fallback:', error);

        const fallbackSummary = createFallbackSummary(trimmedText);
        return {
          summary: fallbackSummary,
          confidence: 0.3,
          modelVersion: 'fallback-v1',
          charCount: fallbackSummary.length,
          chunkCount: 1,
          errors: [error instanceof Error ? error.message : String(error)],
        };
      }
    }

    // For large documents, use chunking
    console.log('[Summarization] Document requires chunking');
    const chunks = splitByBoundary(trimmedText);
    console.log(`[Summarization] Split into ${chunks.length} chunks`);

    const chunkSummaries: string[] = [];
    const chunkErrors: string[] = [];

    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length));

      console.log(
        `[Summarization] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} ` +
        `(chunks ${i + 1}-${Math.min(i + BATCH_SIZE, chunks.length)})`
      );

      // Process batch concurrently
      const results = await Promise.all(
        batch.map((chunk) => summarizeChunk(chunk, chunks.length))
      );

      // Collect results
      results.forEach((result) => {
        chunkSummaries.push(result.summary);
        if (result.error) {
          chunkErrors.push(result.error);
        }
      });

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < chunks.length) {
        console.log(`[Summarization] Waiting ${BATCH_DELAY_MS}ms before next batch...`);
        await sleep(BATCH_DELAY_MS);
      }
    }

    // Combine chunk summaries
    const combinedSummary = combineChunkSummaries(chunkSummaries);
    console.log(
      `[Summarization] Combined ${chunkSummaries.length} chunk summaries ` +
      `(${combinedSummary.length} chars)`
    );

    // Level 2: If combined summary is still too long, summarize it recursively
    if (tokenizeText(combinedSummary) > MAX_CHUNK_TOKENS) {
      console.log(
        `[Summarization] Combined summary is long (${tokenizeText(combinedSummary)} tokens), ` +
        `creating final summary (Level 2)`
      );

      try {
        // For VERY large combined summaries (>MAX_CHUNK_TOKENS), chunk and summarize recursively
        const combinedTokens = tokenizeText(combinedSummary);
        if (combinedTokens > MAX_CHUNK_TOKENS * 2) {
          console.log(
            `[Summarization] Combined summary too large (${combinedTokens} tokens), ` +
            `using recursive chunking`
          );

          // Split combined summary into chunks
          const level2Chunks = splitByBoundary(combinedSummary);
          console.log(`[Summarization] Split Level 2 into ${level2Chunks.length} chunks`);

          const level2Summaries: string[] = [];

          // Summarize Level 2 chunks in batches
          for (let i = 0; i < level2Chunks.length; i += BATCH_SIZE) {
            const batch = level2Chunks.slice(i, Math.min(i + BATCH_SIZE, level2Chunks.length));

            console.log(
              `[Summarization] Processing Level 2 batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(level2Chunks.length / BATCH_SIZE)}`
            );

            const results = await Promise.all(
              batch.map((chunk) => summarizeChunk(chunk, level2Chunks.length))
            );

            results.forEach((result) => {
              level2Summaries.push(result.summary);
            });

            if (i + BATCH_SIZE < level2Chunks.length) {
              await sleep(BATCH_DELAY_MS);
            }
          }

          // Combine Level 2 summaries
          const finalCombined = combineChunkSummaries(level2Summaries);
          console.log(`[Summarization] Level 2 combined: ${finalCombined.length} chars`);

          // If still too long, use extractive summarization
          const finalSummary = tokenizeText(finalCombined) > MAX_CHUNK_TOKENS
            ? createFallbackSummary(finalCombined, 800)
            : finalCombined;

          const confidence = chunkErrors.length > 0
            ? Math.max(0.5, 1.0 - chunkErrors.length / chunks.length)
            : 0.8;

          return {
            summary: finalSummary,
            confidence,
            modelVersion: 'multi-level-recursive',
            charCount: finalSummary.length,
            chunkCount: chunks.length,
            errors: chunkErrors.length > 0 ? chunkErrors : undefined,
          };
        }

        // For moderately large summaries, single Level 2 pass
        const result = await providerChain.summarize(combinedSummary, {
          maxLength: MAX_SUMMARY_LENGTH,
          minLength: MIN_SUMMARY_LENGTH,
          retries: 2,
          timeout: 60000, // 60 seconds to allow for model cold start
        });

        // Adjust confidence based on chunk errors
        const baseConfidence = result.confidence;
        const confidence = chunkErrors.length > 0
          ? Math.max(0.5, baseConfidence * (1.0 - chunkErrors.length / chunks.length))
          : Math.max(0.9, baseConfidence);

        console.log(
          `[Summarization] Level 2 summary created by ${result.provider} ` +
          `(confidence: ${confidence.toFixed(2)})`
        );

        return {
          summary: result.summary,
          confidence,
          modelVersion: result.modelVersion,
          charCount: result.summary.length,
          chunkCount: chunks.length,
          errors: chunkErrors.length > 0 ? chunkErrors : undefined,
          provider: result.provider,
          tokensUsed: result.tokensUsed,
          targetLength: result.targetLength,
          actualLength: result.actualLength,
        };
      } catch (error) {
        console.error('[Summarization] Level 2 summarization failed:', error);

        // Fallback: use combined summary or create extractive summary
        const fallbackSummary = combinedSummary.length <= 1000
          ? combinedSummary
          : createFallbackSummary(combinedSummary, 600);

        return {
          summary: fallbackSummary,
          confidence: 0.4,
          modelVersion: 'fallback-v1',
          charCount: fallbackSummary.length,
          chunkCount: chunks.length,
          errors: [
            ...chunkErrors,
            error instanceof Error ? error.message : String(error),
          ],
        };
      }
    }

    // Combined summary is short enough to use directly
    const confidence = chunkErrors.length > 0
      ? Math.max(0.6, 1.0 - chunkErrors.length / chunks.length)
      : 0.85;

    return {
      summary: combinedSummary,
      confidence,
      modelVersion: 'multi-chunk-combined', // Combined from multiple AI-generated chunk summaries
      charCount: combinedSummary.length,
      chunkCount: chunks.length,
      errors: chunkErrors.length > 0 ? chunkErrors : undefined,
    };
  } catch (error) {
    // Complete failure - use fallback
    console.error('[Summarization] Complete failure, using fallback:', error);

    const fallbackSummary = createFallbackSummary(trimmedText);
    return {
      summary: fallbackSummary,
      confidence: 0.3,
      modelVersion: 'fallback-v1',
      charCount: fallbackSummary.length,
      chunkCount: 1,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
