'use client';

import { ChevronRight } from 'lucide-react';
import { ListGroup } from '@/components/portal/list-row';
import { RowButton } from '~/components/screen';
import { openInApp } from '~/lib/open';
import type { SiteLink } from '~/components/home/site-links';

/** Website pages as List rows (13:2112); each opens in the in-app browser. */
export function SiteLinkRows({ links }: { links: SiteLink[] }) {
  return (
    <ListGroup>
      {links.map(({ label, path, icon }) => (
        <RowButton
          key={path}
          label={label}
          icon={icon}
          value={<ChevronRight aria-hidden className="block size-4" />}
          onClick={() => openInApp(path)}
        />
      ))}
    </ListGroup>
  );
}
