# @skz/shared

Game logic that runs in **both** the web app and the Discord bot. Pure JS — no React, no DOM, no Node-only APIs.

## What lives here

- `answer.js` — `normalizeAnswer`, `isAnswerCorrect`. The single source of truth for whether a guess matches a puzzle answer.
- `puzzle.js` — `getTodayKey`, `getDailyIndex`, `pickDailyPuzzle`. The deterministic daily-puzzle picker so today's "Daily Song Guess" is the same song on the website and in Discord.

## What does NOT live here

- React components, hooks, CSS — those stay in `apps/web/`.
- `localStorage`-backed helpers (saved state, recent-pick history) — web-only.
- Supabase clients — see `packages/supabase-client/` if/when added.

## Current state

This package is **deliberately minimal**. As the Discord bot grows, more helpers will land here. The web app still has its own copies in `apps/web/src/utils/` for backwards compat; those should be deduped to import from here in a follow-up refactor.

## Adding something here

Before moving code in, ask: does this need to run in Node (bot, scripts) AND a browser (web)? If yes, it belongs here. If it touches `window`, `localStorage`, the DOM, React, or anything else environment-specific, it does NOT belong here.
