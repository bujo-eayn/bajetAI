/**
 * Inngest Function: Summarize Document
 *
 * Background job that summarizes extracted text from PDFs using Hugging Face AI.
 * This function is triggered automatically after successful PDF text extraction.
 *
 * Features:
 * - Multi-step processing with progress tracking
 * - Intelligent chunking for large documents
 * - Error handling with retry logic
 * - Fallback to extractive summarization
 * - Database updates throughout process
 */

import { inngest } from '@/lib/inngest/client';
import { createAdminClient } from '@/lib/supabase/server';
import { summarizeDocument } from '@/lib/services/summarizationService';
import type { SummarizationEventPayload, SummarizationErrorType } from '@/types';

/**
 * Classify error for database storage and retry logic
 */
function classifyError(error: unknown): {
  type: SummarizationErrorType;
  message: string;
} {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  // Rate limiting
  if (errorString.includes('rate limit') || errorString.includes('429')) {
    return {
      type: 'rate_limited',
      message: 'Hugging Face API rate limit exceeded',
    };
  }

  // Timeout
  if (errorString.includes('timeout') || errorString.includes('timed out')) {
    return {
      type: 'timeout',
      message: 'Summarization process timed out',
    };
  }

  // Empty content
  if (errorString.includes('no valid text') || errorString.includes('too short')) {
    return {
      type: 'empty_content',
      message: 'Document has insufficient content to summarize',
    };
  }

  // Connection errors
  if (
    errorString.includes('network') ||
    errorString.includes('connection') ||
    errorString.includes('fetch failed')
  ) {
    return {
      type: 'connection_error',
      message: 'Failed to connect to Hugging Face API',
    };
  }

  // API errors
  if (errorString.includes('500') || errorString.includes('503') || errorString.includes('api')) {
    return {
      type: 'api_error',
      message: 'Hugging Face API error',
    };
  }

  // Model errors
  if (errorString.includes('model') || errorString.includes('circuit')) {
    return {
      type: 'model_error',
      message: 'AI model is currently unavailable',
    };
  }

  // Invalid response
  if (errorString.includes('invalid') || errorString.includes('parse')) {
    return {
      type: 'invalid_response',
      message: 'Invalid response from Hugging Face API',
    };
  }

  // Invalid text
  if (errorString.includes('validation')) {
    return {
      type: 'invalid_text',
      message: 'Text failed validation checks',
    };
  }

  return {
    type: 'unknown',
    message: errorMessage,
  };
}

/**
 * Check if error is retryable
 */
function isRetryableError(errorType: SummarizationErrorType): boolean {
  const retryableErrors: SummarizationErrorType[] = [
    'rate_limited',
    'timeout',
    'connection_error',
    'api_error',
  ];
  return retryableErrors.includes(errorType);
}

/**
 * Inngest function to summarize document
 */
export default inngest.createFunction(
  {
    id: 'summarize-document',
    name: 'Summarize Document',
    // Retry configuration
    retries: 2,
    // Concurrency: max 2 documents simultaneously (respect API limits)
    concurrency: {
      limit: 2,
    },
    // Timeout: 3 hours for very large documents (1000+ chunks)
    // Most documents complete in minutes, but extreme cases (1400+ chunks) can take ~2 hours
    timeouts: {
      finish: '3h',
    },
  },
  {
    event: 'document.extraction-completed',
  },
  async ({ event, step }) => {
    const { documentId, extractedTextUrl } = event.data as SummarizationEventPayload;

    console.log(
      `[Summarization] Starting summarization for document ${documentId}`
    );

    // Step 1: Validate document and fetch extracted text
    const { document, extractedText } = await step.run(
      'validate-and-fetch-text',
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

        // Check if extraction completed successfully
        if (doc.extraction_status !== 'completed') {
          throw new Error(
            `Document extraction not completed (status: ${doc.extraction_status})`
          );
        }

        if (!extractedTextUrl) {
          throw new Error('No extracted text URL provided');
        }

        // Download extracted text from storage
        const { data: textData, error: downloadError } = await supabase.storage
          .from('extracted-text')
          .download(extractedTextUrl);

        if (downloadError || !textData) {
          throw new Error(`Failed to download extracted text: ${downloadError?.message}`);
        }

        const text = await textData.text();

        console.log(
          `[Summarization] Fetched ${text.length} characters from ${extractedTextUrl}`
        );

        return { document: doc, extractedText: text };
      }
    );

    // Step 2: Update status to 'summarizing'
    await step.run('update-status-summarizing', async () => {
      const supabase = createAdminClient();

      const { error } = await supabase
        .from('documents')
        .update({
          summarization_status: 'summarizing',
          summary_started_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (error) {
        console.error('[Summarization] Failed to update status:', error);
      }
    });

    // Step 3: Verify text quality and size
    await step.run('verify-text-quality', async () => {
      if (!extractedText || extractedText.trim().length < 100) {
        throw new Error('Extracted text is too short to summarize (minimum 100 characters)');
      }

      console.log(`[Summarization] Text quality check passed: ${extractedText.length} chars`);
    });

    // Step 4: Perform summarization
    const result = await step.run('perform-summarization', async () => {
      const startTime = Date.now();

      try {
        const summaryResult = await summarizeDocument(extractedText);
        const duration = Date.now() - startTime;

        console.log(
          `[Summarization] Summarization completed in ${duration}ms. ` +
          `Summary: ${summaryResult.charCount} chars, ` +
          `Confidence: ${summaryResult.confidence}, ` +
          `Chunks: ${summaryResult.chunkCount}`
        );

        return {
          ...summaryResult,
          durationMs: duration,
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const { type, message } = classifyError(error);

        console.error(
          `[Summarization] Summarization failed after ${duration}ms:`,
          { type, message }
        );

        // If non-retryable error, throw to fail the job
        if (!isRetryableError(type)) {
          throw new Error(`Non-retryable error: ${message}`);
        }

        // For retryable errors, let Inngest handle the retry
        throw error;
      }
    });

    // Step 5: Save summary to database
    await step.run('save-summary', async () => {
      const supabase = createAdminClient();

      // Calculate coverage percentage
      const coveragePercent = result.targetLength && result.actualLength
        ? (result.actualLength / result.targetLength) * 100
        : null;

      const { error } = await supabase
        .from('documents')
        .update({
          summarization_status: 'completed',
          summary_en: result.summary,
          summary_completed_at: new Date().toISOString(),
          summary_duration_ms: result.durationMs,
          summary_char_count: result.charCount,
          summary_confidence: result.confidence,
          summary_model_version: result.modelVersion,
          summary_error: null,
          summary_error_type: null,
          // OpenAI Migration - Phase 7: Add provider tracking
          summary_provider: result.provider || 'unknown',
          summary_tokens_used: result.tokensUsed || null,
          summary_target_length: result.targetLength || null,
          summary_actual_length: result.actualLength || null,
          summary_coverage_percent: coveragePercent,
        })
        .eq('id', documentId);

      if (error) {
        console.error('[Summarization] Failed to save summary to database:', error);
        throw new Error(`Database update failed: ${error.message}`);
      }

      console.log(`[Summarization] ✓ Successfully saved summary for document ${documentId}`);
    });

    // Step 6: Trigger translation
    await step.run('trigger-translation', async () => {
      console.log(`[Summarization] Triggering translation for document ${documentId}`);

      // Send Inngest event to trigger translation
      await inngest.send({
        name: 'document.summarization-completed',
        data: {
          documentId,
          englishSummary: result.summary,
        },
      });

      console.log(`[Summarization] ✓ Translation queued for document ${documentId}`);
    });

    return {
      documentId,
      success: true,
      summary: result.summary,
      confidence: result.confidence,
      durationMs: result.durationMs,
    };
  }
);

// Error handler for failed summarizations
export const handleSummarizationError = inngest.createFunction(
  {
    id: 'handle-summarization-error',
    name: 'Handle Summarization Error',
  },
  {
    event: 'inngest/function.failed',
    if: 'event.data.function_id == "summarize-document"',
  },
  async ({ event }) => {
    const { function_id, error, event: failedEvent } = event.data;

    console.error('[Summarization] Function failed:', {
      function_id,
      error,
      failedEvent,
    });

    // Extract document ID from failed event
    const documentId = (failedEvent.data as SummarizationEventPayload).documentId;

    if (!documentId) {
      console.error('[Summarization] No document ID in failed event');
      return;
    }

    // Classify error
    const { type, message } = classifyError(error);

    // Update database with error information
    const supabase = createAdminClient();

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        summarization_status: 'failed',
        summary_error: message,
        summary_error_type: type,
        summary_completed_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('[Summarization] Failed to update error status:', updateError);
    } else {
      console.log(`[Summarization] Marked document ${documentId} as failed (${type})`);
    }
  }
);
