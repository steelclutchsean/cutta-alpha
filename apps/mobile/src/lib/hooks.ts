import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context';
import { poolsApi, usersApi, marketApi } from './api';

// Generic hook for authenticated API calls
function useAuthenticatedFetch<T>(
  fetcher: (token: string) => Promise<T>,
  dependencies: any[] = []
) {
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mutate = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const result = await fetcher(token);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [token, ...dependencies]);

  useEffect(() => {
    mutate();
  }, [mutate]);

  return { data, error, isLoading, mutate };
}

// Pools
export function usePools() {
  return useAuthenticatedFetch(poolsApi.list);
}

export function usePool(poolId: string | null) {
  return useAuthenticatedFetch(
    (token) => (poolId ? poolsApi.get(token, poolId) : Promise.resolve(null)),
    [poolId]
  );
}

export function usePoolStandings(poolId: string | null) {
  return useAuthenticatedFetch(
    (token) => (poolId ? poolsApi.getStandings(token, poolId) : Promise.resolve([])),
    [poolId]
  );
}

// User
export function useUserProfile() {
  return useAuthenticatedFetch(usersApi.getProfile);
}

export function useUserBalance() {
  return useAuthenticatedFetch(usersApi.getBalance);
}

export function usePaymentMethods() {
  return useAuthenticatedFetch(usersApi.getPaymentMethods);
}

// Market
export function useMarketListings(poolId?: string) {
  return useAuthenticatedFetch(
    (token) => marketApi.getListings(token, poolId ? { poolId } : undefined),
    [poolId]
  );
}

export function useMyListings() {
  return useAuthenticatedFetch(marketApi.getMyListings);
}

