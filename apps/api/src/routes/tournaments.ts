import { Router } from 'express';
import { prisma } from '@cutta/db';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';

export const tournamentsRouter = Router();

// Get all tournaments
tournamentsRouter.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { status, sport, year } = req.query;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (sport) {
      where.sport = sport;
    }

    if (year) {
      where.year = parseInt(year as string, 10);
    }

    const tournaments = await prisma.tournament.findMany({
      where,
      include: {
        _count: {
          select: { teams: true, pools: true },
        },
      },
      orderBy: [{ year: 'desc' }, { startDate: 'asc' }],
    });

    res.json(
      tournaments.map((t) => ({
        ...t,
        teamCount: t._count.teams,
        poolCount: t._count.pools,
      }))
    );
  } catch (error) {
    next(error);
  }
});

// Get single tournament
tournamentsRouter.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        teams: {
          orderBy: [{ region: 'asc' }, { seed: 'asc' }],
        },
        _count: {
          select: { teams: true, pools: true, games: true },
        },
      },
    });

    if (!tournament) {
      throw new AppError(404, 'Tournament not found', 'NOT_FOUND');
    }

    res.json({
      ...tournament,
      teamCount: tournament._count.teams,
      poolCount: tournament._count.pools,
      gameCount: tournament._count.games,
    });
  } catch (error) {
    next(error);
  }
});

// Get tournament teams
tournamentsRouter.get('/:id/teams', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { region, eliminated } = req.query;

    const where: Record<string, unknown> = {
      tournamentId: id,
    };

    if (region) {
      where.region = region;
    }

    if (eliminated !== undefined) {
      where.isEliminated = eliminated === 'true';
    }

    const teams = await prisma.team.findMany({
      where,
      orderBy: [{ region: 'asc' }, { seed: 'asc' }],
    });

    res.json(teams);
  } catch (error) {
    next(error);
  }
});

// Get tournament games
tournamentsRouter.get('/:id/games', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { round, status } = req.query;

    const where: Record<string, unknown> = {
      tournamentId: id,
    };

    if (round) {
      where.round = parseInt(round as string, 10);
    }

    if (status) {
      where.status = status;
    }

    const games = await prisma.game.findMany({
      where,
      include: {
        team1: true,
        team2: true,
        winner: true,
      },
      orderBy: [{ round: 'asc' }, { scheduledAt: 'asc' }],
    });

    res.json(games);
  } catch (error) {
    next(error);
  }
});

// Get tournament bracket
tournamentsRouter.get('/:id/bracket', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [teams, games] = await Promise.all([
      prisma.team.findMany({
        where: { tournamentId: id },
        orderBy: [{ region: 'asc' }, { seed: 'asc' }],
      }),
      prisma.game.findMany({
        where: { tournamentId: id },
        include: {
          team1: true,
          team2: true,
          winner: true,
        },
        orderBy: [{ round: 'asc' }, { gameNumber: 'asc' }],
      }),
    ]);

    // Group by region and round
    const regions = ['East', 'West', 'South', 'Midwest'];
    const bracket: Record<string, Record<number, unknown[]>> = {};

    for (const region of regions) {
      bracket[region] = {};
      const regionTeams = teams.filter((t) => t.region === region);
      const regionGames = games.filter(
        (g) =>
          g.round <= 4 && // Regional rounds only
          (regionTeams.some((t) => t.id === g.team1Id) ||
            regionTeams.some((t) => t.id === g.team2Id))
      );

      for (let round = 1; round <= 4; round++) {
        bracket[region][round] = regionGames.filter((g) => g.round === round);
      }
    }

    // Final Four and Championship
    bracket['FinalFour'] = {
      5: games.filter((g) => g.round === 5),
      6: games.filter((g) => g.round === 6),
    };

    res.json({
      teams,
      games,
      bracket,
    });
  } catch (error) {
    next(error);
  }
});

// Get tournament standings (teams by performance)
tournamentsRouter.get('/:id/standings', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const teams = await prisma.team.findMany({
      where: { tournamentId: id },
      include: {
        wonGames: true,
      },
      orderBy: [{ isEliminated: 'asc' }, { eliminatedRound: 'desc' }],
    });

    const standings = teams.map((team) => ({
      ...team,
      wins: team.wonGames.length,
      currentRound: team.isEliminated
        ? team.eliminatedRound
        : Math.max(...team.wonGames.map((g) => g.round), 0) + 1,
    }));

    // Sort by current round (higher = better), then by seed
    standings.sort((a, b) => {
      if (a.currentRound !== b.currentRound) {
        return (b.currentRound || 0) - (a.currentRound || 0);
      }
      return (a.seed || 99) - (b.seed || 99);
    });

    res.json(standings);
  } catch (error) {
    next(error);
  }
});

// Admin: Update game result (would be automated via sports data API)
tournamentsRouter.put('/:tournamentId/games/:gameId', authenticate, async (req, res, next) => {
  try {
    const { tournamentId, gameId } = req.params;
    const { team1Score, team2Score, status, winnerId } = req.body;

    // In production, this would be admin-only or automated
    const game = await prisma.game.update({
      where: { id: gameId },
      data: {
        team1Score,
        team2Score,
        status,
        winnerId,
        ...(status === 'FINAL' && { completedAt: new Date() }),
        ...(status === 'IN_PROGRESS' && !req.body.startedAt && { startedAt: new Date() }),
      },
      include: {
        team1: true,
        team2: true,
        winner: true,
      },
    });

    // If game is final, update losing team as eliminated
    if (status === 'FINAL' && winnerId) {
      const loserId = winnerId === game.team1Id ? game.team2Id : game.team1Id;
      if (loserId) {
        await prisma.team.update({
          where: { id: loserId },
          data: {
            isEliminated: true,
            eliminatedRound: game.round,
          },
        });
      }
    }

    res.json(game);
  } catch (error) {
    next(error);
  }
});

