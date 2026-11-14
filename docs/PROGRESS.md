# Progress

Live URL: https://argo-4eg.pages.dev · Repo: https://github.com/jaidevreddy/argo
Mac path: /Users/jaidevreddy/Documents/Documents - Jaidev’s MacBook Pro/projects/Nasa Space App Challenge/argo

| Phase | Status | Report |
|---|---|---|
| 0 Setup | Done (user) | Vite react-ts + ESLint, packages installed, venv, GitHub, Cloudflare Pages |
| 1 Astro engine | Done | [phases/phase-1.md](phases/phase-1.md) |
| 2 Terrain + metrics | Done | [phases/phase-2.md](phases/phase-2.md) |
| 3 Shell + picker | Next | |
| 4–8 | Not started | |

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
- Earth/Moon Blue Marble pages on visibleearth/eoimages now redirect; Earth texture came from three.js repo.

## Next step

Phase 3: process globe textures (lroc_color_poles_8k → jpg, ldem_16_uint → normal map, calibrate its height
scale against the LOLA polar grid), design tokens, layout shell, Moon globe picker, scenario store + URL sync.
