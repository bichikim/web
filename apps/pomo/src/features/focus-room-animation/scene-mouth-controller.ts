import type {PViseme} from '../lip-sync'
import type {PixiLayerSceneState} from './layer-scene-definition'
import type {PixiLayerScene} from './layer-scene'
import {createPMouthTransitionController} from './mouth-transition-controller'
import {FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS} from './scene-catalog-channels'
import {createFocusRoomLayerState} from './scene-layer-state'

export interface PSceneMouthController {
  readonly destroy: () => void
  readonly getLayerState: (
    activeViseme: PViseme,
    prefersReducedMotion: boolean,
    layerScene: LayerSceneTarget,
  ) => PixiLayerSceneState
  readonly setReducedMotion: (activeViseme: PViseme, prefersReducedMotion: boolean) => void
  readonly update: (from: PViseme, to: PViseme, prefersReducedMotion: boolean) => void
}

type LayerSceneTarget = Pick<PixiLayerScene, 'hasChannel' | 'update'>
type GetLayerScenes = () => readonly [LayerSceneTarget | null, LayerSceneTarget | null]

/** Coordinates co-articulated mouth state across current and incoming layer scenes. */
export const createPSceneMouthController = (
  getLayerScenes: GetLayerScenes,
): PSceneMouthController => {
  let activeViseme: PViseme = 'rest'
  let prefersReducedMotion = false

  const getLayerState = (viseme: PViseme, reducedMotion: boolean, layerScene: LayerSceneTarget) =>
    createFocusRoomLayerState(viseme, reducedMotion, transitions.current ?? undefined, (stage) =>
      layerScene.hasChannel(FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS[stage]),
    )

  const apply = () => {
    for (const layerScene of getLayerScenes()) {
      if (layerScene !== null) {
        layerScene.update(getLayerState(activeViseme, prefersReducedMotion, layerScene))
      }
    }
  }

  const transitions = createPMouthTransitionController(apply)

  const update = (from: PViseme, to: PViseme, reducedMotion: boolean) => {
    activeViseme = to
    prefersReducedMotion = reducedMotion

    if (from === to) {
      apply()
      return
    }

    transitions.start(from, to, reducedMotion)
  }

  const setReducedMotion = (viseme: PViseme, reducedMotion: boolean) => {
    activeViseme = viseme
    prefersReducedMotion = reducedMotion

    if (reducedMotion) {
      transitions.cancel()
    }

    apply()
  }

  return {
    destroy: transitions.destroy,
    getLayerState,
    setReducedMotion,
    update,
  }
}
