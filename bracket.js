// Todo Priority Bracket — the ranking engine.
//
// A March-Madness-style single-elimination tournament that produces a
// COMPLETE 1..N ranking, not just a winner. The hard part is the
// recursive consolation: after the champion, the real losers of each
// round form a tier that is itself fully ranked by the same procedure.
//
// This module is the single source of truth — imported by the browser
// app (index.html) and by the Node test suite (test.mjs).
//
// Items are objects like { id, label }. Byes are represented by null.
// Match count is deterministic given a seed (it depends on the bracket
// structure, never on who wins), so we can count with an auto-pick pass
// and then replay the same seed for the live run to show "Match X of Y".

// Seeded PRNG (mulberry32) so the counting pass and the live pass build
// the identical bracket.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

export function nextPow2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function roundName(size) {
  if (size <= 2) return "Final";
  if (size === 4) return "Semifinal";
  if (size === 8) return "Quarterfinal";
  return "Round of " + size;
}

// Single-elimination among `items`, padded to a power of two with byes.
// `pick(a, b, stageName, roundSize)` returns a Promise resolving to the
// winner. Real-vs-bye auto-advances silently; bye-vs-bye yields a bye.
// Returns the champion plus the REAL losers grouped by round.
export async function runTournament(items, rng, pick, stageName) {
  const S = nextPow2(items.length);
  let slots = shuffle(items, rng);
  while (slots.length < S) slots.push(null); // pad with byes
  slots = shuffle(slots, rng); // scatter byes
  const losersByRound = [];
  let round = 0;
  while (slots.length > 1) {
    const next = [];
    const losers = [];
    for (let i = 0; i < slots.length; i += 2) {
      const a = slots[i];
      const b = slots[i + 1];
      if (a && b) {
        // real vs real -> ask
        const w = await pick(a, b, stageName, slots.length);
        next.push(w);
        losers.push(w === a ? b : a); // only real losers counted
      } else if (a || b) {
        next.push(a || b); // real vs bye -> silent advance
      } else {
        next.push(null); // bye vs bye -> bye
      }
    }
    losersByRound[round++] = losers;
    slots = next;
  }
  return { champion: slots[0], losersByRound };
}

// Full 1..N ranking. Champion is #1; each round's real losers form a tier
// ranked by the same procedure (consolation mini-bracket); tiers are
// concatenated newest-round-first. Every real item appears exactly once,
// so the result has exactly N unique items with no gaps.
export async function rankItems(items, rng, pick, stageName = "Winners") {
  if (items.length === 0) return [];
  if (items.length === 1) return [items[0]];
  const { champion, losersByRound } = await runTournament(
    items,
    rng,
    pick,
    stageName,
  );
  const ranking = [champion];
  for (let r = losersByRound.length - 1; r >= 0; r--) {
    const tier = losersByRound[r];
    if (tier && tier.length) {
      const sub = await rankItems(tier, rng, pick, "Consolation");
      for (const x of sub) ranking.push(x);
    }
  }
  return ranking;
}

// Count the real-vs-real matches for a given seed (auto-pick; the count is
// independent of who actually wins). Used for the "of Y" denominator.
export async function countMatches(items, seed) {
  let total = 0;
  await rankItems(items, makeRng(seed), (a) => {
    total++;
    return Promise.resolve(a);
  });
  return total;
}
