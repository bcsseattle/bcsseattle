'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';
import { formatCurrency, getErrorRedirect } from '@/utils/helpers';
import { Database } from '@/types_db';
import { FundraiserDonation } from '@/types/fundraisers';
import { submitDonation } from '@/utils/fundraisers/handlers';
import { checkoutWithStripeForDonation, checkoutWithStripeForFundraiser } from '@/utils/stripe/server';
import { getStripe } from '@/utils/stripe/client';

type Fundraiser = Database['public']['Tables']['fundraisers']['Row'];

const formSchema = z.object({
  amount: z.coerce.number()
    .positive('Amount must be greater than 0')
    .min(0.01, 'Minimum amount is $0.01')
    .refine(
      (val) => Number.isFinite(val) && val <= 999999.99,
      { message: 'Maximum amount is $999,999.99' }
    ),
  email: z.string()
    .email('Please enter a valid email address')
    .nullish()
    .transform(val => val || undefined),
  fullName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .nullish()
    .transform(val => val || undefined),
  phone: z.string()
    .trim()
    .regex(/^\+?[1-9][0-9]{7,14}$/, 'Please enter a valid phone number')
    .nullish()
    .transform(val => val || undefined),
  isAnonymous: z.boolean().default(false),
  comment: z.string()
    .max(500, 'Comment must not exceed 500 characters')
    .nullish()
    .transform(val => val || null)
}).refine((data) => {
  if (!data.isAnonymous && (!data.email || !data.fullName)) {
    return false;
  }
  return true;
}, {
  message: "Email and full name are required unless donating anonymously",
  path: ["email", "fullName"]
});

type DonationFormValues = z.infer<typeof formSchema>;

interface DonationFormProps {
  fundraiser: Fundraiser;
}

export function DonationForm({ fundraiser }: DonationFormProps) {
  const router = useRouter();
  const pathname = usePathname();

  const form = useForm<DonationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      email: undefined,
      fullName: undefined,
      phone: undefined,
      isAnonymous: false,
      comment: null
    }
  });

  const onSubmit = async (data: DonationFormValues) => {
    if (fundraiser.minimum_donation && data.amount < fundraiser.minimum_donation) {
      form.setError('amount', {
        type: 'manual',
        message: `Minimum donation amount is ${formatCurrency(fundraiser.minimum_donation)}`
      });
      return;
    }

    try {
      const result = await submitDonation(
        fundraiser.id,
        data.amount,
        data.isAnonymous ? 'Anonymous' : (data.fullName || 'Anonymous'),
        data.isAnonymous,
        data.comment || undefined,
        undefined,
        data.email,
        data.phone
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to process donation');
      }

      // Create Stripe Checkout session
      const stripePrice = {
        id: 'price_fundraiser_donation',
        active: true,
        currency: 'usd',
        description: data.comment || null,
        interval: null as 'month' | 'year' | 'day' | 'week' | null,
        interval_count: null,
        metadata: {},
        product_id: 'prod_fundraiser_donation',
        trial_period_days: null,
        type: 'one_time' as const,
        unit_amount: data.amount * 100,
      };

      const donorInfo: Database['public']['Tables']['donors']['Row'] = {
        id: crypto.randomUUID(),
        full_name: data.fullName || 'Anonymous',
        email: data.email || '',
        phone: data.phone || null,
        donor_type: 'individual',
        organization_name: null,
        address: null,
        city: null,
        state: null,
        zip_code: null,
        country: null,
        stripe_customer_id: null,
        user_id: null,
        registration_date: new Date().toISOString()
      };

      // Use the donation info from the submitDonation result
      if (!result.donation) {
        throw new Error('No donation record created');
      }

      // Create metadata for the checkout session
      const metadata = {
        type: 'fundraiser_donation',
        donation_id: result.donation.id,
        fundraiser_id: fundraiser.id,
        donor_name: data.isAnonymous ? 'Anonymous' : (data.fullName || 'Anonymous'),
        is_anonymous: data.isAnonymous.toString()
      };

      // Call the checkout function with donor info and metadata
      const { errorRedirect, sessionId } = await checkoutWithStripeForFundraiser(
        stripePrice,
        `/fundraisers/${fundraiser.id}?success=true`,
        `/fundraisers/${fundraiser.id}`,
        donorInfo,
        result.donation
      );

      if (errorRedirect) {
        toast.error('Failed to create checkout session');
        return router.push(errorRedirect);
      }

      if (!sessionId) {
        toast.error('Failed to create checkout session');
        return router.push(
          getErrorRedirect(
            pathname,
            'An unknown error occurred.',
            'Please try again later or contact a system administrator.'
          )
        );
      }

      const stripe = await getStripe();
      stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Donation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process donation');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Donation Amount ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0.01}
                  max={999999.99}
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  value={field.value === 0 ? '' : field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                />
              </FormControl>
              <FormDescription>
                {fundraiser.minimum_donation 
                  ? `Minimum donation amount is ${formatCurrency(fundraiser.minimum_donation)}`
                  : 'Enter the amount you would like to donate'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Your email for donation confirmation
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your full name"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Your name as it will appear on the donation (if not anonymous)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="Enter your phone number"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Your phone number for donation updates
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isAnonymous"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Donate Anonymously</FormLabel>
                <FormDescription>
                  Your name will not be displayed publicly
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comment (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Leave a message of support..."
                  className="h-20"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Your message will be displayed on the fundraiser page
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
          <Button type="submit">Continue to Payment</Button>
        </div>
      </form>
    </Form>
  );
}
