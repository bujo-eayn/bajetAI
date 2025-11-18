// Inngest Webhook Endpoint
// This endpoint handles communication between Inngest and your app

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { extractDocument } from '@/inngest/functions/extractDocument';

// Register all Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    extractDocument, // PDF extraction worker
  ],
});
