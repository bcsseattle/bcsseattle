'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { z } from 'zod';
import { ActionBar } from '@/components/ui/action-bar';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OptionCard } from '@/components/ui/option-card';
import { RadioGroup } from '@/components/ui/radio-group';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { DonationFormSchema } from '@/types';
import { US_STATES } from '@/utils/constants';
import { Loaded } from '~/components/screen';
import {
  CheckRow,
  FieldRow,
  FlowScreen,
  GiftSummaryRow,
  NativeSelect,
  PAYMENT_METHODS,
  dollars,
  frequencyLabel,
  giftQuery,
  paidWith,
  purposeLabel,
  viaStripe,
  type PaymentMethod
} from '~/components/give/gift';
import { api, must } from '~/lib/api';
import { openOutside } from '~/lib/open';
import { useSession } from '~/lib/session';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

type Values = z.input<typeof DonationFormSchema>;
type Errors = Partial<Record<keyof Values, string>>;

const INFO_FIELDS = ['donorName', 'organizationName', 'email', 'phone', 'address', 'city', 'state', 'zip'] as const;

/**
 * The donor's details as DonationFormSchema needs them, filled in from their
 * own donor record (a previous gift) or else their member record.
 */
function usePrefill() {
  const user = useSession().session?.user;
  return useData(async () => {
    if (!user) throw new Error('Sign in to continue.');
    const [donor, member] = await Promise.all([
      must(supabase.from('donors').select('*').eq('user_id', user.id).limit(1).maybeSingle()),
      must(supabase.from('members').select('*').eq('user_id', user.id).maybeSingle())
    ]);
    return {
      donorType: donor?.donor_type ?? 'individual',
      donorName: donor?.full_name || member?.fullName || '',
      organizationName: donor?.organization_name ?? '',
      email: donor?.email || user.email || '',
      phone: donor?.phone || member?.phone || '',
      address: donor?.address || member?.address || '',
      city: donor?.city || member?.city || '',
      state: donor?.state || member?.state || '',
      zip: donor?.zip_code || member?.zip || '',
      fromAccount: !!(donor || member)
    };
  }, [user?.id]);
}

/** Your information (Figma 24:2596), then Payment (24:2699). ?step=payment is the second step. */
export default function GiftFlow() {
  const params = useSearchParams();
  const router = useRouter();
  const prefill = usePrefill();
  const gift = {
    amount: params.get('amount') ?? '',
    frequency: (['one_time', 'month', 'year'].includes(params.get('frequency') ?? '') ? params.get('frequency') : 'one_time') as Values['frequency'],
    purpose: (params.get('purpose') ?? 'general-purpose') as Values['purpose']
  };
  const validGift = Number(gift.amount) >= 1;

  useEffect(() => {
    if (!validGift) router.replace('/give/');
  }, [validGift, router]);
  if (!validGift) return null;

  return (
    <Loaded state={prefill}>
      {({ fromAccount, ...donor }) => (
        <GiftForm
          gift={gift}
          fromAccount={fromAccount}
          initial={{
            ...gift,
            ...donor,
            isRecurring: gift.frequency !== 'one_time',
            country: 'USA',
            currency: 'USD',
            paymentMethod: 'card',
            isAnonymous: false
          }}
        />
      )}
    </Loaded>
  );
}

function GiftForm({
  gift,
  initial,
  fromAccount
}: {
  gift: { amount: string; frequency: Values['frequency']; purpose: string };
  initial: Values;
  fromAccount: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [infoDone, setInfoDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string>();
  // A reload on the Payment step loses the details, so it starts again at Your information.
  const step = params.get('step') === 'payment' && infoDone ? 'payment' : 'info';

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const amountText = dollars(gift.amount);
  const summary = (
    <GiftSummaryRow
      caption={`${frequencyLabel(gift.frequency)} gift · ${purposeLabel(gift.purpose)}`}
      amount={amountText}
      onEdit={() => router.replace(`/give/?${giftQuery(gift)}`)}
    />
  );

  const continueToPayment = () => {
    const found: Errors = {};
    const parsed = DonationFormSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as (typeof INFO_FIELDS)[number];
        if (INFO_FIELDS.includes(key)) found[key] ??= issue.message;
      }
    }
    // The schema's name rule (superRefine) only runs once every other field passes, so check it here too (BUG-077).
    const nameField = values.donorType === 'organization' ? 'organizationName' : 'donorName';
    if (!values[nameField]?.trim()) {
      found[nameField] = nameField === 'donorName' ? 'Enter the donor’s name.' : 'Enter the organization’s name.';
    }
    if (Object.keys(found).length) return setErrors(found);
    setInfoDone(true);
    router.push(`/give/gift/?${giftQuery(gift)}&step=payment`);
  };

  const give = async () => {
    setPending(true);
    setFailure(undefined);
    try {
      const result = await api<{ donationId: string; url?: string; status?: 'pending' }>('/api/app/donations', {
        json: values
      });
      if (result.url) {
        // Card and bank: Stripe Checkout opens in Safari (plan §4) and comes back to /give/result/.
        await openOutside(result.url);
      } else {
        router.replace(`/give/result/?kind=donation&id=${result.donationId}&method=${values.paymentMethod}`);
      }
    } catch (e) {
      setFailure(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  };

  if (step === 'info') {
    return (
      <FlowScreen title="Your information" back={{ label: 'Give' }}>
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            continueToPayment();
          }}
        >
          <div className="flex flex-col gap-2">
            {summary}
            {fromAccount && (
              <p className="mt-0 text-caption text-muted-foreground">
                Filled in from your member account. Changes here apply to this gift only.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span id="donor-type-label" className="text-caption font-medium text-foreground">
              Donor type
            </span>
            <SegmentedControl
              aria-labelledby="donor-type-label"
              value={values.donorType}
              onValueChange={(v) => set('donorType', v as Values['donorType'])}
              options={[
                { value: 'individual', label: 'Individual' },
                { value: 'organization', label: 'Organization' }
              ]}
              className="flex w-full [&>button]:h-10 [&>button]:flex-1 [&>button]:text-sm"
            />
          </div>
          <div className="flex flex-col gap-4">
            {values.donorType === 'organization' ? (
              <TextField label="Organization name" name="organizationName" autoComplete="organization" values={values} errors={errors} set={set} />
            ) : (
              <TextField label="Name of donor" name="donorName" autoComplete="name" values={values} errors={errors} set={set} />
            )}
            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              hint="Your gifts are recorded under this email."
              values={values}
              errors={errors}
              set={set}
            />
            <TextField label="Phone" name="phone" type="tel" autoComplete="tel" values={values} errors={errors} set={set} />
          </div>
          <div className="flex flex-col gap-4">
            <TextField label="Street address" name="address" autoComplete="street-address" values={values} errors={errors} set={set} />
            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <TextField label="City" name="city" autoComplete="address-level2" values={values} errors={errors} set={set} />
              <FieldRow label="State" htmlFor="state" error={errors.state}>
                <NativeSelect id="state" autoComplete="address-level1" value={values.state ?? ''} onChange={(e) => set('state', e.target.value)}>
                  <option value="">—</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </NativeSelect>
              </FieldRow>
            </div>
            <TextField label="ZIP" name="zip" inputMode="numeric" autoComplete="postal-code" values={values} errors={errors} set={set} />
          </div>
          <ActionBar summary="Step 2 of 3 · Payment is next" className="mt-auto">
            <Button type="submit" size="lg" className="w-full">
              Continue to payment
            </Button>
          </ActionBar>
        </form>
      </FlowScreen>
    );
  }

  const stripe = viaStripe(values.paymentMethod);
  return (
    <FlowScreen title="Payment">
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          give();
        }}
      >
        {summary}
        <div className="flex flex-col gap-2">
          <span id="method-label" className="text-caption font-medium text-foreground">
            Payment method
          </span>
          <RadioGroup
            aria-labelledby="method-label"
            value={values.paymentMethod}
            onValueChange={(v) => set('paymentMethod', v as PaymentMethod)}
          >
            {PAYMENT_METHODS.map((m) => (
              <OptionCard key={m.value} value={m.value} label={m.label} detail={m.detail} />
            ))}
          </RadioGroup>
        </div>
        {stripe && (
          <CheckRow
            checked={!!values.isAnonymous}
            onChange={(checked) => set('isAnonymous', checked)}
            label="Keep this donation anonymous"
            detail="Your name won’t appear on the public donor list."
          />
        )}
        <p className="mt-0 text-caption text-muted-foreground">
          {stripe
            ? `You enter your ${values.paymentMethod === 'card' ? 'card' : 'bank'} details on Stripe’s secure page, which opens in Safari. `
            : 'We record your gift now; you pay as shown on the next screen. '}
          BCS Seattle is a 501(c)(3) nonprofit; a tax receipt is ready once your payment arrives.
        </p>
        {failure && (
          <Banner tone="error" title="Your gift wasn’t started">
            {failure}
          </Banner>
        )}
        <ActionBar summary={stripe ? 'Step 3 of 3 · You confirm payment with Stripe' : 'Step 3 of 3'} className="mt-auto">
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? 'Starting…' : stripe ? 'Continue to secure payment' : `Give ${amountText} by ${values.paymentMethod === 'zelle' ? 'Zelle' : paidWith(values.paymentMethod).toLowerCase()}`}
          </Button>
        </ActionBar>
      </form>
    </FlowScreen>
  );
}

function TextField({
  label,
  name,
  hint,
  values,
  errors,
  set,
  ...props
}: {
  label: string;
  name: (typeof INFO_FIELDS)[number];
  hint?: ReactNode;
  values: Values;
  errors: Errors;
  set: (key: keyof Values, value: string) => void;
} & Omit<React.ComponentProps<'input'>, 'name' | 'value'>) {
  const id = useId();
  return (
    <FieldRow label={label} htmlFor={id} error={errors[name]} hint={hint}>
      <Input
        id={id}
        name={name}
        className="h-11"
        value={values[name] ?? ''}
        aria-invalid={!!errors[name]}
        onChange={(e) => set(name, e.target.value)}
        {...props}
      />
    </FieldRow>
  );
}
