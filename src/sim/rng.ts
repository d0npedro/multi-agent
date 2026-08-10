/** Deterministic mulberry32 PRNG for reproducible sims */

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function nextSeed(state: number): { value: number; state: number } {
  let t = (state + 0x6d2b79f5) >>> 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
  const value = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  return { value, state: t };
}

export function pick<T>(items: T[], rand: number): T {
  return items[Math.floor(rand * items.length) % items.length];
}

export function uid(prefix: string, rand: number): string {
  return `${prefix}_${Math.floor(rand * 1e9).toString(36)}`;
}
