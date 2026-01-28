import { Router } from 'express';
import { db, eq, and, asc, desc, count, inArray, tournaments, teams, games, pools } from '@cutta/db';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import {
  discoverEvents,
  fetchEventTeams,
  getAvailableYears,
  SPORT_DISPLAY_NAMES,
  SPORT_EVENTS,
  ESPN_SPORTS,
  getTeamLogoUrl,
} from '../services/espn-events.js';

export const tournamentsRouter = Router();

// Supported sports for the event picker
const SUPPORTED_SPORTS = Object.keys(ESPN_SPORTS);

// ============================================
// ESPN Event Discovery Endpoints
// ============================================

/**
 * Get available sports for event picker
 * GET /tournaments/events/sports
 */
tournamentsRouter.get('/events/sports', optionalAuth, async (req, res, next) => {
  try {
    const sports = SUPPORTED_SPORTS.map(sport => ({
      id: sport,
      name: SPORT_DISPLAY_NAMES[sport] || sport,
      events: SPORT_EVENTS[sport] || [],
    }));

    res.json({
      sports,
      availableYears: getAvailableYears(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Discover available events from ESPN
 * GET /tournaments/events/discover
 * Query params: sport, year
 */
tournamentsRouter.get('/events/discover', optionalAuth, async (req, res, next) => {
  try {
    const { sport, year } = req.query;

    if (!sport || typeof sport !== 'string') {
      throw new AppError(400, 'Sport parameter is required', 'INVALID_PARAMS');
    }

    if (!SUPPORTED_SPORTS.includes(sport)) {
      throw new AppError(400, `Unsupported sport: ${sport}. Supported: ${SUPPORTED_SPORTS.join(', ')}`, 'INVALID_SPORT');
    }

    const yearNum = year ? parseInt(year as string, 10) : new Date().getFullYear();
    const availableYears = getAvailableYears();

    if (!availableYears.includes(yearNum)) {
      throw new AppError(400, `Year ${yearNum} is not available. Available years: ${availableYears.join(', ')}`, 'INVALID_YEAR');
    }

    // Check if tournament already exists in DB
    const existingTournament = await db.query.tournaments.findFirst({
      where: and(
        eq(tournaments.sport, sport as any),
        eq(tournaments.year, yearNum)
      ),
    });

    // Fetch discovered events from ESPN
    const events = await discoverEvents(sport, yearNum);

    // Add team counts from DB if tournament exists
    const eventsWithDbInfo = await Promise.all(events.map(async (event) => {
      if (existingTournament) {
        const [teamCount] = await db.select({ count: count() })
          .from(teams)
          .where(eq(teams.tournamentId, existingTournament.id));

        return {
          ...event,
          tournamentId: existingTournament.id,
          dbTeamCount: teamCount?.count || 0,
          existsInDb: true,
        };
      }
      return {
        ...event,
        tournamentId: null,
        dbTeamCount: 0,
        existsInDb: false,
      };
    }));

    res.json({
      sport,
      sportName: SPORT_DISPLAY_NAMES[sport],
      year: yearNum,
      events: eventsWithDbInfo,
      availableYears,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Preview teams for an event from ESPN (without creating)
 * GET /tournaments/events/preview
 * Query params: sport, year, eventId
 */
tournamentsRouter.get('/events/preview', optionalAuth, async (req, res, next) => {
  try {
    const { sport, year, eventId } = req.query;

    if (!sport || typeof sport !== 'string') {
      throw new AppError(400, 'Sport parameter is required', 'INVALID_PARAMS');
    }

    const yearNum = year ? parseInt(year as string, 10) : new Date().getFullYear();

    // Fetch teams from ESPN
    const espnTeams = await fetchEventTeams(sport, yearNum, eventId as string);

    res.json({
      sport,
      year: yearNum,
      eventId,
      teamCount: espnTeams.length,
      teams: espnTeams.slice(0, 50), // Limit preview to 50 teams
      hasMore: espnTeams.length > 50,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create a tournament from ESPN event data
 * POST /tournaments/events/create
 * Body: { sport, year, eventId, eventName }
 */
tournamentsRouter.post('/events/create', authenticate, async (req, res, next) => {
  try {
    const { sport, year, eventId, eventName } = req.body;

    if (!sport || !year) {
      throw new AppError(400, 'Sport and year are required', 'INVALID_PARAMS');
    }

    if (!SUPPORTED_SPORTS.includes(sport)) {
      throw new AppError(400, `Unsupported sport: ${sport}`, 'INVALID_SPORT');
    }

    const yearNum = parseInt(year, 10);
    const availableYears = getAvailableYears();

    if (!availableYears.includes(yearNum)) {
      throw new AppError(400, `Year ${yearNum} is not available`, 'INVALID_YEAR');
    }

    // Check if tournament already exists
    let tournament = await db.query.tournaments.findFirst({
      where: and(
        eq(tournaments.sport, sport as any),
        eq(tournaments.year, yearNum)
      ),
    });

    if (tournament) {
      // Return existing tournament with team count
      const [teamCount] = await db.select({ count: count() })
        .from(teams)
        .where(eq(teams.tournamentId, tournament.id));

      return res.json({
        tournament: {
          ...tournament,
          teamCount: teamCount?.count || 0,
        },
        created: false,
        message: 'Tournament already exists',
      });
    }

    // Fetch teams from ESPN
    const espnTeams = await fetchEventTeams(sport, yearNum, eventId);

    if (espnTeams.length === 0) {
      throw new AppError(400, 'No teams found for this event', 'NO_TEAMS_FOUND');
    }

    // Determine tournament dates based on sport
    const sportDates = getTournamentDates(sport, yearNum);

    // Create tournament
    const now = new Date();
    const tournamentName = eventName || `${SPORT_DISPLAY_NAMES[sport]} ${yearNum}`;
    
    const [newTournament] = await db.insert(tournaments)
      .values({
        name: tournamentName.replace(` ${yearNum}`, ''), // Remove year from name (it's stored separately)
        year: yearNum,
        sport: sport as any,
        status: sportDates.status,
        startDate: new Date(sportDates.startDate),
        endDate: new Date(sportDates.endDate),
        externalId: `${sport.toLowerCase()}-${eventId || 'playoffs'}-${yearNum}`,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Create teams
    const teamInserts = espnTeams.map((team, index) => ({
      tournamentId: newTournament.id,
      name: team.name,
      shortName: team.shortName,
      seed: team.seed || index + 1,
      region: team.conference || getRegionForSport(sport, index),
      logoUrl: team.logoUrl || getTeamLogoUrl(sport, team.id, team.abbreviation),
      externalId: team.id,
      createdAt: now,
    }));

    await db.insert(teams).values(teamInserts);

    res.json({
      tournament: {
        ...newTournament,
        teamCount: espnTeams.length,
      },
      created: true,
      message: `Created ${tournamentName} with ${espnTeams.length} teams`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper: Get tournament dates based on sport and year
 */
function getTournamentDates(sport: string, year: number): { startDate: string; endDate: string; status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let startDate: string;
  let endDate: string;
  let status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' = 'COMPLETED';

  switch (sport) {
    case 'NCAA_BASKETBALL':
      startDate = `${year}-03-15`;
      endDate = `${year}-04-08`;
      if (year > currentYear || (year === currentYear && currentMonth < 3)) {
        status = 'UPCOMING';
      } else if (year === currentYear && currentMonth >= 3 && currentMonth <= 4) {
        status = 'IN_PROGRESS';
      }
      break;
    case 'NFL':
      startDate = `${year}-01-10`;
      endDate = `${year}-02-12`;
      if (year > currentYear || (year === currentYear && currentMonth < 1)) {
        status = 'UPCOMING';
      } else if (year === currentYear && currentMonth <= 2) {
        status = 'IN_PROGRESS';
      }
      break;
    case 'NBA':
      startDate = `${year}-04-15`;
      endDate = `${year}-06-20`;
      if (year > currentYear || (year === currentYear && currentMonth < 4)) {
        status = 'UPCOMING';
      } else if (year === currentYear && currentMonth >= 4 && currentMonth <= 6) {
        status = 'IN_PROGRESS';
      }
      break;
    case 'NHL':
      startDate = `${year}-04-15`;
      endDate = `${year}-06-25`;
      if (year > currentYear || (year === currentYear && currentMonth < 4)) {
        status = 'UPCOMING';
      } else if (year === currentYear && currentMonth >= 4 && currentMonth <= 6) {
        status = 'IN_PROGRESS';
      }
      break;
    case 'MLB':
      startDate = `${year}-10-01`;
      endDate = `${year}-11-05`;
      if (year > currentYear || (year === currentYear && currentMonth < 10)) {
        status = 'UPCOMING';
      } else if (year === currentYear && currentMonth >= 10 && currentMonth <= 11) {
        status = 'IN_PROGRESS';
      }
      break;
    case 'TENNIS':
      // Default to US Open timing for generic tennis
      startDate = `${year}-01-15`;
      endDate = `${year}-09-15`;
      if (year > currentYear) {
        status = 'UPCOMING';
      } else if (year === currentYear) {
        status = 'IN_PROGRESS';
      }
      break;
    default:
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
  }

  return { startDate, endDate, status };
}

/**
 * Helper: Get region/conference for team based on sport
 */
function getRegionForSport(sport: string, index: number): string {
  switch (sport) {
    case 'NCAA_BASKETBALL':
      const regions = ['East', 'West', 'South', 'Midwest'];
      return regions[Math.floor(index / 16) % 4];
    case 'NFL':
    case 'NBA':
    case 'NHL':
      return index < 7 ? 'AFC' : 'NFC'; // NFL
      // For NBA/NHL it would be Eastern/Western
    case 'MLB':
      return index < 6 ? 'AL' : 'NL';
    default:
      return 'Main';
  }
}

// ============================================
// Standard Tournament CRUD Endpoints
// ============================================

// Get all tournaments
tournamentsRouter.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { status, sport, year } = req.query;

    const allTournaments = await db.query.tournaments.findMany({
      orderBy: [desc(tournaments.year), asc(tournaments.startDate)],
    });

    // Filter by query params
    let filtered = allTournaments;
    if (status) {
      filtered = filtered.filter((t) => t.status === status);
    }
    if (sport) {
      filtered = filtered.filter((t) => t.sport === sport);
    }
    if (year) {
      filtered = filtered.filter((t) => t.year === parseInt(year as string, 10));
    }

    // Get counts for each tournament
    const tournamentIds = filtered.map((t) => t.id);
    
    const teamCounts = tournamentIds.length > 0 ? await db.select({
      tournamentId: teams.tournamentId,
      count: count(),
    })
      .from(teams)
      .where(inArray(teams.tournamentId, tournamentIds))
      .groupBy(teams.tournamentId) : [];

    const poolCounts = tournamentIds.length > 0 ? await db.select({
      tournamentId: pools.tournamentId,
      count: count(),
    })
      .from(pools)
      .where(inArray(pools.tournamentId, tournamentIds))
      .groupBy(pools.tournamentId) : [];

    const teamCountMap = new Map(teamCounts.map((c) => [c.tournamentId, c.count]));
    const poolCountMap = new Map(poolCounts.map((c) => [c.tournamentId, c.count]));

    const response = filtered.map((t) => ({
      ...t,
      teamCount: teamCountMap.get(t.id) || 0,
      poolCount: poolCountMap.get(t.id) || 0,
    }));

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get single tournament
tournamentsRouter.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, id),
      with: {
        teams: {
          orderBy: [asc(teams.region), asc(teams.seed)],
        },
      },
    });

    if (!tournament) {
      throw new AppError(404, 'Tournament not found', 'NOT_FOUND');
    }

    // Get counts
    const [teamCount] = await db.select({ count: count() })
      .from(teams)
      .where(eq(teams.tournamentId, id));
    const [poolCount] = await db.select({ count: count() })
      .from(pools)
      .where(eq(pools.tournamentId, id));
    const [gameCount] = await db.select({ count: count() })
      .from(games)
      .where(eq(games.tournamentId, id));

    res.json({
      ...tournament,
      teamCount: teamCount?.count || 0,
      poolCount: poolCount?.count || 0,
      gameCount: gameCount?.count || 0,
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

    const tournamentTeams = await db.query.teams.findMany({
      where: eq(teams.tournamentId, id),
      orderBy: [asc(teams.region), asc(teams.seed)],
    });

    let filtered = tournamentTeams;
    if (region) {
      filtered = filtered.filter((t) => t.region === region);
    }
    if (eliminated !== undefined) {
      filtered = filtered.filter((t) => t.isEliminated === (eliminated === 'true'));
    }

    res.json(filtered);
  } catch (error) {
    next(error);
  }
});

// Get tournament games
tournamentsRouter.get('/:id/games', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { round, status } = req.query;

    const tournamentGames = await db.query.games.findMany({
      where: eq(games.tournamentId, id),
      with: {
        team1: true,
        team2: true,
        winner: true,
      },
      orderBy: [asc(games.round), asc(games.scheduledAt)],
    });

    let filtered = tournamentGames;
    if (round) {
      filtered = filtered.filter((g) => g.round === parseInt(round as string, 10));
    }
    if (status) {
      filtered = filtered.filter((g) => g.status === status);
    }

    res.json(filtered);
  } catch (error) {
    next(error);
  }
});

// Get tournament bracket
tournamentsRouter.get('/:id/bracket', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [tournamentTeams, tournamentGames] = await Promise.all([
      db.query.teams.findMany({
        where: eq(teams.tournamentId, id),
        orderBy: [asc(teams.region), asc(teams.seed)],
      }),
      db.query.games.findMany({
        where: eq(games.tournamentId, id),
        with: {
          team1: true,
          team2: true,
          winner: true,
        },
        orderBy: [asc(games.round), asc(games.gameNumber)],
      }),
    ]);

    // Group by region and round
    const regions = ['East', 'West', 'South', 'Midwest'];
    const bracket: Record<string, Record<number, unknown[]>> = {};

    for (const region of regions) {
      bracket[region] = {};
      const regionTeams = tournamentTeams.filter((t) => t.region === region);
      const regionGames = tournamentGames.filter(
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
      5: tournamentGames.filter((g) => g.round === 5),
      6: tournamentGames.filter((g) => g.round === 6),
    };

    res.json({
      teams: tournamentTeams,
      games: tournamentGames,
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

    const tournamentTeams = await db.query.teams.findMany({
      where: eq(teams.tournamentId, id),
      with: {
        wonGames: true,
      },
      orderBy: [asc(teams.isEliminated), desc(teams.eliminatedRound)],
    });

    const standings = tournamentTeams.map((team) => ({
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
    const [game] = await db.update(games)
      .set({
        team1Score,
        team2Score,
        status,
        winnerId,
        ...(status === 'FINAL' && { completedAt: new Date() }),
        ...(status === 'IN_PROGRESS' && !req.body.startedAt && { startedAt: new Date() }),
      })
      .where(eq(games.id, gameId))
      .returning();

    const updatedGame = await db.query.games.findFirst({
      where: eq(games.id, gameId),
      with: {
        team1: true,
        team2: true,
        winner: true,
      },
    });

    // If game is final, update losing team as eliminated
    if (status === 'FINAL' && winnerId) {
      const loserId = winnerId === game.team1Id ? game.team2Id : game.team1Id;
      if (loserId) {
        await db.update(teams)
          .set({
            isEliminated: true,
            eliminatedRound: game.round,
          })
          .where(eq(teams.id, loserId));
      }
    }

    res.json(updatedGame);
  } catch (error) {
    next(error);
  }
});
