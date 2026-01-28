import { pgTable, varchar, decimal, boolean, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { auctionItemStatusEnum } from './enums';
import { pools } from './pools';
import { teams } from './tournaments';
import { users } from './users';

export const auctionItems = pgTable(
  'AuctionItem',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    poolId: varchar('poolId', { length: 30 }).notNull().references(() => pools.id, { onDelete: 'cascade' }),
    teamId: varchar('teamId', { length: 30 }).notNull().references(() => teams.id),
    status: auctionItemStatusEnum('status').default('PENDING').notNull(),
    startingBid: decimal('startingBid', { precision: 10, scale: 2 }).default('1').notNull(),
    currentBid: decimal('currentBid', { precision: 10, scale: 2 }),
    currentBidderId: varchar('currentBidderId', { length: 30 }),
    winningBid: decimal('winningBid', { precision: 10, scale: 2 }),
    winnerId: varchar('winnerId', { length: 30 }),
    order: integer('order').notNull(),
    auctionedAt: timestamp('auctionedAt', { mode: 'date' }),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    poolTeamUnique: uniqueIndex('AuctionItem_poolId_teamId_key').on(table.poolId, table.teamId),
    poolStatusIdx: index('AuctionItem_poolId_status_idx').on(table.poolId, table.status),
    teamIdIdx: index('AuctionItem_teamId_idx').on(table.teamId),
  })
);

export const bids = pgTable(
  'Bid',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    auctionItemId: varchar('auctionItemId', { length: 30 }).notNull().references(() => auctionItems.id, { onDelete: 'cascade' }),
    userId: varchar('userId', { length: 30 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    isWinning: boolean('isWinning').default(false).notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    auctionItemIdIdx: index('Bid_auctionItemId_idx').on(table.auctionItemId),
    userIdIdx: index('Bid_userId_idx').on(table.userId),
  })
);

// Type exports
export type AuctionItem = typeof auctionItems.$inferSelect;
export type NewAuctionItem = typeof auctionItems.$inferInsert;
export type Bid = typeof bids.$inferSelect;
export type NewBid = typeof bids.$inferInsert;

