// Script to generate pixel cat extension icons (16px, 48px, 128px) as crisp PNG files
import fs from 'fs';
import path from 'path';

// Helper to construct a minimal uncompressed PNG binary buffer from RGBA pixels
function createPNG(width: number, height: number, getPixel: (x: number, y: number) => [number, number, number, number]): Buffer {
  const p = (val: number, len: number) => {
    const buf = Buffer.alloc(len);
    if (len === 4) buf.writeUInt32BE(val, 0);
    else if (len === 2) buf.writeUInt16BE(val, 0);
    else buf.writeUInt8(val, 0);
    return buf;
  };

  const crc32 = (buf: Buffer): number => {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      crc ^= byte;
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  };

  const chunk = (type: string, data: Buffer) => {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = p(data.length, 4);
    const crcBuf = p(crc32(Buffer.concat([typeBuf, data])), 4);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  };

  // Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.concat([
    p(width, 4), p(height, 4),
    Buffer.from([8, 6, 0, 0, 0]) // 8-bit RGBA, no interlace
  ]);
  const ihdr = chunk('IHDR', ihdrData);

  // Raw Image Data (Filter byte 0 + RGBA per line)
  const rawLines: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(1 + width * 4);
    line[0] = 0; // Filter none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const offset = 1 + x * 4;
      line[offset] = r;
      line[offset + 1] = g;
      line[offset + 2] = b;
      line[offset + 3] = a;
    }
    rawLines.push(line);
  }
  const rawData = Buffer.concat(rawLines);

  // Simple ZLIB store block (no compression)
  const zlibHeader = Buffer.from([0x78, 0x01]);
  const numBlocks = Math.ceil(rawData.length / 65535);
  const blocks: Buffer[] = [];

  for (let i = 0; i < numBlocks; i++) {
    const start = i * 65535;
    const end = Math.min(start + 65535, rawData.length);
    const blockData = rawData.subarray(start, end);
    const isLast = i === numBlocks - 1 ? 1 : 0;
    const len = blockData.length;
    const nlen = len ^ 0xffff;

    const blockHeader = Buffer.alloc(5);
    blockHeader.writeUInt8(isLast, 0);
    blockHeader.writeUInt16LE(len, 1);
    blockHeader.writeUInt16LE(nlen, 3);

    blocks.push(Buffer.concat([blockHeader, blockData]));
  }

  // Adler-32 checksum
  let a = 1, b = 0;
  for (let i = 0; i < rawData.length; i++) {
    a = (a + rawData[i]) % 65521;
    b = (b + a) % 65521;
  }
  const adler = p((b << 16) | a, 4);

  const idatData = Buffer.concat([zlibHeader, ...blocks, adler]);
  const idat = chunk('IDAT', idatData);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// 16x16 Cat Grid Definition
// '.' = void/transparent, 'B' = #09090B (black), 'C' = #FF0B3A (crimson), 'A' = #8A8A93 (ash), 'P' = #121215 (dark background)
const catGrid = [
  "................",
  "....B.......B...",
  "...BB......BB...",
  "...BBB....BBB...",
  "...BBBBBBBBBB...",
  "..BBBCBBBBCBBB..",
  "..BBBBBBBBBBBB..",
  "..BBBBABBAABBB..",
  ".BBBBBBBBBBBBBB.",
  ".BBBBBBBBBBBBBB.",
  ".BBBBBBBBBBBBBB.",
  ".BB.BBBBBBBB.BB.",
  ".BB..BB..BB..BB.",
  ".BB..BB..BB..BB.",
  "................",
  "................"
];

function generateIcon(size: number): Buffer {
  const scale = size / 16;
  return createPNG(size, size, (x, y) => {
    const gx = Math.floor(x / scale);
    const gy = Math.floor(y / scale);
    const char = catGrid[gy]?.[gx] || '.';

    if (char === 'B') return [9, 9, 11, 255];       // #09090B
    if (char === 'C') return [255, 11, 58, 255];    // #FF0B3A (Crimson Eyes)
    if (char === 'A') return [138, 138, 147, 255];  // #8A8A93 (Ash Nose)
    if (char === 'P') return [18, 18, 21, 255];     // #121215
    return [0, 0, 0, 0];                             // Transparent
  });
}

const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const iconBuffer = generateIcon(size);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), iconBuffer);
  console.log(`Generated icon-${size}.png (${iconBuffer.length} bytes)`);
});
