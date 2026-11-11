'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import { getStatusRedirect } from '@/utils/helpers';
import { dbMessage } from '@/utils/elections/photos';

/**
 * Member initiative proposals (plan B17-B20). Each calls an initiative_*
 * database function with the member's own session; the functions check the
 * window, eligibility, the limit of 3 and who may do what.
 */

export type ProposalState = { error?: string; values?: Record<string, string> };

async function session() {
  if (!(await checkFeatureFlag('enableElectionManagement'))) redirect('/elections');
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  return supabase;
}

const fields = (formData: FormData) => ({
  title: String(formData.get('title') ?? '').trim(),
  description: String(formData.get('description') ?? '').trim(),
  url: String(formData.get('url') ?? '').trim()
});

export async function proposeInitiative(electionId: string, _: ProposalState, formData: FormData): Promise<ProposalState> {
  const supabase = await session();
  const values = fields(formData);
  const { error } = await supabase.rpc('initiative_propose', {
    p_election: electionId,
    p_title: values.title,
    p_description: values.description,
    p_url: values.url || undefined
  });
  if (error) return { error: dbMessage(error), values };
  revalidatePath(`/elections/${electionId}`);
  redirect(getStatusRedirect(`/elections/${electionId}`, 'Initiative proposed.', 'An admin reviews it after nominations close.'));
}

export async function updateProposal(
  electionId: string,
  proposalId: string,
  _: ProposalState,
  formData: FormData
): Promise<ProposalState> {
  const supabase = await session();
  const values = fields(formData);
  const { error } = await supabase.rpc('initiative_proposal_update', {
    p_proposal: proposalId,
    p_title: values.title,
    p_description: values.description,
    p_url: values.url || undefined
  });
  if (error) return { error: dbMessage(error), values };
  redirect(getStatusRedirect(`/elections/${electionId}`, 'Proposal updated.', ''));
}

export async function withdrawProposal(electionId: string, proposalId: string): Promise<ProposalState> {
  const supabase = await session();
  const { error } = await supabase.rpc('initiative_proposal_withdraw', { p_proposal: proposalId });
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/elections/${electionId}`);
  redirect(getStatusRedirect(`/elections/${electionId}`, 'Proposal withdrawn.', ''));
}
