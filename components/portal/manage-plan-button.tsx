'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createStripePortal } from '@/utils/stripe/server';

/** Opens the Stripe customer portal to change, pause or cancel the plan; back to this page after. */
export function ManagePlanButton() {
  const router = useRouter();
  const path = usePathname();
  const [pending, setPending] = useState(false);
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        router.push(await createStripePortal(path, path));
      }}
    >
      {pending ? 'Opening Stripe…' : 'Manage plan & payment method'}
    </Button>
  );
}
