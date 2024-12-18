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
import { Slider } from '@/components/ui/slider';
import { User } from '@supabase/supabase-js';
import { DonationFormSchema, Product, Price, Donor } from '@/types';
import { Card } from '../ui/card';
import { US_STATES } from '@/utils/constants';
import { submitDonation } from '@/utils/donation/handlers';
import { checkoutWithStripeForDonation } from '@/utils/stripe/server';
import { getErrorRedirect, getPriceString } from '@/utils/helpers';
import { getStripe } from '@/utils/stripe/client';
import { Wizard } from '../ui/wizard';
import Image from 'next/image';

const InfoBlock = ({ title, description, children }: any) => (
  <Card className="p-4 bg-blue-100">
    <div className="flex items-center space-x-2">
      <div>
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-md">{description}</p>
        {children}
      </div>
    </div>
  </Card>
);

interface DonateFormProps {
  user: User | null | undefined;
  product: Product & {
    prices: Price[];
  };
  donor?: Donor | null;
}

export default function DonateForm({ user, product, donor }: DonateFormProps) {
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
      purpose: 'general-purpose',
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
        const isDonorValid = await form.trigger([
          'donorType',
          // 'donorName',
          // 'organizationName',
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
    if (donation) {
      const price = product?.prices?.find(
        (price) =>
          price.interval === values.frequency || price.type === 'one_time'
      );
      if (price) {
        price.unit_amount = Number(values.amount) * 100;
        const { errorRedirect, sessionId } =
          await checkoutWithStripeForDonation(
            price,
            `/donate/confirmation?donation_id=${donation.id}`,
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

  const donationFrequencies = [
    {
      text: 'One-Time',
      value: 'one_time'
    },
    { text: 'Monthly', value: 'month' },
    { text: 'Yearly', value: 'year' }
  ];

  const donationAmounts = ['100', '200', '250', '500'];
  const donationButtons = donationAmounts.map((amount) => (
    <Button
      key={amount}
      variant={form.watch('amount') === amount ? 'secondary' : 'outline'}
      type="button"
      onClick={() => form.setValue('amount', amount)}
    >
      ${amount}
    </Button>
  ));

  const donationDetails = (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="frequency"
        render={() => (
          <FormItem>
            <FormControl>
              <>
                <div className="grid grid-cols-3 gap-4">
                  {donationFrequencies.map((donationFrequency: any) => (
                    <Button
                      key={donationFrequency?.value}
                      variant={
                        form.watch('frequency') === donationFrequency?.value
                          ? 'secondary'
                          : 'outline'
                      }
                      type="button"
                      onClick={() => {
                        form.setValue('frequency', donationFrequency?.value);
                        form.watch('frequency') === 'one_time'
                          ? form.setValue('isRecurring', false)
                          : form.setValue('isRecurring', true);
                      }}
                    >
                      {donationFrequency?.text}
                    </Button>
                  ))}
                </div>
              </>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <>
                <div className="grid grid-cols-3 gap-4">
                  {donationButtons}
                  <Button
                    variant={
                      !donationAmounts.includes(form.watch('amount'))
                        ? 'default'
                        : 'outline'
                    }
                    type="button"
                    onClick={() => form.setValue('amount', '1000.00')}
                  >
                    Custom
                  </Button>
                </div>
              </>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {!donationAmounts.includes(form.watch('amount')) && (
        <>
          <Slider
            defaultValue={[Number(form.watch('amount'))]}
            min={5}
            max={100000}
            step={1}
            onChange={(e: any) => {
              const amount = e.target.value.toString();
              form.setValue('amount', amount);
            }}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      $
                    </div>
                    <Input
                      type="number"
                      placeholder="$1,000"
                      {...field}
                      className="pl-8"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
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
                  <SelectValue
                    placeholder="General Purpose"
                    // defaultValue={field.value}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="general-purpose">General Purpose</SelectItem>
                <SelectItem value="funeral-and-burial">
                  Funeral & Burial
                </SelectItem>
                <SelectItem value="new-member-support">
                  New Member Support
                </SelectItem>
                <SelectItem value="youth-programs">Youth Programs</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const donorDetails = (
    <div className="space-y-2">
      <FormField
        control={form.control}
        name="donorType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Donor Type</FormLabel>
            <Select onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Individual" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {form.watch('donorType') === 'individual' && (
        <FormField
          control={form.control}
          name="donorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name of Donor</FormLabel>
              <FormControl>
                <Input placeholder="Your first and last name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {form.watch('donorType') === 'organization' && (
        <FormField
          control={form.control}
          name="organizationName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Name of your organization or company"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="Enter your email address" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone</FormLabel>
            <FormControl>
              <Input placeholder="Enter your phone number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Street Address</FormLabel>
            <FormControl>
              <Input placeholder="Enter your street address" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex justify-between space-x-2">
        <div className="w-1/2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your city" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="w-1/2">
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange}>
                    <SelectTrigger className="">
                      <SelectValue placeholder="WA" {...field} />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
      <FormField
        control={form.control}
        name="zip"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Zip</FormLabel>
            <FormControl>
              <Input placeholder="Enter your zip code" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const paymentMethod = (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="paymentMethod"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Payment Method</FormLabel>
            <FormControl>
              <Select onValueChange={field.onChange}>
                <SelectTrigger className="">
                  <SelectValue placeholder="Credit Card" {...field} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Credit Card</SelectItem>
                  <SelectItem value="us_bank_account">Bank Transfer</SelectItem>
                  <SelectItem value="zelle">Zelle</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {form.watch('paymentMethod') === 'zelle' && (
        <div className="space-y-4">
          <p>
            Donate via Zelle® to billing@bcsseattle.org (Write your purpose in
            Memo)
          </p>
          <Image
            src="/images/zelle.png"
            width={200}
            height={200}
            alt="BCSS Zelle QR"
          />
        </div>
      )}

      {form.watch('paymentMethod') === 'check' && (
        <InfoBlock
          title="Check Donation"
          description="Please mail your check to the following address:"
        >
          <div className="mt-8 text-sm">
            <p>Baloch Community Services of Seattle</p>
            <p>16224 Meadow Rd #502</p>
            <p>Lynnwood, WA 98087</p>
          </div>
        </InfoBlock>
      )}

      {form.watch('paymentMethod') === 'cash' && (
        <InfoBlock
          title="Cash Donation"
          description="Please contact us to arrange a cash donation."
        >
          <br />
          <Link href="/contact-us" className="font-bold">
            Contact us
          </Link>{' '}
        </InfoBlock>
      )}

      {form.watch('paymentMethod') === 'card' ||
      form.watch('paymentMethod') === 'us_bank_account' ? (
        <FormField
          control={form.control}
          name="isAnonymous"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Keep this donation anonymous</FormLabel>
                <FormDescription>
                  You can choose to keep this donation anonymous. Your name will
                  not appear on the public donor list.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      ) : null}
    </div>
  );

  const wizardSteps = [
    {
      title: 'Donation',
      content: <>{donationDetails}</>,
      action: (
        <div className="flex justify-between space-x-12">
          <Button
            variant={'default'}
            className="flex-1 mt-4 text-white"
            onClick={handleNextStep}
            type="button"
          >
            Continue to your information
          </Button>
        </div>
      )
    },
    {
      title: 'Your Information',
      content: donorDetails,
      action: (
        <div className="flex justify-between space-x-12">
          <Button
            variant="link"
            className="flex-1 mt-4 justify-start to-blue-500"
            onClick={() => setWizardStep(wizardStep - 1)}
            type="button"
          >
            Back
          </Button>
          <Button
            variant={'default'}
            className="flex-1 mt-4 text-white"
            onClick={handleNextStep}
            type="button"
          >
            Continue to payment
          </Button>
        </div>
      )
    },
    {
      title: 'Payment Method',
      content: paymentMethod,
      action: (
        <Button
          variant="link"
          className="flex-1 mt-4 justify-start to-blue-500"
          onClick={() => setWizardStep(wizardStep - 1)}
          type="button"
        >
          Back
        </Button>
      )
    }
  ];

  if (donationLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <p>Processing your donation...</p>
          <div className="w-12 h-12 border-4 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          <Wizard steps={wizardSteps} wizardStep={wizardStep}>
            {wizardStep === wizardSteps.length - 1 && (
              <div className="flex justify-end space-x-2 pt-4">
                <Button className="" variant="secondary" type="submit">
                  {form.watch('paymentMethod') === 'card' ||
                  form.watch('paymentMethod') === 'us_bank_account'
                    ? `Donate ${getPriceString(Number(form.watch('amount')) * 100)} Now`
                    : 'Done'}
                </Button>
              </div>
            )}
          </Wizard>
        </form>
      </Form>
    </div>
  );
}
