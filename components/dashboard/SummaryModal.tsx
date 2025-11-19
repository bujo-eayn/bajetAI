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

type SummaryModalProps = {
  documentId: string;
  documentTitle: string;
  initialSummary: string | null;
  confidence: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (summary: string) => void;
};

export default function SummaryModal({
  documentId,
  documentTitle,
  initialSummary,
  confidence,
  isOpen,
  onClose,
  onSave,
}: SummaryModalProps) {
  const [summary, setSummary] = useState(initialSummary || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  const charCount = summary.length;
  const wordCount = summary.trim().split(/\s+/).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Summary</DialogTitle>
          <DialogDescription className="space-y-1">
            <div className="font-medium text-gray-900">{documentTitle}</div>
            {confidence !== null && (
              <div className="text-sm text-gray-500">
                AI Confidence: {(confidence * 100).toFixed(0)}%
                {confidence < 0.8 && (
                  <span className="ml-2 text-xs text-orange-600">
                    (Low confidence - consider editing)
                  </span>
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="summary" className="text-sm font-medium">
                {isEditing ? 'Edit Summary' : 'Summary'}
              </Label>
              <div className="text-xs text-gray-500">
                {wordCount} words, {charCount} characters
              </div>
            </div>

            {isEditing ? (
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="Enter document summary..."
              />
            ) : (
              <div className="min-h-[300px] rounded-md border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed">
                {summary || (
                  <span className="text-gray-400">
                    No summary available yet. Click &quot;Edit&quot; to add one manually.
                  </span>
                )}
              </div>
            )}
          </div>

          {!initialSummary && !isEditing && (
            <div className="rounded-md bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                This document does not have an AI-generated summary yet. You can add one manually by clicking &quot;Edit&quot;.
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
              <Button type="button" onClick={() => setIsEditing(true)}>
                Edit Summary
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
