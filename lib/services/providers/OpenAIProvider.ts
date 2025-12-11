/**
 * OpenAI Provider
 *
 * Implementation of AI provider interface using OpenAI's GPT models.
 * Optimized for document summarization with structured output and
 * comprehensive error handling.
 *
 * Features:
 * - GPT-3.5-Turbo (16k context window)
 * - Structured prompts with markdown output
 * - Dynamic length calculation (10% rule)
 * - Token usage tracking
 * - Exponential backoff retry logic
 * - Rate limit integration
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import {
  AIProvider,
  AIProviderType,
  AIProviderError,
  AIErrorType,
  SummarizeOptions,
  SummarizeResult,
  HealthCheckResult,
  TokenUsage,
  calculateWordCount,
  validateSummarizeOptions,
} from './AIProvider';
import {
  buildSummarizationMessages,
  validateContextFit,
} from '../../prompts/summarization';
import {
  checkRateLimit,
  incrementRateLimit,
  isRateLimitExceeded,
} from '../rateLimiter';
import { calculateSummaryLength } from '../../utils/summaryLength';

// OpenAI configuration
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo-16k';
const OPENAI_TIMEOUT_MS = parseInt(process.env.OPENAI_TIMEOUT_MS || '30000');
const OPENAI_MAX_RETRIES = parseInt(process.env.OPENAI_MAX_RETRIES || '2');
const OPENAI_TEMPERATURE = 0.7; // Balanced creativity

// Context limits for GPT-3.5-Turbo-16k
const CONTEXT_WINDOW = 16385; // Total tokens
const MAX_OUTPUT_TOKENS = 4000; // Reserve for response
const SAFETY_BUFFER = 500; // Additional safety margin

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'OpenAI';
  readonly type: AIProviderType = 'openai';

  private client: OpenAI | null = null;
  private rateLimiterService = 'openai';

  /**
   * Lazy-load OpenAI client
   */
  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw AIProviderError.authFailed(this.name);
      }

      this.client = new OpenAI({
        apiKey,
        timeout: OPENAI_TIMEOUT_MS,
        maxRetries: 0, // We handle retries manually
      });
    }

    return this.client;
  }

  /**
   * Check if OpenAI is available
   */
  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Calculate dynamic summary length based on text length
   *
   * Uses centralized utility from lib/utils/summaryLength.ts
   * Implements 10% rule with absolute constraints (200-15,000 words)
   *
   * @param textLength - Character count of input text
   * @returns Min, max, and target word counts
   */
  private calculateDynamicLength(textLength: number): {
    minWords: number;
    maxWords: number;
    targetWords: number;
  } {
    const { minLength, maxLength, targetLength } = calculateSummaryLength(textLength);

    return {
      minWords: minLength,
      maxWords: maxLength,
      targetWords: targetLength,
    };
  }

  /**
   * Map OpenAI error to AIProviderError
   */
  private mapError(error: any): AIProviderError {
    const errorMessage = error.message || String(error);

    // Rate limit (429)
    if (error.status === 429 || errorMessage.toLowerCase().includes('rate limit')) {
      return AIProviderError.rateLimited(this.name);
    }

    // Authentication (401)
    if (error.status === 401 || errorMessage.toLowerCase().includes('authentication')) {
      return AIProviderError.authFailed(this.name);
    }

    // Timeout
    if (errorMessage.toLowerCase().includes('timeout') || error.code === 'ETIMEDOUT') {
      return AIProviderError.timeout(this.name, OPENAI_TIMEOUT_MS);
    }

    // Connection errors
    if (
      errorMessage.toLowerCase().includes('network') ||
      errorMessage.toLowerCase().includes('connection') ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND'
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

    // Invalid input (400)
    if (error.status === 400) {
      return new AIProviderError(
        errorMessage,
        this.name,
        'invalid_input',
        400,
        false
      );
    }

    // Model unavailable (503)
    if (error.status === 503 || errorMessage.toLowerCase().includes('model')) {
      return new AIProviderError(
        'Model temporarily unavailable',
        this.name,
        'model_unavailable',
        503,
        true
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
    maxRetries: number = OPENAI_MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        const aiError = this.mapError(error);

        // Don't retry on non-retryable errors
        if (!aiError.retryable || attempt === maxRetries) {
          throw aiError;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(
          `[OpenAI] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw this.mapError(lastError || new Error('Retry failed'));
  }

  /**
   * Summarize text using OpenAI GPT
   */
  async summarize(text: string, options: SummarizeOptions = {}): Promise<SummarizeResult> {
    // Validate options
    validateSummarizeOptions(options);

    // Check rate limit
    const rateLimitStatus = checkRateLimit(this.rateLimiterService);
    if (!rateLimitStatus.allowed) {
      console.warn(
        `[OpenAI] Rate limit exceeded: ${rateLimitStatus.current}/${rateLimitStatus.limit}`
      );
      throw AIProviderError.rateLimited(this.name, rateLimitStatus.resetAt);
    }

    // Log rate limit status if approaching limit
    if (rateLimitStatus.remaining < rateLimitStatus.limit * 0.25) {
      console.warn(
        `[OpenAI] Approaching rate limit: ${rateLimitStatus.remaining} calls remaining`
      );
    }

    // Calculate dynamic lengths if not provided
    const dynamicLength = options.dynamicLength !== false;
    let minWords: number;
    let maxWords: number;
    let targetWords: number;

    if (dynamicLength && !options.minLength && !options.maxLength) {
      const calculated = this.calculateDynamicLength(text.length);
      minWords = calculated.minWords;
      maxWords = calculated.maxWords;
      targetWords = calculated.targetWords;
    } else {
      minWords = options.minLength || 200;
      maxWords = options.maxLength || 600;
      targetWords = Math.ceil((minWords + maxWords) / 2);
    }

    // Build prompt messages
    const messages = buildSummarizationMessages(text, {
      minWords,
      maxWords,
      chunkIndex: options.chunkIndex,
      totalChunks: options.totalChunks,
      isMultiLevel: false, // Set by summarizationService for level 2
    });

    // Validate context fit
    const contextCheck = validateContextFit(
      text,
      { minWords, maxWords, chunkIndex: options.chunkIndex, totalChunks: options.totalChunks },
      MAX_OUTPUT_TOKENS,
      CONTEXT_WINDOW
    );

    if (!contextCheck.fits) {
      console.warn(
        `[OpenAI] Text may exceed context limit: ${contextCheck.estimatedTokens} tokens ` +
        `(limit: ${CONTEXT_WINDOW}, available: ${contextCheck.availableTokens})`
      );
      // Still proceed - OpenAI will truncate if needed
    }

    const startTime = Date.now();

    try {
      const client = this.getClient();

      // Make API call with retry logic
      const completion = await this.retryWithBackoff(async () => {
        return await client.chat.completions.create(
          {
            model: OPENAI_MODEL,
            messages: messages as ChatCompletionMessageParam[],
            temperature: OPENAI_TEMPERATURE,
            max_tokens: MAX_OUTPUT_TOKENS,
          },
          {
            timeout: options.timeout || OPENAI_TIMEOUT_MS,
          }
        );
      }, options.retries);

      const duration = Date.now() - startTime;

      // Extract summary
      const summary = completion.choices[0]?.message?.content?.trim() || '';

      if (!summary) {
        throw new Error('OpenAI returned empty summary');
      }

      // Calculate actual word count
      const actualWords = calculateWordCount(summary);

      // Build token usage
      const tokensUsed: TokenUsage = {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0,
        model: completion.model,
      };

      // Increment rate limiter
      incrementRateLimit(this.rateLimiterService);

      // Calculate confidence
      // High confidence for OpenAI (0.85) since it's our primary provider
      const confidence = 0.85;

      console.log(
        `[OpenAI] Summarization successful: ${actualWords} words, ` +
        `${tokensUsed.total} tokens, ${duration}ms`
      );

      return {
        summary,
        confidence,
        modelVersion: completion.model,
        provider: this.name,
        tokensUsed,
        targetLength: targetWords,
        actualLength: actualWords,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[OpenAI] Summarization failed after ${duration}ms:`, error);

      // Re-throw if already AIProviderError
      if (error instanceof AIProviderError) {
        throw error;
      }

      // Map and throw
      throw this.mapError(error);
    }
  }

  /**
   * Test connection to OpenAI
   */
  async testConnection(): Promise<HealthCheckResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
      };
    }

    const startTime = Date.now();

    try {
      const client = this.getClient();

      // Simple test request
      const response = await client.chat.completions.create(
        {
          model: OPENAI_MODEL,
          messages: [
            { role: 'user', content: 'Respond with "ok"' },
          ],
          max_tokens: 10,
        },
        {
          timeout: 5000, // 5 second timeout for health check
        }
      );

      const latency = Date.now() - startTime;

      return {
        success: true,
        latency,
        metadata: {
          model: response.model,
          tokensUsed: response.usage?.total_tokens || 0,
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
export const openaiProvider = new OpenAIProvider();
