import type {PViseme} from '../lip-sync'

export const FOCUS_ROOM_PREVIEW_CHANNELS = {
  eyes: 'eyes',
  hands: 'hands',
  head: 'head',
  reference: 'reference',
} as const

export const FOCUS_ROOM_MOUTH_CHANNELS = {
  closed: 'mouth-closed',
  narrow: 'mouth-narrow',
  open: 'mouth-open',
  rest: 'mouth-rest',
  round: 'mouth-round',
  wide: 'mouth-wide',
} as const

export const P_MOUTH_TRANSITION_STAGES = [
  'release',
  'small-open',
  'half-open',
  'closed-wide-early',
  'closed-wide-late',
  'closed-round-early',
  'closed-round-late',
  'open-wide-early',
  'open-wide-late',
  'open-round-early',
  'open-round-middle',
  'open-round-late',
  'narrow-wide-early',
  'narrow-wide-middle',
  'narrow-wide-late',
  'narrow-round-early',
  'narrow-round-middle',
  'narrow-round-late',
] as const

export type PMouthTransitionStage = (typeof P_MOUTH_TRANSITION_STAGES)[number]

export const FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS = {
  'closed-round-early': 'mouth-transition-closed-round-early',
  'closed-round-late': 'mouth-transition-closed-round-late',
  'closed-wide-early': 'mouth-transition-closed-wide-early',
  'closed-wide-late': 'mouth-transition-closed-wide-late',
  'half-open': 'mouth-transition-half-open',
  'narrow-round-early': 'mouth-transition-narrow-round-early',
  'narrow-round-late': 'mouth-transition-narrow-round-late',
  'narrow-round-middle': 'mouth-transition-narrow-round-middle',
  'narrow-wide-early': 'mouth-transition-narrow-wide-early',
  'narrow-wide-late': 'mouth-transition-narrow-wide-late',
  'narrow-wide-middle': 'mouth-transition-narrow-wide-middle',
  'open-round-early': 'mouth-transition-open-round-early',
  'open-round-late': 'mouth-transition-open-round-late',
  'open-round-middle': 'mouth-transition-open-round-middle',
  'open-wide-early': 'mouth-transition-open-wide-early',
  'open-wide-late': 'mouth-transition-open-wide-late',
  release: 'mouth-transition-release',
  'small-open': 'mouth-transition-small-open',
} satisfies Readonly<Record<PMouthTransitionStage, string>>

export interface PMouthTransitionPath {
  readonly from: PViseme
  readonly stages: readonly [
    PMouthTransitionStage,
    PMouthTransitionStage,
    ...PMouthTransitionStage[],
  ]
  readonly to: PViseme
}

export const P_MOUTH_TRANSITION_PATHS = [
  {from: 'closed', stages: ['release', 'small-open', 'half-open'], to: 'open'},
  {
    from: 'closed',
    stages: ['closed-wide-early', 'closed-wide-late'],
    to: 'wide',
  },
  {
    from: 'closed',
    stages: ['closed-round-early', 'closed-round-late'],
    to: 'round',
  },
  {
    from: 'open',
    stages: ['open-wide-early', 'open-wide-late'],
    to: 'wide',
  },
  {
    from: 'open',
    stages: ['open-round-early', 'open-round-middle', 'open-round-late'],
    to: 'round',
  },
  {
    from: 'narrow',
    stages: ['narrow-wide-early', 'narrow-wide-middle', 'narrow-wide-late'],
    to: 'wide',
  },
  {
    from: 'narrow',
    stages: ['narrow-round-early', 'narrow-round-middle', 'narrow-round-late'],
    to: 'round',
  },
] as const satisfies ReadonlyArray<PMouthTransitionPath>

export const FOCUS_ROOM_JAW_CHANNEL = 'jaw'
