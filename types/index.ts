// Type definitions for bajetAI

// ============================================================================
// Enums and Constants
// ============================================================================

export type UserRole = 'official' | 'public';

export type DocumentStatus = 'processing' | 'published' | 'archived';

export type DocumentCategory = 'budgeting' | 'planning' | 'healthcare' | 'education' | 'transport';

export type FeedbackStatus = 'pending' | 'approved' | 'rejected';

export type ExtractionStatus = 'pending' | 'extracting' | 'completed' | 'completed_scanned' | 'failed';

export type ExtractionErrorType =
  | 'corrupt_file'
  | 'encrypted'
  | 'empty'
  | 'timeout'
  | 'memory_error'
  | 'download_failed'
  | 'parsing_error'
  | 'unknown';

// Phase 5: AI Summarization Types
export type SummarizationStatus = 'pending' | 'summarizing' | 'completed' | 'failed' | 'skipped';

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

// Feedback categories (will be detected by AI)
export type FeedbackCategory =
  | 'Education'
  | 'Healthcare'
  | 'Infrastructure'
  | 'Environment'
  | 'Security'
  | 'Agriculture'
  | 'Transportation'
  | 'Other';

// ============================================================================
// Database Types
// ============================================================================
// These will be auto-generated after running migrations
// Run: npm run db:types (after creating tables in Supabase)

// Placeholder - will be replaced by generated types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          title: string;
          file_url: string;
          file_name: string;
          file_size: number | null;
          uploaded_by: string;
          created_at: string;
          updated_at: string;
          status: DocumentStatus;
          category: DocumentCategory | null;
          extracted_text: string | null;
          summary_en: string | null;
          summary_sw: string | null;
          processed: boolean;
          extraction_status: ExtractionStatus;
          extraction_error: string | null;
          extraction_error_type: ExtractionErrorType | null;
          extracted_text_url: string | null;
          extraction_page_count: number | null;
          extraction_char_count: number | null;
          extraction_started_at: string | null;
          extraction_completed_at: string | null;
          extraction_duration_ms: number | null;
        };
        Insert: {
          id?: string;
          title: string;
          file_url: string;
          file_name: string;
          file_size?: number | null;
          uploaded_by: string;
          created_at?: string;
          updated_at?: string;
          status?: DocumentStatus;
          category?: DocumentCategory | null;
          extracted_text?: string | null;
          summary_en?: string | null;
          summary_sw?: string | null;
          processed?: boolean;
          extraction_status?: ExtractionStatus;
          extraction_error?: string | null;
          extraction_error_type?: ExtractionErrorType | null;
          extracted_text_url?: string | null;
          extraction_page_count?: number | null;
          extraction_char_count?: number | null;
          extraction_started_at?: string | null;
          extraction_completed_at?: string | null;
          extraction_duration_ms?: number | null;
        };
        Update: {
          id?: string;
          title?: string;
          file_url?: string;
          file_name?: string;
          file_size?: number | null;
          uploaded_by?: string;
          created_at?: string;
          updated_at?: string;
          status?: DocumentStatus;
          category?: DocumentCategory | null;
          extracted_text?: string | null;
          summary_en?: string | null;
          summary_sw?: string | null;
          processed?: boolean;
          extraction_status?: ExtractionStatus;
          extraction_error?: string | null;
          extraction_error_type?: ExtractionErrorType | null;
          extracted_text_url?: string | null;
          extraction_page_count?: number | null;
          extraction_char_count?: number | null;
          extraction_started_at?: string | null;
          extraction_completed_at?: string | null;
          extraction_duration_ms?: number | null;
        };
      };
      feedback: {
        Row: {
          id: string;
          document_id: string;
          user_name: string;
          user_email: string | null;
          content: string;
          category: string | null;
          sentiment: string | null;
          status: FeedbackStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          user_name: string;
          user_email?: string | null;
          content: string;
          category?: string | null;
          sentiment?: string | null;
          status?: FeedbackStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          user_name?: string;
          user_email?: string | null;
          content?: string;
          category?: string | null;
          sentiment?: string | null;
          status?: FeedbackStatus;
          created_at?: string;
        };
      };
      feedback_summaries: {
        Row: {
          id: string;
          document_id: string;
          category: string;
          summary: string;
          feedback_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          category: string;
          summary: string;
          feedback_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          category?: string;
          summary?: string;
          feedback_count?: number;
          created_at?: string;
        };
      };
    };
  };
};

// ============================================================================
// Helper Types
// ============================================================================

// Extract table row types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type Feedback = Database['public']['Tables']['feedback']['Row'];
export type FeedbackSummary = Database['public']['Tables']['feedback_summaries']['Row'];

// Insert types (for creating new records)
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
export type FeedbackInsert = Database['public']['Tables']['feedback']['Insert'];
export type FeedbackSummaryInsert = Database['public']['Tables']['feedback_summaries']['Insert'];

// Update types (for updating existing records)
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type DocumentUpdate = Database['public']['Tables']['documents']['Update'];
export type FeedbackUpdate = Database['public']['Tables']['feedback']['Update'];
export type FeedbackSummaryUpdate = Database['public']['Tables']['feedback_summaries']['Update'];

// ============================================================================
// Extended Types (with relations)
// ============================================================================

export type DocumentWithUploader = Document & {
  uploader: Pick<Profile, 'id' | 'full_name' | 'email'>;
};

export type FeedbackWithDocument = Feedback & {
  document: Pick<Document, 'id' | 'title' | 'status'>;
};

export type DocumentWithFeedbackCount = Document & {
  feedback_count: number;
};

export type FeedbackSummaryWithDocument = FeedbackSummary & {
  document: Pick<Document, 'id' | 'title'>;
};

// ============================================================================
// API Response Types
// ============================================================================

export type ApiResponse<T> =
  | {
      data: T;
      error: null;
    }
  | {
      data: null;
      error: string;
    };

export type PaginatedResponse<T> = {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ============================================================================
// Form Types
// ============================================================================

export type LoginForm = {
  email: string;
  password: string;
};

export type SignupForm = {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
};

export type FeedbackForm = {
  user_name: string;
  user_email?: string;
  content: string;
};

// ============================================================================
// AI Processing Types
// ============================================================================

export type AIProcessingStatus = {
  document_id: string;
  stage: 'extracting' | 'summarizing' | 'translating' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
};

export type FeedbackAnalysisResult = {
  category: FeedbackCategory;
  sentiment?: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0-1
};

// ============================================================================
// PDF Extraction Types (Phase 4)
// ============================================================================

export type ExtractionResult = {
  success: boolean;
  textUrl?: string;
  extractedTextUrl?: string; // Also used for Inngest event payload
  pageCount?: number;
  charCount?: number;
  error?: string;
  errorType?: ExtractionErrorType;
  durationMs?: number;
  isScanned?: boolean; // Phase 5b: Indicates if PDF is scanned
};

export type ExtractionEventPayload = {
  documentId: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
};

// Phase 5: AI Summarization Event Payload
export type SummarizationEventPayload = {
  documentId: string;
  extractedTextUrl: string;
  requestedBy?: string;
};

// Phase 6: Translation Event Payload
export type TranslationEventPayload = {
  documentId: string;
  englishSummary: string;
};

export type SummarizationResult = {
  summary: string;
  confidence: number;
  modelVersion: string;
  charCount: number;
  chunkCount: number;
  errors?: string[];
  // OpenAI Migration - Phase 7: Add provider tracking
  provider?: string;
  tokensUsed?: TokenUsage;
  targetLength?: number;
  actualLength?: number;
};

export type SummarizationChunk = {
  text: string;
  index: number;
  startPos: number;
  endPos: number;
  tokenCount: number;
};

// ============================================================================
// OpenAI Migration - Phase 6: Multi-Provider Types
// ============================================================================

/**
 * Token usage statistics from AI providers (primarily OpenAI)
 * Stored in documents.summary_tokens_used JSONB field
 */
export type TokenUsage = {
  input: number;
  output: number;
  total: number;
  model?: string;
};

/**
 * AI provider types
 */
export type AIProvider = 'openai' | 'huggingface' | 'extractive' | 'unknown';

// ============================================================================
// RAG Chat Types (Migration 014)
// ============================================================================

/**
 * Embedding generation status for documents
 */
export type EmbeddingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

/**
 * Embedding error types for debugging and retry logic
 */
export type EmbeddingErrorType =
  | 'rate_limited'
  | 'timeout'
  | 'api_error'
  | 'invalid_content'
  | 'connection_error'
  | 'unknown';

/**
 * Section priority levels from document preprocessor
 */
export type SectionPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Detected language for chat queries
 */
export type DetectedLanguage = 'en' | 'sw';

/**
 * Embedding chunk with metadata for RAG retrieval
 */
export interface EmbeddingChunk {
  id?: string;
  documentId: string;
  chunkIndex: number;
  chunkText: string;
  sectionName: string | null;
  sectionPriority: SectionPriority | null;
  pageNumber: number | null;
  startChar: number;
  endChar: number;
  tokenCount: number;
}

/**
 * Result from vector similarity search
 */
export interface EmbeddingSearchResult {
  id: string;
  chunkIndex: number;
  chunkText: string;
  sectionName: string | null;
  sectionPriority: string | null;
  pageNumber: number | null;
  similarity: number;
}

/**
 * Chat request from client
 */
export interface ChatRequest {
  message: string;
  sessionId: string;
  conversationHistory?: ChatMessage[];
}

/**
 * Chat message in conversation history
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Source citation for chat responses
 */
export interface ChatSource {
  chunkIndex: number;
  pageNumber: number | null;
  sectionName: string | null;
  preview: string;
  relevanceScore: number;
}

/**
 * Chat response from API
 */
export interface ChatResponse {
  message: string;
  language: DetectedLanguage;
  sources: ChatSource[];
  metadata: {
    tokensUsed: number;
    latencyMs: number;
    model?: string;
  };
}

/**
 * Chat status check response
 */
export interface ChatStatusResponse {
  chatEnabled: boolean;
  embeddingStatus: EmbeddingStatus;
  chunkCount?: number;
  error?: string;
}

/**
 * Inngest event payload for embedding generation
 */
export interface EmbeddingEventPayload {
  documentId: string;
  extractedTextUrl: string;
  documentType?: string;
}

/**
 * Embedding generation result
 */
export interface EmbeddingResult {
  success: boolean;
  chunkCount: number;
  durationMs: number;
  error?: string;
  errorType?: EmbeddingErrorType;
}

/**
 * Chat analytics record
 */
export interface ChatAnalytics {
  id: string;
  documentId: string;
  sessionId: string;
  queryCount: number;
  detectedLanguage: DetectedLanguage | null;
  firstQueryAt: string;
  lastQueryAt: string;
  createdAt: string;
}

// ============================================================================
// NOTE: After running database migrations, regenerate types with:
// npm run db:types
// This will create types/database.types.ts with accurate schema
//
// Migration 008 adds:
// - summary_provider: TEXT (openai | huggingface | extractive | unknown)
// - summary_tokens_used: JSONB (TokenUsage structure)
// - summary_target_length: INTEGER (calculated 10% target)
// - summary_actual_length: INTEGER (actual word count)
// - summary_coverage_percent: NUMERIC (actual/target * 100)
//
// Migration 014 adds:
// - document_embeddings table for vector storage
// - chat_analytics table for usage tracking
// - embedding_status, chat_enabled columns on documents
// ============================================================================
