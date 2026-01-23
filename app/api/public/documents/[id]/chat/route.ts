/**
 * POST /api/public/documents/[id]/chat
 *
 * Public chat endpoint for RAG-powered document Q&A.
 * No authentication required - designed for public users.
 *
 * Features:
 * - Language detection (English/Swahili)
 * - Vector similarity search
 * - GPT-4o-mini response generation
 * - Source citations
 * - Analytics tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  generateRAGResponse,
  isChatEnabled,
  updateChatAnalytics,
} from '@/lib/services/ragService';
import type { ChatRequest, ChatResponse } from '@/types';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * POST handler for chat messages
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: documentId } = await params;

  try {
    // Parse request body
    let body: ChatRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { message, sessionId, conversationHistory } = body;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 2000 characters.' },
        { status: 400 }
      );
    }

    // Check if chat is enabled for this document
    const chatStatus = await isChatEnabled(documentId);

    if (!chatStatus.chatEnabled) {
      const statusMessage =
        chatStatus.embeddingStatus === 'processing'
          ? 'Chat is being prepared for this document. Please try again shortly.'
          : chatStatus.embeddingStatus === 'failed'
            ? 'Chat is not available for this document due to a processing error.'
            : 'Chat is not yet available for this document.';

      return NextResponse.json(
        {
          error: statusMessage,
          status: chatStatus.embeddingStatus,
        },
        { status: 503 }
      );
    }

    // Fetch document details for context
    const supabase = createAdminClient();
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, document_type, status')
      .eq('id', documentId)
      .eq('status', 'published')
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or not published' },
        { status: 404 }
      );
    }

    // Generate RAG response
    const response: ChatResponse = await generateRAGResponse(
      documentId,
      document.title,
      document.document_type || undefined,
      message,
      conversationHistory
    );

    // Update analytics (fire and forget)
    updateChatAnalytics(documentId, sessionId, response.language).catch((err) => {
      console.warn('[Chat] Analytics update failed:', err);
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Chat] Error processing request:', error);

    // Check for specific error types
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again in a moment.' },
        { status: 429 }
      );
    }

    if (errorMessage.includes('API key')) {
      return NextResponse.json(
        { error: 'Chat service is not configured properly.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process your question. Please try again.' },
      { status: 500 }
    );
  }
}
