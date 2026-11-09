import { z } from 'zod';

export const fundraiserSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  target_amount: z.number(),
  current_amount: z.number(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  category: z.enum([
    'general',
    'emergency',
    'medical',
    'education',
    'community',
    'funeral',
    'zakat',
    'other'
  ]),
  image_url: z.string().nullable(),
  minimum_donation: z.number().default(0),
  enable_recurring: z.boolean().default(false),
  created_by: z.string(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']),
  created_at: z.string(),
  updated_at: z.string()
});

export const fundraiserFormSchema = fundraiserSchema.omit({
  id: true,
  current_amount: true,
  created_by: true,
  created_at: true,
  updated_at: true
}).partial({
  description: true,
  start_date: true,
  end_date: true
});
