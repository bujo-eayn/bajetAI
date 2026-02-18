// Inngest Client Configuration
// This file initializes the Inngest client for background job processing

import { Inngest, EventSchemas } from 'inngest';
import type {
  ExtractionEventPayload,
  SummarizationEventPayload,
  TranslationEventPayload,
  EmbeddingEventPayload,
} from '@/types';

// Define event schemas for type safety
type Events = {
  'document.uploaded': {
    data: ExtractionEventPayload;
  };
  'document.extraction-completed': {
    data: SummarizationEventPayload;
  };
  'document.summarization-requested': {
    data: SummarizationEventPayload;
  };
  'document.summarization-completed': {
    data: TranslationEventPayload;
  };
  // RAG Chat Events (Migration 014)
  'document.published': {
    data: EmbeddingEventPayload;
  };
  'document.embedding-completed': {
    data: {
      documentId: string;
      chunkCount: number;
    };
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
  EXTRACTION_COMPLETED: 'document.extraction-completed',
  SUMMARIZATION_REQUESTED: 'document.summarization-requested',
  SUMMARIZATION_COMPLETED: 'document.summarization-completed',
  // RAG Chat Events
  DOCUMENT_PUBLISHED: 'document.published',
  EMBEDDING_COMPLETED: 'document.embedding-completed',
} as const;
