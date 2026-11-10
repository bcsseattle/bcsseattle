'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OptionCard } from '@/components/ui/option-card';
import { RadioGroup } from '@/components/ui/radio-group';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton, Loading } from '@/components/ui/skeleton';
import { DONATION_PURPOSES, type Fundraiser, type Price } from '@/types';
import type { Tables } from '@/types_db';
import { formatMoney } from '@/utils/format';
import { FREQUENCIES, PRESET_AMOUNTS, dollars, type Frequency } from '@/utils/giving';
import { AppHeader } from '~/components/app-header';
import { Loaded } from '~/components/screen';
import { FieldRow, NativeSelect, giftQuery } from '~/components/give/gift';
import { AppFundraiserCard } from '~/components/give/fundraiser-card';
import { must } from '~/lib/api';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

type GiveData = {
  /** The frequencies the "BCS Donation" product has an active price for. */
  frequencies: Frequency[];
  purposes: Pick<Tables<'programs'>, 'key' | 'value'>[];
  featured: Fundraiser | null;
};

async function loadGive(): Promise<GiveData> {
  const [product, programs, fundraisers] = await Promise.all([
    must(
      supabase
        .from('products')
        .select('prices(*)')
        .eq('active', true)
        .eq('name', 'BCS Donation')
        .eq('prices.active', true)
        .maybeSingle()
    ),
    must(supabase.from('programs').select('key, value').eq('active', true)),
    must(
      supabase.from('fundraisers').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1)
    )
  ]);
  const prices = (product?.prices ?? []) as Price[];
  return {
    frequencies: FREQUENCIES.map((f) => f.value).filter((f) =>
      prices.some((p) => (f === 'one_time' ? p.type === 'one_time' : p.interval === f))
    ),
    // Only purposes the donation form accepts (DonationFormSchema).
    purposes: (programs ?? []).filter((p) => (DONATION_PURPOSES as readonly string[]).includes(p.key ?? '')),
    featured: fundraisers?.[0] ?? null
  };
}

/** Give (Figma 14:1906): choose a gift, then the flow takes the donor's details and payment. */
export default function GiveTab() {
  const state = useData(loadGive);
  return (
    <>
      <AppHeader title="Give" subtitle="Support BCS Seattle’s programs and services." />
      <div className="flex flex-col gap-6 px-4 pb-6 pt-2">
        <Loaded
          state={state}
          skeleton={
            <Loading>
              <Skeleton className="h-[440px] rounded-lg bg-border" />
            </Loading>
          }
        >
          {(data) => (
            <>
              <ChooseGift data={data} />
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-section text-foreground">Fundraisers</h2>
                  <Link
                    href="/give/fundraisers/"
                    className={buttonVariants({ variant: 'link', size: 'lg', className: 'text-caption font-medium no-underline' })}
                  >
                    See all<span className="sr-only"> fundraisers</span>
                  </Link>
                </div>
                {data.featured ? (
                  <AppFundraiserCard fundraiser={data.featured} />
                ) : (
                  <p className="mt-0 text-sm text-muted-foreground">No fundraisers are open right now.</p>
                )}
              </section>
            </>
          )}
        </Loaded>
      </div>
    </>
  );
}

const OTHER = 'other';

function ChooseGift({ data }: { data: GiveData }) {
  const router = useRouter();
  const params = useSearchParams();
  // Edit (from Your information) comes back here with the gift in the query.
  const initialAmount = params.get('amount') ?? '100';
  const [frequency, setFrequency] = useState<Frequency>(() => {
    const f = params.get('frequency') as Frequency;
    return data.frequencies.includes(f) ? f : data.frequencies[0] ?? 'one_time';
  });
  const [amount, setAmount] = useState(initialAmount);
  const [other, setOther] = useState(!PRESET_AMOUNTS.includes(initialAmount));
  const [purpose, setPurpose] = useState(params.get('purpose') ?? 'general-purpose');
  const [error, setError] = useState<string>();

  const valid = Number(amount) >= 1 && Number.isFinite(Number(amount));
  const frequencies = FREQUENCIES.filter((f) => data.frequencies.includes(f.value));

  const next = () => {
    if (!valid) return setError('Enter an amount of at least USD 1.00.');
    router.push(`/give/gift/?${giftQuery({ amount, frequency, purpose })}`);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      {frequencies.length > 1 && (
        <div className="flex flex-col gap-2">
          <span id="frequency-label" className="text-caption font-medium text-foreground">
            How often
          </span>
          {/* 40px items in a 2px track: a 44pt target. */}
          <SegmentedControl
            aria-labelledby="frequency-label"
            value={frequency}
            onValueChange={(v) => setFrequency(v as Frequency)}
            options={frequencies}
            className="self-start [&>button]:h-10 [&>button]:px-3 [&>button]:text-sm"
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <span id="amount-label" className="text-caption font-medium text-foreground">
          Amount
        </span>
        <RadioGroup
          aria-labelledby="amount-label"
          value={other ? OTHER : amount}
          onValueChange={(v) => {
            setError(undefined);
            setOther(v === OTHER);
            setAmount(v === OTHER ? '' : v);
          }}
          className="grid-cols-2"
        >
          {PRESET_AMOUNTS.map((a) => (
            <OptionCard key={a} value={a} label={formatMoney(Number(a) * 100, { whole: true })} className="min-h-11" />
          ))}
          <OptionCard value={OTHER} label="Other amount" className="col-span-2 min-h-11" />
        </RadioGroup>
      </div>
      {other && (
        <FieldRow label="Other amount (USD)" htmlFor="other-amount" error={error}>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
              USD
            </span>
            <Input
              id="other-amount"
              type="number"
              inputMode="decimal"
              min={1}
              step="0.01"
              placeholder="1,000"
              autoFocus
              value={amount}
              aria-invalid={!!error}
              onChange={(e) => {
                setError(undefined);
                setAmount(e.target.value);
              }}
              className="h-11 pl-12"
            />
          </div>
        </FieldRow>
      )}
      <FieldRow label="Purpose" htmlFor="purpose">
        <NativeSelect id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
          {data.purposes.length ? (
            data.purposes.map((p) => (
              <option key={p.key} value={p.key ?? ''}>
                {p.value}
              </option>
            ))
          ) : (
            <option value="general-purpose">General purpose</option>
          )}
        </NativeSelect>
      </FieldRow>
      <Button size="lg" className="w-full" onClick={next}>
        Continue{valid && ` · ${dollars(amount).replace('.00', '')}`}
      </Button>
      <p className="mt-0 text-caption text-muted-foreground">
        {/* The mock says "We email a receipt"; nothing sends one (the website's receipt page says the same), so it doesn't claim it. */}
        501(c)(3) nonprofit · EIN 99-2495973. A tax receipt is ready once your payment arrives.
      </p>
    </div>
  );
}
