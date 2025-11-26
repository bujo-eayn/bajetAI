/**
 * Summarization Prompts
 *
 * This module provides structured prompts for AI-powered document summarization.
 * Prompts are designed to produce comprehensive, well-structured summaries that
 * cover all key sections while filtering out irrelevant content.
 *
 * Key Features:
 * - Domain-agnostic (model infers document type)
 * - Structured output with section headers
 * - Intelligent content filtering
 * - Dynamic length adaptation
 * - Context-aware chunking support
 */

/**
 * Base system prompt for document summarization
 *
 * This prompt establishes the AI's role and output format without
 * specifying document type, allowing the model to adapt based on content.
 */
export const SUMMARIZATION_SYSTEM_PROMPT = `You are an expert document analyzer specializing in creating comprehensive, structured summaries. Your task is to analyze documents and produce clear, well-organized summaries that help readers quickly understand the key content.

## Output Requirements

1. **Structure**: Use markdown format with H2 headers (##) for each major topic or section
2. **Coverage**: Identify and summarize ALL substantive sections of the document
3. **Clarity**: Use clear, accessible language appropriate for a general audience
4. **Accuracy**: Preserve key figures, dates, and factual information exactly
5. **Organization**: Present information in logical order following document flow

## Content Filtering

**SKIP these sections** (do not include in summary):
- Table of contents
- References and bibliography
- Index sections
- Acknowledgments
- Copyright and legal boilerplate
- Lists of figures or tables
- Glossaries (unless containing critical definitions)
- Appendices with raw data tables

**PRIORITIZE these sections** (focus your summary here):
- Executive summaries and abstracts
- Main body content and analysis
- Key findings and conclusions
- Data analysis and interpretations
- Recommendations and action items
- Strategic objectives and goals
- Financial information and allocations
- Timelines and milestones
- Policy proposals and changes

## Formatting Guidelines

- Use H2 headers (##) for main topics/chapters
- Use bullet points for sub-points within sections
- Preserve numerical data with appropriate context
- Maintain professional, objective tone
- Ensure smooth transitions between topics
- Include section markers for document parts (e.g., "Section 3: Budget Allocation")

Remember: The goal is comprehensive coverage of substantive content, not exhaustive detail. Focus on what matters most to understanding the document's purpose and key messages.`;

/**
 * Generate user prompt for single-chunk summarization
 */
export function generateSingleChunkPrompt(
  text: string,
  minWords: number,
  maxWords: number
): string {
  return `Please create a comprehensive, structured summary of the following document. Your summary should:

- Be between ${minWords} and ${maxWords} words
- Use markdown H2 headers (##) to organize main topics
- Cover all key sections and findings
- Skip table of contents, references, and boilerplate
- Preserve important figures and dates

Document to summarize:

${text}`;
}

/**
 * Generate user prompt for multi-chunk first-level summarization
 * (summarizing individual chunks)
 */
export function generateChunkPrompt(
  text: string,
  chunkIndex: number,
  totalChunks: number,
  minWords: number,
  maxWords: number
): string {
  const positionContext = totalChunks > 1
    ? `\n\nNote: This is part ${chunkIndex + 1} of ${totalChunks} from a larger document. Summarize this section comprehensively, as it will be combined with other sections later.`
    : '';

  return `Please create a structured summary of this document section. Your summary should:

- Be between ${minWords} and ${maxWords} words
- Use markdown H2 headers (##) for main topics in this section
- Identify and summarize all key points
- Skip any table of contents, references, or boilerplate
- Preserve important figures and dates
- Focus on substantive content only${positionContext}

Document section to summarize:

${text}`;
}

/**
 * Generate user prompt for multi-chunk second-level summarization
 * (combining chunk summaries into final summary)
 */
export function generateCombinationPrompt(
  combinedChunkSummaries: string,
  minWords: number,
  maxWords: number
): string {
  return `I have individual summaries from different sections of a document. Please synthesize these into a single, coherent final summary that:

- Is between ${minWords} and ${maxWords} words
- Uses markdown H2 headers (##) to organize main topics
- Combines information logically by topic (not by section)
- Eliminates redundancy and duplication
- Maintains all key information and figures
- Provides a complete overview of the entire document
- Follows a logical flow from beginning to end

Individual section summaries to synthesize:

${combinedChunkSummaries}`;
}

/**
 * Message format for OpenAI Chat Completions API
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Build messages array for OpenAI API call
 */
export function buildSummarizationMessages(
  text: string,
  options: {
    minWords: number;
    maxWords: number;
    chunkIndex?: number;
    totalChunks?: number;
    isMultiLevel?: boolean;
  }
): ChatMessage[] {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: SUMMARIZATION_SYSTEM_PROMPT,
    },
  ];

  // Determine which user prompt to use
  if (options.isMultiLevel) {
    // Combining chunk summaries
    messages.push({
      role: 'user',
      content: generateCombinationPrompt(text, options.minWords, options.maxWords),
    });
  } else if (options.chunkIndex !== undefined && options.totalChunks !== undefined) {
    // Individual chunk summarization
    messages.push({
      role: 'user',
      content: generateChunkPrompt(
        text,
        options.chunkIndex,
        options.totalChunks,
        options.minWords,
        options.maxWords
      ),
    });
  } else {
    // Single-chunk document
    messages.push({
      role: 'user',
      content: generateSingleChunkPrompt(text, options.minWords, options.maxWords),
    });
  }

  return messages;
}

/**
 * Calculate approximate token count for messages
 * (for validating against model context limits)
 */
export function estimateMessageTokens(messages: ChatMessage[]): number {
  // Rough estimation: 1 token ≈ 4 characters
  // Add overhead for message formatting (~4 tokens per message)
  const contentTokens = messages.reduce((total, msg) => {
    return total + Math.ceil(msg.content.length / 4);
  }, 0);

  const formattingTokens = messages.length * 4;

  return contentTokens + formattingTokens;
}

/**
 * Validate that prompt and text will fit in model context
 *
 * @param text - Text to summarize
 * @param maxOutputTokens - Expected output size
 * @param contextLimit - Model's context window limit (default: 16385 for GPT-3.5-turbo-16k)
 * @returns true if will fit, false otherwise
 */
export function validateContextFit(
  text: string,
  options: {
    minWords: number;
    maxWords: number;
    chunkIndex?: number;
    totalChunks?: number;
    isMultiLevel?: boolean;
  },
  maxOutputTokens: number = 3000,
  contextLimit: number = 16385
): { fits: boolean; estimatedTokens: number; availableTokens: number } {
  const messages = buildSummarizationMessages(text, options);
  const inputTokens = estimateMessageTokens(messages);
  const totalTokens = inputTokens + maxOutputTokens;

  return {
    fits: totalTokens <= contextLimit,
    estimatedTokens: totalTokens,
    availableTokens: contextLimit - totalTokens,
  };
}
