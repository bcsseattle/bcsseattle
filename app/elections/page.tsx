import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import dayjs from '@/libs/dayjs';
import { useServerFeatureFlag } from '@/utils/server-feature-flags';
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
  const featureFlags = await useServerFeatureFlag(
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

    if (!member?.isApproved) {
      return redirect(`/members/${member?.id}/pending`);
    }
  }

  // Get basic election data first
  const { data: elections, error } = await supabase
    .from('elections')
    .select('id, title, description, type, start_date, end_date')
    .gt('end_date', new Date().toISOString())
    .order('start_date', { ascending: true });

  if (error) {
    return <div className="text-red-500">Error loading elections: {error.message}</div>;
  }

  // Get content counts for each election
  const electionsWithCounts = await Promise.all(
    (elections || []).map(async (election) => {
      const [positionsData, initiativesData] = await Promise.all([
        supabase
          .from('election_positions')
          .select('id')
          .eq('election_id', election.id),
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

      return (
        <div className="max-w-3xl mx-auto p-6">
          <h1 className="text-2xl font-semibold mb-4">
            Current and Upcoming Elections
          </h1>

          {electionsWithCounts?.length === 0 ? (
            <p className="text-muted-foreground">
              No active elections at the moment.
            </p>
          ) : (
            <div className="space-y-4">
              {electionsWithCounts.map((election) => {
                const contentTypes = getElectionContentTypes(election);
                const enhancedDescription = getElectionDescription(election, contentTypes);
                
                return (
                  <Card key={election.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h2 className="text-lg font-medium">{election.title}</h2>
                          <p className="text-sm text-muted-foreground">
                            {enhancedDescription}
                          </p>
                          <div className="text-sm text-gray-500 mt-1">
                            {dayjs.utc(election.start_date).tz('America/Los_Angeles').format('MMM D')} –{' '}
                            {dayjs.utc(election.end_date).tz('America/Los_Angeles').format('MMM D, YYYY')}
                          </div>
                        </div>
                        {contentTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-4">
                            {contentTypes.map((type) => (
                              <Badge
                                key={type}
                                variant={contentTypes.length > 1 ? "secondary" : "default"}
                                className="text-xs"
                              >
                                {type}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <Link href={`/elections/${election.id}`}>
                          <Button>View</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      );
}
