/**
 * Build the favicon and raster PWA icons from static/icon-black.svg.
 *
 * The source mark is 148.24 x 115.66. Raster icons sit on a white square
 * with the mark scaled so its corners stay inside the maskable safe zone
 * (a circle of radius 40% of the canvas). Replace the source SVGs, then
 * run `npm run icons`.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function pathsFrom(file) {
	const svg = readFileSync(resolve(root, file), 'utf8');
	const paths = [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map((match) => match[1]);
	if (paths.length < 2) throw new Error(`${file} did not contain the expected paths`);
	return paths;
}

const blackPaths = pathsFrom('static/icon-black.svg');
const whitePaths = pathsFrom('static/icon-white.svg');

const MARK_W = 148.24;
const MARK_H = 115.66;
// Largest scale whose bounding-box corners stay inside a circle of radius 0.4.
const MARK_WIDTH_RATIO = 0.6;

function rasterSvg(size) {
	const markW = size * MARK_WIDTH_RATIO;
	const markH = markW * (MARK_H / MARK_W);
	const x = (size - markW) / 2;
	const y = (size - markH) / 2;
	const rendered = blackPaths.map((d) => `<path fill="#000000" d="${d}"/>`).join('');
	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#ffffff"/>
  <svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${markW.toFixed(2)}" height="${markH.toFixed(2)}" viewBox="0 0 ${MARK_W} ${MARK_H}">
    ${rendered}
  </svg>
</svg>
`;
}

function faviconSvg() {
	const size = 180;
	const x = (size - MARK_W) / 2;
	const y = (size - MARK_H) / 2;
	const light = blackPaths.map((d) => `<path fill="#231f20" d="${d}"/>`).join('');
	const dark = whitePaths.map((d) => `<path fill="#ffffff" d="${d}"/>`).join('');
	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <style>
    .for-dark { display: none; }
    @media (prefers-color-scheme: dark) {
      .for-light { display: none; }
      .for-dark { display: block; }
    }
  </style>
  <g class="for-light" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">${light}</g>
  <g class="for-dark" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">${dark}</g>
</svg>
`;
}

const iconsDir = resolve(root, 'static/icons');
mkdirSync(iconsDir, { recursive: true });
writeFileSync(resolve(root, 'static/favicon.svg'), faviconSvg());

const outputs = [
	['icon-192.png', 192],
	['icon-512.png', 512],
	['icon-maskable-512.png', 512],
	['apple-touch-icon.png', 180]
];

const scratch = mkdtempSync(join(tmpdir(), 'philament-icons-'));
try {
	for (const [name, size] of outputs) {
		const svgPath = join(scratch, `${name}.svg`);
		const pngPath = resolve(iconsDir, name);
		writeFileSync(svgPath, rasterSvg(size));
		execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), svgPath, '-o', pngPath]);
	}
} finally {
	rmSync(scratch, { recursive: true, force: true });
}

console.log(`rendered ${outputs.length} icons from static/icon-black.svg`);
