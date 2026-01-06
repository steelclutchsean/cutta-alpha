import type { Metadata, Viewport } from 'next';
import { Inter, Barlow_Condensed, Fira_Code } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-condensed',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Cutta - Calcutta Auctions',
  description: 'The ultimate platform for Calcutta-style auctions. Live drafts, real-time bidding, and instant payouts.',
  keywords: ['calcutta', 'auction', 'march madness', 'fantasy sports', 'betting pool'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#121212',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${barlowCondensed.variable} ${firaCode.variable} font-body bg-dark-800 text-white antialiased`}
      >
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #333',
              },
              success: {
                iconTheme: {
                  primary: '#00ff77',
                  secondary: '#1a1a1a',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ff4444',
                  secondary: '#1a1a1a',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}

