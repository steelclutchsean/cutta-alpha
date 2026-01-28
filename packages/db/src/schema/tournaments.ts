import { pgTable, varchar, text, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { sportEnum, tournamentStatusEnum, gameStatusEnum } from './enums';

export const tournaments = pgTable(
  'Tournament',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    name: varchar('name', { length: 255 }).notNull(),
    year: integer('year').notNull(),
    sport: sportEnum('sport').notNull(),
    status: tournamentStatusEnum('status').default('UPCOMING').notNull(),
    startDate: timestamp('startDate', { mode: 'date' }).notNull(),
    endDate: timestamp('endDate', { mode: 'date' }).notNull(),
    externalId: varchar('externalId', { length: 255 }).unique(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    nameYearUnique: uniqueIndex('Tournament_name_year_key').on(table.name, table.year),
    statusIdx: index('Tournament_status_idx').on(table.status),
  })
);

export const teams = pgTable(
  'Team',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    tournamentId: varchar('tournamentId', { length: 30 }).notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    shortName: varchar('shortName', { length: 50 }).notNull(),
    seed: integer('seed'),
    region: varchar('region', { length: 100 }),
    logoUrl: text('logoUrl'),
    externalId: varchar('externalId', { length: 255 }),
    isEliminated: boolean('isEliminated').default(false).notNull(),
    eliminatedRound: integer('eliminatedRound'),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    tournamentExternalIdUnique: uniqueIndex('Team_tournamentId_externalId_key').on(table.tournamentId, table.externalId),
    tournamentIdIdx: index('Team_tournamentId_idx').on(table.tournamentId),
    regionIdx: index('Team_region_idx').on(table.region),
  })
);

export const games = pgTable(
  'Game',
  {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId()),
    tournamentId: varchar('tournamentId', { length: 30 }).notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
    round: integer('round').notNull(),
    gameNumber: integer('gameNumber').notNull(),
    team1Id: varchar('team1Id', { length: 30 }).references(() => teams.id),
    team2Id: varchar('team2Id', { length: 30 }).references(() => teams.id),
    team1Score: integer('team1Score'),
    team2Score: integer('team2Score'),
    winnerId: varchar('winnerId', { length: 30 }).references(() => teams.id),
    status: gameStatusEnum('status').default('SCHEDULED').notNull(),
    scheduledAt: timestamp('scheduledAt', { mode: 'date' }).notNull(),
    startedAt: timestamp('startedAt', { mode: 'date' }),
    completedAt: timestamp('completedAt', { mode: 'date' }),
    externalId: varchar('externalId', { length: 255 }).unique(),
    matchupBrief: text('matchupBrief'),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    tournamentRoundIdx: index('Game_tournamentId_round_idx').on(table.tournamentId, table.round),
    statusIdx: index('Game_status_idx').on(table.status),
  })
);

// Type exports
export type Tournament = typeof tournaments.$inferSelect;
export type NewTournament = typeof tournaments.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

