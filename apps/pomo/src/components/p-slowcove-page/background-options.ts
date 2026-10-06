import * as m from '@paraglide/message'

export const DEFAULT_RELAX_BACKGROUND_SOURCE = '/slowcove/city-sunny-riverside.webp'

export const RELAX_BACKGROUND_OPTIONS = [
  {
    depthSource: '/slowcove/depth/city-sunny-riverside.webp',
    label: m.relax_background_riverside,
    source: DEFAULT_RELAX_BACKGROUND_SOURCE,
  },
  {
    depthSource: '/slowcove/depth/post-rain-square-upper-floor.webp',
    label: m.relax_background_square,
    source: '/slowcove/post-rain-square-upper-floor.webp',
  },
  {
    depthSource: '/slowcove/depth/rain-alley-upper-floor.webp',
    label: m.relax_background_alley,
    source: '/slowcove/rain-alley-upper-floor.webp',
  },
  {
    depthSource: '/slowcove/depth/coastal-village-upper-floor.webp',
    label: m.relax_background_village,
    source: '/slowcove/coastal-village-upper-floor.webp',
  },
] as const
