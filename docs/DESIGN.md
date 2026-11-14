# Design

A flight instrument, not a space-themed website. Mode (impeccable): Operate. Precision and restraint;
the terrain and the globe are the only imagery.

## Interface

- Surfaces: background ~#050506 to #0B0B10, panels 4–8% white + hairline border, text 92% / 60% white.
- Body colours mean one thing everywhere: Sun = warm amber, Earth = blue. Each also has a distinct
  shape/line style so colour is never the only cue.
- Type: SF Pro through the system font stack on Apple devices (nothing bundled, so no licence issue), Inter
  Variable elsewhere; tabular figures for numbers (no jitter while scrubbing). See Brand and loading.
- Layout: 3D/sky fills the screen, panels float over it (blur only where a panel sits over 3D).
  Verdict bar top, timeline dock bottom, scenario rail left. 1280 px primary; one scrolling column below 900 px.
- Motion: 200–400 ms ease-out, only to explain state change. One authored moment: GSAP camera flight
  globe → site. Honour prefers-reduced-motion.
- Keyboard: arrows step time, [ ] step days, 1–3 switch scenarios. Every number has a tooltip saying how it was computed.
- Banned: purple gradients, neon glow, starfield behind text, gradient text, eyebrow labels over headings,
  emoji/unicode icons, same-size icon cards, colored thick left borders, monospace as costume, HUD scanlines.

## 3D bar

- Globe (picker): Apple planet-wallpaper look. One hard directional Sun, soft terminator from real relief
  (normal map from ldem_16), LROC 8k colour, deep black, no busy starfield. Moon gets NO atmosphere rim.
- Site view: 512×512 displaced mesh from LOLA tile, normals from the same heights. 1:1 vertical by default,
  exaggeration toggle labelled when on. One shadow-casting directional light on the true Sun vector.
  Hard black shadows. ACES tone mapping, sRGB. Regolith shader with Lommel-Seeliger style falloff.
- Sky: black. Sun disc at true angular size. Earth sphere at true size, true phase, thin atmosphere rim.
- Lander: simple low-poly, Sun-facing panel, mast. Cameras: orbit + stand-here (eye at mast height).
- Perf: 60 fps on integrated GPU, DPR cap 2, render on demand when idle.

## As built (Phase 3)

- Tokens: src/styles/tokens.css. bg #050506, panel rgb(14 14 16 / .62) + blur 22px, text .93 / .62 / .50,
  Sun #f5b142, Earth #5aa9ff, focus ring white. UI accent is neutral (never Sun/Earth colours).
- Globe: MeshStandardMaterial, roughness 1, LROC 4k colour + LOLA normal map ×6 relief, one Sun light
  (3.4, warm white), earthshine 0.05 from Earth's true direction, ACES tone mapping. View distance 4.4 R,
  globe shifted right of the panel via camera.setViewOffset.
- Motion: GSAP great-circle camera flight, power3.inOut, 0.9–2.2 s by angle, small mid-flight pull-back;
  0 s under prefers-reduced-motion.
- Markers: real <button>s with aria-label, white dots, selected = halo ring; label on hover/focus/selected;
  fade out near the limb.
- No layout shift: controls that come and go are disabled instead (Landing time button).
- Top scrim gradient keeps the top bar legible over the bright limb.

## Brand and loading (Phase 7, final)

- Wordmark (src/ui/logoPath.ts, Logo.tsx): "ARGO" outlined from Cyberwave 2000 by HipFonts (free for personal use;
  credited in the references). Only the outlines ship; the font file stays in data-raw/ (gitignored).
  Favicon = its "A" glyph. Top bar at 15 px cap height.
- Type: SF Pro via the system stack (-apple-system), so Apple devices render it with nothing to download or license;
  Inter Variable elsewhere. Numbers use the same face with tabular figures. JetBrains Mono dropped.
- Boot (src/ui/boot/launchEngine.ts, Loaders.tsx): a small rocket in 0/1 glyphs flies in on a GSAP MotionPath over
  dashed orbits, hovers while loading, then every digit streams into the wordmark (44 px); the crisp wordmark glows in
  with the tagline. CSS drop-shadow glow, DPR ≤ 1.5, full sequence once per tab session, reduced-motion = still frame.
- Shape (Apple Liquid Glass rules, WWDC25): every button, input and segmented control is a capsule (radius = half the
  height). Panels 22 px; anything inside a panel uses panel radius minus its inset (concentric), never a pinched
  corner. One tinted primary per screen (white fill): Go to point, Add current scenario, Verify with JPL, Done.
- Verdict card: fits its content; "Coming up" removed. The title and power/link badge stay pinned (sticky, glass)
  while the card scrolls.
- Custom point: type coordinates or "Pin on globe" (tap the Moon; Esc or Cancel). The form remounts per target, so a
  pin fills the fields and moving elsewhere clears stale "Required" errors; errors also clear on the next edit.
- Layout: 12 px page gutters and gaps. Under 900 px it becomes one scrolling page: header (wordmark + Validation,
  full-width view tabs, place), the view (globe / 3D / chart / compare, 52svh), time dock (‹ date › then playback),
  verdict, site list. The canvas is isolated so globe labels never draw over the panels.
- Date and time: custom UTC picker (src/ui/DateTimePicker.tsx), round day cells, month slide, landing-date dot.
- Compare: labelled Remove per column, Clear all, "Replace oldest" when the list is full.

## Globe poles (fix before Phase 7)

The equirectangular maps pinched at the poles (radial streaks). MoonGlobe now blends polar stereographic caps
(colour + object-space relief, tools/polar_caps.py) from 58° to 62° latitude in the standard material's shader.
The cap mapping uses only the unit position (no atan), so there is no seam and no singularity at the pole.

## As built (Phase 5, 3D site)

- Own Canvas, swapped in for the globe (one WebGL context at a time). Log depth buffer: 1 m to 300 km in one view.
- Terrain: MeshStandardMaterial, regolith #8d8a85, roughness 1. One vertex per LOLA sample, true vertical scale.
  Orbit view fades the tile out radially (80–100% of its half-width) so it reads as a specimen, not a slab.
- Light: one shadow-casting Sun (4096 map, light-space fit, PCF), dimmed by the far-ridge disc fraction.
  Earthshine 0.06 × Earth's lit fraction. No ambient fill: shadows are black, as on the Moon.
- Sky: Sun disc at true size + soft glare sprite; Earth at true size with day texture, clouds, phase from the
  true Sun, thin blue rim. Both ride with the camera so their direction is exact from any viewpoint.
- Stand view: far ridges as a silhouette band at 40 km, shaded from the profile's smoothed slope, foot fading
  to black (nearer terrain hides it in reality).
- Lander: low-poly, foil body, Sun-tracking panel faces the Sun, dish faces Earth (same pointing the numbers assume).
- Motion: arrival drop from ~95 km above the site to the orbit pose, 2.4 s power3.inOut; mode flights 1.6–1.8 s;
  stage fades in 700 ms. All 0 s under reduced motion. Time scrubbing never moves the camera.
- Labels: DOM pins for the site, Sun and Earth (with elevation), compass needle, all written per frame without
  React re-renders. "3D site" tab disabled (with reason in its title) for places without baked terrain.

## As built (Phase 6, compare + nudge)

- Compare is a centre-panel view like the sky chart (opaque). Table on CSS grid with `display: contents` rows:
  label column with a one-line hint, one column per landing, headline row larger. "Best" = check icon + label pill
  (never colour alone). 30-day strips reuse the validated chart marks (Sun #c4862a, Earth #4a94e6, Both white).
- Empty state teaches the view and offers "Try the three Artemis ridge sites".
- Nudge: shaded relief (NW light, ×3 relief, lighter = higher, stated on the map) with 17 real <button> spots,
  each labelled with the signed change in hours (sign + text, not colour only). Best moves list (top 3) with Go /
  Compare, and a ±3-day strip.
- Entry points: "Compare N" view tab, "Compare and nudge" in the verdict panel.

## Charts (Phase 4, dataviz skill)

- Chart mark colours validated with the dataviz validator on the dark surface: Sun #c4862a, Earth #4a94e6
  (lightness band pass, CVD ΔE 25.5, normal ΔE 27.1, contrast ≥ 3:1). Bright --sun/--earth stay for the body discs.
- Legend always present (2 series + horizon) and direct labels on the current discs. Below-horizon track =
  dashed and dimmed (secondary encoding, not colour alone). "Both" band is neutral white.
- One y-axis everywhere (no dual axes). Hover crosshair + tooltip on the sky chart; timeline is a keyboard slider.
- Bodies drawn at true angular size, floored at 5 px; Earth disc translucent so tracks show through.

## Skill rules (all four read in full; applied by Claude in-chat, not Claude Code)

- ponytail (full): smallest complete change, reuse before writing, one small test for risky logic,
  end each build reply with what was skipped/unchecked. Never cut validation, security, a11y.
- ui-ux-pro-max: generator ran for "space mission planning tool dark data dashboard 3D". KEEP its dark
  palette base (#0B0B10, launch blue), accessibility checklist (4.5:1, focus, reduced motion, 44 px targets),
  chart rules (legends, tooltips, no colour-only meaning). REJECT its HUD/Sci-Fi style, glow, scanning
  animations, Exo font. This doc wins on conflicts.
- impeccable: craft floor applies to every UI edit: contrast, real shadows (offset + blur), spacing
  rhythm, themed browser surfaces (selection, caret, scrollbars, focus rings, tabular numerals), all states
  (hover, disabled, loading, error, empty), product-language copy. Phase 7: critique → audit → polish.
- humanizer: all reader-facing prose (captions, Explore text, README, project page). No "not X but Y",
  no forced triads, no em dashes, no inflated claims, sentence-case headings.
