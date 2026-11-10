import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * BCS/Review row (Figma 23:1979): one ballot question and the voter's answer,
 * or a "Skipped" badge. The action goes back to that question; its accessible
 * name includes the question ("Change President").
 */
export function ReviewRow({
  question,
  answer,
  actionLabel,
  onAction
}: {
  question: string;
  /** null when the question was skipped. */
  answer: React.ReactNode | null;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b bg-card px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="text-caption text-muted-foreground">{question}</span>
        {answer === null ? (
          <Badge tone="neutral">Skipped</Badge>
        ) : (
          <span className="text-sm font-medium text-foreground">{answer}</span>
        )}
      </div>
      {actionLabel && onAction && (
        <Button type="button" variant="link" size="sm" onClick={onAction} className="no-underline hover:underline">
          {actionLabel}
          <span className="sr-only"> {question}</span>
        </Button>
      )}
    </div>
  );
}
