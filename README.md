# Gene Boo 3D Interactive Lab — Full Refactor Package

This package is a complete modular refactor starter of the original one-file site.

## What changed

- Split the site into four 3D sections:
  - Main Hall: about, CVs, arcade map
  - Engineer's Desk: apps, SaaS, sites, tools
  - Writer's Desk: technical articles and written works
  - Arcade Room: games, synth lab, drum machine, persistent leaderboards

- Added arcade-style leaderboards with 3-letter initials.
- Added 20-note synth keyboard with QWERTY, mouse, and touch support.
- Added pitch wheel, cutoff, resonance, LFO rate/depth, and four-wave morph control.
- Replaced synth 3D shape with an arcade cabinet/synth station concept.
- Added 16-pad drum machine with 808/909/Linn/Neurofunk kit selector and keyboard/touch support.
- Reorganized into modules under `src/`.

## How to run locally

Because ES modules are used, run a local web server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Notes

The original local assets are still referenced where applicable. If those files are absent, the site still runs, but links/images may not resolve until your existing `assets/` folder is copied in.

## Important files

- `index.html`
- `src/main.js`
- `src/core/scene.js`
- `src/world/rooms.js`
- `src/games/gameHub.js`
- `src/audio/synthEngine.js`
- `src/audio/drumEngine.js`
- `src/ui/leaderboard.js`
- `src/ui/modal.js`
- `src/styles.css`
