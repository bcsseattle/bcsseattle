'use server';
import { z } from 'zod';
import { createDonation, getOrCreateDonor } from '../supabase/admin';
import { Donation, DonationFormSchema, Donor } from '@/types';

export async function submitDonation(
  values: z.infer<typeof DonationFormSchema>
) {
  try {
    const donorDetails: Omit<Donor, 'id'> = {
      donor_type: values.donorType || 'individual',
      full_name: values.donorName || null,
      organization_name: values.organizationName || null,
      email: values.email,
      phone: values.phone || null,
      address: values.address || null,
      city: values.city || null,
      state: values.state || null,
      zip_code: values.zip || null,
      country: values.country || null,
      registration_date: new Date().toISOString(),
      stripe_customer_id: null,
      user_id: values.userId || null
    };

    const { data: donor, error } = await getOrCreateDonor(donorDetails);
    if (error) {
      return {
        donation: null,
        donor: null,
        error
      };
    }

    const donationDetails: Omit<Donation, 'id'> = {
      donor_id: donor!.id,
      is_anonymous: values.isAnonymous,
      donation_amount: Number(values.amount) * 100,
      donation_date: new Date().toISOString(),
      payment_method: values.paymentMethod,
      currency: 'USD',
      non_cash_description: values.nonCashDescription || null,
      goods_or_services_provided: null,
      goods_services_description: null,
      intangible_benefits: null,
      stripe_payment_id: null,
      stripe_customer_id: null,
      tax_receipt_generated: false,
      purpose: values.purpose,
      goods_services_estimate: null,
      donation_status: 'pending',
      donation_interval: values.frequency === 'one_time' ? null : (values.frequency as any),
      donation_type: values.isRecurring ? 'recurring' : 'one_time',
      donation_description: null
    };
    const { data: donation, error: donationError } =
      await createDonation(donationDetails);
    if (donationError) {
      return {
        donation: null,
        donor: null,
        error: donationError
      };
    }
    return {
      donation,
      donor: donor as Donor,
      error: null
    };
  } catch (error) {
    console.error(error);
    return {
      donation: null,
      donor: null,
      error: new Error('Unable to process donation.')
    };
  }
}
