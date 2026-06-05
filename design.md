# DESIGN.md — Local D&D Projector Web Server

## 1. Project goal

Build a local web application for playing D&D on a projected map.

The system must support:

* A **projector/player view** for the table.
* A **DM view** with full control.
* Map backgrounds.
* Tokens for characters, monsters, items, and objects.
* Fog of war.
* Movement and attack ranges.
* Initiative tracking.
* Scalable game data: items, spells, weapons, classes, monsters, stats.

---

## 2. Core architecture

```text
dnd-local-server/
  apps/
    web/                  # React frontend
    server/               # Backend API + realtime server
  packages/
    shared/               # Shared TypeScript types
    rules-engine/         # Movement, vision, range, combat logic
  docs/
    DESIGN.md
    EVENTS.md
    DATA_MODEL.md
    TASKS.md
  docker-compose.yml
  README.md
```

---

## 3. Recommended tools

## 3.1 Frontend

Use:

* **React**
* **Vite**
* **TypeScript**
* **PixiJS**
* **Zustand**
* **Socket.IO Client**
* **Tailwind CSS**

Purpose:

* Render the map.
* Render tokens.
* Render fog overlays.
* Render movement and attack ranges.
* Manage UI state.
* Separate DM and projector views.

---

## 3.2 Backend

Use:

* **Node.js**
* **Fastify**
* **Socket.IO**
* **Prisma**
* **PostgreSQL**
* **Zod**

Purpose:

* Store campaigns, maps, sessions, tokens, stats.
* Send realtime state updates.
* Validate all input.
* Manage game state.

---

## 3.3 Rules engine

Use:

* **TypeScript package**
* **Vitest**
* Custom geometry/grid algorithms.

Purpose:

* Movement range.
* Attack range.
* Line of sight.
* Fog of war.
* Obstacle checks.
* Initiative rules.
* Spell/weapon range logic.

Keep this independent from React and backend.

---

## 3.4 Local deployment

Use:

* **Docker**
* **Docker Compose**
* **Ubuntu**
* **PostgreSQL container**
* **Redis container**, optional for later

Purpose:

* Easy local startup.
* Reproducible development environment.
* Later scalability.

---

## 3.5 Testing

Use:

* **Vitest** for unit tests.
* **Playwright** for browser tests.
* **ESLint**
* **Prettier**

Purpose:

* Test rules engine.
* Test map interactions.
* Test DM/player view separation.
* Test fog and visibility behavior.

---

## 3.6 AI coding agents

Use:

* **Codex CLI**
* **Claude Code**
* **Aider**
* Optional: **Playwright MCP** for browser-driven testing.

Purpose:

* Generate code.
* Refactor.
* Write tests.
* Maintain documentation.
* Implement tasks from `TASKS.md`.

---

# 4. Application views

## 4.1 Projector view

Route:

```text
/play/:sessionId
```

Purpose:

* Show only player-visible information.
* Fullscreen map display.
* Tokens visible to players.
* Fog of war applied.
* Optional sidebar.
* No DM-only controls.

Features:

* Map background.
* Token positions.
* Fog overlay.
* Selected-token movement range.
* Selected-token attack range.
* Optional initiative display.
* Optional pop-up messages from DM.

---

## 4.2 DM view

Route:

```text
/dm/:sessionId
```

Purpose:

* Full control panel for the DM.

Features:

* Full map without fog.
* Toggle player-visible fog.
* Add/edit/delete tokens.
* Move tokens.
* Edit stats.
* Manage initiative.
* Manage obstacles.
* Manage items, spells, weapons.
* Send popups to projector view.
* Switch visibility modes.

---

## 4.3 Admin/setup view

Route:

```text
/admin
```

Purpose:

* Manage campaigns and maps.

Features:

* Create campaign.
* Create session.
* Upload/select map image.
* Configure grid type.
* Configure map scale.
* Import/export data packs.

---

# 5. Data model

## 5.1 Campaign

```ts
type Campaign = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};
```

---

## 5.2 Session

```ts
type GameSession = {
  id: string;
  campaignId: string;
  name: string;
  activeMapId?: string;
  visibilityMode: "all" | "fog_of_war";
  currentTurnElementId?: string;
  createdAt: string;
  updatedAt: string;
};
```

---

## 5.3 Map

```ts
type GameMap = {
  id: string;
  campaignId: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  gridType: "square" | "hex" | "continuous";
  gridSize: number;
  obstacles: Obstacle[];
};
```

---

## 5.4 Obstacle

```ts
type Obstacle = {
  id: string;
  mapId: string;
  type: "blocks_movement" | "blocks_vision" | "blocks_both";
  shape: "polygon" | "line" | "rectangle" | "circle";
  points: Point[];
};
```

---

## 5.5 Element

Elements include players, monsters, items, traps, objects, NPCs.

```ts
type GameElement = {
  id: string;
  sessionId: string;
  mapId: string;
  type: "player" | "monster" | "npc" | "item" | "object" | "trap";
  name: string;
  iconUrl?: string;
  position: Point;
  size: number;
  visibleToPlayers: boolean;
  stats: Record<string, number | string | boolean>;
  equippedWeaponId?: string;
  selectedSpellId?: string;
};
```

---

## 5.6 Weapon

```ts
type Weapon = {
  id: string;
  name: string;
  range: number;
  damage: string;
  attackType: "melee" | "ranged";
  properties: string[];
};
```

---

## 5.7 Spell

```ts
type Spell = {
  id: string;
  name: string;
  range: number;
  areaType?: "single" | "cone" | "sphere" | "line" | "cube";
  areaSize?: number;
  description: string;
};
```

---

## 5.8 Initiative entry

```ts
type InitiativeEntry = {
  id: string;
  sessionId: string;
  elementId: string;
  initiative: number;
  order: number;
  hasActed: boolean;
};
```

---

# 6. Realtime events

Use Socket.IO.

## 6.1 Client to server

```text
session:join
map:select
map:update-grid
token:create
token:update
token:move
token:delete
token:select
obstacle:create
obstacle:update
obstacle:delete
initiative:start
initiative:update
initiative:next-turn
visibility:set-mode
dm:send-popup
```

---

## 6.2 Server to client

```text
session:state
map:updated
token:created
token:updated
token:moved
token:deleted
token:selected
range:updated
fog:updated
initiative:updated
visibility:updated
dm:popup
error
```

---

# 7. Feature plan

# Phase 0 — Repository setup

## Goal

Create the project skeleton.

## Tasks

### 0.1 Initialize repository

* Create monorepo.
* Add `apps/web`.
* Add `apps/server`.
* Add `packages/shared`.
* Add `packages/rules-engine`.
* Add `docs`.

### 0.2 Tooling

* Configure TypeScript.
* Configure ESLint.
* Configure Prettier.
* Configure Vitest.
* Configure Docker Compose.

### 0.3 Shared package

* Add shared types.
* Add Zod schemas.
* Export common constants.

## Output

```text
Working repo skeleton.
Frontend starts.
Backend starts.
Shared package imports correctly.
```

---

# Phase 1 — Basic local server

## Goal

Run the application locally with a DM view and projector view.

## Tasks

### 1.1 Backend server

* Create Fastify server.
* Add health route.
* Add Socket.IO server.
* Add basic session state in memory.

### 1.2 Frontend routes

* Add `/dm/:sessionId`.
* Add `/play/:sessionId`.
* Add basic layout.
* Connect to Socket.IO.

### 1.3 Session state sync

* Join session.
* Receive session state.
* Broadcast token updates.

## Output

```text
Two browser windows can connect to the same session.
DM actions update projector view.
```

---

# Phase 2 — Map rendering

## Goal

Display a map image with tokens.

## Tasks

### 2.1 Map canvas

* Add PixiJS canvas.
* Load map background.
* Fit map to screen.
* Support pan and zoom in DM view.
* Lock projector view to fullscreen mode.

### 2.2 Token rendering

* Render tokens as icons or circles.
* Add labels.
* Add hover state.
* Add selected state.

### 2.3 Token movement

* Drag tokens in DM view.
* Broadcast movement.
* Update projector view.

## Output

```text
DM can move tokens on a map.
Projector view updates in realtime.
```

---

# Phase 3 — Game elements and stats

## Goal

Support players, monsters, items, objects, and stats.

## Tasks

### 3.1 Element model

* Add element type.
* Add generic stats field.
* Add visibility flag.
* Add size field.
* Add icon field.

### 3.2 Element sidebar

* Add selected element panel.
* Show name, type, position, stats.
* Allow DM to edit stats.
* Projector sidebar is read-only or hidden.

### 3.3 Element creation

* Create player.
* Create monster.
* Create item.
* Create object.
* Delete element.

## Output

```text
DM can create and edit map elements.
Projector only sees allowed elements.
```

---

# Phase 4 — Initiative tracker

## Goal

Track combat turns.

## Tasks

### 4.1 Initiative data

* Add initiative entries.
* Add initiative order.
* Add current turn.

### 4.2 DM initiative UI

* Add initiative panel.
* Add/remove elements.
* Set initiative values.
* Sort by initiative.
* Advance turn.

### 4.3 Projector initiative display

* Optional initiative bar/sidebar.
* Highlight active token.

## Output

```text
DM can run combat order.
Current turn is visible.
```

---

# Phase 5 — Movement range

## Goal

Show where a selected character can move.

## Tasks

### 5.1 Grid abstraction

Support:

* Square grid.
* Hex grid.
* Continuous mode.

### 5.2 Movement algorithm

* Implement Dijkstra or BFS for grid movement.
* Account for movement stat.
* Account for blocked cells.
* Return reachable area.

### 5.3 Movement rendering

* Draw movement overlay.
* Update when token is selected.
* Hide when token is deselected.

## Output

```text
Selecting a token shows valid movement range.
Obstacles block movement.
```

---

# Phase 6 — Attack range

## Goal

Show attack range based on weapon or spell.

## Tasks

### 6.1 Weapon model

* Add weapon range.
* Add attack type.
* Add damage.
* Add equipped weapon.

### 6.2 Spell model

* Add spell range.
* Add area type.
* Add area size.
* Add selected spell.

### 6.3 Range algorithm

* Calculate melee range.
* Calculate ranged weapon range.
* Calculate spell range.
* Check obstacles that block vision.
* Support area shapes later.

### 6.4 Range rendering

* Draw attack overlay.
* Use different overlay from movement.
* Update when selected weapon/spell changes.

## Output

```text
Selecting a token shows attack range based on equipment.
```

---

# Phase 7 — Obstacles

## Goal

Allow the DM to define map obstacles.

## Tasks

### 7.1 Obstacle editor

* Draw polygon.
* Draw rectangle.
* Draw line.
* Delete obstacle.
* Edit obstacle type.

### 7.2 Movement blocking

* Obstacles can block movement.
* Movement range respects blocked areas.

### 7.3 Vision blocking

* Obstacles can block line of sight.
* Attack range and fog respect vision blockers.

## Output

```text
DM can draw walls and blocked zones.
Movement and visibility calculations use them.
```

---

# Phase 8 — Fog of war

## Goal

Hide unexplored or non-visible areas from the projector view.

## Tasks

### 8.1 Visibility modes

Support:

```text
all
fog_of_war
```

### 8.2 Vision algorithm

* Use character position.
* Use vision radius.
* Use obstacles.
* Compute visible polygon or visible cells.

### 8.3 Fog rendering

* Render dark overlay.
* Cut visible areas.
* Update dynamically when tokens move.
* DM view can toggle preview.

## Output

```text
Projector view only shows areas visible to characters.
DM view can see everything.
```

---

# Phase 9 — DM popups and sidebar modes

## Goal

Allow flexible information display.

## Tasks

### 9.1 Sidebar modes

Support:

* Static sidebar.
* Collapsible sidebar.
* Floating dialog.
* Hidden.

### 9.2 DM popup

* DM writes message.
* DM sends popup to projector.
* Projector shows modal.
* Modal can be dismissed.

### 9.3 Selected element info

* Show selected player/monster stats.
* Show item description.
* Show attack/movement information.

## Output

```text
DM can control what information appears on the projector.
```

---

# Phase 10 — Persistence

## Goal

Save and load game state.

## Tasks

### 10.1 Database schema

Create tables:

* Campaigns
* Sessions
* Maps
* Elements
* Weapons
* Spells
* Items
* Obstacles
* InitiativeEntries

### 10.2 Prisma

* Define schema.
* Add migrations.
* Add seed data.

### 10.3 Save/load

* Save session state.
* Load session state.
* Autosave after DM actions.

## Output

```text
Game state persists after server restart.
```

---

# Phase 11 — Import/export packs

## Goal

Make the app scalable for game content.

## Tasks

### 11.1 JSON pack format

Support imports for:

* Monsters
* Items
* Weapons
* Spells
* Classes

### 11.2 Import UI

* Upload JSON file.
* Validate with Zod.
* Show import summary.

### 11.3 Export UI

* Export campaign.
* Export session.
* Export content pack.

## Output

```text
Content can be reused across campaigns.
```

---

# Phase 12 — Testing

## Goal

Stabilize the app.

## Tasks

### 12.1 Unit tests

Test:

* Movement range.
* Attack range.
* Obstacle collision.
* Line of sight.
* Initiative sorting.

### 12.2 Browser tests

Test:

* DM opens map.
* Projector opens map.
* Token movement syncs.
* Fog hides hidden areas.
* Initiative advances.

### 12.3 Manual test checklist

Create:

```text
docs/MANUAL_TESTS.md
```

## Output

```text
Core mechanics have automated and manual tests.
```

---

# 8. Implementation task breakdown

## Sprint 1 — Skeleton

* [ ] Create repo.
* [ ] Add Vite React app.
* [ ] Add Fastify server.
* [ ] Add shared package.
* [ ] Add rules-engine package.
* [ ] Add Docker Compose.
* [ ] Add README startup instructions.

---

## Sprint 2 — Realtime map

* [ ] Add Socket.IO.
* [ ] Add session join event.
* [ ] Add map background.
* [ ] Add token rendering.
* [ ] Add token movement.
* [ ] Sync DM and projector views.

---

## Sprint 3 — DM tools

* [ ] Add DM sidebar.
* [ ] Add token create/edit/delete.
* [ ] Add stats editor.
* [ ] Add visibility flag.
* [ ] Add projector-safe view.

---

## Sprint 4 — Initiative

* [ ] Add initiative model.
* [ ] Add initiative UI.
* [ ] Add turn advance.
* [ ] Highlight active token.
* [ ] Sync initiative to projector.

---

## Sprint 5 — Movement and attack range

* [ ] Add grid model.
* [ ] Add movement stat.
* [ ] Implement movement range.
* [ ] Add weapon range.
* [ ] Add spell range.
* [ ] Render overlays.

---

## Sprint 6 — Obstacles

* [ ] Add obstacle model.
* [ ] Add obstacle drawing tools.
* [ ] Implement movement blocking.
* [ ] Implement vision blocking.
* [ ] Persist obstacles.

---

## Sprint 7 — Fog of war

* [ ] Add visibility mode.
* [ ] Add vision radius.
* [ ] Implement fog calculation.
* [ ] Render fog overlay.
* [ ] Add DM preview toggle.

---

## Sprint 8 — Persistence and content

* [ ] Add PostgreSQL.
* [ ] Add Prisma schema.
* [ ] Add migrations.
* [ ] Save/load sessions.
* [ ] Add import/export JSON packs.

---

# 9. AI agent task files

Create:

```text
docs/agents/
  supervisor.md
  frontend-agent.md
  backend-agent.md
  rules-engine-agent.md
  qa-agent.md
```

---

## 9.1 Supervisor agent

Responsibilities:

* Break design into implementation tasks.
* Keep files consistent.
* Review code.
* Avoid scope creep.

Prompt:

```text
You are the supervisor agent for this D&D local projector app.
Read DESIGN.md and TASKS.md.
Break work into small implementation steps.
Do not implement features directly unless requested.
Keep architecture consistent.
```

---

## 9.2 Frontend agent

Responsibilities:

* React app.
* PixiJS rendering.
* DM view.
* Projector view.
* UI components.

Prompt:

```text
You are the frontend agent.
Work only in apps/web and packages/shared unless needed.
Implement React + PixiJS features.
Keep projector view clean and fullscreen.
Keep DM controls separate from player view.
Write tests when possible.
```

---

## 9.3 Backend agent

Responsibilities:

* Fastify API.
* Socket.IO events.
* Session state.
* Prisma persistence.

Prompt:

```text
You are the backend agent.
Work in apps/server and packages/shared.
Implement API routes, Socket.IO events, validation, and persistence.
All input must be validated with Zod schemas.
Do not put game rules directly in the server.
Use packages/rules-engine for game calculations.
```

---

## 9.4 Rules-engine agent

Responsibilities:

* Movement.
* Attack range.
* Fog.
* Obstacles.
* Initiative sorting.

Prompt:

```text
You are the rules-engine agent.
Work mainly in packages/rules-engine.
Create pure TypeScript functions.
No React.
No database access.
No Socket.IO.
Everything must be unit tested with Vitest.
```

---

## 9.5 QA agent

Responsibilities:

* Unit tests.
* Browser tests.
* Manual checks.

Prompt:

```text
You are the QA agent.
Create Vitest and Playwright tests.
Test core flows from the DM and projector perspectives.
Prioritize regressions in movement, fog, initiative, and realtime sync.
```

---

# 10. First implementation commands

```bash
mkdir dnd-local-server
cd dnd-local-server
git init

mkdir -p apps packages docs
npm create vite@latest apps/web -- --template react-ts

mkdir -p apps/server/src
mkdir -p packages/shared/src
mkdir -p packages/rules-engine/src
mkdir -p docs/agents

touch README.md
touch docs/DESIGN.md
touch docs/TASKS.md
touch docs/EVENTS.md
touch docs/DATA_MODEL.md
```

---

# 11. First AI-agent command

Use this after creating the repository:

```text
Read docs/DESIGN.md.
Create the initial monorepo setup for the project.

Implement:
- React + Vite frontend in apps/web
- Fastify backend in apps/server
- Shared TypeScript types in packages/shared
- Empty rules-engine package in packages/rules-engine
- Docker Compose with PostgreSQL
- README with local startup instructions

Do not implement fog of war yet.
Do not implement combat rules yet.
Keep the first milestone focused on running frontend and backend locally.
```

---

# 12. Definition of done for MVP

The MVP is complete when:

* DM can open a map.
* Projector can show the same map.
* DM can place and move tokens.
* Projector updates in realtime.
* DM can edit basic stats.
* Initiative tracker works.
* Movement range is shown.
* Attack range is shown.
* Obstacles can block movement.
* Fog of war hides non-visible areas.
* Session state persists locally.
