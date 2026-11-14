# Plan

Deadline: Sunday 15 Nov 2026, 11:59 PM local (IST). Target submit by 9 PM.
Source doc: https://claude.ai/artifact/TNKA1LGuughZQrNsvg4ao8

## Product

Argo answers: if we land here on this date, do we have power and can we talk to Earth, and for how long?
A scenario = site + landing time + hardware (mast height, panel type). Every view shows 1 to 3 scenarios.

| View | Shows |
|---|---|
| Site picker | Moon globe, curated sites (Apollo, Chandrayaan-3, Chang'e, SLIM, IM-1/2, Blue Ghost, Artemis III regions) + custom lat/lon |
| Verdict bar | Sun el, Earth el, time to sunset, time to Earthset, sunlit %, Earth-visible %, longest dark gap |
| Sky chart | Az vs el with terrain horizon silhouette, Sun and Earth tracks over a lunar day |
| Timeline | Elevation curves, lit and comm bands, ops window, scrubber |
| Site view (3D) | LOLA terrain lit by true Sun vector, Earth at true position and phase, lander, orbit + stand-here cameras |
| Compare | Up to 3 scenarios on one scrubber with deltas |
| Nudge | ±1 day, ±1 km and the change in hours |
| Validation | Engine vs JPL Horizons residuals, live Verify button |

Modes: Planner (dense, numeric) and Explore (plain-language captions). One toggle.

## Judging map

| Criterion | Earned by |
|---|---|
| Impact | Re-evaluate site/date in seconds; shareable URL scenarios |
| Creativity | Sky chart with terrain silhouette, nudge, stand-here 3D |
| Validity | Horizons residuals in-app, real LOLA horizon, finite discs, assumptions panel |
| Relevance | Every objective in the challenge text covered |
| Presentation | 30 s demo, clean page, humanized copy, live URL |

Award targets: Best Use of Data, Best Use of Technology, Best Mission Concept.

## Phases

| # | Phase | Exit test |
|---|---|---|
| 0 | Setup (user) | Public URL loads. DONE: https://argo-4eg.pages.dev |
| 1 | Astro engine | Fixtures within tolerance. DONE |
| 2 | Terrain data + metrics | Horizon + metrics tests pass |
| 3 | Shell + picker | Pick site, reload, state survives |
| 4 | Planner views | Scrub a lunar day smoothly, numbers correct |
| 5 | 3D site view | Shadows match sky chart at 3 test times |
| 6 | Compare, nudge, save | Cut entirely if Phase 5 not done by 2 PM Sunday |
| 7 | Polish | Impeccable audit clean; a11y |
| 8 | Submit | Submitted by 9 PM Sunday |

## Submission checklist

- Responds to Lunar Landing Site Navigator; all members registered on same Local Event, on Members tab
- Demo: video ≤ 30 s or deck ≤ 7 slides (over = ineligible), public link, English (subtitles if spoken otherwise)
- No photos/video/audio of anyone under 18
- References list every data source: Horizons, LOLA, LROC/CGI Moon Kit, Blue Marble, Quickmap, Moon Trek, astronomy-engine, three.js
- No copyrighted material without permission; AI-use disclosure per the 2026 submission guide
- Public project URL + public GitHub repo
