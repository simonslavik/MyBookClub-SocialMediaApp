#!/usr/bin/env node
/**
 * Convert homepage screenshots → WebP with sane resize bounds + emit
 * an `<img-dimensions>.json` map of width/height so the homepage JSX
 * can set explicit `width`/`height` (kills CLS, satisfies Lighthouse).
 *
 *   node scripts/convert-screenshots.mjs
 *
 * Idempotent — re-running just overwrites the .webp outputs. Originals
 * (.png / .jpeg) are kept around as fallbacks; nothing references them
 * once the homepage components switch to .webp.
 */
import sharp from 'sharp';
import { readdir, writeFile, stat } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

const IMAGES_DIR = new URL('../public/images', import.meta.url);
const MAX_WIDTH = 1600;     // homepage hero shown ~800px @ 2x DPR
const WEBP_QUALITY = 82;    // visually lossless for screenshots; ~70% smaller than PNG

// Source files we want WebP-ified. Other PNGs in /public/images (logos,
// decorative grass/balls/flowers) stay as-is — they're tiny anyway.
const SOURCES = [
  'homepage.png',
  'bookclub-chat.png',
  'bookclub-chat-2.png',
  'bookclub-suggestions.png',
  'bookclub-calendar.png',
  'reading-progress.png',
  'reading-progress-2.png',
  'user-profile.png',
  'book-rating.png',
  'adding-ratings.png',
  'notification-mobile.jpeg',
];

const dimensions = {};
let originalBytes = 0;
let webpBytes = 0;

for (const file of SOURCES) {
  const src = join(IMAGES_DIR.pathname, file);
  const out = join(IMAGES_DIR.pathname, basename(file, extname(file)) + '.webp');

  let srcStat;
  try {
    srcStat = await stat(src);
  } catch {
    console.warn(`! skipping ${file} (not found)`);
    continue;
  }
  originalBytes += srcStat.size;

  const meta = await sharp(src).metadata();
  const targetWidth = Math.min(meta.width ?? MAX_WIDTH, MAX_WIDTH);
  // Compute proportional height for the dimensions JSON
  const targetHeight = Math.round((meta.height ?? 0) * (targetWidth / (meta.width ?? 1)));

  await sharp(src)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(out);

  const outStat = await stat(out);
  webpBytes += outStat.size;

  dimensions[basename(out)] = { width: targetWidth, height: targetHeight };

  const pct = (1 - outStat.size / srcStat.size) * 100;
  console.log(
    `${file} → ${basename(out)}  ${(srcStat.size / 1024).toFixed(0)} KB → ${(outStat.size / 1024).toFixed(0)} KB  (-${pct.toFixed(0)}%)`,
  );
}

// Emit dimensions for the JSX consumers
const dimsPath = new URL('../src/config/screenshotDimensions.json', import.meta.url);
await writeFile(dimsPath, JSON.stringify(dimensions, null, 2) + '\n');

const totalSavingKB = (originalBytes - webpBytes) / 1024;
console.log(`\n  Wrote ${dimsPath.pathname}`);
console.log(`Total: ${(originalBytes / 1024).toFixed(0)} KB → ${(webpBytes / 1024).toFixed(0)} KB  (saved ${totalSavingKB.toFixed(0)} KB)`);
