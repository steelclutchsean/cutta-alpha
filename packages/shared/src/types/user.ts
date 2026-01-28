export type AvatarType = 'CUSTOM' | 'PRESET' | 'GOOGLE';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  avatarType: AvatarType;
  presetAvatarId: string | null;
  phone: string | null;
  balance: number;
  kycVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  createdAt: Date;
}

export interface UserProfile extends User {
  ownedTeams: number;
  totalWinnings: number;
  poolsJoined: number;
  activeListings: number;
  pools: Array<{
    id: string;
    name: string;
    status: string;
    auctionStartTime: Date;
  }>;
  ownerships: any[];
}

// Preset avatar definition
export interface PresetAvatar {
  id: string;
  name: string;
  url: string;
  category: 'sports' | 'abstract' | 'animals' | 'characters';
}

// Transaction analytics types
export interface TransactionAnalytics {
  summary: {
    totalSpent: number;
    totalEarned: number;
    totalWinnings: number;
    netPnL: number;
    transactionCount: number;
  };
  byType: {
    type: string;
    count: number;
    total: number;
  }[];
  byPool: {
    poolId: string;
    poolName: string;
    spent: number;
    earned: number;
    winnings: number;
  }[];
  monthlyTrends: {
    month: string;
    spent: number;
    earned: number;
    winnings: number;
  }[];
}

export interface TransactionWithDetails {
  id: string;
  type: string;
  amount: number;
  netAmount: number;
  platformFee: number;
  status: string;
  createdAt: Date;
  buyerId: string | null;
  sellerId: string | null;
  listing?: {
    ownership?: {
      auctionItem?: {
        team?: {
          id: string;
          name: string;
          shortName: string;
          logoUrl: string | null;
        };
        pool?: {
          id: string;
          name: string;
        };
      };
    };
  };
}

