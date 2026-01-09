import { useEffect, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { useAuth } from './auth-context';
import { useSocket } from './socket-context';
import { useAuctionStore } from './store';
import {
  poolsApi,
  auctionApi,
  marketApi,
  tournamentsApi,
  usersApi,
} from './api';

// Generic fetcher with auth
function useAuthenticatedSWR<T>(
  key: string | null,
  fetcher: (token: string) => Promise<T>
) {
  const { token } = useAuth();

  return useSWR(
    token && key ? [key, token] : null,
    ([, authToken]) => fetcher(authToken)
  );
}

// Pools
export function usePools() {
  return useAuthenticatedSWR('pools', poolsApi.list);
}

export function useCommissionedPools() {
  return useAuthenticatedSWR('commissioned-pools', poolsApi.commissioned);
}

export function useDiscoverPools() {
  return useAuthenticatedSWR('discover-pools', poolsApi.discover);
}

export function usePool(poolId: string | null) {
  return useAuthenticatedSWR(
    poolId ? `pool-${poolId}` : null,
    (token) => poolsApi.get(token, poolId!)
  );
}

export function usePoolStandings(poolId: string | null) {
  return useAuthenticatedSWR(
    poolId ? `pool-standings-${poolId}` : null,
    (token) => poolsApi.getStandings(token, poolId!)
  );
}

// Auction
export function useAuctionState(poolId: string | null) {
  const { token } = useAuth();
  const { socket, isConnected, joinPool, leavePool } = useSocket();
  const { setAuctionState, updateTimeRemaining, addMessage, addReaction, setTypingUser, removeTypingUser } =
    useAuctionStore();

  // Join pool room when socket connects
  useEffect(() => {
    if (!poolId || !isConnected) return;
    joinPool(poolId);
    return () => leavePool(poolId);
  }, [poolId, isConnected, joinPool, leavePool]);

  // Load initial state
  useEffect(() => {
    if (!token || !poolId) return;

    auctionApi.getState(token, poolId).then(setAuctionState);
  }, [token, poolId, setAuctionState]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('auctionStateUpdate', setAuctionState);
    socket.on('timerUpdate', updateTimeRemaining);
    socket.on('newMessage', addMessage);
    socket.on('messageReaction', ({ messageId, emoji, userId }) =>
      addReaction(messageId, emoji, userId)
    );
    socket.on('userTyping', setTypingUser);
    socket.on('userStoppedTyping', ({ userId }) => removeTypingUser(userId));

    return () => {
      socket.off('auctionStateUpdate');
      socket.off('timerUpdate');
      socket.off('newMessage');
      socket.off('messageReaction');
      socket.off('userTyping');
      socket.off('userStoppedTyping');
    };
  }, [socket, setAuctionState, updateTimeRemaining, addMessage, addReaction, setTypingUser, removeTypingUser]);

  return useAuctionStore((state) => state.state);
}

// Market
export function useMarketListings(poolId?: string) {
  return useAuthenticatedSWR(
    `market-listings${poolId ? `-${poolId}` : ''}`,
    (token) => marketApi.getListings(token, poolId ? { poolId } : undefined)
  );
}

export function useMyListings() {
  return useAuthenticatedSWR('my-listings', marketApi.getMyListings);
}

export function useMyOffers() {
  return useAuthenticatedSWR('my-offers', marketApi.getMyOffers);
}

// Tournaments
export function useTournaments() {
  return useSWR('tournaments', () => tournamentsApi.list());
}

export function useTournament(id: string | null) {
  return useSWR(id ? `tournament-${id}` : null, () => tournamentsApi.get(id!));
}

export function useTournamentBracket(id: string | null) {
  return useSWR(id ? `bracket-${id}` : null, () => tournamentsApi.getBracket(id!));
}

// User
export function useUserProfile() {
  return useAuthenticatedSWR('profile', usersApi.getProfile);
}

export function useUserBalance() {
  return useAuthenticatedSWR('balance', usersApi.getBalance);
}

export function usePaymentMethods() {
  return useAuthenticatedSWR('payment-methods', usersApi.getPaymentMethods);
}

export function usePresetAvatars() {
  return useAuthenticatedSWR('preset-avatars', usersApi.getPresetAvatars);
}

export function useTransactionAnalytics() {
  return useAuthenticatedSWR('transaction-analytics', usersApi.getTransactionAnalytics);
}

export function useTransactions(params?: { 
  type?: string; 
  poolId?: string; 
  startDate?: string; 
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const { token } = useAuth();
  const key = params 
    ? `transactions-${JSON.stringify(params)}` 
    : 'transactions';
  
  return useSWR(
    token ? [key, token] : null,
    ([, authToken]) => usersApi.getTransactions(authToken, params)
  );
}

export function useUserOwnerships(poolId?: string) {
  return useAuthenticatedSWR(
    poolId ? `ownerships-${poolId}` : 'ownerships',
    (token) => usersApi.getOwnerships(token, poolId)
  );
}

// Debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Missing useState import fix
import { useState } from 'react';

// Interval hook for timer
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// Local storage hook
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

