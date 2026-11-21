'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { eventVotingOpen } from '@/utils/elections/event-voting';

/**
 * Voting at an event (enableEventVoting): a member scans the QR code, enters
 * their email and signs in with the code we send. Only voters on the roll get
 * a code, and the reply is the same either way, so the page doesn't tell
 * anyone who is on the roll. No accounts are created. The ballot then runs its
 * usual checks (ballotRefusal), so this only replaces signing in.
 */

export type CodeState = { email?: string; sent?: boolean; error?: string };

const CLOSED = 'Voting at this event isn’t open. Ask a volunteer, or sign in at bcsseattle.org to vote.';

const Email = z.string().trim().toLowerCase().email();

export async function sendBallotCode(id: string, _: CodeState, formData: FormData): Promise<CodeState> {
  const email = Email.safeParse(formData.get('email'));
  if (!email.success) return { error: 'Enter the email you registered with.', email: String(formData.get('email') ?? '') };
  if (!(await eventVotingOpen(id))) return { error: CLOSED };

  const { data: onRoll, error: rollError } = await supabaseAdmin.rpc('event_voter_on_roll', {
    p_election: id,
    p_email: email.data
  });
  if (rollError) {
    console.error('event_voter_on_roll failed', rollError.message);
    return { error: 'We couldn’t send a code just now. Try again in a moment.', email: email.data };
  }
  if (onRoll) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({ email: email.data, options: { shouldCreateUser: false } });
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
  }
  return { sent: true, email: email.data };
}

export async function verifyBallotCode(id: string, _: CodeState, formData: FormData): Promise<CodeState> {
  const email = Email.safeParse(formData.get('email'));
  const token = String(formData.get('code') ?? '').replace(/\s/g, '');
  if (!email.success) return { error: 'Enter the email you registered with.' };
  const back = { sent: true, email: email.data };
  if (!/^\d{6,10}$/.test(token)) return { ...back, error: 'Enter the code from the email.' };
  if (!(await eventVotingOpen(id))) return { error: CLOSED };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token, type: 'email' });
  if (error) return { ...back, error: 'That code didn’t work. Check it, or send a new one.' };
  redirect(`/elections/${id}/vote`);
}
