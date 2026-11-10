// A donation receipt PDF, under /api so the app's origin gets CORS headers.
// Public by its unguessable id, like /donate/confirmation/[donationId]/pdf.
export { GET } from '@/app/(site)/donate/confirmation/[donationId]/pdf/route';
