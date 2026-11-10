'use client';

import * as React from 'react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

/**
 * Confirms an irreversible step. A bottom sheet below md (BCS/Confirm sheet
 * 23:2006: grabber, full-width Primary over a Secondary that cancels) and the
 * library Dialog (36:85) from md up. Both are one AlertDialog, so the role,
 * focus trap and Escape-to-cancel are the same at every width; clicking the
 * scrim does not dismiss it.
 */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  pending = false,
  tone = 'default',
  fields
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  confirmLabel: React.ReactNode;
  cancelLabel?: React.ReactNode;
  onConfirm: () => void;
  pending?: boolean;
  /** `destructive` draws the confirm button as the library's Destructive (danger outline), for deletions. */
  tone?: 'default' | 'destructive';
  /** Form fields shown under the description (the description itself is a paragraph). */
  fields?: React.ReactNode;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          'max-md:inset-x-0 max-md:bottom-0 max-md:left-0 max-md:top-auto max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0',
          'max-md:rounded-b-none max-md:rounded-t-lg max-md:border-x-0 max-md:border-b-0 max-md:px-4 max-md:pt-2 max-md:shadow-sm',
          'max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:data-[state=open]:slide-in-from-bottom-1/2 max-md:data-[state=closed]:slide-out-to-bottom-1/2'
        )}
      >
        <div aria-hidden className="mx-auto h-[5px] w-9 rounded-full bg-border md:hidden" />
        <AlertDialogHeader className="max-md:pt-3">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="max-md:text-muted-foreground">{children}</AlertDialogDescription>
        </AlertDialogHeader>
        {fields}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} className="max-md:h-11 max-md:border max-md:border-input max-md:bg-card">
            {cancelLabel}
          </AlertDialogCancel>
          <Button
            onClick={onConfirm}
            disabled={pending}
            variant={tone === 'destructive' ? 'destructive' : 'default'}
            className="max-md:h-11"
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
