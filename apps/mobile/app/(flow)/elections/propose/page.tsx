'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ActionBar } from '@/components/ui/action-bar';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatePanel } from '@/components/ui/state-panel';
import { Textarea } from '@/components/ui/textarea';
import { formatDeadline } from '@/utils/format';
import { SAMPLE_INITIATIVES } from '@/utils/elections/sample-initiatives';
import { AppHeader } from '~/components/app-header';
import { Loaded } from '~/components/screen';
import { loadElection, type ElectionData } from '~/components/elections/election';
import { supabase } from '~/lib/supabase';
import { useSession } from '~/lib/session';
import { useData } from '~/lib/use-data';

/** The most proposals one member can have active in an election (B20). */
const LIMIT = 3;

/**
 * Propose an initiative question (A10), as on the website: one yes-or-no
 * question and what it changes, starting from a sample if you like. It calls
 * initiative_propose with the member's own session; the database checks the
 * window, eligibility and the limit of 3.
 */
export default function ProposeFlow() {
  const id = useSearchParams().get('id') ?? '';
  const userId = useSession().session!.user.id;
  const state = useData(() => loadElection(id, userId), [id, userId]);
  return (
    <>
      <AppHeader title="Propose an initiative" back={{}} />
      <Loaded state={state}>
        {(d) =>
          !d.phase.nominationsOpen ? (
            <StatePanel title="Proposals aren’t open">Proposals for this election aren’t open right now.</StatePanel>
          ) : d.myProposals.filter((p) => p.status !== 'rejected').length >= LIMIT ? (
            <StatePanel title={`You’ve proposed ${LIMIT} initiatives`}>
              That’s the most for one election. Withdraw one to propose another.
            </StatePanel>
          ) : (
            <ProposeForm d={d} />
          )
        }
      </Loaded>
    </>
  );
}

function ProposeForm({ d }: { d: ElectionData }) {
  const router = useRouter();
  const ids = { title: useId(), description: useId(), url: useId() };
  const titleRef = useRef<HTMLInputElement>(null);
  const [v, setV] = useState({ title: '', description: '', url: '' });
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setPending(true);
    const { error } = await supabase.rpc('initiative_propose', {
      p_election: d.election.id,
      p_title: v.title.trim(),
      p_description: v.description.trim(),
      p_url: v.url.trim() || undefined
    });
    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }
    router.replace(`/elections/view/?id=${d.election.id}`);
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-1 flex-col gap-5 px-4 pt-4">
      <p className="text-body text-muted-foreground">
        Ask a question for members to vote on in {d.election.title}. Proposals close{' '}
        {formatDeadline(d.election.nomination_end!)}; an admin reviews each one before it goes on the ballot.
      </p>

      <section aria-labelledby="samples" className="flex flex-col gap-2 rounded-lg border bg-card p-4">
        <h2 id="samples" className="text-section text-foreground">
          Examples
        </h2>
        <p className="text-caption text-muted-foreground">
          One yes-or-no question, saying what changes if it passes and what it costs. Start from one and make it your own.
        </p>
        <ul className="flex flex-col divide-y">
          {SAMPLE_INITIATIVES.map((s) => (
            <li key={s.title} className="flex flex-col gap-2 py-3 last:pb-0">
              <span className="text-sm font-medium text-foreground">{s.title}</span>
              <Button
                type="button"
                variant="outline"
                className="h-11 self-start"
                onClick={() => {
                  setV(s);
                  titleRef.current?.focus();
                }}
              >
                Use this example
                <span className="sr-only">: {s.title}</span>
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.title}>Question</Label>
        <Input
          id={ids.title}
          ref={titleRef}
          className="h-11"
          value={v.title}
          maxLength={200}
          onChange={(e) => setV((o) => ({ ...o, title: e.target.value }))}
        />
        <p className="text-caption text-muted-foreground">10 to 200 characters. Members vote Yes, No or Abstain.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.description}>Explanation</Label>
        <Textarea
          id={ids.description}
          rows={6}
          value={v.description}
          maxLength={2000}
          onChange={(e) => setV((o) => ({ ...o, description: e.target.value }))}
        />
        <p className="text-caption text-muted-foreground">What changes if it passes, who it affects and what it costs.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.url}>Link (optional)</Label>
        <Input
          id={ids.url}
          className="h-11"
          type="url"
          inputMode="url"
          placeholder="https://"
          value={v.url}
          onChange={(e) => setV((o) => ({ ...o, url: e.target.value }))}
        />
      </div>

      {error && (
        <Banner tone="error" title="Not sent">
          {error}
        </Banner>
      )}
      <ActionBar>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Sending…' : 'Propose initiative'}
        </Button>
      </ActionBar>
    </form>
  );
}
