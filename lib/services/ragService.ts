/**
 * RAG Service
 *
 * Retrieval-Augmented Generation service for document-scoped chat.
 * Combines vector similarity search with GPT-4o-mini for contextual responses.
 *
 * Features:
 * - Vector similarity search using pgvector
 * - Section priority weighting for better retrieval
 * - Language detection and translation integration
 * - Source citation generation
 * - Out-of-context handling
 */

import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase/server';
import { generateQueryEmbedding } from './embeddingService';
import { detectLanguage } from './languageDetection';
import { translateSwahiliToEnglish, translateEnglishToSwahili } from './translationService';
import type {
  DetectedLanguage,
  ChatMessage,
  ChatSource,
  ChatResponse,
  EmbeddingSearchResult,
} from '@/types';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Number of chunks to retrieve for context
 */
const TOP_K_CHUNKS = 5;

/**
 * Minimum similarity threshold for retrieval
 * Note: Lower threshold (0.5) to catch more loosely related content
 * OpenAI embeddings typically need lower thresholds than other models
 */
const SIMILARITY_THRESHOLD = 0.5;

/**
 * Maximum tokens for response
 */
const MAX_RESPONSE_TOKENS = 1000;

/**
 * Model for chat completion
 */
const CHAT_MODEL = 'gpt-4o-mini';

/**
 * Temperature for response generation
 */
const TEMPERATURE = 0.7;

/**
 * Maximum conversation history to include
 */
const MAX_HISTORY_TURNS = 3;

// =============================================================================
// CLIENT INITIALIZATION
// =============================================================================

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    openaiClient = new OpenAI({
      apiKey,
      timeout: 60000,
    });
  }

  return openaiClient;
}

// =============================================================================
// VECTOR SEARCH
// =============================================================================

/**
 * Search for relevant chunks using vector similarity
 */
async function searchRelevantChunks(
  documentId: string,
  queryEmbedding: number[],
  topK: number = TOP_K_CHUNKS
): Promise<EmbeddingSearchResult[]> {
  const supabase = createAdminClient();

  // Use the match_document_embeddings function
  const { data, error } = await supabase.rpc('match_document_embeddings', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    target_document_id: documentId,
    match_threshold: SIMILARITY_THRESHOLD,
    match_count: topK,
  });

  if (error) {
    console.error('[RAG] Vector search failed:', error);
    throw new Error(`Vector search failed: ${error.message}`);
  }

  console.log(`[RAG] Found ${data?.length || 0} relevant chunks`);

  return (data || []).map((row: {
    id: string;
    chunk_index: number;
    chunk_text: string;
    section_name: string | null;
    section_priority: string | null;
    page_number: number | null;
    similarity: number;
  }) => ({
    id: row.id,
    chunkIndex: row.chunk_index,
    chunkText: row.chunk_text,
    sectionName: row.section_name,
    sectionPriority: row.section_priority,
    pageNumber: row.page_number,
    similarity: row.similarity,
  }));
}

/**
 * Weight and rerank results based on section priority
 */
function rerankByPriority(results: EmbeddingSearchResult[]): EmbeddingSearchResult[] {
  const priorityBoost: Record<string, number> = {
    critical: 0.1,
    high: 0.05,
    medium: 0,
    low: -0.05,
  };

  return results
    .map((result) => ({
      ...result,
      similarity:
        result.similarity + (priorityBoost[result.sectionPriority || 'medium'] || 0),
    }))
    .sort((a, b) => b.similarity - a.similarity);
}

// =============================================================================
// PROMPT BUILDING
// =============================================================================

/**
 * Build system prompt for RAG
 */
function buildSystemPrompt(documentTitle: string, documentType?: string): string {
  const typeInfo = documentType ? ` (${documentType})` : '';

  return `You are a helpful assistant that answers questions about the document "${documentTitle}"${typeInfo}.

IMPORTANT INSTRUCTIONS:
1. ONLY use information from the provided context to answer questions
2. If the question cannot be answered from the context, say so clearly
3. Be specific and cite page numbers when available
4. Keep responses concise but comprehensive
5. If asked about topics not in the document, explain that the information is not available in this specific document
6. Maintain a professional, informative tone appropriate for budget/government documents
7. When citing figures or statistics, be precise

If you cannot find relevant information in the context, respond with something like:
"I couldn't find information about that topic in this document. This document focuses on [relevant topics from context]. Would you like to ask something else about this document?"`;
}

/**
 * Build context from retrieved chunks
 */
function buildContext(chunks: EmbeddingSearchResult[]): string {
  if (chunks.length === 0) {
    return 'No relevant context found.';
  }

  return chunks
    .map((chunk, idx) => {
      const pageInfo = chunk.pageNumber ? ` (Page ${chunk.pageNumber})` : '';
      const sectionInfo = chunk.sectionName ? `[${chunk.sectionName}]` : '';

      return `--- Context ${idx + 1}${pageInfo} ${sectionInfo} ---\n${chunk.chunkText}`;
    })
    .join('\n\n');
}

/**
 * Build conversation messages for API
 */
function buildMessages(
  systemPrompt: string,
  context: string,
  query: string,
  conversationHistory?: ChatMessage[]
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add limited conversation history
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-MAX_HISTORY_TURNS * 2);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Add current query with context
  messages.push({
    role: 'user',
    content: `Context from document:\n${context}\n\n---\n\nQuestion: ${query}`,
  });

  return messages;
}

// =============================================================================
// SOURCE GENERATION
// =============================================================================

/**
 * Generate source citations from retrieved chunks
 */
function generateSources(chunks: EmbeddingSearchResult[]): ChatSource[] {
  return chunks.map((chunk) => ({
    chunkIndex: chunk.chunkIndex,
    pageNumber: chunk.pageNumber,
    sectionName: chunk.sectionName,
    preview: chunk.chunkText.substring(0, 150) + (chunk.chunkText.length > 150 ? '...' : ''),
    relevanceScore: chunk.similarity,
  }));
}

// =============================================================================
// MAIN RAG FUNCTION
// =============================================================================

/**
 * Generate a response using RAG
 *
 * @param documentId - ID of the document to query
 * @param documentTitle - Title for context
 * @param documentType - Optional document type (CBROP, CFSP, ADP)
 * @param query - User's question
 * @param conversationHistory - Optional previous messages
 * @returns ChatResponse with answer and sources
 */
export async function generateRAGResponse(
  documentId: string,
  documentTitle: string,
  documentType: string | undefined,
  query: string,
  conversationHistory?: ChatMessage[]
): Promise<ChatResponse> {
  const startTime = Date.now();

  console.log(`[RAG] Processing query for document ${documentId}: "${query.substring(0, 50)}..."`);

  // Step 1: Detect language
  const detectedLanguage = detectLanguage(query);
  console.log(`[RAG] Detected language: ${detectedLanguage}`);

  // Step 2: Translate to English if Swahili
  let englishQuery = query;
  if (detectedLanguage === 'sw') {
    try {
      const translationResult = await translateSwahiliToEnglish(query);
      englishQuery = translationResult.translatedText;
      console.log(`[RAG] Translated query: "${englishQuery.substring(0, 50)}..."`);
    } catch (error) {
      console.error('[RAG] Translation failed, using original query:', error);
      // Continue with original query
    }
  }

  // Step 3: Generate query embedding
  const queryEmbedding = await generateQueryEmbedding(englishQuery);

  // Step 4: Search for relevant chunks
  let relevantChunks = await searchRelevantChunks(documentId, queryEmbedding, TOP_K_CHUNKS);

  // Step 5: Rerank by section priority
  relevantChunks = rerankByPriority(relevantChunks);

  // Step 6: Build prompt and context
  const systemPrompt = buildSystemPrompt(documentTitle, documentType);
  const context = buildContext(relevantChunks);
  const messages = buildMessages(systemPrompt, context, englishQuery, conversationHistory);

  // Step 7: Generate response
  const client = getClient();

  const completion = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: TEMPERATURE,
    max_tokens: MAX_RESPONSE_TOKENS,
  });

  let responseText = completion.choices[0]?.message?.content?.trim() || '';

  if (!responseText) {
    responseText = 'I apologize, but I was unable to generate a response. Please try rephrasing your question.';
  }

  // Step 8: Translate response back to Swahili if original was Swahili
  let finalResponse = responseText;
  if (detectedLanguage === 'sw') {
    try {
      const translationResult = await translateEnglishToSwahili(responseText);
      finalResponse = translationResult.translatedText;
      console.log(`[RAG] Translated response to Swahili`);
    } catch (error) {
      console.error('[RAG] Response translation failed:', error);
      // Return English response with a note
      finalResponse = `${responseText}\n\n(Note: Translation to Swahili was not available)`;
    }
  }

  const latencyMs = Date.now() - startTime;
  const tokensUsed = completion.usage?.total_tokens || 0;

  console.log(
    `[RAG] Response generated in ${latencyMs}ms (${tokensUsed} tokens, ${relevantChunks.length} sources)`
  );

  return {
    message: finalResponse,
    language: detectedLanguage,
    sources: generateSources(relevantChunks),
    metadata: {
      tokensUsed,
      latencyMs,
      model: CHAT_MODEL,
    },
  };
}

/**
 * Check if a document has chat enabled
 */
export async function isChatEnabled(documentId: string): Promise<{
  chatEnabled: boolean;
  embeddingStatus: string;
  chunkCount?: number;
  error?: string;
}> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('documents')
    .select('chat_enabled, embedding_status, embedding_chunk_count, embedding_error')
    .eq('id', documentId)
    .single();

  if (error || !data) {
    return {
      chatEnabled: false,
      embeddingStatus: 'unknown',
      error: 'Document not found',
    };
  }

  return {
    chatEnabled: data.chat_enabled || false,
    embeddingStatus: data.embedding_status || 'pending',
    chunkCount: data.embedding_chunk_count || undefined,
    error: data.embedding_error || undefined,
  };
}

/**
 * Update chat analytics
 */
export async function updateChatAnalytics(
  documentId: string,
  sessionId: string,
  language: DetectedLanguage
): Promise<void> {
  const supabase = createAdminClient();

  // Upsert analytics record
  const { error } = await supabase.rpc('increment_chat_query_count', {
    doc_id: documentId,
  });

  if (error) {
    console.warn('[RAG] Failed to update chat query count:', error);
  }

  // Upsert session analytics
  const now = new Date().toISOString();

  // Try to update existing session
  const { data: existing } = await supabase
    .from('chat_analytics')
    .select('id, query_count')
    .eq('document_id', documentId)
    .eq('session_id', sessionId)
    .single();

  if (existing) {
    // Update existing session
    await supabase
      .from('chat_analytics')
      .update({
        query_count: (existing.query_count || 0) + 1,
        last_query_at: now,
        detected_language: language,
      })
      .eq('id', existing.id);
  } else {
    // Create new session record
    await supabase.from('chat_analytics').insert({
      document_id: documentId,
      session_id: sessionId,
      query_count: 1,
      detected_language: language,
      first_query_at: now,
      last_query_at: now,
    });
  }
}
