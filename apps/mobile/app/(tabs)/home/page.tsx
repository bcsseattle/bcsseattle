'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { ElectionCard } from '@/components/elections/election-card';
import { ListGroup, ListRow } from '@/components/portal/list-row';
import { buttonVariants } from '@/components/ui/button';
import { StatTile } from '@/components/ui/stat-tile';
import { formatDate } from '@/utils/format';
import { AppHeader } from '~/components/app-header';
import { Loaded } from '~/components/screen';
import { membershipOf, priceLabel } from '~/components/account/labels';
import { AppFundraiserCard, fundraiserHref } from '~/components/give/fundraiser-card';
import { ClosedPanel } from '~/components/home/membership';
import { SiteLinkRows } from '~/components/home/site-link-rows';
import { PROGRAMS } from '~/components/home/site-links';
import {
  ballotOffer,
  electedUnopposed,
  electionPhase
} from '@/utils/elections/rules';
import { rows, typeTags } from '~/components/elections/election';
import { must } from '~/lib/api';
import { useMember, type Me } from '~/lib/member';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

/** Home (Figma 14:1723): what matters to the signed-in person right now. */
export default function HomeTab() {
  const me = useMember();
  const first = me.data?.fullName?.split(/\s+/)[0];
  return (
    <>
      <AppHeader
        title={first ? `Welcome, ${first}` : 'Welcome'}
        subtitle="Baloch Community Services of Seattle"
      />
      <div className="flex flex-col gap-6 px-4 pb-6 pt-2">
        <Loaded state={me}>{(data) => <Summary me={data} />}</Loaded>
      </div>
    </>
  );
}

const INTERVAL: Record<string, string> = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
  year: 'Annual'
};

function Summary({ me }: { me: Me }) {
  const membership = membershipOf(me.member);
  const active = membership === 'active';

  const state = useData(async () => {
    const [plans, fundraisers, elections] = await Promise.all([
      me.member
        ? must(
            supabase
              .from('subscriptions')
              .select('*, prices(unit_amount, interval, interval_count)')
              .eq('user_id', me.userId)
              .eq('status', 'active')
              .order('created', { ascending: false })
              .limit(1)
          )
        : [],
      // The website lists active fundraisers newest first; the newest is featured.
      must(
        supabase
          .from('fundraisers')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
      ),
      active
        ? rows(
            supabase
              .from('elections')
              .select('*')
              .order('end_date', { ascending: true })
          )
        : []
    ]);
    // Open by the Elections tab's rules (the candidate window counts), and
    // still offering this member a part of its ballot.
    const open = elections.filter((e) => electionPhase(e).votingOpen);
    const ids = open.map((e) => e.id);
    // Each part is read on its own.
    const [positions, candidates, initiatives, sessions, votes] = ids.length
      ? await Promise.all([
          rows(
            supabase
              .from('ballot_positions')
              .select('election_id, title, seats, vacant, unopposed_decision')
              .in('election_id', ids)
          ),
          rows(
            supabase
              .from('candidates')
              .select('election_id, position')
              .in('election_id', ids)
          ),
          rows(
            supabase
              .from('initiatives')
              .select('election_id')
              .in('election_id', ids)
          ),
          rows(
            supabase
              .from('vote_sessions')
              .select('election_id, session_type')
              .eq('user_id', me.userId)
              .not('completed_at', 'is', null)
              .in('election_id', ids)
          ),
          rows(
            supabase
              .from('votes')
              .select('election_id, candidate_id, initiative_id')
              .eq('user_id', me.userId)
              .in('election_id', ids)
          )
        ])
      : [[], [], [], [], []];
    const toVote = open
      .map((e) => {
        const windows = electionPhase(e);
        const mine = <T extends { election_id: string | null }>(list: T[]) =>
          list.filter((r) => r.election_id === e.id);
        const done = (type: string) =>
          mine(sessions).some((s) => s.session_type === type);
        // Votes from any ballot count, as on the election screen (BUG-016).
        const { offerCandidates, offerInitiatives } = ballotOffer({
          windows,
          votedCandidates:
            done('candidates') || mine(votes).some((v) => v.candidate_id),
          votedInitiatives:
            done('initiatives') || mine(votes).some((v) => v.initiative_id),
          electedUnopposed: electedUnopposed(
            e,
            mine(candidates),
            windows.candidateVotingOpen,
            mine(positions).map((x) => ({
              position: x.title,
              description: null,
              display_order: 0,
              seats: x.seats,
              vacant: x.vacant,
              unopposed_decision: x.unopposed_decision
            }))
          ),
          candidateCount: mine(candidates).length,
          initiativeCount: mine(initiatives).length
        });
        return {
          ...e,
          types: typeTags(e, positions, initiatives),
          open: offerCandidates || offerInitiatives
        };
      })
      .filter((e) => e.open);
    return { plan: plans?.[0], fundraiser: fundraisers?.[0], toVote };
  }, [me.userId, me.member?.id, active]);

  return (
    <>
      {active ? (
        <ListGroup>
          <ListRow label="Membership" icon={BadgeCheck} value="Active member" />
        </ListGroup>
      ) : (
        <div className="rounded-lg border bg-card">
          <ClosedPanel membership={membership} />
        </div>
      )}
      <Loaded state={state}>
        {({ plan, fundraiser, toVote }) => (
          <>
            {toVote.length > 0 && (
              <HomeSection
                title="Voting is open"
                link={{ href: '/elections/', label: 'All elections' }}
              >
                {toVote.map((e, i) => (
                  <ElectionCard
                    key={e.id}
                    headingLevel="h3"
                    title={e.title}
                    description={
                      e.types.length > 1
                        ? 'Vote for leadership positions and community initiatives'
                        : e.description
                    }
                    phase={{ label: 'Voting open', tone: 'green' }}
                    types={e.types}
                    dates={`Closes ${formatDate(e.end_date)}`}
                    action={
                      <Link
                        href={`/elections/view/?id=${e.id}`}
                        className={buttonVariants({
                          variant: i === 0 ? 'default' : 'outline',
                          size: 'lg'
                        })}
                      >
                        Vote now<span className="sr-only">: {e.title}</span>
                      </Link>
                    }
                  />
                ))}
              </HomeSection>
            )}

            {(plan || active) && (
              <HomeSection
                title="Your contribution"
                link={{
                  href: '/more/account/',
                  label: plan ? 'Manage' : 'Choose a plan'
                }}
              >
                {plan ? (
                  <StatTile
                    label={`${INTERVAL[plan.prices?.interval ?? ''] ?? 'Your'} plan`}
                    value={priceLabel(plan.prices, plan.quantity)}
                    note={`${plan.cancel_at_period_end ? 'Ends' : 'Renews'} ${formatDate(plan.current_period_end)}`}
                  />
                ) : (
                  <StatTile
                    label="Your plan"
                    value="No plan yet"
                    note="Members choose a monthly or annual contribution."
                  />
                )}
              </HomeSection>
            )}

            {fundraiser && (
              <HomeSection
                title="Featured fundraiser"
                link={{ href: '/give/', label: 'See all' }}
              >
                <AppFundraiserCard fundraiser={fundraiser} donateHref={fundraiserHref(fundraiser.id)} />
              </HomeSection>
            )}
          </>
        )}
      </Loaded>
      <HomeSection
        title="Programs"
        link={{ href: '/more/resources/', label: 'All resources' }}
      >
        <SiteLinkRows links={PROGRAMS} />
      </HomeSection>
    </>
  );
}

/** A Title/Section heading with an optional accent link (Figma "Heading"), then its content. */
function HomeSection({
  title,
  link,
  children
}: {
  title: string;
  link?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-section text-foreground">{title}</h2>
        {link && (
          <Link
            href={link.href}
            className="-mr-2 flex min-h-11 items-center rounded-md px-2 text-caption font-medium text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
