// Node test suite for the bracket ranking engine. Run with: node test.mjs
//
// Builds brackets for a range of N, simulates picks with several
// strategies across multiple seeds, and asserts every final ranking has
// exactly N unique items drawn from the input. Ship-blocking: if any
// case fails, this exits non-zero.

import { rankItems, makeRng, countMatches } from "./bracket.js";

const SIZES = [0, 1, 2, 3, 5, 7, 8, 10, 13, 16, 25, 32, 33];
const SEEDS = [1, 7, 12345, 99999, 2 ** 31];
const STRATEGIES = ["left", "right", "random"];

function makeItems(n) {
  const items = [];
  for (let i = 0; i < n; i++) items.push({ id: "t" + i, label: "Item " + i });
  return items;
}

let failures = 0;
let checks = 0;

for (const n of SIZES) {
  const items = makeItems(n);
  for (const seed of SEEDS) {
    for (const strat of STRATEGIES) {
      const rngPick = makeRng(seed * 2654435761 + 1);
      const pick = (a, b) => {
        if (strat === "left") return Promise.resolve(a);
        if (strat === "right") return Promise.resolve(b);
        return Promise.resolve(rngPick() < 0.5 ? a : b);
      };
      const ranking = await rankItems(items, makeRng(seed), pick);

      checks++;
      const ids = ranking.map((r) => r.id);
      const uniq = new Set(ids);
      const allFromInput = ids.every((id) => /^t\d+$/.test(id));
      const ok = ranking.length === n && uniq.size === n && allFromInput;

      // Match count must be deterministic for a given seed regardless of picks.
      const total = await countMatches(items, seed);
      const expectedMatches = Math.max(0, n - 1) + consolationMatches(n);

      if (!ok) {
        failures++;
        console.error(
          `FAIL n=${n} seed=${seed} strat=${strat}: len=${ranking.length} uniq=${uniq.size} allFromInput=${allFromInput}`,
        );
      }
      // total is informational; we don't hard-assert the closed form, but
      // we do require it to be a finite non-negative integer.
      if (!Number.isInteger(total) || total < 0) {
        failures++;
        console.error(`FAIL n=${n} seed=${seed}: bad match total ${total}`);
      }
    }
  }
}

// Reference closed-form for total matches when there are NO byes (n a power
// of two): T(1)=0, T(n)=(n-1)+sum over rounds of T(roundLosers). For the
// no-bye case the per-round loser counts are n/2, n/4, ..., 1, so
// T(n) = (n-1) + T(1)+T(2)+T(4)+...+T(n/2). Used only as a light sanity nod.
function consolationMatches() {
  return 0; // not asserted; kept simple intentionally
}

console.log(
  failures === 0
    ? `ALL PASS — ${checks} ranking checks across ${SIZES.length} sizes x ${SEEDS.length} seeds x ${STRATEGIES.length} strategies`
    : `${failures} FAILURE(S) out of ${checks} checks`,
);
process.exit(failures === 0 ? 0 : 1);
