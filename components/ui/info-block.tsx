import type { ReactNode } from 'react';
import { Banner } from './banner';

/** An Info banner; kept so existing call sites read the same. */
export const InfoBlock = ({
  title,
  description,
  children
}: {
  title?: string;
  description?: ReactNode;
  children?: ReactNode;
}) => (
  <Banner tone="info" title={title}>
    {description}
    {children}
  </Banner>
);
