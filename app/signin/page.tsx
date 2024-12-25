import { redirect } from 'next/navigation';
import { getDefaultSignInView } from '@/utils/auth-helpers/settings';
import { cookies } from 'next/headers';

export default async function SignIn(props: {
  searchParams: Promise<{ disable_button: boolean; redirectTo?: string }>;
}) {
  const searchParams = await props.searchParams;
  const redirectTo = searchParams?.redirectTo
    ? `?redirectTo=${searchParams.redirectTo}`
    : '';
  const preferredSignInView =
    (await cookies()).get('preferredSignInView')?.value || null;
  const defaultView = getDefaultSignInView(preferredSignInView);

  return redirect(`/signin/${defaultView}${redirectTo}`);
}
