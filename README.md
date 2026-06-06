# D&D Local Projector Server

A local web app for running tabletop D&D on a projected map. One screen faces the
table (the **projector view**); the DM drives everything from a separate
**DM view**. Both connect to the same session and stay in sync in realtime.

This repo currently implements a working vertical slice (design phases 0–5).
See [design.md](design.md) for the full roadmap.

## What works today

- **Two synced views** — DM (`/dm/:id`) and projector (`/play/:id`) join the same
  session over Socket.IO; every change is broadcast live to both.
- **Auto-seeded demo** — the server boots with a `demo` session (one map, two
  tokens, initiative, sample weapons/spells). Any other id spins up a fresh
  empty session on first join.
- **Map + tokens (PixiJS)** — grid backdrop, tokens as labelled colour-coded
  circles, hover/selected states. Projector auto-fits fullscreen.
- **Token icons** — give a token an image (sidebar → *Icon*: upload a file or paste
  a URL); it renders as a circular portrait with a type-coloured ring, falling
  back to the plain circle when there's no icon.
- **Move from either screen** — tokens are draggable in **both** the DM view and
  the projector view, so players can move their own tokens on the table screen.
  (All other edits — create/delete/stats/visibility — stay DM-only.)
- **Unified item catalog (DM-authored)** — the sidebar's **Catalog** tab
  creates/edits/deletes items with a name, **custom colour**, **icon** (upload or
  URL), description, attack type, **range**, **damage**, **spell area** (type/size),
  and arbitrary **custom properties**. Weapons *and spells are both items* — a spell
  is just an item with an area shape.
- **Items & inventory** — each element has an inventory (sidebar): **add**, **drop**
  (spawns an item token on the map at the carrier), **pick up** (map item → a
  carrier's inventory), and **equip** a weapon/spell item (`equippedItemId`, which
  can be cleared back to none).
- **Attack range** — equipping a weapon/spell item shows its **range** overlay,
  rendered as a **translucent fill with a hard border on the outer edge** of the
  area (square and hex) in the item's own colour, alongside the green movement
  range. Movement-blocking obstacles also block the ranged reach.
- **Grid type & size** — the DM picks **square** or **hexagonal** and sets the cell
  size from the toolbar; the grid renders accordingly (real pointy-top hexes) and
  drives snapping + movement. *No grid (continuous)* is selectable as an early stub.
- **Background image** — the DM uploads a map picture; it's stored server-side and
  shown behind the grid on both screens.
- **Obstacles** — load a JSON obstacle file (movement / vision / both) from the DM
  toolbar; obstacles render as coloured shapes. Toggle them on the projector with
  the on-screen button or the `o` key. See [obstacle files](#obstacle-files).
- **Drag to move** — drag a token in the DM view; it snaps to the grid and moves
  on the projector instantly. Drops into a movement-blocking obstacle are rejected
  (the token snaps back).
- **Movement range** — selecting a token shows its reachable cells (BFS over the
  grid using its `speed` stat, treating other tokens **and movement-blocking
  obstacles** as blockers).
- **Element editing (DM)** — sidebar to rename, edit stats, toggle
  player-visibility, and delete the selected token; add player/monster tokens.
- **Initiative tracker** — ordered list with current-turn highlight and
  "next turn" advance (DM-editable, read-only on the projector).
- **DM popups** — push a centred message modal to every connected screen.
- **Projector safety** — DM-only tokens are hidden on the projector; the server
  rejects write actions from non-DM clients.

**Not wired up yet** (see [design.md](design.md)): fog-of-war rendering (the vision
toggle stores/broadcasts the mode but no fog overlay is drawn; vision-blocking
obstacles aren't consumed yet), attack-range overlays, an in-app obstacle drawing
editor, full *continuous / no-grid* play (it renders without a grid but still uses
a notional square grid for movement), and persistence (state is in-memory and
resets on restart — uploaded images live under `apps/server/uploads/`).

## Obstacle files

Obstacles are authored as **JSON in map-pixel coordinates** (same space as the
background image and token positions). Load one from the DM toolbar → **Load
obstacles** (it replaces the current map's obstacles). A ready-to-try sample for
the demo map is in [examples/obstacles.example.json](examples/obstacles.example.json).

The file is either a bare array of obstacles or `{ "obstacles": [ ... ] }`. Each
obstacle is:

```jsonc
{
  "type": "blocks_movement" | "blocks_vision" | "blocks_both",
  "shape": "rectangle" | "polygon" | "circle" | "line",
  "points": [ { "x": 100, "y": 100 }, { "x": 300, "y": 200 } ]
}
```

- **rectangle** — two opposite corners (red overlay = movement, blue = vision,
  purple = both).
- **polygon** — three or more vertices.
- **circle** — `[center, pointOnEdge]` (radius = distance between them).
- **line** — a polyline (drawn but, being zero-width, doesn't block cells yet).

Only `blocks_movement` / `blocks_both` obstacles currently affect movement (range
overlay + drag rejection); vision blocking is rendered but not yet computed.

## Stack

| Layer        | Tech                                            |
| ------------ | ----------------------------------------------- |
| Frontend     | React, Vite, TypeScript, PixiJS, Zustand, Tailwind |
| Realtime/API | Node, Fastify, Socket.IO                        |
| Rules engine | Pure TypeScript (grid / movement / initiative), Vitest |
| Shared       | Zod schemas as the single source of truth for types & validation |

```
apps/
  server/   Fastify + Socket.IO, in-memory session store (Prisma/Postgres later)
  web/      React + PixiJS DM and projector views
packages/
  shared/        Zod schemas, inferred types, socket event contract, constants
  rules-engine/  grid math, movement (BFS), initiative — no React/DB/sockets
```

## Prerequisites

- Node.js 20+ (tested on 24)
- npm 10+

## Run it (one command)

```bash
npm install      # first time only — installs all workspaces
npm run dev      # starts BOTH the server (:4000) and the web app (:5173)
```

Leave it running in the terminal, then open two browser windows:

- **DM view** — http://localhost:5173/dm/demo
- **Projector view** — http://localhost:5173/play/demo

Drag a token in the DM view and watch it move on the projector. Selecting a token
shows its movement range. The DM toolbar adds tokens, toggles vision mode, and
pushes popups to the table.

### Stopping it

Press **Ctrl+C** in the terminal running `npm run dev` — it tears down both the
server and the web app together (and their child processes).

If you ever started the servers in the background, or a process was left holding a
port, stop them by port from anywhere in the repo:

```bash
npm run stop     # frees ports 4000 and 5173
```

> Note: run `npm run dev` in the **foreground**. Don't background it with
> `npm run dev &` — its Ctrl+C cleanup kills its whole process group, which would
> also kill the shell that backgrounded it. To run headless, start the two pieces
> separately instead (below) and stop them with `npm run stop`.

### Run pieces individually

```bash
npm run dev:server   # Fastify + Socket.IO on http://localhost:4000  (GET /health)
npm run dev:web      # Vite dev server on http://localhost:5173
npm run stop         # stop whatever is on :4000 / :5173
```

The server seeds an in-memory `demo` session (map + two tokens) on startup, so
there's nothing to configure. Any other session id (e.g. `/dm/mygame`) spins up a
fresh empty session on first join. State is in-memory and resets when the server
restarts.

### Tests, types, formatting

```bash
npm test             # Vitest across workspaces (rules-engine)
npm run build        # typecheck + build all workspaces
npm run format       # Prettier
```

## Configuration

| Var               | Where  | Default                 | Purpose                    |
| ----------------- | ------ | ----------------------- | -------------------------- |
| `PORT`            | server | `4000`                  | Fastify/Socket.IO port     |
| `VITE_SERVER_URL` | web    | `http://localhost:4000` | Socket.IO server to dial   |

## Docker (optional, for the upcoming persistence phase)

The in-memory MVP needs no containers. `docker-compose.yml` provides PostgreSQL
(and Redis) for when persistence (design phase 10) lands:

```bash
docker compose up -d   # postgres on :5432, redis on :6379
```
