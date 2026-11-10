import React from 'react';
import { notFound, redirect } from 'next/navigation';
import NominateForm from '@/components/nominate-form';
import { createClient } from '@/utils/supabase/server';
import { BreadcrumbName } from '@/components/ui/breadcrumbs';

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

  // This election's own positions, not every type's (W8).
  const { data: positions } = await supabase
    .from('ballot_positions')
    .select('id, position:title, description')
    .eq('election_id', id)
    .order('display_order', { ascending: true });

  if (error || !election) {
    // Show 404 page if no election found
    notFound();
  }

  return (
    <div className="max-w-3xl">
      <BreadcrumbName id={election.id} name={election.title} />
      <NominateForm
        electionTitle={election.title}
        electionId={election.id}
        userId={user?.id}
        positions={positions ?? []}
        member={member}
      />
    </div>
  );
}
