# Progress

Live URL: https://argo-4eg.pages.dev · Repo: https://github.com/jaidevreddy/argo
Mac path: /Users/jaidevreddy/Documents/Documents - Jaidev’s MacBook Pro/projects/Nasa Space App Challenge/argo

| Phase | Status | Report |
|---|---|---|
| 0 Setup | Done (user) | Vite react-ts + ESLint, packages installed, venv, GitHub, Cloudflare Pages |
| 1 Astro engine | Done | [phases/phase-1.md](phases/phase-1.md) |
| 2 Terrain + metrics | Done | [phases/phase-2.md](phases/phase-2.md) |
| 3 Shell + picker | Done | [phases/phase-3.md](phases/phase-3.md) |
| 4 Planner views | Next | |
| 5–8 | Not started | |

## Decisions taken

- Build happens in this chat (Claude), not Claude Code. User does git, npm, deploys.
- Plain CSS + CSS Modules, no Tailwind. ESLint, not oxlint.
- GSAP for camera flight and view transitions.
- No live API for core data; NASA files are downloaded and baked offline.
- No login. Supabase only for saved scenarios in Phase 6 (cuttable).
- Globe look: Apple planet wallpaper (hard Sun, real relief, no clutter). Earth has atmosphere rim, Moon does not.

## Gotchas

- JPL/PDS/SVS unreachable from both sandboxes → Chrome for Horizons, user Terminal for big downloads.
- Chrome blocks multi-file script downloads → use curl in Terminal.
- The Mac sandbox can't run node_modules or delete files; user runs tests/build/git.
- Bake runs on the Mac sandbox (`python3 tools/bake.py` from repo root); outputs land straight in public/data.
- Parallel tool calls: stage-then-commit must be sequential, or the Mac gets the old file.
- device_commit_files can silently keep an old upload when the same stagedPath is reused. Re-send with a
  fresh staging path (e.g. /mnt/user-data/outputs/rN/...) and VERIFY with md5sum on the Mac after every sync.
- Dev check loop: user runs `npm run dev` on the Mac; Claude inspects http://localhost:5173 via Claude in Chrome
  (screenshots + console errors).
- Never use drei <Html> (React 19 root-unmount errors). Markers are a DOM layer positioned by MarkerProjector.
- Zustand selectors must return stable values; derive objects with useMemo (see useTarget).
- Earth/Moon Blue Marble pages on visibleearth/eoimages now redirect; Earth texture came from three.js repo.

## Next step

Phase 4: compute worker (runScenario off the main thread, cached per scenario), verdict bar with live
numbers and countdowns, sky chart (terrain silhouette + Sun/Earth tracks), timeline with scrubber,
horizon-type label + assumptions panel, validation view + Verify with JPL button.
