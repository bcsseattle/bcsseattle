import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { renderNotionPage } from '@/utils/notion/render';
import { notFound } from 'next/navigation';
import { currentUserIsActiveMember } from '@/utils/election-config';

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/signin');
  }

  // Approved members whose membership is active. The old subscription check
  // tested an array, which is always truthy, so it never applied (BUG-055);
  // member status now follows the contribution subscription (BUG-023).
  if (!(await currentUserIsActiveMember())) {
    return redirect('/register');
  }

  const html = await renderNotionPage(params?.slug);
  if (!html) notFound();

  const isMembersOnly = params.slug.includes('asylum');

  return (
    <div className="relative pt-8">
      <div
        className="no-print select-none"
        dangerouslySetInnerHTML={{ __html: html }}
      ></div>
      {isMembersOnly && (
        <div className="fixed bottom-0 left-0 w-full h-1/3 z-10 opacity-50 flex items-center justify-center pointer-events-none">
          <div className="text-center text-badge-red-text text-xl font-bold w-3/4">
            For BCSS members only. Please do not share outside the community.
          </div>
        </div>
      )}
    </div>
  );
}
