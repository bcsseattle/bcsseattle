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
import { revalidatePath } from 'next/cache';
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
    await sendNewMemberJoinedEmail(user, createMemberDetails);

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

export async function sendNewMemberJoinedEmail(User: User, memberData?: any) {
  const api_url = process.env.NEXT_PUBLIC_SITE_URL + '/api/send-email/new-member-joined';
  // debugger;
  try {
    // Try to get the name from multiple sources
    const fullName = memberData?.fullName || 
                     User.user_metadata?.full_name || 
                     User.user_metadata?.fullName ||
                     User.user_metadata?.name ||
                     `${User.user_metadata?.first_name || ''} ${User.user_metadata?.last_name || ''}`.trim() ||
                     '';
    
    const response = await fetch(api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: fullName,
        email: User.email
      })
    });
    return response;
  } catch (error) {
    console.error('Error sending new member joined email:', error);
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

// Admin member management actions
export async function approveMember(memberId: string) {
  console.log('approveMember called with ID:', memberId);
  
  const supabase = await createClient();
  
  // Check if user is admin
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('Auth error:', authError);
    throw new Error('Not authenticated');
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Profile error:', profileError);
    throw new Error('Failed to verify admin status');
  }

  if (!userProfile?.is_admin) {
    throw new Error('Not authorized');
  }

  // First, check if the member exists
  const { data: existingMember, error: checkError } = await supabase
    .from('members')
    .select('id, fullName, status, isApproved')
    .eq('id', memberId)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking member existence:', checkError);
    throw new Error(`Failed to find member: ${checkError.message}`);
  }

  if (!existingMember) {
    throw new Error('Member not found');
  }

  console.log('Found member:', existingMember);

  // Update member status
  const { data, error } = await supabase
    .from('members')
    .update({ 
      status: 'active',
      isApproved: true
    })
    .eq('id', memberId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Update error:', error);
    throw new Error(`Failed to approve member: ${error.message}`);
  }

  if (!data) {
    throw new Error('Member not found or update failed');
  }

  console.log('Update successful:', data);
  revalidatePath('/admin/members');
  return data;
}

export async function rejectMember(memberId: string) {
  console.log('rejectMember called with ID:', memberId);
  
  const supabase = await createClient();
  
  // Check if user is admin
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('Auth error:', authError);
    throw new Error('Not authenticated');
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Profile error:', profileError);
    throw new Error('Failed to verify admin status');
  }

  if (!userProfile?.is_admin) {
    throw new Error('Not authorized');
  }

  // First, check if the member exists
  const { data: existingMember, error: checkError } = await supabase
    .from('members')
    .select('id, fullName, status, isApproved')
    .eq('id', memberId)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking member existence:', checkError);
    throw new Error(`Failed to find member: ${checkError.message}`);
  }

  if (!existingMember) {
    throw new Error('Member not found');
  }

  console.log('Found member:', existingMember);

  // Update member status
  const { data, error } = await supabase
    .from('members')
    .update({ 
      status: 'inactive',
      isApproved: false
    })
    .eq('id', memberId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Update error:', error);
    throw new Error(`Failed to reject member: ${error.message}`);
  }

  if (!data) {
    throw new Error('Member not found or update failed');
  }

  console.log('Update successful:', data);
  revalidatePath('/admin/members');
  return data;
}

export async function reactivateMember(memberId: string) {
  console.log('reactivateMember called with ID:', memberId);
  
  const supabase = await createClient();
  
  // Check if user is admin
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('Auth error:', authError);
    throw new Error('Not authenticated');
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Profile error:', profileError);
    throw new Error('Failed to verify admin status');
  }

  if (!userProfile?.is_admin) {
    throw new Error('Not authorized');
  }

  // First, check if the member exists
  const { data: existingMember, error: checkError } = await supabase
    .from('members')
    .select('id, fullName, status, isApproved')
    .eq('id', memberId)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking member existence:', checkError);
    throw new Error(`Failed to find member: ${checkError.message}`);
  }

  if (!existingMember) {
    throw new Error('Member not found');
  }

  console.log('Found member:', existingMember);

  // Update member status
  const { data, error } = await supabase
    .from('members')
    .update({ 
      status: 'active',
      isApproved: true
    })
    .eq('id', memberId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Update error:', error);
    throw new Error(`Failed to reactivate member: ${error.message}`);
  }

  if (!data) {
    throw new Error('Member not found or update failed');
  }

  console.log('Update successful:', data);
  revalidatePath('/admin/members');
  return data;
}
