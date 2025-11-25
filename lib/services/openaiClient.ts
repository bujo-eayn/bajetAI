/**
 * OpenAI API Client (Backup Fallback for HuggingFace)
 *
 * This module provides OpenAI GPT-3.5 as a backup when HuggingFace is unavailable
 * Cost-effective fallback: ~$0.002 per 1000 tokens
 */

import OpenAI from 'openai';

// Environment configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// OpenAI client (lazy initialization)
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  if (!client) {
    client = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return client;
}

export interface OpenAISummarizeOptions {
  maxLength?: number; // Target max length in words
  minLength?: number; // Target min length in words
  timeout?: number; // Timeout in milliseconds
}

export interface OpenAISummarizeResult {
  summary: string;
  modelVersion: string;
  confidence: number;
}

/**
 * Summarize text using OpenAI GPT-3.5-turbo
 */
export async function summarizeWithOpenAI(
  text: string,
  options: OpenAISummarizeOptions = {}
): Promise<OpenAISummarizeResult> {
  const {
    maxLength = 150,
    minLength = 50,
    timeout = 30000,
  } = options;

  const startTime = Date.now();

  try {
    const client = getClient();

    // Create summarization prompt
    const prompt = `Summarize the following text in ${minLength}-${maxLength} words. Focus on the key points, numbers, and important details:\n\n${text}`;

    // Call OpenAI API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await client.chat.completions.create(
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates concise, informative summaries of budget documents.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxLength * 2, // Approximate words to tokens
        temperature: 0.7, // Balanced creativity
      },
      {
        signal: controller.signal as any,
      }
    );

    clearTimeout(timeoutId);

    const summary = response.choices[0]?.message?.content?.trim() || '';
    const duration = Date.now() - startTime;

    console.log(
      `[OpenAI]  Success in ${duration}ms. Summary: ${summary.length} characters`
    );

    return {
      summary,
      modelVersion: 'gpt-3.5-turbo',
      confidence: 0.85, // OpenAI generally produces good summaries
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[OpenAI]  Error:', error);

    throw new Error(
      `OpenAI summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if OpenAI is configured and available
 */
export function isOpenAIAvailable(): boolean {
  return !!OPENAI_API_KEY;
}
