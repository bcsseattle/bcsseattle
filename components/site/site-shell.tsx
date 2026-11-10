import * as React from 'react';

import SiteFooter from '@/components/site/site-footer';
import SiteHeader from '@/components/site/site-header';
import Breadcrumbs from '@/components/ui/breadcrumbs';

/** The public site's frame: header, breadcrumbs, the page, footer. */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="skip" className="mx-auto w-full max-w-[1232px] px-4 pb-16 sm:pb-24">
        <Breadcrumbs />
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
