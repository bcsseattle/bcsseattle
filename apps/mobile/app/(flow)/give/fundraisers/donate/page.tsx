'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CircleOff } from 'lucide-react';
import { ActionBar } from '@/components/ui/action-bar';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatePanel } from '@/components/ui/state-panel';
import { Textarea } from '@/components/ui/textarea';
import type { Fundraiser } from '@/types';
import { formatMoney } from '@/utils/format';
import { Loaded } from '~/components/screen';
import { CheckRow, FieldRow, FlowScreen, GiftSummaryRow, dollars } from '~/components/give/gift';
import { isOpen } from '~/components/give/fundraiser-card';
import { api, must } from '~/lib/api';
import { openOutside } from '~/lib/open';
import { useSession } from '~/lib/session';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

/**
 * A gift to one fundraiser: the website's fundraiser donate form (amount,
 * name, anonymous, comment) in the gift flow's style. Payment is Stripe
 * Checkout in Safari; the email on the gift is the signed-in member's.
 */
export default function FundraiserDonate() {
  const id = useSearchParams().get('id') ?? '';
  const user = useSession().session?.user;
  const state = useData(async () => {
    const [fundraiser, member, profile] = await Promise.all([
      must(supabase.from('fundraisers').select('*').eq('id', id).maybeSingle()),
      must(supabase.from('members').select('fullName').eq('user_id', user?.id ?? '').maybeSingle()),
      must(supabase.from('users').select('full_name').eq('id', user?.id ?? '').maybeSingle())
    ]);
    return { fundraiser, name: profile?.full_name || member?.fullName || '' };
  }, [id, user?.id]);

  return (
    <FlowScreen title="Donate" back={{ label: 'Back' }}>
      <Loaded state={state}>
        {({ fundraiser, name }) =>
          fundraiser && isOpen(fundraiser) ? (
            <DonateForm fundraiser={fundraiser} initialName={name} />
          ) : (
            <StatePanel icon={CircleOff} title="This fundraiser is no longer accepting donations">
              It has ended or isn’t open right now. You can still give to BCS Seattle from the Give tab.
            </StatePanel>
          )
        }
      </Loaded>
    </FlowScreen>
  );
}

function DonateForm({ fundraiser, initialName }: { fundraiser: Fundraiser; initialName: string }) {
  const [amount, setAmount] = useState('');
  const [fullName, setFullName] = useState(initialName);
  const [isAnonymous, setAnonymous] = useState(false);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; fullName?: string }>({});
  const [failure, setFailure] = useState<string>();
  const [pending, setPending] = useState(false);

  // The same limits the server checks (utils/fundraisers/handlers.ts): Stripe's USD 0.50 minimum or the fundraiser's.
  const minimum = Math.max(0.5, Number(fundraiser.minimum_donation ?? 0));

  const submit = async () => {
    const value = Number(amount);
    const found: typeof errors = {};
    if (!(value >= minimum) || value > 999999.99) {
      found.amount = `Enter an amount from ${formatMoney(minimum * 100)} to USD 999,999.99.`;
    }
    if (!isAnonymous && fullName.trim().length < 2) found.fullName = 'Enter your name, or give anonymously.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setPending(true);
    setFailure(undefined);
    try {
      const { url } = await api<{ donationId: string; url: string }>(`/api/app/fundraisers/${fundraiser.id}/donations`, {
        json: {
          amount: Math.round(value * 100) / 100,
          fullName: isAnonymous ? undefined : fullName.trim(),
          isAnonymous,
          comment: comment.trim() || undefined
        }
      });
      // Stripe Checkout opens in Safari (plan §4) and comes back to /give/result/.
      await openOutside(url);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <GiftSummaryRow caption="One-time gift · Fundraiser" amount={fundraiser.title} />
      <FieldRow
        label="Amount (USD)"
        htmlFor="amount"
        error={errors.amount}
        hint={fundraiser.minimum_donation ? `The smallest gift is ${formatMoney(minimum * 100)}.` : undefined}
      >
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
            USD
          </span>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            min={minimum}
            step="0.01"
            placeholder="100"
            value={amount}
            aria-invalid={!!errors.amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-11 pl-12"
          />
        </div>
      </FieldRow>
      <FieldRow label="Your name" htmlFor="full-name" error={errors.fullName} hint="Shown with your gift on the donor list.">
        <Input
          id="full-name"
          autoComplete="name"
          value={isAnonymous ? '' : fullName}
          disabled={isAnonymous}
          aria-invalid={!!errors.fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="h-11"
        />
      </FieldRow>
      <CheckRow
        checked={isAnonymous}
        onChange={(checked) => {
          setAnonymous(checked);
          setErrors((e) => ({ ...e, fullName: undefined }));
        }}
        label="Donate anonymously"
        detail="Your name won’t appear on the public donor list."
      />
      <FieldRow label="Comment (optional)" htmlFor="comment" hint="Shown on the fundraiser page.">
        <Textarea id="comment" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} className="h-20 text-base" />
      </FieldRow>
      <p className="mt-0 text-caption text-muted-foreground">
        You enter your card details on Stripe’s secure page, which opens in Safari.
      </p>
      {failure && (
        <Banner tone="error" title="Your gift wasn’t started">
          {failure}
        </Banner>
      )}
      <ActionBar summary="You confirm payment with Stripe" className="mt-auto">
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Starting…' : `Continue to secure payment${Number(amount) >= minimum ? ` · ${dollars(amount)}` : ''}`}
        </Button>
      </ActionBar>
    </form>
  );
}
