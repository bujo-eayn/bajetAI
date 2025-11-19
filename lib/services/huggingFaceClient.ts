/**
 * Hugging Face API Client
 *
 * This module provides a robust client for interacting with the Hugging Face Inference API.
 * It includes retry logic, timeout handling, error classification, and circuit breaker pattern
 * for graceful degradation under high load or API failures.
 *
 * Features:
 * - Exponential backoff retry for rate limits (429 responses)
 * - Configurable timeout handling (default 30s, max 60s)
 * - Comprehensive error classification
 * - Request/response logging for debugging
 * - Circuit breaker pattern for API failure scenarios
 */

import { HfInference } from '@huggingface/inference';

// Environment configuration
const HF_API_KEY = process.env.HUGGING_FACE_API_KEY;
const HF_TIMEOUT_MS = parseInt(process.env.HUGGING_FACE_TIMEOUT_MS || '30000', 10);
const MAX_TIMEOUT_MS = 60000; // 60 seconds maximum

// Circuit breaker configuration
const CIRCUIT_BREAKER_THRESHOLD = 5; // Number of failures before opening circuit
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute cooldown
let circuitBreakerFailures = 0;
let circuitBreakerOpenUntil: number | null = null;

/**
 * Error types for Hugging Face API failures
 */
export type HuggingFaceErrorType =
  | 'rate_limited'
  | 'timeout'
  | 'api_error'
  | 'invalid_response'
  | 'connection_error'
  | 'model_error'
  | 'circuit_open'
  | 'unknown';

/**
 * Custom error class for Hugging Face API errors
 */
export class HuggingFaceError extends Error {
  constructor(
    message: string,
    public errorType: HuggingFaceErrorType,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'HuggingFaceError';
  }
}

/**
 * Initialize Hugging Face Inference client
 */
function createClient(): HfInference {
  if (!HF_API_KEY) {
    throw new Error(
      'HUGGING_FACE_API_KEY is not configured. Please add it to your environment variables.'
    );
  }
  return new HfInference(HF_API_KEY);
}

/**
 * Check if circuit breaker is open
 */
function isCircuitOpen(): boolean {
  if (circuitBreakerOpenUntil === null) return false;

  const now = Date.now();
  if (now < circuitBreakerOpenUntil) {
    return true;
  }

  // Reset circuit breaker after timeout
  circuitBreakerFailures = 0;
  circuitBreakerOpenUntil = null;
  return false;
}

/**
 * Record circuit breaker failure
 */
function recordCircuitFailure(): void {
  circuitBreakerFailures++;

  if (circuitBreakerFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreakerOpenUntil = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
    console.error(
      `[HuggingFace] Circuit breaker OPENED after ${circuitBreakerFailures} failures. ` +
      `Will retry after ${CIRCUIT_BREAKER_TIMEOUT / 1000}s`
    );
  }
}

/**
 * Reset circuit breaker on success
 */
function resetCircuit(): void {
  if (circuitBreakerFailures > 0) {
    console.log('[HuggingFace] Circuit breaker RESET after successful request');
  }
  circuitBreakerFailures = 0;
  circuitBreakerOpenUntil = null;
}

/**
 * Classify error based on error message and status code
 */
function classifyError(error: unknown): { type: HuggingFaceErrorType; message: string } {
  // Handle our custom errors
  if (error instanceof HuggingFaceError) {
    return { type: error.errorType, message: error.message };
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  // Rate limiting
  if (errorString.includes('rate limit') || errorString.includes('429')) {
    return {
      type: 'rate_limited',
      message: 'Hugging Face API rate limit exceeded. Please try again later.',
    };
  }

  // Timeout
  if (errorString.includes('timeout') || errorString.includes('timed out')) {
    return {
      type: 'timeout',
      message: 'Request to Hugging Face API timed out. The text may be too long.',
    };
  }

  // Connection errors
  if (
    errorString.includes('network') ||
    errorString.includes('connection') ||
    errorString.includes('econnrefused') ||
    errorString.includes('fetch failed')
  ) {
    return {
      type: 'connection_error',
      message: 'Failed to connect to Hugging Face API. Please check your internet connection.',
    };
  }

  // API errors (5xx)
  if (errorString.includes('500') || errorString.includes('503') || errorString.includes('502')) {
    return {
      type: 'api_error',
      message: 'Hugging Face API is experiencing issues. Please try again later.',
    };
  }

  // Model errors
  if (errorString.includes('model') || errorString.includes('loading')) {
    return {
      type: 'model_error',
      message: 'The AI model is currently unavailable. Please try again in a few moments.',
    };
  }

  // Invalid response
  if (errorString.includes('invalid') || errorString.includes('parse')) {
    return {
      type: 'invalid_response',
      message: 'Received invalid response from Hugging Face API.',
    };
  }

  // Unknown error
  return {
    type: 'unknown',
    message: `Unexpected error: ${errorMessage}`,
  };
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Summarize text using facebook/bart-large-cnn model with retry logic
 *
 * @param text - The text to summarize
 * @param options - Optional configuration
 * @returns Summarized text
 */
export async function summarizeText(
  text: string,
  options: {
    maxLength?: number;
    minLength?: number;
    retries?: number;
    timeout?: number;
  } = {}
): Promise<string> {
  const {
    maxLength = 150,
    minLength = 50,
    retries = 2,
    timeout = HF_TIMEOUT_MS,
  } = options;

  // Validate timeout
  const safeTimeout = Math.min(timeout, MAX_TIMEOUT_MS);

  // Check circuit breaker
  if (isCircuitOpen()) {
    const error = new HuggingFaceError(
      'Hugging Face API is temporarily unavailable due to repeated failures. Using fallback.',
      'circuit_open'
    );
    recordCircuitFailure();
    throw error;
  }

  const client = createClient();
  let lastError: unknown;

  // Retry loop
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const startTime = Date.now();

      console.log(
        `[HuggingFace] Attempt ${attempt + 1}/${retries + 1}: Summarizing ${text.length} characters ` +
        `(max: ${maxLength}, min: ${minLength}, timeout: ${safeTimeout}ms)`
      );

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), safeTimeout);

      try {
        // Call Hugging Face API
        const result = await client.summarization({
          model: 'facebook/bart-large-cnn',
          inputs: text,
          parameters: {
            max_length: maxLength,
            min_length: minLength,
          },
        });

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;
        console.log(
          `[HuggingFace] ✓ Success in ${duration}ms. Summary: ${result.summary_text?.length || 0} characters`
        );

        // Reset circuit breaker on success
        resetCircuit();

        return result.summary_text || '';
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      lastError = error;
      const { type, message } = classifyError(error);

      console.error(
        `[HuggingFace] ✗ Attempt ${attempt + 1} failed:`,
        { type, message, error: error instanceof Error ? error.message : String(error) }
      );

      // Don't retry for certain error types
      const nonRetryableErrors: HuggingFaceErrorType[] = ['invalid_response', 'model_error'];
      if (nonRetryableErrors.includes(type)) {
        recordCircuitFailure();
        throw new HuggingFaceError(message, type, undefined, error);
      }

      // Calculate exponential backoff delay
      if (attempt < retries) {
        const baseDelay = type === 'rate_limited' ? 5000 : 1000;
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[HuggingFace] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  const { type, message } = classifyError(lastError);
  recordCircuitFailure();
  throw new HuggingFaceError(message, type, undefined, lastError);
}

/**
 * Test connection to Hugging Face API
 *
 * @returns True if connection is successful
 */
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const testText = 'This is a simple test to verify the Hugging Face API connection.';
    await summarizeText(testText, { maxLength: 50, minLength: 10, retries: 0 });
    return { success: true };
  } catch (error) {
    const { message } = classifyError(error);
    return { success: false, error: message };
  }
}

/**
 * Get current circuit breaker status
 */
export function getCircuitBreakerStatus(): {
  isOpen: boolean;
  failures: number;
  openUntil: number | null;
} {
  return {
    isOpen: isCircuitOpen(),
    failures: circuitBreakerFailures,
    openUntil: circuitBreakerOpenUntil,
  };
}
