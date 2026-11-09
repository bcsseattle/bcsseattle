'use server';

import { z } from 'zod';
import { getErrorRedirect, getStatusRedirect } from 'utils/helpers';
import { createClient } from '@/utils/supabase/server';
import { FundraiserFormSchema } from '@/types/forms';
import { Fundraiser } from '@/types';
import crypto from 'crypto';

// Helper function to generate confirmation code for donations
function generateConfirmationCode(): string {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

// Helper function to get client IP from headers
function getClientIP(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headers.get('x-real-ip') || 'unknown';
}

export async function createFundraiser(
  formValue: z.infer<typeof FundraiserFormSchema>
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Verify user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return { success: false, error: 'Only admins can create fundraisers' };
    }

        // Create fundraiser
    const { data: fundraiser, error: createError } = await supabase
      .from('fundraisers')
      .insert({
        title: formValue.title,
        description: formValue.description || null,
        goal_amount: Number(formValue.goal_amount),
        current_amount: 0,
        ends_at: formValue.ends_at ? new Date(formValue.ends_at).toISOString() : null,
        category: formValue.category,
        image_url: formValue.image_url || null,
        created_by: user.id,
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating fundraiser:', createError);
      return { success: false, error: 'Failed to create fundraiser' };
    }

    return { success: true, fundraiser };

  } catch (error) {
    console.error('Error in createFundraiser:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateFundraiser(
  fundraiserId: string,
  formValue: z.infer<typeof FundraiserFormSchema>
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Verify user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return { success: false, error: 'Only admins can update fundraisers' };
    }

    // Update fundraiser
    const { data: fundraiser, error: updateError } = await supabase
      .from('fundraisers')
      .update({
        ...formValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', fundraiserId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating fundraiser:', updateError);
      return { success: false, error: 'Failed to update fundraiser' };
    }

    return { success: true, fundraiser };

  } catch (error) {
    console.error('Error in updateFundraiser:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function submitDonation(
  fundraiserId: string,
  amount: number,
  donorName: string,
  isAnonymous: boolean = false,
  message?: string,
  headers?: Headers,
  donorEmail?: string,
  donorPhone?: string
) {
  try {
    const supabase = await createClient();

    // First, create or get the fundraiser_donor
    let fundraiserDonorId: string | undefined;
    if (donorEmail) {
      // Check if donor exists
      const { data: existingDonor } = await supabase
        .from('fundraiser_donors')
        .select('id')
        .eq('email', donorEmail)
        .single();

      if (existingDonor) {
        fundraiserDonorId = existingDonor.id;
        // Update donor information
        await supabase
          .from('fundraiser_donors')
          .update({
            full_name: donorName,
            phone: donorPhone,
            updated_at: new Date().toISOString()
          })
          .eq('id', fundraiserDonorId);
      } else {
        // Create new donor
        const { data: newDonor, error: donorError } = await supabase
          .from('fundraiser_donors')
          .insert({
            email: donorEmail,
            full_name: donorName,
            phone: donorPhone,
            is_anonymous: isAnonymous
          })
          .select()
          .single();

        if (donorError) {
          console.error('Error creating donor:', donorError);
          return { success: false, error: 'Failed to create donor record' };
        }
        fundraiserDonorId = newDonor.id;
      }
    }

    // Validate fundraiser exists and is active
    const { data: fundraiser, error: fundraiserError } = await supabase
      .from('fundraisers')
      .select('id, status, ends_at')
      .eq('id', fundraiserId)
      .single();

    if (fundraiserError || !fundraiser) {
      return { success: false, error: 'Fundraiser not found' };
    }

    if (fundraiser.status !== 'active') {
      return { success: false, error: 'This fundraiser is not currently active' };
    }

    if (fundraiser.ends_at && new Date() > new Date(fundraiser.ends_at)) {
      return { success: false, error: 'This fundraiser has ended' };
    }

    // Generate confirmation code
    const confirmationCode = generateConfirmationCode();
    const clientIP = headers ? getClientIP(headers) : 'unknown';
    const userAgent = headers?.get('user-agent') || 'unknown';

    // Create donation record
    const donationData = {
      fundraiser_id: fundraiserId,
      fundraiser_donor_id: donorEmail ? fundraiserDonorId : null,
      amount,
      donor_name: donorName,
      is_anonymous: isAnonymous,
      message,
      payment_status: 'pending'
    };

    const { data: donation, error: donationError } = await supabase
      .from('fundraiser_donations')
      .insert(donationData)
      .select()
      .single();

    if (donationError) {
      console.error('Error creating donation:', donationError);
      return { success: false, error: 'Failed to process donation' };
    }

    return {
      success: true,
      confirmationCode,
      donation
    };

  } catch (error) {
    console.error('Error in submitDonation:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function createFundraiserUpdate(
  fundraiserId: string,
  title: string,
  content: string
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Verify user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return { success: false, error: 'Only admins can create updates' };
    }

    // Create update
    const { data: update, error: updateError } = await supabase
      .from('fundraiser_updates')
      .insert({
        fundraiser_id: fundraiserId,
        content: content,
        created_by: user.id
      })
      .select()
      .single();

    if (updateError) {
      console.error('Error creating update:', updateError);
      return { success: false, error: 'Failed to create update' };
    }

    return { success: true, update };

  } catch (error) {
    console.error('Error in createFundraiserUpdate:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getDonationStatus(fundraiserId: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get user's donations for this fundraiser
    const { data: donations, error: donationsError } = await supabase
      .from('fundraiser_donations')
      .select(`
        id,
        amount,
        donor_name,
        message,
        is_anonymous,
        payment_status,
        created_at
      `)
      .eq('fundraiser_id', fundraiserId)
      .eq('donor_id', user.id)
      .order('created_at', { ascending: false });

    if (donationsError) {
      console.error('Error fetching donations:', donationsError);
      return { success: false, error: 'Failed to fetch donation status' };
    }

    return {
      success: true,
      hasDonated: donations && donations.length > 0,
      donations: donations || []
    };

  } catch (error) {
    console.error('Error in getDonationStatus:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
