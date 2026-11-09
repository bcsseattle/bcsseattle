'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must not exceed 100 characters'),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must not exceed 2000 characters'),
  goal_amount: z
    .number()
    .min(100, 'Goal amount must be at least $100'),
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

type FundraiserFormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FundraiserFormValues> = {};

export function FundraiserForm() {
  const router = useRouter();
  const form = useForm<FundraiserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  async function onSubmit(data: FundraiserFormValues) {
    try {
      const response = await fetch('/api/fundraisers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          goal_amount: Number(data.goal_amount)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create fundraiser');
      }

      const fundraiser = await response.json();
      toast.success('Your fundraiser has been created.');
      router.push(`/fundraisers/${fundraiser.id}`);
    } catch (error) {
      toast.error('Failed to create fundraiser. Please try again.');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Help fund our community project" {...field} />
              </FormControl>
              <FormDescription>
                A clear and compelling title for your fundraiser.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell people why they should donate to your cause..."
                  className="h-32"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Explain your cause and how the funds will be used.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="goal_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal Amount ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="100"
                  step="0.01"
                  placeholder="1000.00"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  value={field.value?.toString() ?? ''}
                />
              </FormControl>
              <FormDescription>
                The total amount you aim to raise.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ends_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Date</FormLabel>
              <FormControl>
                <Input 
                  type="date" 
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                When will this fundraiser end?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value ?? undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="funeral">Funeral</SelectItem>
                  <SelectItem value="zakat">Zakat</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the category that best fits your fundraiser.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="beneficiary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beneficiary</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Who will benefit from this fundraiser?"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                Optional: Specify who this fundraiser is for.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="image_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Optional: Add an image to your fundraiser.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit">Create Fundraiser</Button>
        </div>
      </form>
    </Form>
  );
}
