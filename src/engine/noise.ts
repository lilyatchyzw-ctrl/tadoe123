// Fast deterministic 2D gradient noise & analytical curl derivatives for real-time advection

const PERM = new Uint8Array(512);
const GRAD2: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// Seed permutation table deterministically
(function initPermutation() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let seed = 1337;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) {
    PERM[i] = p[i & 255];
  }
})();

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function gradDot(hash: number, x: number, y: number): number {
  const g = GRAD2[hash & 7];
  return g[0] * x + g[1] * y;
}

/**
 * 2D Perlin gradient noise returning values roughly in [-1, 1].
 */
export function noise2D(x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;

  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const aa = PERM[PERM[xi] + yi];
  const ab = PERM[PERM[xi] + yi + 1];
  const ba = PERM[PERM[xi + 1] + yi];
  const bb = PERM[PERM[xi + 1] + yi + 1];

  const x1 = lerp(gradDot(aa, xf, yf), gradDot(ba, xf - 1, yf), u);
  const x2 = lerp(gradDot(ab, xf, yf - 1), gradDot(bb, xf - 1, yf - 1), u);

  return lerp(x1, x2, v);
}

/**
 * Multi-octave divergence-free 2D curl vector computed via finite differences
 * on a time-evolving scalar stream function psi(x, y, t).
 */
export function sampleCurlField(
  nx: number,
  ny: number,
  time: number,
  scale: number
): [number, number] {
  const sx = nx * scale * 2.2 + time * 0.08;
  const sy = ny * scale * 2.2 - time * 0.05;
  const eps = 0.0025;

  // Two-octave scalar stream function
  const psi = (x: number, y: number) =>
    noise2D(x, y) + 0.45 * noise2D(x * 2.07 + 4.1, y * 2.07 - 3.7 + time * 0.12);

  const dPsiDy = (psi(sx, sy + eps) - psi(sx, sy - eps)) / (2 * eps);
  const dPsiDx = (psi(sx + eps, sy) - psi(sx - eps, sy)) / (2 * eps);

  // Curl of scalar streamfunction in 2D: (dPsi/dy, -dPsi/dx)
  return [dPsiDy * 0.55, -dPsiDx * 0.55];
}
