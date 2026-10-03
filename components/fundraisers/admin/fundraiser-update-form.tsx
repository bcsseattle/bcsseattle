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
import { Database, Fundraiser, FundraiserCategory, FundraiserStatus } from '@/types';

const fundraiserFormSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  goal_amount: z.coerce
    .number()
    .min(100, { message: "Goal amount must be at least $100" })
    .nullable(),
  ends_at: z.coerce.date().nullable(),
  category: z.enum([
    "general",
    "emergency",
    "medical",
    "education",
    "community",
    "funeral",
    "zakat",
    "other",
  ]).nullable(),
  status: z.enum(["draft", "active", "paused", "completed", "cancelled"]).nullable(),
  beneficiary: z.string().nullable(),
  image_url: z.string().url().nullable(),
}) satisfies z.ZodType<{
  title: string;
  description: string;
  goal_amount: number | null;
  ends_at: Date | null;
  category: FundraiserCategory | null;
  status:  FundraiserStatus | null;
  beneficiary: string | null;
  image_url: string | null;
}>;

type FundraiserFormValues = z.infer<typeof fundraiserFormSchema>;

interface FundraiserUpdateFormProps {
  fundraiser: Fundraiser;
}

export function FundraiserUpdateForm({ fundraiser }: FundraiserUpdateFormProps) {
  const router = useRouter();
  const form = useForm<FundraiserFormValues>({
    resolver: zodResolver(fundraiserFormSchema),
    defaultValues: {
      title: fundraiser?.title ?? "",
      description: fundraiser?.description ?? "",
      goal_amount: fundraiser?.goal_amount ?? null,
      ends_at: fundraiser?.ends_at ? new Date(fundraiser.ends_at) : null,
      category: fundraiser?.category ?? null,
      status: fundraiser?.status ?? null,
      beneficiary: fundraiser?.beneficiary ?? null,
      image_url: fundraiser?.image_url ?? null,
    },
  });

  async function onSubmit(data: FundraiserFormValues) {
    try {
      const response = await fetch(`/api/fundraisers/${fundraiser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to update fundraiser');
      }

      toast.success('Your fundraiser has been updated.');
      router.push(`/fundraisers/${fundraiser.id}`);
      router.refresh();
    } catch (error) {
      toast.error('Failed to update fundraiser. Please try again.');
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
                <Input {...field} />
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
                  className="h-32" 
                  {...field}
                  value={field.value ?? ''}
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
                  min={100} 
                  step={0.01} 
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
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
          render={({ field }) => {
            const dateValue = field.value ? new Date(field.value).toISOString().split('T')[0] : '';
            return (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field}
                    value={dateValue}
                    onChange={(e) => {
                      field.onChange(e.target.value ? new Date(e.target.value) : null);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  When will this fundraiser end?
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select 
                onValueChange={field.onChange}
                value={field.value || undefined}
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
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select 
                onValueChange={field.onChange}
                value={field.value || undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The current status of your fundraiser.
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
                Who is this fundraiser for?
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
                  {...field}
                  value={field.value ?? ''}
                  placeholder="Enter the URL of your fundraiser's image"
                />
              </FormControl>
              <FormDescription>
                URL for the fundraiser&apos;s image.
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
          <Button type="submit">Update Fundraiser</Button>
        </div>
      </form>
    </Form>
  );
}
