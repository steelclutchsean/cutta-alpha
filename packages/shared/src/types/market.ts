export type ListingStatus = 'active' | 'sold' | 'cancelled' | 'expired';

export interface Listing {
  id: string;
  ownershipId: string;
  sellerId: string;
  percentageForSale: number;
  askingPrice: number;
  acceptingOffers: boolean;
  status: ListingStatus;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Offer {
  id: string;
  listingId: string;
  buyerId: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  expiresAt: Date;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  type: 'auction_purchase' | 'secondary_purchase' | 'payout' | 'deposit' | 'withdrawal';
  buyerId: string | null;
  sellerId: string | null;
  listingId: string | null;
  auctionItemId: string | null;
  amount: number;
  platformFee: number;
  netAmount: number;
  stripePaymentIntentId: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: Date;
}

export interface ListingWithDetails extends Listing {
  seller: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  ownership: {
    auctionItem: {
      team: {
        id: string;
        name: string;
        seed: number;
        region: string;
        logoUrl: string | null;
      };
    };
    purchasePrice: number;
  };
  offerCount: number;
}

export const PLATFORM_FEE_PERCENTAGE = 0.01; // 1% fee on secondary market

