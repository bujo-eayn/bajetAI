/**
 * Extractive Fallback Provider
 *
 * Local extractive summarization as last-resort fallback when all AI providers fail.
 * Uses intelligent sentence selection based on position, keywords, and importance scoring.
 *
 * Features:
 * - No external API calls (always available)
 * - Keyword-based importance scoring
 * - Position-based sentence selection (beginning, middle, end)
 * - Dynamic length calculation (10% rule)
 */

import {
  AIProvider,
  AIProviderType,
  SummarizeOptions,
  SummarizeResult,
  HealthCheckResult,
  calculateWordCount,
  validateSummarizeOptions,
} from './AIProvider';
import { calculateSummaryLength } from '../../utils/summaryLength';

/**
 * Extractive Fallback Provider Implementation
 */
export class ExtractiveFallbackProvider implements AIProvider {
  readonly name = 'Extractive';
  readonly type: AIProviderType = 'extractive';

  /**
   * Always available (no external dependencies)
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Calculate dynamic summary length based on text length
   *
   * Uses centralized utility from lib/utils/summaryLength.ts
   * Implements 10% rule with absolute constraints (200-15,000 words)
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
   * Score sentence by importance
   */
  private scoreSentence(
    sentence: string,
    index: number,
    totalSentences: number
  ): number {
    let score = 0;

    // Position scoring
    const percentPosition = index / totalSentences;

    if (percentPosition < 0.2) {
      // First 20% of document (introduction)
      score += 2.0;
    } else if (percentPosition > 0.8) {
      // Last 20% of document (conclusion)
      score += 1.5;
    } else if (percentPosition >= 0.4 && percentPosition <= 0.6) {
      // Middle section (core content)
      score += 1.0;
    }

    // Length scoring (prefer substantial sentences)
    const wordCount = sentence.split(/\s+/).length;
    if (wordCount >= 10 && wordCount <= 40) {
      score += 1.0;
    } else if (wordCount > 40) {
      score += 0.5; // Long sentences get some points but less
    }

    // Keyword scoring (budget document specific, but works for general docs)
    const keywords = [
      /\b(budget|allocation|million|billion|ksh|funding)\b/i,
      /\b(key|important|significant|critical|priority)\b/i,
      /\b(objective|goal|target|aim)\b/i,
      /\b(total|summary|overall|aggregate)\b/i,
      /\b(increase|decrease|growth|reduction)\b/i,
      /\b(recommend|propose|suggest)\b/i,
      /\b(conclusion|finding|result)\b/i,
    ];

    keywords.forEach(keyword => {
      if (keyword.test(sentence)) {
        score += 0.5;
      }
    });

    // Numerical content (likely contains important data)
    const numberMatches = sentence.match(/\d+/g);
    if (numberMatches && numberMatches.length > 0) {
      score += 0.5 * Math.min(numberMatches.length, 3); // Cap at 1.5 points
    }

    // Capital letters (acronyms, proper nouns)
    const capitalMatches = sentence.match(/\b[A-Z]{2,}\b/g);
    if (capitalMatches && capitalMatches.length > 0) {
      score += 0.5;
    }

    return score;
  }

  /**
   * Extract key sentences from text
   */
  private extractSentences(text: string, targetWordCount: number): string[] {
    // Split into sentences
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const allSentences = text.match(sentenceRegex) || [];

    if (allSentences.length === 0) {
      // Fallback: split by newlines if no sentence delimiters
      return text.split('\n').filter(s => s.trim().length > 10).slice(0, 10);
    }

    // Clean and score sentences
    const scoredSentences = allSentences
      .map(s => s.trim())
      .filter(s => s.length >= 10) // Filter out very short sentences
      .map((sentence, index) => ({
        sentence,
        score: this.scoreSentence(sentence, index, allSentences.length),
        originalIndex: index,
      }));

    // Sort by score (descending)
    scoredSentences.sort((a, b) => b.score - a.score);

    // Select sentences until we reach target word count
    const selectedSentences: typeof scoredSentences = [];
    let currentWordCount = 0;

    for (const item of scoredSentences) {
      const sentenceWords = item.sentence.split(/\s+/).length;

      if (currentWordCount + sentenceWords <= targetWordCount * 1.2) {
        selectedSentences.push(item);
        currentWordCount += sentenceWords;
      }

      // Stop when we have enough content
      if (currentWordCount >= targetWordCount * 0.9) {
        break;
      }
    }

    // Sort back to original order for coherence
    selectedSentences.sort((a, b) => a.originalIndex - b.originalIndex);

    return selectedSentences.map(item => item.sentence);
  }

  /**
   * Create extractive summary
   */
  async summarize(text: string, options: SummarizeOptions = {}): Promise<SummarizeResult> {
    // Validate options
    validateSummarizeOptions(options);

    // Calculate target length
    const dynamicLength = options.dynamicLength !== false;
    let targetWords: number;
    let minWords: number;
    let maxWords: number;

    if (dynamicLength && !options.minLength && !options.maxLength) {
      const calculated = this.calculateDynamicLength(text.length);
      targetWords = calculated.targetWords;
      minWords = calculated.minWords;
      maxWords = calculated.maxWords;
    } else {
      minWords = options.minLength || 200;
      maxWords = options.maxLength || 600;
      targetWords = Math.ceil((minWords + maxWords) / 2);
    }

    const startTime = Date.now();

    // Extract key sentences
    const selectedSentences = this.extractSentences(text, targetWords);

    // Join sentences
    const summary = selectedSentences.join(' ');

    // Calculate actual word count
    const actualWords = calculateWordCount(summary);

    const duration = Date.now() - startTime;

    console.log(
      `[Extractive] Summary created: ${actualWords} words (target: ${targetWords}), ${duration}ms`
    );

    // Low confidence for extractive (0.3)
    return {
      summary,
      confidence: 0.3,
      modelVersion: 'extractive-v1',
      provider: this.name,
      targetLength: targetWords,
      actualLength: actualWords,
    };
  }

  /**
   * Test connection (always succeeds for local provider)
   */
  async testConnection(): Promise<HealthCheckResult> {
    return {
      success: true,
      latency: 0,
      metadata: {
        type: 'local',
        version: 'extractive-v1',
      },
    };
  }
}

// Export singleton instance
export const extractiveFallbackProvider = new ExtractiveFallbackProvider();
