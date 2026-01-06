import { PrismaClient, Sport, TournamentStatus, PayoutTrigger, PoolStatus, AuctionItemStatus, OwnershipSource } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Demo password for all test accounts
const DEMO_PASSWORD = 'demo123456';

// Demo users
const DEMO_USERS = [
  { email: 'demo@cutta.io', displayName: 'Demo Commissioner', balance: 5000 },
  { email: 'alex@cutta.io', displayName: 'Alex Thompson', balance: 2500 },
  { email: 'jordan@cutta.io', displayName: 'Jordan Rivera', balance: 3200 },
  { email: 'casey@cutta.io', displayName: 'Casey Williams', balance: 1800 },
  { email: 'morgan@cutta.io', displayName: 'Morgan Davis', balance: 4100 },
];

// March Madness 2025 teams (64 teams)
const MARCH_MADNESS_TEAMS = {
  East: [
    { seed: 1, name: 'Duke', shortName: 'DUKE' },
    { seed: 2, name: 'Alabama', shortName: 'ALA' },
    { seed: 3, name: 'Wisconsin', shortName: 'WISC' },
    { seed: 4, name: 'Arizona', shortName: 'ARIZ' },
    { seed: 5, name: 'Oregon', shortName: 'ORE' },
    { seed: 6, name: 'BYU', shortName: 'BYU' },
    { seed: 7, name: 'St. Marys', shortName: 'SMC' },
    { seed: 8, name: 'UConn', shortName: 'UCONN' },
    { seed: 9, name: 'Oklahoma', shortName: 'OKL' },
    { seed: 10, name: 'Arkansas', shortName: 'ARK' },
    { seed: 11, name: 'Drake', shortName: 'DRKE' },
    { seed: 12, name: 'Colorado State', shortName: 'CSU' },
    { seed: 13, name: 'Yale', shortName: 'YALE' },
    { seed: 14, name: 'Lipscomb', shortName: 'LIPS' },
    { seed: 15, name: 'Robert Morris', shortName: 'ROBM' },
    { seed: 16, name: 'American', shortName: 'AMER' },
  ],
  West: [
    { seed: 1, name: 'Florida', shortName: 'FLA' },
    { seed: 2, name: 'St. Johns', shortName: 'STJ' },
    { seed: 3, name: 'Texas Tech', shortName: 'TTU' },
    { seed: 4, name: 'Maryland', shortName: 'UMD' },
    { seed: 5, name: 'Memphis', shortName: 'MEM' },
    { seed: 6, name: 'Missouri', shortName: 'MIZZ' },
    { seed: 7, name: 'Kansas State', shortName: 'KSU' },
    { seed: 8, name: 'UConn', shortName: 'CONN' },
    { seed: 9, name: 'Creighton', shortName: 'CREI' },
    { seed: 10, name: 'New Mexico', shortName: 'UNM' },
    { seed: 11, name: 'VCU', shortName: 'VCU' },
    { seed: 12, name: 'McNeese', shortName: 'MCNS' },
    { seed: 13, name: 'High Point', shortName: 'HPU' },
    { seed: 14, name: 'Troy', shortName: 'TROY' },
    { seed: 15, name: 'Omaha', shortName: 'OMAH' },
    { seed: 16, name: 'Norfolk State', shortName: 'NORF' },
  ],
  South: [
    { seed: 1, name: 'Auburn', shortName: 'AUB' },
    { seed: 2, name: 'Michigan State', shortName: 'MSU' },
    { seed: 3, name: 'Iowa State', shortName: 'ISU' },
    { seed: 4, name: 'Texas A&M', shortName: 'TAMU' },
    { seed: 5, name: 'Michigan', shortName: 'MICH' },
    { seed: 6, name: 'Mississippi', shortName: 'MISS' },
    { seed: 7, name: 'UCLA', shortName: 'UCLA' },
    { seed: 8, name: 'Louisville', shortName: 'LOU' },
    { seed: 9, name: 'Georgia', shortName: 'UGA' },
    { seed: 10, name: 'Utah State', shortName: 'USU' },
    { seed: 11, name: 'Xavier', shortName: 'XAV' },
    { seed: 12, name: 'UC Irvine', shortName: 'UCI' },
    { seed: 13, name: 'Akron', shortName: 'AKRN' },
    { seed: 14, name: 'Montana', shortName: 'MONT' },
    { seed: 15, name: 'Bryant', shortName: 'BRYN' },
    { seed: 16, name: 'SIU Edwardsville', shortName: 'SIUE' },
  ],
  Midwest: [
    { seed: 1, name: 'Houston', shortName: 'HOU' },
    { seed: 2, name: 'Tennessee', shortName: 'TENN' },
    { seed: 3, name: 'Kentucky', shortName: 'UK' },
    { seed: 4, name: 'Purdue', shortName: 'PUR' },
    { seed: 5, name: 'Clemson', shortName: 'CLEM' },
    { seed: 6, name: 'Illinois', shortName: 'ILL' },
    { seed: 7, name: 'Gonzaga', shortName: 'GONZ' },
    { seed: 8, name: 'Nebraska', shortName: 'NEB' },
    { seed: 9, name: 'Texas', shortName: 'TEX' },
    { seed: 10, name: 'Vanderbilt', shortName: 'VAND' },
    { seed: 11, name: 'NC State', shortName: 'NCST' },
    { seed: 12, name: 'Grand Canyon', shortName: 'GCU' },
    { seed: 13, name: 'Vermont', shortName: 'UVM' },
    { seed: 14, name: 'Wofford', shortName: 'WOF' },
    { seed: 15, name: 'Stetson', shortName: 'STET' },
    { seed: 16, name: 'Texas Southern', shortName: 'TXSO' },
  ],
};

const DEFAULT_PAYOUT_RULES = [
  { name: 'National Champion', trigger: PayoutTrigger.CHAMPIONSHIP_WIN, percentage: 40, order: 1 },
  { name: 'Runner-up', trigger: PayoutTrigger.CHAMPIONSHIP_WIN, percentage: 15, order: 2, triggerValue: 'runner_up' },
  { name: 'Final Four (each)', trigger: PayoutTrigger.FINAL_FOUR, percentage: 8, order: 3 },
  { name: 'Elite Eight (each)', trigger: PayoutTrigger.ELITE_EIGHT, percentage: 4, order: 4 },
  { name: 'Sweet Sixteen (each)', trigger: PayoutTrigger.SWEET_SIXTEEN, percentage: 1.5, order: 5 },
];

// Generate auction prices based on seed (higher seeds = higher prices)
function generateAuctionPrice(seed: number): number {
  const basePrices: Record<number, number> = {
    1: 150, 2: 120, 3: 100, 4: 85,
    5: 70, 6: 55, 7: 45, 8: 35,
    9: 25, 10: 18, 11: 12, 12: 8,
    13: 5, 14: 3, 15: 2, 16: 1,
  };
  const base = basePrices[seed] || 10;
  // Add some randomness (+/- 20%)
  const variance = base * 0.2;
  return Math.round(base + (Math.random() - 0.5) * variance * 2);
}

async function main() {
  console.log('🌱 Seeding database...');

  // Create password hash
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Create demo users
  const users: { id: string; email: string; displayName: string }[] = [];
  for (const userData of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        passwordHash,
        displayName: userData.displayName,
        balance: userData.balance,
      },
      create: {
        email: userData.email,
        displayName: userData.displayName,
        passwordHash,
        balance: userData.balance,
        kycVerified: true,
      },
    });
    users.push(user);
    console.log(`✅ Created user: ${user.email}`);
  }

  const commissioner = users[0];

  // Create March Madness 2025 tournament
  const tournament = await prisma.tournament.upsert({
    where: { name_year: { name: 'March Madness', year: 2025 } },
    update: {},
    create: {
      name: 'March Madness',
      year: 2025,
      sport: Sport.NCAA_BASKETBALL,
      status: TournamentStatus.UPCOMING,
      startDate: new Date('2025-03-18'),
      endDate: new Date('2025-04-07'),
    },
  });

  console.log(`✅ Created tournament: ${tournament.name} ${tournament.year}`);

  // Clean up existing data for this tournament to avoid duplicates
  // First, get all pools for this tournament
  const existingPools = await prisma.pool.findMany({
    where: { tournamentId: tournament.id },
    select: { id: true },
  });
  const poolIds = existingPools.map(p => p.id);

  // Delete in order of dependencies
  if (poolIds.length > 0) {
    await prisma.listing.deleteMany({
      where: { ownership: { auctionItem: { poolId: { in: poolIds } } } },
    });
    await prisma.ownership.deleteMany({
      where: { auctionItem: { poolId: { in: poolIds } } },
    });
    await prisma.bid.deleteMany({
      where: { auctionItem: { poolId: { in: poolIds } } },
    });
    await prisma.auctionItem.deleteMany({
      where: { poolId: { in: poolIds } },
    });
    await prisma.payoutRule.deleteMany({
      where: { poolId: { in: poolIds } },
    });
    await prisma.poolMember.deleteMany({
      where: { poolId: { in: poolIds } },
    });
    await prisma.chatMessage.deleteMany({
      where: { poolId: { in: poolIds } },
    });
    await prisma.pool.deleteMany({
      where: { id: { in: poolIds } },
    });
  }

  // Now delete teams
  await prisma.team.deleteMany({
    where: { tournamentId: tournament.id },
  });

  // Create teams for each region
  let teamCount = 0;
  const allTeams: { id: string; name: string; seed: number; region: string }[] = [];
  
  for (const [region, teams] of Object.entries(MARCH_MADNESS_TEAMS)) {
    for (const team of teams) {
      const created = await prisma.team.create({
        data: {
          tournamentId: tournament.id,
          name: team.name,
          shortName: team.shortName,
          seed: team.seed,
          region: region,
          externalId: `${region}-${team.seed}-2025`,
        },
      });
      allTeams.push({
        id: created.id,
        name: created.name,
        seed: team.seed,
        region,
      });
      teamCount++;
    }
  }

  console.log(`✅ Created ${teamCount} teams`);

  // Create the demo pool
  const pool = await prisma.pool.create({
    data: {
      name: 'March Madness 2025 - Demo Pool',
      description: 'A demo Calcutta auction pool for March Madness 2025. Auction completed - teams distributed!',
      commissionerId: commissioner.id,
      buyIn: 50,
      totalPot: 3200, // Approximate total from all auction sales
      auctionStartTime: new Date('2025-03-10T19:00:00Z'),
      tournamentId: tournament.id,
      inviteCode: 'DEMO2025',
      status: PoolStatus.IN_PROGRESS, // Auction completed, tournament ongoing
    },
  });

  console.log(`✅ Created demo pool: ${pool.name}`);

  // Add all users as pool members
  for (let i = 0; i < users.length; i++) {
    await prisma.poolMember.create({
      data: {
        poolId: pool.id,
        userId: users[i].id,
        role: i === 0 ? 'COMMISSIONER' : 'MEMBER',
        totalSpent: 0, // Will update after creating ownerships
      },
    });
  }

  console.log(`✅ Added ${users.length} pool members`);

  // Create auction items and distribute teams among users
  // Distribute teams round-robin style, with better teams going to different users
  let itemCount = 0;
  const ownershipData: { userId: string; teamId: string; auctionItemId: string; price: number }[] = [];

  // Sort teams by seed for fair distribution
  const sortedTeams = [...allTeams].sort((a, b) => a.seed - b.seed);

  for (let i = 0; i < sortedTeams.length; i++) {
    const team = sortedTeams[i];
    const ownerIndex = i % users.length; // Round-robin distribution
    const owner = users[ownerIndex];
    const price = generateAuctionPrice(team.seed);

    const auctionItem = await prisma.auctionItem.create({
      data: {
        poolId: pool.id,
        teamId: team.id,
        status: AuctionItemStatus.SOLD,
        startingBid: 1,
        currentBid: price,
        currentBidderId: owner.id,
        winningBid: price,
        winnerId: owner.id,
        order: itemCount + 1,
        auctionedAt: new Date('2025-03-10T21:30:00Z'),
      },
    });

    ownershipData.push({
      userId: owner.id,
      teamId: team.id,
      auctionItemId: auctionItem.id,
      price,
    });

    itemCount++;
  }

  console.log(`✅ Created ${itemCount} auction items (all sold)`);

  // Create ownership records
  for (const ownership of ownershipData) {
    await prisma.ownership.create({
      data: {
        userId: ownership.userId,
        auctionItemId: ownership.auctionItemId,
        percentage: 100, // Full ownership from auction
        purchasePrice: ownership.price,
        source: OwnershipSource.AUCTION,
      },
    });
  }

  console.log(`✅ Created ${ownershipData.length} ownership records`);

  // Update pool members' totalSpent
  for (const user of users) {
    const userSpent = ownershipData
      .filter(o => o.userId === user.id)
      .reduce((sum, o) => sum + o.price, 0);
    
    await prisma.poolMember.update({
      where: { poolId_userId: { poolId: pool.id, userId: user.id } },
      data: { totalSpent: userSpent },
    });
  }

  // Create payout rules
  await prisma.payoutRule.deleteMany({ where: { poolId: pool.id } });
  
  for (const rule of DEFAULT_PAYOUT_RULES) {
    await prisma.payoutRule.create({
      data: {
        poolId: pool.id,
        name: rule.name,
        trigger: rule.trigger,
        percentage: rule.percentage,
        triggerValue: rule.triggerValue,
        order: rule.order,
      },
    });
  }

  console.log(`✅ Created ${DEFAULT_PAYOUT_RULES.length} payout rules`);

  // Create some sample secondary market listings
  // Get some ownerships to list
  const ownerships = await prisma.ownership.findMany({
    where: { auctionItem: { poolId: pool.id } },
    include: {
      auctionItem: { include: { team: true } },
      user: true,
    },
    take: 10,
  });

  let listingCount = 0;
  for (const ownership of ownerships.slice(0, 6)) {
    const markup = 1 + Math.random() * 0.5; // 0-50% markup
    const percentageForSale = [25, 50, 100][Math.floor(Math.random() * 3)];
    const askingPrice = Math.round(Number(ownership.purchasePrice) * markup * (percentageForSale / 100));

    await prisma.listing.create({
      data: {
        ownershipId: ownership.id,
        sellerId: ownership.userId,
        percentageForSale,
        askingPrice,
        acceptingOffers: true,
        status: 'ACTIVE',
      },
    });
    listingCount++;
  }

  console.log(`✅ Created ${listingCount} secondary market listings`);

  // Summary
  console.log('\n🎉 Seed completed!');
  console.log('\n📊 Summary:');
  console.log(`   - ${users.length} demo users created`);
  console.log(`   - ${teamCount} teams (64 total)`);
  console.log(`   - ${itemCount} teams auctioned and distributed`);
  console.log(`   - ${listingCount} market listings`);
  console.log('\n🔐 All accounts use password: demo123456');
  console.log('\n📧 Demo accounts:');
  users.forEach((u, i) => {
    const teamCount = ownershipData.filter(o => o.userId === u.id).length;
    const spent = ownershipData.filter(o => o.userId === u.id).reduce((sum, o) => sum + o.price, 0);
    console.log(`   ${i === 0 ? '👑' : '👤'} ${u.email} - ${teamCount} teams, $${spent} spent`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
