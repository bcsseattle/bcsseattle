'use server';

import Stripe from 'stripe';
import { stripe } from '@/utils/stripe/config';
import { createClient } from '@/utils/supabase/server';
import {
  createOrRetrieveCustomer,
  getOrCreateUser,
  retrieveMember,
  updateMember,
  updateDonor,
  retrieveSmsNotification,
  updateSmsNotification,
  getStripeCustomer,
  supabaseAdmin
} from '@/utils/supabase/admin';
import {
  getURL,
  getErrorRedirect,
  calculateTrialEndUnixTimestamp,
  formatInvoiceMessage
} from '@/utils/helpers';
import { Donation, Donor, Price } from '@/types';
import { FundraiserDonation } from '@/types/fundraisers';
import { sendSMS } from '../membership/handlers';
import { isMonthlyContribution, monthlyBillingAnchor } from '@/utils/membership/billing';

type CheckoutResponse = {
  errorRedirect?: string;
  sessionId?: string;
  /** The hosted Checkout page; the mobile app opens it in the browser. */
  url?: string;
};

export async function checkoutWithStripe(
  price: Price,
  redirectPath: string = '/account',
  cancelUrl?: string,
  isMembership?: boolean,
  isGenerous?: boolean
): Promise<CheckoutResponse> {
  try {
    // The browser only chooses which price; amount, type and trial come from our
    // copy of the Stripe price (BUG-013).
    const { data: storedPrice } = await supabaseAdmin
      .from('prices')
      .select('*')
      .eq('id', price.id)
      .eq('active', true)
      .maybeSingle();
    if (!storedPrice) throw new Error('This price is not available.');
    price = storedPrice as Price;

    // Get the user from Supabase auth
    const supabase = await createClient();
    const {
      error,
      data: { user }
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error(error);
      throw new Error('Could not get user session.');
    }

    // Retrieve or create the customer in Stripe
    let customer: string;
    try {
      customer = await createOrRetrieveCustomer({
        uuid: user?.id || '',
        email: user?.email || ''
      });
    } catch (err) {
      console.error(err);
      throw new Error('Unable to access customer record.');
    }

    let member: Awaited<ReturnType<typeof retrieveMember>>;
    try {
      member = await retrieveMember({
        user_id: user.id || ''
      });
    } catch (err) {
      console.error(err);
      throw new Error('Unable to access member record.');
    }

    let params: Stripe.Checkout.SessionCreateParams = {
      allow_promotion_codes: false,
      billing_address_collection: 'required',
      customer,
      customer_update: {
        address: 'auto'
      },
      line_items: [
        {
          price: price.id,
          // One per family member, 1 to 5; a missing or zero size counts as 1 (BUG-044).
          quantity:
            isMembership || isGenerous
              ? 1
              : Math.min(Math.max(Math.floor(Number(member?.totalMembersInFamily)) || 1, 1), 5)
        }
      ],
      cancel_url: getURL(cancelUrl),
      success_url: getURL(redirectPath)
    };

    if (price.type === 'recurring') {
      params = {
        ...params,
        mode: 'subscription',
        // The stored price determines billing, shared by web and mobile.
        // Monthly contributions charge the partial period now, rather than
        // giving a free trial until the first full invoice on the 18th.
        subscription_data: isMonthlyContribution(price)
          ? {
              billing_cycle_anchor: monthlyBillingAnchor(),
              proration_behavior: 'create_prorations'
            }
          : {
              trial_end: calculateTrialEndUnixTimestamp(price.trial_period_days)
            }
      };
    } else if (price.type === 'one_time') {
      params = {
        ...params,
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: Number(price.unit_amount),
              product: price.product_id as string
            },
            quantity: 1
          }
        ]
      };
    }

    // Create a checkout session in Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.create(params);
    } catch (err) {
      console.error(err);
      throw new Error('Unable to create checkout session.');
    }

    // Instead of returning a Response, just return the data or error.
    if (session) {
      try {
        await updateMember({
          user_id: user?.id || '',
          email: user?.email || ''
        });
      } catch (err) {
        console.error(err);
        throw new Error('Unable to update member record.');
      }
      return { sessionId: session.id, url: session.url ?? undefined };
    } else {
      throw new Error('Unable to create checkout session.');
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        errorRedirect: getErrorRedirect(
          redirectPath,
          error.message,
          'Please try again later or contact a system administrator.'
        )
      };
    } else {
      return {
        errorRedirect: getErrorRedirect(
          redirectPath,
          'An unknown error occurred.',
          'Please try again later or contact a system administrator.'
        )
      };
    }
  }
}

export async function checkoutWithStripeForDonation(
  price: Price,
  redirectPath: string = '/donation-confirmation',
  cancelUrl: string,
  donor: Donor | null,
  donation: Donation | null
): Promise<CheckoutResponse> {
  try {
    // Charge what was recorded, never an amount sent by the browser (BUG-013).
    const { data: saved } = await supabaseAdmin
      .from('donations')
      .select('*')
      .eq('id', donation?.id ?? '')
      .eq('donation_status', 'pending')
      .maybeSingle();
    const { data: storedPrice } = await supabaseAdmin
      .from('prices')
      .select('*')
      .eq('id', price.id)
      .maybeSingle();
    if (!saved || !storedPrice) throw new Error('Donation not found.');
    donation = saved as Donation;
    price = { ...(storedPrice as Price), unit_amount: saved.donation_amount };

    if (!donor?.email) throw new Error('Missing donor email');
    if (price.type === 'recurring' && !donation.donation_interval) {
      throw new Error('Missing donation interval');
    }
    const { data: user, error: userError } = await getOrCreateUser({
      email: donor.email
    });

    if (!user || userError) {
      console.error(userError);
      throw new Error('Could not create user.');
    }

    // Retrieve or create the customer in Stripe
    let customer: string;
    try {
      if (!user.id || !donor?.email) {
        throw new Error('Missing user ID or email');
      }
      customer = await createOrRetrieveCustomer({
        uuid: user.id,
        email: donor.email
      });
    } catch (err) {
      console.error(err);
      throw new Error('Unable to access customer record.');
    }

    let params: Stripe.Checkout.SessionCreateParams = {
      allow_promotion_codes: false,
      billing_address_collection: 'required',
      customer,
      customer_update: {
        address: 'auto'
      },
      payment_method_types: [(donation.payment_method as Stripe.Checkout.SessionCreateParams.PaymentMethodType | null) || 'card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Number(price.unit_amount),
            product: price.product_id as string,
            recurring: donation.donation_interval ? { interval: donation.donation_interval } : undefined
          },
          quantity: 1
        }
      ],
      cancel_url: getURL(cancelUrl),
      success_url: getURL(redirectPath),
      metadata: {
        type: 'donation',
        donation_id: donation.id
      }
    };

    console.log(
      'Trial end:',
      calculateTrialEndUnixTimestamp(price.trial_period_days)
    );
    if (price.type === 'recurring') {
      params = {
        ...params,
        mode: 'subscription',
        subscription_data: {
          trial_end: calculateTrialEndUnixTimestamp(price.trial_period_days)
        }
      };
    } else if (price.type === 'one_time') {
      console.log('One-time payment', price);
      params = {
        ...params,
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd', // Replace with your desired currency
              unit_amount: Number(price.unit_amount),
              product: price.product_id as string
            },
            quantity: 1
          }
        ]
      };
    }

    // Create a checkout session in Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.create(params);
    } catch (err) {
      console.error(err);
      throw new Error('Unable to create checkout session.');
    }

    // Instead of returning a Response, just return the data or error.
    if (session) {
      try {
        await updateDonor({
          stripe_customer_id: customer,
          email: user?.email || ''
        });
      } catch (err) {
        console.error(err);
        throw new Error('Unable to update donation record.');
      }
      return { sessionId: session.id, url: session.url ?? undefined };
    } else {
      throw new Error('Unable to create checkout session.');
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        errorRedirect: getErrorRedirect(
          cancelUrl,
          error.message,
          'Please try again later or contact a system administrator.'
        )
      };
    } else {
      return {
        errorRedirect: getErrorRedirect(
          cancelUrl,
          'An unknown error occurred.',
          'Please try again later or contact a system administrator.'
        )
      };
    }
  }
}

export async function checkoutWithStripeForFundraiser(
  price: Price,
  redirectPath: string = '/donation-confirmation',
  cancelUrl: string,
  donor: Donor | null,
  donation: FundraiserDonation | null
): Promise<CheckoutResponse> {
  try {
    // Charge what was recorded, never an amount sent by the browser (BUG-013).
    const { data: saved } = await supabaseAdmin
      .from('fundraiser_donations')
      .select('*')
      .eq('id', donation?.id ?? '')
      .eq('payment_status', 'pending')
      .maybeSingle();
    if (!saved) throw new Error('Donation not found.');
    donation = saved as FundraiserDonation;
    price = { ...price, unit_amount: Math.round(Number(saved.amount) * 100) };

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      allow_promotion_codes: false,
      billing_address_collection: 'required',
      customer_email: donor?.email || undefined,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Number(price.unit_amount),
            product_data: {
              name: 'BCS Fundraiser',
              description: donation?.message || undefined
            }
          },
          quantity: 1
        }
      ],
      cancel_url: getURL(cancelUrl),
      success_url: getURL(redirectPath),
      metadata: {
        type: 'fundraiser_donation',
        fundraiser_id: donation?.fundraiser_id || '',
        donation_id: donation?.id || '',
        donor_name: donor?.full_name || 'Anonymous',
        is_anonymous: donation?.is_anonymous?.toString() || 'false'
      }
    };

    // Create a checkout session in Stripe
    const session = await stripe.checkout.sessions.create(params);
    
    if (session) {
      return { sessionId: session.id, url: session.url ?? undefined };
    } else {
      throw new Error('Unable to create checkout session.');
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        errorRedirect: getErrorRedirect(
          cancelUrl,
          error.message,
          'Please try again later or contact a system administrator.'
        )
      };
    } else {
      return {
        errorRedirect: getErrorRedirect(
          cancelUrl,
          'An unknown error occurred.',
          'Please try again later or contact a system administrator.'
        )
      };
    }
  }
}

export async function createStripePortal(currentPath: string, returnPath: string = '/account') {
  try {
    const supabase = await createClient();
    const {
      error,
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      if (error) {
        console.error(error);
      }
      throw new Error('Could not get user session.');
    }

    let customer;
    try {
      customer = await createOrRetrieveCustomer({
        uuid: user.id || '',
        email: user.email || ''
      });
    } catch (err) {
      console.error(err);
      throw new Error('Unable to access customer record.');
    }

    if (!customer) {
      throw new Error('Could not get customer.');
    }

    try {
      const { url } = await stripe.billingPortal.sessions.create({
        customer,
        return_url: getURL(returnPath)
      });
      if (!url) {
        throw new Error('Could not create billing portal');
      }
      return url;
    } catch (err) {
      console.error(err);
      throw new Error('Could not create billing portal');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return getErrorRedirect(
        currentPath,
        error.message,
        'Please try again later or contact a system administrator.'
      );
    } else {
      return getErrorRedirect(
        currentPath,
        'An unknown error occurred.',
        'Please try again later or contact a system administrator.'
      );
    }
  }
}

interface HandleUpcomingInvoiceResult {
  success: boolean;
  error?: string;
}
export async function handleUpcomingInvoice(
  invoice: Stripe.Invoice
): Promise<HandleUpcomingInvoiceResult> {
  try {
    const subscriptionId = invoice.subscription as string;

    if (!invoice.next_payment_attempt) {
      throw new Error('Missing next payment attempt date');
    }

    const dueDate = new Date(invoice.next_payment_attempt * 1000);
    const currentDate = new Date();

    // Check existing notifications
    const { data: smsRecords, error: smsError } = await retrieveSmsNotification(
      subscriptionId,
      currentDate.getMonth() + 1,
      currentDate.getFullYear()
    );

    if (smsError) {
      throw new Error(`Failed to check SMS records: ${smsError?.message}`);
    }

    if (smsRecords.length > 0) {
      console.log(
        `SMS already sent for subscription ${subscriptionId} this month`
      );
      return { success: true };
    }

    // Get customer details
    const customer = (await getStripeCustomer(
      invoice.customer as string
    )) as Stripe.Customer;

    if (!customer?.metadata?.supabaseUUID) {
      throw new Error('Customer metadata missing Supabase UUID');
    }

    // Prepare and send message
    const accountUrl = getURL('/account?redirectTo=account');
    const message = await formatInvoiceMessage(
      invoice.amount_due,
      dueDate,
      accountUrl
    );

    const smsResult = await sendSMS(
      customer.phone!,
      message,
      customer.metadata.supabaseUUID
    );

    if (!smsResult.success) {
      throw new Error(`Failed to send SMS: ${smsResult.error}`);
    }

    // Update notification record
    await updateSmsNotification(
      subscriptionId,
      currentDate.getMonth() + 1,
      currentDate.getFullYear()
    );

    console.log('Successfully processed upcoming invoice:', {
      subscriptionId,
      customerId: customer.id,
      dueDate: dueDate.toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to handle upcoming invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to process upcoming invoice'
    };
  }
}
