'use client';

import type { Tables } from '@/types_db';
import { must } from '~/lib/api';
import { useSession } from '~/lib/session';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

export type Me = {
  userId: string;
  email: string;
  fullName: string | null;
  isAdmin: boolean;
  /** The member's own row, or null before they apply. */
  member: Tables<'members'> | null;
  /** Approved and active: the same rule as current_user_is_active_member() in RLS. */
  isActive: boolean;
};

/** The signed-in person: their users row and member row, read under RLS. */
export function useMember() {
  const user = useSession().session?.user;
  return useData<Me>(async () => {
    if (!user) throw new Error('Sign in to continue.');
    const [profile, member] = await Promise.all([
      must(supabase.from('users').select('full_name, is_admin').eq('id', user.id).maybeSingle()),
      must(supabase.from('members').select('*').eq('user_id', user.id).maybeSingle())
    ]);
    return {
      userId: user.id,
      email: user.email ?? '',
      fullName: profile?.full_name ?? member?.fullName ?? null,
      isAdmin: !!profile?.is_admin,
      member,
      isActive: !!member?.isApproved && member.status === 'active'
    };
  }, [user?.id]);
}
