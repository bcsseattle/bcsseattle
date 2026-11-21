import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Banner } from '@/components/ui/banner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/server';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import { eventVotingOpen } from '@/utils/elections/event-voting';
import { BallotCodeForm } from './ballot-code-form';

export const metadata: Metadata = { title: 'Vote', robots: { index: false } };

/** Voting at an event: the page the QR code opens (actions.ts). */
export default async function EventVotePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await checkFeatureFlag('enableEventVoting'))) notFound();

  const election = await eventVotingOpen(id);
  const {
    data: { user }
  } = await (await createClient()).auth.getUser();
  // Already signed in on this phone: straight to the ballot.
  if (election && user) redirect(`/elections/${id}/vote`);

  return (
    <div className="flex justify-center height-screen-helper">
      <div className="m-auto flex w-full max-w-[384px] flex-col py-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle as="h1">{election ? election.title : 'Vote'}</CardTitle>
            {election && (
              <CardDescription>Enter the email you registered with. We’ll send you a code to open your ballot.</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {election ? (
              <BallotCodeForm electionId={id} />
            ) : (
              <Banner tone="info" title="Voting at this event isn’t open">
                Ask a volunteer, or sign in at bcsseattle.org to vote.
              </Banner>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
