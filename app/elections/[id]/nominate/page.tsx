import React from 'react';
import { notFound, redirect } from 'next/navigation';
import NominateForm from '@/components/nominate-form';
import { createClient } from '@/utils/supabase/server';

interface Props {
  params: Promise<{ id: string }>;
}
export default async function NominatePage(props: Props) {
  const params = await props.params;
  const { id } = params;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/signin');
  }

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!member) {
    return redirect('/register');
  }

  // Fetch election details
  const { data: election, error } = await supabase
    .from('elections')
    .select('*')
    .eq('id', id)
    .single();

  const { data: positions } = await supabase
    .from('election_positions') // or wherever positions are stored
    .select('*')
    .order('display_order', { ascending: true });

  if (error || !election) {
    // Show 404 page if no election found
    notFound();
  }

  return (
    <main className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">{`Nominate Yourself — ${election.title}`}</h1>
      <p className="mb-6">{election.description}</p>
      <NominateForm
        electionId={election.id}
        userId={user?.id}
        positions={positions ?? []}
        member={member}
      />
    </main>
  );
}
