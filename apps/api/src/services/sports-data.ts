import { prisma, GameStatus, Sport } from '@cutta/db';
import { Server } from 'socket.io';
import { processPayout } from './payments.js';
import { syncNFLPlayoffScores, fetchNFLScoreboard, processESPNGame } from './espn-api.js';

// This integrates with ESPN API (free) for NFL and SportsData.io for other sports
const SPORTS_API_BASE = process.env.SPORTS_DATA_API_URL || 'https://api.sportsdata.io';
const SPORTS_API_KEY = process.env.SPORTS_DATA_API_KEY;
const ESPN_POLL_INTERVAL = parseInt(process.env.ESPN_POLL_INTERVAL || '30000', 10);
const ENABLE_LIVE_SCORES = process.env.ENABLE_LIVE_SCORES !== 'false';

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
    await processRoundPayouts(game.tournamentId, game.round, winnerId!, io, game.tournament.sport as Sport);
  }
}

/**
 * Process payouts for a completed round
 */
async function processRoundPayouts(
  tournamentId: string,
  round: number,
  winnerId: string,
  io: Server,
  sport?: Sport
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
    const payoutTrigger = getRoundPayoutTrigger(round, sport);
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
            `${rule.name} - Team advanced to ${getRoundName(round + 1, sport)}`,
            io
          );
        }
      }
    }
  }
}

/**
 * Get payout trigger for a round (handles both March Madness and NFL)
 */
function getRoundPayoutTrigger(round: number, sport?: Sport): string {
  // NFL Playoffs
  if (sport === Sport.NFL) {
    const nflTriggers: Record<number, string> = {
      1: 'WILD_CARD_WIN',
      2: 'DIVISIONAL_ROUND',
      3: 'CONFERENCE_CHAMPIONSHIP',
      4: 'SUPER_BOWL_WIN',
    };
    return nflTriggers[round] || 'CUSTOM';
  }
  
  // March Madness (default)
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
 * Get round name (handles both March Madness and NFL)
 */
function getRoundName(round: number, sport?: Sport): string {
  // NFL Playoffs
  if (sport === Sport.NFL) {
    const nflNames: Record<number, string> = {
      1: 'Wild Card',
      2: 'Divisional Round',
      3: 'Conference Championship',
      4: 'Super Bowl',
    };
    return nflNames[round] || `Round ${round}`;
  }
  
  // March Madness (default)
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
 * Start polling for live game updates (supports both ESPN for NFL and SportsData.io for others)
 */
export function startGamePolling(io: Server, intervalMs?: number): NodeJS.Timeout {
  const pollInterval = intervalMs || ESPN_POLL_INTERVAL;
  
  if (!ENABLE_LIVE_SCORES) {
    console.log('Live scores polling disabled');
    return setInterval(() => {}, pollInterval);
  }
  
  console.log(`Starting game polling with ${pollInterval}ms interval`);
  
  return setInterval(async () => {
    try {
      // Get active tournaments
      const tournaments = await prisma.tournament.findMany({
        where: { status: 'IN_PROGRESS' },
      });

      for (const tournament of tournaments) {
        // Use ESPN for NFL tournaments
        if (tournament.sport === Sport.NFL) {
          console.log(`Polling ESPN for NFL tournament: ${tournament.name}`);
          const result = await syncNFLPlayoffScores();
          
          if (result.updated > 0) {
            console.log(`ESPN sync: ${result.updated} games updated`);
            
            // Check for completed games and process payouts
            const completedGames = await prisma.game.findMany({
              where: {
                tournamentId: tournament.id,
                status: 'FINAL',
                winnerId: { not: null },
              },
              include: {
                tournament: true,
              },
            });
            
            for (const game of completedGames) {
              // Check if payout was already processed
              const existingPayout = await prisma.payoutLog.findFirst({
                where: {
                  gameId: game.id,
                },
              });
              
              if (!existingPayout && game.winnerId) {
                await processRoundPayoutsForGame(game, io);
              }
            }
          }
        } else if (tournament.externalId) {
          // Use SportsData.io for other sports
          const updates = await fetchLiveGames(tournament.externalId);
          for (const update of updates) {
            await processGameUpdate(update, io);
          }
        }
      }
    } catch (error) {
      console.error('Error polling games:', error);
    }
  }, pollInterval);
}

/**
 * Process payouts for a specific completed game
 */
export async function processRoundPayoutsForGame(
  game: {
    id: string;
    tournamentId: string;
    round: number;
    winnerId: string | null;
    tournament: { sport: Sport | string };
  },
  io: Server
): Promise<void> {
  if (!game.winnerId) return;
  
  await processRoundPayouts(
    game.tournamentId,
    game.round,
    game.winnerId,
    io,
    game.tournament.sport as Sport
  );
  
  // Log that payout was processed
  await prisma.payoutLog.create({
    data: {
      gameId: game.id,
      processedAt: new Date(),
    },
  });
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

