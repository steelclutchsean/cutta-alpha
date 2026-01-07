import { z } from 'zod';

// Auth schemas
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(50),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Payout trigger enum with all triggers (including NFL)
export const payoutTriggerEnum = z.enum([
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
  // NFL-specific triggers
  'SUPER_BOWL_WIN',
  'CONFERENCE_CHAMPIONSHIP',
  'DIVISIONAL_ROUND',
  'WILD_CARD_WIN',
]);

// Auction mode enum
export const auctionModeEnum = z.enum(['TRADITIONAL', 'WHEEL_SPIN']);

// Pool schemas
export const createPoolSchema = z.object({
  name: z.string().min(3, 'Pool name must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  buyIn: z.number().min(0, 'Buy-in cannot be negative'),
  maxParticipants: z.number().min(2).max(1000).optional(),
  auctionStartTime: z.string().datetime().optional(), // Optional when autoStartAuction is true
  tournamentId: z.string().min(1, 'Tournament ID is required'), // CUIDs, not UUIDs
  secondaryMarketEnabled: z.boolean().default(true),
  auctionMode: auctionModeEnum.default('TRADITIONAL'),
  isPublic: z.boolean().default(false),
  autoStartAuction: z.boolean().default(false),
  auctionBudget: z.number().min(0).optional(), // Per-member budget (null = unlimited)
  budgetEnabled: z.boolean().default(false),
  payoutRules: z.array(z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    percentage: z.number().min(0).max(100),
    trigger: payoutTriggerEnum,
    triggerValue: z.string().optional(),
  })).optional(),
});

export const updatePoolSchema = createPoolSchema.partial();

export const joinPoolSchema = z.object({
  inviteCode: z.string().min(6).max(20),
});

// Payout rule schema
export const payoutRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  percentage: z.number().min(0).max(100),
  trigger: payoutTriggerEnum,
  triggerValue: z.string().optional(),
});

export const updatePayoutRulesSchema = z.object({
  rules: z.array(payoutRuleSchema),
});

// Auction schemas
export const placeBidSchema = z.object({
  auctionItemId: z.string().min(1),
  amount: z.number().min(1, 'Bid must be at least $1'),
});

// Market schemas
export const createListingSchema = z.object({
  ownershipId: z.string().min(1),
  percentageForSale: z.number().min(1).max(100),
  askingPrice: z.number().min(1, 'Price must be at least $1'),
  acceptingOffers: z.boolean().default(true),
  expiresInDays: z.number().min(1).max(30).optional(),
});

export const createOfferSchema = z.object({
  listingId: z.string().min(1),
  amount: z.number().min(1, 'Offer must be at least $1'),
});

export const respondToOfferSchema = z.object({
  action: z.enum(['accept', 'reject']),
});

// Payment schemas
export const addPaymentMethodSchema = z.object({
  paymentMethodId: z.string(), // Stripe payment method ID
  setAsDefault: z.boolean().default(false),
});

export const withdrawSchema = z.object({
  amount: z.number().min(10, 'Minimum withdrawal is $10'),
});

// Chat schemas
export const sendMessageSchema = z.object({
  poolId: z.string().min(1),
  content: z.string().min(1).max(1000),
});

export const sendReactionSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(10),
});

// Type exports
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreatePoolInput = z.infer<typeof createPoolSchema>;
export type UpdatePoolInput = z.infer<typeof updatePoolSchema>;
export type JoinPoolInput = z.infer<typeof joinPoolSchema>;
export type PayoutRuleInput = z.infer<typeof payoutRuleSchema>;
export type UpdatePayoutRulesInput = z.infer<typeof updatePayoutRulesSchema>;
export type PlaceBidInput = z.infer<typeof placeBidSchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type RespondToOfferInput = z.infer<typeof respondToOfferSchema>;
export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type SendReactionInput = z.infer<typeof sendReactionSchema>;
export type AuctionModeInput = z.infer<typeof auctionModeEnum>;
export type PayoutTriggerInput = z.infer<typeof payoutTriggerEnum>;

