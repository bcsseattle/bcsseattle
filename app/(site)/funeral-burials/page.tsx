import BurialFundSignUp from '@/components/burial-fund-signup';
import { columns } from '@/components/funeral-burial/columns';
import { DataTable } from '@/components/payments/data-table';

import { createClient } from '@/utils/supabase/server';

export const revalidate = 0;

const lotPrice = 450000;
const numberOfLosts = 5;

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('funeral_fund_interest')
    .select('*')
    .order('created_at', { ascending: false });

  const totalCommitmenttedMembers = data?.length || 1;
  const totalLotPrice = lotPrice * numberOfLosts;
  const halfTotalLotPrice = totalLotPrice / 2;
  const totalAmountPerHead = totalLotPrice / totalCommitmenttedMembers;

  const halfOfTotalAmountPerHead = totalAmountPerHead / 2;

  const intialPaymentPerHead = halfTotalLotPrice / totalCommitmenttedMembers;
  const installPaymentPerHead = halfOfTotalAmountPerHead / 3;
  const totalPaymentPerHead = totalAmountPerHead;

  const tableData = data?.map((d) => {
    return {
      ...d,
      initial_payment: intialPaymentPerHead,
      second_payment: installPaymentPerHead,
      third_payment: installPaymentPerHead,
      fourth_payment: installPaymentPerHead,
      total_payment: totalPaymentPerHead
    };
  });

  // const pageSlug = 'funeral-burial';
  // const post = await fetchPageBySlug(pageSlug);

  // if (!post) {
  //   return notFound();
  // }

  // const blocks = await fetchPageBlocks(post.id);

  // const renderer = new NotionRenderer({
  //   client: notion
  // });

  // renderer.use(hljsPlugin({}));
  // renderer.use(bookmarkPlugin(undefined));

  // const html = await renderer.render(...blocks);
  // console.log('data', data);

  return (
    <section className="pb-8">
      <div className="pt-8 lg:pt-16">
        <div className="flex flex-col">
          <h1 className="text-display text-foreground">
            Funeral & Burial
          </h1>
          {/* <div
            className="no-print select-none"
            dangerouslySetInnerHTML={{ __html: html }}
          ></div> */}
          <BurialFundSignUp />
          <DataTable columns={columns} data={tableData || []} />
        </div>
      </div>
    </section>
  );
}
