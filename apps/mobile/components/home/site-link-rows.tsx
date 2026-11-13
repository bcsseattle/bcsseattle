'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { ListGroup } from '@/components/portal/list-row';
import { RowButton } from '~/components/screen';
import { openInApp } from '~/lib/open';
import type { SiteLink } from '~/components/home/site-links';

/** Links as List rows (13:2112): the app's own screen when there is one, else the website in the in-app browser. */
export function SiteLinkRows({ links }: { links: SiteLink[] }) {
  const router = useRouter();
  return (
    <ListGroup>
      {links.map(({ label, path, icon, href }) => (
        <RowButton
          key={path}
          label={label}
          icon={icon}
          value={<ChevronRight aria-hidden className="block size-4" />}
          onClick={() => (href ? router.push(href) : openInApp(path))}
        />
      ))}
    </ListGroup>
  );
}
