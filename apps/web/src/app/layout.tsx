import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from 'react-hot-toast';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cutta - Calcutta Auctions',
  description: 'The ultimate platform for Calcutta-style auctions. Live drafts, real-time bidding, and instant payouts.',
  keywords: ['calcutta', 'auction', 'march madness', 'fantasy sports', 'betting pool'],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0c' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-body antialiased`}
        style={{
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        }}
      >
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'glass-panel !p-4',
              style: {
                background: 'var(--glass-bg-solid)',
                backdropFilter: 'blur(24px)',
                color: 'rgb(var(--text-primary))',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow-lg)',
              },
              success: {
                iconTheme: {
                  primary: 'rgb(var(--accent-green))',
                  secondary: 'white',
                },
              },
              error: {
                iconTheme: {
                  primary: 'rgb(var(--accent-red))',
                  secondary: 'white',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
