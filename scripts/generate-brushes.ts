/**
 * It makes the two painting brush textures that are used by the brush stroke renderer.
 * The stroke predictor was trained with brushes of this outline and mean brightness,
 * so the outline box, the filled share and the mean intensity match them.
 * Alpha carries the outline and the gray is zero outside it, so the texture is premultiplied.
 * The renderer needs the outline to have a transparent border.
 * Output: src/services/image/brushes/vertical.png and horizontal.png
 */

import {writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {encode} from 'fast-png';

const SIZE = 394;
const LEFT = 63;
const RIGHT = 361;
const TOP = 10;
const BOTTOM = 365;
const FILL = 0.576;
const MEAN = 230;
const DEVIATION = 6;
const SEED = 7;

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(seed, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = hash(ix, iy, seed) + sx * (hash(ix + 1, iy, seed) - hash(ix, iy, seed));
  const bottom =
    hash(ix, iy + 1, seed) + sx * (hash(ix + 1, iy + 1, seed) - hash(ix, iy + 1, seed));
  return top + sy * (bottom - top);
}

function edgeNoise(angle: number): number {
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  const noise =
    0.6 * valueNoise(4 * cos + 10, 4 * sin + 10, SEED) +
    0.3 * valueNoise(12 * cos + 30, 12 * sin + 30, SEED + 1) +
    0.1 * valueNoise(30 * cos + 50, 30 * sin + 50, SEED + 2);
  return Math.min(1, Math.max(0, (noise - 0.25) / 0.5));
}

// The edge only moves inward along each ray, so the outline has no specks and stays in the box.
function createOutline(): Uint8Array {
  const polar = Array.from({length: SIZE * SIZE}, (_, i) => {
    const u = (2 * (i % SIZE) - LEFT - RIGHT) / (RIGHT - LEFT);
    const v = (2 * Math.floor(i / SIZE) - TOP - BOTTOM) / (BOTTOM - TOP);
    return {radius: (u ** 6 + v ** 6) ** (1 / 6), noise: edgeNoise(Math.atan2(v, u))};
  });
  const outline = (depth: number) =>
    Uint8Array.from(polar, ({radius, noise}) => (radius < 1 - depth * noise ? 1 : 0));
  let [shallow, deep] = [0, 1];
  for (let i = 0; i < 40; i++) {
    const depth = (shallow + deep) / 2;
    if (outline(depth).reduce((sum, inside) => sum + inside, 0) > FILL * SIZE * SIZE) {
      shallow = depth;
    } else {
      deep = depth;
    }
  }
  return outline(shallow);
}

function bristles(across: number, along: number, seed: number): number {
  const wavy = across + 10 * valueNoise(along / 80, 0.5, seed + 4);
  return (
    0.33 * valueNoise(wavy / 2.2, along / 22, seed) +
    0.25 * valueNoise(wavy / 7, along / 60, seed + 1) +
    0.27 * valueNoise(across / 40, along / 100, seed + 2) +
    0.15 * valueNoise(across / 1.5, along / 1.5, seed + 5)
  );
}

function createBrush(outline: Uint8Array, vertical: boolean, seed: number): Uint8ClampedArray {
  const texture = Float64Array.from({length: SIZE * SIZE}, (_, i) => {
    const x = i % SIZE;
    const y = Math.floor(i / SIZE);
    return vertical ? bristles(x, y, seed) : bristles(y, x, seed);
  });
  const inside = texture.filter((_, i) => outline[i]);
  const mean = inside.reduce((sum, value) => sum + value, 0) / inside.length;
  const deviation = Math.sqrt(
    inside.reduce((sum, value) => sum + (value - mean) ** 2, 0) / inside.length
  );
  const brush = new Uint8ClampedArray(2 * SIZE * SIZE);
  texture.forEach((value, i) => {
    if (outline[i]) {
      brush[2 * i] = MEAN + (DEVIATION * (value - mean)) / deviation;
      brush[2 * i + 1] = 255;
    }
  });
  return brush;
}

const outline = createOutline();
const outputDir = join(dirname(fileURLToPath(import.meta.url)), '../src/services/image/brushes');
for (const [name, vertical, seed] of [
  ['vertical', true, 11],
  ['horizontal', false, 23],
] as const) {
  const data = createBrush(outline, vertical, seed);
  writeFileSync(
    join(outputDir, `${name}.png`),
    encode({width: SIZE, height: SIZE, data, channels: 2})
  );
}
console.log(`Wrote ${outputDir}/vertical.png and horizontal.png`);
