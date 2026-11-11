import { z } from 'zod';
import {
  Donation,
  Donor,
  EmailLogs,
  FuneralFundFormSchema,
  Invoice,
  Member,
  Price,
  Product,
  UpdateDonationParams
} from '@/types';
import { toDateTime } from '@/utils/helpers';
import { stripe } from '@/utils/stripe/config';
import { PostgrestError, User, createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import type { Database, TablesInsert } from 'types_db';

// Change to control trial period length
const TRIAL_PERIOD_DAYS = 0;

// Note: supabaseAdmin uses the SERVICE_ROLE_KEY which you must only use in a secure server-side context
// as it has admin privileges and overwrites RLS policies! Never call auth.signUp/signIn on it (BUG-073).
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const createMember = async (member: Partial<Member>) => {
  try {
    const { data, error: upsertError } = await supabaseAdmin
      .from('members')
      .upsert(member, { onConflict: 'user_id' })
      .select();
    if (upsertError)
      throw new Error(`Member insert/update failed: ${upsertError.message}`);
    return { data, error: upsertError };
  } catch (error) {
    console.error('Error creating member:', error);
    return { data: null, error: 'Error creating member' };
  }
};

const upsertProductRecord = async (product: Stripe.Product) => {
  const productData: Product = {
    id: product.id,
    active: product.active,
    name: product.name,
    description: product.description ?? null,
    image: product.images?.[0] ?? null,
    metadata: product.metadata
  };

  const { error: upsertError } = await supabaseAdmin
    .from('products')
    .upsert([productData]);
  if (upsertError)
    throw new Error(`Product insert/update failed: ${upsertError.message}`);
  console.log(`Product inserted/updated: ${product.id}`);
};

const upsertPriceRecord = async (
  price: Stripe.Price,
  retryCount = 0,
  maxRetries = 3
) => {
  const priceData: Price = {
    id: price.id,
    product_id: typeof price.product === 'string' ? price.product : '',
    active: price.active,
    currency: price.currency,
    type: price.type,
    unit_amount: price.unit_amount ?? null,
    interval: price.recurring?.interval ?? null,
    interval_count: price.recurring?.interval_count ?? null,
    trial_period_days: price.recurring?.trial_period_days ?? TRIAL_PERIOD_DAYS,
    description: null,
    metadata: price.metadata
  };

  const { error: upsertError } = await supabaseAdmin
    .from('prices')
    .upsert([priceData]);

  if (upsertError?.message.includes('foreign key constraint')) {
    if (retryCount < maxRetries) {
      console.log(`Retry attempt ${retryCount + 1} for price ID: ${price.id}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await upsertPriceRecord(price, retryCount + 1, maxRetries);
    } else {
      throw new Error(
        `Price insert/update failed after ${maxRetries} retries: ${upsertError.message}`
      );
    }
  } else if (upsertError) {
    throw new Error(`Price insert/update failed: ${upsertError.message}`);
  } else {
    console.log(`Price inserted/updated: ${price.id}`);
  }
};

const upsertFundRecord = async (
  payout: Stripe.Payout,
  retryCount = 0,
  maxRetries = 3
) => {
  const fundData: TablesInsert<'funds'> = {
    id: payout.id,
    date: toDateTime(payout.arrival_date).toISOString(),
    amount: payout.amount,
    source: 'stripe',
    description: 'Stripe Payout',
    payment_method: typeof payout.destination === 'string' ? payout.destination : payout.destination?.id ?? null,
    created_at: toDateTime(payout.created).toISOString(),
    currency: payout.currency,
    stripe_payout_id: payout.id,
    stripe_status: payout.status,
    stripe_fees: 0.0,
    status: payout.status === 'paid' ? 'completed' : 'pending'
  };

  const { error: upsertError } = await supabaseAdmin
    .from('funds')
    .upsert([fundData]);

  if (upsertError?.message.includes('foreign key constraint')) {
    if (retryCount < maxRetries) {
      console.log(
        `Retry attempt ${retryCount + 1} for payout ID: ${payout.id}`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await upsertFundRecord(payout, retryCount + 1, maxRetries);
    } else {
      throw new Error(
        `Fund insert/update failed after ${maxRetries} retries: ${upsertError.message}`
      );
    }
  } else if (upsertError) {
    throw new Error(`Fund insert/update failed: ${upsertError.message}`);
  } else {
    console.log(`Fund inserted/updated: ${payout.id}`);
  }
};

const deleteProductRecord = async (product: Stripe.Product) => {
  const { error: deletionError } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', product.id);
  if (deletionError)
    throw new Error(`Product deletion failed: ${deletionError.message}`);
  console.log(`Product deleted: ${product.id}`);
};

const deletePriceRecord = async (price: Stripe.Price) => {
  const { error: deletionError } = await supabaseAdmin
    .from('prices')
    .delete()
    .eq('id', price.id);
  if (deletionError)
    throw new Error(`Price deletion failed: ${deletionError.message}`);
  console.log(`Price deleted: ${price.id}`);
};

const upsertCustomerToSupabase = async (uuid: string, customerId: string) => {
  const { error: upsertError } = await supabaseAdmin
    .from('customers')
    .upsert([{ id: uuid, stripe_customer_id: customerId }]);

  if (upsertError)
    throw new Error(
      `Supabase customer record creation failed: ${upsertError.message}`
    );

  return customerId;
};

const createCustomerInStripe = async (uuid: string, email: string) => {
  const customerData = { metadata: { supabaseUUID: uuid }, email: email };
  const newCustomer = await stripe.customers.create(customerData);
  if (!newCustomer) throw new Error('Stripe customer creation failed.');

  return newCustomer.id;
};

const createOrRetrieveCustomer = async ({
  email,
  uuid
}: {
  email: string;
  uuid: string;
}) => {
  // Check if the customer already exists in Supabase
  const { data: existingSupabaseCustomer, error: queryError } =
    await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', uuid)
      .maybeSingle();

  if (queryError) {
    throw new Error(`Supabase customer lookup failed: ${queryError.message}`);
  }

  // Retrieve the Stripe customer ID using the Supabase customer ID, with email fallback
  let stripeCustomerId: string | undefined;
  if (existingSupabaseCustomer?.stripe_customer_id) {
    const existingStripeCustomer = await stripe.customers.retrieve(
      existingSupabaseCustomer.stripe_customer_id
    );
    stripeCustomerId = existingStripeCustomer.id;
  } else {
    // If Stripe ID is missing from Supabase, try to retrieve Stripe customer ID by email
    const stripeCustomers = await stripe.customers.list({ email: email });
    stripeCustomerId =
      stripeCustomers.data.length > 0 ? stripeCustomers.data[0].id : undefined;
  }

  // If still no stripeCustomerId, create a new customer in Stripe
  const stripeIdToInsert = stripeCustomerId
    ? stripeCustomerId
    : await createCustomerInStripe(uuid, email);
  if (!stripeIdToInsert) throw new Error('Stripe customer creation failed.');

  if (existingSupabaseCustomer && stripeCustomerId) {
    // If Supabase has a record but doesn't match Stripe, update Supabase record
    if (existingSupabaseCustomer.stripe_customer_id !== stripeCustomerId) {
      const { error: updateError } = await supabaseAdmin
        .from('customers')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', uuid);

      if (updateError)
        throw new Error(
          `Supabase customer record update failed: ${updateError.message}`
        );
      console.warn(
        `Supabase customer record mismatched Stripe ID. Supabase record updated.`
      );
    }
    // If Supabase has a record and matches Stripe, return Stripe customer ID
    return stripeCustomerId;
  } else {
    console.warn(
      `Supabase customer record was missing. A new record was created.`
    );

    // If Supabase has no record, create a new record and return Stripe customer ID
    const upsertedStripeCustomer = await upsertCustomerToSupabase(
      uuid,
      stripeIdToInsert
    );
    if (!upsertedStripeCustomer)
      throw new Error('Supabase customer record creation failed.');

    return upsertedStripeCustomer;
  }
};

const updateDonor = async ({
  stripe_customer_id,
  email
}: {
  stripe_customer_id: string;
  email: string;
}) => {
  // Check if the member already exists in Supabase
  const { data: existingDonor, error: queryError } = await supabaseAdmin
    .from('donors')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (queryError) {
    throw new Error(`Supabase donor lookup failed: ${queryError.message}`);
  }

  const { error: updateError } = await supabaseAdmin
    .from('donors')
    .update({
      stripe_customer_id: stripe_customer_id
    })
    .eq('id', existingDonor!.id);

  if (updateError)
    throw new Error(
      `Supabase member record update failed: ${updateError.message}`
    );
};

const updateDonation = async (params: UpdateDonationParams) => {
  const { donation_id, ...updateFields } = params;
  // Check if the member already exists in Supabase
  const { data: existingDonation, error: queryError } = await supabaseAdmin
    .from('donations')
    .select('*')
    .eq('id', donation_id)
    .maybeSingle();

  if (queryError) {
    throw new Error(`Supabase donation lookup failed: ${queryError.message}`);
  }

  if (!existingDonation) {
    throw new Error(`Donation with id ${donation_id} not found`);
  }

  const { error: updateError } = await supabaseAdmin
    .from('donations')
    .update(updateFields)
    .eq('id', donation_id);

  if (updateError)
    throw new Error(
      `Supabase donation record update failed: ${updateError.message}`
    );
  return { updated: true };
};

const updateMember = async ({
  user_id
}: {
  user_id: string;
  email: string;
}) => {
  // Check if the member already exists in Supabase
  const { error: queryError } = await supabaseAdmin
    .from('members')
    .select('*')
    .eq('user_id', user_id)
    .maybeSingle();

  if (queryError) {
    throw new Error(`Supabase member lookup failed: ${queryError.message}`);
  }

  // Check if the customer already exists in Supabase
  const { data: existingSupabaseCustomer } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('id', user_id)
    .maybeSingle();

  // Only links the Stripe customer. Status changes when Stripe reports the
  // subscription, not when checkout starts (BUG-024).
  const { error: updateError } = await supabaseAdmin
    .from('members')
    .update({ stripe_customer_id: existingSupabaseCustomer?.id })
    .eq('user_id', user_id);

  if (updateError)
    throw new Error(
      `Supabase member record update failed: ${updateError.message}`
    );
};

const retrieveSmsNotification = async (
  subscriptionId: string,
  month: number,
  year: number
) => {
  const { data: subscription, error: queryError } = await supabaseAdmin
    .from('sms_notifications')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .eq('month', month)
    .eq('year', year)
    .limit(1);

  if (queryError) {
    return {
      data: null,
      error: queryError
    };
  }

  return {
    data: subscription,
    error: null
  };
};

const updateSmsNotification = async (
  subscriptionId: string,
  currentMonth: number,
  currentYear: number
) => {
  const { error: insertError } = await supabaseAdmin
    .from('sms_notifications')
    .insert([
      {
        subscription_id: subscriptionId,
        month: currentMonth,
        year: currentYear
      }
    ]);

  if (insertError) {
    console.error('Error logging SMS notification:', insertError);
  } else {
    console.log('SMS notification logged successfully.');
  }
};

const retrieveMember = async ({ user_id }: { user_id: string }) => {
  // Check if the member already exists in Supabase
  const { data: existingMember, error: queryError } = await supabaseAdmin
    .from('members')
    .select('*')
    .eq('user_id', user_id)
    .maybeSingle();

  if (queryError) {
    throw new Error(`Supabase member lookup failed: ${queryError.message}`);
  }

  return existingMember;
};
/**
 * Copies the billing details from the payment method to the customer object.
 */
const copyBillingDetailsToCustomer = async (
  uuid: string,
  payment_method: Stripe.PaymentMethod
) => {
  //Todo: check this assertion
  const customer = payment_method.customer as string;
  const { name, phone, address } = payment_method.billing_details;
  if (!name || !phone || !address) return;
  await stripe.customers.update(customer, { name, phone, address: {
    city: address.city ?? '', country: address.country ?? '', line1: address.line1 ?? '',
    line2: address.line2 ?? '', postal_code: address.postal_code ?? '', state: address.state ?? ''
  } });
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      billing_address: { ...address },
      payment_method: { ...payment_method[payment_method.type] }
    })
    .eq('id', uuid);
  if (updateError)
    throw new Error(`Customer update failed: ${updateError.message}`);
};

const manageSubscriptionStatusChange = async (
  subscriptionId: string,
  customerId: string,
  createAction = false
) => {
  // Get customer's UUID from mapping table.
  const { data: customerData, error: noCustomerError } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (noCustomerError) {
    // The member deleted their account (/api/app/account/delete tags the Stripe
    // customer first): there is no row left to mirror this subscription into.
    const stripeCustomer = await stripe.customers.retrieve(customerId);
    if (!stripeCustomer.deleted && stripeCustomer.metadata?.bcs_account_deleted) return;
    throw new Error(`Customer lookup failed: ${noCustomerError.message}`);
  }

  const { id: uuid } = customerData!;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method']
  });
  // Upsert the latest status of the subscription object.
  const subscriptionData: TablesInsert<'subscriptions'> = {
    id: subscription.id,
    user_id: uuid,
    metadata: subscription.metadata,
    status: subscription.status,
    price_id: subscription.items.data[0].price.id,
    //TODO check quantity on subscription
    quantity: subscription.items.data[0]?.quantity ?? 1,
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancel_at: subscription.cancel_at
      ? toDateTime(subscription.cancel_at).toISOString()
      : null,
    canceled_at: subscription.canceled_at
      ? toDateTime(subscription.canceled_at).toISOString()
      : null,
    current_period_start: toDateTime(
      subscription.current_period_start
    ).toISOString(),
    current_period_end: toDateTime(
      subscription.current_period_end
    ).toISOString(),
    created: toDateTime(subscription.created).toISOString(),
    ended_at: subscription.ended_at
      ? toDateTime(subscription.ended_at).toISOString()
      : null,
    trial_start: subscription.trial_start
      ? toDateTime(subscription.trial_start).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? toDateTime(subscription.trial_end).toISOString()
      : null
  };

  const { error: upsertError } = await supabaseAdmin
    .from('subscriptions')
    .upsert([subscriptionData]);
  if (upsertError)
    throw new Error(
      `Subscription insert/update failed: ${upsertError.message}`
    );
  console.log(
    `Inserted/updated subscription [${subscription.id}] for user [${uuid}]`
  );

  // For a new subscription copy the billing details to the customer object.
  // NOTE: This is a costly operation and should happen at the very end.
  if (createAction && subscription.default_payment_method && uuid)
      await copyBillingDetailsToCustomer(
      uuid,
      subscription.default_payment_method as Stripe.PaymentMethod
    );

  await syncMemberStatus(uuid);
};

/**
 * Membership follows the member's contribution subscriptions: active while any is
 * active or trialing, inactive once all are cancelled, unpaid or past due (BUG-023).
 * Every row counts, so a second subscription doesn't break the lookup (BUG-024), and
 * recurring donations ("BCS Donation") don't make someone a member.
 */
const syncMemberStatus = async (userId: string) => {
  const { data: subs, error } = await supabaseAdmin
    .from('subscriptions')
    .select('id, status, prices(products(metadata))')
    .eq('user_id', userId);
  if (error) throw new Error(`Subscription lookup failed: ${error.message}`);

  const current = (subs ?? []).find(
    (s) =>
      (s.status === 'active' || s.status === 'trialing') &&
      (s.prices?.products?.metadata as { type?: string } | null)?.type !== 'donation'
  );
  const { error: updateError } = await supabaseAdmin
    .from('members')
    .update(current ? { status: 'active', subscription_id: current.id } : { status: 'inactive' })
    .eq('user_id', userId)
    .eq('isApproved', true); // applicants stay pending or rejected until an admin decides
  if (updateError) throw new Error(`Member status update failed: ${updateError.message}`);
};

const getStripeAvailableBalance = async () => {
  const balance = await stripe.balance.retrieve();
  return balance;
};

// Balance of the linked bank account (refreshed weekly by /api/cron/refresh-bank-balance),
// plus Stripe payouts that hadn't landed yet when the bank reported that balance.
const getBankBalance = async () => {
  const accountId = process.env.STRIPE_BANK_ACCOUNT_ID;
  if (!accountId) return null;

  const { balance } =
    await stripe.financialConnections.accounts.retrieve(accountId);
  if (!balance) return null;

  // ponytail: last 100 payouts covers a week-old balance; page if payouts get that frequent
  const { data: payouts } = await stripe.payouts.list({ limit: 100 });
  const inTransit = payouts
    .filter(
      (p) =>
        p.status === 'pending' ||
        p.status === 'in_transit' ||
        (p.status === 'paid' && p.arrival_date > balance.as_of)
    )
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    amount: (balance.current.usd ?? 0) + inTransit,
    asOf: balance.as_of
  };
};

const getStripeRecentTransactions = async () => {
  let allTransactions: Stripe.BalanceTransaction[] = [];
  let hasMore = true;
  let startingAfter = null;

  while (hasMore) {
    const params: Stripe.BalanceTransactionListParams = {
      limit: 100,
      created: {
        gte: 1718491540 // 2024-06-15
      }
    };
    if (startingAfter) {
      params.starting_after = startingAfter;
    }

    const balanceTransactions = await stripe.balanceTransactions.list(params);

    allTransactions = allTransactions.concat(balanceTransactions.data);

    hasMore = balanceTransactions.has_more;
    if (hasMore) {
      startingAfter =
        balanceTransactions.data[balanceTransactions.data.length - 1].id;
    }
  }

  return allTransactions;
};

const getStripePayments = async (params?: {
  customerId?: string;
  dateRange?: Stripe.RangeQueryParam;
}) => {
  try {
    const { customerId, dateRange } = params || {};

    const payments = await stripe.paymentIntents
      .list({
        customer: customerId,
        limit: 100,
        created: {
          gte: dateRange?.gte ?? 1718491540, // 2024-06-15,
          lte: dateRange?.lte ?? Math.floor(Date.now() / 1000)
        }
      })
      .autoPagingToArray({ limit: 1000 });
    return { data: payments, error: null };
  } catch (error) {
    console.error('Error fetching stripe payments:', error);
    return { data: null, error: 'Error fetching stripe payments' };
  }
};

const getTotalCustomerSpent = async (params?: {
  customerId?: string;
  dateRange?: Stripe.RangeQueryParam;
}) => {
  const { customerId, dateRange } = params || {};
  let totalSpent = 0;
  try {
    const charges = await stripe.charges
      .list({
        customer: customerId,
        limit: 100,
        created: {
          gte: dateRange?.gte ?? 1718491540, // 2024-06-15,
          lte: dateRange?.lte ?? Math.floor(Date.now() / 1000)
        }
      })
      .autoPagingToArray({ limit: 1000 });

    charges.forEach((charge) => {
      if (charge.status === 'succeeded') {
        totalSpent += charge.amount;
      }
    });
  } catch (error) {
    console.error('Error fetching charges:', error);
  }
  return totalSpent;
};

const getStripeCustomers = async () => {
  const customers = await stripe.customers.list();
  return customers;
};

const getStripeCustomer = async (customerId: string) => {
  const customer = await stripe.customers.retrieve(customerId);
  return customer;
};

const updateFuneralSignup = async (
  values: z.infer<typeof FuneralFundFormSchema>
) => {
  // Check if the customer already exists in Supabase
  const { data: existingSignedUp } = await supabaseAdmin
    .from('funeral_fund_interest')
    .select('*')
    .eq('email', values.email)
    .maybeSingle();

  if (!existingSignedUp) {
    const data = {
      email: values.email,
      full_name: values.fullName,
      phone_number: values.phoneNumber,
      additional_services: values.additionalServices,
      additional_comments: values.additionalComments
    };
    const { error: insertError } = await supabaseAdmin
      .from('funeral_fund_interest')
      .insert([{ ...data }]);
    if (insertError)
      throw new Error(`Funeral signup insert failed: ${insertError.message}`);
    console.log(`Funeral signup inserted: ${values.email}`);
  }

  return existingSignedUp;
};

const getDonations = async () => {
  const { data, error } = await supabaseAdmin
    .from('donations')
    .select(
      `
     *,
      donors (
        *
      )
    `
    )
    .eq('is_private', false);

  if (error) {
    console.error('Error fetching donations:', error);
    return { data: null, error };
  }

  // Transform data to match the Donation type
  const transformedData = data.map((donation) => ({
    ...donation,
    donationId: donation.id,
    donorName: donation.is_anonymous
      ? 'Anonymous'
      : donation.donors?.organization_name || `${donation.donors?.full_name}`,
    email: donation.donors?.email || null,
    amount: donation.donation_amount,
    date: donation.donation_date,
    paymentMethod: donation.payment_method || 'N/A',
    nonCashDescription: donation.non_cash_description || null
  }));

  return { data: transformedData, error: null };
};

/** Finds an auth user by email across every page of users (listUsers pages at 50 by default). */
const findAuthUserByEmail = async (email: string) => {
  const wanted = email.toLowerCase();
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Error fetching users: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === wanted);
    if (hit || data.users.length < 1000) return hit ?? null;
  }
};

const getOrCreateUser = async ({
  email
}: {
  email: string;
}): Promise<{
  data: User | null;
  error: string | null;
}> => {
  try {
    // Create first and look up only when the email is taken: the old lookup read
    // just the first page of users, so returning donors past it failed (BUG-053).
    // Not auth.signUp(): that stores the new user's session on this shared
    // service-role client, which then runs under RLS as that user (BUG-073).
    // No password: donor accounts used to share one default password, so anyone
    // who knew it could sign in as any guest donor (BUG-053). They can set their
    // own with "Forgot password".
    const { data, error: signUpError } = await supabaseAdmin.auth.admin.createUser({ email });

    if (signUpError) {
      if (signUpError.code === 'email_exists' || /already (been )?registered/i.test(signUpError.message)) {
        const existing = await findAuthUserByEmail(email);
        if (existing) return { data: existing, error: null };
      }
      console.error('Error creating user:', signUpError.message);
      return { data: null, error: signUpError.message };
    }

    console.log('User created successfully:', data.user?.email);
    return { data: data.user, error: null };
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  return {
    data: null,
    error: 'Error creating user'
  };
};
export const createDonor = async (
  values: Donor
): Promise<{
  data: Donor | null;
  error: PostgrestError | null | string;
}> => {
  const { data, error: upsertError } = await supabaseAdmin
    .from('donors')
    .upsert(values, { onConflict: 'email' })
    .select()
    .single();
  if (upsertError) {
    console.error('Donor upsert error:', upsertError);
    throw new Error(`Donor insert/update failed: ${upsertError.message}`);
  }

  return { data, error: upsertError };
};

const createInvoice = async (
  memberDetails: Partial<Member>
): Promise<{ data: Invoice | null; error: PostgrestError | null | string }> => {
  try {
    const { data, error: upsertError } = await supabaseAdmin
      .from('invoices')
      .upsert({
        member_id: memberDetails.id!
      })
      .select()
      .single();
    if (upsertError) {
      console.error('Invoice upsert error:', upsertError);
      throw new Error(`Invoice insert/update failed: ${upsertError.message}`);
    }
    return { data, error: upsertError };
  } catch (error) {
    console.error('Error creating invoice:', error);
    return { data: null, error: 'Error creating invoice' };
  }
};

/**
 * The donor record a gift is filed under. A signed-in giver (`account`, from
 * the session, never the form) gets their own record: the one linked to their
 * account, else the guest record under their own account email (which is then
 * linked), else a new one. Their gift is never filed under someone else's
 * record because they typed that person's email (W12). Guests are matched by
 * email, as before.
 */
export const getOrCreateDonor = async (
  donorDetails: Partial<Donor>,
  account?: { id: string; email?: string | null }
): Promise<{ data: Donor | null; error: PostgrestError | null | string }> => {
  try {
    if (account) {
      const { data: linked } = await supabaseAdmin.from('donors').select('*').eq('user_id', account.id).limit(1).maybeSingle();
      if (linked) return { data: linked, error: null };
      const own = account.email?.toLowerCase();
      if (own) {
        const { data: guest } = await supabaseAdmin.from('donors').select('*').ilike('email', own).is('user_id', null).maybeSingle();
        if (guest) {
          const { data: claimed, error } = await supabaseAdmin
            .from('donors')
            .update({ user_id: account.id })
            .eq('id', guest.id)
            .select()
            .single();
          return { data: claimed, error };
        }
      }
      // A new record for this account; under the typed email unless another donor has it.
      const { data: taken } = await supabaseAdmin.from('donors').select('id').eq('email', donorDetails.email!).maybeSingle();
      const { data: donor, error } = await supabaseAdmin
        .from('donors')
        .insert({ ...(donorDetails as Donor), email: taken && own ? own : donorDetails.email!, user_id: account.id })
        .select()
        .single();
      return { data: donor, error };
    }

    const { data, error: donorError } = await supabaseAdmin
      .from('donors')
      .select('*')
      .eq('email', donorDetails.email!)
      .single();

    if (data) {
      return {
        data,
        error: donorError
      };
    }
    const { data: donor, error } = await createDonor(donorDetails as Donor);
    return {
      data: donor,
      error
    };
  } catch (error) {
    console.error('Error creating donor:', error);
    return { data: null, error: 'Error creating donor' };
  }
};

export const createDonation = async (donationDetails: Omit<Donation, 'id'>) => {
  try {
    const { data, error: insertError } = await supabaseAdmin
      .from('donations')
      .insert(donationDetails)
      .select()
      .single();

    if (data) {
      return {
        data,
        error: null
      };
    }

    if (insertError) {
      console.error('Donation insert error:', insertError);
      throw new Error(`Donation insert failed: ${insertError.message}`);
    }
  } catch (error) {
    console.error('Error creating donation:', error);
    return { data: null, error: 'Error creating donation' };
  }
  return { data: null, error: 'Error creating donation' };
};

const upsertEmailLogs = async (emailLog: Partial<EmailLogs>) => {
  try {
    const { data, error: upsertError } = await supabaseAdmin
      .from('email_logs')
      .upsert(emailLog)
      .select();
    if (upsertError)
      throw new Error(`Email log insert/update failed: ${upsertError.message}`);
    return { data, error: upsertError };
  } catch (error) {
    console.error('Error creating email log:', error);
    return { data: null, error: 'Error creating email log' };
  }
};

const createCandidate = async (
  candidateDetails: TablesInsert<'candidates'>
): Promise<{
  data: Database['public']['Tables']['candidates']['Row'] | null;
  error: PostgrestError | null | string;
}> => {
  try {
    const { data, error: insertError } = await supabaseAdmin
      .from('candidates')
      .insert({
        full_name: candidateDetails.full_name,
        position: candidateDetails.position,
        bio: candidateDetails.bio,
        photo_url: candidateDetails.photo_url,
        election_id: candidateDetails.election_id,
        user_id: candidateDetails.user_id,
        manifesto: candidateDetails.manifesto
      })
      .select()
      .single();

    if (insertError) {
      console.error('Candidate insert error:', insertError);
      throw new Error(`Candidate insert failed: ${insertError.message}`);
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error nominating candidate:', error);
    return {
      data: null,
      error: (error as Error).message || 'Error nominating candidate'
    };
  }
};

export {
  upsertProductRecord,
  upsertPriceRecord,
  upsertFundRecord,
  deleteProductRecord,
  deletePriceRecord,
  createOrRetrieveCustomer,
  updateMember,
  updateDonor,
  updateDonation,
  retrieveMember,
  manageSubscriptionStatusChange,
  getStripeAvailableBalance,
  getBankBalance,
  getStripeRecentTransactions,
  getStripePayments,
  getTotalCustomerSpent,
  getStripeCustomers,
  getStripeCustomer,
  updateFuneralSignup,
  getDonations,
  getOrCreateUser,
  createCustomerInStripe,
  createInvoice,
  upsertEmailLogs,
  retrieveSmsNotification,
  updateSmsNotification,
  createCandidate
};

/**
 * A Checkout session expired unpaid (W11): its gift, still pending, is closed
 * as failed, so abandoned attempts don't sit as pending for ever. A gift that
 * was paid (or already closed) is left alone.
 */
export const expireUnpaidGift = async (metadata: Record<string, string> | null | undefined) => {
  if (!metadata?.donation_id) return;
  if (metadata.type === 'donation') {
    await supabaseAdmin
      .from('donations')
      .update({ donation_status: 'failed' })
      .eq('id', metadata.donation_id)
      .eq('donation_status', 'pending');
  } else if (metadata.type === 'fundraiser_donation') {
    await supabaseAdmin
      .from('fundraiser_donations')
      .update({ payment_status: 'failed' })
      .eq('id', metadata.donation_id)
      .eq('payment_status', 'pending');
  }
};
