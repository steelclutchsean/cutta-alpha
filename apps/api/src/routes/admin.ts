import { Router } from 'express';
import { db, eq, and, inArray, asc, pools, poolMembers, games, teams, tournaments, payoutLogs } from '@cutta/db';
import { authenticate } from '../middleware/auth.js';
import { updateGameResult, processRoundPayoutsForGame } from '../services/sports-data.js';
import { syncNFLPlayoffScores, fetchNFLPlayoffBracket } from '../services/espn-api.js';
import { syncMarchMadnessScores, fetchMarchMadnessBracket, fetchNCAATeams } from '../services/ncaa-api.js';

export const adminRouter = Router();

// All admin routes require authentication
adminRouter.use(authenticate);

/**
 * Middleware to check if user is a commissioner
 */
async function requireCommissioner(req: any, res: any, next: any) {
  const poolId = req.params.poolId || req.body.poolId;
  
  if (!poolId) {
    return res.status(400).json({ error: 'Pool ID required' });
  }
  
  const membership = await db.query.poolMembers.findFirst({
    where: and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, req.user!.id)),
  });
  
  if (!membership || membership.role !== 'COMMISSIONER') {
    return res.status(403).json({ error: 'Commissioner access required' });
  }
  
  next();
}

/**
 * Manually update a game result
 * POST /admin/games/:gameId/result
 */
adminRouter.post('/games/:gameId/result', async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const { team1Score, team2Score, isFinal } = req.body;
    
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
      with: {
        tournament: {
          with: {
            pools: true,
          },
        },
      },
    });
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Filter pools where user is commissioner
    const commissionedPools = game.tournament.pools.filter(p => p.commissionerId === req.user!.id);
    
    // Only allow commissioners of pools using this tournament to update
    if (commissionedPools.length === 0) {
      return res.status(403).json({ error: 'No permission to update this game' });
    }
    
    const io = req.app.get('io');
    await updateGameResult(gameId, team1Score, team2Score, isFinal, io);
    
    res.json({ success: true, message: 'Game result updated' });
  } catch (error) {
    next(error);
  }
});

/**
 * Manually trigger payout processing for a game
 * POST /admin/games/:gameId/process-payouts
 */
adminRouter.post('/games/:gameId/process-payouts', async (req, res, next) => {
  try {
    const { gameId } = req.params;
    
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
      with: {
        tournament: {
          with: {
            pools: true,
          },
        },
      },
    });
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Filter pools where user is commissioner
    const commissionedPools = game.tournament.pools.filter(p => p.commissionerId === req.user!.id);
    
    if (commissionedPools.length === 0) {
      return res.status(403).json({ error: 'No permission to process payouts for this game' });
    }
    
    if (game.status !== 'FINAL' || !game.winnerId) {
      return res.status(400).json({ error: 'Game must be final with a winner to process payouts' });
    }
    
    const io = req.app.get('io');
    await processRoundPayoutsForGame(
      {
        id: game.id,
        tournamentId: game.tournamentId,
        round: game.round,
        winnerId: game.winnerId,
        tournament: game.tournament,
      },
      io
    );
    
    res.json({ success: true, message: 'Payouts processed' });
  } catch (error) {
    next(error);
  }
});

/**
 * Manually sync NFL scores from ESPN
 * POST /admin/sync/nfl
 */
adminRouter.post('/sync/nfl', async (req, res, next) => {
  try {
    const result = await syncNFLPlayoffScores();
    
    res.json({
      success: true,
      processed: result.processed,
      updated: result.updated,
      errors: result.errors,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Manually sync NCAA Basketball (March Madness) scores from ESPN
 * POST /admin/sync/ncaa
 */
adminRouter.post('/sync/ncaa', async (req, res, next) => {
  try {
    const result = await syncMarchMadnessScores();
    
    res.json({
      success: true,
      processed: result.processed,
      updated: result.updated,
      errors: result.errors,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Sync tournament data from ESPN on-demand
 * POST /admin/tournaments/:tournamentId/sync
 * 
 * Automatically determines the sport type and syncs from the appropriate ESPN endpoint
 */
adminRouter.post('/tournaments/:tournamentId/sync', async (req, res, next) => {
  try {
    const { tournamentId } = req.params;
    
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId),
    });
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    let result: { processed: number; updated: number; errors: number };
    
    switch (tournament.sport) {
      case 'NFL':
        result = await syncNFLPlayoffScores();
        break;
      case 'NCAA_BASKETBALL':
        result = await syncMarchMadnessScores();
        break;
      default:
        return res.status(400).json({ 
          error: 'Unsupported sport type',
          sport: tournament.sport,
          supported: ['NFL', 'NCAA_BASKETBALL'],
        });
    }
    
    res.json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        sport: tournament.sport,
      },
      sync: {
        processed: result.processed,
        updated: result.updated,
        errors: result.errors,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Fetch live bracket data from ESPN (preview without updating database)
 * GET /admin/tournaments/:tournamentId/preview
 */
adminRouter.get('/tournaments/:tournamentId/preview', async (req, res, next) => {
  try {
    const { tournamentId } = req.params;
    
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId),
    });
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    let bracketData: any = null;
    
    switch (tournament.sport) {
      case 'NFL':
        bracketData = await fetchNFLPlayoffBracket();
        break;
      case 'NCAA_BASKETBALL':
        bracketData = await fetchMarchMadnessBracket(tournament.year);
        break;
      default:
        return res.status(400).json({ 
          error: 'Unsupported sport type',
          sport: tournament.sport,
        });
    }
    
    res.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        sport: tournament.sport,
        year: tournament.year,
      },
      espnData: bracketData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Fetch available NCAA teams from ESPN
 * GET /admin/ncaa/teams
 */
adminRouter.get('/ncaa/teams', async (req, res, next) => {
  try {
    const teams = await fetchNCAATeams();
    
    res.json({
      count: teams.length,
      teams: teams.map(t => ({
        id: t.id,
        name: t.displayName,
        abbreviation: t.abbreviation,
        logo: t.logos?.[0]?.href || null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all games for a tournament (admin view with scores)
 * GET /admin/tournaments/:tournamentId/games
 */
adminRouter.get('/tournaments/:tournamentId/games', async (req, res, next) => {
  try {
    const { tournamentId } = req.params;
    
    const tournamentGames = await db.query.games.findMany({
      where: eq(games.tournamentId, tournamentId),
      with: {
        team1: {
          columns: { id: true, name: true, shortName: true, logoUrl: true },
        },
        team2: {
          columns: { id: true, name: true, shortName: true, logoUrl: true },
        },
        winner: {
          columns: { id: true, name: true, shortName: true },
        },
      },
      orderBy: [asc(games.round), asc(games.gameNumber)],
    });
    
    res.json(tournamentGames);
  } catch (error) {
    next(error);
  }
});

/**
 * Mark a team as eliminated
 * POST /admin/teams/:teamId/eliminate
 */
adminRouter.post('/teams/:teamId/eliminate', async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { round } = req.body;
    
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        tournament: {
          with: {
            pools: true,
          },
        },
      },
    });
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Filter pools where user is commissioner
    const commissionedPools = team.tournament.pools.filter(p => p.commissionerId === req.user!.id);
    
    if (commissionedPools.length === 0) {
      return res.status(403).json({ error: 'No permission to update this team' });
    }
    
    await db.update(teams)
      .set({
        isEliminated: true,
        eliminatedRound: round || 1,
      })
      .where(eq(teams.id, teamId));
    
    // Broadcast elimination
    const io = req.app.get('io');
    for (const pool of commissionedPools) {
      io.to(`pool:${pool.id}`).emit('teamEliminated', {
        teamId,
        eliminatedRound: round || 1,
      });
    }
    
    res.json({ success: true, message: 'Team marked as eliminated' });
  } catch (error) {
    next(error);
  }
});

/**
 * Reset a game result (undo final score)
 * POST /admin/games/:gameId/reset
 */
adminRouter.post('/games/:gameId/reset', async (req, res, next) => {
  try {
    const { gameId } = req.params;
    
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
      with: {
        tournament: {
          with: {
            pools: true,
          },
        },
      },
    });
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Filter pools where user is commissioner
    const commissionedPools = game.tournament.pools.filter(p => p.commissionerId === req.user!.id);
    
    if (commissionedPools.length === 0) {
      return res.status(403).json({ error: 'No permission to reset this game' });
    }
    
    // Reset game
    await db.update(games)
      .set({
        team1Score: null,
        team2Score: null,
        status: 'SCHEDULED',
        winnerId: null,
        startedAt: null,
        completedAt: null,
      })
      .where(eq(games.id, gameId));
    
    // Delete payout log if exists
    await db.delete(payoutLogs).where(eq(payoutLogs.gameId, gameId));
    
    // Reset eliminated status for both teams if they were marked eliminated in this round
    if (game.team1Id && game.team2Id) {
      await db.update(teams)
        .set({
          isEliminated: false,
          eliminatedRound: null,
        })
        .where(and(
          inArray(teams.id, [game.team1Id, game.team2Id]),
          eq(teams.eliminatedRound, game.round)
        ));
    }
    
    // Broadcast update
    const io = req.app.get('io');
    for (const pool of commissionedPools) {
      io.to(`pool:${pool.id}`).emit('gameUpdate', {
        gameId,
        team1Score: null,
        team2Score: null,
        status: 'scheduled',
      });
    }
    
    res.json({ success: true, message: 'Game reset' });
  } catch (error) {
    next(error);
  }
});

/**
 * Get live score polling status
 * GET /admin/status/polling
 */
adminRouter.get('/status/polling', async (req, res) => {
  res.json({
    enabled: process.env.ENABLE_LIVE_SCORES !== 'false',
    pollInterval: parseInt(process.env.ESPN_POLL_INTERVAL || '30000', 10),
    provider: 'espn',
  });
});

/**
 * Re-seed NFL playoff data (creates tournament if needed, updates teams/games)
 * POST /admin/seed/nfl-playoffs
 * 
 * Note: For VPS deployment, run: pnpm --filter @cutta/db db:seed:nfl
 */
adminRouter.post('/seed/nfl-playoffs', async (req, res, next) => {
  try {
    // Check if NFL Playoffs tournament already exists
    const existing = await db.query.tournaments.findFirst({
      where: and(eq(tournaments.sport, 'NFL'), eq(tournaments.year, 2026)),
      with: {
        teams: true,
        games: true,
      },
    });
    
    if (existing) {
      res.json({ 
        success: true, 
        message: 'NFL Playoffs 2026 already exists',
        data: {
          tournamentId: existing.id,
          teams: existing.teams.length,
          games: existing.games.length,
        },
      });
      return;
    }
    
    // Tournament doesn't exist - provide instructions
    res.status(400).json({ 
      error: 'NFL Playoffs not seeded',
      message: 'Run: pnpm --filter @cutta/db db:seed:nfl',
      hint: 'This command must be run from the server CLI',
    });
  } catch (error) {
    next(error);
  }
});
