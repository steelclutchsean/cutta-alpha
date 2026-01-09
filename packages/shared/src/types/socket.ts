import type { AuctionItemWithDetails, AuctionState, Bid } from './auction';

// Client -> Server events
export interface ClientToServerEvents {
  // Room management
  joinPool: (poolId: string) => void;
  leavePool: (poolId: string) => void;
  
  // Auction events
  placeBid: (data: { auctionItemId: string; amount: number }) => void;
  
  // Chat events
  sendMessage: (data: { poolId: string; content: string }) => void;
  sendReaction: (data: { messageId: string; emoji: string }) => void;
  
  // Typing indicator
  startTyping: (poolId: string) => void;
  stopTyping: (poolId: string) => void;
}

// Server -> Client events
export interface ServerToClientEvents {
  // Connection
  connected: (data: { userId: string }) => void;
  error: (data: { message: string; code: string }) => void;
  
  // Auction events
  auctionStateUpdate: (state: AuctionState) => void;
  itemActive: (item: AuctionItemWithDetails) => void;
  newBid: (bid: Bid & { bidder: { displayName: string } }) => void;
  timerUpdate: (timeRemaining: number) => void;
  itemSold: (data: { 
    item: AuctionItemWithDetails; 
    winner: { id: string; displayName: string };
    winningBid: number;
  }) => void;
  auctionPaused: () => void;
  auctionResumed: () => void;
  auctionCompleted: (data: { totalRaised: number }) => void;
  
  // Chat events
  newMessage: (message: ChatMessage) => void;
  messageReaction: (data: { messageId: string; emoji: string; userId: string }) => void;
  userTyping: (data: { userId: string; displayName: string }) => void;
  userStoppedTyping: (data: { userId: string }) => void;
  
  // Chat moderation events
  userMuted: (data: { userId: string; mutedUntil: Date | null }) => void;
  userUnmuted: (data: { userId: string }) => void;
  messageDeleted: (data: { messageId: string }) => void;
  
  // Pool events
  memberJoined: (data: { userId: string; displayName: string }) => void;
  memberLeft: (data: { userId: string }) => void;
  poolUpdated: (data: { poolId: string; status: string }) => void;
  
  // Studio/Commissioner events
  auctionReverted: (data: { itemId: string }) => void;
  viewerCountUpdate: (data: { count: number }) => void;
  
  // Wheel spin events
  wheelSpinInitialized: (data: { 
    totalTeams: number;
    participants: Array<{ id: string; displayName: string }>;
    assignments: Array<{ order: number; teamName: string; userName: string }>;
  }) => void;
  wheelSpinStart: (data: {
    teams: Array<{ id: string; name: string; seed: number | null; region: string | null; shortName: string }>;
    targetTeamId: string;
    assignedUserId: string;
    assignedUserName: string;
    spinDuration: number;
    spinIndex: number;
    totalSpins: number;
  }) => void;
  wheelSpinComplete: (data: { message: string }) => void;
  
  // Tournament events
  gameUpdate: (data: { gameId: string; team1Score: number; team2Score: number; status: string }) => void;
  teamEliminated: (data: { teamId: string; eliminatedRound: number }) => void;
  payoutProcessed: (data: { userId: string; amount: number; reason: string }) => void;
  
  // Balance updates
  balanceUpdate: (data: { balance: number; change: number; reason: string }) => void;
}

export interface ChatMessage {
  id: string;
  poolId: string;
  userId: string;
  user: {
    displayName: string;
    avatarUrl: string | null;
  };
  content: string;
  reactions: Record<string, string[]>; // emoji -> userIds
  createdAt: Date;
}

export interface SocketData {
  userId: string;
  poolId: string | null;
}

