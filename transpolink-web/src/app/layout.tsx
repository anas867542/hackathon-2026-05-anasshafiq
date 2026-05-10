import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { PwaRegistration } from '@/components/PwaRegistration';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { PostHogProvider } from '@/components/providers/PostHogProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TranspoLink — On-demand truck booking',
  description: 'Book a truck in minutes. Live GPS tracking, transparent pricing.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TranspoLink',
  },
  icons: {
    apple: '/icons/icon-192.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <Suspense>
            <PostHogProvider>
              {children}
              <PwaRegistration />
            </PostHogProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
