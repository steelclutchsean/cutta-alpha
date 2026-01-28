'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuthToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const token = searchParams.get('token');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError('Authentication failed. Please try again.');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      if (!token) {
        setError('No authentication token received.');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      try {
        await setAuthToken(token);
        router.push('/dashboard');
      } catch (err) {
        console.error('Failed to set auth token:', err);
        setError('Failed to complete authentication.');
        setTimeout(() => router.push('/login'), 3000);
      }
    }

    handleCallback();
  }, [searchParams, setAuthToken, router]);

  return (
    <div className="relative text-center">
      {error ? (
        <div className="text-red-400">
          <p className="text-lg mb-2">{error}</p>
          <p className="text-sm text-dark-400">Redirecting to login...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-white text-lg">Completing sign in...</p>
        </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      <p className="text-white text-lg">Loading...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-mesh-gradient opacity-20" />
      <Suspense fallback={<LoadingFallback />}>
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}
