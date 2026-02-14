#!/usr/bin/env node
/**
 * Generate PWA icons for Luster Dental Lab
 * Run: node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

// Create solid blue-teal gradient icon with "L"
async function createIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2563eb"/>
          <stop offset="100%" style="stop-color:#0d9488"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" rx="${size * 0.2}"/>
      <text x="50%" y="58%" font-family="Arial,sans-serif" font-size="${size * 0.5}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">L</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  mkdirSync(publicDir, { recursive: true });
  const icon192 = await createIcon(192);
  const icon512 = await createIcon(512);
  writeFileSync(join(publicDir, "icon-192.png"), icon192);
  writeFileSync(join(publicDir, "icon-512.png"), icon512);
  console.log("Generated icon-192.png and icon-512.png");
}

main().catch(console.error);
