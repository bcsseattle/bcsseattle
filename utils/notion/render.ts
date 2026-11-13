import 'server-only';
import bookmarkPlugin from '@notion-render/bookmark-plugin';
import { NotionRenderer } from '@notion-render/client';
import hljsPlugin from '@notion-render/hljs-plugin';
import { fetchPageBlocks, fetchPageBySlug, notion } from '@/utils/notion';

/** A Notion page (by its Slug) as HTML, or null if there's none. Used by the website and the app. */
export async function renderNotionPage(slug: string): Promise<string | null> {
  const post = await fetchPageBySlug(slug);
  if (!post) return null;
  const blocks = await fetchPageBlocks(post.id);
  const renderer = new NotionRenderer({ client: notion });
  renderer.use(hljsPlugin({}));
  renderer.use(bookmarkPlugin(undefined));
  return renderer.render(...blocks);
}
