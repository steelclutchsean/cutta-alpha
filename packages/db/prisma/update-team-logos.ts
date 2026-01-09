import { PrismaClient } from '@prisma/client';
import { ALL_TEAM_LOGOS, getTeamLogoUrl } from './team-logos.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🖼️  Updating team logos...');

  // Get all teams
  const teams = await prisma.team.findMany({
    select: {
      id: true,
      name: true,
      logoUrl: true,
    },
  });

  console.log(`Found ${teams.length} teams to process`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const team of teams) {
    const logoUrl = getTeamLogoUrl(team.name);

    if (!logoUrl) {
      console.log(`  ⚠️  No logo found for: ${team.name}`);
      notFound++;
      continue;
    }

    if (team.logoUrl === logoUrl) {
      skipped++;
      continue;
    }

    await prisma.team.update({
      where: { id: team.id },
      data: { logoUrl },
    });

    console.log(`  ✅ Updated: ${team.name}`);
    updated++;
  }

  console.log('\n📊 Summary:');
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (already set): ${skipped}`);
  console.log(`   Not found: ${notFound}`);
  console.log('\n✨ Done!');
}

main()
  .catch((e) => {
    console.error('❌ Failed to update logos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

