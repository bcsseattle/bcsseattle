'use client';

import { formatMoney } from '@/utils/format';
import { getStripe } from '@/utils/stripe/client';
import { checkoutWithStripe } from '@/utils/stripe/server';
import { getErrorRedirect, getSubscriptionInterval } from '@/utils/helpers';
import { User } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Member,
  Price,
  ProductWithPrices,
  SubscriptionWithProduct
} from '@/types';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/portal/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

type PriceType = 'monthly' | 'annual' | 'generous';

interface Props {
  user: User | null | undefined;
  products: ProductWithPrices[];
  subscription: SubscriptionWithProduct | null;
}

export default function Plans({ user, products, subscription }: Props) {
  const router = useRouter();
  const [priceIdLoading, setPriceIdLoading] = useState<string>();
  const currentPath = usePathname();

  const handleStripeCheckout = async (price: Price, priceType?: PriceType) => {
    setPriceIdLoading(price.id);

    if (!user) {
      setPriceIdLoading(undefined);
      return router.push('/signin/signup');
    }

    const { errorRedirect, sessionId } = await checkoutWithStripe(
      price,
      '/community-funds',
      currentPath,
      false,
      priceType === 'generous'
    );

    if (errorRedirect) {
      setPriceIdLoading(undefined);
      return router.push(errorRedirect);
    }

    if (!sessionId) {
      setPriceIdLoading(undefined);
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

    setPriceIdLoading(undefined);
  };

  if (!products.length) {
    return (
      <section className="pt-8">
        <div>
          <p className="text-sm text-muted-foreground">
            No contribution plans found. Create them in your{' '}
            <a
              className="text-accent underline underline-offset-4"
              href="https://dashboard.stripe.com/products"
              rel="noopener noreferrer"
              target="_blank"
            >
              Stripe Dashboard
            </a>
            .
          </p>
        </div>
      </section>
    );
  } else {
    return (
      <section className="w-full">
        <PageHeader title="Contribution Plans" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => {
            const prices = product?.prices?.filter(
              (price: any) => price.metadata?.type === 'contribution'
            );
            return prices?.map((price) => {
              const priceString = formatMoney(price?.unit_amount || 10000);

              const priceType =
                product.name === 'BCS Donation'
                  ? 'generous'
                  : price.interval === 'month'
                    ? 'monthly'
                    : 'annual';

              const title = getSubscriptionInterval(price);

              return (
                <Card key={price.id}>
                  <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-figure text-foreground">{priceString}</div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      disabled={priceIdLoading === price.id}
                      onClick={() => handleStripeCheckout(price, priceType)}
                    >
                      {subscription?.price_id === price.id
                        ? 'Manage contribution plan'
                        : priceType === 'generous'
                          ? 'Contribute'
                          : 'Start contribution plan'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            });
          })}
        </div>
      </section>
    );
  }
}
