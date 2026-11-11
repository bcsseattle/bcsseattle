'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ActionBar } from '@/components/ui/action-bar';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { StatePanel } from '@/components/ui/state-panel';
import { Textarea } from '@/components/ui/textarea';
import { AppHeader } from '~/components/app-header';
import { Loaded } from '~/components/screen';
import { loadElection, type ElectionData } from '~/components/elections/election';
import { api, must } from '~/lib/api';
import { supabase } from '~/lib/supabase';
import { useSession } from '~/lib/session';
import { useData } from '~/lib/use-data';

type Nominee = { user_id: string; full_name: string };

/**
 * Nominate another approved member (the website's "Another member"). They see
 * it under My nominations and accept or decline. Posted to
 * /api/app/elections/[id]/nominate with a nominee, which also tells them.
 */
export default function NominateMemberFlow() {
  const id = useSearchParams().get('id') ?? '';
  const userId = useSession().session!.user.id;
  const state = useData(async () => {
    const [d, members] = await Promise.all([
      loadElection(id, userId),
      must(supabase.rpc('election_nominees', { p_election: id }))
    ]);
    return { d, members: ((members ?? []) as Nominee[]).filter((m) => m.user_id !== userId) };
  }, [id, userId]);
  return (
    <>
      <AppHeader title="Nominate a member" back={{}} />
      <Loaded state={state}>
        {({ d, members }) =>
          !d.phase.nominationsOpen || !d.hasPositions ? (
            <StatePanel title="Nominations are not open">Nominations are not open for this election.</StatePanel>
          ) : (
            <Form d={d} members={members} />
          )
        }
      </Loaded>
    </>
  );
}

function Form({ d, members }: { d: ElectionData; members: Nominee[] }) {
  const router = useRouter();
  const ids = { position: useId(), member: useId(), message: useId() };
  const [position, setPosition] = useState(d.positions[0]?.position ?? '');
  const [member, setMember] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const select =
    'h-11 rounded-md border border-input bg-card px-3 text-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!member) return setError('Choose the member you’re nominating.');
    const body = new FormData();
    body.set('position', position);
    body.set('nominee', member);
    const message = String(new FormData(event.currentTarget).get('message') ?? '').trim();
    if (message) body.set('message', message);
    setError(undefined);
    setPending(true);
    try {
      await api(`/api/app/elections/${d.election.id}/nominate`, { form: body });
      router.replace(`/elections/view/?id=${d.election.id}`);
    } catch (e) {
      setError(e instanceof TypeError ? 'Something went wrong. Check your connection and try again.' : (e as Error).message);
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-1 flex-col gap-5 px-4 pt-4">
      <p className="text-body text-muted-foreground">
        Nominate another approved member in {d.election.title}. They’ll see it under My nominations and can accept or
        decline.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.position}>Position</Label>
        <select id={ids.position} value={position} onChange={(e) => setPosition(e.target.value)} className={select}>
          {d.positions.map((p) => (
            <option key={p.position} value={p.position}>
              {p.position}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.member}>Member</Label>
        <select id={ids.member} value={member} onChange={(e) => setMember(e.target.value)} className={select}>
          <option value="" disabled>
            Choose a member
          </option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name}
            </option>
          ))}
        </select>
        <p className="text-caption text-muted-foreground">Approved members with an active membership.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.message}>
          Note to them <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea id={ids.message} name="message" rows={3} placeholder="Why you think they’d be good" />
      </div>
      {error && (
        <Banner tone="error" title="Your nomination was not sent">
          {error}
        </Banner>
      )}
      <div className="flex-1" />
      <ActionBar>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Sending…' : 'Send nomination'}
        </Button>
      </ActionBar>
    </form>
  );
}
