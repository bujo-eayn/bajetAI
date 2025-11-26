/**
 * AI Provider Interface
 *
 * This module defines the contract for all AI service providers in the bajetAI system.
 * It provides a unified interface for different AI services (OpenAI, HuggingFace, etc.)
 * enabling seamless provider switching and fallback strategies.
 *
 * Design Principles:
 * - Provider-agnostic interface
 * - Comprehensive error handling
 * - Token usage tracking
 * - Health monitoring support
 * - Extensible for future providers
 */

/**
 * Provider type identifier
 */
export type AIProviderType = 'openai' | 'huggingface' | 'extractive';

/**
 * Standardized AI error types across all providers
 */
export type AIErrorType =
  | 'rate_limited'       // API rate limit exceeded
  | 'timeout'            // Request timeout
  | 'api_error'          // Server-side API error (5xx)
  | 'connection_error'   // Network/connection failure
  | 'invalid_input'      // Input validation failed
  | 'model_unavailable'  // AI model not available/loading
  | 'authentication_failed' // Invalid API key or auth failure
  | 'unknown';           // Unclassified error

/**
 * Options for summarization requests
 */
export interface SummarizeOptions {
  /** Minimum summary length in words */
  minLength?: number;

  /** Maximum summary length in words */
  maxLength?: number;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Maximum retry attempts */
  retries?: number;

  /** Target language (for future translation support) */
  language?: 'en' | 'sw';

  /** Chunk context (for multi-chunk documents) */
  chunkIndex?: number;
  totalChunks?: number;

  /** Enable dynamic length calculation */
  dynamicLength?: boolean;

  /** Length percentage for dynamic calculation (default 10%) */
  lengthPercentage?: number;
}

/**
 * Token usage statistics (primarily for OpenAI)
 */
export interface TokenUsage {
  /** Input tokens consumed */
  input: number;

  /** Output tokens generated */
  output: number;

  /** Total tokens (input + output) */
  total: number;

  /** Model version used */
  model?: string;
}

/**
 * Result from summarization operation
 */
export interface SummarizeResult {
  /** Generated summary text */
  summary: string;

  /** Confidence score (0-1) indicating quality */
  confidence: number;

  /** Model version identifier */
  modelVersion: string;

  /** Provider name that generated the summary */
  provider: string;

  /** Token usage statistics (if available) */
  tokensUsed?: TokenUsage;

  /** Target summary length (calculated) */
  targetLength?: number;

  /** Actual summary length in words */
  actualLength?: number;

  /** Any errors encountered (non-fatal) */
  errors?: string[];
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  /** Whether provider is healthy and available */
  success: boolean;

  /** Response latency in milliseconds */
  latency?: number;

  /** Error message if unhealthy */
  error?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Custom error class for AI provider errors
 *
 * Provides detailed error information with standardized classification
 * to enable smart retry logic and fallback strategies.
 */
export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public type: AIErrorType,
    public statusCode?: number,
    public retryable: boolean = false,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AIProviderError';

    // Maintain proper stack trace (only available in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIProviderError);
    }
  }

  /**
   * Factory method for rate limit errors
   */
  static rateLimited(provider: string, resetAt?: Date): AIProviderError {
    return new AIProviderError(
      'Rate limit exceeded for AI provider',
      provider,
      'rate_limited',
      429,
      true,
      { resetAt: resetAt?.toISOString() }
    );
  }

  /**
   * Factory method for timeout errors
   */
  static timeout(provider: string, duration: number): AIProviderError {
    return new AIProviderError(
      `Request timeout after ${duration}ms`,
      provider,
      'timeout',
      undefined,
      true,
      { duration }
    );
  }

  /**
   * Factory method for authentication errors
   */
  static authFailed(provider: string): AIProviderError {
    return new AIProviderError(
      'Authentication failed - check API key',
      provider,
      'authentication_failed',
      401,
      false
    );
  }

  /**
   * Factory method for API errors
   */
  static apiError(provider: string, statusCode: number, message: string): AIProviderError {
    const retryable = statusCode >= 500; // 5xx errors are retryable
    return new AIProviderError(
      message,
      provider,
      'api_error',
      statusCode,
      retryable
    );
  }

  /**
   * Serialize error for database storage
   */
  toJSON(): Record<string, any> {
    return {
      message: this.message,
      provider: this.provider,
      type: this.type,
      statusCode: this.statusCode,
      retryable: this.retryable,
      context: this.context,
    };
  }
}

/**
 * AI Provider Interface
 *
 * All AI service providers must implement this interface to ensure
 * consistent behavior and enable seamless provider switching.
 */
export interface AIProvider {
  /** Provider name (e.g., "OpenAI", "HuggingFace") */
  readonly name: string;

  /** Provider type identifier */
  readonly type: AIProviderType;

  /**
   * Check if provider is available and configured
   *
   * Should verify:
   * - API key present
   * - Required environment variables set
   * - Any other prerequisites met
   *
   * @returns true if provider can be used
   */
  isAvailable(): boolean;

  /**
   * Summarize text using the AI provider
   *
   * @param text - Text to summarize
   * @param options - Summarization options
   * @returns Summary result with metadata
   * @throws AIProviderError on failure
   */
  summarize(text: string, options?: SummarizeOptions): Promise<SummarizeResult>;

  /**
   * Test connection to AI provider
   *
   * Should perform a lightweight operation to verify:
   * - API key is valid
   * - Service is reachable
   * - Basic functionality works
   *
   * @returns Health check result
   */
  testConnection(): Promise<HealthCheckResult>;
}

/**
 * Helper function to calculate word count from text
 */
export function calculateWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Helper function to estimate token count
 * Uses approximation: 1 token ≈ 4 characters
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Helper function to validate summarization options
 */
export function validateSummarizeOptions(options?: SummarizeOptions): void {
  if (!options) return;

  if (options.minLength !== undefined && options.minLength < 0) {
    throw new Error('minLength must be non-negative');
  }

  if (options.maxLength !== undefined && options.maxLength < 0) {
    throw new Error('maxLength must be non-negative');
  }

  if (options.minLength !== undefined && options.maxLength !== undefined) {
    if (options.minLength > options.maxLength) {
      throw new Error('minLength cannot be greater than maxLength');
    }
  }

  if (options.timeout !== undefined && options.timeout <= 0) {
    throw new Error('timeout must be positive');
  }

  if (options.retries !== undefined && options.retries < 0) {
    throw new Error('retries must be non-negative');
  }
}
