/**
 * GET /api/public/documents/[id]/chat/status
 *
 * Check if chat is available for a document.
 * Returns embedding status and chunk count.
 *
 * No authentication required - designed for public users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isChatEnabled } from '@/lib/services/ragService';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET handler for chat status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: documentId } = await params;

  try {
    const status = await isChatEnabled(documentId);

    return NextResponse.json({
      chatEnabled: status.chatEnabled,
      embeddingStatus: status.embeddingStatus,
      chunkCount: status.chunkCount,
      error: status.error,
    });
  } catch (error) {
    console.error('[ChatStatus] Error checking status:', error);

    return NextResponse.json(
      {
        chatEnabled: false,
        embeddingStatus: 'unknown',
        error: 'Failed to check chat status',
      },
      { status: 500 }
    );
  }
}
