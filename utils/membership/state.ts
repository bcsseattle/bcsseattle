import type { Tables } from '@/types_db';

/**
 * Where a member stands: one rule for the website and the app (W25). Active
 * needs approval and status 'active', as current_user_is_active_member() does
 * in RLS; an unapproved application still marked pending is pending.
 * Client-safe (no server imports).
 */
export type Membership = 'none' | 'pending' | 'rejected' | 'inactive' | 'active';

export function membershipOf(member: Pick<Tables<'members'>, 'isApproved' | 'status'> | null | undefined): Membership {
  if (!member) return 'none';
  if (member.isApproved && member.status === 'active') return 'active';
  if (member.status === 'rejected') return 'rejected';
  if (!member.isApproved && member.status === 'pending') return 'pending';
  return 'inactive';
}

/** Each state in words (status is never colour alone), with its badge tone. */
export const MEMBERSHIP = {
  none: { label: 'Not a member', tone: 'neutral' },
  active: { label: 'Active member', tone: 'green' },
  pending: { label: 'Application pending', tone: 'orange' },
  rejected: { label: 'Not approved', tone: 'red' },
  inactive: { label: 'Membership inactive', tone: 'neutral' }
} as const;

export const memberState = (member: Parameters<typeof membershipOf>[0]) => MEMBERSHIP[membershipOf(member)];
