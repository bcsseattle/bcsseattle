import * as React from 'react';

import { BackLink } from '@/components/ui/breadcrumb';

/**
 * The portal page heading (Figma 7:652, 11:977, 11:1188): an optional back
 * link, a Title/Screen h1, a muted subtitle and optional actions at the right.
 */
export function PageHeader({
  title,
  description,
  back,
  badge,
  actions
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  /** A status badge with its word, shown above the title. */
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      {back && <BackLink href={back.href}>{back.label}</BackLink>}
      {badge && <div className="mb-1 flex">{badge}</div>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-screen text-foreground">{title}</h1>
        {actions}
      </div>
      {description && <p className="mt-0 max-w-3xl text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
