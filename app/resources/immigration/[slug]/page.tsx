import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { fetchPageBlocks, fetchPageBySlug, notion } from '@/utils/notion';
import bookmarkPlugin from '@notion-render/bookmark-plugin';
import { NotionRenderer } from '@notion-render/client';
import hljsPlugin from '@notion-render/hljs-plugin';
import { notFound } from 'next/navigation';

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/signin');
  }

  const { data: subscriptions }: { data: any } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user?.id);

  const isSubscriptionActive = subscriptions?.filter(
    (subscription: any) => subscription.status === 'active'
  );

  const { data: member } = await supabase
  .from('members')
  .select('*')
  .eq('user_id', user?.id)
  .maybeSingle();

  if (subscriptions && !isSubscriptionActive || member?.status !== 'active') {
    return redirect('/register');
  }

  const post = await fetchPageBySlug(params?.slug);

  if (!post) notFound();

  const blocks = await fetchPageBlocks(post.id);

  const renderer = new NotionRenderer({
    client: notion
  });

  renderer.use(hljsPlugin({}));
  renderer.use(bookmarkPlugin(undefined));

  const html = await renderer.render(...blocks);

  const isMembersOnly = params.slug.includes('asylum');

  return (
    <div className="p-4 relative">
      <div
        className="no-print select-none"
        dangerouslySetInnerHTML={{ __html: html }}
      ></div>
      {isMembersOnly && (
        <div className="fixed bottom-0 left-0 w-full h-1/3 z-10 opacity-50 flex items-center justify-center pointer-events-none">
          <div className="text-center text-red-600 text-xl font-bold w-3/4">
            For BCSS members only. Please do not share outside the community.
          </div>
        </div>
      )}
    </div>
  );
}
