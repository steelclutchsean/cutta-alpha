import type { Metadata, Viewport } from 'next';
import { Inter, Barlow_Condensed, Fira_Code } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { ClerkProvider } from '@clerk/nextjs';
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
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#00ff77',
          colorBackground: '#1a1a1a',
          colorInputBackground: '#262626',
          colorInputText: '#ffffff',
          colorText: '#ffffff',
          colorTextSecondary: '#a3a3a3',
          colorDanger: '#ff4444',
          colorSuccess: '#00ff77',
          colorNeutral: '#737373',
        },
        elements: {
          formButtonPrimary: 'bg-primary-500 hover:bg-primary-600 text-dark-900',
          card: 'bg-dark-800 border border-dark-600',
          headerTitle: 'text-white',
          headerSubtitle: 'text-dark-300',
          socialButtonsBlockButton: 'bg-dark-700 border-dark-600 hover:bg-dark-600 text-white',
          socialButtonsBlockButtonText: 'text-white',
          formFieldLabel: 'text-dark-200',
          formFieldInput: 'bg-dark-700 border-dark-600 text-white',
          footerActionLink: 'text-primary-400 hover:text-primary-300',
          dividerLine: 'bg-dark-600',
          dividerText: 'text-dark-400',
          identityPreviewText: 'text-white',
          identityPreviewEditButtonIcon: 'text-primary-400',
          userButtonPopoverCard: 'bg-dark-800 border border-dark-600',
          userButtonPopoverActionButton: 'hover:bg-dark-700',
          userButtonPopoverActionButtonText: 'text-white',
          userButtonPopoverFooter: 'hidden',
        },
      }}
    >
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
    </ClerkProvider>
  );
}

