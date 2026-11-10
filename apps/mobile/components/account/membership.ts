import { toast } from 'sonner';
import { api, must } from '~/lib/api';
import { openOutside } from '~/lib/open';
import { supabase } from '~/lib/supabase';

/** The member's active plan and how many gifts they have made, read under RLS (filtered to them: active members can read others' rows). */
export async function loadMembership(userId: string) {
  const [subscriptions, donors] = await Promise.all([
    must(
      supabase
        .from('subscriptions')
        .select('*, prices(*, products(*))')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created', { ascending: false })
    ),
    must(supabase.from('donors').select('id').eq('user_id', userId))
  ]);
  const donorIds = (donors ?? []).map((d) => d.id);
  const { count, error } = donorIds.length
    ? await supabase.from('donations').select('id', { count: 'exact', head: true }).in('donor_id', donorIds)
    : { count: 0, error: null };
  if (error) throw new Error(error.message);
  return { subscription: subscriptions?.[0] ?? null, gifts: count ?? 0 };
}

/** Plan & payment method: the Stripe customer portal, in the system browser. */
export async function openBillingPortal() {
  try {
    const { url } = await api<{ url: string }>('/api/app/billing-portal', { method: 'POST' });
    await openOutside(url);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : String(error));
  }
}
