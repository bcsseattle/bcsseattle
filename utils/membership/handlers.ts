'use server';

import {
  getURL,
  getErrorRedirect,
  getStatusRedirect,
  getPriceString
} from 'utils/helpers';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { createMember, upsertEmailLogs } from '../supabase/admin';
import { User } from '@supabase/supabase-js';
import { MemberRegistrationFormSchema } from '@/types';
import Stripe from 'stripe';

export async function registerMember(
  values: z.infer<typeof MemberRegistrationFormSchema>
) {
  try {
    const supabase = await createClient();
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

    const { data, error } = await createMember(createMemberDetails);
    if (error) {
      console.error('Error creating member:', error);
      // throw new Error('Failed to create member');
    }

    await sendWelecomEmail(user);

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
export async function sendWelecomEmail(User: User) {
  const api_url = process.env.NEXT_PUBLIC_SITE_URL + '/api/send-email/welcome';
  debugger;
  try {
    const response = await fetch(api_url, {
      method: 'POST',
      body: JSON.stringify({
        fullName: User.user_metadata.full_name,
        email: User.email
      })
    });
    return response;
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
}

export async function sendPaymentFailedEmail(charnge: Stripe.Charge) {
  const api_url =
    process.env.NEXT_PUBLIC_SITE_URL + '/api/send-email/payment-failed';
  try {
    const recipient = charnge.billing_details.email as string;
    const today = new Date().toISOString().split('T')[0];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('recipient', recipient)
      .gte('sent_at', `${today}T00:00:00Z`)
      .lte('sent_at', `${today}T23:59:59Z`);

    if (error || data?.length > 0) {
      return new Response('Email already sent today.', { status: 200 });
    }

    const response = await fetch(api_url, {
      method: 'POST',
      body: JSON.stringify({
        email: charnge.billing_details.email,
        name: charnge.billing_details.name,
        amount: getPriceString(charnge.amount),
        failureMessage: charnge.failure_message,
        retryUrl: getURL('/account')
      })
    });

    await upsertEmailLogs({
      recipient,
      subject: 'Payment Failed',
      purpose: 'payment-failed',
      sent_at: new Date().toISOString()
    });
    return response;
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
}
