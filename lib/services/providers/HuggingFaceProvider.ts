/**
 * HuggingFace Provider
 *
 * Implementation of AI provider interface using HuggingFace Inference API.
 * Maintains existing circuit breaker and retry logic while conforming to
 * the AIProvider interface.
 *
 * Features:
 * - BART-large-CNN model for summarization
 * - Circuit breaker pattern for graceful degradation
 * - Exponential backoff retry logic
 * - Rate limit integration
 */

import { InferenceClient } from '@huggingface/inference';
import {
  AIProvider,
  AIProviderType,
  AIProviderError,
  SummarizeOptions,
  SummarizeResult,
  HealthCheckResult,
  calculateWordCount,
  validateSummarizeOptions,
} from './AIProvider';
import {
  checkRateLimit,
  incrementRateLimit,
  isRateLimitExceeded,
} from '../rateLimiter';

// HuggingFace configuration
const HF_MODEL = 'facebook/bart-large-cnn';
const HF_TIMEOUT_MS = parseInt(process.env.HUGGING_FACE_TIMEOUT_MS || '30000', 10);
const MAX_TIMEOUT_MS = 60000;

// Circuit breaker configuration
const CIRCUIT_BREAKER_THRESHOLD = 15;
const CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes

/**
 * HuggingFace Provider Implementation
 */
export class HuggingFaceProvider implements AIProvider {
  readonly name = 'HuggingFace';
  readonly type: AIProviderType = 'huggingface';

  private client: InferenceClient | null = null;
  private rateLimiterService = 'huggingface';
  private circuitBreakerFailures = 0;
  private circuitBreakerOpenUntil: number | null = null;

  /**
   * Lazy-load HuggingFace client
   */
  private getClient(): InferenceClient {
    if (!this.client) {
      const apiKey = process.env.HUGGING_FACE_API_KEY;
      if (!apiKey) {
        throw AIProviderError.authFailed(this.name);
      }
      this.client = new InferenceClient(apiKey);
    }
    return this.client;
  }

  /**
   * Check if HuggingFace is available
   */
  isAvailable(): boolean {
    return !!process.env.HUGGING_FACE_API_KEY;
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(): boolean {
    if (this.circuitBreakerOpenUntil === null) return false;

    const now = Date.now();
    if (now < this.circuitBreakerOpenUntil) {
      return true;
    }

    // Reset circuit breaker after timeout
    this.circuitBreakerFailures = 0;
    this.circuitBreakerOpenUntil = null;
    return false;
  }

  /**
   * Record circuit breaker failure
   */
  private recordCircuitFailure(): void {
    this.circuitBreakerFailures++;

    if (this.circuitBreakerFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreakerOpenUntil = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
      console.error(
        `[HuggingFace] Circuit breaker opened after ${this.circuitBreakerFailures} failures. ` +
        `Will retry in ${CIRCUIT_BREAKER_TIMEOUT / 1000}s`
      );
    }
  }

  /**
   * Reset circuit breaker on success
   */
  private resetCircuitBreaker(): void {
    if (this.circuitBreakerFailures > 0) {
      console.log('[HuggingFace] Circuit breaker reset after successful request');
      this.circuitBreakerFailures = 0;
      this.circuitBreakerOpenUntil = null;
    }
  }

  /**
   * Map HuggingFace error to AIProviderError
   */
  private mapError(error: any): AIProviderError {
    const errorMessage = error.message || String(error);

    // Rate limit (429)
    if (error.status === 429 || errorMessage.toLowerCase().includes('rate limit')) {
      return AIProviderError.rateLimited(this.name);
    }

    // Timeout
    if (errorMessage.toLowerCase().includes('timeout') || error.code === 'ETIMEDOUT') {
      return AIProviderError.timeout(this.name, HF_TIMEOUT_MS);
    }

    // Connection errors
    if (
      errorMessage.toLowerCase().includes('network') ||
      errorMessage.toLowerCase().includes('connection') ||
      error.code === 'ECONNREFUSED'
    ) {
      return new AIProviderError(
        'Network connection failed',
        this.name,
        'connection_error',
        undefined,
        true
      );
    }

    // API errors (5xx)
    if (error.status >= 500) {
      return AIProviderError.apiError(this.name, error.status, errorMessage);
    }

    // Model loading errors
    if (errorMessage.toLowerCase().includes('model') || error.status === 503) {
      return new AIProviderError(
        'Model temporarily unavailable or loading',
        this.name,
        'model_unavailable',
        503,
        true
      );
    }

    // Circuit breaker open
    if (this.isCircuitOpen()) {
      return new AIProviderError(
        'Circuit breaker is open - too many recent failures',
        this.name,
        'api_error',
        undefined,
        false
      );
    }

    // Unknown error
    return new AIProviderError(
      errorMessage,
      this.name,
      'unknown',
      error.status,
      false
    );
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 2
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        this.resetCircuitBreaker();
        return result;
      } catch (error) {
        lastError = error as Error;

        const aiError = this.mapError(error);
        this.recordCircuitFailure();

        // Don't retry on non-retryable errors
        if (!aiError.retryable || attempt === maxRetries) {
          throw aiError;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(
          `[HuggingFace] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw this.mapError(lastError || new Error('Retry failed'));
  }

  /**
   * Summarize text using HuggingFace
   */
  async summarize(text: string, options: SummarizeOptions = {}): Promise<SummarizeResult> {
    // Validate options
    validateSummarizeOptions(options);

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      console.warn('[HuggingFace] Circuit breaker is open');
      throw new AIProviderError(
        'Circuit breaker is open - too many recent failures',
        this.name,
        'api_error',
        undefined,
        false
      );
    }

    // Check rate limit
    const rateLimitStatus = checkRateLimit(this.rateLimiterService);
    if (!rateLimitStatus.allowed) {
      console.warn(
        `[HuggingFace] Rate limit exceeded: ${rateLimitStatus.current}/${rateLimitStatus.limit}`
      );
      throw AIProviderError.rateLimited(this.name, rateLimitStatus.resetAt);
    }

    // Use provided lengths or defaults
    const maxLength = options.maxLength || 600;
    const minLength = options.minLength || 200;

    const startTime = Date.now();

    try {
      const client = this.getClient();

      // Make API call with retry logic
      const result = await this.retryWithBackoff(async () => {
        return await client.summarization({
          model: HF_MODEL,
          inputs: text,
          parameters: {
            max_length: maxLength,
            min_length: minLength,
            do_sample: false, // Deterministic output
          },
        });
      }, options.retries || 2);

      const duration = Date.now() - startTime;

      // Extract summary
      const summary = result.summary_text?.trim() || '';

      if (!summary) {
        throw new Error('HuggingFace returned empty summary');
      }

      // Calculate actual word count
      const actualWords = calculateWordCount(summary);

      // Increment rate limiter
      incrementRateLimit(this.rateLimiterService);

      // Confidence for HuggingFace (0.75 as fallback provider)
      const confidence = 0.75;

      console.log(
        `[HuggingFace] Summarization successful: ${actualWords} words, ${duration}ms`
      );

      return {
        summary,
        confidence,
        modelVersion: HF_MODEL,
        provider: this.name,
        actualLength: actualWords,
        targetLength: Math.ceil((minLength + maxLength) / 2),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[HuggingFace] Summarization failed after ${duration}ms:`, error);

      // Re-throw if already AIProviderError
      if (error instanceof AIProviderError) {
        throw error;
      }

      // Map and throw
      throw this.mapError(error);
    }
  }

  /**
   * Test connection to HuggingFace
   */
  async testConnection(): Promise<HealthCheckResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'HuggingFace API key not configured',
      };
    }

    if (this.isCircuitOpen()) {
      return {
        success: false,
        error: 'Circuit breaker is open',
      };
    }

    const startTime = Date.now();

    try {
      const client = this.getClient();

      // Simple test request
      await client.summarization({
        model: HF_MODEL,
        inputs: 'This is a test sentence to verify API connectivity.',
        parameters: {
          max_length: 50,
          min_length: 10,
        },
      });

      const latency = Date.now() - startTime;

      return {
        success: true,
        latency,
        metadata: {
          model: HF_MODEL,
          circuitBreakerFailures: this.circuitBreakerFailures,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        latency,
        error: errorMessage,
      };
    }
  }
}

// Export singleton instance
export const huggingFaceProvider = new HuggingFaceProvider();
