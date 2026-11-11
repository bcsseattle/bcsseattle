'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { ReceiptRows } from '@/components/donations/gift-rows';
import { ActionBar } from '@/components/ui/action-bar';
import { Button } from '@/components/ui/button';
import { ResultHeader } from '@/components/ui/result-header';
import { formatDate, formatMoney } from '@/utils/format';
import { CHECK_ADDRESS, ZELLE_EMAIL, paidWith, viaStripe } from '@/utils/giving';
import { Loaded } from '~/components/screen';
import { FlowScreen, giftQuery, purposeLabel } from '~/components/give/gift';
import { SITE_URL, must } from '~/lib/api';
import { openInApp } from '~/lib/open';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

/** A gift as the result screen shows it, from `donations` or `fundraiser_donations`. */
type Gift = {
  status: string;
  cents: number;
  /** "Purpose" for a donation, "Fundraiser" for a fundraiser gift. */
  forLabel: string;
  forValue: string;
  method: string;
  date: string;
  firstName?: string;
  /** Where Try again starts over. */
  retry: string;
};

const first = (name?: string | null) => name?.trim().split(/\s+/)[0] || undefined;

async function loadGift(kind: string, id: string): Promise<Gift | null> {
  if (!id) return null;
  if (kind === 'fundraiser') {
    // By its id, which only whoever made the gift has; no name for an anonymous gift (W27).
    const row = (await must(supabase.rpc('fundraiser_gift', { p_donation: id })))?.[0];
    if (!row) return null;
    return {
      status: row.payment_status ?? 'pending',
      cents: Math.round(row.amount * 100),
      forLabel: 'Fundraiser',
      forValue: row.fundraiser_title ?? 'Fundraiser',
      method: 'card',
      date: row.created_at,
      firstName: first(row.donor_name),
      retry: `/give/fundraisers/donate/?id=${row.fundraiser_id}`
    };
  }
  // Under RLS a member reads a donation when its donor record is theirs, or when they are an active member.
  const row = await must(supabase.from('donations').select('*, donors(full_name)').eq('id', id).maybeSingle());
  if (!row) return null;
  return {
    status: row.donation_status,
    cents: row.donation_amount,
    forLabel: 'Purpose',
    forValue: purposeLabel(row.purpose),
    method: row.payment_method ?? '',
    date: row.donation_date,
    firstName: first(row.donors?.full_name),
    retry: `/give/gift/?${giftQuery({
      amount: String(row.donation_amount / 100),
      frequency: row.donation_interval ?? 'one_time',
      purpose: row.purpose ?? 'general-purpose'
    })}`
  };
}

/**
 * Where a gift ends: Stripe's return (/m/return/checkout) and a recorded
 * pledge both land here. Gift complete (Figma 24:2778) or pending (24:2843)
 * is decided by the gift's own status; ?canceled=1 means Stripe was left unpaid.
 */
export default function GiftResult() {
  const params = useSearchParams();
  const router = useRouter();
  const kind = params.get('kind') === 'fundraiser' ? 'fundraiser' : 'donation';
  const id = params.get('id') ?? '';
  const canceled = params.get('canceled') === '1';
  const state = useData(() => loadGift(kind, id), [kind, id]);

  // Stripe's webhook usually lands a moment after the donor does: check again every 5 seconds, as the website does.
  const confirming = !canceled && state.data?.status === 'pending' && viaStripe(state.data.method);
  useEffect(() => {
    if (!confirming) return;
    const timer = setInterval(state.reload, 5000);
    return () => clearInterval(timer);
  }, [confirming, state.reload]);

  const home = kind === 'fundraiser' ? '/give/fundraisers/' : '/give/';

  return (
    <FlowScreen>
      <Loaded state={state}>
        {(gift) => {
          const notPaid = canceled ? gift?.status !== 'completed' : gift?.status === 'failed';
          return (
            <div className="flex flex-col gap-6 pt-8">
              <Outcome id={id} gift={gift} kind={kind} canceled={canceled} method={params.get('method')} />
              <ActionBar className="mt-auto">
                <Button size="lg" className="w-full" onClick={() => router.replace(notPaid ? gift?.retry ?? home : home)}>
                  {notPaid ? 'Try again' : 'Done'}
                </Button>
                {notPaid && (
                  <Button variant="ghost" size="lg" className="w-full" onClick={() => router.replace(home)}>
                    Not now
                  </Button>
                )}
              </ActionBar>
            </div>
          );
        }}
      </Loaded>
    </FlowScreen>
  );
}

function Outcome({
  id,
  gift,
  kind,
  canceled,
  method
}: {
  id: string;
  gift: Gift | null;
  kind: string;
  canceled: boolean;
  method: string | null;
}) {
  const thanks = (name?: string) => (name ? `Thank you, ${name}` : 'Thank you');

  if (!gift) {
    // Not readable here: the donor record behind it belongs to another account (another email was entered).
    if (canceled) return <NotCompleted title="Payment not completed">You left Stripe before paying, so no money was taken.</NotCompleted>;
    if (method && !viaStripe(method)) return <Pledge method={method} />;
    return (
      <ResultHeader tone="pending" title="Thank you for your gift">
        We can’t show this gift’s details in the app. Your receipt is on the website once the payment arrives.
      </ResultHeader>
    );
  }

  const amount = formatMoney(gift.cents);
  const rows = (status?: string): [string, ReactNode][] => [
    ['Amount', amount],
    [gift.forLabel, gift.forValue],
    [status === 'Not paid' || status === 'Failed' ? 'Payment method' : 'Paid with', paidWith(gift.method)],
    status ? ['Status', status] : ['Date', formatDate(gift.date)]
  ];

  if (gift.status === 'completed') {
    return (
      <>
        <ResultHeader tone="success" title={thanks(gift.firstName)}>
          Your gift of {amount} to {gift.forValue} is complete.
        </ResultHeader>
        <div className="flex flex-col gap-3">
          <ReceiptRows rows={rows()} truncate />
          {kind === 'donation' && (
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => openInApp(`/donate/confirmation/${id}`)}
            >
              View receipt
            </Button>
          )}
        </div>
        <p className="mt-0 text-caption text-muted-foreground">
          BCS Seattle is a 501(c)(3) nonprofit, EIN 99-2495973. No goods or services were provided in exchange for this
          gift.
        </p>
      </>
    );
  }
  if (gift.status === 'refunded') {
    return <NotCompleted title="This gift was refunded">The money went back to you, so no receipt is issued.</NotCompleted>;
  }
  if (canceled || gift.status === 'failed') {
    return (
      <>
        <NotCompleted title={canceled ? 'Payment not completed' : 'Your payment did not go through'}>
          {canceled ? 'You left Stripe before paying, so no money was taken.' : 'No money was taken.'} You can try again.
        </NotCompleted>
        <ReceiptRows rows={rows(canceled ? 'Not paid' : 'Failed')} truncate />
      </>
    );
  }
  if (!viaStripe(gift.method)) {
    return <Pledge method={gift.method} gift={gift} rows={rows('Awaiting payment')} />;
  }
  return (
    <>
      <ResultHeader tone="pending" title="We’re confirming your payment">
        {thanks(gift.firstName)}.{' '}
        {gift.method === 'us_bank_account'
          ? 'Bank transfers can take a few days; your receipt is ready as soon as the money arrives.'
          : 'This usually takes a moment; your receipt is ready as soon as the payment is confirmed.'}
      </ResultHeader>
      <ReceiptRows rows={rows('Confirming')} truncate />
      <p className="mt-0 text-caption text-muted-foreground">
        No receipt is issued until the payment is received. If the payment fails, no money is taken.
      </p>
    </>
  );
}

/** Zelle, check or cash: the pledge is recorded; the instructions are the website's (donate-form.tsx). */
function Pledge({ method, gift, rows }: { method: string; gift?: Gift; rows?: [string, ReactNode][] }) {
  const amount = gift ? formatMoney(gift.cents) : 'your gift';
  const purpose = gift?.forValue ?? 'your purpose';
  const title = { zelle: 'Send your gift by Zelle', check: 'Mail your check', cash: 'Arrange your cash gift' }[method] ?? 'Complete your gift';
  return (
    <>
      <ResultHeader tone="pending" title={title}>
        Thank you{gift?.firstName ? `, ${gift.firstName}` : ''}. We’ve recorded your gift; your receipt is ready once it
        arrives.
      </ResultHeader>
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-sm text-foreground">
        {method === 'zelle' && (
          <>
            <p className="mt-0">
              Send {amount} with Zelle® to <span className="font-semibold">{ZELLE_EMAIL}</span>. Write “{purpose}” in the
              memo.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element -- the website's own QR image */}
            <img src={`${SITE_URL}/images/zelle.png`} width={160} height={160} alt="BCS Seattle Zelle QR code" />
          </>
        )}
        {method === 'check' && (
          <p className="mt-0">
            Mail your check for {amount} to <span className="font-semibold">{CHECK_ADDRESS}</span>. Write “{purpose}” in
            the memo.
          </p>
        )}
        {method === 'cash' && (
          <>
            <p className="mt-0">Contact us to arrange a cash gift of {amount}.</p>
            <Button variant="outline" size="lg" className="w-full" onClick={() => openInApp('/contact-us')}>
              Contact us
            </Button>
          </>
        )}
      </div>
      {rows && <ReceiptRows rows={rows} truncate />}
    </>
  );
}

/** Result header in a neutral tone with an X: the gift was not paid. Says so in words. */
function NotCompleted({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted text-foreground">
        <X aria-hidden className="size-6" />
      </div>
      <h1 className="text-screen text-foreground">{title}</h1>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
