/**
 * Provider Chain
 *
 * Orchestrates fallback logic across multiple AI providers.
 * Tries providers in sequence until one succeeds or all fail.
 *
 * Features:
 * - Automatic fallback to next provider on failure
 * - Skip unavailable providers
 * - Error aggregation for debugging
 * - Comprehensive logging of attempts
 */

import {
  AIProvider,
  AIProviderError,
  SummarizeOptions,
  SummarizeResult,
} from './AIProvider';

/**
 * Provider Chain for managing fallback logic
 */
export class ProviderChain {
  private providers: AIProvider[];

  /**
   * Create provider chain with ordered list of providers
   *
   * @param providers - Ordered list of providers (first = primary, last = fallback)
   */
  constructor(providers: AIProvider[]) {
    // Filter to only available providers
    this.providers = providers.filter(p => p.isAvailable());

    if (this.providers.length === 0) {
      throw new Error('No AI providers available. At least one provider must be configured.');
    }

    console.log(
      `[ProviderChain] Initialized with ${this.providers.length} providers: ` +
      this.providers.map(p => p.name).join(' → ')
    );
  }

  /**
   * Get list of available provider names
   */
  getProviderNames(): string[] {
    return this.providers.map(p => p.name);
  }

  /**
   * Summarize text with automatic fallback
   */
  async summarize(text: string, options: SummarizeOptions = {}): Promise<SummarizeResult> {
    const errors: Array<{ provider: string; error: Error }> = [];

    console.log(`[ProviderChain] Starting summarization with ${this.providers.length} providers`);

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      const isLastProvider = i === this.providers.length - 1;

      try {
        console.log(
          `[ProviderChain] Attempt ${i + 1}/${this.providers.length}: ${provider.name}`
        );

        const result = await provider.summarize(text, options);

        console.log(
          `[ProviderChain] Success with ${provider.name} ` +
          `(confidence: ${result.confidence.toFixed(2)})`
        );

        // Add provider chain metadata
        if (i > 0) {
          // Note: This was a fallback
          console.log(
            `[ProviderChain] Used fallback provider ${provider.name} ` +
            `after ${i} failed attempts`
          );
        }

        return result;
      } catch (error) {
        const errorObj = error as Error;
        errors.push({ provider: provider.name, error: errorObj });

        console.warn(
          `[ProviderChain] ${provider.name} failed: ${errorObj.message}`
        );

        // Check if error is retryable
        if (error instanceof AIProviderError) {
          if (!error.retryable && !isLastProvider) {
            console.log(
              `[ProviderChain] Non-retryable error from ${provider.name}, ` +
              `moving to next provider immediately`
            );
            continue;
          }

          // If rate limited and not last provider, try next immediately
          if (error.type === 'rate_limited' && !isLastProvider) {
            console.log(
              `[ProviderChain] ${provider.name} rate limited, ` +
              `trying next provider`
            );
            continue;
          }
        }

        // If this was the last provider, we're out of options
        if (isLastProvider) {
          console.error(
            `[ProviderChain] All ${this.providers.length} providers failed`
          );
          break;
        }

        // Otherwise, continue to next provider
        console.log(
          `[ProviderChain] Trying next provider (${i + 1}/${this.providers.length} failed)`
        );
      }
    }

    // All providers failed - throw aggregate error
    const errorMessages = errors
      .map(e => `${e.provider}: ${e.error.message}`)
      .join('; ');

    throw new AIProviderError(
      `All AI providers failed. Errors: ${errorMessages}`,
      'ProviderChain',
      'unknown',
      undefined,
      false,
      { errors: errors.map(e => ({ provider: e.provider, error: e.error.message })) }
    );
  }

  /**
   * Test all providers in chain
   */
  async testAllProviders(): Promise<Array<{
    provider: string;
    available: boolean;
    healthy: boolean;
    latency?: number;
    error?: string;
  }>> {
    const results = [];

    for (const provider of this.providers) {
      const available = provider.isAvailable();

      if (!available) {
        results.push({
          provider: provider.name,
          available: false,
          healthy: false,
          error: 'Provider not available',
        });
        continue;
      }

      try {
        const healthCheck = await provider.testConnection();
        results.push({
          provider: provider.name,
          available: true,
          healthy: healthCheck.success,
          latency: healthCheck.latency,
          error: healthCheck.error,
        });
      } catch (error) {
        results.push({
          provider: provider.name,
          available: true,
          healthy: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }
}
