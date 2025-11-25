// Type definitions for bajetAI

// ============================================================================
// Enums and Constants
// ============================================================================

export type UserRole = 'official' | 'public';

export type DocumentStatus = 'processing' | 'published' | 'archived';

export type CommentStatus = 'pending' | 'approved' | 'rejected';

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

// Comment categories (will be detected by AI)
export type CommentCategory =
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
      comments: {
        Row: {
          id: string;
          document_id: string;
          user_name: string;
          user_email: string | null;
          content: string;
          category: string | null;
          sentiment: string | null;
          status: CommentStatus;
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
          status?: CommentStatus;
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
          status?: CommentStatus;
          created_at?: string;
        };
      };
      comment_summaries: {
        Row: {
          id: string;
          document_id: string;
          category: string;
          summary: string;
          comment_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          category: string;
          summary: string;
          comment_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          category?: string;
          summary?: string;
          comment_count?: number;
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
export type Comment = Database['public']['Tables']['comments']['Row'];
export type CommentSummary = Database['public']['Tables']['comment_summaries']['Row'];

// Insert types (for creating new records)
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
export type CommentInsert = Database['public']['Tables']['comments']['Insert'];
export type CommentSummaryInsert = Database['public']['Tables']['comment_summaries']['Insert'];

// Update types (for updating existing records)
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type DocumentUpdate = Database['public']['Tables']['documents']['Update'];
export type CommentUpdate = Database['public']['Tables']['comments']['Update'];
export type CommentSummaryUpdate = Database['public']['Tables']['comment_summaries']['Update'];

// ============================================================================
// Extended Types (with relations)
// ============================================================================

export type DocumentWithUploader = Document & {
  uploader: Pick<Profile, 'id' | 'full_name' | 'email'>;
};

export type CommentWithDocument = Comment & {
  document: Pick<Document, 'id' | 'title' | 'status'>;
};

export type DocumentWithCommentCount = Document & {
  comment_count: number;
};

export type CommentSummaryWithDocument = CommentSummary & {
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

export type CommentForm = {
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

export type CommentAnalysisResult = {
  category: CommentCategory;
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

export type SummarizationResult = {
  summary: string;
  confidence: number;
  modelVersion: string;
  charCount: number;
  chunkCount: number;
  errors?: string[];
};

export type SummarizationChunk = {
  text: string;
  index: number;
  startPos: number;
  endPos: number;
  tokenCount: number;
};

// ============================================================================
// NOTE: After running database migrations, regenerate types with:
// npm run db:types
// This will create types/database.types.ts with accurate schema
// ============================================================================
