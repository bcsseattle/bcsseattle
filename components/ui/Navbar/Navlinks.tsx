'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { SignOut } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { usePathname, useRouter } from 'next/navigation';
import { getRedirectMethod } from '@/utils/auth-helpers/settings';
import { cn } from '@/utils/cn';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle
} from '@/components/ui/navigation-menu';
import { Button } from '../button';
import { User } from '@supabase/supabase-js';
import { Member } from '@/types';
import { Shield, Users, Vote, Receipt } from 'lucide-react';

const components: { title: string; href: string; description: string }[] = [
  { title: 'What we do', href: '/what-we-do', description: '' },
  { title: 'Get involved', href: '/get-involved', description: '' },
  { title: 'Get help', href: '/get-help', description: '' },
  { title: 'Contact us', href: '/contact-us', description: '' }
];

interface NavlinksProps {
  user: User | null | undefined;
  member: Member | null | undefined;
  isAdmin?: boolean;
}

export default function Navlinks({ user, member, isAdmin }: NavlinksProps) {
  const router = getRedirectMethod() === 'client' ? useRouter() : null;
  const currentPath = usePathname();

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem
          className={member?.status === 'active' && member?.isApproved ? 'hidden sm:block' : ''}
        >
          <NavigationMenuTrigger>About us</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
              <li className="row-span-3">
                <NextLink
                  href="/about-us"
                  className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 pt-2 no-underline outline-none focus:shadow-md"
                >
                  <NavigationMenuLink
                    className={navigationMenuTriggerStyle()}
                    asChild
                  >
                    <>
                      <div className="mb-2 mt-4 text-lg font-medium">
                        BCS Seattle
                      </div>
                      <p className="text-sm leading-tight text-muted-foreground">
                        Baloch Community Services of Seattle is a nonprofit
                        organization that provides social services to the Baloch
                        community in the Seattle area.
                      </p>
                    </>
                  </NavigationMenuLink>
                </NextLink>
              </li>
              <ListItem href="/about-us/mission" title="Mission">
                BCS Seattle enhances the Baloch community's welfare in Greater
                Seattle through educational programs, cultural events, and
                social services, promoting cultural integration and
                preservation.
              </ListItem>
              <ListItem href="/about-us/vision" title="Vision">
                Our vision is to make BCS Seattle a vibrant cultural hub in
                Greater Seattle, fostering social, educational, and cultural
                growth among the Baloch community, emphasizing tradition and
                adaptation.
              </ListItem>
              <ListItem href="/about-us/bylaws" title="Bylaws">
                View BCSS bylaws
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
              {components.map((component) => (
                <ListItem
                  key={component.title}
                  title={component.title}
                  href={component.href}
                >
                  {component.description}
                </ListItem>
              ))}
              {user && (
                <ListItem
                  href="/resources/immigration"
                  title="Immigration"
                ></ListItem>
              )}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <NextLink 
              href="/fundraisers" 
              className={cn(
                navigationMenuTriggerStyle(),
                "bg-transparent hover:bg-accent"
              )}
            >
              Fundraisers
            </NextLink>
          </NavigationMenuLink>
        </NavigationMenuItem>
        
        {/* Show admin menu only for admin users */}
        {user && isAdmin && (
          <NavigationMenuItem>
            <NavigationMenuTrigger>
              <Shield className="h-4 w-4 mr-2" />
              Admin
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                <ListItem href="/admin/members" title="Member Management">
                  <Users className="h-4 w-4 mr-2 inline" />
                  Review and approve member applications
                </ListItem>
                <ListItem href="/admin/elections" title="Election Management">
                  <Vote className="h-4 w-4 mr-2 inline" />
                  Manage elections and voting
                </ListItem>
                <ListItem href="/fundraisers/admin/new" title="Fundraiser Management">
                  <Shield className="h-4 w-4 mr-2 inline" />
                  Create and manage fundraisers
                </ListItem>
                <ListItem href="/admin/expenses" title="Expenses">
                  <Receipt className="h-4 w-4 mr-2 inline" />
                  Record the organization&apos;s expenses
                </ListItem>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        )}
        
        {/* Show membership menu only for users with active approved membership */}
        {user && member && (member?.status === 'active' || member?.isApproved) && (
          <>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Membership</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                  <ListItem href="/elections" title="Elections"></ListItem>
                  <ListItem href="/account" title="Account"></ListItem>
                  <ListItem
                    href="/contribute"
                    title="Manage contribution"
                  ></ListItem>
                  <ListItem href="/members" title="Members"></ListItem>
                  <ListItem
                    href="/community-funds"
                    title="Community Funds"
                  ></ListItem>
                  <NavigationMenuLink asChild>
                    <li className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                      <form onSubmit={(e) => handleRequest(e, SignOut, router)}>
                        <input
                          type="hidden"
                          name="pathName"
                          value={currentPath}
                        />
                        <button type="submit">Sign out</button>
                      </form>
                    </li>
                  </NavigationMenuLink>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </>
        )}

        {/* Show "For members" if user is not logged in OR if they don't have an active approved membership */}
        {(!user || !member || (member?.status !== 'active' && !member?.isApproved)) && (
          <NavigationMenuItem>
            <ListItem href="/signin?redirectTo=%2Faccount" title="For members"></ListItem>
          </NavigationMenuItem>
        )}
        <NavigationMenuItem>
          <Button variant="default" className="mx-2">
            <NextLink href="/donate">Donate</NextLink>
          </Button>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const Link = ({ href, ...props }: { href: string }) => {
  const pathname = usePathname();
  const isActive = href === pathname;

  return (
    <NavigationMenuLink asChild active={isActive}>
      <NextLink href={href} className="NavigationMenuLink" {...props} />
    </NavigationMenuLink>
  );
};

const ListItem = React.forwardRef<
  React.ElementRef<'a'>,
  React.ComponentPropsWithoutRef<'a'>
>(({ className, title, href, children, ...props }, ref) => {
  return (
    <ul>
      <li>
        <NavigationMenuLink asChild>
          <NextLink
            href={href as string}
            className={cn(
              'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
              className
            )}
            {...props}
          >
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="line-clamp-4 text-sm leading-snug text-muted-foreground">
              {children}
            </p>
          </NextLink>
        </NavigationMenuLink>
      </li>
    </ul>
  );
});
ListItem.displayName = 'ListItem';

/** The navigation as plain groups of links, for the phone menu (BUG-050). */
function navGroups({ user, member, isAdmin }: NavlinksProps) {
  const isMember = !!user && !!member && (member.status === 'active' || member.isApproved);
  return [
    {
      title: 'About us',
      links: [
        { title: 'About BCS Seattle', href: '/about-us' },
        { title: 'Mission', href: '/about-us/mission' },
        { title: 'Vision', href: '/about-us/vision' },
        { title: 'Bylaws', href: '/about-us/bylaws' }
      ]
    },
    {
      title: 'Resources',
      links: [...components, ...(user ? [{ title: 'Immigration', href: '/resources/immigration' }] : [])]
    },
    { title: 'Fundraisers', links: [{ title: 'Fundraisers', href: '/fundraisers' }] },
    ...(user && isAdmin
      ? [
          {
            title: 'Admin',
            links: [
              { title: 'Member Management', href: '/admin/members' },
              { title: 'Election Management', href: '/admin/elections' },
              { title: 'Fundraiser Management', href: '/fundraisers/admin/new' },
              { title: 'Expenses', href: '/admin/expenses' }
            ]
          }
        ]
      : []),
    isMember
      ? {
          title: 'Membership',
          links: [
            { title: 'Elections', href: '/elections' },
            { title: 'Account', href: '/account' },
            { title: 'Manage contribution', href: '/contribute' },
            { title: 'Members', href: '/members' },
            { title: 'Community Funds', href: '/community-funds' }
          ]
        }
      : { title: 'For members', links: [{ title: 'For members', href: '/signin?redirectTo=%2Faccount' }] }
  ];
}

/** Phone menu: a native disclosure, so it works before and without JavaScript. */
export function MobileNav(props: NavlinksProps) {
  const router = getRedirectMethod() === 'client' ? useRouter() : null;
  const currentPath = usePathname();
  const menu = React.useRef<HTMLDetailsElement>(null);
  // Close the menu after navigating.
  React.useEffect(() => menu.current?.removeAttribute('open'), [currentPath]);
  const { user, member } = props;
  const isMember = !!user && !!member && (member.status === 'active' || member.isApproved);
  return (
    <details ref={menu} className="relative">
      <summary className="list-none cursor-pointer rounded-md border px-3 py-2 text-sm font-medium">Menu</summary>
      <nav aria-label="Mobile" className="absolute right-0 z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-md border bg-white p-2 shadow-lg">
        {navGroups(props).map((group) => (
          <div key={group.title} className="py-1">
            {group.links.length > 1 && <p className="px-3 pt-2 text-xs font-semibold uppercase text-muted-foreground">{group.title}</p>}
            <ul>
              {group.links.map((link) => (
                <li key={link.href}>
                  <NextLink href={link.href} className="block rounded-md px-3 py-2 text-sm hover:bg-accent">
                    {link.title}
                  </NextLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {isMember && (
          <form onSubmit={(e) => handleRequest(e, SignOut, router)} className="px-3 py-2">
            <input type="hidden" name="pathName" value={currentPath} />
            <button type="submit" className="text-sm">Sign out</button>
          </form>
        )}
        <Button asChild className="m-2 w-[calc(100%-1rem)]">
          <NextLink href="/donate">Donate</NextLink>
        </Button>
      </nav>
    </details>
  );
}
