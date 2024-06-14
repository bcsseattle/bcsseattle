import { Metadata } from 'next';
import Navbar from '@/components/ui/Navbar';
import { Toaster } from '@/components/ui/Toasts/toaster';
import { PropsWithChildren, Suspense } from 'react';
import { getURL } from '@/utils/helpers';
import { Inter as FontSans } from 'next/font/google';
import { cn } from '@/utils/cn';
import '@/styles/main.css';
import Footer from '@/components/Footer';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans'
});

const meta = {
  title: 'Baloch Community Services of Seattle',
  description:
    'BCS Seattle is a nonprofit organization that provides services to the Baloch community in Seattle.',
  // cardImage: '/og.png',
  robots: 'follow, index',
  favicon: '/favicon.ico',
  url: getURL()
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: meta.title,
    description: meta.description,
    referrer: 'origin-when-cross-origin',
    keywords: ['Baloch', 'Baluch', 'Seattle'],
    authors: [{ name: 'BCS Seattle', url: '' }],
    creator: 'BCS Seattle',
    publisher: 'BCS Seattle',
    robots: meta.robots,
    icons: { icon: meta.favicon },
    metadataBase: new URL(meta.url),
    openGraph: {
      url: meta.url,
      title: meta.title,
      description: meta.description,
      // images: [meta.cardImage],
      type: 'website',
      siteName: meta.title
    }
    // twitter: {
    //   card: 'summary_large_image',
    //   site: '@Vercel',
    //   creator: '@Vercel',
    //   title: meta.title,
    //   description: meta.description,
    //   images: [meta.cardImage]
    // }
  };
}

export default async function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
        <Navbar />
        <main id="skip" className="mx-auto p-12">
          {children}
        </main>
        <Footer />
        <Suspense>
          <Toaster />
        </Suspense>
      </body>
    </html>
  );
}
