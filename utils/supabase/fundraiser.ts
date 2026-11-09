import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types_db';
import { toDateTime } from '../helpers';

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
  amount: number;
}) {
  const { payment_intent_id, fundraiser_id, donation_id, payment_status, amount } = data;

  // Update fundraiser_donations table
  const { error: donationError } = await supabaseAdmin
    .from('fundraiser_donations')
    .update({
      payment_status,
      payment_intent_id
    })
    .eq('id', donation_id);

  if (donationError) throw donationError;

  // Update fundraiser's current_amount if payment is completed
  if (payment_status === 'completed') {
    // First get the current amount
    const { data: fundraiser, error: fetchError } = await supabaseAdmin
      .from('fundraisers')
      .select('current_amount')
      .eq('id', fundraiser_id)
      .single();

    if (fetchError) throw fetchError;

    const { error: fundraiserError } = await supabaseAdmin
      .from('fundraisers')
      .update({
        current_amount: (fundraiser.current_amount || 0) + amount
      })
      .eq('id', fundraiser_id);

    if (fundraiserError) throw fundraiserError;
  }

  return { success: true };
}
