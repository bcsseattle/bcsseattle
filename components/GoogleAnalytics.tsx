import React from 'react';
import Script from 'next/script';

const GoogleAnalytics = () => {
  const id = process.env.NEXT_PUBLIC_MEASUREMENT_ID;
  // Without a measurement id it loaded gtag/js?id=undefined (BUG-063).
  if (!id) return null;
  return (
    <>
      <Script strategy="lazyOnload" src={`https://www.googletagmanager.com/gtag/js?id=${id}`} />

      <Script id="google-analytics" strategy="lazyOnload">
        {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${id}', {
              page_path: window.location.pathname,
              });
          `}
      </Script>
    </>
  );
};

export default GoogleAnalytics;
