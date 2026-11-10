'use client';

import { Screen, Section } from '~/components/screen';
import { SiteLinkRows } from '~/components/home/site-link-rows';
import { SITE_SECTIONS } from '~/components/home/site-links';

/** The website's programs and information pages, grouped as its navigation groups them. */
export default function Resources() {
  return (
    <Screen title="Resources" back={{ label: 'More' }}>
      {SITE_SECTIONS.map(({ title, links }) => (
        <Section key={title} label={title}>
          <SiteLinkRows links={links} />
        </Section>
      ))}
    </Screen>
  );
}
