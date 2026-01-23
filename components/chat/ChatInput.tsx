'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * ChatInput component
 *
 * Input field with send button for chat messages.
 * Supports multi-line input with auto-resize and keyboard shortcuts.
 */
export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const { t } = useLanguage();
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t bg-background">
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || t('chat.inputPlaceholder')}
        disabled={disabled}
        rows={1}
        className="min-h-[40px] max-h-[120px] resize-none"
        aria-label={t('chat.inputLabel')}
      />
      <Button
        type="button"
        size="icon"
        onClick={handleSubmit}
        disabled={disabled || !message.trim()}
        aria-label={t('chat.send')}
      >
        <Send className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
