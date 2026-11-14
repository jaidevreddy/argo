# Phase 7: Polish

## Shipped

- Loading: binary rocket boot animation (GSAP MotionPath) that streams into the ARGO wordmark; small looping
  rocket where imagery or terrain loads. Once per tab session; reduced motion gets a still frame.
- Brand: ARGO wordmark outlined from Cyberwave 2000 (HipFonts, credited); favicon = its "A". SF Pro through the
  system font stack, Inter elsewhere.
- Controls: Apple Liquid Glass rules. Capsule buttons, inputs and segmented controls; concentric inner radii;
  one tinted primary action per screen; custom UTC date picker replacing the native one.
- Verdict card fits its content, head pinned while scrolling; "Coming up" removed.
- Custom point: type coordinates or pin on the globe; stale errors cleared per target.
- Phones: one scrolling column under 900 px (header, view, time, verdict, sites).
- 3D: Lommel-Seeliger regolith reflectance (no limb darkening, as on the Moon) and procedural micro relief below the
  40 m data spacing, faded out before it aliases. Stated in Assumptions as cosmetic.
- Accessibility: sky chart has a Table view (every 12 h: Sun and Earth azimuth, elevation, clear or hidden).
- Bundle: tab views lazy-loaded; vendor and three.js in their own cached chunks. App chunk 66 kB
  (was 1.41 MB in one file); three 949 kB, vendor 357 kB.

## Checks

- tsc, ESLint, 138 tests, production build all pass.
- Production build smoke-tested in headless Chrome (globe, sky chart, compare): no console errors.
- Desktop and 390 px layouts checked in Chrome.

## Not done

- Full humanizer pass over every caption (copy was written to the rules as it went).
- Real-phone test (only a 390 px frame was checked).
- Touch drag on the globe on phones rotates the Moon rather than scrolling the page.
