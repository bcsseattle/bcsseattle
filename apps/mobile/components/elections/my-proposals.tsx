'use client';

import { useState } from 'react';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { supabase } from '~/lib/supabase';
import type { ElectionData } from './election';

type Proposal = ElectionData['myProposals'][number];

/**
 * The member's initiative proposals in this election (A10), as on the website:
 * waiting for review, on the ballot, or not approved and why; withdrawable
 * until the ballot is locked. Editing one is on the website.
 */
export function MyProposals({ d, reload }: { d: ElectionData; reload: () => Promise<void> }) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<Proposal>();
  const open = d.election.status === 'draft' || d.election.status === 'scheduled';
  if (!open || d.myProposals.length === 0) return null;

  async function withdraw(p: Proposal) {
    setPending(true);
    setError(undefined);
    const { error } = await supabase.rpc('initiative_proposal_withdraw', { p_proposal: p.id });
    setPending(false);
    if (error) return setError(error.message);
    setConfirm(undefined);
    await reload();
  }

  return (
    <>
      {d.myProposals.map((p) => (
        <Banner
          key={p.id}
          tone={p.status === 'rejected' ? 'attention' : p.status === 'approved' ? 'success' : 'info'}
          title={
            p.status === 'approved'
              ? 'Your initiative is on the ballot'
              : p.status === 'submitted'
                ? 'Your initiative is waiting for review'
                : 'Your initiative wasn’t approved'
          }
          action={
            p.status !== 'rejected' && (
              <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setConfirm(p)}>
                Withdraw<span className="sr-only">: {p.title}</span>
              </Button>
            )
          }
        >
          {p.status === 'rejected' ? `“${p.title}”: ${p.rejection_reason}` : `“${p.title}”`}
        </Banner>
      ))}
      {error && (
        <Banner tone="error" title="That didn’t work">
          {error}
        </Banner>
      )}
      <ConfirmSheet
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(undefined)}
        title="Withdraw this proposal?"
        confirmLabel={pending ? 'Withdrawing…' : 'Withdraw proposal'}
        tone="destructive"
        pending={pending}
        onConfirm={() => confirm && withdraw(confirm)}
      >
        {confirm?.status === 'approved'
          ? 'The question comes off the ballot. You can propose it again while nominations are open.'
          : 'The admins won’t review it. You can propose it again while nominations are open.'}
      </ConfirmSheet>
    </>
  );
}
