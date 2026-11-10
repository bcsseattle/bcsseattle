'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Banknote,
  BarChart3,
  BookUser,
  Building2,
  CheckCircle,
  FileText,
  LogOut,
  Receipt,
  SlidersHorizontal,
  Users,
  type LucideIcon
} from 'lucide-react';

import { SignOut } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { getRedirectMethod } from '@/utils/auth-helpers/settings';
import { cn } from '@/utils/cn';

type Item = { label: string; href: string; icon: LucideIcon; match?: string };

// Membership is for every approved member; Admin only for admins (Figma 9:1314).
// "Member directory" is not in the mock; it keeps /members reachable.
const MEMBERSHIP: Item[] = [
  { label: 'My account', href: '/account', icon: Building2 },
  { label: 'Elections', href: '/elections', icon: CheckCircle },
  { label: 'Community funds', href: '/community-funds', icon: BarChart3 },
  { label: 'My contribution', href: '/contribute', icon: Receipt },
  { label: 'Member directory', href: '/members', icon: BookUser }
];
const ADMIN: Item[] = [
  { label: 'Members', href: '/admin/members', icon: Users },
  { label: 'Manage elections', href: '/admin/elections', icon: SlidersHorizontal },
  { label: 'Fundraisers', href: '/fundraisers/admin/new', icon: Banknote, match: '/fundraisers/admin' },
  { label: 'Expenses', href: '/admin/expenses', icon: FileText }
];

const rowClass =
  'flex h-7 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-muted-foreground';

function NavRow({ item, current }: { item: Item; current: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={current ? 'page' : undefined}
        className={cn(rowClass, current && 'bg-accent-100 font-semibold hover:bg-accent-100 [&_svg]:text-accent')}
      >
        <Icon aria-hidden />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </Link>
    </li>
  );
}

function Group({ title, items, pathname }: { title: string; items: Item[]; pathname: string }) {
  const isCurrent = (item: Item) => {
    const prefix = item.match ?? item.href;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  };
  return (
    <div className="flex flex-col gap-1 pt-4">
      <h2 className="text-overline uppercase text-muted-foreground">{title}</h2>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <NavRow key={item.href} item={item} current={isCurrent(item)} />
        ))}
      </ul>
    </div>
  );
}

/**
 * BCS/Portal sidebar (Figma 9:1314): the org block, a Membership group for
 * approved members, an Admin group for admins, then Back to website and
 * Sign out. The same component sits in the desktop rail and the phone Sheet.
 */
export function PortalSidebar({ isMember, isAdmin, className }: { isMember: boolean; isAdmin: boolean; className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav aria-label="Member portal" className={cn('flex h-full flex-col gap-1 bg-card p-3', className)}>
      <div className="flex h-10 items-center gap-2.5 p-1.5">
        <div aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-micro font-semibold text-primary-foreground">
          BC
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold text-foreground">BCS Seattle</span>
          <span className="text-caption text-muted-foreground">{isAdmin ? 'Admin' : 'Member'}</span>
        </div>
      </div>
      {isMember && <Group title="Membership" items={MEMBERSHIP} pathname={pathname} />}
      {isAdmin && <Group title="Admin" items={ADMIN} pathname={pathname} />}
      <div className="flex-1" />
      <ul className="flex flex-col gap-1">
        <li>
          <Link href="/" className={rowClass}>
            <ArrowLeft aria-hidden />
            Back to website
          </Link>
        </li>
        <li>
          <form onSubmit={(e) => handleRequest(e, SignOut, getRedirectMethod() === 'client' ? router : null)}>
            <input type="hidden" name="pathName" value={pathname} />
            <button type="submit" className={rowClass}>
              <LogOut aria-hidden />
              Sign out
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
