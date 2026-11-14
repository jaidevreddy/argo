# Design

A flight instrument, not a space-themed website. Mode (impeccable): Operate. Precision and restraint;
the terrain and the globe are the only imagery.

## Interface

- Surfaces: background ~#050506 to #0B0B10, panels 4–8% white + hairline border, text 92% / 60% white.
- Body colours mean one thing everywhere: Sun = warm amber, Earth = blue. Each also has a distinct
  shape/line style so colour is never the only cue.
- Type: Inter (UI), JetBrains Mono for numbers only, tabular figures (no jitter while scrubbing).
  Self-hosted via @fontsource-variable. No SF Pro (licence does not cover web).
- Layout: 3D/sky fills the screen, panels float over it (blur only where a panel sits over 3D).
  Verdict bar top, timeline dock bottom, scenario rail left. 1280 px primary; stacked below 768 px.
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
