/**
 * Team Logo URLs from ESPN CDN
 * Format: https://a.espncdn.com/i/teamlogos/{sport}/{size}/{id}.png
 * 
 * For NCAA: https://a.espncdn.com/i/teamlogos/ncaa/500/{espn_id}.png
 * For NFL: https://a.espncdn.com/i/teamlogos/nfl/500/{abbrev}.png
 */

// NCAA Basketball Team Logo URLs (ESPN IDs)
export const NCAA_TEAM_LOGOS: Record<string, string> = {
  // East Region
  'Duke': 'https://a.espncdn.com/i/teamlogos/ncaa/500/150.png',
  'Alabama': 'https://a.espncdn.com/i/teamlogos/ncaa/500/333.png',
  'Wisconsin': 'https://a.espncdn.com/i/teamlogos/ncaa/500/275.png',
  'Arizona': 'https://a.espncdn.com/i/teamlogos/ncaa/500/12.png',
  'Oregon': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2483.png',
  'BYU': 'https://a.espncdn.com/i/teamlogos/ncaa/500/252.png',
  'St. Marys': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2608.png',
  'UConn': 'https://a.espncdn.com/i/teamlogos/ncaa/500/41.png',
  'Oklahoma': 'https://a.espncdn.com/i/teamlogos/ncaa/500/201.png',
  'Arkansas': 'https://a.espncdn.com/i/teamlogos/ncaa/500/8.png',
  'Drake': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2181.png',
  'Colorado State': 'https://a.espncdn.com/i/teamlogos/ncaa/500/36.png',
  'Yale': 'https://a.espncdn.com/i/teamlogos/ncaa/500/43.png',
  'Lipscomb': 'https://a.espncdn.com/i/teamlogos/ncaa/500/288.png',
  'Robert Morris': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2523.png',
  'American': 'https://a.espncdn.com/i/teamlogos/ncaa/500/44.png',

  // West Region
  'Florida': 'https://a.espncdn.com/i/teamlogos/ncaa/500/57.png',
  'St. Johns': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2599.png',
  'Texas Tech': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2641.png',
  'Maryland': 'https://a.espncdn.com/i/teamlogos/ncaa/500/120.png',
  'Memphis': 'https://a.espncdn.com/i/teamlogos/ncaa/500/235.png',
  'Missouri': 'https://a.espncdn.com/i/teamlogos/ncaa/500/142.png',
  'Kansas State': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2306.png',
  'Creighton': 'https://a.espncdn.com/i/teamlogos/ncaa/500/156.png',
  'New Mexico': 'https://a.espncdn.com/i/teamlogos/ncaa/500/167.png',
  'VCU': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2670.png',
  'McNeese': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2377.png',
  'High Point': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2272.png',
  'Troy': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2653.png',
  'Omaha': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2437.png',
  'Norfolk State': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2450.png',

  // South Region
  'Auburn': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2.png',
  'Michigan State': 'https://a.espncdn.com/i/teamlogos/ncaa/500/127.png',
  'Iowa State': 'https://a.espncdn.com/i/teamlogos/ncaa/500/66.png',
  'Texas A&M': 'https://a.espncdn.com/i/teamlogos/ncaa/500/245.png',
  'Michigan': 'https://a.espncdn.com/i/teamlogos/ncaa/500/130.png',
  'Mississippi': 'https://a.espncdn.com/i/teamlogos/ncaa/500/145.png',
  'UCLA': 'https://a.espncdn.com/i/teamlogos/ncaa/500/26.png',
  'Louisville': 'https://a.espncdn.com/i/teamlogos/ncaa/500/97.png',
  'Georgia': 'https://a.espncdn.com/i/teamlogos/ncaa/500/61.png',
  'Utah State': 'https://a.espncdn.com/i/teamlogos/ncaa/500/328.png',
  'Xavier': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2752.png',
  'UC Irvine': 'https://a.espncdn.com/i/teamlogos/ncaa/500/300.png',
  'Akron': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2006.png',
  'Montana': 'https://a.espncdn.com/i/teamlogos/ncaa/500/149.png',
  'Bryant': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2803.png',
  'SIU Edwardsville': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2565.png',

  // Midwest Region
  'Houston': 'https://a.espncdn.com/i/teamlogos/ncaa/500/248.png',
  'Tennessee': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2633.png',
  'Kentucky': 'https://a.espncdn.com/i/teamlogos/ncaa/500/96.png',
  'Purdue': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2509.png',
  'Clemson': 'https://a.espncdn.com/i/teamlogos/ncaa/500/228.png',
  'Illinois': 'https://a.espncdn.com/i/teamlogos/ncaa/500/356.png',
  'Gonzaga': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2250.png',
  'Nebraska': 'https://a.espncdn.com/i/teamlogos/ncaa/500/158.png',
  'Texas': 'https://a.espncdn.com/i/teamlogos/ncaa/500/251.png',
  'Vanderbilt': 'https://a.espncdn.com/i/teamlogos/ncaa/500/238.png',
  'NC State': 'https://a.espncdn.com/i/teamlogos/ncaa/500/152.png',
  'Grand Canyon': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2253.png',
  'Vermont': 'https://a.espncdn.com/i/teamlogos/ncaa/500/261.png',
  'Wofford': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2747.png',
  'Stetson': 'https://a.espncdn.com/i/teamlogos/ncaa/500/56.png',
  'Texas Southern': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2640.png',
};

// NFL Team Logo URLs
export const NFL_TEAM_LOGOS: Record<string, string> = {
  // AFC
  'Kansas City Chiefs': 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
  'New England Patriots': 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png',
  'Pittsburgh Steelers': 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png',
  'Houston Texans': 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png',
  'Buffalo Bills': 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png',
  'Jacksonville Jaguars': 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png',
  'Los Angeles Chargers': 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png',
  'Baltimore Ravens': 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png',
  'Cincinnati Bengals': 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png',
  'Cleveland Browns': 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png',
  'Denver Broncos': 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png',
  'Indianapolis Colts': 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png',
  'Las Vegas Raiders': 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png',
  'Miami Dolphins': 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png',
  'New York Jets': 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png',
  'Tennessee Titans': 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png',

  // NFC
  'Detroit Lions': 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png',
  'Philadelphia Eagles': 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png',
  'Carolina Panthers': 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png',
  'Chicago Bears': 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png',
  'Green Bay Packers': 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png',
  'San Francisco 49ers': 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png',
  'Los Angeles Rams': 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png',
  'Arizona Cardinals': 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png',
  'Atlanta Falcons': 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png',
  'Dallas Cowboys': 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png',
  'Minnesota Vikings': 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png',
  'New Orleans Saints': 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png',
  'New York Giants': 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png',
  'Seattle Seahawks': 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png',
  'Tampa Bay Buccaneers': 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png',
  'Washington Commanders': 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png',
};

// Combined lookup
export const ALL_TEAM_LOGOS: Record<string, string> = {
  ...NCAA_TEAM_LOGOS,
  ...NFL_TEAM_LOGOS,
};

/**
 * Get logo URL for a team by name
 */
export function getTeamLogoUrl(teamName: string): string | null {
  return ALL_TEAM_LOGOS[teamName] || null;
}


