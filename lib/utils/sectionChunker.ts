/**
 * Section-Based Chunker for RAG Embeddings
 *
 * This module creates semantically coherent chunks for vector embeddings by
 * leveraging the existing document preprocessor. It preserves document structure
 * and section metadata for better retrieval quality.
 *
 * Key Features:
 * - Reuses preprocessDocumentFromPages() for section detection
 * - Preserves section names and priority for weighted retrieval
 * - Maintains page number references for accurate citations
 * - Splits large sections at paragraph boundaries
 * - Respects document type-specific section priorities (CBROP, CFSP, ADP)
 */

import {
  preprocessDocumentFromPages,
  preprocessDocument,
  type DocumentType,
  type DetectedSection,
  type SectionPriority,
} from './documentPreprocessor';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Maximum tokens per chunk for embedding
 * OpenAI text-embedding-3-small supports up to 8191 tokens
 * We use 500 as a balance between context and specificity
 */
const DEFAULT_MAX_CHUNK_TOKENS = 500;

/**
 * Minimum tokens for a chunk to be worth embedding
 */
const MIN_CHUNK_TOKENS = 50;

/**
 * Approximate characters per token (for estimation)
 */
const CHARS_PER_TOKEN = 4;

/**
 * Overlap between paragraph sub-chunks (in characters)
 * Helps maintain context continuity
 */
const PARAGRAPH_OVERLAP_CHARS = 100;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Embedding chunk with full metadata for storage and retrieval
 */
export interface EmbeddingChunk {
  /** Unique identifier pattern: `${sectionIndex}_${subchunkIndex}` */
  chunkId: string;

  /** Index within the document (for ordering) */
  chunkIndex: number;

  /** The actual text content to embed */
  content: string;

  /** Section name from TOC/header detection */
  sectionName: string;

  /** Priority level from document preprocessor */
  sectionPriority: SectionPriority;

  /** Page number(s) this chunk spans */
  pageNumbers: number[];

  /** Character offset in original document */
  startChar: number;

  /** Character offset end in original document */
  endChar: number;

  /** Estimated token count */
  tokenEstimate: number;

  /** Whether this is a sub-chunk of a larger section */
  isSubChunk: boolean;

  /** Sub-chunk index within section (0 if not a sub-chunk) */
  subChunkIndex: number;
}

/**
 * Result of chunking operation with metadata
 */
export interface ChunkingResult {
  /** Generated chunks ready for embedding */
  chunks: EmbeddingChunk[];

  /** Total sections processed */
  totalSections: number;

  /** Sections that were split into multiple chunks */
  splitSections: number;

  /** Sections that were too small and merged or skipped */
  skippedSections: number;

  /** Document type used for preprocessing */
  documentType: DocumentType | null;

  /** Whether TOC parsing was successful */
  tocParseSuccess: boolean;

  /** Original document character count */
  originalCharCount: number;

  /** Total characters in all chunks */
  chunkedCharCount: number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Estimate token count from text length
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Find paragraph boundaries in text
 * Returns array of paragraph texts
 */
function splitIntoParagraphs(text: string): string[] {
  // Split on double newlines (common paragraph separator)
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // If no paragraphs found, try single newlines
  if (paragraphs.length <= 1) {
    return text
      .split(/\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  return paragraphs;
}

/**
 * Split a large section into sub-chunks at paragraph boundaries
 * Tries to keep chunks under maxTokens while preserving semantic coherence
 */
function splitSectionByParagraphs(
  section: DetectedSection,
  maxTokens: number,
  sectionIndex: number
): EmbeddingChunk[] {
  const chunks: EmbeddingChunk[] = [];
  const paragraphs = splitIntoParagraphs(section.content);

  let currentContent = '';
  let currentStartChar = section.startIndex;
  let subChunkIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const paragraphTokens = estimateTokens(paragraph);

    // If single paragraph exceeds max, we need to split it further
    if (paragraphTokens > maxTokens) {
      // First, save any accumulated content
      if (currentContent.trim()) {
        const contentTokens = estimateTokens(currentContent);
        if (contentTokens >= MIN_CHUNK_TOKENS) {
          chunks.push({
            chunkId: `${sectionIndex}_${subChunkIndex}`,
            chunkIndex: chunks.length,
            content: currentContent.trim(),
            sectionName: section.name,
            sectionPriority: section.priority as SectionPriority,
            pageNumbers: [section.tocEntry.pageNum],
            startChar: currentStartChar,
            endChar: currentStartChar + currentContent.length,
            tokenEstimate: contentTokens,
            isSubChunk: true,
            subChunkIndex,
          });
          subChunkIndex++;
        }
        currentContent = '';
      }

      // Split large paragraph by sentences
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      let sentenceChunk = '';

      for (const sentence of sentences) {
        const combinedTokens = estimateTokens(sentenceChunk + ' ' + sentence);

        if (combinedTokens > maxTokens && sentenceChunk.trim()) {
          // Save current sentence chunk
          const chunkTokens = estimateTokens(sentenceChunk);
          if (chunkTokens >= MIN_CHUNK_TOKENS) {
            chunks.push({
              chunkId: `${sectionIndex}_${subChunkIndex}`,
              chunkIndex: chunks.length,
              content: sentenceChunk.trim(),
              sectionName: section.name,
              sectionPriority: section.priority as SectionPriority,
              pageNumbers: [section.tocEntry.pageNum],
              startChar: currentStartChar,
              endChar: currentStartChar + sentenceChunk.length,
              tokenEstimate: chunkTokens,
              isSubChunk: true,
              subChunkIndex,
            });
            subChunkIndex++;
          }
          currentStartChar += sentenceChunk.length;
          sentenceChunk = sentence;
        } else {
          sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
        }
      }

      // Handle remaining sentences
      if (sentenceChunk.trim()) {
        currentContent = sentenceChunk;
      }
    } else {
      // Check if adding this paragraph would exceed max
      const combinedTokens = estimateTokens(currentContent + '\n\n' + paragraph);

      if (combinedTokens > maxTokens && currentContent.trim()) {
        // Save current chunk and start new one
        const contentTokens = estimateTokens(currentContent);
        if (contentTokens >= MIN_CHUNK_TOKENS) {
          chunks.push({
            chunkId: `${sectionIndex}_${subChunkIndex}`,
            chunkIndex: chunks.length,
            content: currentContent.trim(),
            sectionName: section.name,
            sectionPriority: section.priority as SectionPriority,
            pageNumbers: [section.tocEntry.pageNum],
            startChar: currentStartChar,
            endChar: currentStartChar + currentContent.length,
            tokenEstimate: contentTokens,
            isSubChunk: true,
            subChunkIndex,
          });
          subChunkIndex++;
        }
        currentStartChar += currentContent.length;
        currentContent = paragraph;
      } else {
        // Add paragraph to current chunk
        currentContent += (currentContent ? '\n\n' : '') + paragraph;
      }
    }
  }

  // Don't forget the last chunk
  if (currentContent.trim()) {
    const contentTokens = estimateTokens(currentContent);
    if (contentTokens >= MIN_CHUNK_TOKENS) {
      chunks.push({
        chunkId: `${sectionIndex}_${subChunkIndex}`,
        chunkIndex: chunks.length,
        content: currentContent.trim(),
        sectionName: section.name,
        sectionPriority: section.priority as SectionPriority,
        pageNumbers: [section.tocEntry.pageNum],
        startChar: currentStartChar,
        endChar: currentStartChar + currentContent.length,
        tokenEstimate: contentTokens,
        isSubChunk: subChunkIndex > 0,
        subChunkIndex,
      });
    }
  }

  return chunks;
}

// =============================================================================
// MAIN CHUNKING FUNCTIONS
// =============================================================================

/**
 * Create embedding chunks from document pages
 *
 * This is the primary function for chunking. It uses the existing
 * document preprocessor to detect sections, then creates appropriately
 * sized chunks while preserving section metadata.
 *
 * @param pages - Array of page texts from PDF extraction
 * @param documentType - Document type (CBROP, CFSP, ADP) for priority filtering
 * @param maxChunkTokens - Maximum tokens per chunk (default: 500)
 * @returns ChunkingResult with chunks and metadata
 */
export function createEmbeddingChunksFromPages(
  pages: string[],
  documentType: DocumentType,
  maxChunkTokens: number = DEFAULT_MAX_CHUNK_TOKENS
): ChunkingResult {
  // Use existing preprocessor for section detection
  const preprocessResult = preprocessDocumentFromPages(pages, documentType);

  console.log(
    `[SectionChunker] Processing ${preprocessResult.sections.length} sections ` +
      `(TOC: ${preprocessResult.tocParseSuccess ? 'success' : 'failed'})`
  );

  const chunks: EmbeddingChunk[] = [];
  let splitSections = 0;
  let skippedSections = 0;

  for (let sectionIndex = 0; sectionIndex < preprocessResult.sections.length; sectionIndex++) {
    const section = preprocessResult.sections[sectionIndex];

    // Skip removed sections (TOC, appendices, etc.)
    if (section.priority === 'remove') {
      skippedSections++;
      continue;
    }

    const sectionTokens = estimateTokens(section.content);

    // Skip very small sections
    if (sectionTokens < MIN_CHUNK_TOKENS) {
      console.log(
        `[SectionChunker] Skipping small section "${section.name}" (${sectionTokens} tokens)`
      );
      skippedSections++;
      continue;
    }

    if (sectionTokens <= maxChunkTokens) {
      // Section fits in one chunk - embed as-is
      chunks.push({
        chunkId: `${sectionIndex}_0`,
        chunkIndex: chunks.length,
        content: section.content.trim(),
        sectionName: section.name,
        sectionPriority: section.priority as SectionPriority,
        pageNumbers: [section.tocEntry.pageNum],
        startChar: section.startIndex,
        endChar: section.endIndex,
        tokenEstimate: sectionTokens,
        isSubChunk: false,
        subChunkIndex: 0,
      });
    } else {
      // Large section - split by paragraphs
      console.log(
        `[SectionChunker] Splitting large section "${section.name}" (${sectionTokens} tokens)`
      );
      const subChunks = splitSectionByParagraphs(section, maxChunkTokens, sectionIndex);

      // Update chunk indices to be sequential
      subChunks.forEach((chunk, idx) => {
        chunk.chunkIndex = chunks.length + idx;
      });

      chunks.push(...subChunks);
      splitSections++;
    }
  }

  // Calculate total characters in chunks
  const chunkedCharCount = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0);

  console.log(
    `[SectionChunker] Created ${chunks.length} chunks from ${preprocessResult.sections.length} sections ` +
      `(${splitSections} split, ${skippedSections} skipped)`
  );

  return {
    chunks,
    totalSections: preprocessResult.sections.length,
    splitSections,
    skippedSections,
    documentType,
    tocParseSuccess: preprocessResult.tocParseSuccess,
    originalCharCount: preprocessResult.originalLength,
    chunkedCharCount,
  };
}

/**
 * Create embedding chunks from merged text (fallback)
 *
 * Use this when page-by-page text is not available.
 * Less accurate than page-based approach.
 *
 * @param text - Merged document text
 * @param documentType - Document type for priority filtering
 * @param maxChunkTokens - Maximum tokens per chunk
 * @returns ChunkingResult with chunks and metadata
 */
export function createEmbeddingChunksFromText(
  text: string,
  documentType: DocumentType,
  maxChunkTokens: number = DEFAULT_MAX_CHUNK_TOKENS
): ChunkingResult {
  // Use merged text preprocessor
  const preprocessResult = preprocessDocument(text, documentType);

  console.log(
    `[SectionChunker] Processing merged text: ${preprocessResult.sections.length} sections ` +
      `(TOC: ${preprocessResult.tocParseSuccess ? 'success' : 'failed'})`
  );

  const chunks: EmbeddingChunk[] = [];
  let splitSections = 0;
  let skippedSections = 0;

  for (let sectionIndex = 0; sectionIndex < preprocessResult.sections.length; sectionIndex++) {
    const section = preprocessResult.sections[sectionIndex];

    if (section.priority === 'remove') {
      skippedSections++;
      continue;
    }

    const sectionTokens = estimateTokens(section.content);

    if (sectionTokens < MIN_CHUNK_TOKENS) {
      skippedSections++;
      continue;
    }

    if (sectionTokens <= maxChunkTokens) {
      chunks.push({
        chunkId: `${sectionIndex}_0`,
        chunkIndex: chunks.length,
        content: section.content.trim(),
        sectionName: section.name,
        sectionPriority: section.priority as SectionPriority,
        pageNumbers: [section.tocEntry.pageNum],
        startChar: section.startIndex,
        endChar: section.endIndex,
        tokenEstimate: sectionTokens,
        isSubChunk: false,
        subChunkIndex: 0,
      });
    } else {
      const subChunks = splitSectionByParagraphs(section, maxChunkTokens, sectionIndex);
      subChunks.forEach((chunk, idx) => {
        chunk.chunkIndex = chunks.length + idx;
      });
      chunks.push(...subChunks);
      splitSections++;
    }
  }

  const chunkedCharCount = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0);

  return {
    chunks,
    totalSections: preprocessResult.sections.length,
    splitSections,
    skippedSections,
    documentType,
    tocParseSuccess: preprocessResult.tocParseSuccess,
    originalCharCount: preprocessResult.originalLength,
    chunkedCharCount,
  };
}

/**
 * Create simple chunks without document type preprocessing
 *
 * Fallback for when document type is unknown. Uses generic
 * paragraph-based chunking without section detection.
 *
 * @param text - Document text
 * @param maxChunkTokens - Maximum tokens per chunk
 * @returns ChunkingResult with chunks
 */
export function createSimpleChunks(
  text: string,
  maxChunkTokens: number = DEFAULT_MAX_CHUNK_TOKENS
): ChunkingResult {
  const paragraphs = splitIntoParagraphs(text);
  const chunks: EmbeddingChunk[] = [];

  let currentContent = '';
  let currentStartChar = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const combinedTokens = estimateTokens(currentContent + '\n\n' + paragraph);

    if (combinedTokens > maxChunkTokens && currentContent.trim()) {
      const contentTokens = estimateTokens(currentContent);
      if (contentTokens >= MIN_CHUNK_TOKENS) {
        chunks.push({
          chunkId: `simple_${chunkIndex}`,
          chunkIndex,
          content: currentContent.trim(),
          sectionName: 'Document Content',
          sectionPriority: 'medium',
          pageNumbers: [],
          startChar: currentStartChar,
          endChar: currentStartChar + currentContent.length,
          tokenEstimate: contentTokens,
          isSubChunk: false,
          subChunkIndex: 0,
        });
        chunkIndex++;
      }
      currentStartChar += currentContent.length;
      currentContent = paragraph;
    } else {
      currentContent += (currentContent ? '\n\n' : '') + paragraph;
    }
  }

  // Last chunk
  if (currentContent.trim()) {
    const contentTokens = estimateTokens(currentContent);
    if (contentTokens >= MIN_CHUNK_TOKENS) {
      chunks.push({
        chunkId: `simple_${chunkIndex}`,
        chunkIndex,
        content: currentContent.trim(),
        sectionName: 'Document Content',
        sectionPriority: 'medium',
        pageNumbers: [],
        startChar: currentStartChar,
        endChar: currentStartChar + currentContent.length,
        tokenEstimate: contentTokens,
        isSubChunk: false,
        subChunkIndex: 0,
      });
    }
  }

  return {
    chunks,
    totalSections: 1,
    splitSections: chunks.length > 1 ? 1 : 0,
    skippedSections: 0,
    documentType: null,
    tocParseSuccess: false,
    originalCharCount: text.length,
    chunkedCharCount: chunks.reduce((sum, c) => sum + c.content.length, 0),
  };
}
