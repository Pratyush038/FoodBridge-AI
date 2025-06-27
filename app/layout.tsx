import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import SessionWrapper from '@/components/session-wrapper';
import ErrorBoundary from '@/components/error-boundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FoodBridge AI - Connecting Food Donors with Communities in Need',
  description: 'AI-powered platform connecting food donors with NGOs and shelters to reduce waste and fight hunger.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <SessionWrapper>
            {children}
            <Toaster />
          </SessionWrapper>
        </ErrorBoundary>
      </body>
    </html>
  );
}