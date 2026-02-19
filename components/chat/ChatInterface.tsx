'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatSources } from './ChatSources';
import { ChatWelcome } from './ChatWelcome';
import { MessageSquare, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import type { ChatMessage as ChatMessageType, ChatSource } from '@/types';

// Generate a UUID using crypto.randomUUID() with fallback
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface ChatInterfaceProps {
  documentId: string;
  documentTitle: string;
  documentType?: string;
  /** When provided, the internal trigger button is hidden and this controls the sheet */
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
}

interface ChatStatus {
  chatEnabled: boolean;
  embeddingStatus: string;
  chunkCount?: number;
  error?: string;
}

/**
 * ChatInterface component
 *
 * Main chat interface that combines all chat components.
 * Handles state management, API calls, and session tracking.
 */
export function ChatInterface({
  documentId,
  documentTitle,
  documentType,
  externalOpen,
  onExternalOpenChange,
}: ChatInterfaceProps) {
  const { t } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (v: boolean) => {
    if (onExternalOpenChange) onExternalOpenChange(v);
    else setInternalOpen(v);
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatStatus, setChatStatus] = useState<ChatStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>('');

  // Initialize session ID
  useEffect(() => {
    // Check sessionStorage for existing session
    const storageKey = `chat-session-${documentId}`;
    const existingSessionId = sessionStorage.getItem(storageKey);

    if (existingSessionId) {
      sessionIdRef.current = existingSessionId;
    } else {
      const newSessionId = generateId();
      sessionStorage.setItem(storageKey, newSessionId);
      sessionIdRef.current = newSessionId;
    }
  }, [documentId]);

  // Check chat status when component mounts or sheet opens
  const checkChatStatus = useCallback(async () => {
    setIsCheckingStatus(true);
    try {
      const response = await fetch(`/api/public/documents/${documentId}/chat/status`);
      const data = await response.json();
      setChatStatus(data);
    } catch (err) {
      console.error('Failed to check chat status:', err);
      setChatStatus({
        chatEnabled: false,
        embeddingStatus: 'error',
        error: t('chat.statusError'),
      });
    } finally {
      setIsCheckingStatus(false);
    }
  }, [documentId, t]);

  useEffect(() => {
    if (isOpen) {
      checkChatStatus();
    }
  }, [isOpen, checkChatStatus]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build conversation history for API
  const buildConversationHistory = (): ChatMessageType[] => {
    // Take last 6 messages (3 turns)
    return messages.slice(-6).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  };

  // Send message to API
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/public/documents/${documentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          sessionId: sessionIdRef.current,
          conversationHistory: buildConversationHistory(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('chat.sendError'));
      }

      const data = await response.json();

      // Add assistant message
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.message,
        sources: data.sources,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : t('chat.sendError'));

      // Remove the user message if the request failed
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  // Render chat content based on status
  const renderChatContent = () => {
    if (isCheckingStatus) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <p className="text-sm">{t('chat.checkingStatus')}</p>
        </div>
      );
    }

    if (!chatStatus?.chatEnabled) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">{t('chat.notAvailable')}</h3>
          <p className="text-sm text-muted-foreground">
            {chatStatus?.embeddingStatus === 'processing'
              ? t('chat.processingEmbeddings')
              : chatStatus?.embeddingStatus === 'failed'
                ? t('chat.embeddingsFailed')
                : t('chat.notAvailableDescription')}
          </p>
        </div>
      );
    }

    return (
      <>
        {/* AI Disclaimer */}
        <div className="flex items-start gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-muted-foreground leading-snug">
            <span className="font-semibold text-foreground">{t('chat.disclaimerTitle')}: </span>
            {t('chat.disclaimer')}
          </p>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <ChatWelcome
              documentTitle={documentTitle}
              documentType={documentType}
            />
          ) : (
            <>
              {messages.map((message) => (
                <div key={message.id}>
                  <ChatMessage
                    role={message.role}
                    content={message.content}
                  />
                  {message.sources && message.sources.length > 0 && (
                    <div className="ml-11 mt-1">
                      <ChatSources sources={message.sources} />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <ChatMessage role="assistant" content="" isLoading />
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Input area */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={isLoading}
          placeholder={t('chat.inputPlaceholder')}
        />
      </>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* Only render the internal trigger when not externally controlled (e.g. desktop) */}
      {externalOpen === undefined && (
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            {t('chat.askQuestion')}
          </Button>
        </SheetTrigger>
      )}
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0"
      >
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" aria-hidden="true" />
            {t('chat.title')}
          </SheetTitle>
        </SheetHeader>

        {renderChatContent()}
      </SheetContent>

    </Sheet>
  );
}
