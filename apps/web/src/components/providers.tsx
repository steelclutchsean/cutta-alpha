'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/lib/auth-context';
import { SocketProvider } from '@/lib/socket-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
    >
      <AuthProvider>
        <SocketProvider>{children}</SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
