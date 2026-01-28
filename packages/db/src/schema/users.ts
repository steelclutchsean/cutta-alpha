import { pgTable, varchar, text, decimal, boolean, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { avatarTypeEnum } from './enums';

export const users = pgTable(
  'User',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    googleId: varchar('googleId', { length: 255 }).unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('passwordHash'),
    displayName: varchar('displayName', { length: 255 }).notNull(),
    avatarUrl: text('avatarUrl'),
    avatarType: avatarTypeEnum('avatarType').default('CUSTOM').notNull(),
    presetAvatarId: varchar('presetAvatarId', { length: 50 }),
    phone: varchar('phone', { length: 50 }),
    balance: decimal('balance', { precision: 12, scale: 2 }).default('0').notNull(),
    kycVerified: boolean('kycVerified').default(false).notNull(),
    stripeCustomerId: varchar('stripeCustomerId', { length: 255 }).unique(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    emailIdx: index('User_email_idx').on(table.email),
    googleIdIdx: index('User_googleId_idx').on(table.googleId),
    stripeCustomerIdIdx: index('User_stripeCustomerId_idx').on(table.stripeCustomerId),
  })
);

export const paymentMethods = pgTable(
  'PaymentMethod',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    userId: varchar('userId', { length: 30 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    stripePaymentMethodId: varchar('stripePaymentMethodId', { length: 255 }).notNull().unique(),
    last4: varchar('last4', { length: 4 }).notNull(),
    brand: varchar('brand', { length: 50 }).notNull(),
    expiryMonth: integer('expiryMonth').notNull(),
    expiryYear: integer('expiryYear').notNull(),
    isDefault: boolean('isDefault').default(false).notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('PaymentMethod_userId_idx').on(table.userId),
  })
);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;

