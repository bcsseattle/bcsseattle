import BurialFundSignUp from '@/components/burial-fund-signup';
import { columns } from '@/components/funeral-burial/columns';
import { DataTable } from '@/components/payments/data-table';
import { fetchPageBlocks, fetchPageBySlug, notion } from '@/utils/notion';
import bookmarkPlugin from '@notion-render/bookmark-plugin';
import { NotionRenderer } from '@notion-render/client';
import hljsPlugin from '@notion-render/hljs-plugin';
import { notFound } from 'next/navigation';

import {
  getStripeAvailableBalance,
  // getStripeCustomers,
  getStripePayments,
  getStripeRecentTransactions
} from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getPriceString } from '@/utils/helpers';

export const revalidate = 0;

const lotPrice = 450000;
const numberOfLosts = 5;

export default async function Page() {
  const supabase = createClient();
  const { data } = await supabase
    .from('funeral_fund_interest')
    .select('*')
    .order('created_at', { ascending: false });

  const totalCommitmenttedMembers = data?.length || 1;
  const totalLotPrice = lotPrice * numberOfLosts;
  const halfTotalLotPrice = totalLotPrice / 2;
  const totalAmountPerHead = totalLotPrice / totalCommitmenttedMembers;

  const halfOfTotalAmountPerHead = totalAmountPerHead / 2;

  const intialPaymentPerHead = getPriceString(halfTotalLotPrice / totalCommitmenttedMembers);
  const installPaymentPerHead = getPriceString(halfOfTotalAmountPerHead / 3);
  const totalPaymentPerHead = getPriceString(totalAmountPerHead);

  const tableData = data?.map((d: any) => {
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
    <section className="mb-32">
      <div className="max-w-6xl px-4 py-4 mx-auto sm:px-6 sm:pt-8 lg:px-8">
        <div className="sm:align-center sm:flex sm:flex-col">
          <h1 className="text-4xl font-extrabold sm:tex sm:text-5xl">
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
