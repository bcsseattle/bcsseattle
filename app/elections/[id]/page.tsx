import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';
import { Candidate } from '@/types';
import { Vote, Trophy, Clock, UserPlus, AlertCircle } from 'lucide-react';
import Candidates from '@/components/elections/candidates';
import LeadershipPositions from '@/components/leadership-positions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ElectionDetailPage(props: Props) {
  const params = await props.params;
  const { id } = params;

  const supabase = await createClient();

  const { data: election, error } = await supabase
    .from('elections')
    .select('*')
    .eq('id', id)
    .single();

  if (!election || error) {
    notFound();
  }

  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .eq('election_id', election.id)
    .order('position');

  // Helper function to get position order with fallbacks
  async function getPositionOrder(
    electionType: string,
    candidates: Candidate[]
  ) {
    // Try to fetch from database first
    const { data: dbPositions } = await supabase
      .from('election_positions')
      .select('position')
      .eq('election_type', electionType)
      .order('display_order');

    if (dbPositions?.length) {
      return dbPositions.map((p) => p.position);
    }

    // Fallback to hardcoded positions based on election type
    const defaultPositions = {
      leadership: ['President', 'Vice President', 'Secretary', 'Treasurer'],
      board: ['Chairperson', 'Board Member'],
      committee: ['Committee Chair', 'Committee Member']
    };

    const typePositions =
      defaultPositions[electionType as keyof typeof defaultPositions];
    if (typePositions) {
      return typePositions;
    }

    // Final fallback: extract unique positions from candidates
    return Array.from(new Set(candidates?.map((c) => c.position) || []));
  }

  const positionOrder = await getPositionOrder(
    election.type!!,
    candidates || []
  );

  const now = new Date();
  const start = new Date(election.start_date);
  const end = new Date(election.end_date);

  const isVotingOpen = now >= start && now <= end;
  const isUpcoming = now < start;
  const isClosed = now > end;

  const isNominationOpen =
    election.nomination_start &&
    election.nomination_end &&
    new Date(election.nomination_start) <= now &&
    now <= new Date(election.nomination_end);

  // Helper function to get election status
  function getElectionStatus() {
    if (isNominationOpen)
      return {
        label: 'Nominations Open',
        variant: 'default' as const,
        icon: UserPlus
      };
    if (isVotingOpen)
      return {
        label: 'Voting Open',
        variant: 'destructive' as const,
        icon: Vote
      };
    if (isClosed)
      return {
        label: 'Completed',
        variant: 'secondary' as const,
        icon: Trophy
      };
    if (isUpcoming)
      return { label: 'Upcoming', variant: 'outline' as const, icon: Clock };
    return {
      label: 'Closed',
      variant: 'secondary' as const,
      icon: AlertCircle
    };
  }

  const status = getElectionStatus();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Election Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl">{election.title}</CardTitle>
              <CardDescription className="text-lg">
                {election.description}
              </CardDescription>
            </div>
            <Badge variant={status.variant} className="flex items-center gap-1">
              <status.icon className="w-3 h-3" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Election Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {election.nomination_start && election.nomination_end && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Nomination Period</p>
                  <p className="text-sm text-blue-700">
                    {dayjs(election.nomination_start).format('MMM D, h:mm A')} →{' '}
                    {dayjs(election.nomination_end).format('MMM D, h:mm A')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Vote className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Voting Period</p>
                <p className="text-sm text-green-700">
                  {dayjs(start).format('MMM D, h:mm A')} →{' '}
                  {dayjs(end).format('MMM D, h:mm A')}
                </p>
              </div>
            </div>
          </div>

          {/* Position Information */}
          {positionOrder.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <LeadershipPositions positions={positionOrder} />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-3">
          {isNominationOpen && (
            <Link href={`/elections/${election.id}/nominate`}>
              <Button className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Nominate Yourself
              </Button>
            </Link>
          )}

          {!isNominationOpen && !isVotingOpen && !isClosed && (
            <Button disabled variant="outline">
              Nominations Closed
            </Button>
          )}

          {isVotingOpen && (
            <Link href={`/elections/${election.id}/vote`}>
              <Button variant="default" className="flex items-center gap-2">
                <Vote className="w-4 h-4" />
                Vote Now
              </Button>
            </Link>
          )}

          {isClosed && (
            <Link href={`/elections/${election.id}/results`}>
              <Button variant="secondary" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                View Results
              </Button>
            </Link>
          )}
        </CardFooter>
      </Card>

      {/* Candidates Section */}
      {election.type === 'leadership' && (
        <Candidates
          candidates={candidates}
          election={election}
          //  positionOrder={positionOrder}
          positionOrder={positionOrder}
          isNominationOpen={isNominationOpen}
        />
      )}
    </div>
  );
}
