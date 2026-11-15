import type { View } from '../../state/scenarioStore'

export interface TourStep {
  /** data-tour value of the element to spotlight; none = centred card. */
  target?: string
  /** Switch to this view before showing the step. */
  view?: View
  /** Only switch view when the chosen place has baked terrain. */
  needsTerrain?: boolean
  title: string
  body: string
}

/** One feature = one or more cards. "Skip" jumps to the next feature. */
export interface TourFeature {
  name: string
  steps: TourStep[]
}

// Copy rules (blader/humanizer): say what it is and what it tells you, plain words, no hype,
// no dashes as connectors, no punchline closers.
export const FEATURES: TourFeature[] = [
  {
    name: 'Landing sites',
    steps: [
      {
        target: 'sites',
        view: 'globe',
        title: 'Landing sites',
        body: 'Pick a place here. The list has candidate regions near the south pole and the sites of past landings. Search by name if you know where you want to go.',
      },
      {
        target: 'custom',
        view: 'globe',
        title: 'Your own point',
        body: 'Type a latitude and longitude, or tap Pin on globe and click anywhere on the Moon. The power and Earth checks run for that point the same way.',
      },
    ],
  },
  {
    name: 'At this moment',
    steps: [
      {
        target: 'moment',
        title: 'At this moment',
        body: 'How high the Sun and Earth are above the local horizon at the time you set. The badge at the top says whether you have power, an Earth link, both or neither.',
      },
      {
        target: 'panel-opts',
        title: 'Panel and link settings',
        body: 'Choose a sun-tracking or flat panel, and how many degrees above the horizon Earth has to be before the link counts. The figures above update straight away.',
      },
    ],
  },
  {
    name: 'Time',
    steps: [
      {
        target: 'time',
        title: 'Time and landing window',
        body: 'Drag the timeline or press play to move through the window. The bars show when you have sunlight, Earth in view, or both.',
      },
    ],
  },
  {
    name: 'Sky chart',
    steps: [
      {
        target: 'view-sky',
        view: 'sky',
        title: 'Sky chart',
        body: 'The paths of the Sun and Earth across the sky, drawn over the horizon at this site. Where a path drops behind the grey ridge, the terrain is blocking it. Switch to Table for the exact angles.',
      },
    ],
  },
  {
    name: '3D site',
    steps: [
      {
        target: 'view-3d',
        view: 'site',
        needsTerrain: true,
        title: '3D site',
        body: 'The ground around the site, built from LOLA elevation data and lit from where the Sun really is, so the shadows match the date and time you set. Drag to look around.',
      },
    ],
  },
  {
    name: 'Compare',
    steps: [
      {
        target: 'view-compare',
        view: 'compare',
        title: 'Compare',
        body: 'Put up to three sites or landing dates side by side. Each one is scored on hours of power and contact over the first 30 days after touchdown.',
      },
      {
        target: 'nudge',
        view: 'compare',
        title: 'Nudge',
        body: 'Argo tests 16 spots within 2 km, and landing up to 3 days earlier or later, then lists the moves that add the most hours.',
      },
    ],
  },
  {
    name: 'Validation',
    steps: [
      {
        target: 'validation',
        view: 'globe',
        title: 'Validation',
        body: 'Sun and Earth positions are checked against NASA JPL Horizons. The largest error is 0.0033°. Open it to see every test case.',
      },
    ],
  },
  {
    name: 'Replay',
    steps: [
      {
        target: 'tour-btn',
        title: 'Run it again any time',
        body: 'Tap Tour to see this again.',
      },
    ],
  },
]
