'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

import { PortalSidebar } from '@/components/portal/portal-sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

/** Below lg: the portal sidebar in a left Sheet, closed again on navigation. */
export function PortalMenu({ isMember, isAdmin }: { isMember: boolean; isAdmin: boolean }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Menu">
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0 sm:max-w-60">
        <SheetTitle className="sr-only">Member portal menu</SheetTitle>
        <PortalSidebar isMember={isMember} isAdmin={isAdmin} />
      </SheetContent>
    </Sheet>
  );
}
