import type { Tables } from '@/types_db';
import { formatMoney } from '@/utils/format';

/** The member's state in words (status is never colour alone), with its badge tone. */
export function memberState(member: Tables<'members'> | null) {
  if (!member) return { label: 'Not a member', tone: 'neutral' } as const;
  if (member.isApproved && member.status === 'active') return { label: 'Active member', tone: 'green' } as const;
  if (member.status === 'pending') return { label: 'Application pending', tone: 'orange' } as const;
  if (member.status === 'rejected') return { label: 'Not approved', tone: 'red' } as const;
  return { label: 'Inactive', tone: 'neutral' } as const;
}

/** "USD 5.00 / month", "USD 30.00 / 6 months", "USD 20.00" (one-time). */
export function priceLabel(price: Pick<Tables<'prices'>, 'unit_amount' | 'interval' | 'interval_count'>) {
  const amount = formatMoney(price.unit_amount ?? 0);
  if (!price.interval) return amount;
  const count = price.interval_count ?? 1;
  return `${amount} / ${count === 1 ? price.interval : `${count} ${price.interval}s`}`;
}
