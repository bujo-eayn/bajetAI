/**
 * Inngest Function: Generate Document Embeddings
 *
 * Background job that generates vector embeddings for published documents
 * to enable RAG-powered chat functionality.
 *
 * This function is triggered after a document is published and:
 * 1. Fetches the extracted text and pages
 * 2. Uses section-based chunking for semantic coherence
 * 3. Generates embeddings via OpenAI
 * 4. Stores embeddings in document_embeddings table
 * 5. Enables chat functionality on the document
 *
 * Features:
 * - Step-based processing for reliability
 * - Progress tracking in database
 * - Error handling with retry logic
 * - Leverages existing document preprocessor
 */

import { inngest } from '@/lib/inngest/client';
import { createAdminClient } from '@/lib/supabase/server';
import {
  createEmbeddingChunksFromPages,
  createEmbeddingChunksFromText,
  type EmbeddingChunk,
} from '@/lib/utils/sectionChunker';
import {
  generateChunkEmbeddings,
  isEmbeddingServiceAvailable,
} from '@/lib/services/embeddingService';
import type { DocumentType } from '@/lib/utils/documentPreprocessor';
import type { EmbeddingEventPayload, EmbeddingErrorType } from '@/types';

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

/**
 * Classify error for database storage and retry logic
 */
function classifyError(error: unknown): {
  type: EmbeddingErrorType;
  message: string;
} {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  if (errorString.includes('rate limit') || errorString.includes('429')) {
    return { type: 'rate_limited', message: 'OpenAI API rate limit exceeded' };
  }

  if (errorString.includes('timeout') || errorString.includes('timed out')) {
    return { type: 'timeout', message: 'Embedding generation timed out' };
  }

  if (errorString.includes('api key') || errorString.includes('authentication')) {
    return { type: 'api_error', message: 'OpenAI API authentication failed' };
  }

  if (
    errorString.includes('network') ||
    errorString.includes('connection') ||
    errorString.includes('fetch failed')
  ) {
    return { type: 'connection_error', message: 'Failed to connect to OpenAI API' };
  }

  if (errorString.includes('empty') || errorString.includes('no text')) {
    return { type: 'invalid_content', message: 'Document has no valid content to embed' };
  }

  return { type: 'unknown', message: errorMessage };
}

/**
 * Check if error is retryable
 */
function isRetryableError(errorType: EmbeddingErrorType): boolean {
  const retryableErrors: EmbeddingErrorType[] = [
    'rate_limited',
    'timeout',
    'connection_error',
  ];
  return retryableErrors.includes(errorType);
}

// =============================================================================
// MAIN INNGEST FUNCTION
// =============================================================================

/**
 * Generate embeddings for a published document
 */
export default inngest.createFunction(
  {
    id: 'generate-document-embeddings',
    name: 'Generate Document Embeddings',
    // Retry configuration
    retries: 2,
    // Concurrency: limit to avoid overwhelming OpenAI API
    concurrency: {
      limit: 2,
    },
    // Timeout: 30 minutes for very large documents
    timeouts: {
      finish: '30m',
    },
  },
  {
    event: 'document.published',
  },
  async ({ event, step }) => {
    const { documentId, extractedTextUrl } = event.data as EmbeddingEventPayload;

    console.log(`[Embeddings] Starting embedding generation for document ${documentId}`);

    // Step 1: Check if embedding service is available
    await step.run('check-service-availability', async () => {
      if (!isEmbeddingServiceAvailable()) {
        throw new Error('OpenAI API key not configured. Embedding service unavailable.');
      }
    });

    // Step 2: Fetch document and extracted text
    const { document, extractedText, extractedPages, documentType } = await step.run(
      'fetch-document-and-text',
      async () => {
        const supabase = createAdminClient();

        // Fetch document from database
        const { data: doc, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single();

        if (docError || !doc) {
          throw new Error(`Document not found: ${documentId}`);
        }

        // Check if already processed
        if (doc.embedding_status === 'completed' && doc.chat_enabled) {
          console.log(`[Embeddings] Document ${documentId} already has embeddings, skipping`);
          return { document: doc, extractedText: null, extractedPages: null, documentType: null };
        }

        // Check extraction status
        if (doc.extraction_status !== 'completed' && doc.extraction_status !== 'completed_scanned') {
          throw new Error(
            `Document extraction not completed (status: ${doc.extraction_status})`
          );
        }

        const textUrl = extractedTextUrl || doc.extracted_text_url;
        if (!textUrl) {
          throw new Error('No extracted text URL available');
        }

        // Download extracted text
        const { data: textData, error: downloadError } = await supabase.storage
          .from('extracted-text')
          .download(textUrl);

        if (downloadError || !textData) {
          throw new Error(`Failed to download extracted text: ${downloadError?.message}`);
        }

        const text = await textData.text();

        console.log(`[Embeddings] Fetched ${text.length} characters from ${textUrl}`);

        // Try to fetch pages JSON for better chunking
        let pages: string[] | null = null;
        const pagesUrl = textUrl.replace('.txt', '_pages.json');

        try {
          const { data: pagesData, error: pagesError } = await supabase.storage
            .from('extracted-text')
            .download(pagesUrl);

          if (!pagesError && pagesData) {
            const pagesJson = await pagesData.text();
            pages = JSON.parse(pagesJson);
            console.log(`[Embeddings] Fetched ${pages?.length} pages from ${pagesUrl}`);
          }
        } catch {
          console.log(`[Embeddings] Pages file not available, using merged text`);
        }

        return {
          document: doc,
          extractedText: text,
          extractedPages: pages,
          documentType: doc.document_type as DocumentType | null,
        };
      }
    );

    // Early exit if already processed
    if (!extractedText) {
      return {
        documentId,
        success: true,
        message: 'Document already has embeddings',
        skipped: true,
      };
    }

    // Step 3: Update status to processing
    await step.run('update-status-processing', async () => {
      const supabase = createAdminClient();

      const { error } = await supabase
        .from('documents')
        .update({
          embedding_status: 'processing',
          embedding_started_at: new Date().toISOString(),
          embedding_error: null,
          embedding_error_type: null,
        })
        .eq('id', documentId);

      if (error) {
        console.error('[Embeddings] Failed to update status:', error);
      }
    });

    // Step 4: Create chunks using section-based chunker
    const chunks = await step.run('create-chunks', async () => {
      let chunkResult;

      if (extractedPages && extractedPages.length > 0 && documentType) {
        // Use page-based chunking (more accurate)
        console.log(
          `[Embeddings] Using page-based chunking for ${documentType} document`
        );
        chunkResult = createEmbeddingChunksFromPages(
          extractedPages,
          documentType
        );
      } else if (documentType) {
        // Fallback to text-based chunking
        console.log(`[Embeddings] Using text-based chunking for ${documentType} document`);
        chunkResult = createEmbeddingChunksFromText(extractedText!, documentType);
      } else {
        // No document type - use simple chunking
        console.log(`[Embeddings] Using simple chunking (no document type)`);
        const { createSimpleChunks } = await import('@/lib/utils/sectionChunker');
        chunkResult = createSimpleChunks(extractedText!);
      }

      console.log(
        `[Embeddings] Created ${chunkResult.chunks.length} chunks from ${chunkResult.totalSections} sections`
      );

      return chunkResult;
    });

    // Check if we have chunks to process
    if (chunks.chunks.length === 0) {
      await step.run('mark-skipped-no-chunks', async () => {
        const supabase = createAdminClient();

        await supabase
          .from('documents')
          .update({
            embedding_status: 'skipped',
            embedding_error: 'No valid content to create embeddings',
            embedding_completed_at: new Date().toISOString(),
          })
          .eq('id', documentId);
      });

      return {
        documentId,
        success: false,
        message: 'No valid content to create embeddings',
        chunkCount: 0,
      };
    }

    // Step 5: Generate embeddings
    const embeddingResult = await step.run('generate-embeddings', async () => {
      const result = await generateChunkEmbeddings(chunks.chunks);

      console.log(
        `[Embeddings] Generated ${result.embeddings.length} embeddings ` +
          `(${result.totalTokens} tokens, ${result.durationMs}ms)`
      );

      if (result.errors.length > 0) {
        console.warn(`[Embeddings] ${result.errors.length} embedding errors`);
      }

      return result;
    });

    // Step 6: Store embeddings in database
    await step.run('store-embeddings', async () => {
      const supabase = createAdminClient();

      // Clear any existing embeddings for this document
      const { error: deleteError } = await supabase
        .from('document_embeddings')
        .delete()
        .eq('document_id', documentId);

      if (deleteError) {
        console.warn('[Embeddings] Failed to clear existing embeddings:', deleteError);
      }

      // Prepare embedding records
      const embeddingRecords = embeddingResult.embeddings.map((emb, idx) => {
        const chunk = chunks.chunks.find((c) => c.chunkIndex === emb.chunkIndex);
        return {
          document_id: documentId,
          chunk_index: emb.chunkIndex,
          chunk_text: chunk?.content || '',
          embedding: `[${emb.embedding.join(',')}]`, // pgvector format
          section_name: chunk?.sectionName || null,
          section_priority: chunk?.sectionPriority || null,
          page_number: chunk?.pageNumbers[0] || null,
          start_char: chunk?.startChar || 0,
          end_char: chunk?.endChar || 0,
          token_count: emb.tokenCount,
        };
      });

      // Insert in batches to avoid payload size limits
      const BATCH_SIZE = 50;
      for (let i = 0; i < embeddingRecords.length; i += BATCH_SIZE) {
        const batch = embeddingRecords.slice(i, i + BATCH_SIZE);

        const { error: insertError } = await supabase
          .from('document_embeddings')
          .insert(batch);

        if (insertError) {
          console.error(`[Embeddings] Failed to insert batch ${i / BATCH_SIZE + 1}:`, insertError);
          throw new Error(`Failed to store embeddings: ${insertError.message}`);
        }
      }

      console.log(`[Embeddings] Stored ${embeddingRecords.length} embeddings in database`);
    });

    // Step 7: Update document status and enable chat
    await step.run('enable-chat', async () => {
      const supabase = createAdminClient();

      const { error } = await supabase
        .from('documents')
        .update({
          embedding_status: 'completed',
          embedding_chunk_count: embeddingResult.embeddings.length,
          embedding_completed_at: new Date().toISOString(),
          embedding_duration_ms: embeddingResult.durationMs,
          embedding_error: null,
          embedding_error_type: null,
          chat_enabled: true,
        })
        .eq('id', documentId);

      if (error) {
        console.error('[Embeddings] Failed to enable chat:', error);
        throw new Error(`Failed to enable chat: ${error.message}`);
      }

      console.log(`[Embeddings] Chat enabled for document ${documentId}`);
    });

    return {
      documentId,
      success: true,
      chunkCount: embeddingResult.embeddings.length,
      totalTokens: embeddingResult.totalTokens,
      durationMs: embeddingResult.durationMs,
    };
  }
);

// =============================================================================
// ERROR HANDLER
// =============================================================================

/**
 * Handle failed embedding generation
 */
export const handleEmbeddingError = inngest.createFunction(
  {
    id: 'handle-embedding-error',
    name: 'Handle Embedding Error',
  },
  {
    event: 'inngest/function.failed',
    if: 'event.data.function_id == "generate-document-embeddings"',
  },
  async ({ event }) => {
    const { error, event: failedEvent } = event.data;

    console.error('[Embeddings] Function failed:', {
      error,
      failedEvent,
    });

    // Extract document ID from failed event
    const documentId = (failedEvent.data as EmbeddingEventPayload).documentId;

    if (!documentId) {
      console.error('[Embeddings] No document ID in failed event');
      return;
    }

    // Classify error
    const { type, message } = classifyError(error);

    // Update database with error information
    const supabase = createAdminClient();

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        embedding_status: 'failed',
        embedding_error: message,
        embedding_error_type: type,
        embedding_completed_at: new Date().toISOString(),
        chat_enabled: false,
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('[Embeddings] Failed to update error status:', updateError);
    } else {
      console.log(`[Embeddings] Marked document ${documentId} as failed (${type})`);
    }
  }
);
