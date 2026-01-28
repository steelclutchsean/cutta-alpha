import { relations } from 'drizzle-orm';
import { users, paymentMethods } from './users';
import { tournaments, teams, games } from './tournaments';
import { pools, poolMembers, payoutRules, deletedPools } from './pools';
import { auctionItems, bids } from './auctions';
import { ownerships, listings, offers } from './market';
import { transactions, payouts } from './transactions';
import { chatMessages, notifications } from './chat';

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  paymentMethods: many(paymentMethods),
  poolMemberships: many(poolMembers),
  commissionedPools: many(pools),
  deletedPools: many(deletedPools),
  bids: many(bids),
  ownerships: many(ownerships),
  listings: many(listings),
  offers: many(offers),
  buyTransactions: many(transactions, { relationName: 'buyer' }),
  sellTransactions: many(transactions, { relationName: 'seller' }),
  chatMessages: many(chatMessages),
  notifications: many(notifications),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  user: one(users, {
    fields: [paymentMethods.userId],
    references: [users.id],
  }),
}));

// Tournament relations
export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  teams: many(teams),
  games: many(games),
  pools: many(pools),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [teams.tournamentId],
    references: [tournaments.id],
  }),
  auctionItems: many(auctionItems),
  homeGames: many(games, { relationName: 'homeTeam' }),
  awayGames: many(games, { relationName: 'awayTeam' }),
  wonGames: many(games, { relationName: 'winner' }),
}));

export const gamesRelations = relations(games, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [games.tournamentId],
    references: [tournaments.id],
  }),
  team1: one(teams, {
    fields: [games.team1Id],
    references: [teams.id],
    relationName: 'homeTeam',
  }),
  team2: one(teams, {
    fields: [games.team2Id],
    references: [teams.id],
    relationName: 'awayTeam',
  }),
  winner: one(teams, {
    fields: [games.winnerId],
    references: [teams.id],
    relationName: 'winner',
  }),
}));

// Pool relations
export const poolsRelations = relations(pools, ({ one, many }) => ({
  commissioner: one(users, {
    fields: [pools.commissionerId],
    references: [users.id],
  }),
  tournament: one(tournaments, {
    fields: [pools.tournamentId],
    references: [tournaments.id],
  }),
  members: many(poolMembers),
  auctionItems: many(auctionItems),
  payoutRules: many(payoutRules),
  chatMessages: many(chatMessages),
  payouts: many(payouts),
}));

export const poolMembersRelations = relations(poolMembers, ({ one }) => ({
  pool: one(pools, {
    fields: [poolMembers.poolId],
    references: [pools.id],
  }),
  user: one(users, {
    fields: [poolMembers.userId],
    references: [users.id],
  }),
}));

export const payoutRulesRelations = relations(payoutRules, ({ one }) => ({
  pool: one(pools, {
    fields: [payoutRules.poolId],
    references: [pools.id],
  }),
}));

export const deletedPoolsRelations = relations(deletedPools, ({ one }) => ({
  commissioner: one(users, {
    fields: [deletedPools.commissionerId],
    references: [users.id],
  }),
}));

// Auction relations
export const auctionItemsRelations = relations(auctionItems, ({ one, many }) => ({
  pool: one(pools, {
    fields: [auctionItems.poolId],
    references: [pools.id],
  }),
  team: one(teams, {
    fields: [auctionItems.teamId],
    references: [teams.id],
  }),
  bids: many(bids),
  ownerships: many(ownerships),
}));

export const bidsRelations = relations(bids, ({ one }) => ({
  auctionItem: one(auctionItems, {
    fields: [bids.auctionItemId],
    references: [auctionItems.id],
  }),
  user: one(users, {
    fields: [bids.userId],
    references: [users.id],
  }),
}));

// Market relations
export const ownershipsRelations = relations(ownerships, ({ one, many }) => ({
  user: one(users, {
    fields: [ownerships.userId],
    references: [users.id],
  }),
  auctionItem: one(auctionItems, {
    fields: [ownerships.auctionItemId],
    references: [auctionItems.id],
  }),
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  ownership: one(ownerships, {
    fields: [listings.ownershipId],
    references: [ownerships.id],
  }),
  seller: one(users, {
    fields: [listings.sellerId],
    references: [users.id],
  }),
  offers: many(offers),
  transactions: many(transactions),
}));

export const offersRelations = relations(offers, ({ one }) => ({
  listing: one(listings, {
    fields: [offers.listingId],
    references: [listings.id],
  }),
  buyer: one(users, {
    fields: [offers.buyerId],
    references: [users.id],
  }),
}));

// Transaction relations
export const transactionsRelations = relations(transactions, ({ one }) => ({
  buyer: one(users, {
    fields: [transactions.buyerId],
    references: [users.id],
    relationName: 'buyer',
  }),
  seller: one(users, {
    fields: [transactions.sellerId],
    references: [users.id],
    relationName: 'seller',
  }),
  listing: one(listings, {
    fields: [transactions.listingId],
    references: [listings.id],
  }),
}));

export const payoutsRelations = relations(payouts, ({ one }) => ({
  pool: one(pools, {
    fields: [payouts.poolId],
    references: [pools.id],
  }),
}));

// Chat relations
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  pool: one(pools, {
    fields: [chatMessages.poolId],
    references: [pools.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

