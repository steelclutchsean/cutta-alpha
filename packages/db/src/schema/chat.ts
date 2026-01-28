import { pgTable, varchar, text, boolean, timestamp, json, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { notificationTypeEnum } from './enums';
import { pools } from './pools';
import { users } from './users';

export const chatMessages = pgTable(
  'ChatMessage',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    poolId: varchar('poolId', { length: 30 }).notNull().references(() => pools.id, { onDelete: 'cascade' }),
    userId: varchar('userId', { length: 30 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    reactions: json('reactions').default({}).notNull(),
    isDeleted: boolean('isDeleted').default(false).notNull(),
    deletedBy: varchar('deletedBy', { length: 30 }),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    poolCreatedAtIdx: index('ChatMessage_poolId_createdAt_idx').on(table.poolId, table.createdAt),
  })
);

export const notifications = pgTable(
  'Notification',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    userId: varchar('userId', { length: 30 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    data: json('data'),
    read: boolean('read').default(false).notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    userReadIdx: index('Notification_userId_read_idx').on(table.userId, table.read),
    createdAtIdx: index('Notification_createdAt_idx').on(table.createdAt),
  })
);

// Type exports
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

