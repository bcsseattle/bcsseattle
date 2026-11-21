import 'server-only';
import { z } from 'zod';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import { PHASE_COLUMNS } from '@/utils/elections/access';
import { electionPhase } from '@/utils/elections/rules';

/**
 * Voting at an event (/vote/<election>) is open when the enableEventVoting
 * flag is on, an admin has opened it for the election and voting is open.
 * Returns the election (title for the page) or null.
 */
export async function eventVotingOpen(id: string) {
  if (!z.string().uuid().safeParse(id).success || !(await checkFeatureFlag('enableEventVoting'))) return null;
  const { data: election } = await supabaseAdmin
    .from('elections')
    .select(`title, event_voting, ${PHASE_COLUMNS}`)
    .eq('id', id)
    .maybeSingle();
  return election?.event_voting && electionPhase(election).votingOpen ? election : null;
}
