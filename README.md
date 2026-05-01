# 2 Truths 1 Lie — Classroom Voting

Real-time classroom voting game built with Next.js 14 (App Router) + Upstash Redis REST.

## Setup

1. Install deps:
   ```
   npm install
   ```
2. Copy `.env.local.example` to `.env.local` and fill in your Upstash REST URL + token.
3. Run:
   ```
   npm run dev
   ```

## Pages

- `/` — Player (mobile)
- `/host` — Host control panel (desktop)

## Game flow

10 rounds, each round players pick Box 1/2/3. Host reveals the correct box; +1 point per correct vote. Leaderboard updates live.

## API

- `GET  /api/state`  — full game state
- `POST /api/vote`   — `{ name, answer }`
- `POST /api/reveal` — `{ correct }`
- `POST /api/next`   — start next round (or finish at round 10)
- `POST /api/reset`  — reset to round 1
