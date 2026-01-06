'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';
import type { ClientToServerEvents, ServerToClientEvents } from '@cutta/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextType {
  socket: TypedSocket | null;
  isConnected: boolean;
  joinPool: (poolId: string) => void;
  leavePool: (poolId: string) => void;
  placeBid: (auctionItemId: string, amount: number) => void;
  sendMessage: (poolId: string, content: string) => void;
  sendReaction: (messageId: string, emoji: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket: TypedSocket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const joinPool = useCallback(
    (poolId: string) => {
      if (socket && isConnected) {
        socket.emit('joinPool', poolId);
      }
    },
    [socket, isConnected]
  );

  const leavePool = useCallback(
    (poolId: string) => {
      if (socket && isConnected) {
        socket.emit('leavePool', poolId);
      }
    },
    [socket, isConnected]
  );

  const placeBid = useCallback(
    (auctionItemId: string, amount: number) => {
      if (socket && isConnected) {
        socket.emit('placeBid', { auctionItemId, amount });
      }
    },
    [socket, isConnected]
  );

  const sendMessage = useCallback(
    (poolId: string, content: string) => {
      if (socket && isConnected) {
        socket.emit('sendMessage', { poolId, content });
      }
    },
    [socket, isConnected]
  );

  const sendReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (socket && isConnected) {
        socket.emit('sendReaction', { messageId, emoji });
      }
    },
    [socket, isConnected]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinPool,
        leavePool,
        placeBid,
        sendMessage,
        sendReaction,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

