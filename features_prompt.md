
# Project Overview

We want to deploy an scalable web server to play dnd locally, with a projector.
The main idea is to represent a map (grid/hexagonal/continuous) with characters, monsters, items, and other objects, to represent the fog of war, movement and attack range, track initiative, player and monster stats, and other features that are useful for playing dnd locally.
We want to make it really scalable to have objects, spells, items, weapons, different classes, with movement and attack range.

# Features

## Map representation

The app allow to set an image as a background landscape.
On the given map, it should allow to determine obstacles (visibility/movility), and place and move players, and objects.

## Elements stats

Elements in the game could be players, monsters, items, etc.
Each element may have stats, general or specific to its type.

Each character should have a movement range and attack range based on the weapon or spell they select or equip, that should be represented on the map when the character is selected.

### Collapsible sidebar

To not mess with the projection, there shall be a collapsible sidebar to show the stats of the selected element, and other information.

This shall be customizable, so the stats are shown in a static side bar, in a collapsible sidebar, over the image where the player in a dialogue box, a way of the DM to show something as a pop up window in the center, etc.

### DM window

The DM should have a different window to manage the game, with more options and information, the possibility to see the map without the fog of war, the possibility to see and manage every stat, etc.

### Vision

The map must allow different modes:

1. All: everything is visible.
2. Fog of war: only the area around the characters is visible, and the rest is covered by a fog. This shall be calculated dynamically based on the position of the characters and the obstacles on the map.

### Player interaction

The characters and monsters will be visualized as icons in the map (they will have an action figure over them when projected in a table).
When hover/clicked over them, they must show radios of:

- Movement range: the area where the character can move, calculated based on the character's movement stat and the obstacles on the map.
- Attack range: the area where the character can attack, calculated based on the character's attack weapon or spell, and the obstacles on the map. This may depend on stats of elements in the character, that would be managed in the DM window.

### Initiative tracker

The app should have an initiative tracker, to track the order of turns in combat, and the current turn. This should be visible in the DM window, and optionally in the sidebar.
