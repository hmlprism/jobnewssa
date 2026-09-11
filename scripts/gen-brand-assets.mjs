#!/usr/bin/env node
/**
 * Generates favicon set and copies brand assets to public/.
 * Run once: node scripts/gen-brand-assets.mjs
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const LOGO_SRC     = 'C:/Users/User/Downloads/Telegram Desktop/job-news-sa-logo.png';
const WORDMARK_SRC = 'C:/Users/User/Downloads/Telegram Desktop/job-news-sa-wordmark.png';

/** Pack one or more PNG buffers into a .ico file (PNG-in-ICO, all modern browsers accept this). */
function packIco(entries) {
  // entries: [{ size, buf }]
  const count = entries.length;
  const DIR_START = 6;
  const DIR_ENTRY = 16;
  let imageOffset = DIR_START + count * DIR_ENTRY;

  const parts = entries.map(({ size, buf }) => {
    const off = imageOffset;
    imageOffset += buf.length;
    return { size, buf, off };
  });

  const total = imageOffset;
  const ico = Buffer.alloc(total, 0);

  // ICO header
  ico.writeUInt16LE(0, 0); // reserved
  ico.writeUInt16LE(1, 2); // type = ICO
  ico.writeUInt16LE(count, 4);

  // Directory
  let pos = DIR_START;
  for (const { size, buf, off } of parts) {
    ico.writeUInt8(size >= 256 ? 0 : size, pos);     // width  (0 = 256)
    ico.writeUInt8(size >= 256 ? 0 : size, pos + 1); // height
    ico.writeUInt8(0, pos + 2);  // color count
    ico.writeUInt8(0, pos + 3);  // reserved
    ico.writeUInt16LE(1,  pos + 4); // planes
    ico.writeUInt16LE(32, pos + 6); // bit depth
    ico.writeUInt32LE(buf.length, pos + 8);  // size of image data
    ico.writeUInt32LE(off,        pos + 12); // offset of image data
    pos += DIR_ENTRY;
  }

  // Image data
  for (const { buf, off } of parts) {
    buf.copy(ico, off);
  }

  return ico;
}

async function run() {
  // --- Favicon set ---
  const [png16, png32, png180] = await Promise.all([
    sharp(LOGO_SRC).resize(16, 16).png().toBuffer(),
    sharp(LOGO_SRC).resize(32, 32).png().toBuffer(),
    sharp(LOGO_SRC).resize(180, 180).png().toBuffer(),
  ]);

  const ico = packIco([
    { size: 16, buf: png16 },
    { size: 32, buf: png32 },
  ]);

  writeFileSync(join(REPO, 'app/favicon.ico'), ico);
  console.log('app/favicon.ico  written', ico.length, 'bytes');

  writeFileSync(join(REPO, 'app/icon.png'), png32);
  console.log('app/icon.png     written', png32.length, 'bytes');

  writeFileSync(join(REPO, 'app/apple-icon.png'), png180);
  console.log('app/apple-icon.png written', png180.length, 'bytes');

  // --- Public assets for <Image> ---
  // Full-res copies; Next.js optimises at request time.
  const [logoFull, wordmarkFull] = await Promise.all([
    sharp(LOGO_SRC).png().toBuffer(),
    sharp(WORDMARK_SRC).png().toBuffer(),
  ]);

  writeFileSync(join(REPO, 'public/logo-mark.png'), logoFull);
  console.log('public/logo-mark.png     written', logoFull.length, 'bytes');

  writeFileSync(join(REPO, 'public/logo-wordmark.png'), wordmarkFull);
  console.log('public/logo-wordmark.png written', wordmarkFull.length, 'bytes');

  // Metadata check
  const [lm, wm] = await Promise.all([
    sharp(LOGO_SRC).metadata(),
    sharp(WORDMARK_SRC).metadata(),
  ]);
  console.log(`\nLogo mark:  ${lm.width}×${lm.height}  hasAlpha:${lm.hasAlpha}`);
  console.log(`Wordmark:   ${wm.width}×${wm.height}  hasAlpha:${wm.hasAlpha}  aspect:${(wm.width/wm.height).toFixed(3)}`);
  console.log('\nAll done.');
}

run().catch(err => { console.error(err); process.exit(1); });
