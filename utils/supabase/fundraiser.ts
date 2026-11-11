import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types_db';

// Create a single supabase client for interacting with your database
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function updateFundraiserDonation(data: {
  payment_intent_id: string | null;
  fundraiser_id: string;
  donation_id: string;
  payment_status: 'completed' | 'failed' | 'pending';
  amount?: number;
}) {
  const { payment_intent_id, donation_id, payment_status } = data;

  // Update fundraiser_donations table
  const { error: donationError } = await supabaseAdmin
    .from('fundraiser_donations')
    .update({
      payment_status,
      payment_intent_id
    })
    .eq('id', donation_id);

  if (donationError) throw donationError;

  // fundraisers.current_amount is maintained by the update_fundraiser_amount
  // trigger, which counts a donation once, when it first becomes completed;
  // a replayed webhook changes nothing (BUG-012).
  return { success: true };
}
