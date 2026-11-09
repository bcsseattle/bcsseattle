'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { User } from '@supabase/supabase-js';
import {
  DonationFormSchema,
  Donor,
  ProductWithPrices,
  Program,
  DonationPurpose
} from '@/types';
import { Card, CardContent, CardHeader } from '../ui/card';
import { ActionBar } from '@/components/ui/action-bar';
import { Banner } from '@/components/ui/banner';
import { OptionCard } from '@/components/ui/option-card';
import { RadioGroup } from '@/components/ui/radio-group';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { GiftSummary } from '@/components/donations/gift-summary';
import { ArrowLeft } from 'lucide-react';
import { US_STATES } from '@/utils/constants';
import { submitDonation } from '@/utils/donation/handlers';
import { checkoutWithStripeForDonation } from '@/utils/stripe/server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';
import { formatMoney } from '@/utils/format';
import { getStripe } from '@/utils/stripe/client';
import Image from 'next/image';

interface DonateFormProps {
  user: User | null | undefined;
  product: ProductWithPrices;
  donor?: Donor | null;
  programs?: Program[];
  defaultPurpose?: DonationPurpose;
}

export default function DonateForm({ user, product, donor, programs, defaultPurpose }: DonateFormProps) {
  const router = useRouter();
  const [donationLoading, setDonationLoading] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const currentPath = usePathname();
  const cancelUrl = currentPath;

  const form = useForm<z.infer<typeof DonationFormSchema>>({
    mode: 'all',
    resolver: zodResolver(DonationFormSchema),
    defaultValues: {
      frequency: 'one_time',
      purpose: defaultPurpose ?? 'general-purpose',
      donorType: donor?.donor_type || 'individual',
      donorName: donor?.full_name || '',
      organizationName: donor?.organization_name || '',
      email: donor?.email || '',
      phone: donor?.phone || '',
      address: donor?.address || '',
      city: donor?.city || '',
      state: donor?.state || '',
      zip: donor?.zip_code || '',
      country: donor?.country || 'USA',
      amount: '100',
      currency: 'USD',
      paymentMethod: 'card',
      isAnonymous: false,
      userId: user?.id || ''
    }
  });

  const validateStep = async (step: number) => {
    switch (step) {
      case 0: // Donation Details
        const isDonationValid = await form.trigger([
          'frequency',
          'amount',
          'purpose'
        ]);
        return isDonationValid;
      case 1: // Donor Details
        // The schema's name check (superRefine) only runs once every field is
        // valid, so with a phone entered a missing name surfaced only at the last
        // step, on a field no longer shown: check it here (BUG-077).
        const nameField = form.getValues('donorType') === 'organization' ? 'organizationName' : 'donorName';
        if (!form.getValues(nameField)?.trim()) {
          form.setError(nameField, {
            message: nameField === 'donorName' ? 'Donor name is required for individuals' : 'Organization name is required for organizations'
          });
          return false;
        }
        const isDonorValid = await form.trigger([
          'donorType',
          'email',
          'phone',
          'address',
          'city',
          'state',
          'zip'
        ]);
        return isDonorValid;
      case 2: // Payment Method
        const isPaymentValid = await form.trigger(['paymentMethod']);
        return isPaymentValid;
      default:
        return false;
    }
  };

  const handleNextStep = async () => {
    const isStepValid = await validateStep(wizardStep);
    if (isStepValid) {
      setWizardStep((prev) => prev + 1);
    }
  };

  async function onSubmit(values: z.infer<typeof DonationFormSchema>) {
    setDonationLoading(true);
    const { donation, donor } = await submitDonation(values);
    // Zelle, check and cash are paid outside Stripe: the pledge is recorded as
    // pending and the donor follows the instructions shown (BUG-018).
    if (donation && !['card', 'us_bank_account'].includes(values.paymentMethod)) {
      setDonationLoading(false);
      form.reset();
      setWizardStep(0);
      return router.push(
        getStatusRedirect(
          currentPath,
          'Thank you!',
          'Your donation is recorded. Please complete it as shown; we will send your receipt once it arrives.'
        )
      );
    }
    if (donation) {
      const price = product?.prices?.find(
        (price) =>
          price.interval === values.frequency || price.type === 'one_time'
      );
      if (price) {
        price.unit_amount = Math.round(Number(values.amount) * 100); // whole cents (BUG-014)
        const { errorRedirect, sessionId } =
          await checkoutWithStripeForDonation(
            price,
            `/donate/confirmation/${donation.id}`,
            cancelUrl,
            donor,
            donation
          );

        if (errorRedirect) {
          setDonationLoading(false);
          return router.push(errorRedirect);
        }

        if (!sessionId) {
          setDonationLoading(false);
          return router.push(
            getErrorRedirect(
              currentPath,
              'An unknown error occurred.',
              'Please try again later or contact a system administrator.'
            )
          );
        }

        const stripe = await getStripe();
        stripe?.redirectToCheckout({ sessionId });

        setDonationLoading(false);
      }
    }
  }

  // ---------------------------------------------------------------- display
  // Donate (Figma 5:252) for step 1; Your information (24:2596) and Payment
  // (24:2699) for steps 2 and 3. The logic above is unchanged.

  const FREQUENCIES = [
    { value: 'one_time', label: 'One-time' },
    { value: 'month', label: 'Monthly' },
    { value: 'year', label: 'Yearly' }
  ];
  const PRESET_AMOUNTS = ['100', '200', '250', '500'];
  const OTHER = 'other';
  const PAYMENT_METHODS = [
    { value: 'card', label: 'Card', detail: 'Credit or debit card, processed securely by Stripe' },
    { value: 'us_bank_account', label: 'Bank transfer', detail: 'US bank account through Stripe; can take a few days to clear' },
    { value: 'zelle', label: 'Zelle', detail: 'Send to billing@bcsseattle.org and add your purpose in the memo' },
    { value: 'check', label: 'Check', detail: 'Mail to 16224 Meadow Rd #502, Lynnwood, WA 98087' },
    { value: 'cash', label: 'Cash', detail: 'Contact us to arrange a cash gift' }
  ];

  const values = form.watch();
  const amountCents = Math.round(Number(values.amount) * 100);
  const amountText = Number.isFinite(amountCents) && amountCents > 0 ? formatMoney(amountCents) : '—';
  const frequencyLabel = FREQUENCIES.find((f) => f.value === values.frequency)?.label ?? 'One-time';
  const purposeLabel =
    programs?.find((program) => program.key === values.purpose)?.value ?? 'General purpose';
  const viaStripe = values.paymentMethod === 'card' || values.paymentMethod === 'us_bank_account';
  const goBack = () => setWizardStep(wizardStep - 1);

  const setFrequency = (frequency: string) => {
    form.setValue('frequency', frequency as any);
    form.setValue('isRecurring' as any, frequency !== 'one_time');
  };

  const giftSummaryRow = (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 lg:hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-caption text-muted-foreground">
          {frequencyLabel} gift · {purposeLabel}
        </span>
        <span className="text-sm font-semibold text-foreground">{amountText}</span>
      </div>
      <Button type="button" variant="link" size="sm" onClick={() => setWizardStep(0)}>
        Edit<span className="sr-only"> your gift</span>
      </Button>
    </div>
  );

  const backButton = (
    <Button type="button" variant="ghost" size="sm" className="-ml-2.5 self-start" onClick={goBack}>
      <ArrowLeft aria-hidden />
      Back
    </Button>
  );

  const stepOne = (
    <div className="flex flex-col gap-6">
      <FormField
        control={form.control}
        name="frequency"
        render={({ field }) => (
          <FormItem>
            <FormLabel id="frequency-label">How often</FormLabel>
            <SegmentedControl
              aria-labelledby="frequency-label"
              value={field.value}
              onValueChange={setFrequency}
              options={FREQUENCIES}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel id="amount-label">Amount</FormLabel>
            <RadioGroup
              aria-labelledby="amount-label"
              value={PRESET_AMOUNTS.includes(field.value) ? field.value : OTHER}
              // "Other amount" starts from 1,000, as the Custom button did.
              onValueChange={(v) => form.setValue('amount', v === OTHER ? '1000.00' : v)}
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3"
            >
              {PRESET_AMOUNTS.map((amount) => (
                <OptionCard key={amount} value={amount} label={formatMoney(Number(amount) * 100, { whole: true })} />
              ))}
              <OptionCard value={OTHER} label="Other amount" className="max-sm:col-span-2" />
            </RadioGroup>
            <FormMessage />
          </FormItem>
        )}
      />
      {!PRESET_AMOUNTS.includes(values.amount) && (
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Other amount (USD)</FormLabel>
              {/* FormControl goes on the input itself, so the label names it. */}
              <div className="relative max-w-xs">
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
                  USD
                </span>
                <FormControl>
                  <Input type="number" inputMode="decimal" placeholder="1,000" {...field} className="pl-12" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={form.control}
        name="purpose"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Purpose</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="General purpose" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {programs?.map((program) => (
                  <SelectItem key={program.id} value={program.key}>
                    {program.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <ActionBar summary="Step 1 of 3 · Amount, then your information, then payment">
        <Button type="button" size="lg" className="w-full" onClick={handleNextStep}>
          Continue to your information
        </Button>
      </ActionBar>
      <p className="mt-0 text-caption text-muted-foreground lg:hidden">
        BCS Seattle is a 501(c)(3) nonprofit, EIN 99-2495973. We email a receipt after each payment.
      </p>
    </div>
  );

  const textField = (name: any, label: string, placeholder: string, autoComplete?: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} autoComplete={autoComplete} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const stepTwo = (
    <div className="flex flex-col gap-6">
      {backButton}
      <h2 className="text-section text-foreground">Your information</h2>
      <div className="flex flex-col gap-2">
        {giftSummaryRow}
        {donor && (
          <p className="mt-0 text-caption text-muted-foreground">
            Filled in from your member account. Changes here apply to this gift only.
          </p>
        )}
      </div>
      <FormField
        control={form.control}
        name="donorType"
        render={({ field }) => (
          <FormItem>
            <FormLabel id="donor-type-label">Donor type</FormLabel>
            <SegmentedControl
              aria-labelledby="donor-type-label"
              value={field.value}
              onValueChange={field.onChange}
              options={[
                { value: 'individual', label: 'Individual' },
                { value: 'organization', label: 'Organization' }
              ]}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex flex-col gap-4">
        {values.donorType === 'organization'
          ? textField('organizationName', 'Organization name', 'Name of your organization or company', 'organization')
          : textField('donorName', 'Name of donor', 'Your first and last name', 'name')}
        {textField('email', 'Email', 'Enter your email address', 'email')}
        {textField('phone', 'Phone', 'Enter your phone number', 'tel')}
      </div>
      <div className="flex flex-col gap-4">
        {textField('address', 'Street address', 'Enter your street address', 'street-address')}
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          {textField('city', 'City', 'Enter your city', 'address-level2')}
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="WA" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {textField('zip', 'ZIP', 'Enter your zip code', 'postal-code')}
      </div>
      <ActionBar summary="Step 2 of 3 · Then payment">
        <Button type="button" size="lg" className="w-full" onClick={handleNextStep}>
          Continue to payment
        </Button>
      </ActionBar>
    </div>
  );

  const stepThree = (
    <div className="flex flex-col gap-6">
      {backButton}
      <h2 className="text-section text-foreground">Payment</h2>
      {giftSummaryRow}
      <FormField
        control={form.control}
        name="paymentMethod"
        render={({ field }) => (
          <FormItem>
            <FormLabel id="payment-method-label">Payment method</FormLabel>
            <RadioGroup
              aria-labelledby="payment-method-label"
              value={field.value}
              onValueChange={field.onChange}
              className="gap-2"
            >
              {PAYMENT_METHODS.map((method) => (
                <OptionCard key={method.value} value={method.value} label={method.label} detail={method.detail} />
              ))}
            </RadioGroup>
            <FormMessage />
          </FormItem>
        )}
      />
      {values.paymentMethod === 'zelle' && (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-sm">
          <p className="mt-0">Donate via Zelle® to billing@bcsseattle.org (Write your purpose in Memo)</p>
          <Image src="/images/zelle.png" width={200} height={200} alt="BCS Seattle Zelle QR code" />
        </div>
      )}
      {values.paymentMethod === 'cash' && (
        <Link href="/contact-us" className="text-sm text-accent underline underline-offset-4">
          Contact us to arrange a cash gift
        </Link>
      )}
      {viaStripe && (
        <FormField
          control={form.control}
          name="isAnonymous"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
              </FormControl>
              <div className="flex flex-col gap-0.5">
                <FormLabel className="text-sm font-medium">Keep this donation anonymous</FormLabel>
                <FormDescription>Your name won&apos;t appear on the public donor list.</FormDescription>
              </div>
            </FormItem>
          )}
        />
      )}
      {viaStripe && (
        <p className="mt-0 text-caption text-muted-foreground">
          {values.paymentMethod === 'card' ? 'Card' : 'Bank'} details are entered in Stripe&apos;s secure payment
          sheet. BCS Seattle is a 501(c)(3) nonprofit; we email a tax receipt for every gift.
        </p>
      )}
      <ActionBar summary={viaStripe ? 'Step 3 of 3 · You confirm payment details with Stripe' : 'Step 3 of 3'}>
        <Button type="submit" size="lg" className="w-full">
          {viaStripe ? `Donate ${amountText}` : 'Done'}
        </Button>
      </ActionBar>
    </div>
  );

  if (donationLoading) {
    return (
      <div role="status" className="flex h-96 flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
        <span className="size-8 animate-spin rounded-full border-2 border-border border-t-foreground" aria-hidden />
        Processing your donation…
      </div>
    );
  }

  return (
    <div className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12 lg:pt-16">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="mt-0 text-overline uppercase text-muted-foreground">Donate</p>
          <h1 className="text-display text-foreground">Support BCS Seattle</h1>
          <p className="mt-0 text-sm text-muted-foreground">
            Your gift funds educational programs, cultural events and social services for the Baloch community in
            Greater Seattle.
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
            {wizardStep === 0 && stepOne}
            {wizardStep === 1 && stepTwo}
            {wizardStep === 2 && stepThree}
          </form>
        </Form>
      </div>
      <aside aria-label="Your gift" className="hidden flex-col gap-4 lg:flex lg:pt-[130px]">
        <Card>
          <CardHeader>
            <h2 className="text-section text-foreground">Your gift</h2>
          </CardHeader>
          <CardContent>
            <GiftSummary frequency={frequencyLabel} amount={amountText} purpose={purposeLabel} total={amountText} />
          </CardContent>
        </Card>
        <Banner tone="info" title="A receipt for every gift">
          BCS Seattle is a 501(c)(3) nonprofit, EIN 99-2495973. We email a receipt after each payment.
        </Banner>
      </aside>
    </div>
  );
}
