import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

// Source image - use the high-res PNG logo
const sourcePath = join(publicDir, 'logo-source.png');

// Generate different sizes
const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

async function generateFavicons() {
  if (!existsSync(sourcePath)) {
    console.error('Error: logo-source.png not found in public folder');
    console.log('Please save your high-resolution logo as public/logo-source.png');
    process.exit(1);
  }

  console.log('Generating favicon files from logo-source.png...');
  
  for (const { name, size } of sizes) {
    const outputPath = join(publicDir, name);
    await sharp(sourcePath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
    console.log(`Created ${name} (${size}x${size})`);
  }

  // Create favicon.ico (32x32 PNG saved as .ico for basic support)
  const icoBuffer = await sharp(sourcePath)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();
  writeFileSync(join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Created favicon.ico (32x32)');

  // Also create a clean favicon.svg from the source for modern browsers
  // (keeping the PNG-based approach as primary)
  
  console.log('Done! All favicons generated from logo-source.png');
}

generateFavicons().catch(console.error);
