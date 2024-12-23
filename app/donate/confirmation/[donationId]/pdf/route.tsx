import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { renderToStream } from '@react-pdf/renderer';
import InvoicePDFProps from '@/components/donations/invoice-pdf';
import { updateDonation } from '@/utils/supabase/admin';
import { getErrorRedirect } from '@/utils/helpers';

export async function GET(
  request: NextRequest,
  {
    params
  }: {
    params: Promise<{ donationId: string }>;
  }
) {
  const requestUrl = new URL(request.url);
  try {
    const { donationId } = await params;

    if (!donationId) {
      return NextResponse.redirect('/donate');
    }

    const supabase = await createClient();
    const { data: donation } = await supabase
      .from('donations')
      .select('*')
      .eq('id', donationId)
      .maybeSingle();

    if (!donation) {
      return NextResponse.redirect(
        getErrorRedirect(
          `${requestUrl.origin}/donate`,
          'Donation not found',
          "Sorry, we weren't able to find your donation information. Please try again."
        )
      );
    }

    const { data: donor, error } = await supabase
      .from('donors')
      .select('*')
      .eq('id', donation.donor_id)
      .maybeSingle();

    if (!donor) {
      return NextResponse.redirect(
        getErrorRedirect(
          `${requestUrl.origin}/donate`,
          'Donor not found',
          "Sorry, we weren't able to find your donor information. Please try again."
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
          `${requestUrl.origin}/donate`,
          'Organization not found',
          "Sorry, we weren't able to find your organization information. Please try again."
        )
      );
    }

    const stream = await renderToStream(
      <InvoicePDFProps
        organization={organization}
        donation={donation}
        donor={donor}
      />
    );

    await updateDonation({
      donation_id: donation.id,
      tax_receipt_generated: true
    });

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'application/pdf'
      }
    });
  } catch (err) {
    console.log('error');
    console.error(err);
    return NextResponse.redirect(
      getErrorRedirect(
        `${requestUrl.origin}/donate`,
        'Receipt PDF error',
        "Sorry, we weren't able to find your donation PDF information. Please try again."
      )
    );
  }
}
