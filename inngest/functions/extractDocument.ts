// Inngest Worker: Extract Document Text
// This background worker processes PDF text extraction jobs

import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client';
import { extractTextFromPDF } from '@/lib/services/pdfExtraction';

export const extractDocument = inngest.createFunction(
  {
    id: 'extract-document',
    name: 'Extract Text from PDF Document',
    // Concurrency: max 3 PDFs processing simultaneously
    concurrency: {
      limit: 3,
    },
    // Timeout: 5 minutes (300 seconds) for large PDFs
    // This is much longer than Vercel's 60s limit
    timeouts: {
      finish: '5m',
    },
    // Retry configuration: 3 retry attempts (4 total attempts including initial)
    // Inngest uses exponential backoff automatically
    retries: 3,
  },
  { event: INNGEST_EVENTS.DOCUMENT_UPLOADED },
  async ({ event, step }) => {
    const { documentId, fileName, fileSize } = event.data;

    console.log('Starting extraction:', {
      documentId,
      fileName,
      fileSize,
    });

    // Step 1: Extract text from PDF
    // This step will retry automatically if it fails
    const result = await step.run('extract-pdf-text', async () => {
      return await extractTextFromPDF(documentId);
    });

    // Log results
    if (result.success) {
      console.log('Extraction succeeded:', {
        documentId,
        pageCount: result.pageCount,
        charCount: result.charCount,
        durationMs: result.durationMs,
      });

      return {
        success: true,
        message: 'Text extraction completed successfully',
        data: result,
      };
    } else {
      console.error('Extraction failed:', {
        documentId,
        error: result.error,
        errorType: result.errorType,
      });

      // Throw error to trigger Inngest retry
      throw new Error(
        `Extraction failed: ${result.error} (${result.errorType})`
      );
    }
  }
);
