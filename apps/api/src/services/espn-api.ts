/**
 * ESPN API Service
 * 
 * Free, unofficial ESPN API endpoints for live NFL scores and game data.
 * These endpoints are publicly accessible and don't require authentication.
 */

import { db, eq, and, or, games, teams, tournaments } from '@cutta/db';

const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

type GameStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';

export interface ESPNTeam {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  logo?: string;
  score?: string;
}

export interface ESPNCompetitor {
  id: string;
  homeAway: 'home' | 'away';
  team: ESPNTeam;
  score: string;
  winner?: boolean;
}

export interface ESPNGame {
  id: string;
  date: string;
  name: string;
  shortName: string;
  status: {
    type: {
      id: string;
      name: string; // 'STATUS_SCHEDULED' | 'STATUS_IN_PROGRESS' | 'STATUS_FINAL' | etc.
      state: string; // 'pre' | 'in' | 'post'
      completed: boolean;
    };
    displayClock?: string;
    period?: number;
  };
  competitions: Array<{
    id: string;
    competitors: ESPNCompetitor[];
    status: {
      type: {
        name: string;
        state: string;
        completed: boolean;
      };
    };
  }>;
  season?: {
    type: number; // 3 = postseason
  };
  week?: {
    number: number;
  };
}

export interface ESPNScoreboardResponse {
  events: ESPNGame[];
  week?: {
    number: number;
    text: string;
  };
  season?: {
    type: number;
    year: number;
  };
}

/**
 * Fetch current NFL scoreboard from ESPN
 */
export async function fetchNFLScoreboard(): Promise<ESPNGame[]> {
  try {
    const response = await fetch(`${ESPN_BASE_URL}/scoreboard`);
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    const data = await response.json() as ESPNScoreboardResponse;
    return data.events || [];
  } catch (error) {
    console.error('Error fetching ESPN NFL scoreboard:', error);
    return [];
  }
}

/**
 * Fetch specific game details from ESPN
 */
export async function fetchGameDetails(espnGameId: string): Promise<ESPNGame | null> {
  try {
    const response = await fetch(`${ESPN_BASE_URL}/summary?event=${espnGameId}`);
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    const data = await response.json() as { header?: { competitions?: ESPNGame[] } };
    return data.header?.competitions?.[0] || null;
  } catch (error) {
    console.error(`Error fetching ESPN game ${espnGameId}:`, error);
    return null;
  }
}

/**
 * Map ESPN game status to our GameStatus enum
 */
export function mapESPNStatus(espnStatus: ESPNGame['status']): GameStatus {
  const state = espnStatus.type.state;
  const completed = espnStatus.type.completed;
  
  if (completed || state === 'post') {
    return 'FINAL';
  } else if (state === 'in') {
    return 'IN_PROGRESS';
  }
  return 'SCHEDULED';
}

/**
 * Map ESPN team abbreviation to our team shortName
 * ESPN uses standard NFL abbreviations which match ours
 */
const ESPN_TEAM_MAPPING: Record<string, string> = {
  // AFC Teams (2026 Playoffs)
  'KC': 'KC',     // Kansas City Chiefs
  'NE': 'NE',     // New England Patriots
  'PIT': 'PIT',   // Pittsburgh Steelers
  'HOU': 'HOU',   // Houston Texans
  'BUF': 'BUF',   // Buffalo Bills
  'JAX': 'JAX',   // Jacksonville Jaguars
  'LAC': 'LAC',   // Los Angeles Chargers
  // NFC Teams (2026 Playoffs)
  'DET': 'DET',   // Detroit Lions
  'PHI': 'PHI',   // Philadelphia Eagles
  'CAR': 'CAR',   // Carolina Panthers
  'CHI': 'CHI',   // Chicago Bears
  'GB': 'GB',     // Green Bay Packers
  'SF': 'SF',     // San Francisco 49ers
  'LA': 'LAR',    // Los Angeles Rams (ESPN uses 'LA' sometimes)
  'LAR': 'LAR',   // Los Angeles Rams (alternative)
};

/**
 * Find our internal team by ESPN abbreviation
 */
export async function findTeamByESPNAbbreviation(
  tournamentId: string,
  espnAbbr: string
): Promise<string | null> {
  const ourAbbr = ESPN_TEAM_MAPPING[espnAbbr] || espnAbbr;
  
  const team = await db.query.teams.findFirst({
    where: and(eq(teams.tournamentId, tournamentId), eq(teams.shortName, ourAbbr)),
  });
  
  return team?.id || null;
}

/**
 * Process ESPN game and update our database
 */
export async function processESPNGame(
  espnGame: ESPNGame,
  tournamentId: string
): Promise<{
  updated: boolean;
  gameId?: string;
  status?: GameStatus;
  homeScore?: number;
  awayScore?: number;
  winnerId?: string | null;
}> {
  const competition = espnGame.competitions[0];
  if (!competition) return { updated: false };
  
  const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home');
  const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away');
  
  if (!homeCompetitor || !awayCompetitor) return { updated: false };
  
  const homeTeamId = await findTeamByESPNAbbreviation(
    tournamentId,
    homeCompetitor.team.abbreviation
  );
  const awayTeamId = await findTeamByESPNAbbreviation(
    tournamentId,
    awayCompetitor.team.abbreviation
  );
  
  if (!homeTeamId || !awayTeamId) {
    console.log(`Teams not found for ESPN game ${espnGame.id}: ${homeCompetitor.team.abbreviation} vs ${awayCompetitor.team.abbreviation}`);
    return { updated: false };
  }
  
  // Find our game by the teams
  const game = await db.query.games.findFirst({
    where: and(
      eq(games.tournamentId, tournamentId),
      or(
        and(eq(games.team1Id, homeTeamId), eq(games.team2Id, awayTeamId)),
        and(eq(games.team1Id, awayTeamId), eq(games.team2Id, homeTeamId))
      )
    ),
  });
  
  if (!game) {
    console.log(`Game not found in database for ESPN game ${espnGame.id}`);
    return { updated: false };
  }
  
  const newStatus = mapESPNStatus(espnGame.status);
  const homeScore = parseInt(homeCompetitor.score) || 0;
  const awayScore = parseInt(awayCompetitor.score) || 0;
  
  // Determine winner if game is final
  let winnerId: string | null = null;
  if (newStatus === 'FINAL') {
    if (homeScore > awayScore) {
      winnerId = homeTeamId;
    } else if (awayScore > homeScore) {
      winnerId = awayTeamId;
    }
  }
  
  // Check if anything changed
  const needsUpdate = 
    game.status !== newStatus ||
    game.team1Score !== homeScore ||
    game.team2Score !== awayScore ||
    (newStatus === 'FINAL' && game.winnerId !== winnerId);
  
  if (!needsUpdate) {
    return { updated: false, gameId: game.id };
  }
  
  // Determine which team is home in our database
  const isTeam1Home = game.team1Id === homeTeamId;
  const team1Score = isTeam1Home ? homeScore : awayScore;
  const team2Score = isTeam1Home ? awayScore : homeScore;
  
  // Update the game
  await db.update(games)
    .set({
      team1Score,
      team2Score,
      status: newStatus,
      winnerId,
      ...(newStatus === 'IN_PROGRESS' && !game.startedAt && { startedAt: new Date() }),
      ...(newStatus === 'FINAL' && !game.completedAt && { completedAt: new Date() }),
      // Store ESPN game ID for future reference
      externalId: game.externalId || `espn-${espnGame.id}`,
    })
    .where(eq(games.id, game.id));
  
  console.log(`Updated game ${game.id}: ${team1Score}-${team2Score} (${newStatus})`);
  
  return {
    updated: true,
    gameId: game.id,
    status: newStatus,
    homeScore,
    awayScore,
    winnerId,
  };
}

/**
 * Fetch and process all current NFL playoff games
 */
export async function syncNFLPlayoffScores(): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  const results = {
    processed: 0,
    updated: 0,
    errors: 0,
  };
  
  try {
    // Find active NFL tournament
    const tournament = await db.query.tournaments.findFirst({
      where: and(eq(tournaments.sport, 'NFL'), eq(tournaments.status, 'IN_PROGRESS')),
    });
    
    if (!tournament) {
      console.log('No active NFL tournament found');
      return results;
    }
    
    // Fetch ESPN scoreboard
    const espnGames = await fetchNFLScoreboard();
    
    // Filter for playoff games (postseason)
    const playoffGames = espnGames.filter(g => 
      g.season?.type === 3 || // Postseason
      g.week?.number === 18 || // Could be Wild Card week
      g.week?.number === 19 || // Divisional
      g.week?.number === 20 || // Conference Championships
      g.week?.number === 21    // Super Bowl
    );
    
    console.log(`Found ${playoffGames.length} potential playoff games from ESPN`);
    
    for (const espnGame of playoffGames) {
      try {
        const result = await processESPNGame(espnGame, tournament.id);
        results.processed++;
        if (result.updated) {
          results.updated++;
        }
      } catch (error) {
        console.error(`Error processing ESPN game ${espnGame.id}:`, error);
        results.errors++;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error syncing NFL playoff scores:', error);
    results.errors++;
    return results;
  }
}

/**
 * Get NFL playoff bracket/standings from ESPN
 */
export async function fetchNFLPlayoffBracket(): Promise<any> {
  try {
    const response = await fetch(`${ESPN_BASE_URL}/scoreboard?seasontype=3`);
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching NFL playoff bracket:', error);
    return null;
  }
}
