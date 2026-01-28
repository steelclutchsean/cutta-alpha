import { db, eq, and, tournaments, teams, games } from '../src/index.js';
import { NFL_TEAM_LOGOS } from './team-logos.js';

// 2024-25 NFL Playoff Teams (actual teams from January 2025 playoffs)
const NFL_PLAYOFF_TEAMS = {
  AFC: [
    { seed: 1, name: 'Kansas City Chiefs', shortName: 'KC', hasBye: true },
    { seed: 2, name: 'Buffalo Bills', shortName: 'BUF', hasBye: false },
    { seed: 3, name: 'Baltimore Ravens', shortName: 'BAL', hasBye: false },
    { seed: 4, name: 'Houston Texans', shortName: 'HOU', hasBye: false },
    { seed: 5, name: 'Los Angeles Chargers', shortName: 'LAC', hasBye: false },
    { seed: 6, name: 'Pittsburgh Steelers', shortName: 'PIT', hasBye: false },
    { seed: 7, name: 'Denver Broncos', shortName: 'DEN', hasBye: false },
  ],
  NFC: [
    { seed: 1, name: 'Detroit Lions', shortName: 'DET', hasBye: true },
    { seed: 2, name: 'Philadelphia Eagles', shortName: 'PHI', hasBye: false },
    { seed: 3, name: 'Tampa Bay Buccaneers', shortName: 'TB', hasBye: false },
    { seed: 4, name: 'Los Angeles Rams', shortName: 'LAR', hasBye: false },
    { seed: 5, name: 'Minnesota Vikings', shortName: 'MIN', hasBye: false },
    { seed: 6, name: 'Washington Commanders', shortName: 'WAS', hasBye: false },
    { seed: 7, name: 'Green Bay Packers', shortName: 'GB', hasBye: false },
  ],
};

// Wild Card Weekend Matchups with 5-sentence briefs (2024-25 NFL Playoffs)
const WILD_CARD_MATCHUPS = [
  {
    awayTeam: 'Denver Broncos',
    homeTeam: 'Buffalo Bills',
    scheduledAt: new Date('2025-01-11T18:00:00Z'), // Sat 1:00 PM ET
    gameNumber: 1,
    matchupBrief: `The Broncos return to the playoffs for the first time since their Super Bowl 50 victory, led by rookie quarterback Bo Nix who exceeded all expectations. Buffalo enters as the 2-seed with Josh Allen in MVP form, leading one of the most explosive offenses in the NFL. The Bills' home-field advantage at Highmark Stadium in January creates a hostile environment for any visiting team. Denver's young defense will be tested against a Bills offense that averaged over 30 points per game. This AFC showdown pits veteran playoff experience against youthful energy in what promises to be an exciting Wild Card battle.`,
  },
  {
    awayTeam: 'Pittsburgh Steelers',
    homeTeam: 'Baltimore Ravens',
    scheduledAt: new Date('2025-01-11T21:00:00Z'), // Sat 4:30 PM ET
    gameNumber: 2,
    matchupBrief: `The Ravens and Steelers renew their fierce AFC North rivalry in the postseason, marking another chapter in one of football's most physical matchups. Lamar Jackson looks to silence his playoff critics after winning his second MVP award this season. Pittsburgh's defense, led by T.J. Watt, will look to contain Baltimore's dynamic rushing attack. The Steelers split the regular-season series with Baltimore, making this rubber match all the more meaningful. M&T Bank Stadium will be rocking as Baltimore seeks their first Super Bowl appearance since 2012.`,
  },
  {
    awayTeam: 'Los Angeles Chargers',
    homeTeam: 'Houston Texans',
    scheduledAt: new Date('2025-01-12T01:00:00Z'), // Sat 8:00 PM ET
    gameNumber: 3,
    matchupBrief: `Jim Harbaugh has brought the Chargers back to playoff relevance in his first season, returning Los Angeles to January football. C.J. Stroud leads the Texans in his second playoff appearance, building on last year's Wild Card victory. Houston's home-field advantage at NRG Stadium gives them an edge in this AFC showdown. The Chargers' stout defense will be tested against Stroud and the Texans' explosive passing attack. This matchup features two of the AFC's brightest young quarterbacks battling for advancement to the Divisional Round.`,
  },
  {
    awayTeam: 'Green Bay Packers',
    homeTeam: 'Philadelphia Eagles',
    scheduledAt: new Date('2025-01-12T21:30:00Z'), // Sun 4:30 PM ET
    gameNumber: 4,
    matchupBrief: `Jordan Love leads the Packers back to the playoffs, continuing Green Bay's tradition of elite quarterback play. The Eagles enter as the 2-seed with Jalen Hurts and one of the league's most balanced offenses. Philadelphia's home-field advantage at Lincoln Financial Field creates one of the NFL's toughest environments. Green Bay's young roster gained valuable playoff experience last season in their Wild Card win over Dallas. This NFC showdown features two franchises with rich playoff histories meeting in a highly anticipated matchup.`,
  },
  {
    awayTeam: 'Washington Commanders',
    homeTeam: 'Tampa Bay Buccaneers',
    scheduledAt: new Date('2025-01-12T18:00:00Z'), // Sun 1:00 PM ET
    gameNumber: 5,
    matchupBrief: `Rookie sensation Jayden Daniels leads Washington to the playoffs in his first season, electrifying the Commanders' fanbase. Tampa Bay's Baker Mayfield has rejuvenated his career with the Buccaneers, leading them to another NFC South title. The Commanders' dynamic offense will be tested against a Bucs defense that improved dramatically down the stretch. Raymond James Stadium provides a warm-weather advantage for Tampa Bay in this NFC Wild Card clash. This matchup showcases two quarterbacks who have exceeded expectations and brought new life to their franchises.`,
  },
  {
    awayTeam: 'Minnesota Vikings',
    homeTeam: 'Los Angeles Rams',
    scheduledAt: new Date('2025-01-13T21:00:00Z'), // Mon 8:00 PM ET
    gameNumber: 6,
    matchupBrief: `Sam Darnold's career resurrection in Minnesota has been one of the season's best stories, leading the Vikings to a Wild Card berth. The Rams host their first playoff game at SoFi Stadium since their Super Bowl LVI victory, with Matthew Stafford seeking another championship run. Minnesota's Justin Jefferson is the most dangerous receiver in the playoffs, capable of taking over any game. Los Angeles' defensive front will look to pressure Darnold and disrupt Minnesota's offensive rhythm. This primetime NFC clash features two teams that have overcome significant adversity to reach the postseason.`,
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
  console.log('🏈 Seeding 2024-25 NFL Playoffs...');

  // Find or create the 2025 NFL Playoffs tournament (playoffs that occur in January 2025)
  let tournament = await db.query.tournaments.findFirst({
    where: and(eq(tournaments.name, 'NFL Playoffs'), eq(tournaments.year, 2025)),
  });

  const now = new Date();
  
  if (tournament) {
    // Update existing tournament
    await db.update(tournaments)
      .set({
        status: 'IN_PROGRESS',
        startDate: new Date('2025-01-11'),
        endDate: new Date('2025-02-09'),
        updatedAt: now,
      })
      .where(eq(tournaments.id, tournament.id));
  } else {
    // Create new tournament
    const [created] = await db.insert(tournaments)
      .values({
        name: 'NFL Playoffs',
        year: 2025,
        sport: 'NFL',
        status: 'IN_PROGRESS',
        startDate: new Date('2025-01-11'),
        endDate: new Date('2025-02-09'), // Super Bowl Sunday
        externalId: 'nfl-playoffs-2025',
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

  for (const [conference, teamsList] of Object.entries(NFL_PLAYOFF_TEAMS)) {
    for (const team of teamsList) {
      const logoUrl = NFL_TEAM_LOGOS[team.name] || null;
      const externalId = `${conference}-${team.seed}-2025`;
      
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
  for (const matchup of WILD_CARD_MATCHUPS) {
    const awayTeamId = teamMap[matchup.awayTeam];
    const homeTeamId = teamMap[matchup.homeTeam];

    if (!awayTeamId || !homeTeamId) {
      console.error(`❌ Could not find teams for matchup: ${matchup.awayTeam} @ ${matchup.homeTeam}`);
      continue;
    }

    const externalId = `nfl-2025-wc-${matchup.gameNumber}`;
    
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

  console.log(`✅ Created ${WILD_CARD_MATCHUPS.length} Wild Card games with matchup briefs`);

  // Summary
  console.log('\n🎉 NFL Playoffs seed completed!');
  console.log('\n📊 Summary:');
  console.log(`   - Tournament: ${tournament.name} ${tournament.year}`);
  console.log(`   - ${teamCount} playoff teams (7 AFC + 7 NFC)`);
  console.log(`   - ${WILD_CARD_MATCHUPS.length} Wild Card matchups`);
  console.log('\n🏈 Wild Card Weekend Schedule:');
  WILD_CARD_MATCHUPS.forEach((m) => {
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
    console.error('❌ NFL Playoffs seed failed:', e);
    process.exit(1);
  });

// Export for use in other scripts
export { NFL_PLAYOFF_TEAMS, WILD_CARD_MATCHUPS, NFL_PAYOUT_RULES };
