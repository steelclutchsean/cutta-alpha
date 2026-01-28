import { pgTable, varchar, decimal, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { transactionTypeEnum, transactionStatusEnum, payoutStatusEnum } from './enums';
import { users } from './users';
import { listings } from './market';
import { pools } from './pools';

export const transactions = pgTable(
  'Transaction',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    type: transactionTypeEnum('type').notNull(),
    buyerId: varchar('buyerId', { length: 30 }).references(() => users.id),
    sellerId: varchar('sellerId', { length: 30 }).references(() => users.id),
    listingId: varchar('listingId', { length: 30 }).references(() => listings.id),
    auctionItemId: varchar('auctionItemId', { length: 30 }),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    platformFee: decimal('platformFee', { precision: 10, scale: 2 }).default('0').notNull(),
    netAmount: decimal('netAmount', { precision: 12, scale: 2 }).notNull(),
    stripePaymentIntentId: varchar('stripePaymentIntentId', { length: 255 }).unique(),
    status: transactionStatusEnum('status').default('PENDING').notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    buyerIdIdx: index('Transaction_buyerId_idx').on(table.buyerId),
    sellerIdIdx: index('Transaction_sellerId_idx').on(table.sellerId),
    statusIdx: index('Transaction_status_idx').on(table.status),
    typeIdx: index('Transaction_type_idx').on(table.type),
  })
);

export const payouts = pgTable(
  'Payout',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    poolId: varchar('poolId', { length: 30 }).notNull().references(() => pools.id, { onDelete: 'cascade' }),
    userId: varchar('userId', { length: 30 }).notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    reason: varchar('reason', { length: 500 }).notNull(),
    triggerId: varchar('triggerId', { length: 30 }),
    status: payoutStatusEnum('status').default('PENDING').notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    poolIdIdx: index('Payout_poolId_idx').on(table.poolId),
    userIdIdx: index('Payout_userId_idx').on(table.userId),
    statusIdx: index('Payout_status_idx').on(table.status),
  })
);

export const payoutLogs = pgTable(
  'PayoutLog',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    gameId: varchar('gameId', { length: 30 }).notNull().unique(),
    processedAt: timestamp('processedAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    gameIdIdx: index('PayoutLog_gameId_idx').on(table.gameId),
  })
);

// Type exports
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Payout = typeof payouts.$inferSelect;
export type NewPayout = typeof payouts.$inferInsert;
export type PayoutLog = typeof payoutLogs.$inferSelect;
export type NewPayoutLog = typeof payoutLogs.$inferInsert;

