/**
 * Inngest Background Job: Translate Document Summary
 *
 * Automatically translates English summaries to Swahili using OpenAI.
 * Triggered after successful summarization completion.
 *
 * Phase: 6 - Translation
 */

import { inngest } from '@/lib/inngest/client';
import { createAdminClient } from '@/lib/supabase/server';
import {
  translateEnglishToSwahili,
  isTranslationAvailable,
} from '@/lib/services/translationService';

interface TranslationEventPayload {
  documentId: string;
  englishSummary: string;
}

type TranslationResultSuccess = {
  success: true;
  translatedText: string;
  confidence: number;
  sourceChars: number;
  outputChars: number;
  sourceWords: number;
  outputWords: number;
  modelVersion: string;
  durationMs: number;
};

type TranslationResultError = {
  success: false;
  error: string;
  errorType: string;
  durationMs: number;
};

type TranslationResult = TranslationResultSuccess | TranslationResultError;

// Main translation function
export const translateDocument = inngest.createFunction(
  {
    id: 'translate-document',
    name: 'Translate Document Summary to Swahili',
    concurrency: {
      limit: 3, // Process 3 translations simultaneously
    },
    retries: 2, // Retry failed translations up to 2 times
  },
  { event: 'document.summarization-completed' },
  async ({ event, step }) => {
    const { documentId, englishSummary } = event.data as TranslationEventPayload;

    console.log(
      `[TranslateDocument] Starting translation for document ${documentId}`
    );

    // Step 1: Validate document and check if translation is needed
    const { document, shouldTranslate } = await step.run(
      'validate-document',
      async () => {
        const supabase = createAdminClient();

        // Fetch document details
        const { data: document, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single();

        if (error || !document) {
          throw new Error(`Document not found: ${documentId}`);
        }

        console.log(
          `[TranslateDocument] Document found: ${document.title} (status: ${document.translation_status})`
        );

        // Check if translation is already completed or in progress
        if (document.translation_status === 'completed') {
          console.log(
            `[TranslateDocument] Translation already completed for ${documentId}`
          );
          return { document, shouldTranslate: false };
        }

        if (document.translation_status === 'translating') {
          console.log(
            `[TranslateDocument] Translation already in progress for ${documentId}`
          );
          return { document, shouldTranslate: false };
        }

        // Check if OpenAI is available
        if (!isTranslationAvailable()) {
          console.log(
            `[TranslateDocument] OpenAI not configured. Skipping translation for ${documentId}`
          );

          // Update status to skipped
          await supabase
            .from('documents')
            .update({
              translation_status: 'skipped',
              translation_error: 'OpenAI API key not configured',
              translation_error_type: 'api_error',
            })
            .eq('id', documentId);

          return { document, shouldTranslate: false };
        }

        // Check if English summary exists
        const summaryToTranslate = englishSummary || document.summary_en;
        if (!summaryToTranslate || summaryToTranslate.trim().length === 0) {
          console.log(
            `[TranslateDocument] No English summary to translate for ${documentId}`
          );

          await supabase
            .from('documents')
            .update({
              translation_status: 'skipped',
              translation_error: 'No English summary available',
              translation_error_type: 'empty_content',
            })
            .eq('id', documentId);

          return { document, shouldTranslate: false };
        }

        return { document, shouldTranslate: true };
      }
    );

    // Exit early if translation not needed
    if (!shouldTranslate) {
      return {
        documentId,
        status: 'skipped',
        message: 'Translation not needed or already completed',
      };
    }

    // Step 2: Update status to translating
    await step.run('update-status-translating', async () => {
      const supabase = createAdminClient();
      await supabase
        .from('documents')
        .update({
          translation_status: 'translating',
          translation_started_at: new Date().toISOString(),
          translation_error: null,
          translation_error_type: null,
        })
        .eq('id', documentId);

      console.log(`[TranslateDocument] Status updated to 'translating'`);
    });

    // Step 3: Perform translation
    const translationResult = await step.run('translate-text', async (): Promise<TranslationResult> => {
      const summaryToTranslate = englishSummary || document.summary_en!;
      const startTime = Date.now();

      try {
        console.log(
          `[TranslateDocument] Translating ${summaryToTranslate.length} characters...`
        );

        const result = await translateEnglishToSwahili(
          summaryToTranslate,
          60000 // 60 second timeout
        );

        const durationMs = Date.now() - startTime;

        console.log(
          `[TranslateDocument] Translation completed in ${durationMs}ms. Output: ${result.characterCount} chars (confidence: ${result.confidence})`
        );

        return {
          success: true as const,
          translatedText: result.translatedText,
          confidence: result.confidence,
          sourceChars: summaryToTranslate.length,
          outputChars: result.characterCount,
          sourceWords: summaryToTranslate.split(/\s+/).filter((w: string) => w.length > 0).length,
          outputWords: result.wordCount,
          modelVersion: result.modelVersion,
          durationMs,
        };
      } catch (error) {
        const durationMs = Date.now() - startTime;
        console.error(
          `[TranslateDocument] Translation failed after ${durationMs}ms:`,
          error
        );

        // Classify error type
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorType = classifyTranslationError(errorMessage);

        return {
          success: false as const,
          error: errorMessage,
          errorType,
          durationMs,
        };
      }
    });

    // Step 4: Update database with results
    await step.run('save-translation', async () => {
      const supabase = createAdminClient();

      if (translationResult.success) {
        // Save successful translation
        const { error } = await supabase
          .from('documents')
          .update({
            summary_sw: translationResult.translatedText,
            translation_status: 'completed',
            translation_completed_at: new Date().toISOString(),
            translation_duration_ms: translationResult.durationMs,
            translation_confidence: translationResult.confidence,
            translation_source_chars: translationResult.sourceChars,
            translation_output_chars: translationResult.outputChars,
            translation_source_words: translationResult.sourceWords,
            translation_output_words: translationResult.outputWords,
            translation_model_version: translationResult.modelVersion,
            translation_provider: 'openai',
            translation_error: null,
            translation_error_type: null,
          })
          .eq('id', documentId);

        if (error) {
          console.error('[TranslateDocument] Error saving translation:', error);
          throw new Error(`Failed to save translation: ${error.message}`);
        }

        console.log(
          `[TranslateDocument] ✅ Translation saved successfully for ${documentId}`
        );
      } else {
        // Save error information
        const { error } = await supabase
          .from('documents')
          .update({
            translation_status: 'failed',
            translation_duration_ms: translationResult.durationMs,
            translation_error: translationResult.error,
            translation_error_type: translationResult.errorType,
          })
          .eq('id', documentId);

        if (error) {
          console.error('[TranslateDocument] Error saving error state:', error);
        }

        console.log(
          `[TranslateDocument] ❌ Translation failed for ${documentId}: ${translationResult.errorType}`
        );

        // Determine if error is retryable
        const retryableErrors = ['timeout', 'rate_limited', 'connection_error', 'api_error'];
        if (retryableErrors.includes(translationResult.errorType!)) {
          throw new Error(
            `Retryable translation error: ${translationResult.error}`
          );
        }

        // Non-retryable error - don't throw, just log
        console.log(
          `[TranslateDocument] Non-retryable error. Translation will not be retried.`
        );
      }
    });

    return {
      documentId,
      status: translationResult.success ? 'completed' : 'failed',
      error: translationResult.success ? undefined : translationResult.error,
      durationMs: translationResult.durationMs,
    };
  }
);

/**
 * Classify translation error type for retry logic
 */
function classifyTranslationError(errorMessage: string): string {
  const message = errorMessage.toLowerCase();

  if (message.includes('timeout') || message.includes('abort')) {
    return 'timeout';
  }
  if (message.includes('rate limit')) {
    return 'rate_limited';
  }
  if (message.includes('api key') || message.includes('unauthorized')) {
    return 'api_error';
  }
  if (message.includes('empty') || message.includes('no text')) {
    return 'empty_content';
  }
  if (message.includes('invalid text') || message.includes('cannot translate')) {
    return 'invalid_text';
  }
  if (message.includes('network') || message.includes('connection')) {
    return 'connection_error';
  }

  return 'unknown';
}

/**
 * Error handler for failed translation jobs
 */
export const handleTranslationError = inngest.createFunction(
  {
    id: 'handle-translation-error',
    name: 'Handle Translation Failure',
  },
  { event: 'inngest/function.failed' },
  async ({ event }) => {
    // Only handle translation function failures
    if (event.data.function_id !== 'translate-document') {
      return;
    }

    const documentId = event.data.event.data.documentId;
    const error = event.data.error;

    console.error(
      `[HandleTranslationError] Translation failed for document ${documentId}:`,
      error
    );

    // Update document with final failure status
    const supabase = createAdminClient();
    await supabase
      .from('documents')
      .update({
        translation_status: 'failed',
        translation_error:
          error?.message || 'Translation failed after all retries',
        translation_error_type: 'unknown',
      })
      .eq('id', documentId);

    console.log(
      `[HandleTranslationError] Document ${documentId} marked as failed after all retries`
    );
  }
);
