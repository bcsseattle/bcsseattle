import RegisterForm from '@/components/ui/AuthForms/RegisterForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { getRedirectMethod } from '@/utils/auth-helpers/settings';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
export default async function Register() {
  const redirectMethod = getRedirectMethod();
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  
  if (!user) {
    return redirect('/signin');
  }
  
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: subscriptions }: { data: any } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user?.id);

  const isSubscriptionActive = subscriptions?.filter(
    (subscription: any) => subscription.status === 'active'
  );

  if (subscriptions && isSubscriptionActive && member?.status === 'active') {
    return redirect('/community-funds');
  }

  return (
    <section className="my-8">
      <div className="flex justify-center height-screen-helper">
        <div className="flex flex-col justify-between p-3">
          <Card className="md:w-[600px]">
            <CardHeader>
              <CardTitle>Membership Registration</CardTitle>
              <CardDescription>Register to become a member</CardDescription>
            </CardHeader>
            <CardContent>
              <RegisterForm
                redirectMethod={redirectMethod}
                user={user}
                member={member}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
