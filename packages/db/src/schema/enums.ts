import { pgEnum } from 'drizzle-orm/pg-core';

// User & Auth
export const avatarTypeEnum = pgEnum('AvatarType', ['CUSTOM', 'PRESET', 'GOOGLE']);

// Tournament & Teams
export const sportEnum = pgEnum('Sport', ['NCAA_BASKETBALL', 'NFL', 'NBA', 'NHL', 'MLB', 'TENNIS', 'GOLF', 'OTHER']);
export const tournamentStatusEnum = pgEnum('TournamentStatus', ['UPCOMING', 'IN_PROGRESS', 'COMPLETED']);
export const gameStatusEnum = pgEnum('GameStatus', ['SCHEDULED', 'IN_PROGRESS', 'FINAL']);

// Pools & Auctions
export const auctionModeEnum = pgEnum('AuctionMode', ['TRADITIONAL', 'WHEEL_SPIN']);
export const poolStatusEnum = pgEnum('PoolStatus', ['DRAFT', 'OPEN', 'LIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const poolRoleEnum = pgEnum('PoolRole', ['COMMISSIONER', 'MEMBER']);
export const payoutTriggerEnum = pgEnum('PayoutTrigger', [
  'CHAMPIONSHIP_WIN',
  'FINAL_FOUR',
  'ELITE_EIGHT',
  'SWEET_SIXTEEN',
  'ROUND_OF_32',
  'ROUND_OF_64',
  'FIRST_FOUR',
  'UPSET_BONUS',
  'HIGHEST_SEED_WIN',
  'CUSTOM',
  'SUPER_BOWL_WIN',
  'CONFERENCE_CHAMPIONSHIP',
  'DIVISIONAL_ROUND',
  'WILD_CARD_WIN',
]);

// Auction Items
export const auctionItemStatusEnum = pgEnum('AuctionItemStatus', ['PENDING', 'ACTIVE', 'SOLD', 'UNSOLD']);

// Ownership & Market
export const ownershipSourceEnum = pgEnum('OwnershipSource', ['AUCTION', 'SECONDARY_MARKET']);
export const listingStatusEnum = pgEnum('ListingStatus', ['ACTIVE', 'SOLD', 'CANCELLED', 'EXPIRED']);
export const offerStatusEnum = pgEnum('OfferStatus', ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED']);

// Transactions
export const transactionTypeEnum = pgEnum('TransactionType', [
  'AUCTION_PURCHASE',
  'SECONDARY_PURCHASE',
  'PAYOUT',
  'DEPOSIT',
  'WITHDRAWAL',
]);
export const transactionStatusEnum = pgEnum('TransactionStatus', ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);
export const payoutStatusEnum = pgEnum('PayoutStatus', ['PENDING', 'PROCESSED', 'FAILED']);

// Notifications
export const notificationTypeEnum = pgEnum('NotificationType', [
  'AUCTION_WON',
  'AUCTION_OUTBID',
  'AUCTION_STARTING',
  'OFFER_RECEIVED',
  'OFFER_ACCEPTED',
  'OFFER_REJECTED',
  'PAYOUT_RECEIVED',
  'GAME_STARTING',
  'TEAM_WON',
  'TEAM_ELIMINATED',
  'POOL_INVITE',
]);

