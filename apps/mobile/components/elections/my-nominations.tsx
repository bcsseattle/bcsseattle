'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Banner } from '@/components/ui/banner';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { api } from '~/lib/api';
import type { ElectionData } from './election';

type Nomination = ElectionData['myNominations'][number];

/**
 * The member's nominations in this election, as on the website: answer one
 * made for them, see one waiting for review or turned down, and withdraw
 * until the ballot is locked. Actions go to /api/app/nominations/[id].
 */
export function MyNominations({ d, reload }: { d: ElectionData; reload: () => Promise<void> }) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<string>();
  const [confirm, setConfirm] = useState<Nomination>();
  const open = d.election.status === 'draft' || d.election.status === 'scheduled';

  async function act(n: Nomination, action: 'decline' | 'withdraw') {
    const form = new FormData();
    form.set('action', action);
    setPending(n.id);
    setError(undefined);
    try {
      await api(`/api/app/nominations/${n.id}`, { form });
      setConfirm(undefined);
      await reload();
    } catch (e) {
      setError(e instanceof TypeError ? 'Something went wrong. Check your connection and try again.' : (e as Error).message);
    } finally {
      setPending(undefined);
    }
  }

  const shown = d.myNominations.filter(
    (n) =>
      (n.status === 'awaiting_acceptance' && open) ||
      n.status === 'submitted' ||
      n.status === 'approved' ||
      (n.status === 'rejected' && open)
  );
  // Elections set up before nominations were reviewed have a candidate only.
  if (shown.length === 0 && d.myCandidacy)
    return (
      <Banner tone="success" title={`You’re on the ballot for ${d.myCandidacy.position}`}>
        To change or withdraw, contact the election administrator.
      </Banner>
    );

  return (
    <>
      {shown.map((n) => {
        const withdraw = open && n.status !== 'rejected' && (
          <Button type="button" variant="outline" size="sm" disabled={!!pending} onClick={() => setConfirm(n)}>
            Withdraw
          </Button>
        );
        if (n.status === 'awaiting_acceptance')
          return (
            <Banner
              key={n.id}
              tone="attention"
              title={`You’ve been nominated for ${n.position}`}
              action={
                <div className="flex flex-col gap-2">
                  {d.phase.nominationsOpen && (
                    <Link href={`/elections/nominate/?id=${d.election.id}&nomination=${n.id}`} className={buttonVariants({ size: 'sm' })}>
                      Accept
                    </Link>
                  )}
                  <Button type="button" variant="outline" size="sm" disabled={!!pending} onClick={() => act(n, 'decline')}>
                    {pending === n.id ? 'Declining…' : 'Decline'}
                  </Button>
                </div>
              }
            >
              {d.phase.nominationsOpen ? 'Accept to stand, or decline.' : 'Nominations have closed, so you can only decline.'}
            </Banner>
          );
        if (n.status === 'rejected')
          return (
            <Banner key={n.id} tone="attention" title={`Your nomination for ${n.position} wasn’t approved`}>
              {n.rejection_reason}
            </Banner>
          );
        return (
          <Banner
            key={n.id}
            tone={n.status === 'approved' ? 'success' : 'info'}
            title={n.status === 'approved' ? `You’re on the ballot for ${n.position}` : `Your nomination for ${n.position} is waiting for review`}
            action={withdraw}
          >
            {open ? 'You can change your details on the website until the ballot is locked.' : 'The ballot is locked.'}
          </Banner>
        );
      })}
      {error && (
        <Banner tone="error" title="That didn’t work">
          {error}
        </Banner>
      )}
      <ConfirmSheet
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(undefined)}
        title="Withdraw your nomination?"
        confirmLabel={pending ? 'Withdrawing…' : 'Withdraw nomination'}
        tone="destructive"
        pending={!!pending}
        onConfirm={() => confirm && act(confirm, 'withdraw')}
      >
        {confirm?.status === 'approved'
          ? 'You’ll be taken off the ballot. You can be nominated again while nominations are open.'
          : 'Your nomination is withdrawn. You can be nominated again while nominations are open.'}
      </ConfirmSheet>
    </>
  );
}
