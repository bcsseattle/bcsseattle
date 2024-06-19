'use server';

import { getURL, getErrorRedirect, getStatusRedirect } from 'utils/helpers';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { createMember } from '../supabase/admin';
import { User } from '@supabase/supabase-js';
import { MemberRegistrationFormSchema } from '@/types';

export async function registerMember(
  values: z.infer<typeof MemberRegistrationFormSchema>
) {
  try {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return redirect('/signin');
    }

    const {
      fullName,
      phone,
      address,
      address2,
      city,
      state,
      zip,
      membershipType,
      totalMembersInFamily,
      terms
    } = values;

    const createMemberDetails = {
      fullName,
      phone,
      address,
      address2,
      city,
      state,
      zip,
      user_id: user.id,
      status: 'inactive',
      membershipType,
      totalMembersInFamily,
      terms
    };

    await createMember(createMemberDetails);

    return getStatusRedirect(
      '/membership-fee',
      'Success!',
      'You have successfully registered as a member.'
    );
  } catch (error) {
    console.error(error);
    return getErrorRedirect(
      '/register',
      'Something went wrong.',
      'Your membership account could not be created. You may already be a member. Please contact support.'
    );
  }
}
