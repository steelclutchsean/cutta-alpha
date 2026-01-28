/**
 * ESPN Multi-Sport Events API Service
 * 
 * Unified service for fetching playoff/tournament data from ESPN across multiple sports.
 * All ESPN endpoints are free and don't require authentication.
 */

const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports';

// Sport path mappings for ESPN API
export const ESPN_SPORTS: Record<string, string> = {
  NCAA_BASKETBALL: 'basketball/mens-college-basketball',
  NFL: 'football/nfl',
  NBA: 'basketball/nba',
  NHL: 'hockey/nhl',
  MLB: 'baseball/mlb',
  TENNIS: 'tennis',
};

// Display names for sports
export const SPORT_DISPLAY_NAMES: Record<string, string> = {
  NCAA_BASKETBALL: 'March Madness',
  NFL: 'NFL Playoffs',
  NBA: 'NBA Playoffs',
  NHL: 'NHL Playoffs',
  MLB: 'MLB Playoffs',
  TENNIS: 'Tennis Grand Slams',
};

// Event types by sport
export const SPORT_EVENTS: Record<string, { id: string; name: string; teamCount: number }[]> = {
  NCAA_BASKETBALL: [
    { id: 'ncaa-tournament', name: 'NCAA Tournament', teamCount: 68 },
  ],
  NFL: [
    { id: 'nfl-playoffs', name: 'NFL Playoffs', teamCount: 14 },
  ],
  NBA: [
    { id: 'nba-playoffs', name: 'NBA Playoffs', teamCount: 16 },
  ],
  NHL: [
    { id: 'nhl-playoffs', name: 'Stanley Cup Playoffs', teamCount: 16 },
  ],
  MLB: [
    { id: 'mlb-playoffs', name: 'MLB Postseason', teamCount: 12 },
  ],
  TENNIS: [
    { id: 'australian-open', name: 'Australian Open', teamCount: 128 },
    { id: 'french-open', name: 'French Open', teamCount: 128 },
    { id: 'wimbledon', name: 'Wimbledon', teamCount: 128 },
    { id: 'us-open', name: 'US Open', teamCount: 128 },
  ],
};

export interface ESPNTeamData {
  id: string;
  uid?: string;
  slug?: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  name?: string;
  nickname?: string;
  location?: string;
  color?: string;
  alternateColor?: string;
  logo?: string;
  logos?: Array<{ href: string; width: number; height: number }>;
  seed?: number;
  rank?: number;
}

export interface ESPNEventData {
  id: string;
  name: string;
  shortName?: string;
  season: {
    year: number;
    type: number;
  };
  competitions?: Array<{
    id: string;
    competitors: Array<{
      id: string;
      team: ESPNTeamData;
      score?: string;
      winner?: boolean;
      curatedRank?: { current: number };
    }>;
  }>;
}

export interface DiscoveredEvent {
  sport: string;
  sportName: string;
  eventId: string;
  eventName: string;
  year: number;
  teamCount: number;
  status: 'upcoming' | 'in_progress' | 'completed';
  startDate?: string;
  endDate?: string;
}

export interface ESPNTeamInfo {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logoUrl: string | null;
  seed?: number;
  rank?: number;
  conference?: string;
}

/**
 * Get available years (current year and 2 years back)
 */
export function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear - 1, currentYear - 2];
}

/**
 * Fetch teams from ESPN for a specific sport and season
 */
export async function fetchESPNTeams(sport: string): Promise<ESPNTeamInfo[]> {
  const sportPath = ESPN_SPORTS[sport];
  if (!sportPath) {
    console.error(`Unknown sport: ${sport}`);
    return [];
  }

  try {
    const response = await fetch(`${ESPN_BASE_URL}/${sportPath}/teams?limit=500`);
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    const data: any = await response.json();
    const teams = data.sports?.[0]?.leagues?.[0]?.teams || [];
    
    return teams.map((t: { team: ESPNTeamData }) => ({
      id: t.team.id,
      name: t.team.displayName,
      shortName: t.team.shortDisplayName || t.team.abbreviation,
      abbreviation: t.team.abbreviation,
      logoUrl: t.team.logos?.[0]?.href || t.team.logo || null,
    }));
  } catch (error) {
    console.error(`Error fetching ESPN teams for ${sport}:`, error);
    return [];
  }
}

/**
 * Fetch playoff/postseason standings from ESPN
 */
export async function fetchPlayoffTeams(sport: string, year: number): Promise<ESPNTeamInfo[]> {
  const sportPath = ESPN_SPORTS[sport];
  if (!sportPath) {
    console.error(`Unknown sport: ${sport}`);
    return [];
  }

  // Tennis is handled differently - players not teams
  if (sport === 'TENNIS') {
    return fetchTennisPlayers(year);
  }

  try {
    // Try fetching postseason scoreboard first
    const response = await fetch(
      `${ESPN_BASE_URL}/${sportPath}/scoreboard?seasontype=3&dates=${year}0101-${year}1231`
    );
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    const data: any = await response.json();
    const events = data.events || [];
    
    // Extract unique teams from playoff games
    const teamMap = new Map<string, ESPNTeamInfo>();
    
    for (const event of events) {
      for (const competition of event.competitions || []) {
        for (const competitor of competition.competitors || []) {
          const team = competitor.team;
          if (team && !teamMap.has(team.id)) {
            teamMap.set(team.id, {
              id: team.id,
              name: team.displayName,
              shortName: team.shortDisplayName || team.abbreviation,
              abbreviation: team.abbreviation,
              logoUrl: team.logo || team.logos?.[0]?.href || null,
              seed: competitor.curatedRank?.current,
              conference: team.conferenceId,
            });
          }
        }
      }
    }
    
    // If no teams from scoreboard, try standings
    if (teamMap.size === 0) {
      return fetchStandingsTeams(sport, year);
    }
    
    return Array.from(teamMap.values());
  } catch (error) {
    console.error(`Error fetching playoff teams for ${sport} ${year}:`, error);
    // Fall back to standings
    return fetchStandingsTeams(sport, year);
  }
}

/**
 * Fetch teams from standings as fallback
 */
async function fetchStandingsTeams(sport: string, year: number): Promise<ESPNTeamInfo[]> {
  const sportPath = ESPN_SPORTS[sport];
  
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/${sportPath}/standings?season=${year}`
    );
    
    if (!response.ok) {
      // Just get all teams if standings fails
      return fetchESPNTeams(sport);
    }
    
    const data: any = await response.json();
    const standings = data.children || [];
    const teams: ESPNTeamInfo[] = [];
    
    for (const conference of standings) {
      for (const division of conference.standings?.entries || []) {
        const team = division.team;
        if (team) {
          teams.push({
            id: team.id,
            name: team.displayName,
            shortName: team.shortDisplayName || team.abbreviation,
            abbreviation: team.abbreviation,
            logoUrl: team.logos?.[0]?.href || null,
            rank: parseInt(division.stats?.find((s: any) => s.name === 'playoffSeed')?.value || '0'),
            conference: conference.name,
          });
        }
      }
    }
    
    // Filter to playoff teams based on sport
    const playoffCounts: Record<string, number> = {
      NFL: 14,
      NBA: 16, // Now 20 with play-in
      NHL: 16,
      MLB: 12,
    };
    
    const count = playoffCounts[sport] || teams.length;
    
    // Sort by rank and take top teams
    return teams
      .sort((a, b) => (a.rank || 999) - (b.rank || 999))
      .slice(0, count);
  } catch (error) {
    console.error(`Error fetching standings for ${sport}:`, error);
    return fetchESPNTeams(sport);
  }
}

/**
 * Fetch tennis players for Grand Slam events
 */
async function fetchTennisPlayers(year: number): Promise<ESPNTeamInfo[]> {
  // Tennis API structure is different - we'll return placeholder for now
  // ESPN tennis API: https://site.api.espn.com/apis/site/v2/sports/tennis/players
  try {
    const response = await fetch(`${ESPN_BASE_URL}/tennis/athletes?limit=128`);
    
    if (!response.ok) {
      return generateTennisPlaceholders();
    }
    
    const data: any = await response.json();
    const athletes = data.athletes || [];
    
    return athletes.slice(0, 128).map((athlete: any, index: number) => ({
      id: athlete.id || `tennis-${index}`,
      name: athlete.displayName || `Player ${index + 1}`,
      shortName: athlete.shortName || athlete.displayName,
      abbreviation: athlete.abbreviation || athlete.displayName?.substring(0, 3).toUpperCase(),
      logoUrl: athlete.headshot?.href || null,
      seed: index + 1,
    }));
  } catch (error) {
    console.error('Error fetching tennis players:', error);
    return generateTennisPlaceholders();
  }
}

/**
 * Generate placeholder tennis entries
 */
function generateTennisPlaceholders(): ESPNTeamInfo[] {
  return Array.from({ length: 128 }, (_, i) => ({
    id: `tennis-seed-${i + 1}`,
    name: `Seed ${i + 1}`,
    shortName: `#${i + 1}`,
    abbreviation: `S${i + 1}`,
    logoUrl: null,
    seed: i + 1,
  }));
}

/**
 * Fetch NCAA Tournament bracket teams
 */
export async function fetchMarchMadnessTeams(year: number): Promise<ESPNTeamInfo[]> {
  try {
    // First try the tournament scoreboard
    const response = await fetch(
      `${ESPN_BASE_URL}/basketball/mens-college-basketball/scoreboard?seasontype=3&limit=100`
    );
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    const data: any = await response.json();
    const events = data.events || [];
    
    const teamMap = new Map<string, ESPNTeamInfo>();
    
    for (const event of events) {
      for (const competition of event.competitions || []) {
        for (const competitor of competition.competitors || []) {
          const team = competitor.team;
          if (team && !teamMap.has(team.id)) {
            // Extract seed from curatedRank or notes
            let seed = competitor.curatedRank?.current;
            if (!seed && competitor.team?.seed) {
              seed = parseInt(competitor.team.seed);
            }
            
            teamMap.set(team.id, {
              id: team.id,
              name: team.displayName,
              shortName: team.shortDisplayName || team.abbreviation,
              abbreviation: team.abbreviation,
              logoUrl: team.logo || team.logos?.[0]?.href || 
                `https://a.espncdn.com/i/teamlogos/ncaa/500/${team.id}.png`,
              seed,
            });
          }
        }
      }
    }
    
    // If we didn't get 68 teams, supplement with rankings
    if (teamMap.size < 64) {
      const rankings = await fetchNCAABracketRankings();
      for (const team of rankings) {
        if (!teamMap.has(team.id)) {
          teamMap.set(team.id, team);
        }
      }
    }
    
    return Array.from(teamMap.values());
  } catch (error) {
    console.error(`Error fetching March Madness teams for ${year}:`, error);
    return fetchNCAABracketRankings();
  }
}

/**
 * Fetch NCAA rankings as fallback for March Madness
 */
async function fetchNCAABracketRankings(): Promise<ESPNTeamInfo[]> {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/basketball/mens-college-basketball/rankings`
    );
    
    if (!response.ok) {
      return [];
    }
    
    const data: any = await response.json();
    const rankings = data.rankings?.[0]?.ranks || [];
    
    return rankings.slice(0, 68).map((entry: any) => ({
      id: entry.team?.id || entry.id,
      name: entry.team?.displayName || entry.displayName,
      shortName: entry.team?.shortDisplayName || entry.team?.abbreviation,
      abbreviation: entry.team?.abbreviation,
      logoUrl: entry.team?.logos?.[0]?.href || 
        `https://a.espncdn.com/i/teamlogos/ncaa/500/${entry.team?.id}.png`,
      seed: entry.current,
      rank: entry.current,
    }));
  } catch (error) {
    console.error('Error fetching NCAA rankings:', error);
    return [];
  }
}

/**
 * Discover available events for a sport and year
 */
export async function discoverEvents(sport: string, year: number): Promise<DiscoveredEvent[]> {
  const sportEvents = SPORT_EVENTS[sport];
  if (!sportEvents) {
    return [];
  }
  
  const sportName = SPORT_DISPLAY_NAMES[sport] || sport;
  const events: DiscoveredEvent[] = [];
  
  // Determine event status based on current date
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  for (const eventDef of sportEvents) {
    let status: 'upcoming' | 'in_progress' | 'completed' = 'completed';
    let startDate: string | undefined;
    let endDate: string | undefined;
    
    // Determine status based on sport and typical schedules
    if (year > currentYear) {
      status = 'upcoming';
    } else if (year === currentYear) {
      // Sport-specific timing
      switch (sport) {
        case 'NCAA_BASKETBALL':
          // March Madness: mid-March to early April
          if (currentMonth < 3) status = 'upcoming';
          else if (currentMonth <= 4) status = 'in_progress';
          else status = 'completed';
          startDate = `${year}-03-15`;
          endDate = `${year}-04-08`;
          break;
        case 'NFL':
          // NFL Playoffs: January (for previous season)
          // The year refers to when playoffs occur (e.g., 2025 playoffs happen in Jan 2025)
          if (currentMonth === 1) status = 'in_progress';
          else if (currentMonth === 2 && now.getDate() <= 15) status = 'in_progress';
          else status = 'completed';
          startDate = `${year}-01-10`;
          endDate = `${year}-02-12`;
          break;
        case 'NBA':
          // NBA Playoffs: April to June
          if (currentMonth < 4) status = 'upcoming';
          else if (currentMonth <= 6) status = 'in_progress';
          else status = 'completed';
          startDate = `${year}-04-15`;
          endDate = `${year}-06-20`;
          break;
        case 'NHL':
          // NHL Playoffs: April to June
          if (currentMonth < 4) status = 'upcoming';
          else if (currentMonth <= 6) status = 'in_progress';
          else status = 'completed';
          startDate = `${year}-04-15`;
          endDate = `${year}-06-25`;
          break;
        case 'MLB':
          // MLB Playoffs: October
          if (currentMonth < 10) status = 'upcoming';
          else if (currentMonth === 10) status = 'in_progress';
          else status = 'completed';
          startDate = `${year}-10-01`;
          endDate = `${year}-11-05`;
          break;
        case 'TENNIS':
          // Tennis Grand Slams have specific months
          const slamMonths: Record<string, number> = {
            'australian-open': 1,
            'french-open': 5,
            'wimbledon': 7,
            'us-open': 9,
          };
          const slamMonth = slamMonths[eventDef.id] || 1;
          if (currentMonth < slamMonth) status = 'upcoming';
          else if (currentMonth === slamMonth) status = 'in_progress';
          else status = 'completed';
          startDate = `${year}-${String(slamMonth).padStart(2, '0')}-01`;
          endDate = `${year}-${String(slamMonth).padStart(2, '0')}-15`;
          break;
      }
    }
    
    events.push({
      sport,
      sportName,
      eventId: eventDef.id,
      eventName: `${eventDef.name} ${year}`,
      year,
      teamCount: eventDef.teamCount,
      status,
      startDate,
      endDate,
    });
  }
  
  return events;
}

/**
 * Fetch teams for a specific event
 */
export async function fetchEventTeams(
  sport: string,
  year: number,
  eventId?: string
): Promise<ESPNTeamInfo[]> {
  switch (sport) {
    case 'NCAA_BASKETBALL':
      return fetchMarchMadnessTeams(year);
    case 'TENNIS':
      return fetchTennisPlayers(year);
    default:
      return fetchPlayoffTeams(sport, year);
  }
}

/**
 * Get team logo URL helper
 */
export function getTeamLogoUrl(sport: string, teamId: string, abbreviation?: string): string {
  switch (sport) {
    case 'NCAA_BASKETBALL':
      return `https://a.espncdn.com/i/teamlogos/ncaa/500/${teamId}.png`;
    case 'NFL':
      return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbreviation?.toLowerCase() || teamId}.png`;
    case 'NBA':
      return `https://a.espncdn.com/i/teamlogos/nba/500/${teamId}.png`;
    case 'NHL':
      return `https://a.espncdn.com/i/teamlogos/nhl/500/${teamId}.png`;
    case 'MLB':
      return `https://a.espncdn.com/i/teamlogos/mlb/500/${teamId}.png`;
    default:
      return `https://a.espncdn.com/i/teamlogos/${sport.toLowerCase()}/500/${teamId}.png`;
  }
}
