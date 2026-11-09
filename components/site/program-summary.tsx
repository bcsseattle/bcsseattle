import * as React from 'react';
import { type LucideIcon } from 'lucide-react';

/**
 * BCS/Program summary (Figma 2:201): an icon and a short muted description,
 * the content of a Home programs Card.
 */
export function ProgramSummary({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <Icon aria-hidden className="size-4 text-foreground" />
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
