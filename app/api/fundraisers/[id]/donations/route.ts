import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DonationFormSchema } from '@/types';
import type { Database } from '@/types_db';
import { getSession } from '@/utils/auth-helpers/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  try {
    const { data: donations, error } = await supabase
      .from('fundraiser_donations')
      .select('*, donors(full_name, email)')
      .eq('fundraiser_id', params.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Filter out sensitive information for anonymous donations
    const sanitizedDonations = donations.map(donation => {
      if (donation.is_anonymous) {
        return {
          ...donation,
          donors: {
            full_name: 'Anonymous Donor'
          }
        };
      }
      return donation;
    });

    return NextResponse.json(sanitizedDonations);
  } catch (error) {
    console.error('Error fetching fundraiser donations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  try {
    // Get the authenticated user if any
    const session = await getSession();
    const user = session?.user;

    // Parse and validate request body
    const json = await request.json();
    const donationData = DonationFormSchema.parse(json);

    // Verify fundraiser exists and is active
    const { data: fundraiser, error: fundraiserError } = await supabase
      .from('fundraisers')
      .select()
      .eq('id', params.id)
      .single();

    if (fundraiserError || !fundraiser) {
      return NextResponse.json(
        { error: 'Fundraiser not found' },
        { status: 404 }
      );
    }

    if (fundraiser.status !== 'active') {
      return NextResponse.json(
        { error: 'This fundraiser is not currently accepting donations' },
        { status: 400 }
      );
    }

    // Parse amount
    const amount = parseFloat(donationData.amount);
    
    // Create or get donor
    let donorId;
    if (user) {
      // For authenticated users, check if they already have a donor record
      const { data: existingDonor } = await supabase
        .from('donors')
        .select()
        .eq('user_id', user.id)
        .single();

      if (existingDonor) {
        donorId = existingDonor.id;
      } else {
        // Create new donor record for authenticated user
        const { data: newDonor, error: donorError } = await supabase
          .from('donors')
          .insert({
            user_id: user.id,
            donor_type: donationData.donorType,
            email: donationData.email,
            full_name: donationData.donorName,
            organization_name: donationData.organizationName,
            phone: donationData.phone,
            address: donationData.address,
            city: donationData.city,
            state: donationData.state,
            zip_code: donationData.zip,
            country: donationData.country,
          })
          .select()
          .single();

        if (donorError) {
          return NextResponse.json(
            { error: 'Failed to create donor record' },
            { status: 500 }
          );
        }
        donorId = newDonor.id;
      }
    } else {
      // Create donor record for guest user
      const { data: newDonor, error: donorError } = await supabase
        .from('donors')
        .insert({
          donor_type: donationData.donorType,
          email: donationData.email,
          full_name: donationData.donorName,
          organization_name: donationData.organizationName,
          phone: donationData.phone,
          address: donationData.address,
          city: donationData.city,
          state: donationData.state,
          zip_code: donationData.zip,
          country: donationData.country,
        })
        .select()
        .single();

      if (donorError) {
        return NextResponse.json(
          { error: 'Failed to create donor record' },
          { status: 500 }
        );
      }
      donorId = newDonor.id;
    }

    // Create donation record
    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .insert({
        donation_amount: amount,
        donation_type: donationData.frequency === 'one_time' ? 'one_time' : 'recurring',
        donation_interval: donationData.frequency !== 'one_time' ? donationData.frequency : null,
        donor_id: donorId,
        purpose: donationData.purpose,
        payment_method: donationData.paymentMethod,
        currency: donationData.currency || 'USD',
        is_anonymous: donationData.isAnonymous,
        donation_status: 'pending'
      })
      .select()
      .single();

    if (donationError) {
      return NextResponse.json(
        { error: 'Failed to create donation record' },
        { status: 500 }
      );
    }

    // Create fundraiser donation record
    const { data: fundraiserDonation, error: fundraiserDonationError } = await supabase
      .from('fundraiser_donations')
      .insert({
        amount: amount,
        fundraiser_id: params.id,
        donor_id: donorId,
        is_anonymous: donationData.isAnonymous,
        message: donationData.message
      })
      .select('*, donors(full_name, email)')
      .single();

    if (fundraiserDonationError) {
      return NextResponse.json(
        { error: 'Failed to create fundraiser donation record' },
        { status: 500 }
      );
    }

    // Return sanitized response
    if (fundraiserDonation.is_anonymous) {
      return NextResponse.json({
        ...fundraiserDonation,
        donors: {
          full_name: 'Anonymous Donor'
        }
      });
    }

    return NextResponse.json(fundraiserDonation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid donation data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error processing donation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
