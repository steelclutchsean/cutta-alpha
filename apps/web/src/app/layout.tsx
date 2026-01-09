import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from 'react-hot-toast';
import { ClerkProvider } from '@clerk/nextjs';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cutta - Calcutta Auctions',
  description: 'The ultimate platform for Calcutta-style auctions. Live drafts, real-time bidding, and instant payouts.',
  keywords: ['calcutta', 'auction', 'march madness', 'fantasy sports', 'betting pool'],
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
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#007aff',
          colorBackground: '#1c1c20',
          colorInputBackground: '#28282e',
          colorInputText: '#ffffff',
          colorText: '#ffffff',
          colorTextSecondary: '#aeaeb2',
          colorDanger: '#ff3b30',
          colorSuccess: '#34c759',
          colorNeutral: '#8e8e93',
        },
        elements: {
          formButtonPrimary: 'bg-accent-blue hover:bg-accent-blue/90 text-white',
          card: 'bg-bg-tertiary border border-glass-border backdrop-blur-glass',
          headerTitle: 'text-text-primary',
          headerSubtitle: 'text-text-tertiary',
          socialButtonsBlockButton: 'glass-btn',
          socialButtonsBlockButtonText: 'text-text-primary',
          formFieldLabel: 'text-text-secondary',
          formFieldInput: 'glass-input',
          footerActionLink: 'text-accent-blue hover:text-accent-blue/80',
          dividerLine: 'bg-glass-border',
          dividerText: 'text-text-quaternary',
          identityPreviewText: 'text-text-primary',
          identityPreviewEditButtonIcon: 'text-accent-blue',
          userButtonPopoverCard: 'glass-panel',
          userButtonPopoverActionButton: 'hover:bg-glass-bg-hover',
          userButtonPopoverActionButtonText: 'text-text-primary',
          userButtonPopoverFooter: 'hidden',
        },
      }}
    >
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
    </ClerkProvider>
  );
}
