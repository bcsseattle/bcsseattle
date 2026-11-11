import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { ElectionCard } from '@/components/elections/election-card';
import { PageHeader } from '@/components/portal/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { formatDate } from '@/utils/format';
import { getServerFeatureFlag } from '@/utils/server-feature-flags';
import { electionPhase } from '@/utils/elections/rules';
import {
  FEATURE_FLAGS,
  createFeatureFlagArray
} from '@/utils/feature-flag-constants';

// Helper function to determine election content types
function getElectionContentTypes(election: any) {
  const hasPositions = election.positionCount > 0;
  const hasInitiatives = election.initiativeCount > 0;
  
  const types = [];
  if (hasPositions) types.push('Leadership');
  if (hasInitiatives) types.push('Initiatives');
  
  return types;
}

// Helper function to get a more descriptive election description
function getElectionDescription(election: any, contentTypes: string[]) {
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

  // Get basic election data first
  const { data: elections, error } = await supabase
    .from('elections')
    .select(
      'id, title, description, status, type, nomination_start, nomination_end, start_date, end_date, enable_separate_voting_periods, candidate_voting_start, candidate_voting_end'
    )
    .gt('end_date', new Date().toISOString())
    .order('start_date', { ascending: true });

  if (error) {
    return <div className="text-badge-red-text">Error loading elections: {error.message}</div>;
  }

  // Get content counts for each election
  const electionsWithCounts = await Promise.all(
    (elections || []).map(async (election) => {
      const [positionsData, initiativesData] = await Promise.all([
        supabase.from('ballot_positions').select('id').eq('election_id', election.id),
        supabase
          .from('initiatives')
          .select('id')
          .eq('election_id', election.id)
      ]);

      return {
        ...election,
        positionCount: positionsData.data?.length || 0,
        initiativeCount: initiativesData.data?.length || 0
      };
    })
  );

  // Elections (Figma 11:860). Only current and upcoming elections are loaded
  // (the query is unchanged), so the mock's "Past" tab is left out.
  const isOpen = (e: (typeof electionsWithCounts)[number]) => electionPhase(e).votingOpen;
  const firstOpenId = electionsWithCounts.find(isOpen)?.id;

  return (
    <div className="flex max-w-[800px] flex-col gap-6">
      <PageHeader
        title="Elections"
        description="Current and upcoming elections for approved members. You can vote once in each election; results are published when voting closes."
      />
      {electionsWithCounts?.length === 0 ? (
        <StatePanel icon={CheckCircle} title="No active elections at the moment">
          When the board opens an election it will appear here.
        </StatePanel>
      ) : (
        <div className="flex flex-col gap-4">
          {electionsWithCounts.map((election) => {
            const contentTypes = getElectionContentTypes(election);
            const p = electionPhase(election);
            const open = p.votingOpen;
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
                    href={`/elections/${election.id}`}
                    className={buttonVariants({ variant: open && election.id === firstOpenId ? 'default' : 'outline' })}
                  >
                    {open ? 'Vote now' : 'View'}
                    <span className="sr-only">: {election.title}</span>
                  </Link>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
