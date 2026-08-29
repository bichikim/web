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

const clampUnit = (value: number) => Math.min(1, Math.max(0, value))
const getEqualPowerOpacity = (linearOpacity: number) => Math.sqrt(clampUnit(linearOpacity))
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
  supportsMouthTransitionStage: SupportsMouthTransitionStage | undefined,
) => {
  if (transition === undefined || transition.from === transition.to) {
    return viseme === activeViseme ? 1 : 0
  }

  const progress = clampUnit(transition.progress)
  const path = getMouthTransitionPath(transition, supportsMouthTransitionStage)

  if (path !== undefined) {
    const pathProgress = getPathProgress(path, transition, progress)
    const frameCount = path.stages.length + 2

    if (viseme === path.from) {
      return getPathFrameOpacity(0, pathProgress, frameCount)
    }

    return viseme === path.to ? getPathFrameOpacity(frameCount - 1, pathProgress, frameCount) : 0
  }

  if (viseme === transition.from) {
    return getEqualPowerOpacity(1 - progress)
  }

  return viseme === transition.to ? getEqualPowerOpacity(progress) : 0
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

const getMouthTransitionOpacity = (
  stage: PMouthTransitionStage,
  transition: PVisemeTransition | undefined,
  supportsMouthTransitionStage: SupportsMouthTransitionStage | undefined,
) => {
  if (transition === undefined || transition.from === transition.to) {
    return 0
  }

  const progress = clampUnit(transition.progress)
  const path = getMouthTransitionPath(transition, supportsMouthTransitionStage)

  if (path === undefined) {
    return 0
  }

  const stageIndex = path.stages.findIndex((pathStage) => pathStage === stage)
  const frameCount = path.stages.length + 2

  return stageIndex === -1
    ? 0
    : getPathFrameOpacity(stageIndex + 1, getPathProgress(path, transition, progress), frameCount)
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
  supportsMouthTransitionStage?: SupportsMouthTransitionStage,
): PixiLayerSceneState => ({
  animationEnabled: !prefersReducedMotion,
  channels: Object.fromEntries([
    ...P_VISEMES.map((viseme) => {
      const opacity = getVisemeOpacity(
        viseme,
        activeViseme,
        transition,
        supportsMouthTransitionStage,
      )
      return [FOCUS_ROOM_MOUTH_CHANNELS[viseme], {opacity, visible: opacity > 0}] as const
    }),
    ...P_MOUTH_TRANSITION_STAGES.map((stage) => {
      const opacity = getMouthTransitionOpacity(stage, transition, supportsMouthTransitionStage)
      return [FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS[stage], {opacity, visible: opacity > 0}] as const
    }),
    [FOCUS_ROOM_JAW_CHANNEL, {pixelPushProgress: getJawProgress(activeViseme, transition)}],
  ]),
})
