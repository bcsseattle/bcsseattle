'use client';
import React, { useEffect, useSyncExternalStore } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';

// Page titles for route segments. Anything else (a Notion slug) reads as words.
const TITLES: Record<string, string> = {
  'about-us': 'About us',
  account: 'My account',
  admin: 'Admin',
  bylaws: 'Bylaws',
  candidate: 'Candidates',
  candidates: 'Candidates',
  'community-funds': 'Community funds',
  confirmation: 'Confirmation',
  'contact-us': 'Contact us',
  contribute: 'My contribution',
  donate: 'Donate',
  donations: 'Donations',
  edit: 'Edit',
  elections: 'Elections',
  expenses: 'Expenses',
  fundraisers: 'Fundraisers',
  'funeral-burial': 'Funeral & burial',
  'funeral-burials': 'Funeral & burial',
  'get-help': 'Get help',
  'get-involved': 'Get involved',
  immigration: 'Immigration',
  initiatives: 'Initiatives',
  members: 'Members',
  'membership-fee': 'Membership fee',
  mission: 'Mission',
  new: 'New',
  nominate: 'Nominate',
  pending: 'Pending approval',
  privacy: 'Privacy policy',
  register: 'Register',
  resources: 'Resources',
  results: 'Results',
  signin: 'Sign in',
  terms: 'Terms of use',
  vision: 'Vision',
  vote: 'Vote',
  'what-we-do': 'What we do',
  'youth-programs': 'Youth programs',
  // Sign-in views (/signin/[id], utils/auth-helpers/settings.ts)
  email_signin: 'Sign in with email',
  password_signin: 'Sign in with password',
  verify_otp: 'Verify code',
  forgot_password: 'Reset password',
  update_password: 'Update password',
  signup: 'Create account'
};

// Entity names for ID segments, registered by the pages that load them.
// Client-only (set in an effect), so nothing is shared between requests.
const names = new Map<string, string>();
const listeners = new Set<() => void>();
let version = 0;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Names the crumb for an ID segment: <BreadcrumbName id={election.id} name={election.title} />. */
export function BreadcrumbName({ id, name }: { id: string; name?: string | null }) {
  useEffect(() => {
    if (!name || names.get(id) === name) return;
    names.set(id, name);
    version++;
    listeners.forEach((listener) => listener());
  }, [id, name]);
  return null;
}

function title(segment: string) {
  if (TITLES[segment]) return TITLES[segment];
  const words = decodeURIComponent(segment).replace(/[-_]/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Breadcrumbs from the URL. On the public site they show from two levels deep
 * (a top-level page is already in the nav, as in the mocks); the portal
 * top bar starts at the section, without "Home" (Figma 7:640).
 */
export default function Breadcrumbs({ portal = false }: { portal?: boolean }) {
  const paths = usePathname();
  useSyncExternalStore(subscribe, () => version, () => 0);
  const pathNames = paths.split('/').filter((path) => path);
  // IDs read as their entity's name, or "Details" until a page names them
  // (never the raw ID: BUG-048). Route segments read as page titles.
  // Prefixes without a page of their own redirect (next.config.js).
  const isId = (segment: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
  const breadcrumbss = pathNames.map((path, index) => {
    return {
      name: isId(path) ? names.get(path) ?? 'Details' : title(path),
      link: `/${pathNames.slice(0, index + 1).join('/')}`
    };
  });

  if (pathNames.length < (portal ? 1 : 2)) {
    return null;
  }

  return (
    <Breadcrumb className={portal ? 'min-w-0' : 'pt-6'}>
      <BreadcrumbList className={portal ? 'flex-nowrap' : undefined}>
        {!portal && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}
        {breadcrumbss.map((breadcrumb, index) => {
          // The portal top bar is one line: phones show the last two crumbs.
          const phoneHidden = portal && index < breadcrumbss.length - 2 ? 'hidden sm:inline-flex' : undefined;
          return (
            <React.Fragment key={index}>
              {breadcrumbss.length - 1 !== index ? (
                <>
                  <BreadcrumbItem className={cn('shrink-0', phoneHidden)}>
                    <BreadcrumbLink href={breadcrumb.link}>
                      <span>{breadcrumb.name}</span>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className={phoneHidden} />
                </>
              ) : (
                // In an <li>, like every other child of the list (BUG-066).
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="block truncate">
                    {breadcrumb.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
