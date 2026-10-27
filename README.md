# Pamukkale

A calm 3D water-flow puzzle on the white travertine terraces. Guide warm spring water down the hillside into the target pools with stones, dams and splitters. Still water slowly builds a new white calcium rim, so the terraces change while you play.

Claude Game Arena, round 6, game 4. Turkish by default, English on the **EN** toggle.

## How to play

- Warm water comes out of the spring at the top of the terraces.
- Place a limited number of tools on the grid:
  - **Stone (Taş)**: raises a cell by one step, so the water turns around it.
  - **Dam (Set)**: raises a cell by two steps and holds water back.
  - **Splitter (Ayırıcı)**: divides the flow between every lower neighbour.
- Fill every target pool to its mark. The ring in each pool shows the mark, and it turns turquoise when the pool is full.
- Water that runs off the bottom edge is spilled and wasted.
- Still water for a while builds calcium: dry cells beside a standing pool rise to the water line.
- 20 levels in 4 areas: Lower Pools, Middle Shelves, Ancient Pool, Sunset.
- Stars per level: **all pools full**, **no water spilled**, **tool saving** (at most the par number of tools used).

## Controls

| Action | Keys / mouse / touch |
|---|---|
| Place the selected tool | click or tap a cell |
| Remove a tool | right-click, or long-press on touch |
| Select tool | `1` stone, `2` dam, `3` splitter, or tap the tray |
| Start / stop water | `Space` (or the water button) |
| Fast forward | `F` |
| Undo last tool change | `Z` |
| Reset level | `R` |
| Pause / resume | `P` or `Esc` |
| Music on/off | `M` |
| Effects on/off | `X` |
| Language | `L` |
| Orbit | drag (mouse or one finger) |
| Zoom | mouse wheel or pinch |

## Flags (URL parameters)

- `?auto`: the bot plays all 20 levels. It replays each level's stored solution through the same placement function a click uses, at 3x speed.
- `?debug`: shows fps, draw calls, triangles and any JavaScript errors on screen.
- `?sim=N`: starts the first level with N seconds of water already fast-forwarded.
- `?low`: shadows off, fewer particles, pixel ratio 1.
- `?lang=en`: English.
- `?noassets`: accepted, but this game ships no external assets. Everything is procedural, so the flag changes nothing.

`window.pamukkale` exposes the live state. `window.pamukkaleSim(seconds)` fast-forwards the simulation without rendering.

## How it was made

Built by Claude Haiku 5.5 with Claude Code from one prompt: `prompts/pamukkale.md`.

- Three.js r170 (ES module from jsdelivr) for the scene. Terrain, water and tools are built from procedural geometry with vertex colours; instanced meshes for repeated objects.
- The water simulation is a small grid automaton in plain JavaScript. It lives between the `SIM-BEGIN` and `SIM-END` markers in `index.html`.
- Level layouts were generated from seeded random hillsides. Each one was accepted only if the empty board fails and a short solution fills every pool. The solutions are stored with each level, and `tools/solve-levels.mjs` re-checks them against the same simulation code.
- Sound is synthesised with Web Audio: a calm saz-like plucked loop, a flute line, a water trickle, splashes and birdsong.

## Files

- `index.html`: the whole game.
- `tools/solve-levels.mjs`: offline check of every level (`node tools/solve-levels.mjs`). It prints a solution per level, or FAILED.
- `LICENSE`: MIT.

## Status

Checked in headless Chrome on an Intel UHD 620 (ANGLE, D3D11):

- Title, level play, pause and result screens load with zero JavaScript errors.
- `?auto` plays all 20 levels to the ending with zero errors and wins all 20 (46 of 60 stars in that run).
- Draw calls per frame: about 14 to 16 at the title and in play. Headless frame rate reads 60 fps (`?debug` shows it), but that is a headless rAF reading, not a measured GPU budget.
- Phone layout (500x900): HUD, tool tray and fast-forward icon all visible.

Screenshots are in `docs/`: title, two gameplay levels, the ending screen, and the phone layout.

Known limits: the terraces are an approximate, plateau-style hillside, and the sloped apron at the edge is still a simplified form. Level 16 uses a looser difficulty band than its neighbours.
