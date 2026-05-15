/**
 * Generate a deterministic, abstract "marble" avatar — inspired by boringavatars.com,
 * implemented inline so we ship zero external dependencies, no PII leaves the browser,
 * and the SVG is cached as a data URL the moment it's computed.
 *
 * Same `seed` (e.g. user id) → same avatar, every render, every device.
 */

const PALETTES: ReadonlyArray<readonly [string, string, string, string]> = [
  ['#FF6B6B', '#FFE66D', '#4ECDC4', '#1A535C'],
  ['#5E60CE', '#6930C3', '#7400B8', '#B388EB'],
  ['#06D6A0', '#118AB2', '#073B4C', '#FFD166'],
  ['#F72585', '#B5179E', '#7209B7', '#3A0CA3'],
  ['#FB8500', '#FFB703', '#219EBC', '#023047'],
  ['#84A98C', '#52796F', '#354F52', '#2F3E46'],
  ['#E63946', '#A8DADC', '#457B9D', '#1D3557'],
  ['#FFD93D', '#FF6B6B', '#6BCB77', '#4D96FF'],
  ['#22D3EE', '#818CF8', '#F472B6', '#FB923C'],
  ['#A78BFA', '#F0ABFC', '#67E8F9', '#FCD34D'],
];

const SIZE = 80; // SVG viewBox is 80×80 — img tag scales to its CSS box

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface BlobProps {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate: number;
  fill: string;
}

function blob(seed: number, color: string, index: number): BlobProps {
  // Pull 5 different bytes out of the 32-bit hash for this blob's params.
  const bytes = [
    (seed >> (index * 5)) & 0xff,
    (seed >> (index * 5 + 4)) & 0xff,
    (seed >> (index * 5 + 8)) & 0xff,
    (seed >> (index * 5 + 12)) & 0xff,
    (seed >> (index * 5 + 16)) & 0xff,
  ];
  return {
    cx: 8 + (bytes[0] % 64),
    cy: 8 + (bytes[1] % 64),
    rx: 22 + (bytes[2] % 28),
    ry: 22 + (bytes[3] % 28),
    rotate: (bytes[4] / 255) * 360,
    fill: color,
  };
}

function buildSvg(seed: string): string {
  const h = hashSeed(seed || 'guest');
  const palette = PALETTES[h % PALETTES.length];

  // Pick a background, then use the remaining 3 colours in a seed-driven
  // permutation — guarantees every avatar uses all 4 distinct palette hues.
  const bgIndex = (h >>> 28) & 3;
  const bg = palette[bgIndex];
  const others = palette.filter((_, i) => i !== bgIndex);
  const PERMS: ReadonlyArray<readonly [number, number, number]> = [
    [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0],
  ];
  const perm = PERMS[(h >>> 24) % 6];
  const blobColors = [others[perm[0]], others[perm[1]], others[perm[2]]];

  const blobs = [
    blob(h, blobColors[0], 1),
    blob(h, blobColors[1], 2),
    blob(h, blobColors[2], 3),
  ];

  const ellipses = blobs.map(b =>
    `<ellipse cx="${b.cx}" cy="${b.cy}" rx="${b.rx}" ry="${b.ry}" fill="${b.fill}" transform="rotate(${b.rotate.toFixed(1)} ${b.cx} ${b.cy})"/>`
  ).join('');

  // clipPath gives us a perfect circle; the gaussian blur softens the blob edges
  // so they blend like marble. mix-blend-mode would be even nicer but isn't
  // supported in <img> rendering of SVG.
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">`,
    `<defs>`,
    `<clipPath id="c"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}"/></clipPath>`,
    `<filter id="b"><feGaussianBlur stdDeviation="7"/></filter>`,
    `</defs>`,
    `<g clip-path="url(#c)">`,
    `<rect width="${SIZE}" height="${SIZE}" fill="${bg}"/>`,
    `<g filter="url(#b)">${ellipses}</g>`,
    `</g>`,
    `</svg>`,
  ].join('');
}

const cache = new Map<string, string>();

/**
 * Returns a `data:image/svg+xml,…` URL safe to drop into any `<img src>`.
 * Memoised because every render of a chat list calls this for the same seeds.
 */
export function getAvatarUrl(seed: string | null | undefined): string {
  const key = seed || 'guest';
  const hit = cache.get(key);
  if (hit) return hit;
  // encodeURIComponent is shorter than base64 for SVG and skips the heavier btoa step.
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(buildSvg(key))}`;
  cache.set(key, url);
  return url;
}

/**
 * Pick the best stable seed from a user-like object.
 * id > email > name > falls back to the generic `guest` palette.
 */
export function getAvatarSeed(user: { id?: string | null; userId?: string | null; email?: string | null; name?: string | null } | null | undefined): string {
  if (!user) return 'guest';
  return user.id || user.userId || user.email || user.name || 'guest';
}
