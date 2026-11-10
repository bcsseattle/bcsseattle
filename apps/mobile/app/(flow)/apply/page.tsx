'use client';

import { useState, type ComponentProps } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Control } from 'react-hook-form';
import type { z } from 'zod';
import { CircleSlash } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { OptionCard } from '@/components/ui/option-card';
import { RadioGroup } from '@/components/ui/radio-group';
import { ResultHeader } from '@/components/ui/result-header';
import { StatePanel } from '@/components/ui/state-panel';
import { MemberRegistrationFormSchema } from '@/types';
import type { Tables } from '@/types_db';
import { Loaded } from '~/components/screen';
import { FlowScreen } from '~/components/account/flow-screen';
import { api } from '~/lib/api';
import { useMember } from '~/lib/member';
import { openInApp } from '~/lib/open';
import { useSession } from '~/lib/session';

type Values = z.infer<typeof MemberRegistrationFormSchema>;
const back = { label: 'Home', href: '/home/' };

/**
 * Apply for membership: the website's /register form (same fields, same zod
 * schema), sent to POST /api/app/register. Someone who already applied sees
 * where their application stands instead.
 */
export default function Apply() {
  const me = useMember();
  if (!me.data) {
    return (
      <FlowScreen title="Membership" back={back}>
        <Loaded state={me}>{() => null}</Loaded>
      </FlowScreen>
    );
  }
  const { member, fullName } = me.data;
  return member ? <ApplicationState member={member} /> : <ApplyForm fullName={fullName} onApplied={me.reload} />;
}

function ApplicationState({ member }: { member: Tables<'members'> }) {
  const home = (
    <Link href="/home/" className={buttonVariants({ size: 'lg' })}>
      Go to Home
    </Link>
  );

  if (member.isApproved && member.status === 'active') {
    return (
      <FlowScreen title="Membership" back={back} actions={home}>
        <ResultHeader tone="success" title="You’re a member" className="pt-8">
          Your membership is active. You can vote in elections and see the community funds.
        </ResultHeader>
      </FlowScreen>
    );
  }
  if (member.status === 'pending') {
    return (
      <FlowScreen
        title="Membership"
        back={back}
        actions={
          <>
            {home}
            <Link href="/more/account/contribution/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Pay the membership fee
            </Link>
          </>
        }
      >
        <ResultHeader tone="pending" title="Application received" className="pt-8">
          Waiting for approval. An admin reviews each application; once you’re approved you can vote in elections and see
          the community funds.
        </ResultHeader>
      </FlowScreen>
    );
  }
  return (
    <FlowScreen title="Membership" back={back} actions={home}>
      <StatePanel
        icon={CircleSlash}
        title={member.status === 'rejected' ? 'Application not approved' : 'Membership inactive'}
        headingLevel="h2"
      >
        {member.status === 'rejected'
          ? 'Your membership application was not approved. Please contact us if you have any questions.'
          : 'Your membership is inactive. Please contact us to reactivate it.'}
      </StatePanel>
    </FlowScreen>
  );
}

function TextField({
  control,
  name,
  label,
  description,
  ...input
}: {
  control: Control<Values>;
  name: 'fullName' | 'phone' | 'address' | 'address2' | 'city' | 'zip' | 'totalMembersInFamily';
  label: string;
  description?: string;
} & ComponentProps<typeof Input>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input className="h-11" {...input} {...field} value={field.value ?? ''} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ApplyForm({ fullName, onApplied }: { fullName: string | null; onApplied: () => Promise<void> }) {
  const user = useSession().session?.user;
  const [error, setError] = useState<string>();
  const form = useForm<Values>({
    resolver: zodResolver(MemberRegistrationFormSchema),
    defaultValues: {
      fullName: fullName ?? user?.user_metadata.full_name ?? '',
      membershipType: 'Individual',
      totalMembersInFamily: 1,
      phone: user?.phone ?? '',
      address: '',
      address2: '',
      city: '',
      state: 'WA',
      zip: '',
      terms: false
    }
  });
  const { control, formState } = form;

  const submit = form.handleSubmit(async (values) => {
    setError(undefined);
    try {
      await api('/api/app/register', { json: values });
      await onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  });

  return (
    <Form {...form}>
      <form noValidate onSubmit={submit} className="flex min-h-dvh flex-col">
        <FlowScreen
          title="Apply for membership"
          back={back}
          actions={
            <Button type="submit" size="lg" disabled={!form.watch('terms') || formState.isSubmitting}>
              {formState.isSubmitting ? 'Sending…' : 'Send application'}
            </Button>
          }
        >
          <p className="text-body text-muted-foreground">
            Members vote in elections and see how the community funds are used. An admin reviews each application.
          </p>
          <TextField control={control} name="fullName" label="Name" autoComplete="name" placeholder="Your full name" />
          <FormField
            control={control}
            name="membershipType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Membership type</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange}>
                    <OptionCard value="Individual" label="Individual" detail="Just you" />
                    <OptionCard value="Family" label="Family" detail="You and family members aged 16 or older" />
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.watch('membershipType') === 'Family' && (
            <TextField
              control={control}
              name="totalMembersInFamily"
              label="Total members in family"
              type="number"
              inputMode="numeric"
              description="Family members aged 16 or older. Fees apply for up to 5 people; additional members are free."
            />
          )}
          <TextField control={control} name="phone" label="Phone" type="tel" autoComplete="tel" placeholder="123-456-7890" />
          <TextField
            control={control}
            name="address"
            label="Address"
            autoComplete="address-line1"
            placeholder="Street address, P.O. box"
          />
          <TextField
            control={control}
            name="address2"
            label="Address 2 (optional)"
            autoComplete="address-line2"
            placeholder="Apartment, suite, unit, building, floor"
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <TextField control={control} name="city" label="City" autoComplete="address-level2" placeholder="Seattle" />
            </div>
            <FormField
              control={control}
              name="state"
              render={({ field }) => (
                <FormItem className="w-24">
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-11 w-full rounded-md border border-input bg-card px-2.5 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="WA">WA</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <TextField
            control={control}
            name="zip"
            label="ZIP"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="98087"
          />
          <FormField
            control={control}
            name="terms"
            render={({ field }) => (
              <FormItem>
                <div className="flex min-h-11 items-start gap-3">
                  <FormControl>
                    <Checkbox className="mt-0.5" checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="flex flex-col gap-1">
                    <FormLabel>Accept the terms and conditions</FormLabel>
                    <FormDescription>
                      You agree to our{' '}
                      <button type="button" className="text-accent underline" onClick={() => openInApp('/terms')}>
                        Terms of Service and Privacy Policy
                      </button>
                      .
                    </FormDescription>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && (
            <p role="alert" className="text-body text-destructive">
              {error}
            </p>
          )}
        </FlowScreen>
      </form>
    </Form>
  );
}
