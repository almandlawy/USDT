#!/usr/bin/env node
/**
 * Rasterise Gulf Gate architectural SVGs into PNG/ICO assets.
 * Run: npm run brand:assets
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
  if (background?.alpha === 1) pipeline = pipeline.flatten({ background });
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

const charcoal = { r: 17, g: 18, b: 22, alpha: 1 };

await pngFromSvg(symbol, 512, join(brandDir, "gulf-gate-symbol.png"));
await pngFixed(horizontal, 1120, 208, join(brandDir, "gulf-gate-logo-horizontal.png"));

for (const size of [16, 32, 48, 96, 192, 512]) {
  await pngFromSvg(faviconSvg, size, join(publicDir, `icon-${size}.png`), charcoal);
}

await pngFromSvg(faviconSvg, 180, join(publicDir, "apple-touch-icon.png"), charcoal);

async function maskable(size, out) {
  const inner = Math.round(size * 0.60);
  const pad = Math.round((size - inner) / 2);
  const icon = await sharp(faviconSvg, { density: 320 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: charcoal } })
    .composite([{ input: icon, left: pad, top: pad }])
    .png()
    .toFile(out);
  console.log("wrote", out);
}

await maskable(192, join(publicDir, "maskable-icon-192.png"));
await maskable(512, join(publicDir, "maskable-icon-512.png"));

const icoBuffers = await Promise.all(
  [16, 32, 48].map((size) =>
    sharp(faviconSvg, { density: 320 })
      .resize(size, size, { fit: "contain", background: charcoal })
      .flatten({ background: charcoal })
      .png()
      .toBuffer(),
  ),
);
writeFileSync(join(publicDir, "favicon.ico"), await pngToIco(icoBuffers));
console.log("wrote favicon.ico");

const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFEFA"/>
      <stop offset="1" stop-color="#EEE8DC"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E6CA88"/>
      <stop offset="0.52" stop-color="#C7A25A"/>
      <stop offset="1" stop-color="#8F6D2D"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#paper)"/>
  <path d="M0 540h1200v90H0z" fill="#111216"/>
  <g opacity=".18" stroke="#8F6D2D" fill="none">
    <path d="M790 85 1010 305v230H570V305L790 85Z"/>
    <path d="M790 120 970 300v205H610V300L790 120Z"/>
    <path d="M790 155 930 295v180H650V295L790 155Z"/>
  </g>
  <g transform="translate(765 185) scale(3.2)">
    <path d="M32 5 54 27v30H10V27L32 5Z" fill="none" stroke="url(#gold)" stroke-width="3" stroke-linejoin="round"/>
    <path d="M32 14 45 28v20H19V28L32 14Z" fill="none" stroke="url(#gold)" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M17 53V33m8 20V27m7 26V20m7 33V27m8 26V33" fill="none" stroke="url(#gold)" stroke-width="2.6"/>
    <path d="m32 35 4 4-4 4-4-4 4-4Z" fill="#C7A25A"/>
  </g>
  <text x="90" y="228" fill="#111216" font-family="Georgia, Times New Roman, serif" font-size="76" font-weight="500" letter-spacing="9">GULF GATE</text>
  <text x="95" y="282" fill="#8F6D2D" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="700" letter-spacing="5">DIGITAL ASSET OPERATIONS</text>
  <line x1="95" y1="330" x2="250" y2="330" stroke="#C7A25A" stroke-width="3"/>
  <text x="95" y="388" fill="#24231F" font-family="Arial, Helvetica, sans-serif" font-size="30">Country-aware payments. Secure quote links.</text>
  <text x="95" y="430" fill="#746E64" font-family="Arial, Helvetica, sans-serif" font-size="24">Clear digital-asset request operations.</text>
  <text x="90" y="590" fill="#E2C57E" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="3">PRECISE OPERATIONS · REFINED EXPERIENCE</text>
</svg>`;
await sharp(Buffer.from(ogSvg)).png().toFile(join(ogDir, "gulf-gate-cover.png"));
console.log("wrote og/gulf-gate-cover.png");
console.log("Architectural brand assets generated.");
