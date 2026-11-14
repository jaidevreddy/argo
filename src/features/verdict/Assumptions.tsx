import s from './VerdictPanel.module.css'

/** Every modelling assumption, in one place, in plain words. */
export function Assumptions() {
  return (
    <details className={s.assume}>
      <summary>Assumptions</summary>
      <ul>
        <li>Sun and Earth positions from astronomy-engine with the IAU lunar orientation model; checked against JPL Horizons (DE441) at 110 cases, worst error 0.0033°.</li>
        <li>Terrain horizon out to 200 km, with lunar curvature. Polar sites: LOLA 40 m to 20 km, then 240 m. Within 60° of the equator: SLDEM2015 (LOLA + Kaguya) 59 m to 20 km, then 474 m. Chandrayaan-3: LOLA 60 m, then 480 m. Terrain within 200 m of the lander is ignored.</li>
        <li>Custom points outside the polar grids use a smooth sphere horizon.</li>
        <li>No atmosphere, so no refraction. The Sun and Earth are discs, not points: sunrise is the first edge of the Sun clearing the horizon.</li>
        <li>Observer height is the terrain plus a 2 m mast. Earth link needs Earth's centre above the horizon plus the chosen mask.</li>
        <li>Power is relative (0–100%): a tracking panel gets the visible fraction of the Sun's disc; a flat panel also scales with the sine of Sun elevation.</li>
        <li>3D view: heights, slopes and shadows come from the elevation data. The fine texture on the ground, smaller than one data cell, is procedural and only there so the surface reads at close range. Shading uses the Lommel-Seeliger law, which matches how lunar soil reflects light.</li>
      </ul>
    </details>
  )
}
