import { z } from 'zod';

export const FundraiserFormSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must not exceed 100 characters'),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must not exceed 2000 characters')
    .nullable(),
  goal_amount: z
    .number()
    .refine((val) => val >= 100, 'Goal amount must be at least $100'),
  ends_at: z.string().refine((val) => {
    const date = new Date(val);
    const now = new Date();
    return date > now;
  }, 'End date must be in the future')
  .nullable(),
  category: z.enum([
    'general',
    'emergency',
    'medical',
    'education',
    'community',
    'funeral',
    'zakat',
    'other'
  ]).nullable(),
  image_url: z.string().url('Must be a valid URL').optional().nullable(),
  beneficiary: z.string().optional().nullable()
});
