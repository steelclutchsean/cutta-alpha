import { create } from 'zustand';
import type { AuctionState, ChatMessage } from '@cutta/shared';

interface AuctionStore {
  state: AuctionState | null;
  messages: ChatMessage[];
  typingUsers: Array<{ userId: string; displayName: string }>;
  setAuctionState: (state: AuctionState) => void;
  updateTimeRemaining: (time: number) => void;
  addMessage: (message: ChatMessage) => void;
  addReaction: (messageId: string, emoji: string, userId: string) => void;
  setTypingUser: (user: { userId: string; displayName: string }) => void;
  removeTypingUser: (userId: string) => void;
  reset: () => void;
}

export const useAuctionStore = create<AuctionStore>((set) => ({
  state: null,
  messages: [],
  typingUsers: [],

  setAuctionState: (state) => set({ state }),

  updateTimeRemaining: (timeRemaining) =>
    set((prev) => ({
      state: prev.state ? { ...prev.state, timeRemaining } : null,
    })),

  addMessage: (message) =>
    set((prev) => ({
      messages: [...prev.messages, message].slice(-100), // Keep last 100 messages
    })),

  addReaction: (messageId, emoji, userId) =>
    set((prev) => ({
      messages: prev.messages.map((msg) => {
        if (msg.id !== messageId) return msg;
        const reactions = { ...msg.reactions };
        if (!reactions[emoji]) {
          reactions[emoji] = [];
        }
        if (!reactions[emoji].includes(userId)) {
          reactions[emoji] = [...reactions[emoji], userId];
        }
        return { ...msg, reactions };
      }),
    })),

  setTypingUser: (user) =>
    set((prev) => ({
      typingUsers: prev.typingUsers.some((u) => u.userId === user.userId)
        ? prev.typingUsers
        : [...prev.typingUsers, user],
    })),

  removeTypingUser: (userId) =>
    set((prev) => ({
      typingUsers: prev.typingUsers.filter((u) => u.userId !== userId),
    })),

  reset: () => set({ state: null, messages: [], typingUsers: [] }),
}));

interface PoolStore {
  activePoolId: string | null;
  setActivePool: (poolId: string | null) => void;
}

export const usePoolStore = create<PoolStore>((set) => ({
  activePoolId: null,
  setActivePool: (poolId) => set({ activePoolId: poolId }),
}));

