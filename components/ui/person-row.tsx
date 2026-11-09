import * as React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/utils/cn';

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

/**
 * Art Gallery PersonRow (Figma 33:70): avatar, name and a secondary line
 * (role, date, status). `trailing` sits at the right.
 */
export function PersonRow({
  name,
  secondary,
  imageUrl,
  trailing,
  className
}: {
  name: string;
  secondary?: React.ReactNode;
  imageUrl?: string | null;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-h-11 min-w-0 items-center gap-2.5', className)}>
      <Avatar>
        {imageUrl && <AvatarImage src={imageUrl} alt="" />}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">{name}</span>
        {secondary && <span className="truncate text-caption text-muted-foreground">{secondary}</span>}
      </div>
      {trailing}
    </div>
  );
}
