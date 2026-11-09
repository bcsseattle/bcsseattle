import { Banner } from './banner';

/** An Info banner; kept so existing call sites read the same. */
export const InfoBlock = ({ title, description, children }: any) => (
  <Banner tone="info" title={title}>
    {description}
    {children}
  </Banner>
);
