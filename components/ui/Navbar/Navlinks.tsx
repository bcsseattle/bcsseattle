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

const components: { title: string; href: string; description: string }[] = [
  { title: 'What we do', href: '/what-we-do', description: '' },
  { title: 'Get involved', href: '/get-involved', description: '' },
  { title: 'Get help', href: '/get-help', description: '' },
  { title: 'Contact us', href: '/contact-us', description: '' }
];

interface NavlinksProps {
  user: User | null | undefined;
}

export default function Navlinks({ user }: NavlinksProps) {
  const router = getRedirectMethod() === 'client' ? useRouter() : null;
  const currentPath = usePathname();

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
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

        {!user ? (
          <>
            <NavigationMenuItem>
              <ListItem href="/signin" title="For members"></ListItem>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Button variant="default" className="mx-2">
                <NextLink href="/donate">Donate</NextLink>
              </Button>
            </NavigationMenuItem>
          </>
        ) : (
          <NavigationMenuItem>
            <NavigationMenuTrigger>Membership</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-3 p-4 md:w-[200px] md:grid-cols-2 lg:w-[600px] ">
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
        )}
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
  );
});
ListItem.displayName = 'ListItem';
