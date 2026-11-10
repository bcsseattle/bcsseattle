'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BarChart3, ChevronRight, UserPlus } from 'lucide-react';
import { ListGroup, ListRow } from '@/components/portal/list-row';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { buttonVariants } from '@/components/ui/button';
import { PersonRow } from '@/components/ui/person-row';
import { formatDeadline } from '@/utils/format';
import { Loaded, Screen, Section } from '~/components/screen';
import {
  INITIATIVE_WORD,
  loadElection,
  type ElectionData
} from '~/components/elections/election';
import { PhaseTimeline } from '~/components/elections/phase-timeline';
import { useMember } from '~/lib/member';
import { useSession } from '~/lib/session';
import { useData } from '~/lib/use-data';

/** An election: phases, the member's own votes, candidates, initiatives, and what they can do now. */
export default function ElectionDetail() {
  const id = useSearchParams().get('id') ?? '';
  const userId = useSession().session!.user.id;
  const me = useMember();
  const state = useData(() => loadElection(id, userId), [id, userId]);
  return (
    <Screen
      title={state.data?.election.title ?? 'Election'}
      back={{ label: 'Elections', href: '/elections/' }}
    >
      <Loaded state={state}>
        {(d) => <Detail d={d} isActive={me.data?.isActive} />}
      </Loaded>
    </Screen>
  );
}

function Detail({ d, isActive }: { d: ElectionData; isActive?: boolean }) {
  const { election: e, phase: p } = d;
  const canBallot =
    p.votingOpen && !!isActive && (d.offerCandidates || d.offerInitiatives);
  const canNominate = p.nominationsOpen && !d.myCandidacy;
  const results = `/elections/results/?id=${e.id}`;

  // One primary action: vote, else nominate, else results once closed.
  const primary = canBallot
    ? { label: 'Vote', href: `/elections/ballot/?id=${e.id}` }
    : canNominate
      ? { label: 'Nominate yourself', href: `/elections/nominate/?id=${e.id}` }
      : p.closed
        ? { label: 'View results', href: results }
        : null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge tone={p.phase.tone}>{p.phase.label}</Badge>
        </div>
        {e.description && (
          <p className="text-body text-muted-foreground">{e.description}</p>
        )}
      </div>

      <PhaseTimeline election={e} phase={p} />

      {d.myCandidacy && (
        <Banner
          tone="success"
          title={`You’re nominated for ${d.myCandidacy.position}`}
        >
          To change or withdraw your nomination, contact the election
          administrator.
        </Banner>
      )}
      {d.electedUnopposed && (
        <Banner tone="success" title="Candidates elected unopposed">
          Every position had one candidate, so they are elected without a vote.
        </Banner>
      )}
      {p.votingOpen && isActive === false && (
        <Banner
          tone="attention"
          title="Only approved members with active membership can vote"
        >
          If you think this is wrong, contact BCS Seattle.
        </Banner>
      )}

      {primary && (
        <Link
          href={primary.href}
          className={buttonVariants({ size: 'lg', className: 'w-full' })}
        >
          {primary.label}
        </Link>
      )}

      <MyVotes d={d} />

      {(p.votingOpen ||
        (canNominate && primary?.label !== 'Nominate yourself')) && (
        <ListGroup>
          {canNominate && primary?.label !== 'Nominate yourself' && (
            <ListRow
              label="Nominate yourself"
              icon={UserPlus}
              href={`/elections/nominate/?id=${e.id}`}
            />
          )}
          {p.votingOpen && (
            <ListRow label="Live results" icon={BarChart3} href={results} />
          )}
        </ListGroup>
      )}

      {d.candidates.length > 0 && (
        <Section label="Candidates">
          <div className="flex flex-col gap-4">
            {d.positions
              .map((pos) => ({
                ...pos,
                candidates: d.candidates.filter(
                  (c) => c.position === pos.position
                )
              }))
              .concat(
                // Candidates for a position the type doesn't list still show (the website lists them last).
                Array.from(new Set(d.candidates.map((c) => c.position)))
                  .filter(
                    (name) => !d.positions.some((pos) => pos.position === name)
                  )
                  .map((name) => ({
                    position: name,
                    description: null,
                    display_order: 0,
                    candidates: d.candidates.filter((c) => c.position === name)
                  }))
              )
              .filter((pos) => pos.candidates.length > 0)
              .map((pos) => (
                <div key={pos.position} className="flex flex-col gap-2">
                  <h3 className="px-1 text-item text-foreground">
                    {pos.position}
                  </h3>
                  <ListGroup>
                    {pos.candidates.map((c) => (
                      <Link
                        key={c.id}
                        href={`/elections/candidate/?id=${c.id}`}
                        className="flex min-h-13 items-center gap-3 border-b py-1 pl-4 pr-3 last:border-b-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <PersonRow
                          name={c.full_name}
                          imageUrl={c.photo_url}
                          secondary={
                            pos.candidates.length === 1 ? 'Unopposed' : c.bio
                          }
                          className="flex-1"
                        />
                        <ChevronRight
                          aria-hidden
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                      </Link>
                    ))}
                  </ListGroup>
                </div>
              ))}
          </div>
        </Section>
      )}

      {d.initiatives.length > 0 && (
        <Section label="Community initiatives">
          <div className="flex flex-col gap-3">
            {d.initiatives.map((i) => (
              <div key={i.id} className="rounded-lg border bg-card p-4">
                <h3 className="text-item text-foreground">{i.title}</h3>
                {i.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {i.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {d.candidates.length === 0 && d.initiatives.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {p.nominationsOpen
            ? 'No candidates yet. Nominations are open.'
            : 'Nothing is on the ballot yet.'}
        </p>
      )}
    </>
  );
}

/** The parts of the ballot this member has already cast, with their confirmation codes. */
function MyVotes({ d }: { d: ElectionData }) {
  const parts = [
    {
      title: 'Your leadership votes',
      session: d.sessions.candidates,
      rows: d.votes
        .filter((v) => v.candidate_id)
        .map(
          (v) =>
            [
              v.candidates?.position ?? '',
              v.candidates?.full_name ?? ''
            ] as const
        )
    },
    {
      title: 'Your initiative votes',
      session: d.sessions.initiatives,
      rows: d.votes
        .filter((v) => v.initiative_id)
        .map(
          (v) =>
            [
              v.initiatives?.title ?? '',
              v.vote_value ? INITIATIVE_WORD[v.vote_value] : ''
            ] as const
        )
    }
  ].filter(
    (part) =>
      part.session || (part.rows.length > 0 && d.confirmations.length > 0)
  );

  if (parts.length === 0) return null;
  return (
    <Section label="Your ballot">
      {parts.map((part) => (
        <div
          key={part.title}
          className="flex flex-col gap-3 rounded-lg border bg-card p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-item text-foreground">{part.title}</h3>
            <Badge tone="green">Submitted</Badge>
          </div>
          {part.rows.length > 0 && (
            <dl className="text-sm">
              {part.rows.map(([question, answer]) => (
                <div
                  key={question}
                  className="flex justify-between gap-3 border-b py-2 last:border-b-0"
                >
                  <dt className="text-muted-foreground">{question}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {answer}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <Code
            code={part.session?.confirmation_code ?? null}
            when={part.session?.completed_at ?? null}
          />
        </div>
      ))}
      {/* Older combined ballots have one confirmation for the whole election. */}
      {d.confirmations.map((c) => (
        <Code
          key={c.confirmation_code}
          code={c.confirmation_code}
          when={c.confirmed_at}
          label="Ballot confirmation code"
        />
      ))}
    </Section>
  );
}

function Code({
  code,
  when,
  label = 'Confirmation code'
}: {
  code: string | null;
  when: string | null;
  label?: string;
}) {
  if (!code) return null;
  return (
    <p className="text-caption text-muted-foreground">
      {when && `Submitted ${formatDeadline(when)}. `}
      {label}:{' '}
      <span className="break-all font-mono text-foreground">{code}</span>
    </p>
  );
}
