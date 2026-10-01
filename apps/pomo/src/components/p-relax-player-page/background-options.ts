import * as m from '@paraglide/message'

export const DEFAULT_RELAX_BACKGROUND_SOURCE = '/relax-player/city-sunny-riverside.png'

export const RELAX_BACKGROUND_OPTIONS = [
  {
    depthSource: '/relax-player/depth/city-sunny-riverside.webp',
    label: m.relax_background_riverside,
    source: DEFAULT_RELAX_BACKGROUND_SOURCE,
  },
  {
    depthSource: '/relax-player/depth/post-rain-square-upper-floor.webp',
    label: m.relax_background_square,
    source: '/relax-player/post-rain-square-upper-floor.png',
  },
  {
    depthSource: '/relax-player/depth/rain-alley-upper-floor.webp',
    label: m.relax_background_alley,
    source: '/relax-player/rain-alley-upper-floor.png',
  },
  {
    depthSource: '/relax-player/depth/coastal-village-upper-floor.webp',
    label: m.relax_background_village,
    source: '/relax-player/coastal-village-upper-floor.png',
  },
] as const
