import { NextResponse } from 'next/server';
import { getTotalCustomerSpent } from '@/utils/supabase/admin';
import { currentUser, fail, isActiveMember, unauthorized } from '@/utils/app-api';

/** A member profile's "Total contributions" (cents), as /members/[id] shows it. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorized();
  if (!(await isActiveMember(supabase, user.id))) return fail('The member directory is for active members.', 403);

  const { id } = await params;
  const { data: member } = await supabase
    .from('members')
    .select('customers(stripe_customer_id)')
    .eq('id', id)
    .maybeSingle();
  if (!member) return fail('Member not found.', 404);

  const customerId = member.customers?.stripe_customer_id;
  const total = customerId ? await getTotalCustomerSpent({ customerId }) : 0;
  return NextResponse.json({ total });
}
