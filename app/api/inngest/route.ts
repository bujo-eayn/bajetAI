// Inngest Webhook Endpoint
// This endpoint handles communication between Inngest and your app

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { extractDocument } from '@/inngest/functions/extractDocument';
import summarizeDocument, { handleSummarizationError } from '@/inngest/functions/summarizeDocument';

// Register all Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    extractDocument, // Phase 4: PDF extraction worker
    summarizeDocument, // Phase 5: AI summarization worker
    handleSummarizationError, // Phase 5: Error handler
  ],
});
