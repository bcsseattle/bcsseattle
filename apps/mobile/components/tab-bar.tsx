'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Home, MoreHorizontal, Vote, Wallet } from 'lucide-react';
import { cn } from '@/utils/cn';

const TABS = [
  { href: '/home/', label: 'Home', icon: Home },
  { href: '/funds/', label: 'Funds', icon: Wallet },
  { href: '/give/', label: 'Give', icon: Heart },
  { href: '/elections/', label: 'Elections', icon: Vote },
  // More holds Account, Members and Resources (decided 9 Nov 2026; the mock's fifth tab is Account).
  { href: '/more/', label: 'More', icon: MoreHorizontal }
];

/**
 * BCS/Tab bar (Figma 13:2104). The current tab is accent-coloured and, so the
 * state is not carried by colour alone, drawn with a heavier stroke and label.
 * The bottom padding is the device's home-indicator inset.
 */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Tabs"
      className="sticky bottom-0 z-30 flex border-t bg-card pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const current = pathname.startsWith(href.slice(0, -1));
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'flex min-h-11 flex-1 flex-col items-center gap-0.5 text-micro',
              current ? 'font-semibold text-accent' : 'font-medium text-muted-foreground'
            )}
          >
            <Icon aria-hidden className="size-6" strokeWidth={current ? 2.25 : 1.75} />
            <span className="tab-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
