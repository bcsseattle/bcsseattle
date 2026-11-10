import type * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils/cn';

/**
 * A part of the ballot this member has already submitted, with their answers.
 * The confirmation code goes in `children`: the website links to its
 * confirmation page, the app shows the code inline.
 */
export function VotedCard({
  title,
  rows,
  headingLevel: Heading = 'h2',
  className,
  children
}: {
  title: string;
  rows: (readonly [string, string])[];
  headingLevel?: 'h2' | 'h3';
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className={cn('flex flex-col gap-3 p-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading className={cn(Heading === 'h2' ? 'text-section' : 'text-item', 'text-foreground')}>{title}</Heading>
        <Badge tone="green">Submitted</Badge>
      </div>
      {rows.length > 0 && (
        <dl className="text-sm">
          {rows.map(([question, answer]) => (
            <div key={question} className="flex justify-between gap-3 border-b py-2 last:border-b-0">
              <dt className="text-muted-foreground">{question}</dt>
              <dd className="text-right font-medium text-foreground">{answer}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </Card>
  );
}
