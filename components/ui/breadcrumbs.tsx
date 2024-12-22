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
  const breadcrumbss = pathNames.map((path, index) => {
    return {
      name: path,
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
