export type TournamentStatus = 'upcoming' | 'in_progress' | 'completed';

export interface Tournament {
  id: string;
  name: string;
  year: number;
  sport: 'ncaa_basketball' | 'golf' | 'nfl' | 'other';
  status: TournamentStatus;
  startDate: Date;
  endDate: Date;
  externalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  shortName: string;
  seed: number | null;
  region: string | null;
  logoUrl: string | null;
  externalId: string | null;
  isEliminated: boolean;
  eliminatedRound: number | null;
  createdAt: Date;
}

export type GameStatus = 'scheduled' | 'in_progress' | 'final';

export interface Game {
  id: string;
  tournamentId: string;
  round: number;
  gameNumber: number;
  team1Id: string | null;
  team2Id: string | null;
  team1Score: number | null;
  team2Score: number | null;
  winnerId: string | null;
  status: GameStatus;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  externalId: string | null;
}

export interface TeamWithRecord extends Team {
  wins: number;
  losses: number;
  currentRound: number;
  nextGame: Game | null;
}

export const MARCH_MADNESS_ROUNDS = [
  { round: 0, name: 'First Four', teamsRemaining: 68 },
  { round: 1, name: 'Round of 64', teamsRemaining: 64 },
  { round: 2, name: 'Round of 32', teamsRemaining: 32 },
  { round: 3, name: 'Sweet 16', teamsRemaining: 16 },
  { round: 4, name: 'Elite Eight', teamsRemaining: 8 },
  { round: 5, name: 'Final Four', teamsRemaining: 4 },
  { round: 6, name: 'Championship', teamsRemaining: 2 },
] as const;

export const REGIONS = ['East', 'West', 'South', 'Midwest'] as const;
export type Region = typeof REGIONS[number];

