import {clampUnit} from 'src/utils/clamp-unit'

import {P_VISEMES, type PViseme} from '../lip-sync'
import type {PixiLayerSceneState} from './layer-scene-definition'
import {
  FOCUS_ROOM_JAW_CHANNEL,
  FOCUS_ROOM_MOUTH_CHANNELS,
  FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS,
  P_MOUTH_TRANSITION_PATHS,
  P_MOUTH_TRANSITION_STAGES,
  type PMouthTransitionPath,
  type PMouthTransitionStage,
} from './scene-catalog-channels'

export interface PVisemeTransition {
  readonly from: PViseme
  readonly progress: number
  readonly to: PViseme
}

type SupportsMouthTransitionStage = (stage: PMouthTransitionStage) => boolean

const getEqualPowerOpacity = (linearOpacity: number) => Math.sqrt(clampUnit(linearOpacity))
const VISEME_JAW_PROGRESS = {
  closed: 0,
  narrow: 0.12,
  open: 1,
  rest: 0,
  round: 0.5,
  wide: 0.3,
} satisfies Readonly<Record<PViseme, number>>

const getMouthOpacities = (
  activeViseme: PViseme,
  transition: PVisemeTransition | undefined,
  supportsMouthTransitionStage: SupportsMouthTransitionStage | undefined,
): Readonly<Record<string, number>> => {
  if (transition === undefined || transition.from === transition.to) {
    return {[FOCUS_ROOM_MOUTH_CHANNELS[activeViseme]]: 1}
  }

  const progress = clampUnit(transition.progress)
  const path = getMouthTransitionPath(transition, supportsMouthTransitionStage)

  if (path === undefined) {
    return {
      [FOCUS_ROOM_MOUTH_CHANNELS[transition.from]]: getEqualPowerOpacity(1 - progress),
      [FOCUS_ROOM_MOUTH_CHANNELS[transition.to]]: getEqualPowerOpacity(progress),
    }
  }

  const pathProgress = getPathProgress(path, transition, progress)
  const frames = [
    FOCUS_ROOM_MOUTH_CHANNELS[path.from],
    ...path.stages.map((stage) => FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS[stage]),
    FOCUS_ROOM_MOUTH_CHANNELS[path.to],
  ]

  return Object.fromEntries(
    frames.map((channel, index) => [
      channel,
      getPathFrameOpacity(index, pathProgress, frames.length),
    ]),
  )
}

const getMouthTransitionPath = (
  transition: PVisemeTransition,
  supportsMouthTransitionStage: SupportsMouthTransitionStage | undefined,
) =>
  P_MOUTH_TRANSITION_PATHS.find(
    (path) =>
      ((path.from === transition.from && path.to === transition.to) ||
        (path.from === transition.to && path.to === transition.from)) &&
      (supportsMouthTransitionStage === undefined ||
        path.stages.every(supportsMouthTransitionStage)),
  )

const getPathProgress = (
  path: PMouthTransitionPath,
  transition: PVisemeTransition,
  progress: number,
) => (transition.from === path.from ? progress : 1 - progress)

const getPathFrameOpacity = (frameIndex: number, progress: number, frameCount: number) =>
  getEqualPowerOpacity(1 - Math.abs(progress * (frameCount - 1) - frameIndex))

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
  supportsMouthTransitionStage?: SupportsMouthTransitionStage,
): PixiLayerSceneState => {
  const opacities = getMouthOpacities(activeViseme, transition, supportsMouthTransitionStage)
  const mouthChannels = [
    ...P_VISEMES.map((viseme) => FOCUS_ROOM_MOUTH_CHANNELS[viseme]),
    ...P_MOUTH_TRANSITION_STAGES.map((stage) => FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS[stage]),
  ]

  return {
    animationEnabled: !prefersReducedMotion,
    channels: Object.fromEntries([
      ...mouthChannels.map((channel) => {
        const opacity = opacities[channel] ?? 0
        return [channel, {opacity, visible: opacity > 0}] as const
      }),
      [FOCUS_ROOM_JAW_CHANNEL, {pixelPushProgress: getJawProgress(activeViseme, transition)}],
    ]),
  }
}
