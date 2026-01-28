import { pgTable, varchar, text, decimal, boolean, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { auctionModeEnum, poolStatusEnum, poolRoleEnum, payoutTriggerEnum } from './enums';
import { users } from './users';
import { tournaments } from './tournaments';

export const pools = pgTable(
  'Pool',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    commissionerId: varchar('commissionerId', { length: 30 }).notNull().references(() => users.id),
    status: poolStatusEnum('status').default('DRAFT').notNull(),
    buyIn: decimal('buyIn', { precision: 10, scale: 2 }).notNull(),
    totalPot: decimal('totalPot', { precision: 12, scale: 2 }).default('0').notNull(),
    maxParticipants: integer('maxParticipants'),
    auctionStartTime: timestamp('auctionStartTime', { mode: 'date' }).notNull(),
    tournamentId: varchar('tournamentId', { length: 30 }).notNull().references(() => tournaments.id),
    inviteCode: varchar('inviteCode', { length: 20 }).notNull().unique(),
    streamEnabled: boolean('streamEnabled').default(false).notNull(),
    livekitRoom: varchar('livekitRoom', { length: 255 }),
    externalStreamUrl: text('externalStreamUrl'),
    secondaryMarketEnabled: boolean('secondaryMarketEnabled').default(true).notNull(),
    auctionMode: auctionModeEnum('auctionMode').default('TRADITIONAL').notNull(),
    isPublic: boolean('isPublic').default(false).notNull(),
    autoStartAuction: boolean('autoStartAuction').default(false).notNull(),
    auctionBudget: decimal('auctionBudget', { precision: 12, scale: 2 }),
    budgetEnabled: boolean('budgetEnabled').default(false).notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    commissionerIdIdx: index('Pool_commissionerId_idx').on(table.commissionerId),
    statusIdx: index('Pool_status_idx').on(table.status),
    inviteCodeIdx: index('Pool_inviteCode_idx').on(table.inviteCode),
    isPublicStatusIdx: index('Pool_isPublic_status_idx').on(table.isPublic, table.status),
  })
);

export const poolMembers = pgTable(
  'PoolMember',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    poolId: varchar('poolId', { length: 30 }).notNull().references(() => pools.id, { onDelete: 'cascade' }),
    userId: varchar('userId', { length: 30 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: poolRoleEnum('role').default('MEMBER').notNull(),
    totalSpent: decimal('totalSpent', { precision: 12, scale: 2 }).default('0').notNull(),
    totalWinnings: decimal('totalWinnings', { precision: 12, scale: 2 }).default('0').notNull(),
    remainingBudget: decimal('remainingBudget', { precision: 12, scale: 2 }),
    isMuted: boolean('isMuted').default(false).notNull(),
    mutedUntil: timestamp('mutedUntil', { mode: 'date' }),
    joinedAt: timestamp('joinedAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    poolUserUnique: uniqueIndex('PoolMember_poolId_userId_key').on(table.poolId, table.userId),
    userIdIdx: index('PoolMember_userId_idx').on(table.userId),
  })
);

export const payoutRules = pgTable(
  'PayoutRule',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    poolId: varchar('poolId', { length: 30 }).notNull().references(() => pools.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    percentage: decimal('percentage', { precision: 5, scale: 2 }).notNull(),
    trigger: payoutTriggerEnum('trigger').notNull(),
    triggerValue: varchar('triggerValue', { length: 255 }),
    order: integer('order').notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    poolIdIdx: index('PayoutRule_poolId_idx').on(table.poolId),
  })
);

export const deletedPools = pgTable(
  'DeletedPool',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    originalPoolId: varchar('originalPoolId', { length: 30 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    commissionerId: varchar('commissionerId', { length: 30 }).notNull().references(() => users.id),
    deletedStatus: poolStatusEnum('deletedStatus').notNull(),
    buyIn: decimal('buyIn', { precision: 10, scale: 2 }).notNull(),
    totalPot: decimal('totalPot', { precision: 12, scale: 2 }).default('0').notNull(),
    maxParticipants: integer('maxParticipants'),
    auctionStartTime: timestamp('auctionStartTime', { mode: 'date' }).notNull(),
    tournamentId: varchar('tournamentId', { length: 30 }).notNull(),
    tournamentName: varchar('tournamentName', { length: 255 }).notNull(),
    tournamentYear: integer('tournamentYear').notNull(),
    memberCount: integer('memberCount').default(0).notNull(),
    auctionMode: auctionModeEnum('auctionMode').default('TRADITIONAL').notNull(),
    isPublic: boolean('isPublic').default(false).notNull(),
    deletedAt: timestamp('deletedAt', { mode: 'date' }).defaultNow().notNull(),
    deletionReason: text('deletionReason'),
  },
  (table) => ({
    commissionerIdIdx: index('DeletedPool_commissionerId_idx').on(table.commissionerId),
    deletedAtIdx: index('DeletedPool_deletedAt_idx').on(table.deletedAt),
  })
);

// Type exports
export type Pool = typeof pools.$inferSelect;
export type NewPool = typeof pools.$inferInsert;
export type PoolMember = typeof poolMembers.$inferSelect;
export type NewPoolMember = typeof poolMembers.$inferInsert;
export type PayoutRule = typeof payoutRules.$inferSelect;
export type NewPayoutRule = typeof payoutRules.$inferInsert;
export type DeletedPool = typeof deletedPools.$inferSelect;
export type NewDeletedPool = typeof deletedPools.$inferInsert;

