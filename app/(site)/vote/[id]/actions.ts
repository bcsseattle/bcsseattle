'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { eventVotingOpen } from '@/utils/elections/event-voting';

/**
 * Voting at an event (allowGuestVoting): anyone at the event enters their
 * email and signs in with the code we send, and an account is made if they
 * have none. Signing in puts them on the voter roll (at_event), whatever their
 * membership. The ballot then runs its usual checks, including one vote per
 * account, so someone who already voted online can't vote again.
 */

export type CodeState = { email?: string; sent?: boolean; error?: string };

const CLOSED = 'Voting at this event isn’t open. Ask a volunteer, or sign in at bcsseattle.org to vote.';

const Email = z.string().trim().toLowerCase().email();

export async function sendBallotCode(id: string, _: CodeState, formData: FormData): Promise<CodeState> {
  const email = Email.safeParse(formData.get('email'));
  if (!email.success) return { error: 'Enter your email address.', email: String(formData.get('email') ?? '') };
  if (!(await eventVotingOpen(id))) return { error: CLOSED };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email: email.data, options: { shouldCreateUser: true } });
  if (error) {
    console.error('event voting code not sent', error.status, error.message);
    return {
      error:
        error.status === 429
          ? 'Lots of codes are going out right now. Wait a minute and try again.'
          : 'We couldn’t send a code just now. Try again in a moment.',
      email: email.data
    };
  }
  return { sent: true, email: email.data };
}

export async function verifyBallotCode(id: string, _: CodeState, formData: FormData): Promise<CodeState> {
  const email = Email.safeParse(formData.get('email'));
  const token = String(formData.get('code') ?? '').replace(/\s/g, '');
  if (!email.success) return { error: 'Enter your email address.' };
  const back = { sent: true, email: email.data };
  if (!/^\d{6,10}$/.test(token)) return { ...back, error: 'Enter the code from the email.' };
  if (!(await eventVotingOpen(id))) return { error: CLOSED };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: email.data, token, type: 'email' });
  if (error || !data.user) return { ...back, error: 'That code didn’t work. Check it, or send a new one.' };

  const { error: rollError } = await supabaseAdmin
    .from('election_voters')
    .upsert({ election_id: id, user_id: data.user.id, at_event: true }, { onConflict: 'election_id,user_id' });
  if (rollError) {
    console.error('event voter not added to the roll', rollError.message);
    return { ...back, error: 'We couldn’t open your ballot just now. Try the code again.' };
  }
  redirect(`/elections/${id}/vote`);
}
