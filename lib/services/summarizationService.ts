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

import { summarizeText, HuggingFaceError } from './huggingFaceClient';

// Chunking configuration
const CHUNK_SIZE_TOKENS = 1024; // ~4000 characters
const CHUNK_OVERLAP_TOKENS = 100; // ~400 characters overlap
const MIN_CHUNK_TOKENS = 100;
const MAX_CHUNK_TOKENS = 1024;
const CHARS_PER_TOKEN = 4; // Approximate ratio

// Summarization configuration
const MAX_SUMMARY_LENGTH = 600; // tokens (~600 characters)
const MIN_SUMMARY_LENGTH = 200; // tokens (~200 characters)
const BATCH_SIZE = 5; // Process 5 chunks concurrently
const BATCH_DELAY_MS = 500; // Delay between batches

// Multi-level summarization thresholds
const LARGE_DOC_THRESHOLD = 50; // chunks

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
 * Create fallback extractive summary using first N sentences
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

  // Take first N sentences until we reach target length
  let summary = '';
  for (const sentence of sentences) {
    if (summary.length + sentence.length > targetLength) {
      break;
    }
    summary += sentence + '. ';
  }

  return summary.trim() || sentences[0] + '.';
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
): Promise<{ summary: string; error?: string }> {
  try {
    console.log(
      `[Summarization] Processing chunk ${chunk.index + 1}/${totalChunks} ` +
      `(${chunk.tokenCount} tokens, ${chunk.text.length} chars)`
    );

    const summary = await summarizeText(chunk.text, {
      maxLength: MAX_SUMMARY_LENGTH,
      minLength: MIN_SUMMARY_LENGTH,
      retries: 1, // Limited retries for individual chunks
      timeout: 60000, // 60 seconds to allow for model cold start
    });

    return { summary };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[Summarization] Failed to summarize chunk ${chunk.index + 1}:`,
      errorMessage
    );

    return {
      summary: createFallbackSummary(chunk.text, 200), // Shorter fallback for chunks
      error: errorMessage,
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
        const summary = await summarizeText(trimmedText, {
          maxLength: MAX_SUMMARY_LENGTH,
          minLength: MIN_SUMMARY_LENGTH,
          retries: 2,
          timeout: 60000, // 60 seconds to allow for model cold start
        });

        if (!validateSummary(summary, trimmedText)) {
          throw new Error('Generated summary failed quality validation');
        }

        return {
          summary,
          confidence: 1.0,
          modelVersion: 'facebook/bart-large-cnn',
          charCount: summary.length,
          chunkCount: 1,
        };
      } catch (error) {
        console.error('[Summarization] AI summarization failed, using fallback:', error);

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

    // Level 2: If combined summary is still too long, summarize it
    if (tokenizeText(combinedSummary) > MAX_CHUNK_TOKENS) {
      console.log('[Summarization] Combined summary is long, creating final summary (Level 2)');

      try {
        const finalSummary = await summarizeText(combinedSummary, {
          maxLength: MAX_SUMMARY_LENGTH,
          minLength: MIN_SUMMARY_LENGTH,
          retries: 2,
          timeout: 60000, // 60 seconds to allow for model cold start
        });

        const confidence = chunkErrors.length > 0
          ? Math.max(0.5, 1.0 - chunkErrors.length / chunks.length)
          : 0.9;

        return {
          summary: finalSummary,
          confidence,
          modelVersion: 'facebook/bart-large-cnn',
          charCount: finalSummary.length,
          chunkCount: chunks.length,
          errors: chunkErrors.length > 0 ? chunkErrors : undefined,
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
      modelVersion: 'facebook/bart-large-cnn',
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
