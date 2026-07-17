#!/usr/bin/env node
/**
 * Rasterise brand SVGs into PNG/ICO assets using sharp (already a Next.js dep).
 * Run: node scripts/generate-brand-assets.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brandDir = join(root, "public", "brand");
const publicDir = join(root, "public");
const ogDir = join(publicDir, "og");
mkdirSync(brandDir, { recursive: true });
mkdirSync(ogDir, { recursive: true });

const symbol = readFileSync(join(brandDir, "gulf-gate-symbol.svg"));
const faviconSvg = readFileSync(join(publicDir, "favicon.svg"));
const horizontal = readFileSync(join(brandDir, "gulf-gate-logo-horizontal.svg"));

async function pngFromSvg(svg, size, out, background) {
  let pipeline = sharp(svg, { density: 320 }).resize(size, size, {
    fit: "contain",
    background: background || { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (background && background.alpha === 1) {
    pipeline = pipeline.flatten({ background });
  }
  await pipeline.png().toFile(out);
  console.log("wrote", out);
}

async function pngFixed(svg, width, height, out, background) {
  await sharp(svg, { density: 300 })
    .resize(width, height, {
      fit: "contain",
      background: background || { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(out);
  console.log("wrote", out);
}

const navy = { r: 7, g: 20, b: 38, alpha: 1 };

await pngFromSvg(symbol, 512, join(brandDir, "gulf-gate-symbol.png"));
await pngFixed(horizontal, 1040, 192, join(brandDir, "gulf-gate-logo-horizontal.png"));

const iconSizes = [16, 32, 48, 96, 192, 512];
for (const size of iconSizes) {
  await pngFromSvg(faviconSvg, size, join(publicDir, `icon-${size}.png`), navy);
}

await pngFromSvg(faviconSvg, 180, join(publicDir, "apple-touch-icon.png"), navy);

// Maskable: add safe padding (~20%)
async function maskable(size, out) {
  const inner = Math.round(size * 0.62);
  const pad = Math.round((size - inner) / 2);
  const icon = await sharp(faviconSvg, { density: 320 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: navy },
  })
    .composite([{ input: icon, left: pad, top: pad }])
    .png()
    .toFile(out);
  console.log("wrote", out);
}

await maskable(192, join(publicDir, "maskable-icon-192.png"));
await maskable(512, join(publicDir, "maskable-icon-512.png"));

// favicon.ico from 16/32/48
const icoBuffers = await Promise.all(
  [16, 32, 48].map((size) =>
    sharp(faviconSvg, { density: 320 })
      .resize(size, size, { fit: "contain", background: navy })
      .flatten({ background: navy })
      .png()
      .toBuffer(),
  ),
);
writeFileSync(join(publicDir, "favicon.ico"), await pngToIco(icoBuffers));
console.log("wrote favicon.ico");

// OG cover 1200x630
const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#071426"/>
      <stop offset="1" stop-color="#0C1D33"/>
    </linearGradient>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E1BD69"/>
      <stop offset="1" stop-color="#C9A24D"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1040" cy="90" r="180" fill="#28C7D9" opacity="0.08"/>
  <circle cx="160" cy="520" r="220" fill="#C9A24D" opacity="0.07"/>
  <g transform="translate(120 210)">
    <path fill="none" stroke="url(#g)" stroke-width="10" stroke-linejoin="round" d="M20 20h140v140H20z"/>
    <path fill="none" stroke="url(#g)" stroke-width="7" stroke-linecap="round" d="M50 20v140M130 20v140"/>
    <path fill="none" stroke="#E1BD69" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"
          d="M78 55c-8-5-18-3.5-23 5-5 9-3 20 6 25 8 5 18 3 23-5"/>
    <path fill="none" stroke="#E1BD69" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"
          d="M128 55c-8-5-18-3.5-23 5-5 9-3 20 6 25 8 5 18 3 23-5"/>
    <path fill="none" stroke="#28C7D9" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"
          d="M48 130h84m0 0-14-14M132 130l-14 14"/>
  </g>
  <text x="360" y="300" fill="#E1BD69" font-family="ui-sans-serif, system-ui, sans-serif" font-size="72" font-weight="750" letter-spacing="8">GULF GATE</text>
  <text x="360" y="360" fill="#94A3B8" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28" font-weight="600" letter-spacing="4">DIGITAL ASSET OPERATIONS</text>
  <text x="360" y="430" fill="#F4F7FA" font-family="ui-sans-serif, system-ui, sans-serif" font-size="26" font-weight="500">Pre-launch request management — no financial execution</text>
</svg>`;
await sharp(Buffer.from(ogSvg)).png().toFile(join(ogDir, "gulf-gate-cover.png"));
console.log("wrote og/gulf-gate-cover.png");
console.log("Brand assets generated.");
