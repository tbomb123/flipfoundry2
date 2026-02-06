/**
 * Next.js Root Layout
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FlipFoundry - AI-Powered Arbitrage Intelligence',
  description: 'Find hidden profits fast. AI-powered deal intelligence for serious flippers.',
  keywords: ['arbitrage', 'ebay', 'flipping', 'deals', 'AI', 'trading cards', 'sneakers'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
