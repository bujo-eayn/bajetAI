/**
 * Embedding Service
 *
 * Generates vector embeddings for document chunks using OpenAI's embedding API.
 * Designed to work with the section-based chunker for RAG retrieval.
 *
 * Features:
 * - Uses text-embedding-3-small (1536 dimensions, excellent quality/cost)
 * - Batch processing with rate limit handling
 * - Error handling with retries
 * - Progress tracking for long documents
 */

import OpenAI from 'openai';
import type { EmbeddingChunk } from '../utils/sectionChunker';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * OpenAI embedding model configuration
 * text-embedding-3-small: 1536 dimensions, $0.02 per 1M tokens
 */
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Batch size for embedding API calls
 * OpenAI allows up to 2048 inputs per request, but we use smaller batches
 * to avoid timeouts and allow progress tracking
 */
const BATCH_SIZE = 50;

/**
 * Delay between batches to avoid rate limits (ms)
 */
const BATCH_DELAY_MS = 500;

/**
 * Maximum retries for failed API calls
 */
const MAX_RETRIES = 3;

/**
 * Timeout for embedding API calls (ms)
 */
const EMBEDDING_TIMEOUT_MS = 30000;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result of embedding a single chunk
 */
export interface ChunkEmbedding {
  chunkIndex: number;
  embedding: number[];
  tokenCount: number;
}

/**
 * Result of embedding all chunks for a document
 */
export interface EmbeddingBatchResult {
  embeddings: ChunkEmbedding[];
  totalTokens: number;
  durationMs: number;
  batchCount: number;
  errors: string[];
}

/**
 * Progress callback for long-running embedding operations
 */
export type EmbeddingProgressCallback = (progress: {
  completed: number;
  total: number;
  percentage: number;
}) => void;

// =============================================================================
// CLIENT INITIALIZATION
// =============================================================================

let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client
 */
function getClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    openaiClient = new OpenAI({
      apiKey,
      timeout: EMBEDDING_TIMEOUT_MS,
      maxRetries: 0, // We handle retries manually
    });
  }

  return openaiClient;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Sleep utility for delays between batches
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message.toLowerCase();

      // Don't retry on auth errors
      if (errorMessage.includes('authentication') || errorMessage.includes('api key')) {
        throw lastError;
      }

      // Don't retry on final attempt
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      console.log(
        `[EmbeddingService] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`
      );
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed');
}

// =============================================================================
// EMBEDDING FUNCTIONS
// =============================================================================

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getClient();

  const response = await withRetry(async () => {
    return await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    });
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a single API call
 */
async function generateEmbeddingsBatch(
  texts: string[]
): Promise<{ embeddings: number[][]; tokens: number }> {
  const client = getClient();

  const response = await withRetry(async () => {
    return await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    });
  });

  // Sort by index to ensure correct order
  const sortedData = response.data.sort((a, b) => a.index - b.index);
  const embeddings = sortedData.map((item) => item.embedding);
  const tokens = response.usage?.total_tokens || 0;

  return { embeddings, tokens };
}

/**
 * Generate embeddings for all chunks with progress tracking
 *
 * @param chunks - Array of embedding chunks from section chunker
 * @param onProgress - Optional callback for progress updates
 * @returns EmbeddingBatchResult with all embeddings
 */
export async function generateChunkEmbeddings(
  chunks: EmbeddingChunk[],
  onProgress?: EmbeddingProgressCallback
): Promise<EmbeddingBatchResult> {
  const startTime = Date.now();
  const results: ChunkEmbedding[] = [];
  const errors: string[] = [];
  let totalTokens = 0;
  let batchCount = 0;

  console.log(
    `[EmbeddingService] Starting embedding generation for ${chunks.length} chunks`
  );

  // Process in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length));
    const batchTexts = batch.map((chunk) => chunk.content);
    batchCount++;

    console.log(
      `[EmbeddingService] Processing batch ${batchCount} (chunks ${i + 1}-${i + batch.length})`
    );

    try {
      const { embeddings, tokens } = await generateEmbeddingsBatch(batchTexts);
      totalTokens += tokens;

      // Map embeddings to chunk results
      embeddings.forEach((embedding, idx) => {
        const chunk = batch[idx];
        results.push({
          chunkIndex: chunk.chunkIndex,
          embedding,
          tokenCount: chunk.tokenEstimate,
        });
      });

      // Report progress
      if (onProgress) {
        onProgress({
          completed: Math.min(i + BATCH_SIZE, chunks.length),
          total: chunks.length,
          percentage: Math.round(
            (Math.min(i + BATCH_SIZE, chunks.length) / chunks.length) * 100
          ),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[EmbeddingService] Batch ${batchCount} failed:`, errorMessage);
      errors.push(`Batch ${batchCount}: ${errorMessage}`);

      // Still try to continue with remaining batches
      // Mark failed chunks with empty embeddings (they'll be filtered out)
      batch.forEach((chunk) => {
        results.push({
          chunkIndex: chunk.chunkIndex,
          embedding: [], // Empty embedding indicates failure
          tokenCount: 0,
        });
      });
    }

    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < chunks.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const durationMs = Date.now() - startTime;

  // Filter out failed embeddings
  const validResults = results.filter((r) => r.embedding.length === EMBEDDING_DIMENSIONS);

  console.log(
    `[EmbeddingService] Completed: ${validResults.length}/${chunks.length} embeddings ` +
      `in ${durationMs}ms (${totalTokens} tokens, ${batchCount} batches)`
  );

  if (errors.length > 0) {
    console.warn(`[EmbeddingService] ${errors.length} batch errors occurred`);
  }

  return {
    embeddings: validResults,
    totalTokens,
    durationMs,
    batchCount,
    errors,
  };
}

/**
 * Generate embedding for a query (for RAG retrieval)
 *
 * @param query - User's question
 * @returns Embedding vector
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  console.log(`[EmbeddingService] Generating query embedding (${query.length} chars)`);

  const startTime = Date.now();
  const embedding = await generateEmbedding(query);
  const durationMs = Date.now() - startTime;

  console.log(`[EmbeddingService] Query embedding generated in ${durationMs}ms`);

  return embedding;
}

/**
 * Check if embedding service is available
 */
export function isEmbeddingServiceAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Get embedding model info
 */
export function getEmbeddingModelInfo(): {
  model: string;
  dimensions: number;
  maxInputTokens: number;
} {
  return {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    maxInputTokens: 8191, // text-embedding-3-small limit
  };
}
