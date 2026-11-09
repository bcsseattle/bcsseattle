import { redirect } from 'next/navigation';
import { getDefaultSignInView } from '@/utils/auth-helpers/settings';
import { cookies, headers } from 'next/headers';

function isBotUA(ua: string) {
  return /GPTBot|vercel-screenshot|bot|crawler|spider/i.test(ua);
}

export default async function SignIn(props: {
  searchParams: Promise<{ disable_button: boolean; redirectTo?: string }>;
}) {
  const searchParams = await props.searchParams;

  const ua = (await headers()).get('user-agent') || '';
  const redirectTo = searchParams?.redirectTo
    ? `?redirectTo=${encodeURIComponent(searchParams.redirectTo)}`
    : '';

  // For bots: always go to a stable view (no cookie read needed)
  if (isBotUA(ua)) {
    return redirect(`/signin/password${redirectTo}`); // choose your canonical view
  }

  const preferredSignInView =
    (await cookies()).get('preferredSignInView')?.value || null;

  const defaultView = getDefaultSignInView(preferredSignInView);
  return redirect(`/signin/${defaultView}${redirectTo}`);
}
