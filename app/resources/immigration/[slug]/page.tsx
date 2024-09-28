import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { fetchPageBlocks, fetchPageBySlug, notion } from '@/utils/notion';
import bookmarkPlugin from '@notion-render/bookmark-plugin';
import { NotionRenderer } from '@notion-render/client';
import hljsPlugin from '@notion-render/hljs-plugin';
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/signin');
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

  return (
    <div className='p-4'>
      <div dangerouslySetInnerHTML={{ __html: html }}></div>
    </div>
  );
}
