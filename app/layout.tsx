import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import SessionWrapper from '@/components/session-wrapper';
import ErrorBoundary from '@/components/error-boundary';
import BoltBadge from '@/components/bolt-badge';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FoodBridge AI - Connecting Food Donors with Communities in Need',
  description: 'AI-powered platform connecting food donors with NGOs and shelters to reduce waste and fight hunger. Built with Bolt for the hackathon.',
  keywords: 'food donation, hunger relief, AI matching, food waste reduction, community support, bolt hackathon',
  authors: [{ name: 'FoodBridge AI Team' }],
  openGraph: {
    title: 'FoodBridge AI - Smart Food Distribution Platform',
    description: 'AI-powered platform connecting food donors with NGOs and shelters to reduce waste and fight hunger.',
    type: 'website',
    url: 'https://foodbridge-ai.vercel.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FoodBridge AI - Smart Food Distribution Platform',
    description: 'AI-powered platform connecting food donors with NGOs and shelters to reduce waste and fight hunger.',
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#10b981" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <SessionWrapper>
            {children}
            <BoltBadge />
            <Toaster />
          </SessionWrapper>
        </ErrorBoundary>
      </body>
    </html>
  );
}