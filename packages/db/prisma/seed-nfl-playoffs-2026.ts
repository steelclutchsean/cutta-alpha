import { db, eq, and, tournaments, teams, games } from '../src/index.js';
import { NFL_TEAM_LOGOS } from './team-logos.js';

// 2025-26 NFL Playoff Teams (projected teams for January 2026 playoffs)
// These are projections based on team trajectories - will be updated when actual field is set
const NFL_PLAYOFF_TEAMS_2026 = {
  AFC: [
    { seed: 1, name: 'Kansas City Chiefs', shortName: 'KC', hasBye: true },
    { seed: 2, name: 'Buffalo Bills', shortName: 'BUF', hasBye: false },
    { seed: 3, name: 'Baltimore Ravens', shortName: 'BAL', hasBye: false },
    { seed: 4, name: 'Houston Texans', shortName: 'HOU', hasBye: false },
    { seed: 5, name: 'Cincinnati Bengals', shortName: 'CIN', hasBye: false },
    { seed: 6, name: 'Miami Dolphins', shortName: 'MIA', hasBye: false },
    { seed: 7, name: 'Los Angeles Chargers', shortName: 'LAC', hasBye: false },
  ],
  NFC: [
    { seed: 1, name: 'Detroit Lions', shortName: 'DET', hasBye: true },
    { seed: 2, name: 'Philadelphia Eagles', shortName: 'PHI', hasBye: false },
    { seed: 3, name: 'San Francisco 49ers', shortName: 'SF', hasBye: false },
    { seed: 4, name: 'Dallas Cowboys', shortName: 'DAL', hasBye: false },
    { seed: 5, name: 'Green Bay Packers', shortName: 'GB', hasBye: false },
    { seed: 6, name: 'Seattle Seahawks', shortName: 'SEA', hasBye: false },
    { seed: 7, name: 'Washington Commanders', shortName: 'WAS', hasBye: false },
  ],
};

// Projected Wild Card Weekend Matchups (2025-26 NFL Playoffs - January 2026)
// Based on standard NFL playoff seeding: #2 vs #7, #3 vs #6, #4 vs #5
const WILD_CARD_MATCHUPS_2026 = [
  {
    awayTeam: 'Los Angeles Chargers',
    homeTeam: 'Buffalo Bills',
    scheduledAt: new Date('2026-01-10T18:00:00Z'), // Sat 1:00 PM ET
    gameNumber: 1,
    matchupBrief: `The Chargers look to build on their playoff momentum under Jim Harbaugh's second season, bringing a physical brand of football to Buffalo. Josh Allen and the Bills remain one of the AFC's most dangerous teams, seeking their first Super Bowl appearance in the modern era. Highmark Stadium in January presents one of the league's most challenging environments for visiting teams. Los Angeles' balanced attack will face a Bills defense that has improved significantly. This AFC Wild Card matchup features two explosive offenses in a potential shootout.`,
  },
  {
    awayTeam: 'Miami Dolphins',
    homeTeam: 'Baltimore Ravens',
    scheduledAt: new Date('2026-01-10T21:30:00Z'), // Sat 4:30 PM ET
    gameNumber: 2,
    matchupBrief: `Tua Tagovailoa leads the Dolphins back to the playoffs, hoping to overcome their cold-weather struggles in a Baltimore January. Lamar Jackson continues to cement his legacy as one of the game's most electrifying players, seeking another MVP season. The Ravens' dominant ground game will test Miami's speed-based defense in this style clash. Miami's quick-strike passing attack could exploit Baltimore's aggressive defensive approach. M&T Bank Stadium's playoff atmosphere will be electric for this AFC showdown.`,
  },
  {
    awayTeam: 'Cincinnati Bengals',
    homeTeam: 'Houston Texans',
    scheduledAt: new Date('2026-01-11T01:00:00Z'), // Sat 8:00 PM ET
    gameNumber: 3,
    matchupBrief: `Joe Burrow returns healthy and dangerous, leading the Bengals back to the postseason after their championship window remains wide open. C.J. Stroud continues his ascension as one of the NFL's premier young quarterbacks in his third professional season. Houston's home-field advantage at NRG Stadium gives them an edge in this clash of talented signal-callers. Cincinnati's championship experience could prove valuable against Houston's young but talented roster. This primetime matchup showcases two franchises with championship aspirations.`,
  },
  {
    awayTeam: 'Washington Commanders',
    homeTeam: 'Philadelphia Eagles',
    scheduledAt: new Date('2026-01-11T18:00:00Z'), // Sun 1:00 PM ET
    gameNumber: 4,
    matchupBrief: `The NFC East rivalry takes center stage as Jayden Daniels leads Washington into hostile territory at Lincoln Financial Field. The Eagles' balanced attack and dominant offensive line make them one of the NFC's most complete teams. Washington's electric offense will be tested against Philadelphia's aggressive defensive front. The divisional familiarity adds another layer of intensity to this Wild Card matchup. Lincoln Financial Field's notoriously passionate fans create one of football's toughest road environments.`,
  },
  {
    awayTeam: 'Seattle Seahawks',
    homeTeam: 'San Francisco 49ers',
    scheduledAt: new Date('2026-01-11T21:30:00Z'), // Sun 4:30 PM ET
    gameNumber: 5,
    matchupBrief: `The NFC West rivals meet in the playoffs, renewing one of football's most competitive divisional matchups. San Francisco's championship-caliber roster led by Brock Purdy seeks another deep playoff run. Seattle's young core has developed into legitimate contenders under their continued defensive excellence. The 49ers' home-field advantage at Levi's Stadium gives them an edge in this physical rivalry game. This divisional showdown features two teams that know each other intimately from years of competition.`,
  },
  {
    awayTeam: 'Green Bay Packers',
    homeTeam: 'Dallas Cowboys',
    scheduledAt: new Date('2026-01-12T20:00:00Z'), // Mon 3:00 PM ET
    gameNumber: 6,
    matchupBrief: `Jordan Love leads the Packers into AT&T Stadium in a matchup of two of the NFL's most storied franchises. Dallas looks to finally break through their playoff struggles with a talented roster seeking validation. Green Bay's young but experienced roster gained valuable playoff seasoning in recent years. The Cowboys' high-powered offense will face a Packers defense that has steadily improved. This iconic NFC matchup brings together two franchises with combined 13 Super Bowl championships.`,
  },
];

// NFL-specific payout structure
const NFL_PAYOUT_RULES = [
  { name: 'Super Bowl Champion', trigger: 'SUPER_BOWL_WIN', percentage: 50, order: 1 },
  { name: 'Super Bowl Runner-up', trigger: 'SUPER_BOWL_WIN', percentage: 15, order: 2, triggerValue: 'runner_up' },
  { name: 'Conference Champion (each)', trigger: 'CONFERENCE_CHAMPIONSHIP', percentage: 7.5, order: 3 },
  { name: 'Divisional Round Win (each)', trigger: 'DIVISIONAL_ROUND', percentage: 3.75, order: 4 },
  { name: 'Wild Card Win (each)', trigger: 'WILD_CARD_WIN', percentage: 1.25, order: 5 },
];

async function main() {
  console.log('🏈 Seeding 2025-26 NFL Playoffs (January 2026)...');

  // Find or create the 2026 NFL Playoffs tournament (playoffs that occur in January 2026)
  let tournament = await db.query.tournaments.findFirst({
    where: and(eq(tournaments.name, 'NFL Playoffs'), eq(tournaments.year, 2026)),
  });

  const now = new Date();
  
  if (tournament) {
    // Update existing tournament
    await db.update(tournaments)
      .set({
        status: 'UPCOMING',
        startDate: new Date('2026-01-10'),
        endDate: new Date('2026-02-08'), // Super Bowl Sunday
        updatedAt: now,
      })
      .where(eq(tournaments.id, tournament.id));
  } else {
    // Create new tournament
    const [created] = await db.insert(tournaments)
      .values({
        name: 'NFL Playoffs',
        year: 2026,
        sport: 'NFL',
        status: 'UPCOMING',
        startDate: new Date('2026-01-10'),
        endDate: new Date('2026-02-08'), // Super Bowl Sunday
        externalId: 'nfl-playoffs-2026',
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    tournament = created;
  }

  console.log(`✅ Created tournament: ${tournament.name} ${tournament.year}`);

  // Check if there are existing auction items referencing teams (active pools)
  const existingTeams = await db.query.teams.findMany({
    where: eq(teams.tournamentId, tournament.id),
    with: { auctionItems: { limit: 1 } },
  });
  
  const hasActiveAuctions = existingTeams.some(t => t.auctionItems.length > 0);
  
  if (hasActiveAuctions) {
    console.log('⚠️  Existing pools found - updating data without deletion');
    // Just delete games and recreate them
    await db.delete(games).where(eq(games.tournamentId, tournament.id));
  } else {
    // Safe to clean up and recreate
    await db.delete(games).where(eq(games.tournamentId, tournament.id));
    await db.delete(teams).where(eq(teams.tournamentId, tournament.id));
  }

  // Create or update teams for each conference
  const teamMap: Record<string, string> = {};
  let teamCount = 0;

  for (const [conference, teamsList] of Object.entries(NFL_PLAYOFF_TEAMS_2026)) {
    for (const team of teamsList) {
      const logoUrl = NFL_TEAM_LOGOS[team.name] || null;
      const externalId = `${conference}-${team.seed}-2026`;
      
      // Check if team exists
      let existingTeam = await db.query.teams.findFirst({
        where: and(eq(teams.tournamentId, tournament.id), eq(teams.externalId, externalId)),
      });

      if (existingTeam) {
        // Update existing team
        await db.update(teams)
          .set({
            name: team.name,
            shortName: team.shortName,
            seed: team.seed,
            region: conference,
            logoUrl: logoUrl,
          })
          .where(eq(teams.id, existingTeam.id));
        teamMap[team.name] = existingTeam.id;
      } else {
        // Create new team
        const [created] = await db.insert(teams)
          .values({
            tournamentId: tournament.id,
            name: team.name,
            shortName: team.shortName,
            seed: team.seed,
            region: conference, // Using region field for conference (AFC/NFC)
            logoUrl: logoUrl,
            externalId: externalId,
            createdAt: now,
          })
          .returning();
        teamMap[team.name] = created.id;
      }
      teamCount++;
      console.log(`  📋 ${hasActiveAuctions ? 'Updated' : 'Created'} ${conference} #${team.seed}: ${team.name}`);
    }
  }

  console.log(`✅ ${hasActiveAuctions ? 'Updated' : 'Created'} ${teamCount} NFL playoff teams`);

  // Create Wild Card games with matchup briefs
  for (const matchup of WILD_CARD_MATCHUPS_2026) {
    const awayTeamId = teamMap[matchup.awayTeam];
    const homeTeamId = teamMap[matchup.homeTeam];

    if (!awayTeamId || !homeTeamId) {
      console.error(`❌ Could not find teams for matchup: ${matchup.awayTeam} @ ${matchup.homeTeam}`);
      continue;
    }

    const externalId = `nfl-2026-wc-${matchup.gameNumber}`;
    
    // Check if game exists
    const existingGame = await db.query.games.findFirst({
      where: eq(games.externalId, externalId),
    });

    if (existingGame) {
      // Update existing game
      await db.update(games)
        .set({
          team1Id: homeTeamId, // Home team
          team2Id: awayTeamId, // Away team
          scheduledAt: matchup.scheduledAt,
          matchupBrief: matchup.matchupBrief,
          updatedAt: now,
        })
        .where(eq(games.id, existingGame.id));
    } else {
      // Create new game
      await db.insert(games).values({
        tournamentId: tournament.id,
        round: 1, // Wild Card = Round 1
        gameNumber: matchup.gameNumber,
        team1Id: homeTeamId, // Home team
        team2Id: awayTeamId, // Away team
        status: 'SCHEDULED',
        scheduledAt: matchup.scheduledAt,
        matchupBrief: matchup.matchupBrief,
        externalId: externalId,
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log(`  🎮 Created Wild Card game: ${matchup.awayTeam} @ ${matchup.homeTeam}`);
  }

  console.log(`✅ Created ${WILD_CARD_MATCHUPS_2026.length} Wild Card games with matchup briefs`);

  // Summary
  console.log('\n🎉 NFL Playoffs 2026 seed completed!');
  console.log('\n📊 Summary:');
  console.log(`   - Tournament: ${tournament.name} ${tournament.year}`);
  console.log(`   - ${teamCount} playoff teams (7 AFC + 7 NFC)`);
  console.log(`   - ${WILD_CARD_MATCHUPS_2026.length} Wild Card matchups`);
  console.log('\n⚠️  Note: These are PROJECTED teams. Update when actual playoff field is determined.');
  console.log('\n🏈 Projected Wild Card Weekend Schedule:');
  WILD_CARD_MATCHUPS_2026.forEach((m) => {
    const date = m.scheduledAt.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles',
    });
    console.log(`   ${m.awayTeam} @ ${m.homeTeam} - ${date} PST`);
  });
  console.log('\n📋 Recommended Payout Structure for NFL Pools:');
  NFL_PAYOUT_RULES.forEach((rule) => {
    console.log(`   ${rule.percentage}% - ${rule.name}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ NFL Playoffs 2026 seed failed:', e);
    process.exit(1);
  });

// Export for use in other scripts
export { NFL_PLAYOFF_TEAMS_2026, WILD_CARD_MATCHUPS_2026, NFL_PAYOUT_RULES };
