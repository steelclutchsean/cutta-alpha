export type PoolStatus = 'draft' | 'open' | 'live' | 'in_progress' | 'completed' | 'cancelled';

export interface Pool {
  id: string;
  name: string;
  description: string | null;
  commissionerId: string;
  status: PoolStatus;
  buyIn: number;
  totalPot: number;
  maxParticipants: number | null;
  auctionStartTime: Date;
  tournamentId: string;
  inviteCode: string;
  streamConfig: StreamConfig | null;
  secondaryMarketEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StreamConfig {
  enabled: boolean;
  livekitRoom: string | null;
  externalStreamUrl: string | null;
}

export interface PoolMember {
  id: string;
  poolId: string;
  userId: string;
  role: 'commissioner' | 'member';
  totalSpent: number;
  totalWinnings: number;
  joinedAt: Date;
}

export interface PayoutRule {
  id: string;
  poolId: string;
  name: string;
  description: string | null;
  percentage: number;
  trigger: PayoutTrigger;
  triggerValue: string | null;
  order: number;
}

export type PayoutTrigger = 
  | 'championship_win'
  | 'final_four'
  | 'elite_eight'
  | 'sweet_sixteen'
  | 'round_of_32'
  | 'round_of_64'
  | 'first_four'
  | 'upset_bonus'
  | 'highest_seed_win'
  | 'custom';

export interface PoolWithDetails extends Pool {
  commissioner: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  memberCount: number;
  auctionItemCount: number;
}

