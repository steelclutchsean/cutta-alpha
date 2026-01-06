export type AuctionItemStatus = 'pending' | 'active' | 'sold' | 'unsold';

export interface AuctionItem {
  id: string;
  poolId: string;
  teamId: string;
  status: AuctionItemStatus;
  startingBid: number;
  currentBid: number | null;
  currentBidderId: string | null;
  winningBid: number | null;
  winnerId: string | null;
  order: number;
  auctionedAt: Date | null;
  createdAt: Date;
}

export interface Bid {
  id: string;
  auctionItemId: string;
  userId: string;
  amount: number;
  isWinning: boolean;
  createdAt: Date;
}

export interface Ownership {
  id: string;
  userId: string;
  auctionItemId: string;
  percentage: number;
  purchasePrice: number;
  acquiredAt: Date;
  source: 'auction' | 'secondary_market';
}

export interface AuctionItemWithDetails extends AuctionItem {
  team: {
    id: string;
    name: string;
    seed: number;
    region: string;
    logoUrl: string | null;
  };
  currentBidder: {
    id: string;
    displayName: string;
  } | null;
  bidCount: number;
}

export interface AuctionState {
  poolId: string;
  status: 'not_started' | 'in_progress' | 'paused' | 'completed';
  currentItem: AuctionItemWithDetails | null;
  nextItems: AuctionItemWithDetails[];
  completedItems: AuctionItemWithDetails[];
  timeRemaining: number;
  totalRaised: number;
}

