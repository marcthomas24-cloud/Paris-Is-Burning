// Reproducible runs: with ?seed=N in the URL, Math.random is replaced by a
// seeded generator before any other module runs. Combined with the fixed-step
// developer helpers (dev.js) and audio left off, a run can be replayed exactly.
// Without the parameter nothing changes.
import { mulberry } from './textures.js';

const arg = new URLSearchParams(location.search).get('seed');
export const SEED = arg === null ? null : (parseInt(arg, 10) || 1);
export function reseed(seed) { Math.random = mulberry(seed); }
if (SEED !== null) reseed(SEED);

// three.js draws random numbers while rendering (UUIDs for the bone and morph textures it
// creates the first time a skinned character is drawn). What gets drawn depends on the
// camera frustum, and so on the window size, so in seeded runs rendering gets its own
// stream and never consumes the simulation's. Without a seed this is a plain call.
const renderRandom = SEED === null ? null : mulberry((SEED ^ 0x5bd1e995) >>> 0);
export function isolateRender(fn) {
  if (!renderRandom) return fn();
  const sim = Math.random;
  Math.random = renderRandom;
  try { return fn(); } finally { Math.random = sim; }
}
