# Hell Dice Shooter

**A 2.5D runner shooter where poker hands reroll your arsenal — built for Reddit's Games with a Hook Hackathon on Devvit.**

---

## Play Now

### [Play on r/Hell_Dice_Shooter](https://www.reddit.com/r/Hell_Dice_Shooter/comments/1usjmqe/helldiceshooter/)

Open the latest **hell-dice-shooter** interactive post in the subreddit feed, then tap **Play** on the splash screen.

> **For judges:** The game runs inside a Reddit custom post (Devvit Web). No install or download required — play directly in the browser.

---

## Logline

Sprint through an endless hell corridor, farm dice, roll Yatzy hands to swap weapons, survive bosses, and leave tombstones for other players — all without leaving Reddit.

---

## Key Features

### Subreddit Global Weekly Quota (Dynamic Community Goal)

Every run contributes validated monster kills to a **shared subreddit weekly defense meter** stored in Redis.

- The community works toward a **dynamic kill target** (default **50,000**).
- **Hit the goal** → next week's target scales up and a **starting-dice buff** unlocks for everyone.
- **Miss the goal** → the target eases next week so the loop stays achievable.
- Progress is visible on the **game-over screen** and in **Battle Report** Reddit comments.

This turns solo runs into a lightweight **co-op pressure valve**: your kills matter to the whole subreddit.

### Asynchronous Social Mechanics (Tombstone System)

When you die, your run can leave a **persistent tombstone** on the map for other players.

- **One tombstone per user per post** — your furthest run (`triggerMs`) wins; shorter deaths do not overwrite it.
- **Minimum 30 seconds** of survival required before a tombstone is placed.
- Other runners pick up tombstones in a **Y-axis proximity band**, triggering a reward modal (coins, merged tombstones, dice roll → **Fever Time**).
- Tombstones are **post-scoped** and fetched via `api/tombstone/list`; no realtime server required.

Death becomes content other players interact with asynchronously.

### Reddit-Native Flow (Explicit Action + Smart Cooldown)

Battle reports are posted as **real Reddit comments under the player's username** (`runAs: "USER"`), but only after an **explicit opt-in** on the game-over screen — satisfying Devvit's **Explicit Action** policy.

| Action | Trigger |
|--------|---------|
| Tombstone save | Automatic on game over (no consent needed) |
| Leaderboard submit | Automatic on **new personal best** |
| Reddit comment | **Player taps "Send Battle Report"** |

**Anti-spam cooldowns** (per user, per post):

| Report type | Cooldown |
|-------------|----------|
| New record | **5 minutes** |
| Regular run | **30 minutes** |

Comment copy adapts to context (new record vs. standard run) and **omits tombstone language** if the run was under 30 seconds — even on a score record.

---

## Core Gameplay Loop

1. **Run** — 2.5D corridor runner with combos, fog, and escalating spawns.
2. **Farm** — Collect dice, coins, health, and ammo pickups.
3. **Yatzy Time** — Roll 5 dice, hold/reroll, spend dice to equip a weapon tier from poker hands.
4. **Boss chests** — Periodic boss clears with loot choices.
5. **Die** — Game over modal: leaderboard, weekly defense card, optional Battle Report.

---

## Tech Stack

| Layer | Stack |
|-------|--------|
| Game client | **Phaser 3.90**, TypeScript, Vite |
| HUD / modals | DOM overlay on 1280×720 design space (`HudViewportSync`) |
| Server | **Devvit Web** Node server (`@devvit/web`), esbuild → `dist/server` |
| Storage | **Redis** (persistence, leaderboards, tombstones, weekly defense) |
| API contract | Shared types in `src/shared/api.ts` |

---

## Development

### Prerequisites

- **Node.js 22+**
- Reddit developer account + Devvit CLI

### Commands

```bash
npm install
npm run playtest          # build, upload, watch — local Devvit playtest
npm run playtest r/Hell_Dice_Shooter   # optional target subreddit
npm run build             # client (Vite) + server (esbuild)
npm run test              # types + lint + unit tests + build
npm run test:unit         # server API tests only
npm run deploy            # build + devvit upload
```

### Project layout

| Path | Purpose |
|------|---------|
| `src/client/game/` | Phaser scenes, systems, DOM UI |
| `src/server/` | Devvit API routes, Redis logic |
| `src/shared/` | API types, tombstone & weekly-defense config |
| `public/locale/strings.csv` | i18n (EN default) |
| `devvit.json` | App manifest & permissions |

See [`AGENTS.md`](./AGENTS.md) for contributor-oriented architecture notes.

---

## Permissions (Devvit)

Configured in `devvit.json`:

- `redis` — user persistence, leaderboards, tombstones, weekly defense
- `reddit.asUser: ["SUBMIT_COMMENT"]` — enables `reddit.submitComment({ runAs: "USER" })` for Battle Reports

> **Note:** The runtime error mentions `PERMISSION_SCOPE_NAME` as a placeholder. The actual `devvit.json` enum (Devvit 0.13.x schema) is **`SUBMIT_COMMENT`**, not lowercase `"submit"`. Using `"submit"` fails config validation.

---

## License

BSD-3-Clause (see package metadata).
