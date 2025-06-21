import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { renderToStream } from '@react-pdf/renderer';
import {
  createInvoice,
  getStripeCustomer,
  getStripePayments,
  getTotalCustomerSpent
} from '@/utils/supabase/admin';
import { getErrorRedirect } from '@/utils/helpers';
import Stripe from 'stripe';
import InvoicePDF from '@/components/ui/receipts/invoice-pdf';

export async function GET(
  request: NextRequest,
  {
    params
  }: {
    params: Promise<{ memberId: string }>;
  }
) {
  const requestUrl = new URL(request.url);
  try {
    const { memberId } = await params;
    const taxYear =
      Number(request?.nextUrl?.searchParams.get('taxYear')) ??
      new Date().getFullYear();
    if (!memberId) {
      return NextResponse.redirect('/account');
    }

    const supabase = await createClient();

    const { data: member } = await supabase
      .from('members')
      .select('*, customers(stripe_customer_id)')
      .eq('id', memberId)
      .maybeSingle();

    if (!member) {
      return NextResponse.redirect(
        getErrorRedirect(
          `${requestUrl.origin}/account`,
          'Member not found',
          "Sorry, we weren't able to find your Member information. Please try again."
        )
      );
    }

    const stripeCustomerId = member?.customers?.stripe_customer_id ?? '';

    // Calculate the start of the tax year (inclusive)
    const startOfYear = Math.floor(
      new Date(`${taxYear}-01-01T00:00:00Z`).getTime() / 1000
    );
    // Calculate the start of the next year (exclusive)
    const startOfNextYear = Math.floor(
      new Date(`${taxYear + 1}-01-01T00:00:00Z`).getTime() / 1000
    );
    const dateRange: Stripe.RangeQueryParam = {
      gte: startOfYear,
      lte: startOfNextYear
    };
    const { data: payments } = await getStripePayments({
      customerId: stripeCustomerId,
      dateRange
    });

    const customer = (await getStripeCustomer(
      stripeCustomerId
    )) as Stripe.Customer;

    // get total spent from customer in stripe
    const totalSpent = await getTotalCustomerSpent({
      customerId: stripeCustomerId,
      dateRange
    });

    if (totalSpent === 0) {
      return NextResponse.redirect(
        getErrorRedirect(
          `${requestUrl.origin}/account`,
          'No Contributions Found',
          "Sorry, we weren't able to find any contributions for this year. Please try again."
        )
      );
    }

    const { data: organization } = await supabase
      .from('organization')
      .select('*')
      .single();

    if (!organization) {
      return NextResponse.redirect(
        getErrorRedirect(
          `${requestUrl.origin}/account`,
          'Organization not found',
          "Sorry, we weren't able to find your organization information. Please try again."
        )
      );
    }

    const { data: invoice } = await createInvoice(member);

    if (!invoice) {
      return NextResponse.redirect(
        getErrorRedirect(
          `${requestUrl.origin}/account`,
          'Invoice not found',
          "Sorry, we weren't able to find your invoice information. Please try again."
        )
      );
    }

    const stream = await renderToStream(
      <InvoicePDF
        invoice={invoice}
        organization={organization}
        member={member}
        customer={customer}
        payments={payments ?? []}
        totalSpent={totalSpent}
        taxYear={taxYear}
      />
    );

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'application/pdf'
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(
      getErrorRedirect(
        `${requestUrl.origin}/account`,
        'Receipt PDF error',
        "Sorry, we weren't able to find your donation PDF information. Please try again."
      )
    );
  }
}
