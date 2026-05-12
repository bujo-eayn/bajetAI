'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mic, MicOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const { t } = useLanguage();
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US'; // Change if needed
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setMessage(transcript);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage('');
      textareaRef.current && (textareaRef.current.style.height = 'auto');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
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
      />

      {/* 🎤 Mic Button */}
      <Button
        type="button"
        size="icon"
        variant={isListening ? 'destructive' : 'outline'}
        onClick={toggleListening}
        disabled={disabled}
        aria-label="Toggle microphone"
      >
        {isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {/* Send Button */}
      <Button
        type="button"
        size="icon"
        onClick={handleSubmit}
        disabled={disabled || !message.trim()}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}