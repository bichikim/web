import type {PMouthTransitionSources, PVisemeSources} from './mouth-layers'

import mouthClosed from './assets/layers/night-reading-user/layer-mouth-closed.webp'
import mouthClosedRoundEarly from './assets/layers/night-reading-user/layer-mouth-closed-round-early.webp'
import mouthClosedRoundLate from './assets/layers/night-reading-user/layer-mouth-closed-round-late.webp'
import mouthClosedWideEarly from './assets/layers/night-reading-user/layer-mouth-closed-wide-early.webp'
import mouthClosedWideLate from './assets/layers/night-reading-user/layer-mouth-closed-wide-late.webp'
import mouthHalfOpen from './assets/layers/night-reading-user/layer-mouth-half-open.webp'
import mouthNarrow from './assets/layers/night-reading-user/layer-mouth-narrow.webp'
import mouthNarrowRoundEarly from './assets/layers/night-reading-user/layer-mouth-narrow-round-early.webp'
import mouthNarrowRoundLate from './assets/layers/night-reading-user/layer-mouth-narrow-round-late.webp'
import mouthNarrowRoundMiddle from './assets/layers/night-reading-user/layer-mouth-narrow-round-middle.webp'
import mouthNarrowWideEarly from './assets/layers/night-reading-user/layer-mouth-narrow-wide-early.webp'
import mouthNarrowWideLate from './assets/layers/night-reading-user/layer-mouth-narrow-wide-late.webp'
import mouthNarrowWideMiddle from './assets/layers/night-reading-user/layer-mouth-narrow-wide-middle.webp'
import mouthOpen from './assets/layers/night-reading-user/layer-mouth-open.webp'
import mouthOpenRoundEarly from './assets/layers/night-reading-user/layer-mouth-open-round-early.webp'
import mouthOpenRoundLate from './assets/layers/night-reading-user/layer-mouth-open-round-late.webp'
import mouthOpenRoundMiddle from './assets/layers/night-reading-user/layer-mouth-open-round-middle.webp'
import mouthOpenWideEarly from './assets/layers/night-reading-user/layer-mouth-open-wide-early.webp'
import mouthOpenWideLate from './assets/layers/night-reading-user/layer-mouth-open-wide-late.webp'
import mouthRelease from './assets/layers/night-reading-user/layer-mouth-release.webp'
import mouthRest from './assets/layers/night-reading-user/layer-mouth-rest.webp'
import mouthRound from './assets/layers/night-reading-user/layer-mouth-round.webp'
import mouthSmallOpen from './assets/layers/night-reading-user/layer-mouth-small-open.webp'
import mouthWide from './assets/layers/night-reading-user/layer-mouth-wide.webp'

export const NIGHT_USER_MOUTH_SOURCES = {
  closed: mouthClosed,
  narrow: mouthNarrow,
  open: mouthOpen,
  rest: mouthRest,
  round: mouthRound,
  wide: mouthWide,
} satisfies PVisemeSources

export const NIGHT_USER_MOUTH_TRANSITION_SOURCES = {
  'closed-round-early': mouthClosedRoundEarly,
  'closed-round-late': mouthClosedRoundLate,
  'closed-wide-early': mouthClosedWideEarly,
  'closed-wide-late': mouthClosedWideLate,
  'half-open': mouthHalfOpen,
  'narrow-round-early': mouthNarrowRoundEarly,
  'narrow-round-late': mouthNarrowRoundLate,
  'narrow-round-middle': mouthNarrowRoundMiddle,
  'narrow-wide-early': mouthNarrowWideEarly,
  'narrow-wide-late': mouthNarrowWideLate,
  'narrow-wide-middle': mouthNarrowWideMiddle,
  'open-round-early': mouthOpenRoundEarly,
  'open-round-late': mouthOpenRoundLate,
  'open-round-middle': mouthOpenRoundMiddle,
  'open-wide-early': mouthOpenWideEarly,
  'open-wide-late': mouthOpenWideLate,
  release: mouthRelease,
  'small-open': mouthSmallOpen,
} satisfies PMouthTransitionSources
