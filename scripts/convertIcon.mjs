/**
 * convertIcon.mjs — Convert "icon for extension.jpg" to properly sized PNGs
 * 
 * Usage: 
 *   npm install sharp --save-dev
 *   node scripts/convertIcon.mjs
 */
import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const SOURCE = resolve(root, 'thumbnail', 'icon for extension.jpg');
const ICONS_DIR = resolve(root, 'public', 'icons');

const SIZES = [16, 48, 128];

async function main() {
  for (const size of SIZES) {
    const outPath = resolve(ICONS_DIR, `icon-${size}.png`);
    await sharp(SOURCE)
      .resize(size, size, { fit: 'cover', position: 'centre' })
      .png()
      .toFile(outPath);
    console.log(`✅ Created ${outPath}  (${size}×${size})`);
  }
  console.log('\n🎉 All icons generated! Rebuild the extension with: npm run build');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
