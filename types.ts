import { z } from 'zod';
import type { Tables, Database } from '@/types_db';
import { User } from '@supabase/supabase-js';

// Re-export Database type for convenience
export type { Database };

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

export const DONATION_PURPOSES = [
  'general-purpose',
  'funeral-and-burial',
  'new-member-support',
  'youth-programs',
  'social-events'
] as const;

export const DonationPurposeEnum = z.enum(DONATION_PURPOSES);
export type DonationPurpose = z.infer<typeof DonationPurposeEnum>;

export const DonationFormSchema = z
  .object({
    frequency: z.enum(['one_time', 'month', 'year']),
    isRecurring: z.boolean().default(false),
    amount: z.string().refine((val) => !Number.isNaN(Number(val)), {
      message: 'Amount must be a valid number'
    }),
    purpose: DonationPurposeEnum,
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

// Database table types
export type Subscription = Tables<'subscriptions'>;
export type Product = Tables<'products'>;
export type Price = Tables<'prices'>;
export type Member = Tables<'members'>;
export type Donation = Tables<'donations'>;
export type Donor = Tables<'donors'>;
export type Organization = Tables<'organization'>;
export type Invoice = Tables<'invoices'>;
export type EmailLogs = Tables<'email_logs'>;
export type SMSNotifications = Tables<'sms_notifications'>;
export type Program = Tables<'programs'>;

// Election and voting types
export type Election = Tables<'elections'>;
export type Candidate = Tables<'candidates'>;
export type Vote = Tables<'votes'>;
export type VoteSession = Tables<'vote_sessions'>;
export type VoteConfirmation = Tables<'vote_confirmations'>;
export type ElectionPosition = Tables<'election_positions'>;
export type Initiative = Tables<'initiatives'>;

// Database enum types
export type VoteOption = Database['public']['Enums']['vote_option'];
export type VoteSessionType = Database['public']['Enums']['vote_session_type'];
export type ElectionStatus = Database['public']['Enums']['election_status'];
export type ElectionType = Database['public']['Enums']['election_type'];

// Insert types for database operations
export type VoteInsert = Database['public']['Tables']['votes']['Insert'];
export type VoteConfirmationInsert = Database['public']['Tables']['vote_confirmations']['Insert'];
export type VoteSessionInsert = Database['public']['Tables']['vote_sessions']['Insert'];

export type UpdateDonationParams = Partial<Donation> & { donation_id: string };

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

export interface DateRange {
  startDate: number; // Unix timestamp
  endDate: number; // Unix timestamp
}

export const NominateFormSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  position: z.string().min(1, 'Position is required'),
  bio: z.string().optional(),
  manifesto: z.string().optional(),
  photoFile: z
    .any() // Changed from instanceof(File) to any for debugging
    .optional()
    .refine((file) => {
      if (!file) return true;
      return file instanceof File || file instanceof Blob;
    }, 'Please select a valid image file')
    .refine((file) => {
      if (!file) return true;
      return file.size <= 15 * 1024 * 1024;
    }, 'Max file size is 15MB')
    .refine((file) => {
      if (!file) return true;
      return file.type?.startsWith('image/');
    }, 'Only image files are allowed')
});

export const VotingFormSchema = z.object({
  candidateVotes: z.record(z.string(), z.string().optional()),
  initiativeVotes: z.record(z.string(), z.enum(['yes', 'no', 'abstain']).optional())
});

// Separate voting schemas
export const CandidateVotingFormSchema = z.object({
  candidateVotes: z.record(z.string(), z.string().optional())
});

export const InitiativeVotingFormSchema = z.object({
  initiativeVotes: z.record(z.string(), z.enum(['yes', 'no', 'abstain']).optional())
});


export interface Position {
  position: string;
  description?: string | null;
  display_order: number;
}