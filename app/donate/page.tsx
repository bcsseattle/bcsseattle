// import { getRedirectMethod } from '@/utils/auth-helpers/settings';
import { createClient } from '@/utils/supabase/server';
import DonateForm from '@/components/forms/donate-form';
import { DonationPurpose } from '@/types';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function Page(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const purpose = searchParams?.purpose ?? 'general-purpose';
  // const redirectMethod = getRedirectMethod();
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: product } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('name', 'BCS Donation')
    .eq('prices.active', true)
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' })
    .maybeSingle();

  let donor = null;
  if (user) {
    const { data } = await supabase
      .from('donors')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    donor = data;
  }

  const { data: programs } = await supabase
    .from('programs')
    .select('*')
    .eq('active', true);

  return (
    <section className="my-8">
      <div className="flex justify-center height-screen-helper">
        <div className="flex flex-col justify-between p-3">
          <DonateForm
            user={user}
            product={product as any}
            donor={donor}
            programs={programs ?? []}
            defaultPurpose={purpose as DonationPurpose}
          />
        </div>
      </div>
    </section>
  );
}
