'use client';

import { useSearchParams } from 'next/navigation';
import { Trophy } from 'lucide-react';
import type { ElectionResults } from '@/hooks/useElectionResults';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Progress } from '@/components/ui/progress';
import { PersonRow } from '@/components/ui/person-row';
import { ResultHeader } from '@/components/ui/result-header';
import { StatTile } from '@/components/ui/stat-tile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDeadline } from '@/utils/format';
import { Loaded, Screen, Section } from '~/components/screen';
import { INITIATIVE_WORD } from '~/components/elections/election';
import { api } from '~/lib/api';
import { useData } from '~/lib/use-data';

type Ranked = { id: string; is_winner: boolean; ranking: number };

/**
 * Results (Result header 23:2005), laid out like the website's results page:
 * the headline numbers, then Leadership, Initiatives and Details tabs. Counts
 * come from GET /api/elections/[id]/results; once candidate voting has closed,
 * winners come from candidate-results.
 */
export default function ResultsPage() {
  const id = useSearchParams().get('id') ?? '';
  const state = useData(async () => {
    const results = await api<ElectionResults>(`/api/elections/${id}/results`);
    let ranked: Ranked[] = [];
    let rankedError: string | undefined;
    if (
      !results.votingStatus.candidateVotingOpen &&
      results.candidateResults.length > 0
    ) {
      try {
        ranked = (
          await api<{ results: Ranked[] }>(
            `/api/elections/${id}/candidate-results`
          )
        ).results;
      } catch (e) {
        rankedError = (e as Error).message;
      }
    }
    return { results, ranked, rankedError, loadedAt: new Date() };
  }, [id]);

  return (
    <Screen title={state.data?.results.election.title ?? 'Results'}>
      <Loaded state={state}>{(d) => <Results {...d} />}</Loaded>
    </Screen>
  );
}

function Results({
  results: r,
  ranked,
  rankedError,
  loadedAt
}: {
  results: ElectionResults;
  ranked: Ranked[];
  rankedError?: string;
  loadedAt: Date;
}) {
  const live =
    r.votingStatus.candidateVotingOpen || r.votingStatus.initiativeVotingOpen;
  const byPosition = new Map<string, ElectionResults['candidateResults']>();
  r.candidateResults.forEach((c) =>
    byPosition.set(c.position, [...(byPosition.get(c.position) ?? []), c])
  );
  const rank = (id: string) => ranked.find((x) => x.id === id);

  return (
    <>
      <ResultHeader
        tone={live ? 'pending' : 'success'}
        title={live ? 'Voting is still open' : 'Final results'}
      >
        {live
          ? `These counts change as members vote. Voting closes ${formatDeadline(r.election.endDate)}.`
          : `Voting closed ${formatDeadline(r.election.endDate)}.`}
      </ResultHeader>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Voters" value={r.statistics.totalVoters} />
        <StatTile
          label="Turnout"
          value={`${r.statistics.turnoutPercentage}%`}
          note="of active members"
        />
      </div>

      {r.votingStatus.candidatesElectedUnopposed && (
        <Banner tone="success" title="All candidates elected unopposed">
          Every leadership position had one candidate, so they are elected
          without a vote.
        </Banner>
      )}

      <Tabs
        defaultValue={
          r.candidateResults.length > 0
            ? 'leadership'
            : r.initiativeResults.length > 0
              ? 'initiatives'
              : 'details'
        }
      >
        <TabsList className="w-full">
          {r.candidateResults.length > 0 && (
            <TabsTrigger value="leadership">Leadership</TabsTrigger>
          )}
          {r.initiativeResults.length > 0 && (
            <TabsTrigger value="initiatives">Initiatives</TabsTrigger>
          )}
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="leadership" className="mt-4 flex flex-col gap-4">
          {rankedError && (
            <p className="text-caption text-muted-foreground">{rankedError}</p>
          )}
          {Array.from(byPosition).map(([position, candidates]) => (
            <Section key={position} label={position}>
              <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
                <p className="text-caption text-muted-foreground">
                  {candidates.reduce((sum, c) => sum + c.voteCount, 0)} votes
                  cast
                </p>
                {candidates.map((c, i) => {
                  const won = rank(c.id)?.is_winner;
                  return (
                    <div key={c.id} className="flex flex-col gap-2">
                      <PersonRow
                        name={c.fullName}
                        imageUrl={c.photoUrl}
                        secondary={`${c.voteCount} ${c.voteCount === 1 ? 'vote' : 'votes'} · ${c.percentage}%`}
                        trailing={
                          won ? (
                            <Badge tone="green">
                              <Trophy aria-hidden />
                              Elected
                            </Badge>
                          ) : live && i === 0 && c.voteCount > 0 ? (
                            <Badge tone="blue">Leading</Badge>
                          ) : undefined
                        }
                      />
                      <Progress
                        value={c.percentage}
                        aria-label={`${c.fullName}: ${c.percentage}%`}
                      />
                    </div>
                  );
                })}
              </div>
            </Section>
          ))}
        </TabsContent>

        <TabsContent value="initiatives" className="mt-4 flex flex-col gap-4">
          {r.initiativeResults.map((i) => {
            const outcome =
              i.totalVotes === 0
                ? 'No votes yet'
                : i.votes.yes > i.votes.no
                  ? 'Supported'
                  : i.votes.no > i.votes.yes
                    ? 'Opposed'
                    : 'Tied';
            return (
              <div
                key={i.id}
                className="flex flex-col gap-3 rounded-lg border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-item text-foreground">{i.title}</h3>
                  <Badge
                    tone={
                      outcome === 'Supported'
                        ? 'green'
                        : outcome === 'Opposed'
                          ? 'red'
                          : 'neutral'
                    }
                  >
                    {live && i.totalVotes > 0 ? `${outcome} so far` : outcome}
                  </Badge>
                </div>
                <p className="text-caption text-muted-foreground">
                  {i.totalVotes} votes cast
                </p>
                {(['yes', 'no', 'abstain'] as const).map((v) => (
                  <div key={v} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">
                        {INITIATIVE_WORD[v]}
                      </span>
                      <span className="text-muted-foreground">
                        {i.votes[v]} · {i.percentages[v]}%
                      </span>
                    </div>
                    <Progress
                      value={i.percentages[v]}
                      aria-label={`${INITIATIVE_WORD[v]}: ${i.percentages[v]}%`}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <dl className="overflow-hidden rounded-lg border bg-card text-sm">
            {[
              ['Voting opened', formatDeadline(r.election.startDate)],
              ['Voting closes', formatDeadline(r.election.endDate)],
              ...(r.election.candidateVotingEnd
                ? [
                    [
                      'Candidate voting closes',
                      formatDeadline(r.election.candidateVotingEnd)
                    ]
                  ]
                : []),
              ['Candidate votes', String(r.statistics.candidateVotes)],
              ['Initiative votes', String(r.statistics.initiativeVotes)],
              ['Updated', formatDeadline(loadedAt)]
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex min-h-13 items-center justify-between gap-3 border-b px-4 py-2 last:border-b-0"
              >
                <dt className="text-foreground">{label}</dt>
                <dd className="text-right text-muted-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </TabsContent>
      </Tabs>
    </>
  );
}
