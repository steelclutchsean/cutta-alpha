import { pgTable, varchar, decimal, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { ownershipSourceEnum, listingStatusEnum, offerStatusEnum } from './enums';
import { users } from './users';
import { auctionItems } from './auctions';

export const ownerships = pgTable(
  'Ownership',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    userId: varchar('userId', { length: 30 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    auctionItemId: varchar('auctionItemId', { length: 30 }).notNull().references(() => auctionItems.id, { onDelete: 'cascade' }),
    percentage: decimal('percentage', { precision: 5, scale: 2 }).notNull(),
    purchasePrice: decimal('purchasePrice', { precision: 10, scale: 2 }).notNull(),
    source: ownershipSourceEnum('source').notNull(),
    acquiredAt: timestamp('acquiredAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('Ownership_userId_idx').on(table.userId),
    auctionItemIdIdx: index('Ownership_auctionItemId_idx').on(table.auctionItemId),
  })
);

export const listings = pgTable(
  'Listing',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    ownershipId: varchar('ownershipId', { length: 30 }).notNull().references(() => ownerships.id, { onDelete: 'cascade' }),
    sellerId: varchar('sellerId', { length: 30 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    percentageForSale: decimal('percentageForSale', { precision: 5, scale: 2 }).notNull(),
    askingPrice: decimal('askingPrice', { precision: 10, scale: 2 }).notNull(),
    acceptingOffers: boolean('acceptingOffers').default(true).notNull(),
    status: listingStatusEnum('status').default('ACTIVE').notNull(),
    expiresAt: timestamp('expiresAt', { mode: 'date' }),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    sellerIdIdx: index('Listing_sellerId_idx').on(table.sellerId),
    statusIdx: index('Listing_status_idx').on(table.status),
  })
);

export const offers = pgTable(
  'Offer',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    listingId: varchar('listingId', { length: 30 }).notNull().references(() => listings.id, { onDelete: 'cascade' }),
    buyerId: varchar('buyerId', { length: 30 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    status: offerStatusEnum('status').default('PENDING').notNull(),
    expiresAt: timestamp('expiresAt', { mode: 'date' }).notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    listingIdIdx: index('Offer_listingId_idx').on(table.listingId),
    buyerIdIdx: index('Offer_buyerId_idx').on(table.buyerId),
    statusIdx: index('Offer_status_idx').on(table.status),
  })
);

// Type exports
export type Ownership = typeof ownerships.$inferSelect;
export type NewOwnership = typeof ownerships.$inferInsert;
export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;

