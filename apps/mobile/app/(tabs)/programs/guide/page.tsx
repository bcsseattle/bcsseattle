'use client';

import type { MouseEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Banner } from '@/components/ui/banner';
import { guideBySlug } from '@/utils/programs';
import { Loaded, Screen } from '~/components/screen';
import { MembersOnly } from '~/components/home/membership';
import { api } from '~/lib/api';
import { openInApp } from '~/lib/open';
import { useData } from '~/lib/use-data';

type Guide = { title: string; html: string; membersOnly: boolean };

/**
 * One immigration guide (Programs › Immigration & resources), written in
 * Notion and rendered by the website (GET /api/app/resources/[slug]), shown
 * with the website's Notion styles. Active members only, as on the website.
 */
export default function GuideScreen() {
  const slug = useSearchParams().get('slug') ?? '';
  return (
    <Screen title={guideBySlug(slug)?.title ?? 'Guide'} back={{}}>
      <MembersOnly>{() => <GuideBody slug={slug} />}</MembersOnly>
    </Screen>
  );
}

function GuideBody({ slug }: { slug: string }) {
  const state = useData(() => api<Guide>(`/api/app/resources/${encodeURIComponent(slug)}`), [slug]);

  // Links in a guide go to other websites: open them in the in-app browser
  // sheet, so the app itself never navigates away.
  const openLink = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as HTMLElement).closest('a');
    const href = link?.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    event.preventDefault();
    if (/^https?:\/\//.test(href)) void openInApp(href);
  };

  return (
    <Loaded state={state}>
      {(guide) => (
        <>
          {guide.membersOnly && (
            <Banner tone="attention" title="For BCSS members only">
              Please do not share outside the community.
            </Banner>
          )}
          {/* The website's own Notion HTML; links are handled by openLink. */}
          <div
            className="select-none rounded-lg border bg-card p-4 text-body text-foreground [&_a]:text-accent [&_a]:underline"
            onClick={openLink}
            dangerouslySetInnerHTML={{ __html: guide.html }}
          />
        </>
      )}
    </Loaded>
  );
}
