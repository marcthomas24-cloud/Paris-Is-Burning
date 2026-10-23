// Reproducible runs: with ?seed=N in the URL, Math.random is replaced by a
// seeded generator before any other module runs. Combined with the fixed-step
// developer helpers (dev.js) and audio left off, a run can be replayed exactly.
// Without the parameter nothing changes.
import { mulberry } from './textures.js';

const arg = new URLSearchParams(location.search).get('seed');
export const SEED = arg === null ? null : (parseInt(arg, 10) || 1);
export function reseed(seed) { Math.random = mulberry(seed); }
if (SEED !== null) reseed(SEED);
