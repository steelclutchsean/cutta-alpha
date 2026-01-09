import { PrismaClient, Sport, TournamentStatus, PayoutTrigger, GameStatus } from '@prisma/client';
import { NFL_TEAM_LOGOS } from './team-logos.js';

const prisma = new PrismaClient();

// 2026 NFL Playoff Teams (14 teams total)
const NFL_PLAYOFF_TEAMS = {
  AFC: [
    { seed: 1, name: 'Kansas City Chiefs', shortName: 'KC', hasBye: true },
    { seed: 2, name: 'New England Patriots', shortName: 'NE', hasBye: false },
    { seed: 3, name: 'Pittsburgh Steelers', shortName: 'PIT', hasBye: false },
    { seed: 4, name: 'Houston Texans', shortName: 'HOU', hasBye: false },
    { seed: 5, name: 'Buffalo Bills', shortName: 'BUF', hasBye: false },
    { seed: 6, name: 'Jacksonville Jaguars', shortName: 'JAX', hasBye: false },
    { seed: 7, name: 'Los Angeles Chargers', shortName: 'LAC', hasBye: false },
  ],
  NFC: [
    { seed: 1, name: 'Detroit Lions', shortName: 'DET', hasBye: true },
    { seed: 2, name: 'Philadelphia Eagles', shortName: 'PHI', hasBye: false },
    { seed: 3, name: 'Carolina Panthers', shortName: 'CAR', hasBye: false },
    { seed: 4, name: 'Chicago Bears', shortName: 'CHI', hasBye: false },
    { seed: 5, name: 'Green Bay Packers', shortName: 'GB', hasBye: false },
    { seed: 6, name: 'San Francisco 49ers', shortName: 'SF', hasBye: false },
    { seed: 7, name: 'Los Angeles Rams', shortName: 'LAR', hasBye: false },
  ],
};

// Wild Card Weekend Matchups with 5-sentence briefs
const WILD_CARD_MATCHUPS = [
  {
    awayTeam: 'Los Angeles Rams',
    homeTeam: 'Carolina Panthers',
    scheduledAt: new Date('2026-01-10T21:30:00Z'), // Sat 1:30 PM PST
    gameNumber: 1,
    matchupBrief: `The Panthers are hosting their first playoff game since 2015, marking a significant milestone under owner David Tepper. Quarterback Bryce Young makes his postseason debut, aiming to prove he's the franchise cornerstone Carolina believed in when they traded up to draft him. The Rams enter as the 7-seed but carry championship experience from their 2022 Super Bowl victory. Matthew Stafford and Cooper Kupp hope to recapture their playoff magic against a young Panthers defense. This matchup pits veteran playoff savvy against youthful home-field energy in what promises to be a compelling Wild Card contest.`,
  },
  {
    awayTeam: 'Green Bay Packers',
    homeTeam: 'Chicago Bears',
    scheduledAt: new Date('2026-01-11T01:00:00Z'), // Sat 5:00 PM PST
    gameNumber: 2,
    matchupBrief: `This marks only the third postseason meeting between these storied NFC North rivals, adding another chapter to the NFL's oldest rivalry. The Bears, led by quarterback Caleb Williams who set a franchise record with 3,942 passing yards, are eager to capitalize on their home-field advantage at Soldier Field. Green Bay split the regular-season series with Chicago, making this rubber match all the more meaningful. Jordan Love has emerged as a capable successor to Aaron Rodgers, leading the Packers back to the playoffs. The frozen tundra of Soldier Field in January sets the stage for classic Bears-Packers playoff football.`,
  },
  {
    awayTeam: 'Buffalo Bills',
    homeTeam: 'Jacksonville Jaguars',
    scheduledAt: new Date('2026-01-11T18:00:00Z'), // Sun 10:00 AM PST
    gameNumber: 3,
    matchupBrief: `The Jaguars are hosting their first playoff game since 2017, ending a long postseason drought for the franchise and its passionate fanbase. Jacksonville's defense will be tested against Josh Allen and Buffalo's high-powered offense that ranked among the league's best. The Bills have playoff experience but have struggled to get over the championship hump in recent years. Trevor Lawrence looks to lead Jacksonville on a playoff run reminiscent of their 2017 AFC Championship appearance. This AFC showdown features two quarterbacks who were selected first overall in consecutive drafts battling for advancement.`,
  },
  {
    awayTeam: 'San Francisco 49ers',
    homeTeam: 'Philadelphia Eagles',
    scheduledAt: new Date('2026-01-11T21:30:00Z'), // Sun 1:30 PM PST
    gameNumber: 4,
    matchupBrief: `The 49ers, despite a season marred by injuries to key players, have secured a playoff spot and now face the defending champion Eagles. San Francisco's resilience throughout the regular season has defined their identity under Kyle Shanahan's leadership. Philadelphia enters as the 2-seed with revenge on their minds after multiple playoff battles with the 49ers in recent years. Jalen Hurts and the Eagles' explosive offense face a 49ers defense that has proven it can rise to the occasion. This NFC showdown features two of the conference's premier franchises with Super Bowl aspirations.`,
  },
  {
    awayTeam: 'Los Angeles Chargers',
    homeTeam: 'New England Patriots',
    scheduledAt: new Date('2026-01-12T01:00:00Z'), // Sun 5:00 PM PST
    gameNumber: 5,
    matchupBrief: `The Chargers, entering the playoffs as the seventh seed, travel to Foxborough to face the second-seeded Patriots in a primetime showdown. New England's strong defense, which led the league in sacks this season, will look to contain the Chargers' dynamic offensive attack. Jim Harbaugh has brought a new energy to Los Angeles in his first season, returning the Chargers to playoff relevance. The Patriots continue their pursuit of another championship under a retooled roster built around their stout defense. This matchup features two franchises with rich playoff histories meeting in what could be a defensive struggle.`,
  },
  {
    awayTeam: 'Houston Texans',
    homeTeam: 'Pittsburgh Steelers',
    scheduledAt: new Date('2026-01-12T20:15:00Z'), // Mon Night
    gameNumber: 6,
    matchupBrief: `The Steelers, fresh off clinching the AFC North title, host the Texans in a Monday night Wild Card matchup at Acrisure Stadium. Pittsburgh's defense, which led the league in sacks this season, will aim to disrupt C.J. Stroud and Houston's offensive rhythm. The Texans emerged as surprise contenders this season behind their second-year quarterback who has exceeded all expectations. Mike Tomlin's playoff experience gives Pittsburgh an edge, as the Steelers have never had a losing season under his leadership. This primetime AFC clash showcases a rising young quarterback against one of football's most storied defensive franchises.`,
  },
];

// NFL-specific payout structure
const NFL_PAYOUT_RULES = [
  { name: 'Super Bowl Champion', trigger: PayoutTrigger.SUPER_BOWL_WIN, percentage: 50, order: 1 },
  { name: 'Super Bowl Runner-up', trigger: PayoutTrigger.SUPER_BOWL_WIN, percentage: 15, order: 2, triggerValue: 'runner_up' },
  { name: 'Conference Champion (each)', trigger: PayoutTrigger.CONFERENCE_CHAMPIONSHIP, percentage: 7.5, order: 3 },
  { name: 'Divisional Round Win (each)', trigger: PayoutTrigger.DIVISIONAL_ROUND, percentage: 3.75, order: 4 },
  { name: 'Wild Card Win (each)', trigger: PayoutTrigger.WILD_CARD_WIN, percentage: 1.25, order: 5 },
];

async function main() {
  console.log('🏈 Seeding 2026 NFL Playoffs...');

  // Create or update the 2026 NFL Playoffs tournament
  const tournament = await prisma.tournament.upsert({
    where: { name_year: { name: 'NFL Playoffs', year: 2026 } },
    update: {
      status: TournamentStatus.IN_PROGRESS,
      startDate: new Date('2026-01-10'),
      endDate: new Date('2026-02-08'),
    },
    create: {
      name: 'NFL Playoffs',
      year: 2026,
      sport: Sport.NFL,
      status: TournamentStatus.IN_PROGRESS,
      startDate: new Date('2026-01-10'),
      endDate: new Date('2026-02-08'), // Super Bowl Sunday
      externalId: 'nfl-playoffs-2026',
    },
  });

  console.log(`✅ Created tournament: ${tournament.name} ${tournament.year}`);

  // Check if there are existing auction items referencing teams (active pools)
  const existingTeams = await prisma.team.findMany({
    where: { tournamentId: tournament.id },
    include: { auctionItems: { take: 1 } },
  });
  
  const hasActiveAuctions = existingTeams.some(t => t.auctionItems.length > 0);
  
  if (hasActiveAuctions) {
    console.log('⚠️  Existing pools found - updating data without deletion');
    // Just update games without recreating teams
    await prisma.game.deleteMany({ where: { tournamentId: tournament.id } });
  } else {
    // Safe to clean up and recreate
    await prisma.game.deleteMany({ where: { tournamentId: tournament.id } });
    await prisma.team.deleteMany({ where: { tournamentId: tournament.id } });
  }

  // Create or update teams for each conference
  const teamMap: Record<string, string> = {};
  let teamCount = 0;

  for (const [conference, teams] of Object.entries(NFL_PLAYOFF_TEAMS)) {
    for (const team of teams) {
      const logoUrl = NFL_TEAM_LOGOS[team.name] || null;
      const created = await prisma.team.upsert({
        where: {
          tournamentId_externalId: {
            tournamentId: tournament.id,
            externalId: `${conference}-${team.seed}-2026`,
          },
        },
        update: {
          name: team.name,
          shortName: team.shortName,
          seed: team.seed,
          region: conference,
          logoUrl: logoUrl,
        },
        create: {
          tournamentId: tournament.id,
          name: team.name,
          shortName: team.shortName,
          seed: team.seed,
          region: conference, // Using region field for conference (AFC/NFC)
          logoUrl: logoUrl,
          externalId: `${conference}-${team.seed}-2026`,
        },
      });
      teamMap[team.name] = created.id;
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

    await prisma.game.upsert({
      where: {
        externalId: `nfl-2026-wc-${matchup.gameNumber}`,
      },
      update: {
        team1Id: homeTeamId, // Home team
        team2Id: awayTeamId, // Away team
        scheduledAt: matchup.scheduledAt,
        matchupBrief: matchup.matchupBrief,
      },
      create: {
        tournamentId: tournament.id,
        round: 1, // Wild Card = Round 1
        gameNumber: matchup.gameNumber,
        team1Id: homeTeamId, // Home team
        team2Id: awayTeamId, // Away team
        status: GameStatus.SCHEDULED,
        scheduledAt: matchup.scheduledAt,
        matchupBrief: matchup.matchupBrief,
        externalId: `nfl-2026-wc-${matchup.gameNumber}`,
      },
    });
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
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// Export for use in other scripts
export { NFL_PLAYOFF_TEAMS, WILD_CARD_MATCHUPS, NFL_PAYOUT_RULES };

