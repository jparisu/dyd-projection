I want to work in a web page visual proof of concept. We are going to work hand by hand, in a conversational non verbose manner, where we are going to discuss which parts/pages/buttons/etc the web page may have, and draw a first example on how it would be seen. For now, we would not worry about internal logic, backend, html/css, etc. Just the images of what the web page will look like. Agree?

---

Let's go:

# Purpose

This web page would have several purposes.
Main big picture idea is to create a web page to help us manage Dungeons and Dragons campaigns.

It would have 2 main sections:

1. A database section, where information regarding characters, items, monsters, rules, previous campaigns, stats, etc would be stored and easily accessible and editable.

2. A map section, where a map would be displayed with the interaction elements on it: characters, monsters, items, etc. This map would be used during the game sessions to keep track of the current state of the game. The goal is to project this map on a table thanks to a projector, so we create a mixed digital-physical experience.

So far, does it sounds good?

---

Before moving forward, I want to clarify this and be more specific about the main views on the web page:

1. DM (Dungeon Master)
This is going to be the main user of the web page, and the "host" of a new session.
This is the database and map administrator, the one who will create and manage the campaigns, characters, items, monsters, etc. They will also be the one who will control the map during the game sessions.

2. Players
These are the secondary users of the web page, and the "guests" of a session.
In general, they are merely spectators of the database (the parts that they are allowed). For instance, their player information, items, etc., the instructions, etc.
They shall not have control over the database or the map, and there will be information that is hidden from them (in database and map).

3. Map
This is the third main view that will only render a current state of the game: map with elements on it, and some real-time information that may be relevant during the game sessions. This view is going to be projected on a screen or on the table, so it should be as clean and simple as possible, with only the necessary information.

Is this clear? Does it sound good? Do you have any questions or suggestions about this?

---

These are the different "views" or "session types" we may have.
Now let's move to the actual pages and elements of the web page.

We will differentiate between the different views.
We will work with the different views separately.

## Player view
This view would consist on static web-page (no interaction from client side).
The web page will contain an upper bar allowing to navigate between different sections of the page.
It may have the following sections:

### Instructions
This will be a documentation-like page such as read-the-docs or quarto look-like pages, whit different sections and subsections for the instructions of the game.
This page will include an "elements" section, where the user can find information about elements: items, characters, monsters, etc.
It shall have the doc tree at the left to easily navigate, and a search bar (as read-the-docs style).

This page will not contain the session information, but rather the general information about the game, rules, etc.
However, this page will not be static, as the DM could hide or show certain sessions. For instance, a monster that hasn't been revealed yet, or a character that hasn't been introduced yet, would be hidden.
We can add a notification or alert system to visualize when there are some pages that hasn't been seen yet, or that have been recently updated.

### Elements cards
In this section, the player would have a tree of elements: characters, items, monsters, etc. in the left sidebar.
In the central panel, the page will render the "Element card" of the selected element.

This will be a big pretty card with an image and a name, description, stats (with icon and values), etc.
It may also contain a section for "Current State" showing the current state of the element. For instance, for a character, it may show the current HP, current items, etc. For a monster, it may show the current HP, current status (e.g., "enraged", "poisoned", etc).

### Interaction
From instructions page and elements cards, there may be interactions to navigate from one another.
For instance, from the instructions page, if we are talking about a specific monster, we may want to click on it and be redirected to the element card of that monster. Or from the element card of a character, we may want to click on an item that they have and be redirected to the element card of that item. Or from an element card of an item, we may want to click on the "attack" button and be redirected to the instructions page with the instructions of what "attack" means and how to use it.

Let's first discuss what we have here, make any suggestion or ask any question, and then we start sketching how this would look like.

---

## Map view
Let's continue with the map view.
In this view there would only be a map, with the elements on it.
Some information may be displayed or hidden, but all that configuration will be controlled by the DM in its own view (we will discuss it later), so very few interactions will be available, and not buttons.

### Map
The map will be the main element of this view. There will be a full size image with the map, containing the whole map at once.
Have into account that different maps may have different sizes, so the rest of the view that is not included in the map image will be black or empty, to avoid distractions.

### Map structure

#### Coordinates
There will be different coordinate systems allowed: grid, hexagonal, or free. And for grids or hexagonal, different sizes could be used as well (always same system and size per map/image).
The DM will be able to choose the coordinate system for each map, and the map will be rendered accordingly.
The DM will also be able to activate or deactivate coordinate visualization (grid or hexagonal lines), but everything from its view, so in the map will only appear or not, but no button to activate or deactivate it from the map view.

#### Obstacles
There will also be obstacles along the map, that could be visible (stop the visibility and range weapons totally or partially), movility (stop the movement totally or partially), or both.
The obstacles could be mobile elements or fixed elements, everything set in the DM view.
The DM can activate to visualize the obstacles: different colors and for different visibility and mobility, and with different levels of opacity (in general we will work with 50% 100%).

#### Fog of war
The DM will be able to activate the "fog of war", so the players can only see the area around their characters, and the rest of the map will be darkened.
The radius of visibility may depend on the character, the obstacles, and the size of the map.
The DM can activate and deactivate Fog of War from its view.

#### Coordinate coherence
It may happen that an obstacle, an element, a monster etc. may not be perfectly aligned with the coordinates of the map or that is bigger than 1 cell (in grid and hexagonal).
Each element in cell-based maps must be assigned to cells, in a way that if an obstacle occupies half of one cell, it is consider to occupy that cell entirely.

### Map elements
On top of the map, there will be the elements: characters, monsters, items, etc.
These elements will appear as mear tokens (circles) with an icon and a color

#### Range

There will be ranges of visual or attack ranges. This will be shown as a colored area around the character or monster, with a certain radius.
Some elements may have several ranges, for instance, a character may have a visual range of 5 cells and an attack range of 2 cells. These ranges will be shown with different colors and opacities, always showing the maximum range below the others.
The DM can activate or deactivate the visualization of these ranges from its view, for one or more elements at once.

The radius must have into account the obstacles, so if there is an obstacle that blocks the visibility or the attack, the range will be blocked as well, even if the radius is bigger.

### Information
There may be a sidebar that the DM can activate or deactivate from its view, showing the turn order of the characters and monsters, with their current HP and status.

### Messages
The DM will be able to send messages to the map. This will be done by sending one message to one character, to all the characters, or to the center of the table.
Each character will be set previously on the DM view to define their position on the map, understanding that it is being projected on a table.
The message may be text, or, for instance, an element card may be sent. It may also be images or gifs like "you are dead" or "congratulations" with fireworks, etc.


All this view must be non configurable from the map view, so no buttons or interactions will be available for the players, and all the configuration will be done from the DM view.
Let's first discuss what we have here, make any suggestion or ask any question, and then we start sketching how this would look like.

---

Last and most important,

## DM view
This is the most complex view, as it includes both the database management and the map management.

This view will be constructed by small windows or panels.
Each panel will be used for very different purposes, giving the ability to the DM to customize the view and database as they want, and to have all the information and controls at hand during the game sessions.

### State
The whole web will have a current state that contains the map, the database, the elements currently playing, etc.
This is important to have in mind for the DM view.

### Window layout
The view of the DM will be constructed by small windows or panels.
This windows must be movable and resizable, and easily set for full size, grids of different sizes, columns, etc.

### Windows tabs
Each opened window will have a tab at the top, so the DM have easy access to all the opened windows and can easily switch between them.

### Windows bar
At the left size, something like vscode side bar, the view will have a bar of icons where each opens a new window of a specific kind. Some windows may be opened several times, for instance, the element card window, that can be opened for different elements at the same time. Other windows may only be opened once, for instance, the map configuration window.


### Windows types
There will be different types of windows, and this structure must be scalable.
Let's focus on the main ones:

#### Database visualization windows
These windows will be used to manage the visual state of the database of the game.
This will contain a tree of every entrance of the database, and for each entrance, the DM will be able to set the visibility for the players.

#### Database edition windows
For those elements that are being used on the map (belong to the current state), the DM will have the possibility to edit their information in real time, and this will be reflected on the map and on the players view in real time as well.
For instance, if the DM is editing the HP of a character, this will be reflected on the map initiative panel, on the player-view, etc.
To navigate these elements, this panel will have a left collapsible sidebar with the tree of the elements in the current state.

#### Map obstacle window
This window will be used to set the obstacles on the map, and their properties (visibility, mobility, etc).
This will be a visual editor with the image of the map, the view of the grid (if applicable), and the possibility to draw shapes (square, circle, open edition by setting points: lines or shapes) to set the obstacles on the map.
The elements drawn on the map could be easily moved, resized, edited, change configurations, etc.
This info will be uploaded to the current map with a "apply" button. It will also contain "undo" and "redo" buttons to easily manage the changes.

#### Map configuration window
This window will be used to set the configuration of the map, for instance, the coordinate system, the size of the cells, the activation of the fog of war, show obstacles, etc.
This will be more of a form with different options and configurations, and a preview of how the map will look like.

#### Map elements window
This window will show the current state of the map, similar to what the players are seeing in the map-view, but with the capabilities of the DM: show ranges, move elements, etc.

#### Map messages window
This window will be used to send messages to the map, as we have discussed in the map view section.
First, it will have a map shape, where it can determine the position and direction of each player in order to send custom messages to specific players.
Then, it will have the possibility to send a message to the center, setting the direction and size of the message, or to all the players at once.
Finally, it will have a text editor with the possibility to add images, gifs, etc. to create the message that will be sent, or to select an element card to be sent as a message.


Are we missing something? Do you have any suggestion or question about this?