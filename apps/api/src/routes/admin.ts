import { Router } from 'express';
import { prisma, GameStatus, Sport } from '@cutta/db';
import { authenticate } from '../middleware/auth.js';
import { updateGameResult, processRoundPayoutsForGame } from '../services/sports-data.js';
import { syncNFLPlayoffScores } from '../services/espn-api.js';

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
  
  const membership = await prisma.poolMember.findUnique({
    where: {
      poolId_userId: {
        poolId,
        userId: req.user!.id,
      },
    },
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
    
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        tournament: {
          include: {
            pools: {
              where: {
                commissionerId: req.user!.id,
              },
            },
          },
        },
      },
    });
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Only allow commissioners of pools using this tournament to update
    if (game.tournament.pools.length === 0) {
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
    
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        tournament: {
          include: {
            pools: {
              where: {
                commissionerId: req.user!.id,
              },
            },
          },
        },
      },
    });
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.tournament.pools.length === 0) {
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
 * Get all games for a tournament (admin view with scores)
 * GET /admin/tournaments/:tournamentId/games
 */
adminRouter.get('/tournaments/:tournamentId/games', async (req, res, next) => {
  try {
    const { tournamentId } = req.params;
    
    const games = await prisma.game.findMany({
      where: { tournamentId },
      include: {
        team1: {
          select: { id: true, name: true, shortName: true, logoUrl: true },
        },
        team2: {
          select: { id: true, name: true, shortName: true, logoUrl: true },
        },
        winner: {
          select: { id: true, name: true, shortName: true },
        },
      },
      orderBy: [{ round: 'asc' }, { gameNumber: 'asc' }],
    });
    
    res.json(games);
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
    
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        tournament: {
          include: {
            pools: {
              where: {
                commissionerId: req.user!.id,
              },
            },
          },
        },
      },
    });
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    if (team.tournament.pools.length === 0) {
      return res.status(403).json({ error: 'No permission to update this team' });
    }
    
    await prisma.team.update({
      where: { id: teamId },
      data: {
        isEliminated: true,
        eliminatedRound: round || 1,
      },
    });
    
    // Broadcast elimination
    const io = req.app.get('io');
    for (const pool of team.tournament.pools) {
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
    
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        tournament: {
          include: {
            pools: {
              where: {
                commissionerId: req.user!.id,
              },
            },
          },
        },
      },
    });
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.tournament.pools.length === 0) {
      return res.status(403).json({ error: 'No permission to reset this game' });
    }
    
    // Reset game
    await prisma.game.update({
      where: { id: gameId },
      data: {
        team1Score: null,
        team2Score: null,
        status: 'SCHEDULED',
        winnerId: null,
        startedAt: null,
        completedAt: null,
      },
    });
    
    // Delete payout log if exists
    await prisma.payoutLog.deleteMany({
      where: { gameId },
    });
    
    // Reset eliminated status for both teams if they were marked eliminated in this round
    if (game.team1Id && game.team2Id) {
      await prisma.team.updateMany({
        where: {
          id: { in: [game.team1Id, game.team2Id] },
          eliminatedRound: game.round,
        },
        data: {
          isEliminated: false,
          eliminatedRound: null,
        },
      });
    }
    
    // Broadcast update
    const io = req.app.get('io');
    for (const pool of game.tournament.pools) {
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
    const existing = await prisma.tournament.findFirst({
      where: {
        sport: Sport.NFL,
        year: 2026,
      },
      include: {
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

