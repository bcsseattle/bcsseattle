'use client';

import type { ReactNode } from 'react';
import { CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loading, SkeletonRows } from '@/components/ui/skeleton';
import { StatePanel } from '@/components/ui/state-panel';
import { ListGroup } from '@/components/portal/list-row';
import { AppHeader } from '~/components/app-header';
import type { DataState } from '~/lib/use-data';

/** A pushed screen: the inline header with Back, then padded content. */
export function Screen({
  title,
  back = {},
  action,
  children
}: {
  title: string;
  back?: { label?: string; href?: string };
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <AppHeader title={title} back={back} action={action} />
      <div className="flex flex-col gap-6 px-4 py-4 pb-8">{children}</div>
    </>
  );
}

/** A labelled group of rows, as in the Account mock (Label/Overline over a ListGroup). */
export function Section({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      {label && <h2 className="px-1 text-overline uppercase text-muted-foreground">{label}</h2>}
      {children}
    </section>
  );
}

/**
 * Shows loaded data, or a skeleton while the first load runs, or the error
 * with Try again. Data already shown stays up while it reloads on resume.
 */
export function Loaded<T>({
  state,
  children,
  skeleton
}: {
  state: DataState<T>;
  children: (data: T) => ReactNode;
  skeleton?: ReactNode;
}) {
  if (state.data !== undefined) return <>{children(state.data)}</>;
  if (state.error) {
    return (
      <StatePanel
        icon={CloudOff}
        title="This didn’t load"
        action={
          <Button variant="outline" size="lg" onClick={state.reload}>
            Try again
          </Button>
        }
      >
        {state.error}
      </StatePanel>
    );
  }
  return (
    <Loading>
      {skeleton ?? (
        <ListGroup>
          <SkeletonRows count={4} />
        </ListGroup>
      )}
    </Loading>
  );
}

/** A ListRow-shaped button, for rows that act rather than navigate (open Safari, sign out). */
export function RowButton({
  label,
  value,
  icon: Icon,
  onClick,
  tone
}: {
  label: ReactNode;
  value?: ReactNode;
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  onClick: () => void;
  tone?: 'destructive';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-13 w-full items-center gap-3 border-b pl-4 pr-3 text-left last:border-b-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {Icon && <Icon aria-hidden className={tone ? 'size-4 shrink-0 text-destructive' : 'size-4 shrink-0'} />}
      <span className={`min-w-0 flex-1 truncate text-sm ${tone ? 'text-destructive' : 'text-foreground'}`}>{label}</span>
      {value && <span className="shrink-0 text-sm text-muted-foreground">{value}</span>}
    </button>
  );
}
