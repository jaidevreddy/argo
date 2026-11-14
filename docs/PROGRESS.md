# Progress

Live URL: https://argo-4eg.pages.dev · Repo: https://github.com/jaidevreddy/argo
Mac path: /Users/jaidevreddy/Documents/Documents - Jaidev’s MacBook Pro/projects/Nasa Space App Challenge/argo

| Phase | Status | Report |
|---|---|---|
| 0 Setup | Done (user) | Vite react-ts + ESLint, packages installed, venv, GitHub, Cloudflare Pages |
| 1 Astro engine | Done | [phases/phase-1.md](phases/phase-1.md) |
| 2 Terrain + metrics | Next. Raw data downloaded to data-raw/ | |
| 3–8 | Not started | |

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
- Earth/Moon Blue Marble pages on visibleearth/eoimages now redirect; Earth texture came from three.js repo.

## Next step

Phase 2: tools/bake.py (horizon profiles + terrain tiles per curated polar site), sites.json with source
links, src/core/terrain + src/core/metrics, tests.
