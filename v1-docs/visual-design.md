# Dungeons & Dragons Campaign Manager — Visual Proof of Concept

## 1. Project purpose

This project is a web-based visual companion and control system for managing **Dungeons & Dragons campaigns**.

The main goal is to support a mixed **digital-physical tabletop experience**, where the Dungeon Master manages the campaign state from a control interface, players access a read-only companion interface, and a clean map view is projected onto a table or screen during live sessions.

The project is divided into three main views:

| View | Main user | Purpose |
|---|---|---|
| **Player View** | Players | Read-only companion site with instructions, public information, and visible element cards. |
| **Map View** | Projected table/screen | Clean live rendering of the current game state: map, tokens, fog, ranges, messages, etc. |
| **DM View** | Dungeon Master | Main control center for database management, map management, live session state, visibility, and projection output. |

---

## 2. General conceptual model

The whole application revolves around a shared **current state**.

The current state contains:

- Active campaign.
- Active map.
- Active session.
- Database entries relevant to the current session.
- Elements currently present on the map.
- Current HP, conditions, initiative, inventory, and positions.
- Visibility state for players.
- Fog of war state.
- Obstacle configuration.
- Range visualization configuration.
- Messages currently being shown on the projected map.

The three views consume this state differently:

```text
Shared Current State
│
├── Player View
│   └── Read-only, filtered, player-visible information
│
├── Map View
│   └── Clean projection output with no controls
│
└── DM View
    └── Full control and editing authority
```

The DM is the only user allowed to create, modify, reveal, hide, configure, or broadcast content.

---

# 3. Player View

## 3.1 Purpose

The Player View is a **read-only campaign companion web page**.

It is meant to help players access:

- Game instructions.
- Rules.
- Public lore.
- Public campaign information.
- Their own character information.
- Visible characters, monsters, items, locations, conditions, and actions.
- Recently updated or newly revealed content.

Players do **not** control the map or database.

The DM controls which information is visible, partially visible, or hidden.

---

## 3.2 Visual style

The Player View should combine:

- A clean documentation layout similar to **Read the Docs** or **Quarto**.
- Light fantasy decoration.
- Parchment or ivory backgrounds.
- Elegant serif headings.
- Clear navigation.
- Fantasy-styled cards for characters, monsters, items, and other elements.

Recommended style mix:

| Area | Style |
|---|---|
| Instructions pages | Clean documentation with subtle fantasy accents. |
| Element cards | Stronger fantasy style, ornate frames, illustrations, parchment surfaces. |
| Navigation | Clean, readable, restrained. |
| Notifications | Small badges, not intrusive. |

---

## 3.3 Player View top navigation

The Player View should include an upper navigation bar.

Suggested contents:

```text
[Campaign Logo] Shadows of Driftwood    Instructions    Elements    Updates    [Search]    [Notifications]
```

### Top bar elements

| Element | Purpose |
|---|---|
| Campaign logo / crest | Identifies the campaign. |
| Campaign name | Shows the current campaign context. |
| Instructions tab | Opens documentation/rules/lore pages. |
| Elements tab | Opens the element card browser. |
| Updates tab | Shows newly revealed or recently changed content. |
| Search bar | Allows players to find rules, lore, items, characters, monsters, etc. |
| Notification icon | Shows unread updates or newly revealed information. |

---

## 3.4 Instructions section

The Instructions section is a documentation-like area.

It contains general and campaign-specific instructions, but only information visible to players.

It should not expose hidden session information, unrevealed monsters, secret locations, DM notes, or private database content.

### Layout

The Instructions page should use a three-column documentation layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Top navigation bar                                           │
├───────────────┬──────────────────────────────┬───────────────┤
│ Doc tree      │ Main article content          │ Page helpers   │
│ left sidebar  │                              │ right sidebar  │
└───────────────┴──────────────────────────────┴───────────────┘
```

### Left documentation tree

The left sidebar contains a nested documentation tree.

Suggested sections:

```text
Documentation
├── Getting Started
│   ├── Welcome
│   └── How to Play
│
├── Rules
│   ├── Core Concepts
│   └── Dice & Checks
│
├── Combat
│   ├── Combat Overview
│   ├── Initiative
│   └── Actions
│       ├── Attack Action
│       ├── Cast a Spell
│       ├── Dash Action
│       └── Disengage Action
│
├── Magic
├── Conditions
├── Lore
└── Elements
```

### Main content area

The center panel renders the selected documentation page.

Example page: **Attack Action**.

Suggested content structure:

- Breadcrumbs: `Combat > Actions > Attack Action`.
- Page title with icon.
- Introductory paragraph.
- Section headings.
- Note/admonition boxes.
- Inline links to element cards or other instructions.
- “See Also” references.

Example inline links:

- `Longsword` → opens item card.
- `Goblin` → opens monster card.
- `Poisoned` → opens condition page.
- `Attack Action` → opens relevant rule page.

### Right helper sidebar

The right sidebar can include:

- “On this page” section anchors.
- Recently updated pages.
- New or updated badges.

Example:

```text
ON THIS PAGE
- How It Works
- Example
- See Also

RECENT UPDATES
- Attack Action       NEW
- Grapple             UPDATED
- Poisoned Condition  UPDATED
```

---

## 3.5 Elements Cards section

The Elements section lets players browse visible campaign elements.

Elements can include:

- Player characters.
- NPCs.
- Monsters.
- Items.
- Locations.
- Factions.
- Conditions.
- Actions.
- Abilities.
- Rules references.

### Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Top navigation bar                                           │
├───────────────┬──────────────────────────────────────────────┤
│ Element tree  │ Selected element card                         │
└───────────────┴──────────────────────────────────────────────┘
```

### Left element tree

Suggested structure:

```text
Elements
├── Characters
│   ├── Martillo
│   ├── Rogue
│   └── Eldrin
│
├── Items
│   ├── Weapons
│   │   └── Longsword
│   ├── Armor
│   └── Adventuring Gear
│
├── Monsters
│   ├── Goblin
│   ├── Wolf
│   └── Orc
│
├── Locations
└── Conditions
```

### Element card design

Element cards should be visually richer than documentation pages.

They should look like fantasy-themed reference cards while remaining clear UI components.

A generic element card may include:

- Illustration or portrait.
- Name.
- Type/subtitle.
- Description.
- Tags.
- Main stats.
- Current session state.
- Related items.
- Related rules/actions.
- Visible/hidden details.

---

## 3.6 Example: sword item card

Example card: **Longsword**.

Suggested contents:

```text
Longsword
Martial Melee Weapon

Description:
A balanced weapon, long favored by knights and warriors. Forged for both offense and defense.

Tags:
- Weapon
- Steel
- Versatile

Stats:
- Damage: 1d8 slashing
- Versatile: 1d10
- Weight: 3 lb
- Value: 15 gp
- Rarity: Common

Session Info:
- Current State: Pristine
- Owner: Unassigned
- Actions: Attack Action
- Rules: Combat Rules
```

Visual treatment:

- Tall parchment-style card.
- Large sword illustration.
- Ornate border.
- Compact stat row.
- Blue link chips for related rules/actions.
- Green status chip for current state.

---

## 3.7 Example: character card — Martillo

Example card: **Martillo**.

Suggested contents:

```text
Martillo
Mountain Dwarf • Fighter

Description:
A steadfast dwarf of the high mountains, Martillo stands unshakable in the front line.

Tags:
- Dwarf
- Humanoid
- Darkvision
- Defender

Stats:
- AC: 18
- HP: 42
- Speed: 25 ft
- Level: 4
- Initiative: +1

Session Info:
- Current State: Healthy
- Condition: Ready
- Inventory: Warhammer, Shield, Chain Mail
- Actions & Abilities: Hammer Strike, Second Wind, Stonecunning
```

Visual treatment:

- Heroic fantasy portrait.
- Heavy armor and warhammer.
- Ornate parchment card.
- Compact stats section.
- Inventory chips.
- Ability/action chips.

---

## 3.8 Visibility states in Player View

Every page, card, and field can have visibility controlled by the DM.

Suggested visibility states:

| State | Meaning | Player output |
|---|---|---|
| **Visible** | Fully revealed. | Full content is shown. |
| **Partial** | Known but incomplete. | Some fields are hidden or summarized. |
| **Hidden** | Not revealed. | Content is omitted or replaced by an “Unknown” placeholder. |
| **New** | Recently revealed. | Badge or notification. |
| **Updated** | Recently changed. | Badge or update marker. |

Example monster partial reveal:

```text
Goblin Shaman
Status: Partially revealed

Known:
- Small humanoid.
- Uses magic.
- Seen near the ruins.

Hidden:
- HP.
- Weaknesses.
- Spells.
```

---

# 4. Map View

## 4.1 Purpose

The Map View is the clean projected game surface.

It is designed primarily for **table projection**.

It should show the current game state without exposing configuration controls.

The Map View should not include:

- Buttons.
- Menus.
- Side navigation.
- Configuration toggles.
- Editable fields.
- Player interaction controls.

All configuration is controlled from the DM View.

---

## 4.2 Core visual principle

```text
Map View = rendered game state only
DM View = control and configuration
```

The Map View should feel like a live board, not a web app dashboard.

---

## 4.3 Table projection layout

The map should be centered in the viewport.

Any area outside the map image should be black or empty.

```text
┌──────────────────────────────────────────────┐
│                  black area                  │
│      ┌────────────────────────────────┐      │
│      │                                │      │
│      │             MAP                │      │
│      │                                │      │
│      └────────────────────────────────┘      │
│                  black area                  │
└──────────────────────────────────────────────┘
```

Reasons:

- Avoids distractions during projection.
- Works with maps of different sizes and aspect ratios.
- Keeps the projected table clean.
- Avoids decorative backgrounds outside the playable area.

---

## 4.4 Basic map state

The basic map state includes:

- Map image.
- Elements/tokens on top of the map.

Example basic state:

- 2 player tokens.
- 2 monster tokens.
- No fog.
- No range overlays.
- No obstacle overlays.
- No initiative panel.
- No messages.

Tokens should be simple and projection-readable:

```text
Colored circle
+ central icon
+ optional small initial
+ optional status ring
```

Suggested token colors:

| Token type | Color |
|---|---|
| Player character | Blue / teal |
| Monster / enemy | Red / orange |
| NPC | Yellow / neutral |
| Item / object | Green |
| Magical / unknown | Purple |

---

## 4.5 Coordinate systems

Each map can use one coordinate system.

Supported systems:

- Square grid.
- Hexagonal grid.
- Free positioning.

For grid or hex maps:

- Cell size is configurable by the DM.
- Grid visibility is controlled by the DM.
- Grid is shown or hidden in Map View depending on DM configuration.
- Map elements must be assigned to cells for logical consistency.

### Coordinate coherence rule

If an element, obstacle, or monster partially occupies a cell, that cell is considered occupied.

Example:

```text
If an obstacle visually covers half a grid cell,
the system treats the whole cell as occupied.
```

This simplifies movement, range, visibility, and collision logic.

---

## 4.6 Obstacles

Obstacles can affect:

- Visibility.
- Movement.
- Both visibility and movement.

Obstacles can be:

- Fixed map features.
- Temporary objects.
- Mobile elements.
- Drawn shapes.
- Cell-based zones.

The DM can choose whether obstacles are visible in Map View.

### Suggested obstacle visualization

| Obstacle type | Suggested visual style |
|---|---|
| Blocks visibility | Blue/purple translucent overlay or hatch. |
| Blocks movement | Orange translucent overlay. |
| Blocks both | Dark red translucent overlay. |
| Partial block | Lower opacity or dashed border. |

Use both color and shape/pattern where possible, because projection conditions may reduce color clarity.

---

## 4.7 Fog of war

Fog of war hides unrevealed parts of the map.

Controlled by the DM.

Possible visibility states:

| State | Visual output |
|---|---|
| Currently visible | Normal map brightness. |
| Previously explored | Dimmed but recognizable. |
| Unknown/unseen | Very dark or black overlay. |

Fog visibility depends on:

- Character positions.
- Character vision radius.
- Obstacles.
- Map coordinate system.
- Visibility-blocking features.

The revealed shape should not always be a perfect circle; walls and obstacles should cut or block the visible area.

---

## 4.8 Ranges

Ranges are colored overlays around characters, monsters, or objects.

Examples:

- Vision range.
- Attack range.
- Spell range.
- Aura range.
- Ability range.

Multiple ranges can be shown for the same element.

Layering rule:

```text
Largest / broadest range at the bottom
Smaller / more specific ranges above
Token above all range overlays
```

Example:

```text
Vision range: pale blue, low opacity
Attack range: pale red, medium opacity
Spell range: pale purple, medium opacity
```

Ranges must respect obstacles. If a wall blocks visibility or attack, the range overlay should be interrupted.

---

## 4.9 Initiative panel

The initiative panel is optional and controlled by the DM.

It should be projection-safe:

- Compact.
- High contrast.
- Minimal.
- No buttons.
- No configuration options.

Suggested content:

```text
INITIATIVE
1. Fighter    HP 24/24    Ready
2. Rogue      HP 18/18    Ready
3. Wolf       HP 11/11    Ready
4. Goblin     HP 7/7      Ready
```

Possible placement:

- Right side for screen projection.
- Hidden or minimal for table projection.
- Bottom/top compact bar if needed for table use.

---

## 4.10 Messages

The DM can send messages to the projected Map View.

Messages can be targeted to:

- The center of the table.
- All players.
- One specific player.
- A specific side of the physical table.
- A specific map element or token.

Message types:

- Text.
- Images.
- GIFs.
- Element cards.
- Dramatic overlays.

Examples:

```text
DEFEATED
```

```text
You hear movement behind the ruined gate.
```

```text
Stonecunning card displayed in the center of the map.
```

For table projection, direction and position matter. A message for one player should appear near that player’s physical side of the table.

---

## 4.11 Map View configuration examples

The same game state can be rendered in several configurations:

### 0. Basic map

- Map only.
- 2 character tokens.
- 2 monster tokens.
- No special overlays.

### 1. Basic map + fog of war + range

- Map darkened with fog.
- Visible areas around characters.
- One range overlay shown.
- Obstacles affect the visible shape.

### 2. Basic map + obstacles

- Map and tokens.
- Colored obstacle overlays.
- Visibility-blocking, movement-blocking, and mixed blockers shown.

### 3. Basic map + initiative panel

- Map and tokens.
- Compact initiative panel.
- Current HP and status shown.

### 4. Basic map + message + card

- Map and tokens.
- Targeted “DEFEATED” message near one player.
- Element card displayed in the center.

---

# 5. DM View

## 5.1 Purpose

The DM View is the main control interface.

It combines:

- Database management.
- Current state management.
- Map management.
- Map projection control.
- Player visibility control.
- Real-time session editing.
- Message broadcasting.
- Combat tracking.
- Reference card access.

It is the most complex view.

---

## 5.2 Visual style

The DM View should remain visually simple.

Recommended style:

- Light, clean, documentation-like interface.
- Subtle borders.
- Compact panels.
- Clear typography.
- Minimal fantasy decoration.
- Fantasy visuals only inside map/card content.

The DM View should prioritize information density and usability over immersion.

---

## 5.3 Workspace model

The DM View is composed of small movable and resizable windows/panels.

Each panel can support a different task.

Panels should be:

- Movable.
- Resizable.
- Dockable.
- Fullscreen-capable.
- Arrangeable into grids.
- Arrangeable into columns.
- Capable of overlapping.
- Capable of multiple instances where appropriate.

Example:

```text
DM Workspace
│
├── Left icon bar
├── Open window tabs
└── Movable/resizable windows
    ├── Map Elements
    ├── Database Visibility
    ├── Current State
    ├── Martillo Editor
    ├── Map Messages
    ├── Goblin Card
    └── Session Log
```

---

## 5.4 Left window bar

The left side should include a vertical icon bar similar to VS Code.

Each icon opens a window type.

Suggested icons/windows:

| Icon/window | Purpose |
|---|---|
| Database | Opens database visibility/visualization window. |
| State | Opens current session state window. |
| Editor | Opens database/current element editor. |
| Map | Opens map elements window. |
| Obstacles | Opens obstacle editor. |
| Map Config | Opens map configuration window. |
| Messages | Opens map messages window. |
| Cards | Opens element card reference window. |
| Log | Opens session log/history window. |

Some windows can be opened multiple times, such as element cards.

Some windows should only open once, such as map configuration.

---

## 5.5 Window tabs

At the top of the workspace, open windows should appear as tabs.

Example:

```text
[Map Elements] [Database Visibility] [Current State] [Martillo Editor] [Map Messages] [Goblin Card] [+]
```

Purpose:

- Fast switching between open windows.
- Shows what is active.
- Allows multiple reference windows.
- Allows closing or reopening panels.

Each window should also have its own title bar with basic controls:

- Minimize.
- Maximize/fullscreen.
- Close.
- Optional context menu.

---

## 5.6 Current State window

The Current State window is central to live play.

It combines session overview and initiative/combat tracking.

Suggested contents:

### Session overview

- Active map.
- Current round.
- Current turn.
- Active encounter.
- Number of players.
- Live session indicator.

Example:

```text
Current State

Active Map: Ruined Watchtower (Main Floor)
Round: 2
Current Turn: Martillo
Session: LIVE
```

### Initiative order

The initiative tracker should include:

- Turn order.
- Token/icon.
- Name.
- Initiative modifier or order value.
- Current HP.
- HP bar.
- Status.
- Current-turn marker.

Example:

```text
Initiative Order
▶ Martillo   +1   42/42   Ready
  Rogue      +0   28/34
  Wolf       -1   11/11
  Goblin     -1   7/7
```

### Actions

DM-only actions:

- Next Turn.
- End Encounter.
- Reorder initiative.
- Apply status.
- Edit HP.
- Highlight active token.
- Show/hide initiative panel on projection.

---

## 5.7 Database visualization window

The Database Visualization window controls what exists in the campaign database and what players can see.

It should contain a full tree of database entries.

Suggested sections:

```text
Database Visibility
├── Characters
│   ├── Martillo
│   ├── Rogue
│   └── Eldrin
│
├── Items
│   ├── Longsword
│   ├── Shield
│   ├── Stonecunning
│   └── Chain Mail
│
├── Monsters
│   ├── Goblin
│   ├── Wolf
│   └── Orc
│
├── Rules
├── Locations
│   ├── Ruined Watchtower
│   ├── Hidden Chamber
│   └── Secret Corridor
│
└── Campaign Notes
    ├── Session 3 Notes
    ├── NPC Backstories
    └── DM Secrets
```

Each entry should have a visibility control.

Suggested visibility states:

| State | Icon | Meaning |
|---|---|---|
| Visible | Open eye | Players can see it. |
| Partial | Half eye / amber icon | Players see limited content. |
| Hidden | Closed eye / eye slash | Players cannot see it. |

This window also handles Player View visibility.

---

## 5.8 Database/current element edition window

This window is used to edit elements that belong to the current state.

Example: **Martillo Editor**.

The left side should contain a collapsible tree of active session elements:

```text
Active Elements
├── Characters
│   ├── Martillo
│   ├── Rogue
│   └── Eldrin
│
├── Monsters
│   ├── Goblin
│   └── Wolf
│
├── Objects
│   ├── Stone Pillar A
│   └── Stone Pillar B
│
└── Conditions
    └── Difficult Terrain
```

The right side contains the editor.

Example fields for Martillo:

```text
Stats
- Name: Martillo
- HP: 42 / 42
- Temp HP: 0
- AC: 18
- Initiative: +1
- Speed: 25 ft
- Level: 4
- Conditions: Ready
- Map Visibility: Visible to Players
- Notes: A steadfast dwarf. Loyal and disciplined.
```

Suggested tabs:

- Stats.
- Inventory.
- Features.
- Notes.
- Visibility.
- Map state.

Important behavior:

Changes made here should update:

- DM map.
- Map View projection.
- Player View element cards.
- Initiative panel.
- Current state window.

---

## 5.9 Map Elements window

The Map Elements window shows the current map state with DM controls.

It is similar to the projected Map View, but with editing and control capabilities.

Suggested contents:

- Current map.
- Grid overlay.
- Tokens.
- Selected token outline.
- Range overlays.
- Fog preview.
- Layers.
- Snap options.
- Zoom controls.
- Map visibility controls.

Suggested toolbar:

```text
[+] [-] [100%] [Grid] [Ranges] [Fog] [Snap] [Layers]
```

DM capabilities:

- Move tokens.
- Select tokens.
- Show/hide ranges.
- Preview fog of war.
- Toggle grid.
- Inspect token state.
- Open related editor/card windows.
- Control map layers.

---

## 5.10 Map obstacle window

The Map Obstacle window is used to define and edit obstacles on the map.

It should be a visual editor.

Suggested capabilities:

- Show the map image.
- Show grid or hex overlay if applicable.
- Draw obstacle shapes.
- Draw square regions.
- Draw circles.
- Draw lines.
- Draw polygonal shapes by placing points.
- Move drawn shapes.
- Resize shapes.
- Edit shape points.
- Change obstacle type.
- Change opacity.
- Undo.
- Redo.
- Apply changes to current map.

Obstacle properties:

| Property | Possible values |
|---|---|
| Blocks visibility | Yes / No / Partial |
| Blocks movement | Yes / No / Partial |
| Opacity | 50% / 100% or custom |
| Shape type | Square / Circle / Line / Polygon |
| Layer | Wall / Terrain / Object / Temporary |

Suggested controls:

```text
Toolbar:
[Select] [Square] [Circle] [Line] [Polygon] [Move] [Undo] [Redo] [Apply]

Properties:
- Blocks visibility
- Blocks movement
- Opacity
- Layer
```

---

## 5.11 Map configuration window

The Map Configuration window controls how the map is interpreted and displayed.

It is more form-based than visual-editor-based.

Suggested settings:

### Coordinate system

- Free.
- Square grid.
- Hex grid.

### Grid settings

- Cell size.
- Offset X/Y.
- Rotation if needed.
- Show grid on projection.
- Show grid in DM view.
- Grid opacity.

### Fog of war

- Enable/disable fog of war.
- Currently visible brightness.
- Previously seen brightness.
- Unknown area darkness.
- Character vision rules.

### Obstacles

- Show/hide obstacles on Map View.
- Show/hide obstacles in DM View.
- Default obstacle opacity.

### Ranges

- Show/hide player ranges.
- Show/hide monster ranges.
- Default range colors.
- Range opacity.

### Preview

The window should include a preview of the map with the current configuration.

---

## 5.12 Map Messages window

The Map Messages window controls content sent to the projected table.

It should support player-targeted and center-table messages.

### Targeting panel

The first section should represent the physical table.

Example:

```text
       Player 1
          ↑
Player 4 ← Table → Player 2
          ↓
       Player 3
```

Target options:

- Center.
- All players.
- Player 1.
- Player 2.
- Player 3.
- Player 4.
- Specific map token.

The DM should be able to define player position and message direction.

### Message composer

Supported message types:

- Text.
- Image.
- GIF.
- Element card.

Composer features:

- Text editor.
- Image attachment.
- GIF selection.
- Element card selection.
- Preview area.
- Size control.
- Direction/orientation control.
- Send to table button.

Example message:

```text
DEFEATED
```

Example card attachment:

```text
Stonecunning
Traditional Elemental
Gain +2 AC until the end of your next turn.
```

---

## 5.13 Element Card reference window

The DM should be able to open multiple element card windows.

Examples:

- Goblin Card.
- Longsword Card.
- Martillo Card.
- Stonecunning Card.

These are quick reference panels.

They may include:

- Illustration.
- Stats.
- Abilities.
- Actions.
- Notes.
- Visibility status.
- Quick links to editor.

Unlike Player View cards, DM cards may show hidden information.

---

## 5.14 Session Log / History window

This is useful but not required for the first visual proof of concept.

It tracks what happened during the session.

Possible log entries:

- HP changes.
- Status effects added/removed.
- Messages sent to table.
- Elements revealed to players.
- Tokens moved.
- Initiative changes.
- Obstacles changed.
- Fog state changed.
- DM notes.

Example:

```text
Session Log
- Round 2: Martillo took 5 damage.
- Goblin revealed to players.
- Stonecunning card sent to table.
- Wolf moved from F8 to G8.
- Hidden Chamber remained hidden.
```

---

## 5.15 Future layout presets

Layout presets should be added later as a user experience improvement.

Possible presets:

| Preset | Purpose | Suggested windows |
|---|---|---|
| Preparation | Create/edit content before session. | Database, editor, map config. |
| Combat | Run live encounter. | Map elements, current state, initiative, messages. |
| Reveal/Hide | Manage player knowledge. | Database visibility, cards, player preview. |
| Review | Review past sessions. | Session log, campaign notes, previous maps. |

This does not need to be implemented in the first visual proof of concept, but the window system should be designed to support it.

---

# 6. Recommended first visual layouts

## 6.1 Player View — Instructions page

Show:

- Top navigation.
- Left documentation tree.
- Main documentation article.
- Right “On this page” and recent updates panel.
- Clean fantasy documentation style.

Example page: **Attack Action**.

---

## 6.2 Player View — Element Cards

Create cards for:

- Longsword.
- Martillo.
- Goblin.
- Conditions or abilities such as Stonecunning.

Each card should demonstrate:

- Fantasy visual style.
- Stats.
- Session state.
- Linked chips.
- Visibility-aware information.

---

## 6.3 Map View — projection states

Create five variations from the same base game state:

1. Basic map.
2. Map with fog of war and one range.
3. Map with obstacle overlays.
4. Map with initiative panel.
5. Map with targeted message and center card.

---

## 6.4 DM View — live session dashboard

Show a clean multi-window workspace with:

- Left icon bar.
- Window tabs.
- Main Map Elements window.
- Database Visibility window.
- Current State window.
- Martillo Editor window.
- Map Messages window.
- Goblin Card window.

This should look like a real live session in progress.

---

# 7. Design constraints

## 7.1 What to avoid

Avoid:

- Overly decorative DM interface.
- Too many buttons in Map View.
- Player-side editing controls.
- Exposing hidden DM information.
- Relying only on color to communicate obstacle types.
- Making projected text too small.
- Treating the Map View as a normal web dashboard.

---

## 7.2 Projection readability

For anything projected onto a table:

- Use large tokens.
- Use high-contrast overlays.
- Avoid dense text.
- Use black outside-map margins.
- Keep message overlays large and temporary.
- Avoid small controls entirely.

---

## 7.3 DM usability

For the DM:

- Use compact but readable panels.
- Keep controls grouped by task.
- Allow flexible window layouts.
- Support multiple open cards/editors.
- Make current state visible at all times.
- Make visibility states easy to inspect.
- Ensure live changes propagate clearly.

---

# 8. Summary

The project has three complementary visual experiences:

1. **Player View** — a clean, read-only campaign companion with documentation and fantasy element cards.
2. **Map View** — a minimal table projection surface showing only the live game state.
3. **DM View** — a modular multi-window command center for managing the database, current state, map, visibility, messages, and live session controls.

The most important design idea is that all views are driven by the same shared current state, but each view exposes a different level of control and information.

```text
Players see what they are allowed to know.
The Map View shows what the table needs to see.
The DM controls everything.
```
