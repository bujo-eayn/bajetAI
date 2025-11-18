// Inngest Client Configuration
// This file initializes the Inngest client for background job processing

import { Inngest, EventSchemas } from 'inngest';
import type { ExtractionEventPayload } from '@/types';

// Define event schemas for type safety
type Events = {
  'document.uploaded': {
    data: ExtractionEventPayload;
  };
};

// Initialize Inngest client
export const inngest = new Inngest({
  id: 'bajetai',
  schemas: new EventSchemas().fromRecord<Events>(),
});

// Event names (for consistency across the app)
export const INNGEST_EVENTS = {
  DOCUMENT_UPLOADED: 'document.uploaded',
} as const;
