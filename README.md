# 🏆 Todo Priority Bracket

Rank your to-do list by playing a tournament. Paste your todos, pick the more
important of two items at a time, and get a complete #1-to-#N priority order.

Runs **entirely in your browser**: no backend, no accounts, nothing uploaded.

## Run it

It's a static site. The simplest options:

- **Open the deployed URL** (recommended).
- **Locally:** serve the folder with any static server, because the app loads
  `bracket.js` as an ES module (browsers block module loading over `file://`):

  ```sh
  npx serve .
  # then open the printed http://localhost:... URL
  ```

## Test the ranking engine

```sh
node test.mjs
```

This builds brackets for N = 0,1,2,3,5,7,8,10,13,16,25,32,33, simulates picks
with always-left / always-right / random strategies across multiple seeds, and
asserts every final ranking has exactly N unique items from the input.

## How the ranking works

It's a single-elimination tournament that produces a **complete** ranking, not
just a winner.

1. The N todos are seeded randomly into a bracket padded to the next power of
   two with "byes." A real item paired against a bye advances automatically;
   only real-vs-real matchups are shown to you.
2. The tournament champion is **#1** and the loser of the final is **#2**.
3. For every position after that, the real losers of each round form a tier
   that is **itself ranked by the same procedure**, a consolation
   mini-bracket. Tiers are concatenated newest-round-first (semifinal losers,
   then quarterfinal losers, and so on).
4. A loss only counts when you lose to **another real item**: losing to a bye
   doesn't push you into consolation, so consolation brackets are padded with
   their own byes and the recursion continues until every item has a spot.

Because each real item is eliminated exactly once, concatenating the tiers
yields exactly N items with no gaps and no duplicates. The match count is
deterministic for a given random seed, so the "Match X of Y" progress is exact.

## Files

- `index.html`: the whole app (markup + UI logic).
- `bracket.js`: the ranking engine (shared by the app and the tests).
- `test.mjs`: Node test suite.
