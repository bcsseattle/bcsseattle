import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isCurrentUserAdmin } from '@/utils/auth-helpers/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isCandidateVotingOpen } from '@/utils/election-config';
import dayjs from '@/libs/dayjs';
import { electedUnopposedNow, electionPhase, positionOrder } from '@/utils/elections/rules';

interface CandidateResult {
  id: string;
  fullName: string;
  position: string;
  voteCount: number;
  percentage: number;
  photoUrl?: string;
  bio?: string;
  /** From the certified results (election_results), once there are any. */
  outcome?: string;
  note?: string | null;
}

interface InitiativeResult {
  id: string;
  title: string;
  description?: string;
  votes: {
    yes: number;
    no: number;
    abstain: number;
  };
  totalVotes: number;
  percentages: {
    yes: number;
    no: number;
    abstain: number;
  };
  outcome?: string;
  note?: string | null;
}

interface ElectionResults {
  election: {
    id: string;
    title: string;
    description?: string;
    status: string;
    startDate: string;
    endDate: string;
    type: string;
    candidateVotingStart?: string | null;
    candidateVotingEnd?: string | null;
    enableSeparateVotingPeriods?: boolean;
    showUnopposedStatus?: boolean;
  };
  votingStatus: {
    candidateVotingOpen: boolean;
    initiativeVotingOpen: boolean;
    candidatesElectedUnopposed: boolean;
  };
  statistics: {
    totalVoters: number;
    candidateVotes: number;
    initiativeVotes: number;
    turnoutPercentage: number;
    lastUpdated: string;
  };
  candidateResults: CandidateResult[];
  initiativeResults: InitiativeResult[];
  positions: string[];
  /** True when the outcomes come from certified results. */
  certified: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Results are for signed-in members, like the /elections pages (BUG-037).
    const {
      data: { user }
    } = await (await createClient()).auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Use service client to bypass RLS for public election results
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch election details
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('*')
      .eq('id', id)
      .single();

    // Draft, cancelled or inactive elections aren't published; admins can still preview them (BUG-037).
    // Certified results wait for an admin to publish them.
    const unpublished =
      !election ||
      !election.is_active ||
      election.status === 'draft' ||
      election.status === 'cancelled' ||
      election.status === 'certified';
    if (electionError || !election || (unpublished && !(await isCurrentUserAdmin()))) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    // A locked ballot (the election management flow): nobody sees counts while
    // voting is open, and members only once the results are certified and
    // published (completed); admins see the count once voting has closed.
    if (election.status === 'ballot_locked') {
      const phase = electionPhase(election);
      if (!phase.votingOver || !(await isCurrentUserAdmin())) {
        return NextResponse.json(
          { error: 'Results are published after the votes are certified.', pending: true },
          { status: 403 }
        );
      }
    }
    const { data: certified } = await supabase
      .from('election_results')
      .select('candidate_id, initiative_id, outcome, note')
      .eq('election_id', id);
    const outcomeOf = (key: 'candidate_id' | 'initiative_id', rowId: string) => {
      const row = certified?.find((r) => r[key] === rowId);
      return row ? { outcome: row.outcome, note: row.note } : {};
    };

    // Calculate voting status for separate candidate/initiative periods
    const nowUtc = dayjs.utc();
    const candidateVotingOpen = await isCandidateVotingOpen(id, nowUtc);
    const initiativeVotingOpen = nowUtc.isAfter(dayjs.utc(election.start_date)) && 
                                nowUtc.isBefore(dayjs.utc(election.end_date));
    // The same rule as the election page: never during nominations (W26).
    const [{ data: ballotPositions }, { data: standing }] = await Promise.all([
      supabase
        .from('ballot_positions')
        .select('position:title, description, display_order, seats, vacant, unopposed_decision')
        .eq('election_id', id)
        .order('display_order'),
      supabase.from('candidates').select('position').eq('election_id', id)
    ]);
    const candidatesElectedUnopposed = electedUnopposedNow(
      election,
      standing ?? [],
      positionOrder(election.type, ballotPositions, standing ?? [])
    );

    // Get overall vote statistics using the database function
    const { data: voteStats, error: statsError } = await supabase
      .rpc('get_election_vote_count', { election_uuid: id });

    if (statsError) {
      console.error('Error fetching vote statistics:', statsError);
    }

    const stats = voteStats?.[0] || {
      candidate_votes: 0,
      initiative_votes: 0,
      total_voters: 0
    };

    // Get total eligible voters count (members with active membership)
    const { count: totalEligibleVoters, error: votersError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('isApproved', true);

    if (votersError) {
      console.error('Error fetching eligible voters:', votersError);
    }

    // Fetch candidate results
    const { data: candidateVotes, error: candidateError } = await supabase
      .from('votes')
      .select(`
        candidate_id,
        candidates!inner(
          id,
          full_name,
          position,
          photo_url,
          bio
        )
      `)
      .eq('election_id', id)
      .not('candidate_id', 'is', null);

    if (candidateError) {
      console.error('Error fetching candidate votes:', candidateError);
    }

    console.log('Candidate votes found:', candidateVotes?.length || 0);
    console.log('Sample candidate votes:', candidateVotes?.slice(0, 3));

    // Process candidate results
    const candidateVoteMap = new Map<string, any>();
    candidateVotes?.forEach((vote) => {
      const candidate = vote.candidates as any;
      if (candidate && candidate.id) {
        const key = candidate.id;
        if (!candidateVoteMap.has(key)) {
          candidateVoteMap.set(key, {
            ...candidate,
            voteCount: 0
          });
        }
        candidateVoteMap.get(key).voteCount++;
      }
    });

    // Get all candidates for this election (including those with 0 votes)
    const { data: allCandidates, error: allCandidatesError } = await supabase
      .from('candidates')
      .select('id, full_name, position, photo_url, bio')
      .eq('election_id', id);

    if (allCandidatesError) {
      console.error('Error fetching all candidates:', allCandidatesError);
    }

    console.log('All candidates found:', allCandidates?.length || 0);
    console.log('Vote map entries:', candidateVoteMap.size);

    // Create candidate results including those with 0 votes
    const candidateResults: CandidateResult[] = [];
    const positionsSet = new Set<string>();

    // Each candidate's share is of the votes cast in their own position (BUG-037).
    const votesByPosition = new Map<string, number>();
    allCandidates?.forEach((c) => {
      const n = candidateVoteMap.get(c.id)?.voteCount || 0;
      votesByPosition.set(c.position, (votesByPosition.get(c.position) || 0) + n);
    });

    allCandidates?.forEach((candidate) => {
      const voteData = candidateVoteMap.get(candidate.id);
      const voteCount = voteData?.voteCount || 0;
      
      candidateResults.push({
        id: candidate.id,
        fullName: candidate.full_name,
        position: candidate.position,
        voteCount,
        percentage: (votesByPosition.get(candidate.position) || 0) > 0
          ? Math.round((voteCount / votesByPosition.get(candidate.position)!) * 100 * 100) / 100
          : 0,
        photoUrl: candidate.photo_url,
        bio: candidate.bio,
        ...outcomeOf('candidate_id', candidate.id)
      });
      
      positionsSet.add(candidate.position);
    });

    // Sort candidates by position and vote count
    candidateResults.sort((a, b) => {
      if (a.position !== b.position) {
        return a.position.localeCompare(b.position);
      }
      return b.voteCount - a.voteCount;
    });

    // Fetch initiative results
    const { data: initiativeVotes, error: initiativeError } = await supabase
      .from('votes')
      .select(`
        initiative_id,
        vote_value,
        initiatives!inner(
          id,
          title,
          description
        )
      `)
      .eq('election_id', id)
      .not('initiative_id', 'is', null);

    if (initiativeError) {
      console.error('Error fetching initiative votes:', initiativeError);
    }

    // Process initiative results
    const initiativeVoteMap = new Map<string, any>();
    initiativeVotes?.forEach((vote) => {
      const initiative = vote.initiatives as any;
      if (initiative && initiative.id) {
        const key = initiative.id;
        if (!initiativeVoteMap.has(key)) {
          initiativeVoteMap.set(key, {
            ...initiative,
            votes: { yes: 0, no: 0, abstain: 0 }
          });
        }
        
        const voteValue = vote.vote_value;
        if (voteValue === 'yes' || voteValue === 'no' || voteValue === 'abstain') {
          initiativeVoteMap.get(key).votes[voteValue]++;
        }
      }
    });

    // Get all initiatives for this election (including those with 0 votes)
    const { data: allInitiatives, error: allInitiativesError } = await supabase
      .from('initiatives')
      .select('id, title, description')
      .eq('election_id', id);

    if (allInitiativesError) {
      console.error('Error fetching all initiatives:', allInitiativesError);
    }

    // Create initiative results
    const initiativeResults: InitiativeResult[] = [];

    allInitiatives?.forEach((initiative) => {
      const voteData = initiativeVoteMap.get(initiative.id);
      const votes = voteData?.votes || { yes: 0, no: 0, abstain: 0 };
      const totalVotes = votes.yes + votes.no + votes.abstain;
      
      initiativeResults.push({
        id: initiative.id,
        title: initiative.title,
        description: initiative.description,
        votes,
        totalVotes,
        percentages: {
          yes: totalVotes > 0 ? Math.round((votes.yes / totalVotes) * 100 * 100) / 100 : 0,
          no: totalVotes > 0 ? Math.round((votes.no / totalVotes) * 100 * 100) / 100 : 0,
          abstain: totalVotes > 0 ? Math.round((votes.abstain / totalVotes) * 100 * 100) / 100 : 0
        },
        ...outcomeOf('initiative_id', initiative.id)
      });
    });

    // Calculate turnout percentage
    const turnoutPercentage = totalEligibleVoters && totalEligibleVoters > 0
      ? Math.round((stats.total_voters / totalEligibleVoters) * 100 * 100) / 100
      : 0;

    const results: ElectionResults = {
      election: {
        id: election.id,
        title: election.title,
        description: election.description,
        status: election.status,
        startDate: election.start_date,
        endDate: election.end_date,
        type: election.type,
        candidateVotingStart: election.candidate_voting_start,
        candidateVotingEnd: election.candidate_voting_end,
        enableSeparateVotingPeriods: election.enable_separate_voting_periods,
        showUnopposedStatus: election.show_unopposed_status
      },
      votingStatus: {
        candidateVotingOpen,
        initiativeVotingOpen,
        candidatesElectedUnopposed: candidatesElectedUnopposed && candidateResults.length > 0
      },
      statistics: {
        totalVoters: stats.total_voters,
        candidateVotes: stats.candidate_votes,
        initiativeVotes: stats.initiative_votes,
        turnoutPercentage,
        lastUpdated: new Date().toISOString()
      },
      candidateResults,
      initiativeResults,
      positions: Array.from(positionsSet).sort(),
      certified: (certified?.length ?? 0) > 0
    };

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error fetching election results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch election results' },
      { status: 500 }
    );
  }
}
