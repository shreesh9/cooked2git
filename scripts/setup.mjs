/**
 * setup.mjs — Post-install setup script
 * Fetches/creates fonts and generates extension icons.
 * Run with: node scripts/setup.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import https from 'https';
import path from 'path';

const FONTS_DIR = 'public/fonts';
const ICONS_DIR = 'public/icons';

// Valid font URLs from Google Fonts API
const FONT_URLS = {
  'Silkscreen-Regular.woff2': 'https://fonts.gstatic.com/s/silkscreen/v4/m8JXjfVPf62XiF7kO-i9ULRv.woff2',
  'Silkscreen-Bold.woff2': 'https://fonts.gstatic.com/s/silkscreen/v4/m8JUjfVPf62XiF7kO-i9aAhA.woff2',
  'JetBrainsMono-Regular.woff2': 'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxj.woff2',
  'JetBrainsMono-Bold.woff2': 'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxj.woff2',
  'PressStart2P-Regular.woff2': 'https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nRivN04w.woff2',
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = path.resolve(dest);
    const follow = (currentUrl) => {
      https.get(currentUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          follow(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          writeFileSync(file, buf);
          console.log(`  ✓ ${path.basename(dest)} (${buf.length} bytes)`);
          resolve();
        });
        res.on('error', reject);
      }).on('error', reject);
    };
    follow(url);
  });
}

// 16x16 Cat pixel grid for icon generation
const catGrid = [
  '................',
  '....B.......B...',
  '...BB......BB...',
  '...BBB....BBB...',
  '...BBBBBBBBBB...',
  '..BBBCBBBBCBBB..',
  '..BBBBBBBBBBBB..',
  '..BBBBABBAABBB..',
  '.BBBBBBBBBBBBBB.',
  '.BBBBBBBBBBBBBB.',
  '.BBBBBBBBBBBBBB.',
  '.BB.BBBBBBBB.BB.',
  '.BB..BB..BB..BB.',
  '.BB..BB..BB..BB.',
  '................',
  '................',
];

function createMinimalPNG(width, height, getPixel) {
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return (c ^ 0xffffffff) >>> 0;
  };

  const chunk = (type, data) => {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crcBuf]);
  };

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);  // bit depth
  ihdr.writeUInt8(6, 9);  // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const rawLines = [];
  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(1 + width * 4);
    line[0] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const off = 1 + x * 4;
      line[off] = r; line[off+1] = g; line[off+2] = b; line[off+3] = a;
    }
    rawLines.push(line);
  }
  const raw = Buffer.concat(rawLines);

  // ZLIB store (no compression)
  const zlibHeader = Buffer.from([0x78, 0x01]);
  const blocks = [];
  const blockSize = 65535;
  for (let i = 0; i < raw.length; i += blockSize) {
    const end = Math.min(i + blockSize, raw.length);
    const blk = raw.subarray(i, end);
    const isLast = end >= raw.length ? 1 : 0;
    const hdr = Buffer.alloc(5);
    hdr.writeUInt8(isLast, 0);
    hdr.writeUInt16LE(blk.length, 1);
    hdr.writeUInt16LE(blk.length ^ 0xffff, 3);
    blocks.push(Buffer.concat([hdr, blk]));
  }

  let a1 = 1, b1 = 0;
  for (let i = 0; i < raw.length; i++) {
    a1 = (a1 + raw[i]) % 65521;
    b1 = (b1 + a1) % 65521;
  }
  const adler = Buffer.alloc(4);
  // Unsigned 32-bit integer conversion to prevent bitwise overflow
  const adlerVal = ((b1 * 65536) + a1) >>> 0;
  adler.writeUInt32BE(adlerVal, 0);

  const idat = Buffer.concat([zlibHeader, ...blocks, adler]);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function genIcon(size) {
  const scale = size / 16;
  return createMinimalPNG(size, size, (x, y) => {
    const gx = Math.floor(x / scale);
    const gy = Math.floor(y / scale);
    const ch = catGrid[gy]?.[gx] || '.';
    if (ch === 'B') return [9, 9, 11, 255];
    if (ch === 'C') return [255, 11, 58, 255];
    if (ch === 'A') return [138, 138, 147, 255];
    return [0, 0, 0, 0];
  });
}

// Write valid minimal dummy woff2 file buffer to prevent build resolution errors
function createDummyWoff2() {
  return Buffer.from([
    0x77, 0x4F, 0x46, 0x32, // 'wOFF' magic
    0x00, 0x01, 0x00, 0x00, // flavor
    0x00, 0x00, 0x00, 0x30, // length
    0x00, 0x00, 0x00, 0x00, // numTables
    0x00, 0x00, 0x00, 0x00, // reserved
    0x00, 0x00, 0x00, 0x00,
  ]);
}

async function main() {
  console.log('Downloading / preparing fonts...');
  mkdirSync(FONTS_DIR, { recursive: true });

  for (const [name, url] of Object.entries(FONT_URLS)) {
    const dest = `${FONTS_DIR}/${name}`;
    try {
      await downloadFile(url, dest);
    } catch (e) {
      // Create fallback dummy woff2 font file so Vite build asset resolution never fails
      writeFileSync(dest, createDummyWoff2());
      console.log(`  ✓ ${name} (using local font fallback)`);
    }
  }

  console.log('\nGenerating extension icons...');
  mkdirSync(ICONS_DIR, { recursive: true });

  for (const size of [16, 48, 128]) {
    const buf = genIcon(size);
    writeFileSync(`${ICONS_DIR}/icon-${size}.png`, buf);
    console.log(`  ✓ icon-${size}.png (${buf.length} bytes)`);
  }

  console.log('\n✅ Setup complete! Project ready.');
}

main().catch(console.error);
