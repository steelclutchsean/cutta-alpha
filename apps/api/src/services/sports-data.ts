import { prisma, GameStatus } from '@cutta/db';
import { Server } from 'socket.io';
import { processPayout } from './payments.js';

// This would integrate with a real sports data API like ESPN, SportsRadar, etc.
// For MVP, we'll implement the interface and provide mock/manual functionality

const SPORTS_API_BASE = process.env.SPORTS_DATA_API_URL || 'https://api.sportsdata.io';
const SPORTS_API_KEY = process.env.SPORTS_DATA_API_KEY;

interface GameUpdate {
  externalId: string;
  team1Score: number;
  team2Score: number;
  status: 'scheduled' | 'in_progress' | 'final';
  winnerId?: string;
}

/**
 * Fetch live game updates from sports data API
 */
export async function fetchLiveGames(tournamentExternalId: string): Promise<GameUpdate[]> {
  if (!SPORTS_API_KEY) {
    console.warn('Sports Data API key not configured');
    return [];
  }

  try {
    const response = await fetch(
      `${SPORTS_API_BASE}/v3/cbb/scores/json/GamesByDate/${new Date().toISOString().split('T')[0]}`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': SPORTS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const games = await response.json();

    // Transform to our format
    return games.map((game: any) => ({
      externalId: game.GameID.toString(),
      team1Score: game.HomeTeamScore || 0,
      team2Score: game.AwayTeamScore || 0,
      status: game.Status === 'Final' ? 'final' : game.Status === 'InProgress' ? 'in_progress' : 'scheduled',
      winnerId: game.Status === 'Final' ? (game.HomeTeamScore > game.AwayTeamScore ? game.HomeTeam : game.AwayTeam) : undefined,
    }));
  } catch (error) {
    console.error('Error fetching live games:', error);
    return [];
  }
}

/**
 * Process game update and trigger payouts if needed
 */
export async function processGameUpdate(
  gameUpdate: GameUpdate,
  io: Server
): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { externalId: gameUpdate.externalId },
    include: {
      team1: true,
      team2: true,
      tournament: {
        include: {
          pools: {
            where: {
              status: { in: ['IN_PROGRESS', 'LIVE'] },
            },
          },
        },
      },
    },
  });

  if (!game) {
    console.log(`Game not found: ${gameUpdate.externalId}`);
    return;
  }

  // Update game scores
  await prisma.game.update({
    where: { id: game.id },
    data: {
      team1Score: gameUpdate.team1Score,
      team2Score: gameUpdate.team2Score,
      status: gameUpdate.status.toUpperCase() as GameStatus,
      ...(gameUpdate.status === 'in_progress' && !game.startedAt && { startedAt: new Date() }),
      ...(gameUpdate.status === 'final' && { completedAt: new Date() }),
    },
  });

  // Broadcast game update to all pool rooms
  for (const pool of game.tournament.pools) {
    io.to(`pool:${pool.id}`).emit('gameUpdate', {
      gameId: game.id,
      team1Score: gameUpdate.team1Score,
      team2Score: gameUpdate.team2Score,
      status: gameUpdate.status,
    });
  }

  // If game is final, process eliminations and payouts
  if (gameUpdate.status === 'final') {
    const winnerId = gameUpdate.team1Score > gameUpdate.team2Score ? game.team1Id : game.team2Id;
    const loserId = winnerId === game.team1Id ? game.team2Id : game.team1Id;

    if (loserId) {
      // Mark team as eliminated
      await prisma.team.update({
        where: { id: loserId },
        data: {
          isEliminated: true,
          eliminatedRound: game.round,
        },
      });

      // Broadcast elimination
      for (const pool of game.tournament.pools) {
        io.to(`pool:${pool.id}`).emit('teamEliminated', {
          teamId: loserId,
          eliminatedRound: game.round,
        });
      }
    }

    // Process payouts based on round
    await processRoundPayouts(game.tournamentId, game.round, winnerId!, io);
  }
}

/**
 * Process payouts for a completed round
 */
async function processRoundPayouts(
  tournamentId: string,
  round: number,
  winnerId: string,
  io: Server
): Promise<void> {
  // Get all pools for this tournament
  const pools = await prisma.pool.findMany({
    where: {
      tournamentId,
      status: { in: ['IN_PROGRESS', 'LIVE'] },
    },
    include: {
      payoutRules: true,
      auctionItems: {
        where: { teamId: winnerId },
        include: {
          ownerships: true,
        },
      },
    },
  });

  for (const pool of pools) {
    // Get applicable payout rules for this round
    const payoutTrigger = getRoundPayoutTrigger(round);
    const rules = pool.payoutRules.filter((r) => r.trigger === payoutTrigger);

    if (rules.length === 0) continue;

    // Calculate payout amount
    const totalPot = Number(pool.totalPot);

    for (const rule of rules) {
      const payoutAmount = (totalPot * Number(rule.percentage)) / 100;

      // Find ownership for the winning team
      const auctionItem = pool.auctionItems[0];
      if (!auctionItem) continue;

      for (const ownership of auctionItem.ownerships) {
        // Payout proportional to ownership percentage
        const ownerPayout = (payoutAmount * Number(ownership.percentage)) / 100;

        if (ownerPayout > 0) {
          await processPayout(
            pool.id,
            ownership.userId,
            ownerPayout,
            `${rule.name} - Team advanced to ${getRoundName(round + 1)}`,
            io
          );
        }
      }
    }
  }
}

/**
 * Get payout trigger for a round
 */
function getRoundPayoutTrigger(round: number): string {
  const triggers: Record<number, string> = {
    1: 'ROUND_OF_64',
    2: 'ROUND_OF_32',
    3: 'SWEET_SIXTEEN',
    4: 'ELITE_EIGHT',
    5: 'FINAL_FOUR',
    6: 'CHAMPIONSHIP_WIN',
  };
  return triggers[round] || 'CUSTOM';
}

/**
 * Get round name
 */
function getRoundName(round: number): string {
  const names: Record<number, string> = {
    0: 'First Four',
    1: 'Round of 64',
    2: 'Round of 32',
    3: 'Sweet 16',
    4: 'Elite Eight',
    5: 'Final Four',
    6: 'Championship',
    7: 'Champion',
  };
  return names[round] || `Round ${round}`;
}

/**
 * Start polling for live game updates
 */
export function startGamePolling(io: Server, intervalMs = 30000): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      // Get active tournaments
      const tournaments = await prisma.tournament.findMany({
        where: { status: 'IN_PROGRESS' },
      });

      for (const tournament of tournaments) {
        if (tournament.externalId) {
          const updates = await fetchLiveGames(tournament.externalId);
          for (const update of updates) {
            await processGameUpdate(update, io);
          }
        }
      }
    } catch (error) {
      console.error('Error polling games:', error);
    }
  }, intervalMs);
}

/**
 * Manually update game result (for testing/admin)
 */
export async function updateGameResult(
  gameId: string,
  team1Score: number,
  team2Score: number,
  isFinal: boolean,
  io: Server
): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      team1: true,
      team2: true,
    },
  });

  if (!game) {
    throw new Error('Game not found');
  }

  const status: GameStatus = isFinal ? 'FINAL' : team1Score > 0 || team2Score > 0 ? 'IN_PROGRESS' : 'SCHEDULED';
  const winnerId = isFinal
    ? team1Score > team2Score
      ? game.team1Id
      : game.team2Id
    : null;

  await prisma.game.update({
    where: { id: gameId },
    data: {
      team1Score,
      team2Score,
      status,
      winnerId,
      ...(status === 'IN_PROGRESS' && !game.startedAt && { startedAt: new Date() }),
      ...(status === 'FINAL' && { completedAt: new Date() }),
    },
  });

  if (game.externalId) {
    await processGameUpdate(
      {
        externalId: game.externalId,
        team1Score,
        team2Score,
        status: status.toLowerCase() as 'scheduled' | 'in_progress' | 'final',
        winnerId: winnerId || undefined,
      },
      io
    );
  }
}

