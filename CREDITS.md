# Credits

## 3D chibi style (stil-3d, 24.11.2026)

The pictures in `assets/3d/` follow the game's own song video (`atolye/muzik-reel/oyunlar/pamukkale/`): the straw-hat
tourist, the spring guardian with the water-droplet hair clip, and the peach-sunset travertine terraces. New figures
were generated with the Gemini app (Nano Banana image model) from text prompts only, as item sheets on a white
background, then cut out and keyed locally with PIL (`atolye/oyun-stil/pamukkale/kes.py`). Copilot was tried first
and had reached its daily limit.

| File | Source | Content |
|---|---|---|
| `3d/chibi.webp`, `3d/ui-turist*.webp`, `3d/ui-bekci-*.webp`, `3d/ui-damla.webp` | Gemini (Nano Banana), 1 request | 3x3 atlas: tourist (calm, cheering, sad, dipping a toe), spring guardian (calm, cheering, pointing, waving), water-droplet mascot; on the board and on the cards |
| `3d/nesne.webp`, `3d/ui-tas.webp`, `3d/ui-set.webp`, `3d/ui-ayirici.webp` | Gemini (Nano Banana), 1 request | 3x3 atlas of clay props: stone, dam, splitter, spring basin (used in the game and the tool tray), pool, flip-flops, cotton, column, star |
| `3d/gok.webp` | song video plate `gorsel/ham/soguk.jpg` (FLUX.1-dev via NVIDIA, made for the video) | sunset sky behind the board |
| `3d/doku.webp` | song video plate `gorsel/ham/halka.jpg` | fine travertine relief on the terraces (grey, tileable) |

Three.js r170 (MIT) is loaded from jsDelivr. The music and sound effects are synthesised in code.
