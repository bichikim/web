import {P_VISEMES, type PViseme} from '../lip-sync'
import type {PixiLayerSceneState} from './layer-scene-definition'
import {FOCUS_ROOM_JAW_CHANNEL, FOCUS_ROOM_MOUTH_CHANNELS} from './scene-catalog-channels'

export interface PVisemeTransition {
  readonly from: PViseme
  readonly progress: number
  readonly to: PViseme
}

const clampUnit = (value: number) => Math.min(1, Math.max(0, value))
const VISEME_JAW_PROGRESS = {
  closed: 0,
  narrow: 0.12,
  open: 1,
  rest: 0,
  round: 0.5,
  wide: 0.3,
} satisfies Readonly<Record<PViseme, number>>

const getVisemeOpacity = (
  viseme: PViseme,
  activeViseme: PViseme,
  transition: PVisemeTransition | undefined,
) => {
  if (transition === undefined || transition.from === transition.to) {
    return viseme === activeViseme ? 1 : 0
  }

  const progress = clampUnit(transition.progress)

  if (viseme === transition.from) {
    return 1 - progress
  }

  return viseme === transition.to ? progress : 0
}

const getJawProgress = (activeViseme: PViseme, transition: PVisemeTransition | undefined) => {
  if (transition === undefined || transition.from === transition.to) {
    return VISEME_JAW_PROGRESS[activeViseme]
  }

  const progress = clampUnit(transition.progress)
  const fromProgress = VISEME_JAW_PROGRESS[transition.from]
  const toProgress = VISEME_JAW_PROGRESS[transition.to]

  return fromProgress + (toProgress - fromProgress) * progress
}

export const createFocusRoomLayerState = (
  activeViseme: PViseme,
  prefersReducedMotion: boolean,
  transition?: PVisemeTransition,
): PixiLayerSceneState => ({
  animationEnabled: !prefersReducedMotion,
  channels: Object.fromEntries([
    ...P_VISEMES.map((viseme) => {
      const opacity = getVisemeOpacity(viseme, activeViseme, transition)
      return [FOCUS_ROOM_MOUTH_CHANNELS[viseme], {opacity, visible: opacity > 0}] as const
    }),
    [FOCUS_ROOM_JAW_CHANNEL, {pixelPushProgress: getJawProgress(activeViseme, transition)}],
  ]),
})
