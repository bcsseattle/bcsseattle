import { NextRequest } from 'next/server';
import { GET as receiptPdf } from '@/app/(site)/donate/confirmation/[donationId]/pdf/route';
import { pdfOrError } from '@/utils/app-api';

// A donation receipt PDF, under /api so the app's origin gets CORS headers.
// Public by its unguessable id, like /donate/confirmation/[donationId]/pdf.
// Problems come back as JSON the app can show, not a redirect (W13).
export async function GET(request: NextRequest, context: { params: Promise<{ donationId: string }> }) {
  return pdfOrError(await receiptPdf(request, context));
}
