import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { ElectionCard } from '@/components/elections/election-card';
import { PageHeader } from '@/components/portal/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/utils/format';
import { getServerFeatureFlag } from '@/utils/server-feature-flags';
import { electionPhase, isPastElection } from '@/utils/elections/rules';
import {
  FEATURE_FLAGS,
  createFeatureFlagArray
} from '@/utils/feature-flag-constants';

// Helper function to determine election content types
function getElectionContentTypes(election: { positionCount: number; initiativeCount: number }) {
  const hasPositions = election.positionCount > 0;
  const hasInitiatives = election.initiativeCount > 0;
  
  const types = [];
  if (hasPositions) types.push('Leadership');
  if (hasInitiatives) types.push('Initiatives');
  
  return types;
}

// Helper function to get a more descriptive election description
function getElectionDescription(election: { description: string | null }, contentTypes: string[]) {
  if (contentTypes.length === 0) {
    return election.description;
  }
  
  if (contentTypes.length === 1) {
    return election.description;
  }
  
  // Mixed content election
  return `Vote for leadership positions and community initiatives`;
}

interface Props {
  searchParams: Promise<{ configoverride?: string }>;
}

export default async function ElectionsPage(props: Props) {
  const searchParams = await props.searchParams;

  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to sign-in with the current page as the return URL
    const currentUrl = '/elections';
    const signInUrl = `/signin?redirectTo=${encodeURIComponent(currentUrl)}`;
    return redirect(signInUrl);
  }

  // Define the feature flags we need for this page
  const requiredFlags = createFeatureFlagArray(
    FEATURE_FLAGS.SKIP_MEMBERSHIP_CHECK,
    FEATURE_FLAGS.ENABLE_DEBUG_MODE
  );

  // Check multiple feature flags in one call with full type safety
  const featureFlags = await getServerFeatureFlag(
    requiredFlags,
    searchParams.configoverride
  );

  // Skip member status checks if override is present
  if (!featureFlags[FEATURE_FLAGS.SKIP_MEMBERSHIP_CHECK]) {
    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (member?.status === 'inactive') {
      return redirect('/register');
    }

    // Signed in but never registered: there's no member to show a status for (BUG-056).
    if (!member) {
      return redirect('/register');
    }

    if (!member?.isApproved) {
      return redirect(`/members/${member?.id}/pending`);
    }
  }

  // Every election members can see (RLS hides drafts), current and past.
  const { data: elections, error } = await supabase
    .from('elections')
    .select(
      'id, title, description, status, type, nomination_start, nomination_end, start_date, end_date, enable_separate_voting_periods, candidate_voting_start, candidate_voting_end'
    )
    .order('start_date', { ascending: true });

  if (error) {
    return <div className="text-badge-red-text">Error loading elections: {error.message}</div>;
  }

  // Content counts, two queries for the whole list.
  const ids = (elections ?? []).map((e) => e.id);
  const [{ data: positions }, { data: initiatives }] = ids.length
    ? await Promise.all([
        supabase.from('ballot_positions').select('election_id').in('election_id', ids),
        supabase.from('initiatives').select('election_id').in('election_id', ids)
      ])
    : [{ data: [] }, { data: [] }];
  const electionsWithCounts = (elections ?? []).map((election) => ({
    ...election,
    positionCount: (positions ?? []).filter((p) => p.election_id === election.id).length,
    initiativeCount: (initiatives ?? []).filter((i) => i.election_id === election.id).length
  }));

  // Elections (Figma 11:860), with the mock's Past tab as in the app: elections
  // whose results are out (or that were cancelled), newest first.
  const current = electionsWithCounts.filter((e) => !isPastElection(e));
  const past = electionsWithCounts.filter(isPastElection).reverse();
  const firstOpenId = current.find((e) => electionPhase(e).votingOpen)?.id;

  const list = (rows: typeof electionsWithCounts) => (
    <div className="flex flex-col gap-4">
      {rows.map((election) => {
        const contentTypes = getElectionContentTypes(election);
        const p = electionPhase(election);
        const open = p.votingOpen;
        const published = election.status === 'completed' || election.status === 'archived';
        const [label, href] = published
          ? ['Results', `/elections/${election.id}/results`]
          : [open ? 'Vote now' : 'View', `/elections/${election.id}`];
        return (
          <ElectionCard
            key={election.id}
            title={election.title}
            description={getElectionDescription(election, contentTypes)}
            phase={{ label: p.label.member, tone: p.label.tone }}
            types={contentTypes}
            dates={`${formatDate(election.start_date)} – ${formatDate(election.end_date)}`}
            action={
              // The first open election's Vote now is the page's one primary action.
              <Link
                href={href}
                className={buttonVariants({ variant: open && election.id === firstOpenId ? 'default' : 'outline' })}
              >
                {label}
                <span className="sr-only">: {election.title}</span>
              </Link>
            }
          />
        );
      })}
    </div>
  );

  return (
    <div className="flex max-w-[800px] flex-col gap-6">
      <PageHeader
        title="Elections"
        description="Current, upcoming and past elections for approved members. You can vote once in each election; results are published once the votes are certified."
      />
      <Tabs defaultValue="current">
        <TabsList aria-label="Elections">
          <TabsTrigger value="current" count={current.length}>
            Current &amp; upcoming
          </TabsTrigger>
          <TabsTrigger value="past" count={past.length}>
            Past
          </TabsTrigger>
        </TabsList>
        {/* Both panels render so each tab's aria-controls points at one. */}
        <TabsContent value="current" forceMount className="mt-4 data-[state=inactive]:hidden">
          {current.length === 0 ? (
            <StatePanel icon={CheckCircle} title="No active elections at the moment">
              When the board opens an election it will appear here.
            </StatePanel>
          ) : (
            list(current)
          )}
        </TabsContent>
        <TabsContent value="past" forceMount className="mt-4 data-[state=inactive]:hidden">
          {past.length === 0 ? (
            <StatePanel title="No past elections">Closed elections and their results appear here.</StatePanel>
          ) : (
            list(past)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
