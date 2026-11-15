# Progress

Live URL: https://argo-4eg.pages.dev · Repo: https://github.com/jaidevreddy/argo
Mac path: /Users/jaidevreddy/Documents/Documents - Jaidev’s MacBook Pro/projects/Nasa Space App Challenge/argo

| Phase | Status | Report |
|---|---|---|
| 0 Setup | Done (user) | Vite react-ts + ESLint, packages installed, venv, GitHub, Cloudflare Pages |
| 1 Astro engine | Done | [phases/phase-1.md](phases/phase-1.md) |
| 2 Terrain + metrics | Done | [phases/phase-2.md](phases/phase-2.md) |
| 3 Shell + picker | Done | [phases/phase-3.md](phases/phase-3.md) |
| 4 Planner views | Done | [phases/phase-4.md](phases/phase-4.md) |
| 5 3D site view | Done | [phases/phase-5.md](phases/phase-5.md) |
| 6 Compare + nudge | Done | [phases/phase-6.md](phases/phase-6.md) |
| 7 Polish | Done | [phases/phase-7.md](phases/phase-7.md) |
| 8 Submit | Next | |

## Decisions taken

- Compare is core to the challenge (compare sites and dates), not a cuttable extra. Supabase save skipped: the URL is the save/share.

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
- Epoch ms are NEGATIVE before 1970 (Apollo). Never use -1 / `< 0` as a "no time" sentinel; use null.
- Non-polar DEM crops come from `python3 tools/fetch_dem.py` in the USER's Terminal (PDS unreachable from sandboxes).
- After editing tools/bake.py, re-run it on the Mac sandbox (`python3 tools/bake.py`, ~5 s); tiles stay byte-identical.
- Chrome javascript_tool output is blocked if it contains the URL query string; don't return location.search.
- Earth/Moon Blue Marble pages on visibleearth/eoimages now redirect; Earth texture came from three.js repo.
- Production smoke test: `vite preview` in the cloud mirror + playwright-core driving /usr/bin/google-chrome
  (swiftshader). The mirror needs public/data/textures copied from the Mac or the boot never finishes.
- Mac folder name uses a curly apostrophe (Jaidev’s); device paths with a straight one are rejected.

## First-run tour (Phase 8)

- `src/features/tour/`: on first visit (localStorage `argo-tour-v1`) a dialog asks "Want a quick tour?".
  8 features, 11 cards; Continue = next card, Skip = next feature, Esc or × ends it. Tour button in the top bar replays it.
- Cards spotlight `[data-tour=...]` elements, switch views (sky, 3D only when terrain exists, compare) and restore
  the view and compare list at the end. Phones: bottom sheet; target scrolled below the pinned header.
- Copy follows blader/humanizer: plain statements, specific numbers, no hype or dash connectors.
- `?notour` in the URL suppresses the prompt (film capture, shared demo links).

## Next step

Phase 8: deploy, 30 s demo video, Space Apps project page (summary, how it works, data sources, references incl.
HipFonts, AI disclosure), submit by 9 PM IST Sunday 15 Nov (hard deadline 11:59 PM).
