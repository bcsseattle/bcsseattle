'use server';

import {
  getURL,
  getErrorRedirect,
  getStatusRedirect,
  getPriceString,
  formatPhoneNumber
} from 'utils/helpers';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import {
  createMember,
  retrieveMember,
  upsertEmailLogs
} from '../supabase/admin';
import { User } from '@supabase/supabase-js';
import { MemberRegistrationFormSchema } from '@/types';
import Stripe from 'stripe';
import { getTwilio } from '@/utils/twilio/client';

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
      isApproved: false,
      membershipType,
      totalMembersInFamily,
      terms
    };

    const { data, error } = await createMember(createMemberDetails);
    if (error) {
      console.error('Error creating member:', error);
      throw new Error('Failed to create member');
    }
    await sendWelecomEmail(user);
    await sendNewMemberJoinedEmail(user);

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
  // debugger;
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

export async function sendNewMemberJoinedEmail(User: User) {
  const api_url = process.env.NEXT_PUBLIC_SITE_URL + '/api/send-email/new-member-joined';
  // debugger;
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
        retryUrl: getURL(`/account?redirectTo=account`)
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

async function getCustomerPhone(
  phone: string,
  userId: string
): Promise<string | null> {
  if (phone) return phone;

  const member = await retrieveMember({ user_id: userId });
  return member?.phone || null;
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS(
  phone: string,
  body: string,
  userId: string
): Promise<SMSResult> {
  try {
    if (!body?.trim()) {
      throw new Error('Message body is required');
    }

    const customerPhone = await getCustomerPhone(phone, userId);

    if (!customerPhone) {
      throw new Error(`No phone number found for user: ${userId}`);
    }

    const twilio = getTwilio();
    const message = await twilio.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formatPhoneNumber(customerPhone)
    });

    console.log(`SMS sent successfully - MessageID: ${message.sid}`);

    return {
      success: true,
      messageId: message.sid
    };
  } catch (error: any) {
    console.error('SMS send failed:', error);
    return {
      success: false,
      error: error?.message
    };
  }
}
