# Phase 3: shell, globe and site picker

Status: done, 14 Nov 2026. Exit test passed in Chrome: pick a site, reload, state survives (site, custom
point, time). Console clean on load and interaction. tsc, eslint, 128 tests, production build all pass.

## Built

| Area | Files |
|---|---|
| Globe textures | tools/textures.py → moon_color_4k.jpg (1.6 MB), moon_normal_4k.jpg (4.0 MB) |
| Design system | styles/tokens.css, styles/base.css, ui/Panel, ui/Button, ui/Field |
| State | state/scenarioStore.ts (+ useTarget), state/urlSync.ts, tests/url.spec.ts |
| Globe | scene/frame.ts, scene/globe/* (true-Sun lighting, GSAP flight, DOM markers) |
| Layout | app/App.tsx, features/header/TopBar, features/picker/SitePanel + CustomPoint, features/time/TimeDock |

## Verified in the browser

- Apollo 11 at its landing time sits just inside the lit side near the terminator (Sun 10.7° up): lighting is physically right.
- Custom point -89.45, -137.3 → marker + URL `?lat=-89.4500&lon=-137.3000&t=...`; reload restores it.
- ±1 day moves the terminator; Landing time resets.

## Bugs found and fixed

- Infinite render loop: useTarget returned a fresh object per store read → stable slices + useMemo.
- drei <Html> root-unmount errors under React 19 → custom DOM marker layer + projector.
- Camera too close / globe under the panel → distance 4.4 R + view offset.
- Labels above panels → overlay z-index 30. Field overflow → min-width 0. Dock layout shift → button always rendered.

## Skipped / unchecked

- Bundle 1.3 MB (376 KB gzip): code-split in Phase 7.
- Pole looks soft on the globe (equirectangular pinch); detailed polar terrain comes in the 3D site view.
- Mobile layout only roughed in (stacked panels); Phase 7 adapt pass.
