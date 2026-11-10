import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { cn } from '@/utils/cn';
import { SessionProvider } from '~/lib/session';
import '@/styles/main.css';

const fontSans = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = { title: 'BCS Seattle' };

// viewport-fit=cover draws under the status bar and home indicator; the
// header and tab bar pad themselves by the safe-area insets.
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={cn('min-h-dvh bg-background font-sans text-foreground antialiased', fontSans.variable)}>
        <SessionProvider>{children}</SessionProvider>
        <Toaster position="top-center" mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 0.5rem)' }} />
      </body>
    </html>
  );
}
