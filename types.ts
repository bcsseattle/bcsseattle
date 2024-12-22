import { z } from 'zod';
import type { Tables } from '@/types_db';
import { User } from '@supabase/supabase-js';

export const MemberRegistrationFormSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),

  membershipType: z.enum(['Individual', 'Family']),
  totalMembersInFamily: z.coerce
    .number()
    .gte(0, 'Family must have at least one member'),
  phone: z.string().min(10, 'Phone number is required'),
  address: z.string().min(1, 'Street address, P.O. box'),
  address2: z
    .string()
    .min(1, 'Apartment, suite, unit, building, floor, etc.')
    .optional()
    .or(z.literal('')),
  city: z.string().min(1, 'City is required'),
  state: z.enum(['WA']),
  zip: z.string().min(5, 'Zip code is required'),
  terms: z.boolean().refine((value) => value === true, {
    message: 'You must accept the terms and conditions'
  })
});

export const ContactFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(1, 'Message is required')
});

export const FuneralFundFormSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().regex(/^[0-9\-\+\(\)\s]*$/, 'Invalid phone number'),
  additionalServices: z.enum(['Yes', 'No', 'Not sure']),
  additionalComments: z.string().optional()
});

export const DonationFormSchema = z
  .object({
    frequency: z.enum(['one_time', 'month', 'year']),
    isRecurring: z.boolean().default(false),
    amount: z.string().refine((val) => !Number.isNaN(Number(val)), {
      message: 'Amount must be a valid number'
    }),
    purpose: z.enum([
      'general-purpose',
      'funeral-and-burial',
      'new-member-support',
      'youth-programs'
    ]),
    donorType: z.enum(['individual', 'organization']),
    donorName: z.string().optional(),
    organizationName: z.string().optional(),
    email: z.string().email('Invalid email address'),
    phone: z
      .string()
      .regex(/^\+?[0-9\-()\s]{7,15}$/, 'Phone number must be valid')
      .optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional().default('USA'),
    currency: z.string().default('USD'),
    paymentMethod: z.enum([
      'card',
      'zelle',
      'check',
      'cash',
      'us_bank_account'
    ]),
    bankName: z.string().optional(),
    isAnonymous: z.boolean().optional().default(false),
    nonCashDescription: z.string().optional(),
    userId: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.donorType === 'individual' && !data.donorName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['donorName'],
        message: 'Donor name is required for individuals'
      });
    }
    if (data.donorType === 'organization' && !data.organizationName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['organizationName'],
        message: 'Organization name is required for organizations'
      });
    }
  });

export type Subscription = Tables<'subscriptions'>;
export type Product = Tables<'products'>;
export type Price = Tables<'prices'>;
export type Member = Tables<'members'>;
export type Donation = Tables<'donations'>;
export type Donor = Tables<'donors'>;
export type organization = Tables<'organization'>;

export interface ProductWithPrices extends Product {
  prices: Price[];
}
export interface PriceWithProduct extends Price {
  products: Product | null;
}
export interface SubscriptionWithProduct extends Subscription {
  prices: PriceWithProduct | null;
}

export interface Props {
  user: User | null | undefined;
  products: ProductWithPrices[];
  subscription: SubscriptionWithProduct | null;
}

export type BillingInterval = 'lifetime' | 'year' | 'month';

export type MemberWithCustomers = Member & {
  customers: Record<string, any>;
};

export type DonationByDonor = Partial<Donation> & {
  donors: Donor[];
};
