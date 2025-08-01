'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Price, ProductWithPrices } from '@/types';
import { getStripe } from '@/utils/stripe/client';
import { checkoutWithStripe } from '@/utils/stripe/server';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { getErrorRedirect } from '@/utils/helpers';
import { User } from '@supabase/supabase-js';

interface Props {
  user: User | null | undefined;
  products: ProductWithPrices[];
}

export default function MembershipPlan({ user, products }: Props) {
  const router = useRouter();

  const [priceIdLoading, setPriceIdLoading] = useState<string>();
  const currentPath = usePathname();
  const cancelUrl = currentPath;

  const handleStripeCheckout = async (price: Price) => {
    setPriceIdLoading(price.id);

    if (!user) {
      setPriceIdLoading(undefined);
      return router.push('/signin/signup');
    }

    const { errorRedirect, sessionId } = await checkoutWithStripe(
      price,
      '/contribute',
      cancelUrl,
      true
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
    return null;
  }

  return (
    <>
      {products?.map((product) => {
        const price = product?.prices?.find((price) => price?.active);
        if (!price) return null;
        const priceString = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: price.currency!,
          minimumFractionDigits: 0
        }).format((price?.unit_amount || 0) / 100);
        return (
          <div key={product.id}>
            <Card>
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>{product.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  data-name="Layer 1"
                  viewBox="0 0 653.85194 247.58653"
                >
                  <path
                    d="M545.50183,536.79986l-53.47419,12.06283s-10.90388-1.2413-.56345-16.46542c.92836-1.3712,2.03089-2.846,3.326-4.44793l27.71308-13.60092-.25773-1.82865-5.90026-41.61214L514.06373,454.802l17.39361-16.17009,3.32067-3.08917,44.1439,40.83278-.31526.581-18.45341,33.35487Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#ffb7b7"
                  />
                  <path
                    d="M525.72988,524.67262l-53.47419,12.06283a5.71228,5.71228,0,0,1-4.91459-6.99522,16.01655,16.01655,0,0,1,1.44546-4.47665,48.05783,48.05783,0,0,1,6.2317-9.44148l27.71308-13.60092-3.39846-23.96546-1.69246-11.95151-1.09561-7.72695-2.253-15.90249,20.71428-19.25925L537.56624,444.278,559.15,464.2483l-2.91313,5.25752-3.47288,6.28384-16.66733,30.14379-3.39585,6.14041Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#ffb7b7"
                  />
                  <path
                    d="M618.69782,516.2488s-20.03668-1.33368-27.53061-14.88932a24.38726,24.38726,0,0,1-2.61567-14.6268L580.38536,470.589l-11.623-23.002-29.64933-4.68161-1.54682,1.37272-21.499,19.10063-6.57732,5.8444-10.15705,9.03265-49.25654,43.76321a36.70608,36.70608,0,0,1-7.46,9.32284,50.21372,50.21372,0,0,1-8.98151,6.63965c-9.39852,5.45382-23.44825,9.69342-43.65051,7.46713L283.48277,573.79326,273.074,502.36737l89.32747-29.3701,131.00377-85.69139,88.43528,22.63186,41.009,58.23026Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#ffb7b7"
                  />
                  <path
                    d="M921.52077,326.20674H548.56151a5.41127,5.41127,0,0,0-5.40521,5.4052V552.453a5.411,5.411,0,0,0,5.40521,5.4052H921.52077a5.41128,5.41128,0,0,0,5.4052-5.4052V331.61191A5.4115,5.4115,0,0,0,921.52077,326.20674Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#fff"
                  />
                  <path
                    d="M921.52077,326.20674H548.56151a5.41127,5.41127,0,0,0-5.40521,5.4052V552.453a5.411,5.411,0,0,0,5.40521,5.4052H921.52077a5.41128,5.41128,0,0,0,5.4052-5.4052V331.61191A5.4115,5.4115,0,0,0,921.52077,326.20674ZM925.38163,552.453a3.86227,3.86227,0,0,1-3.86086,3.86086H548.56151a3.86226,3.86226,0,0,1-3.86086-3.86086V331.61191a3.86252,3.86252,0,0,1,3.86086-3.86085H921.52077a3.86251,3.86251,0,0,1,3.86086,3.86085Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#3f3d56"
                  />
                  <path
                    d="M584.85082,356.32315a9.26606,9.26606,0,1,1,9.26606-9.26606A9.26606,9.26606,0,0,1,584.85082,356.32315Zm0-16.98778a7.72172,7.72172,0,1,0,7.72171,7.72172A7.72171,7.72171,0,0,0,584.85082,339.33537Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#6c63ff"
                  />
                  <path
                    d="M570.44815,347.05709a8.4956,8.4956,0,0,1,5.7241-8.0295,8.49389,8.49389,0,1,0,0,16.059A8.49559,8.49559,0,0,1,570.44815,347.05709Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#6c63ff"
                  />
                  <path
                    d="M622.41211,456.5341a6.95751,6.95751,0,0,1-6.94955-6.94954V428.73592a6.94955,6.94955,0,0,1,13.89909,0v20.84864A6.9575,6.9575,0,0,1,622.41211,456.5341Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#6c63ff"
                  />
                  <path
                    d="M640.9442,456.5341a6.9575,6.9575,0,0,1-6.94954-6.94954V428.73592a6.94955,6.94955,0,0,1,13.89909,0v20.84864A6.9575,6.9575,0,0,1,640.9442,456.5341Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#6c63ff"
                  />
                  <path
                    d="M659.47632,456.5341a6.9575,6.9575,0,0,1-6.94954-6.94954V428.73592a6.94955,6.94955,0,0,1,13.89909,0v20.84864A6.9575,6.9575,0,0,1,659.47632,456.5341Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#6c63ff"
                  />
                  <path
                    d="M688.04668,456.5341a6.9575,6.9575,0,0,1-6.94955-6.94954V428.73592a6.94955,6.94955,0,0,1,13.89909,0v20.84864A6.9575,6.9575,0,0,1,688.04668,456.5341Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#6c63ff"
                  />
                  <path
                    d="M706.57879,456.5341a6.9575,6.9575,0,0,1-6.94954-6.94954V428.73592a6.94955,6.94955,0,0,1,13.89909,0v20.84864A6.9575,6.9575,0,0,1,706.57879,456.5341Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#6c63ff"
                  />
                  <path
                    d="M725.11091,456.5341a6.9575,6.9575,0,0,1-6.94954-6.94954V428.73592a6.94955,6.94955,0,0,1,13.89909,0v20.84864A6.9575,6.9575,0,0,1,725.11091,456.5341Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#6c63ff"
                  />
                  <path
                    d="M753.68127,456.5341a6.9575,6.9575,0,0,1-6.94955-6.94954V428.73592a6.94955,6.94955,0,0,1,13.89909,0v20.84864A6.9575,6.9575,0,0,1,753.68127,456.5341Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#6c63ff"
                  />
                  <path
                    d="M772.21339,456.5341a6.9575,6.9575,0,0,1-6.94955-6.94954V428.73592a6.94955,6.94955,0,0,1,13.89909,0v20.84864A6.9575,6.9575,0,0,1,772.21339,456.5341Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#6c63ff"
                  />
                  <path
                    d="M790.7455,456.5341a6.9575,6.9575,0,0,1-6.94954-6.94954V428.73592a6.94955,6.94955,0,0,1,13.89909,0v20.84864A6.9575,6.9575,0,0,1,790.7455,456.5341Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#6c63ff"
                  />
                  <path
                    d="M819.31586,456.5341a6.9575,6.9575,0,0,1-6.94955-6.94954V428.73592a6.94955,6.94955,0,0,1,13.89909,0v20.84864A6.9575,6.9575,0,0,1,819.31586,456.5341Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#6c63ff"
                  />
                  <path
                    d="M837.848,456.5341a6.9575,6.9575,0,0,1-6.94955-6.94954V428.73592a6.94955,6.94955,0,0,1,13.89909,0v20.84864A6.9575,6.9575,0,0,1,837.848,456.5341Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#6c63ff"
                  />
                  <path
                    d="M856.3801,456.5341a6.9575,6.9575,0,0,1-6.94955-6.94954V428.73592a6.94955,6.94955,0,0,1,13.89909,0v20.84864A6.9575,6.9575,0,0,1,856.3801,456.5341Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#6c63ff"
                  />
                  <path
                    d="M669.52851,533.88017H569.57835a4.66961,4.66961,0,1,1,0-9.33921h99.95016a4.66961,4.66961,0,0,1,0,9.33921Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#e6e6e6"
                  />
                  <path
                    d="M637.48336,513.8037H601.62347a4.6696,4.6696,0,1,1,0-9.3392h35.85989a4.6696,4.6696,0,1,1,0,9.3392Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#e6e6e6"
                  />
                  <rect
                    x="271.34871"
                    y="46.16064"
                    width="380.68063"
                    height="1.54434"
                    fill="#3f3d56"
                  />
                  <polygon
                    points="227.821 202.764 227.011 200.936 260.015 186.299 267.883 158.697 256.023 149.108 257.28 147.552 270.169 157.973 261.682 187.748 227.821 202.764"
                    opacity="0.15"
                  />
                  <path
                    d="M468.78656,525.26358l-8.67531,4.22531-17.49493,1.85288a50.21372,50.21372,0,0,1-8.98151,6.63965l-15.34166-.5084-25.91175-.8112L479.98055,461.967l17.65987,4.33725S467.96858,527.007,468.78656,525.26358Z"
                    transform="translate(-273.07403 -326.20674)"
                    opacity="0.1"
                  />
                  <path
                    d="M591.16721,501.35948c-2.29947.44282-4.82045.80937-7.60668,1.09-14.38167,1.438-44.78326,3.34937-47.46391,3.48393-18.00694.84746-29.32811.83759-29.32811.83759l-37.98195,18.49254-8.67531,4.22531-70.31742,7.4471,95.21635-81.19019,11.53463,2.83146,19.52244,4.80141,21.50772,5.28775,18.66186.8394,24.14853,1.08314,19.519.87656a12.80879,12.80879,0,0,1,12.35926,13.1684C611.9573,491.073,607.49154,498.18732,591.16721,501.35948Z"
                    transform="translate(-273.07403 -326.20674)"
                    fill="#ffb7b7"
                  />
                  <path
                    d="M598.56932,496.46455c-.311-.09522-7.64429-2.40186-9.97143-8.85694-1.5647-4.33984-.46338-9.418,3.27319-15.09326l1.67041,1.09961c-3.36743,5.11475-4.39941,9.59082-3.06665,13.30323,1.97827,5.51074,8.61352,7.61425,8.68017,7.63476Z"
                    transform="translate(-273.07403 -326.20674)"
                    opacity="0.15"
                  />
                  <rect
                    x="468.64191"
                    y="515.23555"
                    width="37.3771"
                    height="2.00003"
                    transform="translate(-449.9224 -60.68339) rotate(-25.96943)"
                    opacity="0.15"
                  />
                  <polygon
                    points="218.073 134.541 265.672 115.768 266.406 117.629 225.273 133.852 260.231 140.382 259.863 142.348 218.073 134.541"
                    opacity="0.15"
                  />
                </svg>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  disabled={priceIdLoading === price.id}
                  onClick={() => handleStripeCheckout(price)}
                >
                  Pay {priceString}
                </Button>
              </CardFooter>
            </Card>
          </div>
        );
      })}
    </>
  );
}
