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

export type Subscription = Tables<'subscriptions'>;
export type Product = Tables<'products'>;
export type Price = Tables<'prices'>;
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

export interface Member {
  id: string;
  user_id: string;
  // stripe_customer_id: string;
  // subscription_id: string;
  status: string;
  fullName: string;
  phone: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  membershipType: string;
  totalMembersInFamily: number;
  terms: boolean;
  metadata?: Record<string, any>;
}
