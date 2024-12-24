import { z } from 'zod';
import {
  Donation,
  Donor,
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
import type { Database, Tables, TablesInsert } from 'types_db';

// Change to control trial period length
const TRIAL_PERIOD_DAYS = 0;

// Note: supabaseAdmin uses the SERVICE_ROLE_KEY which you must only use in a secure server-side context
// as it has admin privileges and overwrites RLS policies!
const supabaseAdmin = createClient<Database>(
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
    metadata: null
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
  const fundData: any = {
    id: payout.id,
    date: toDateTime(payout.arrival_date).toISOString(),
    amount: payout.amount,
    source: 'stripe',
    description: 'Stripe Payout',
    payment_method: payout.destination,
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
  user_id,
  email
}: {
  user_id: string;
  email: string;
}) => {
  // Check if the member already exists in Supabase
  const { data: existingMember, error: queryError } = await supabaseAdmin
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

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', user_id)
    .maybeSingle();

  const { error: updateError } = await supabaseAdmin
    .from('members')
    .update({
      status: subscription ? 'active' : 'inactive',
      stripe_customer_id: existingSupabaseCustomer?.id,
      subscription_id: subscription?.id
    })
    .eq('user_id', user_id);

  if (updateError)
    throw new Error(
      `Supabase member record update failed: ${updateError.message}`
    );
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
  //@ts-ignore
  await stripe.customers.update(customer, { name, phone, address });
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

  if (noCustomerError)
    throw new Error(`Customer lookup failed: ${noCustomerError.message}`);

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
    // @ts-ignore
    quantity: subscription.quantity,
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
    //@ts-ignore
    await copyBillingDetailsToCustomer(
      uuid,
      subscription.default_payment_method as Stripe.PaymentMethod
    );

  await supabaseAdmin
    .from('members')
    .update({
      status: 'active',
      subscription_id: subscription?.id
    })
    .eq('user_id', uuid);
};

const getStripeAvailableBalance = async () => {
  const balance = await stripe.balance.retrieve();
  return balance;
};

const getStripeRecentTransactions = async () => {
  let allTransactions: any[] = [];
  let hasMore = true;
  let startingAfter = null;

  while (hasMore) {
    const params: any = {
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
  return payments;
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
  const { data, error } = await supabaseAdmin.from('donations').select(`
     *,
      donors (
        *
      )
    `);

  if (error) {
    console.error('Error fetching donations:', error);
    return { data: null, error };
  }

  // Transform data to match the Donation type
  const transformedData: any[] = data.map((donation) => ({
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

const getOrCreateUser = async ({
  email
}: {
  email: string;
}): Promise<{
  data: User | null;
  error: string | null;
}> => {
  try {
    // Step 1: Check if the user exists
    const { data: allUsers, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('Error fetching users:', listError.message);
      return { data: null, error: 'Error fetching users' };
    }

    const userExists = allUsers?.users?.find(
      (user: any) => user.email === email
    );
    if (userExists) {
      console.log('User already exists:', userExists.email);
      return { data: userExists, error: null };
    }

    // Step 2: Sign up the user
    const { data, error: signUpError } = await supabaseAdmin.auth.signUp({
      email,
      password: process.env.SUPABASE_DEFAULT_PASSWORD || ''
    });

    if (signUpError) {
      console.error('Error signing up user:', signUpError.message);
      return { data: null, error: signUpError.message };
    }

    console.log('User signed up successfully:', data);
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
  data: Donor | null | any;
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

export const getOrCreateDonor = async (
  donorDetails: Partial<Donor>
): Promise<{ data: Donor | null; error: PostgrestError | null | string }> => {
  try {
    const { data, error: donorError } = await supabaseAdmin
      .from('donors')
      .select('*')
      .eq('email', donorDetails.email!!)
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
  getStripeRecentTransactions,
  getStripePayments,
  getTotalCustomerSpent,
  getStripeCustomers,
  getStripeCustomer,
  updateFuneralSignup,
  getDonations,
  getOrCreateUser,
  createCustomerInStripe,
  createInvoice
};
