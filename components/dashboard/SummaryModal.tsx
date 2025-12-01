'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

type SummaryModalProps = {
  documentId: string;
  documentTitle: string;
  initialSummary: string | null; // English summary
  swahiliSummary?: string | null; // Swahili translation
  confidence: number | null;
  translationStatus?: string;
  translationConfidence?: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (summary: string) => void;
  onRetranslate?: () => void;
};

export default function SummaryModal({
  documentId,
  documentTitle,
  initialSummary,
  swahiliSummary,
  confidence,
  translationStatus,
  translationConfidence,
  isOpen,
  onClose,
  onSave,
  onRetranslate,
}: SummaryModalProps) {
  const [summary, setSummary] = useState(initialSummary || '');
  const [language, setLanguage] = useState<'en' | 'sw'>('en');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');

  // Update summary when initialSummary changes
  useEffect(() => {
    setSummary(initialSummary || '');
  }, [initialSummary]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');

      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary_en: summary,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save summary');
      }

      // Call onSave callback if provided
      if (onSave) {
        onSave(summary);
      }

      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save summary');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTranslate = async () => {
    try {
      setIsTranslating(true);
      setError('');

      const response = await fetch(`/api/documents/${documentId}/translate`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger translation');
      }

      // Call onRetranslate callback if provided
      if (onRetranslate) {
        onRetranslate();
      }

      // Show success message
      alert('Translation queued successfully! The Swahili translation will be ready shortly.');
    } catch (err: any) {
      setError(err.message || 'Failed to trigger translation');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCancel = () => {
    setSummary(initialSummary || '');
    setIsEditing(false);
    setError('');
  };

  const handleClose = () => {
    if (isEditing) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
      handleCancel();
    }
    onClose();
  };

  const currentText = language === 'en' ? summary : (swahiliSummary || '');
  const charCount = currentText.length;
  const wordCount = currentText.trim().split(/\s+/).filter(Boolean).length;
  const currentConfidence = language === 'en' ? confidence : translationConfidence;

  const hasEnglish = !!(initialSummary && initialSummary.length > 0);
  const hasSwahili = !!(swahiliSummary && swahiliSummary.length > 0);
  const canTranslate = hasEnglish && !isEditing && translationStatus !== 'translating';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Summary</DialogTitle>
          <DialogDescription className="space-y-2">
            <div className="font-medium text-gray-900">{documentTitle}</div>
            {currentConfidence !== null && (
              <div className="text-sm text-gray-500">
                AI Confidence: {(currentConfidence * 100).toFixed(0)}%
                {currentConfidence < 0.8 && (
                  <span className="ml-2 text-xs text-orange-600">
                    (Low confidence - consider editing)
                  </span>
                )}
              </div>
            )}
            {/* Translation status badge */}
            {translationStatus && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Translation:</span>
                {translationStatus === 'completed' && (
                  <Badge variant="default" className="bg-green-600">Completed</Badge>
                )}
                {translationStatus === 'translating' && (
                  <Badge variant="default" className="bg-blue-600 animate-pulse">Translating...</Badge>
                )}
                {translationStatus === 'pending' && (
                  <Badge variant="outline">Pending</Badge>
                )}
                {translationStatus === 'failed' && (
                  <Badge variant="destructive">Failed</Badge>
                )}
                {translationStatus === 'skipped' && (
                  <Badge variant="secondary">Skipped</Badge>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Language Toggle */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
            <Button
              type="button"
              variant={language === 'en' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguage('en')}
              disabled={isEditing}
            >
              English
              {hasEnglish && <span className="ml-1">✓</span>}
            </Button>
            <Button
              type="button"
              variant={language === 'sw' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguage('sw')}
              disabled={isEditing || !hasSwahili}
            >
              Swahili
              {hasSwahili && <span className="ml-1">✓</span>}
            </Button>
            {!hasSwahili && (
              <span className="ml-2 text-xs text-gray-500">
                (No translation yet)
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="summary" className="text-sm font-medium">
                {isEditing ? 'Edit Summary' : language === 'en' ? 'English Summary' : 'Swahili Translation'}
              </Label>
              <div className="text-xs text-gray-500">
                {wordCount} words, {charCount} characters
              </div>
            </div>

            {/* English editing only (Swahili is AI-generated) */}
            {language === 'en' && isEditing ? (
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="Enter document summary..."
              />
            ) : (
              <div className="min-h-[300px] rounded-md border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed">
                {currentText || (
                  <span className="text-gray-400">
                    {language === 'en'
                      ? 'No summary available yet. Click "Edit" to add one manually.'
                      : 'No Swahili translation available yet. Click "Translate" to generate one.'}
                  </span>
                )}
              </div>
            )}
          </div>

          {!hasEnglish && !isEditing && (
            <div className="rounded-md bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                This document does not have an AI-generated summary yet. You can add one manually by clicking &quot;Edit&quot;.
              </p>
            </div>
          )}

          {language === 'sw' && !hasSwahili && hasEnglish && (
            <div className="rounded-md bg-blue-50 p-3">
              <p className="text-sm text-blue-800">
                Swahili translation not available yet. Click &quot;Translate&quot; to generate one using AI.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !summary.trim()}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                Close
              </Button>
              {/* Only allow editing English summary */}
              {language === 'en' && (
                <Button type="button" onClick={() => setIsEditing(true)}>
                  Edit Summary
                </Button>
              )}
              {/* Translation controls */}
              {canTranslate && (
                <Button
                  type="button"
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  variant={hasSwahili ? 'outline' : 'default'}
                >
                  {isTranslating ? 'Translating...' : hasSwahili ? 'Re-translate' : 'Translate to Swahili'}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
