'use client';

import { getStripe } from '@/utils/stripe/client';
import { checkoutWithStripe } from '@/utils/stripe/server';
import { getErrorRedirect } from '@/utils/helpers';
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
  member: Member;
}

export default function Plans({ user, products, subscription, member }: Props) {
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
      currentPath,
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
      <section className="">
        <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-col sm:align-center"></div>
          <p className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
            No contribution plans found. Create them in your{' '}
            <a
              className=""
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
      <section className="container mx-auto">
        <h1 className="text-4xl font-extrabold text-center">
          Contribution Plans
        </h1>
        <div className="flex flex-wrap md:space-x-12">
          {products.map((product) => {
            const prices = product?.prices?.filter(
              (price) =>
                price.interval === 'month' ||
                price.interval === 'year' ||
                (price.interval === null && product.name !== 'Membership Fee')
            );
            return prices?.map((price) => {
              const priceString = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: price.currency!,
                minimumFractionDigits: 0
              }).format(
                (price?.unit_amount || 10000) /
                  100
              );

              const priceType =
                product.name === 'BCS Donation'
                  ? 'generous'
                  : price.interval === 'month'
                    ? 'monthly'
                    : 'annual';

              const title =
                price.interval === 'month'
                  ? 'Monthly Contribution'
                  : price.interval === 'year'
                    ? 'Annual Contribution'
                    : 'One-time Contribution';
              return (
                <Card
                  key={product.id}
                  className="w-full md:w-1/2 lg:my-4 lg:w-1/4 mb-4"
                >
                  <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1">{priceString}</div>
                  </CardContent>
                  <CardFooter>
                    <Button
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
