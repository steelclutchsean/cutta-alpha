import { db, eq, teams } from '../src/index.js';
import { getTeamLogoUrl } from './team-logos.js';

async function main() {
  console.log('🖼️  Updating team logos...');

  // Get all teams
  const allTeams = await db.query.teams.findMany({
    columns: {
      id: true,
      name: true,
      logoUrl: true,
    },
  });

  console.log(`Found ${allTeams.length} teams to process`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const team of allTeams) {
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

    await db.update(teams)
      .set({ logoUrl })
      .where(eq(teams.id, team.id));

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
  });
