'use client';
import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';

export default function Breadcrumbs() {
  const paths = usePathname();
  const pathNames = paths.split('/').filter((path) => path);
  // IDs read as "Details" and slugs as words, not raw UUIDs and hyphens (BUG-048).
  // Prefixes without a page of their own redirect (next.config.js).
  const isId = (segment: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
  const breadcrumbss = pathNames.map((path, index) => {
    return {
      name: isId(path) ? 'Details' : decodeURIComponent(path).replace(/[-_]/g, ' '),
      link: `/${pathNames.slice(0, index + 1).join('/')}`
    };
  });

  if (pathNames.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className="py-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {breadcrumbss.map((breadcrumb, index) => {
          return (
            <React.Fragment key={index}>
              {breadcrumbss.length - 1 !== index ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      href={breadcrumb.link}
                      className="capitalize"
                    >
                      <span>{breadcrumb.name}</span>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              ) : (
                <BreadcrumbPage className="capitalize">
                  {breadcrumb.name}
                </BreadcrumbPage>
              )}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
