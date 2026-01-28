/**
 * ESPN NCAA Basketball API Service
 * 
 * Free, unofficial ESPN API endpoints for live March Madness scores and game data.
 * These endpoints are publicly accessible and don't require authentication.
 */

import { db, eq, and, or, games, teams, tournaments } from '@cutta/db';

const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball';

type GameStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';

export interface ESPNNCAATeam {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  logo?: string;
  score?: string;
  seed?: string;
}

export interface ESPNNCAACompetitor {
  id: string;
  homeAway: 'home' | 'away';
  team: ESPNNCAATeam;
  score: string;
  winner?: boolean;
  curatedRank?: {
    current: number;
  };
}

export interface ESPNNCAAGame {
  id: string;
  uid: string;
  date: string;
  name: string;
  shortName: string;
  status: {
    type: {
      id: string;
      name: string;
      state: string; // 'pre' | 'in' | 'post'
      completed: boolean;
    };
    displayClock?: string;
    period?: number;
  };
  competitions: Array<{
    id: string;
    competitors: ESPNNCAACompetitor[];
    status: {
      type: {
        name: string;
        state: string;
        completed: boolean;
      };
    };
    notes?: Array<{
      type: string;
      headline: string;
    }>;
  }>;
  season?: {
    type: number; // 3 = postseason (March Madness)
    year: number;
  };
}

export interface ESPNNCAATeamInfo {
  id: string;
  uid: string;
  slug: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  name: string;
  nickname: string;
  location: string;
  color?: string;
  alternateColor?: string;
  logos?: Array<{
    href: string;
    width: number;
    height: number;
  }>;
}

export interface ESPNNCAAScoreboardResponse {
  events: ESPNNCAAGame[];
  season?: {
    type: number;
    year: number;
  };
}

export interface ESPNNCAATeamsResponse {
  sports: Array<{
    leagues: Array<{
      teams: Array<{
        team: ESPNNCAATeamInfo;
      }>;
    }>;
  }>;
}

export interface ESPNNCAABracketResponse {
  events: ESPNNCAAGame[];
  season: {
    type: number;
    year: number;
  };
}

/**
 * Fetch current NCAA Basketball scoreboard from ESPN
 */
export async function fetchNCAAScoreboard(date?: string): Promise<ESPNNCAAGame[]> {
  try {
    let url = `${ESPN_BASE_URL}/scoreboard`;
    if (date) {
      url += `?dates=${date}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    const data = await response.json() as ESPNNCAAScoreboardResponse;
    return data.events || [];
  } catch (error) {
    console.error('Error fetching ESPN NCAA scoreboard:', error);
    return [];
  }
}

/**
 * Fetch March Madness tournament games from ESPN
 * Uses seasontype=3 for postseason games
 */
export async function fetchMarchMadnessGames(year?: number): Promise<ESPNNCAAGame[]> {
  try {
    const seasonYear = year || new Date().getFullYear();
    const response = await fetch(
      `${ESPN_BASE_URL}/scoreboard?seasontype=3&dates=${seasonYear}0301-${seasonYear}0410`
    );
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    const data = await response.json() as ESPNNCAAScoreboardResponse;
    return data.events || [];
  } catch (error) {
    console.error('Error fetching March Madness games:', error);
    return [];
  }
}

/**
 * Fetch all NCAA basketball teams from ESPN
 */
export async function fetchNCAATeams(): Promise<ESPNNCAATeamInfo[]> {
  try {
    const response = await fetch(`${ESPN_BASE_URL}/teams?limit=400`);
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    const data = await response.json() as ESPNNCAATeamsResponse;
    const teams = data.sports?.[0]?.leagues?.[0]?.teams || [];
    return teams.map(t => t.team);
  } catch (error) {
    console.error('Error fetching NCAA teams:', error);
    return [];
  }
}

/**
 * Fetch specific game details from ESPN
 */
export async function fetchNCAAGameDetails(espnGameId: string): Promise<ESPNNCAAGame | null> {
  try {
    const response = await fetch(`${ESPN_BASE_URL}/summary?event=${espnGameId}`);
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    const data = await response.json() as { header?: { competitions?: ESPNNCAAGame[] } };
    return data.header?.competitions?.[0] || null;
  } catch (error) {
    console.error(`Error fetching ESPN NCAA game ${espnGameId}:`, error);
    return null;
  }
}

/**
 * Fetch current NCAA basketball rankings (AP Top 25, etc.)
 */
export async function fetchNCAABracketRankings(): Promise<any> {
  try {
    const response = await fetch(`${ESPN_BASE_URL}/rankings`);
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching NCAA rankings:', error);
    return null;
  }
}

/**
 * Map ESPN game status to our GameStatus enum
 */
export function mapESPNNCAAStatus(espnStatus: ESPNNCAAGame['status']): GameStatus {
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
 * Find our internal team by ESPN team ID or abbreviation
 */
export async function findNCAATeamByESPN(
  tournamentId: string,
  espnTeamId: string,
  espnAbbr?: string
): Promise<string | null> {
  // First try by external ID
  let team = await db.query.teams.findFirst({
    where: and(
      eq(teams.tournamentId, tournamentId),
      eq(teams.externalId, espnTeamId)
    ),
  });
  
  if (team) return team.id;
  
  // Fall back to abbreviation match
  if (espnAbbr) {
    team = await db.query.teams.findFirst({
      where: and(
        eq(teams.tournamentId, tournamentId),
        eq(teams.shortName, espnAbbr)
      ),
    });
    
    if (team) return team.id;
  }
  
  return null;
}

/**
 * Process ESPN NCAA game and update our database
 */
export async function processESPNNCAAGame(
  espnGame: ESPNNCAAGame,
  tournamentId: string
): Promise<{
  updated: boolean;
  gameId?: string;
  status?: GameStatus;
  team1Score?: number;
  team2Score?: number;
  winnerId?: string | null;
}> {
  const competition = espnGame.competitions[0];
  if (!competition) return { updated: false };
  
  const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home');
  const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away');
  
  if (!homeCompetitor || !awayCompetitor) return { updated: false };
  
  const homeTeamId = await findNCAATeamByESPN(
    tournamentId,
    homeCompetitor.team.id,
    homeCompetitor.team.abbreviation
  );
  const awayTeamId = await findNCAATeamByESPN(
    tournamentId,
    awayCompetitor.team.id,
    awayCompetitor.team.abbreviation
  );
  
  if (!homeTeamId || !awayTeamId) {
    console.log(`NCAA teams not found for ESPN game ${espnGame.id}: ${homeCompetitor.team.displayName} vs ${awayCompetitor.team.displayName}`);
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
    console.log(`NCAA game not found in database for ESPN game ${espnGame.id}`);
    return { updated: false };
  }
  
  const newStatus = mapESPNNCAAStatus(espnGame.status);
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
      externalId: game.externalId || `espn-ncaa-${espnGame.id}`,
    })
    .where(eq(games.id, game.id));
  
  console.log(`Updated NCAA game ${game.id}: ${team1Score}-${team2Score} (${newStatus})`);
  
  return {
    updated: true,
    gameId: game.id,
    status: newStatus,
    team1Score,
    team2Score,
    winnerId,
  };
}

/**
 * Sync all March Madness scores for an active tournament
 */
export async function syncMarchMadnessScores(): Promise<{
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
    // Find active NCAA Basketball tournament
    const tournament = await db.query.tournaments.findFirst({
      where: and(
        eq(tournaments.sport, 'NCAA_BASKETBALL'),
        eq(tournaments.status, 'IN_PROGRESS')
      ),
    });
    
    if (!tournament) {
      console.log('No active NCAA Basketball tournament found');
      return results;
    }
    
    // Fetch March Madness games
    const espnGames = await fetchMarchMadnessGames(tournament.year);
    
    console.log(`Found ${espnGames.length} March Madness games from ESPN`);
    
    for (const espnGame of espnGames) {
      try {
        const result = await processESPNNCAAGame(espnGame, tournament.id);
        results.processed++;
        if (result.updated) {
          results.updated++;
        }
      } catch (error) {
        console.error(`Error processing ESPN NCAA game ${espnGame.id}:`, error);
        results.errors++;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error syncing March Madness scores:', error);
    results.errors++;
    return results;
  }
}

/**
 * Get March Madness bracket data from ESPN
 */
export async function fetchMarchMadnessBracket(year?: number): Promise<ESPNNCAABracketResponse | null> {
  try {
    const seasonYear = year || new Date().getFullYear();
    const response = await fetch(
      `${ESPN_BASE_URL}/scoreboard?seasontype=3&limit=100`
    );
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    return await response.json() as ESPNNCAABracketResponse;
  } catch (error) {
    console.error('Error fetching March Madness bracket:', error);
    return null;
  }
}

/**
 * Get ESPN team logo URL by team ID
 */
export function getESPNTeamLogoUrl(espnTeamId: string): string {
  return `https://a.espncdn.com/i/teamlogos/ncaa/500/${espnTeamId}.png`;
}
